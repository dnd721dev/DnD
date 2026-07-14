'use client'

// The Vault — the marketplace's 3D showpiece. A dark arcane treasury rendered
// with the raw three.js already bundled for the 3D dice (no new deps):
// stone columns, drifting ember motes, and the featured listing floating on a
// lit pedestal. Heavy work is opt-out by design — static frame under
// prefers-reduced-motion, paused while offscreen/hidden, and a plain styled
// fallback when WebGL isn't available.

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

export type VaultFeatured = {
  image: string | null
  name: string
  /** 0xRRGGBB accent for the pedestal light (e.g. gold for NFTs, emerald for maps) */
  accent?: number
}

function webglAvailable(): boolean {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

export default function VaultScene({ featured }: { featured: VaultFeatured | null }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [fallback, setFallback] = useState(false)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    if (!webglAvailable()) { setFallback(true); return }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const accent = featured?.accent ?? 0xd4a94f

    // ── Renderer / scene / camera ────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(host.clientWidth, host.clientHeight)
    host.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(0x070a12, 0.055)

    const camera = new THREE.PerspectiveCamera(42, host.clientWidth / host.clientHeight, 0.1, 60)
    camera.position.set(0, 1.7, 7.2)
    camera.lookAt(0, 1.15, 0)

    // ── Lighting: dim vault + warm pedestal light + violet rim ──────────────
    scene.add(new THREE.AmbientLight(0x25283a, 1.1))
    const keyLight = new THREE.PointLight(accent, 26, 12, 2)
    keyLight.position.set(0, 3.1, 0.6)
    scene.add(keyLight)
    const rimLight = new THREE.PointLight(0x6a4fc9, 10, 14, 2)
    rimLight.position.set(-3.5, 1.2, -3.5)
    scene.add(rimLight)

    // ── Stone floor ──────────────────────────────────────────────────────────
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(14, 48),
      new THREE.MeshStandardMaterial({ color: 0x11141f, roughness: 0.92, metalness: 0.15 }),
    )
    floor.rotation.x = -Math.PI / 2
    scene.add(floor)

    // ── Perimeter columns ────────────────────────────────────────────────────
    const columnGeo = new THREE.CylinderGeometry(0.34, 0.42, 7, 12)
    const columnMat = new THREE.MeshStandardMaterial({ color: 0x191d2c, roughness: 0.85 })
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + 0.35
      const col = new THREE.Mesh(columnGeo, columnMat)
      col.position.set(Math.cos(a) * 6.4, 3.2, Math.sin(a) * 6.4 - 1.5)
      scene.add(col)
    }

    // ── Pedestal ─────────────────────────────────────────────────────────────
    const pedestalMat = new THREE.MeshStandardMaterial({ color: 0x1c2030, roughness: 0.6, metalness: 0.45 })
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.35, 0.28, 28), pedestalMat)
    base.position.y = 0.14
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.7, 0.75, 22), pedestalMat)
    shaft.position.y = 0.65
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.6, 0.16, 26), pedestalMat)
    top.position.y = 1.1
    const trim = new THREE.Mesh(
      new THREE.TorusGeometry(0.72, 0.035, 10, 40),
      new THREE.MeshStandardMaterial({ color: accent, roughness: 0.3, metalness: 0.9, emissive: accent, emissiveIntensity: 0.25 }),
    )
    trim.rotation.x = Math.PI / 2
    trim.position.y = 1.19
    scene.add(base, shaft, top, trim)

    // ── The artifact: featured image card, or an arcane gem when none ────────
    const artifact = new THREE.Group()
    artifact.position.y = 2.15
    scene.add(artifact)

    const gem = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.55, 0),
      new THREE.MeshStandardMaterial({
        color: accent, roughness: 0.15, metalness: 0.7,
        emissive: accent, emissiveIntensity: 0.55, flatShading: true,
      }),
    )
    artifact.add(gem)

    if (featured?.image) {
      const loader = new THREE.TextureLoader()
      loader.setCrossOrigin('anonymous')
      loader.load(
        featured.image,
        (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace
          const img = tex.image as { width?: number; height?: number }
          const ratio = img?.width && img?.height ? img.width / img.height : 1
          const h = 1.85
          const card = new THREE.Mesh(
            new THREE.PlaneGeometry(h * Math.min(ratio, 1.1), h),
            new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide, toneMapped: false }),
          )
          const backing = new THREE.Mesh(
            new THREE.PlaneGeometry(h * Math.min(ratio, 1.1) + 0.08, h + 0.08),
            new THREE.MeshStandardMaterial({
              color: accent, roughness: 0.35, metalness: 0.85, side: THREE.DoubleSide,
              emissive: accent, emissiveIntensity: 0.18,
            }),
          )
          backing.position.z = -0.012
          artifact.remove(gem)
          artifact.add(backing, card)
          if (reducedMotion) renderer.render(scene, camera) // refresh static frame
        },
        undefined,
        () => { /* CORS or 404 — keep the gem */ },
      )
    }

    // ── Ember motes ──────────────────────────────────────────────────────────
    const MOTES = 130
    const motePos = new Float32Array(MOTES * 3)
    const moteSpeed = new Float32Array(MOTES)
    for (let i = 0; i < MOTES; i++) {
      motePos[i * 3] = (Math.random() - 0.5) * 12
      motePos[i * 3 + 1] = Math.random() * 5.5
      motePos[i * 3 + 2] = (Math.random() - 0.5) * 9 - 1
      moteSpeed[i] = 0.15 + Math.random() * 0.35
    }
    const moteGeo = new THREE.BufferGeometry()
    moteGeo.setAttribute('position', new THREE.BufferAttribute(motePos, 3))
    const motes = new THREE.Points(moteGeo, new THREE.PointsMaterial({
      color: 0xe2a05b, size: 0.045, transparent: true, opacity: 0.75,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }))
    scene.add(motes)

    // ── Pointer parallax ─────────────────────────────────────────────────────
    const pointer = { x: 0, y: 0 }
    const onPointer = (e: PointerEvent) => {
      const r = host.getBoundingClientRect()
      pointer.x = ((e.clientX - r.left) / r.width - 0.5) * 2
      pointer.y = ((e.clientY - r.top) / r.height - 0.5) * 2
    }
    host.addEventListener('pointermove', onPointer)

    // ── Animation loop — paused offscreen/hidden; static under reduced motion ─
    let raf = 0
    let running = false
    let visible = true
    const clock = new THREE.Clock()

    const tick = () => {
      const t = clock.getElapsedTime()
      artifact.rotation.y = t * 0.45
      artifact.position.y = 2.15 + Math.sin(t * 1.3) * 0.07
      gem.rotation.x = t * 0.3
      const p = moteGeo.getAttribute('position') as THREE.BufferAttribute
      for (let i = 0; i < MOTES; i++) {
        let y = p.getY(i) + moteSpeed[i] * 0.016
        if (y > 5.8) y = 0
        p.setY(i, y)
      }
      p.needsUpdate = true
      camera.position.x += (pointer.x * 0.55 - camera.position.x) * 0.04
      camera.position.y += (1.7 - pointer.y * 0.3 - camera.position.y) * 0.04
      camera.lookAt(0, 1.15, 0)
      renderer.render(scene, camera)
      raf = requestAnimationFrame(tick)
    }
    const start = () => {
      if (running || reducedMotion || !visible || document.hidden) return
      running = true
      clock.start()
      raf = requestAnimationFrame(tick)
    }
    const stop = () => { running = false; cancelAnimationFrame(raf) }

    if (reducedMotion) {
      renderer.render(scene, camera) // one still frame, no loop
    } else {
      start()
    }

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      if (visible) start(); else stop()
    })
    io.observe(host)
    const onVisibility = () => { if (document.hidden) stop(); else start() }
    document.addEventListener('visibilitychange', onVisibility)

    const onResize = () => {
      camera.aspect = host.clientWidth / host.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(host.clientWidth, host.clientHeight)
      if (reducedMotion) renderer.render(scene, camera)
    }
    const ro = new ResizeObserver(onResize)
    ro.observe(host)

    return () => {
      stop()
      io.disconnect()
      ro.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      host.removeEventListener('pointermove', onPointer)
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh
        if (mesh.geometry) mesh.geometry.dispose()
        const mats = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : []
        for (const m of mats) {
          const std = m as THREE.MeshStandardMaterial & { map?: THREE.Texture }
          std.map?.dispose()
          m.dispose()
        }
      })
      renderer.dispose()
      host.removeChild(renderer.domElement)
    }
  }, [featured?.image, featured?.accent])

  // WebGL-less fallback: a quiet, styled still of the featured item.
  if (fallback) {
    return (
      <div
        className="flex h-full w-full items-center justify-center"
        style={{ background: 'radial-gradient(70% 90% at 50% 100%, rgba(212,169,79,0.12), transparent 65%), var(--bg-abyss)' }}
      >
        {featured?.image ? (
          <img
            src={featured.image}
            alt={featured.name}
            className="max-h-[75%] rounded-lg border"
            style={{ borderColor: 'var(--edge-strong)', boxShadow: 'var(--glow-gold)' }}
          />
        ) : (
          <span className="text-5xl" aria-hidden>🔮</span>
        )}
      </div>
    )
  }

  return <div ref={hostRef} className="h-full w-full" aria-hidden />
}
