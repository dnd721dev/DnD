/**
 * Standalone 3D dice box using Three.js + cannon-es.
 * Geometry data from Dice So Nice (AGPL) by Simone Ricciardi.
 * FoundryVTT-specific code has been removed; React lifecycle is handled externally.
 */
import * as THREE from 'three'
import { BufferGeometryLoader } from 'three'
import * as CANNON from 'cannon-es'
import { DICE_MODELS, DICE_SHAPE } from './DiceModels'
import { resolveDicePrefs, type DicePrefs, type ResolvedDicePrefs } from '@/lib/diceSkins'
import { playDiceImpact, setDiceVolume } from './diceSound'

export type DiceType = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20' | 'd100'

// Physics scale: DICE_SHAPE vertices are normalized ~±1–1.7 units.
// We scale them up so dice feel weighty in the scene.
const PHYSICS_RADIUS = 2.2

// Visual scale: DICE_MODELS geometry positions are in the ~90-unit range.
// Scale mesh so its radius roughly matches PHYSICS_RADIUS.
const MESH_VISUAL_SCALE = PHYSICS_RADIUS / 90

// Per-die-type default body colors (used when the user hasn't set a custom one).
const DEFAULT_DIE_COLORS: Record<DiceType, number> = {
  d4: 0x0e7490,
  d6: 0xb45309,
  d8: 0x065f46,
  d10: 0x9a3412,
  d12: 0x5b21b6,
  d20: 0x1e3a8a,
  d100: 0x334155,
}

// Numeral plane size as a fraction of the model bounding radius, per die type.
const LABEL_SIZE_FACTOR: Record<string, number> = {
  d4: 0.5, d6: 0.82, d8: 0.55, d10: 0.5, d12: 0.55, d20: 0.42, d100: 0.5,
}

interface FaceLabel {
  position: THREE.Vector3   // mesh-local
  quaternion: THREE.Quaternion
  value: number
  size: number
}

interface DieMesh {
  mesh: THREE.Mesh
  body: CANNON.Body
  shape: CANNON.ConvexPolyhedron | CANNON.Cylinder
  type: DiceType
  targetValue: number
  faceValues: number[]
  settling?: { from: CANNON.Quaternion; to: CANNON.Quaternion; start: number }
}

// Numeral textures are shared across dice — cache by value+color.
const textureCache = new Map<string, THREE.CanvasTexture>()
// Face label layouts are identical per die type — compute once.
const faceLayoutCache = new Map<DiceType, FaceLabel[]>()

export class DiceBox {
  private container: HTMLElement
  private scene!: THREE.Scene
  private camera!: THREE.PerspectiveCamera
  private renderer!: THREE.WebGLRenderer
  private world!: CANNON.World
  private diceMaterial!: CANNON.Material
  private dice: DieMesh[] = []
  private animFrameId: number | null = null
  private prefs: ResolvedDicePrefs = resolveDicePrefs(null)
  private cameraBase = new THREE.Vector3(0, 22, 18)

  constructor(container: HTMLElement, prefs?: DicePrefs | null) {
    this.container = container
    if (prefs) this.prefs = resolveDicePrefs(prefs)
    setDiceVolume(this.prefs.soundVolume)
  }

  /** Update appearance/sound prefs between rolls. */
  setPrefs(prefs: DicePrefs | null) {
    this.prefs = resolveDicePrefs(prefs)
    setDiceVolume(this.prefs.soundVolume)
  }

  async initialize(): Promise<void> {
    this.setupRenderer()
    this.setupScene()
    this.setupPhysics()
  }

  // ─── Three.js setup ────────────────────────────────────────────────────────

  private setupRenderer() {
    const { w, h } = this.size()
    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      premultipliedAlpha: false,
    })
    this.renderer.setSize(w, h)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.2
    this.container.appendChild(this.renderer.domElement)
  }

  private setupScene() {
    const { w, h } = this.size()
    this.scene = new THREE.Scene()

    this.camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 1000)
    this.camera.position.copy(this.cameraBase)
    this.camera.lookAt(0, 0, 0)

    // Key light with shadows
    const key = new THREE.DirectionalLight(0xffffff, 1.2)
    key.position.set(6, 20, 12)
    key.castShadow = true
    key.shadow.mapSize.setScalar(1024)
    key.shadow.camera.near = 0.5
    key.shadow.camera.far = 80
    key.shadow.camera.left = -20
    key.shadow.camera.right = 20
    key.shadow.camera.top = 20
    key.shadow.camera.bottom = -20
    this.scene.add(key)

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.55))

    const fill = new THREE.DirectionalLight(0x88aaff, 0.4)
    fill.position.set(-8, 6, -6)
    this.scene.add(fill)

    const rim = new THREE.DirectionalLight(0xffcc88, 0.25)
    rim.position.set(0, -6, -10)
    this.scene.add(rim)

    // Invisible shadow-receiving floor
    const floorMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 200),
      new THREE.ShadowMaterial({ opacity: 0.35, transparent: true })
    )
    floorMesh.rotation.x = -Math.PI / 2
    floorMesh.position.y = -0.02
    floorMesh.receiveShadow = true
    this.scene.add(floorMesh)
  }

  // ─── cannon-es physics setup ────────────────────────────────────────────────

  private setupPhysics() {
    this.world = new CANNON.World()
    this.world.gravity.set(0, -280, 0)
    this.world.broadphase = new CANNON.NaiveBroadphase()
    ;(this.world.solver as CANNON.GSSolver).iterations = 16
    this.world.allowSleep = true

    const floorMat = new CANNON.Material('floor')
    this.diceMaterial = new CANNON.Material('dice')

    this.world.addContactMaterial(
      new CANNON.ContactMaterial(floorMat, this.diceMaterial, {
        friction: 0.35,
        restitution: 0.45,
      })
    )
    this.world.addContactMaterial(
      new CANNON.ContactMaterial(this.diceMaterial, this.diceMaterial, {
        friction: 0.2,
        restitution: 0.3,
      })
    )

    // Floor plane
    const floor = new CANNON.Body({ mass: 0, material: floorMat })
    floor.addShape(new CANNON.Plane())
    floor.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2)
    this.world.addBody(floor)

    // Invisible boundary walls (keeps dice on screen)
    this.addWall(new CANNON.Vec3(0, 0, 1),  new CANNON.Vec3(0, 5, -18))  // back
    this.addWall(new CANNON.Vec3(0, 0, -1), new CANNON.Vec3(0, 5,  18))  // front
    this.addWall(new CANNON.Vec3(1, 0, 0),  new CANNON.Vec3(-28, 5, 0)) // left
    this.addWall(new CANNON.Vec3(-1, 0, 0), new CANNON.Vec3(28, 5, 0))  // right
  }

  private addWall(normal: CANNON.Vec3, position: CANNON.Vec3) {
    const wall = new CANNON.Body({ mass: 0 })
    wall.addShape(new CANNON.Plane())
    // Orient so plane normal points inward
    const up = new CANNON.Vec3(0, 0, 1)
    const axis = new CANNON.Vec3()
    up.cross(normal, axis)
    if (axis.length() < 0.001) {
      if (normal.z < 0) wall.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), Math.PI)
    } else {
      axis.normalize()
      const angle = Math.acos(Math.min(1, Math.max(-1, up.dot(normal))))
      wall.quaternion.setFromAxisAngle(axis, angle)
    }
    wall.position.copy(position)
    this.world.addBody(wall)
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  /**
   * Roll dice. Results are predetermined; physics animation ends with each
   * die showing the correct face.
   * @param notation  e.g. "2d20", "1d6"
   * @param results   pre-rolled values (one per die)
   */
  async roll(notation: string, results: number[]): Promise<void> {
    const match = notation.match(/(\d+)[dD](\d+)/)
    if (!match) return

    const count = Math.min(parseInt(match[1], 10), 6)
    const type = `d${match[2]}` as DiceType

    if (!(type in DICE_MODELS) || !(type in DICE_SHAPE)) return

    this.clear()

    for (let i = 0; i < count; i++) {
      const target = results[i] ?? 1
      const die = this.createDie(type, target, i, count)
      this.dice.push(die)
    }

    return new Promise<void>((resolve) => {
      const startTime = performance.now()
      const MAX_MS = 5500
      const SETTLE_MS = 300
      let settleStarted = false

      const animate = () => {
        const now = performance.now()
        const elapsed = now - startTime
        this.world.step(1 / 60, 1 / 60, 10)

        // Subtle camera drift that eases out over the first ~1.6s — gives the
        // shot a hand-held, "watching the dice" feel without obscuring them.
        const driftK = Math.max(0, 1 - elapsed / 1600)
        const t = elapsed / 1000
        this.camera.position.set(
          this.cameraBase.x + Math.sin(t * 2.3) * 0.9 * driftK,
          this.cameraBase.y + Math.sin(t * 1.7 + 1) * 0.5 * driftK,
          this.cameraBase.z + Math.cos(t * 1.9) * 0.7 * driftK,
        )
        this.camera.lookAt(0, 0, 0)

        if (!settleStarted) {
          for (const die of this.dice) {
            die.mesh.position.copy(die.body.position as unknown as THREE.Vector3)
            die.mesh.quaternion.copy(die.body.quaternion as unknown as THREE.Quaternion)
          }

          const allSettled =
            elapsed > 1500 &&
            this.dice.every(
              (d) =>
                d.body.sleepState === CANNON.Body.SLEEPING ||
                (d.body.velocity.length() < 0.6 && d.body.angularVelocity.length() < 0.6)
            )

          if (elapsed > MAX_MS || allSettled) {
            // Begin the eased "tip into place" settle for each die.
            settleStarted = true
            for (const die of this.dice) this.beginSettle(die, now)
          }
        } else {
          // Interpolate each die from its resting pose to the target-face pose.
          let done = true
          for (const die of this.dice) {
            if (!die.settling) continue
            const k = Math.min(1, (now - die.settling.start) / SETTLE_MS)
            const eased = 1 - Math.pow(1 - k, 3) // easeOutCubic
            const q = new CANNON.Quaternion()
            slerpQuat(die.settling.from, die.settling.to, eased, q)
            die.body.quaternion.copy(q)
            die.body.velocity.set(0, 0, 0)
            die.body.angularVelocity.set(0, 0, 0)
            die.mesh.quaternion.copy(q as unknown as THREE.Quaternion)
            die.mesh.position.copy(die.body.position as unknown as THREE.Vector3)
            if (k < 1) done = false
          }
          this.renderer.render(this.scene, this.camera)
          if (done) {
            for (const die of this.dice) die.body.sleep()
            // Ease camera back to its base for the result beat.
            this.camera.position.copy(this.cameraBase)
            this.camera.lookAt(0, 0, 0)
            this.renderer.render(this.scene, this.camera)
            resolve()
            return
          }
          this.animFrameId = requestAnimationFrame(animate)
          return
        }

        this.renderer.render(this.scene, this.camera)
        this.animFrameId = requestAnimationFrame(animate)
      }

      this.animFrameId = requestAnimationFrame(animate)
    })
  }

  clear() {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId)
      this.animFrameId = null
    }
    for (const die of this.dice) {
      this.scene.remove(die.mesh)
      die.mesh.geometry.dispose()
      ;(die.mesh.material as THREE.Material).dispose()
      // Dispose label children (their shared textures stay cached).
      die.mesh.traverse((o) => {
        if (o instanceof THREE.Mesh && o !== die.mesh) {
          o.geometry.dispose()
          ;(o.material as THREE.Material).dispose()
        }
      })
      this.world.removeBody(die.body)
    }
    this.dice = []
  }

  destroy() {
    this.clear()
    this.renderer.dispose()
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement)
    }
  }

  resize() {
    const { w, h } = this.size()
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h)
  }

  // ─── Die creation ────────────────────────────────────────────────────────────

  private createDie(type: DiceType, targetValue: number, index: number, total: number): DieMesh {
    const geoData = (DICE_MODELS as Record<string, unknown>)[type]
    const shapeData = (DICE_SHAPE as Record<string, {
      type: string
      vertices?: number[][]
      faces?: number[][]
      skipLastFaceIndex?: boolean
      faceValues?: number[]
      radiusTop?: number
      radiusBottom?: number
      height?: number
      numSegments?: number
    }>)[type]

    // Three.js mesh from buffered geometry JSON
    const loader = new BufferGeometryLoader()
    const geometry = loader.parse(geoData)
    geometry.computeBoundingSphere()
    geometry.computeVertexNormals()

    const mesh = new THREE.Mesh(geometry, this.makeMaterial(type))
    mesh.scale.setScalar(MESH_VISUAL_SCALE)
    mesh.castShadow = true
    mesh.receiveShadow = true

    // Attach numerals to each face (cached layout per die type).
    for (const label of this.getFaceLayout(type)) {
      const plane = new THREE.Mesh(
        new THREE.PlaneGeometry(label.size, label.size),
        new THREE.MeshBasicMaterial({
          map: this.numberTexture(label.value, type),
          transparent: true,
          depthWrite: false,
        }),
      )
      plane.position.copy(label.position)
      plane.quaternion.copy(label.quaternion)
      mesh.add(plane)
    }

    this.scene.add(mesh)

    // cannon-es body
    const body = new CANNON.Body({
      mass: 1,
      material: this.diceMaterial,
      angularDamping: 0.08,
      linearDamping: 0.05,
      sleepTimeLimit: 0.4,
      sleepSpeedLimit: 0.8,
      allowSleep: true,
    })

    let physicsShape: CANNON.ConvexPolyhedron | CANNON.Cylinder
    let faceValues: number[] = []

    if (shapeData.type === 'ConvexPolyhedron' && shapeData.vertices && shapeData.faces) {
      const verts = shapeData.vertices.map(
        (v) => new CANNON.Vec3(v[0] * PHYSICS_RADIUS, v[1] * PHYSICS_RADIUS, v[2] * PHYSICS_RADIUS)
      )
      const faces = shapeData.faces.map((f) =>
        shapeData.skipLastFaceIndex ? f.slice(0, -1) : f
      )
      physicsShape = new CANNON.ConvexPolyhedron({ vertices: verts, faces })
      faceValues = shapeData.faceValues ?? []
    } else {
      // Cylinder (d100, d2)
      const rt = (shapeData.radiusTop ?? 1) * PHYSICS_RADIUS
      const rb = (shapeData.radiusBottom ?? 1) * PHYSICS_RADIUS
      const ht = (shapeData.height ?? 0.1) * PHYSICS_RADIUS
      physicsShape = new CANNON.Cylinder(rt, rb, ht, shapeData.numSegments ?? 8)
      faceValues = shapeData.faceValues ?? []
    }

    body.addShape(physicsShape)

    // ── Varied throw — randomize spawn, velocity direction/strength and spin
    // generously so no two rolls look the same.
    const spread = total > 1 ? 4 : 2
    const xBase = (index - (total - 1) / 2) * spread
    const side = Math.random() < 0.5 ? -1 : 1
    body.position.set(
      xBase + (Math.random() - 0.5) * 6,
      16 + Math.random() * 8,
      -10 + Math.random() * 20
    )
    const speed = 16 + Math.random() * 16
    body.velocity.set(
      side * (4 + Math.random() * 8) - xBase * 0.3,
      -speed,
      (Math.random() - 0.5) * 14
    )
    const spin = 14 + Math.random() * 18
    body.angularVelocity.set(
      (Math.random() - 0.5) * spin * 2,
      (Math.random() - 0.5) * spin * 2,
      (Math.random() - 0.5) * spin * 2
    )

    // Impact sound on collisions, scaled by impact speed.
    if (this.prefs.soundEnabled) {
      body.addEventListener('collide', (e: any) => {
        const vn = Math.abs(e?.contact?.getImpactVelocityAlongNormal?.() ?? 0)
        if (vn > 2.5) playDiceImpact(Math.min(1, vn / 30))
      })
    }

    this.world.addBody(body)

    return { mesh, body, shape: physicsShape, type, targetValue, faceValues }
  }

  private makeMaterial(type: DiceType): THREE.Material {
    const color = this.prefs.bodyColor ?? DEFAULT_DIE_COLORS[type]
    if (this.prefs.material === 'glass') {
      return new THREE.MeshPhysicalMaterial({
        color,
        metalness: 0,
        roughness: 0.1,
        transmission: 0.85,
        thickness: 1.2,
        ior: 1.5,
        transparent: true,
        opacity: 0.92,
        envMapIntensity: 0.8,
      })
    }
    if (this.prefs.material === 'metal') {
      return new THREE.MeshStandardMaterial({
        color, metalness: 0.9, roughness: 0.25, envMapIntensity: 0.8,
      })
    }
    return new THREE.MeshStandardMaterial({
      color, metalness: 0.15, roughness: 0.5, envMapIntensity: 0.5,
    })
  }

  // ─── Result settling ─────────────────────────────────────────────────────────

  /** Prepare a die's eased settle: from its current pose to the nearest pose
   *  that shows the target face up (minimal rotation, so it tips rather than
   *  spins). Cylinders just sleep in place. */
  private beginSettle(die: DieMesh, now: number) {
    const { body, shape, faceValues, targetValue } = die
    if (!(shape instanceof CANNON.ConvexPolyhedron)) {
      body.velocity.set(0, 0, 0)
      body.angularVelocity.set(0, 0, 0)
      return
    }
    const idx = faceValues.findIndex((v) => v === targetValue)
    if (idx === -1 || !shape.faceNormals.length) return

    const faceNormal = shape.faceNormals[idx]
    const up = new CANNON.Vec3(0, 1, 0)

    // Base rotation bringing the target face normal to +Y.
    const axis = new CANNON.Vec3()
    faceNormal.cross(up, axis)
    let base: CANNON.Quaternion
    if (axis.length() < 1e-4) {
      base = new CANNON.Quaternion(0, 0, 0, 1)
      if (faceNormal.dot(up) < 0) base.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), Math.PI)
    } else {
      axis.normalize()
      const angle = Math.acos(Math.min(1, Math.max(-1, faceNormal.dot(up))))
      base = new CANNON.Quaternion()
      base.setFromAxisAngle(axis, angle)
    }

    // Among yaw rotations about +Y (which keep the same face up), pick the one
    // closest to the die's current orientation so the correction is minimal.
    const current = body.quaternion
    let best = base
    let bestDot = -1
    for (let i = 0; i < 12; i++) {
      const yaw = new CANNON.Quaternion()
      yaw.setFromAxisAngle(up, (i / 12) * Math.PI * 2)
      const cand = new CANNON.Quaternion()
      yaw.mult(base, cand)
      const d = Math.abs(
        cand.x * current.x + cand.y * current.y + cand.z * current.z + cand.w * current.w,
      )
      if (d > bestDot) { bestDot = d; best = cand }
    }

    die.settling = { from: current.clone(), to: best, start: now }
  }

  // ─── Face label layout ─────────────────────────────────────────────────────────

  /** Compute (once per die type) where each numeral sits on the visual mesh.
   *  We cluster the visual geometry's triangles into faces by flat normal,
   *  then match each face to its value via the physics shape's face normals. */
  private getFaceLayout(type: DiceType): FaceLabel[] {
    const cached = faceLayoutCache.get(type)
    if (cached) return cached

    const shapeData = (DICE_SHAPE as any)[type]
    if (!shapeData || shapeData.type !== 'ConvexPolyhedron') {
      faceLayoutCache.set(type, [])
      return []
    }

    const geo = new BufferGeometryLoader().parse((DICE_MODELS as any)[type]) as THREE.BufferGeometry
    geo.computeBoundingSphere()
    const radius = geo.boundingSphere?.radius ?? 90
    const size = radius * (LABEL_SIZE_FACTOR[type] ?? 0.5)

    const pos = geo.attributes.position as THREE.BufferAttribute
    const index = geo.index
    const triCount = index ? index.count / 3 : pos.count / 3

    // Cluster triangles by flat normal.
    const clusters: { normal: THREE.Vector3; centroid: THREE.Vector3; n: number }[] = []
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3()
    const ab = new THREE.Vector3(), ac = new THREE.Vector3(), nrm = new THREE.Vector3(), ctr = new THREE.Vector3()
    for (let t = 0; t < triCount; t++) {
      const i0 = index ? index.getX(t * 3) : t * 3
      const i1 = index ? index.getX(t * 3 + 1) : t * 3 + 1
      const i2 = index ? index.getX(t * 3 + 2) : t * 3 + 2
      a.fromBufferAttribute(pos, i0)
      b.fromBufferAttribute(pos, i1)
      c.fromBufferAttribute(pos, i2)
      ab.subVectors(b, a); ac.subVectors(c, a)
      nrm.crossVectors(ab, ac)
      if (nrm.lengthSq() < 1e-8) continue
      nrm.normalize()
      ctr.copy(a).add(b).add(c).multiplyScalar(1 / 3)
      let cl = clusters.find((cc) => cc.normal.dot(nrm) > 0.97)
      if (!cl) {
        clusters.push({ normal: nrm.clone(), centroid: ctr.clone(), n: 1 })
      } else {
        cl.centroid.add(ctr); cl.n++
        cl.normal.lerp(nrm, 1 / cl.n).normalize()
      }
    }

    // Physics face normals (normalized verts) carry the face VALUES order.
    const verts: CANNON.Vec3[] = shapeData.vertices.map((v: number[]) => new CANNON.Vec3(v[0], v[1], v[2]))
    const faces: number[][] = shapeData.faces.map((f: number[]) => (shapeData.skipLastFaceIndex ? f.slice(0, -1) : f))
    const poly = new CANNON.ConvexPolyhedron({ vertices: verts, faces })
    const faceValues: number[] = shapeData.faceValues ?? []

    const labels: FaceLabel[] = []
    const fwd = new THREE.Vector3(0, 0, 1)
    for (const cl of clusters) {
      cl.centroid.multiplyScalar(1 / cl.n)
      // Match this visual face normal to the nearest physics face normal.
      let bestK = -1, bestDot = -1
      for (let k = 0; k < poly.faceNormals.length; k++) {
        const fn = poly.faceNormals[k]
        const d = cl.normal.x * fn.x + cl.normal.y * fn.y + cl.normal.z * fn.z
        if (d > bestDot) { bestDot = d; bestK = k }
      }
      const value = faceValues[bestK]
      if (value == null) continue
      const quaternion = new THREE.Quaternion().setFromUnitVectors(fwd, cl.normal)
      const position = cl.normal.clone().multiplyScalar(0.6).add(cl.centroid) // tiny outward offset
      labels.push({ position, quaternion, value, size })
    }

    faceLayoutCache.set(type, labels)
    return labels
  }

  private numberTexture(value: number, type: DiceType): THREE.CanvasTexture {
    const color = this.prefs.numberColor
    // d100 faces read as "00".."90"; d10 as "0".."9".
    const text = type === 'd100' ? String(value).padStart(2, '0') : String(value)
    const key = `${text}|${color}`
    const hit = textureCache.get(key)
    if (hit) return hit

    const S = 128
    const canvas = document.createElement('canvas')
    canvas.width = S; canvas.height = S
    const g = canvas.getContext('2d')!
    g.clearRect(0, 0, S, S)
    g.fillStyle = color
    g.font = `bold ${text.length > 1 ? 64 : 84}px "Arial Black", Arial, sans-serif`
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.fillText(text, S / 2, S / 2 + 4)
    // Underline 6 and 9 so they're not ambiguous when tumbling.
    if (text === '6' || text === '9') {
      g.fillRect(S / 2 - 22, S / 2 + 34, 44, 7)
    }
    const tex = new THREE.CanvasTexture(canvas)
    tex.anisotropy = 4
    tex.needsUpdate = true
    textureCache.set(key, tex)
    return tex
  }

  private size() {
    return {
      w: this.container.clientWidth || window.innerWidth,
      h: this.container.clientHeight || window.innerHeight,
    }
  }
}

/** SLERP two cannon quaternions into `out` at t∈[0,1]. */
function slerpQuat(qa: CANNON.Quaternion, qb: CANNON.Quaternion, t: number, out: CANNON.Quaternion) {
  let ax = qa.x, ay = qa.y, az = qa.z, aw = qa.w
  let bx = qb.x, by = qb.y, bz = qb.z, bw = qb.w
  let cos = ax * bx + ay * by + az * bz + aw * bw
  if (cos < 0) { bx = -bx; by = -by; bz = -bz; bw = -bw; cos = -cos }
  if (cos > 0.9995) {
    out.set(ax + t * (bx - ax), ay + t * (by - ay), az + t * (bz - az), aw + t * (bw - aw))
    out.normalize()
    return
  }
  const theta = Math.acos(Math.min(1, cos))
  const sin = Math.sin(theta)
  const wa = Math.sin((1 - t) * theta) / sin
  const wb = Math.sin(t * theta) / sin
  out.set(wa * ax + wb * bx, wa * ay + wb * by, wa * az + wb * bz, wa * aw + wb * bw)
}
