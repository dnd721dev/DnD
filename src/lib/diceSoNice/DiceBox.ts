/**
 * Standalone 3D dice box using Three.js + cannon-es.
 * Geometry data from Dice So Nice (AGPL) by Simone Ricciardi.
 * FoundryVTT-specific code has been removed; React lifecycle is handled externally.
 */
import * as THREE from 'three'
import { BufferGeometryLoader } from 'three'
import * as CANNON from 'cannon-es'
import { DICE_MODELS, DICE_SHAPE } from './DiceModels'

export type DiceType = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20' | 'd100'

// Physics scale: DICE_SHAPE vertices are normalized ~±1–1.7 units.
// We scale them up so dice feel weighty in the scene.
const PHYSICS_RADIUS = 2.2

// Visual scale: DICE_MODELS geometry positions are in the ~90-unit range.
// Scale mesh so its radius roughly matches PHYSICS_RADIUS.
const MESH_VISUAL_SCALE = PHYSICS_RADIUS / 90

interface DieMesh {
  mesh: THREE.Mesh
  body: CANNON.Body
  shape: CANNON.ConvexPolyhedron | CANNON.Cylinder
  type: DiceType
  targetValue: number
  faceValues: number[]
}

export class DiceBox {
  private container: HTMLElement
  private scene!: THREE.Scene
  private camera!: THREE.PerspectiveCamera
  private renderer!: THREE.WebGLRenderer
  private world!: CANNON.World
  private diceMaterial!: CANNON.Material
  private dice: DieMesh[] = []
  private animFrameId: number | null = null

  constructor(container: HTMLElement) {
    this.container = container
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
    this.camera.position.set(0, 22, 18)
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

      const animate = () => {
        const elapsed = performance.now() - startTime
        this.world.step(1 / 60, 1 / 60, 10)

        for (const die of this.dice) {
          die.mesh.position.copy(die.body.position as unknown as THREE.Vector3)
          die.mesh.quaternion.copy(die.body.quaternion as unknown as THREE.Quaternion)
        }

        this.renderer.render(this.scene, this.camera)

        const allSettled =
          elapsed > 2000 &&
          this.dice.every(
            (d) =>
              d.body.sleepState === CANNON.Body.SLEEPING ||
              (d.body.velocity.length() < 0.5 && d.body.angularVelocity.length() < 0.5)
          )

        if (elapsed > MAX_MS || allSettled) {
          for (const die of this.dice) this.snapToResult(die)
          this.renderer.render(this.scene, this.camera)
          resolve()
          return
        }

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

    const mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({
        color: this.dieColor(type),
        metalness: 0.45,
        roughness: 0.35,
        envMapIntensity: 0.6,
      })
    )
    mesh.scale.setScalar(MESH_VISUAL_SCALE)
    mesh.castShadow = true
    mesh.receiveShadow = true
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

    // Random spawn from above
    const spread = total > 1 ? 4 : 2
    const xBase = (index - (total - 1) / 2) * spread
    body.position.set(
      xBase + (Math.random() - 0.5) * 3,
      18 + Math.random() * 5,
      (Math.random() - 0.5) * 4
    )
    body.velocity.set(
      -xBase * 0.4 + (Math.random() - 0.5) * 3,
      -22 - Math.random() * 8,
      (Math.random() - 0.5) * 3
    )
    body.angularVelocity.set(
      (Math.random() - 0.5) * 20,
      (Math.random() - 0.5) * 20,
      (Math.random() - 0.5) * 20
    )

    this.world.addBody(body)

    return { mesh, body, shape: physicsShape, type, targetValue, faceValues }
  }

  // ─── Result snapping ─────────────────────────────────────────────────────────

  private snapToResult(die: DieMesh) {
    const { body, shape, faceValues, targetValue } = die

    if (!(shape instanceof CANNON.ConvexPolyhedron)) {
      body.velocity.set(0, 0, 0)
      body.angularVelocity.set(0, 0, 0)
      body.sleep()
      return
    }

    const targetFaceIndex = faceValues.findIndex((v) => v === targetValue)
    if (targetFaceIndex === -1 || !shape.faceNormals.length) {
      body.sleep()
      return
    }

    // Rotate the die so face normal points up (world +Y)
    const faceNormal = shape.faceNormals[targetFaceIndex]
    const up = new CANNON.Vec3(0, 1, 0)

    const axis = new CANNON.Vec3()
    faceNormal.cross(up, axis)

    let q: CANNON.Quaternion
    if (axis.length() < 1e-4) {
      q = new CANNON.Quaternion(0, 0, 0, 1)
      if (faceNormal.dot(up) < 0) q.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), Math.PI)
    } else {
      axis.normalize()
      const angle = Math.acos(Math.min(1, Math.max(-1, faceNormal.dot(up))))
      q = new CANNON.Quaternion()
      q.setFromAxisAngle(axis, angle)
    }

    // Random in-plane rotation around Y (aesthetic)
    const spin = new CANNON.Quaternion()
    spin.setFromAxisAngle(up, Math.random() * Math.PI * 2)
    const finalQ = new CANNON.Quaternion()
    spin.mult(q, finalQ)

    body.quaternion.copy(finalQ)
    body.velocity.set(0, 0, 0)
    body.angularVelocity.set(0, 0, 0)
    body.sleep()

    die.mesh.quaternion.copy(body.quaternion as unknown as THREE.Quaternion)
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private dieColor(type: DiceType): number {
    const map: Partial<Record<DiceType, number>> = {
      d4: 0x0e7490,
      d6: 0xb45309,
      d8: 0x065f46,
      d10: 0x9a3412,
      d12: 0x5b21b6,
      d20: 0x1e3a8a,
      d100: 0x334155,
    }
    return map[type] ?? 0x334155
  }

  private size() {
    return {
      w: this.container.clientWidth || window.innerWidth,
      h: this.container.clientHeight || window.innerHeight,
    }
  }
}
