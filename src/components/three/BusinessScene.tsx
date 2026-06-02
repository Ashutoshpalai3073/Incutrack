'use client'

import { useRef, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import {
  Float,
  Environment,
  MeshTransmissionMaterial,
  Trail,
  Sparkles,
  Line,
} from '@react-three/drei'
import * as THREE from 'three'

/**
 * "Founder's Ecosystem" — a generative scene representing the entrepreneurial flywheel:
 *   • A central transmissive crystal = THE IDEA (follows cursor)
 *   • A helical growth spiral of nodes climbing upward = COMPOUNDING TRACTION
 *   • A constellation network connecting nodes = THE FOUNDER NETWORK
 *   • Orbiting capital "coins" with trailing comets = FUNDING IN MOTION
 *   • Drifting sparkles = AMBIENT OPPORTUNITY
 * Everything is cursor-reactive, layered, and color-graded for a premium feel.
 */

function useCursor() {
  const { mouse } = useThree()
  return mouse
}

/* ---------- 1. The Idea (central crystal) ---------- */
function CoreIdea() {
  const mesh = useRef<THREE.Mesh>(null)
  const halo = useRef<THREE.Mesh>(null)
  const mouse = useCursor()
  useFrame((s) => {
    if (!mesh.current || !halo.current) return
    const t = s.clock.elapsedTime
    mesh.current.rotation.x = t * 0.25 + mouse.y * 0.6
    mesh.current.rotation.y = t * 0.35 + mouse.x * 0.8
    mesh.current.position.x = THREE.MathUtils.lerp(mesh.current.position.x, mouse.x * 0.8, 0.06)
    mesh.current.position.y = THREE.MathUtils.lerp(mesh.current.position.y, 1.2 + mouse.y * 0.4, 0.06)
    halo.current.position.copy(mesh.current.position)
    halo.current.rotation.z = t * 0.4
    halo.current.scale.setScalar(1 + Math.sin(t * 2) * 0.05)
  })
  return (
    <>
      <Float speed={1.4} rotationIntensity={0.4} floatIntensity={0.6}>
        <mesh ref={mesh} position={[0, 1.2, 0]}>
          <icosahedronGeometry args={[0.85, 0]} />
          <MeshTransmissionMaterial
            backside
            samples={6}
            thickness={0.7}
            roughness={0.05}
            chromaticAberration={0.6}
            anisotropy={0.4}
            distortion={0.5}
            distortionScale={0.4}
            temporalDistortion={0.15}
            color="#a78bfa"
          />
        </mesh>
      </Float>
      {/* Saturn-style halo ring */}
      <mesh ref={halo} rotation={[Math.PI / 2.3, 0, 0]}>
        <torusGeometry args={[1.4, 0.012, 16, 128]} />
        <meshBasicMaterial color="#c4b5fd" transparent opacity={0.55} />
      </mesh>
      <pointLight position={[0, 1.2, 0]} intensity={2.4} color="#c4b5fd" distance={5} />
    </>
  )
}

/* ---------- 2. Growth Helix (DNA-like compounding spiral) ---------- */
function GrowthHelix() {
  const group = useRef<THREE.Group>(null)
  const nodes = useMemo(() => {
    const arr: { pos: [number, number, number]; hue: number; size: number }[] = []
    const turns = 3
    const count = 26
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1)
      const angle = t * turns * Math.PI * 2
      const y = -1.8 + t * 3.6
      const radius = 0.55 + t * 0.35 // expanding outward = growth
      const x = Math.cos(angle) * radius
      const z = Math.sin(angle) * radius
      arr.push({
        pos: [x, y, z],
        hue: 0.55 + t * 0.15,
        size: 0.06 + t * 0.05,
      })
    }
    return arr
  }, [])

  // connecting line through the helix
  const linePoints = useMemo(
    () => nodes.map((n) => new THREE.Vector3(...n.pos)),
    [nodes],
  )

  useFrame((s) => {
    if (!group.current) return
    group.current.rotation.y = s.clock.elapsedTime * 0.18
  })

  return (
    <group ref={group} position={[-0.2, 0, 0]}>
      <Line
        points={linePoints}
        color="#7dd3fc"
        lineWidth={1}
        transparent
        opacity={0.45}
      />
      {nodes.map((n, i) => (
        <mesh key={i} position={n.pos}>
          <sphereGeometry args={[n.size, 16, 16]} />
          <meshStandardMaterial
            color={new THREE.Color().setHSL(n.hue, 0.8, 0.6)}
            emissive={new THREE.Color().setHSL(n.hue, 1, 0.5)}
            emissiveIntensity={1.2}
            roughness={0.3}
            metalness={0.4}
          />
        </mesh>
      ))}
    </group>
  )
}

/* ---------- 3. Constellation Network ---------- */
function Constellation() {
  const group = useRef<THREE.Group>(null)
  const mouse = useCursor()
  const { nodes, edges } = useMemo(() => {
    const n: THREE.Vector3[] = []
    const seed = 12
    for (let i = 0; i < seed; i++) {
      const phi = Math.acos(-1 + (2 * i) / seed)
      const theta = Math.sqrt(seed * Math.PI) * phi
      const r = 2.4 + Math.random() * 0.4
      n.push(
        new THREE.Vector3(
          r * Math.cos(theta) * Math.sin(phi),
          r * Math.sin(theta) * Math.sin(phi) * 0.6,
          r * Math.cos(phi),
        ),
      )
    }
    const e: [THREE.Vector3, THREE.Vector3][] = []
    for (let i = 0; i < n.length; i++) {
      for (let j = i + 1; j < n.length; j++) {
        if (n[i].distanceTo(n[j]) < 2.2) e.push([n[i], n[j]])
      }
    }
    return { nodes: n, edges: e }
  }, [])

  useFrame((s) => {
    if (!group.current) return
    group.current.rotation.y = s.clock.elapsedTime * 0.08 + mouse.x * 0.4
    group.current.rotation.x = -mouse.y * 0.2
  })

  return (
    <group ref={group}>
      {edges.map(([a, b], i) => (
        <Line
          key={i}
          points={[a, b]}
          color="#22d3ee"
          lineWidth={0.6}
          transparent
          opacity={0.18}
        />
      ))}
      {nodes.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.045, 12, 12]} />
          <meshBasicMaterial color="#67e8f9" />
        </mesh>
      ))}
    </group>
  )
}

/* ---------- 4. Capital Comets (orbiting trailing spheres) ---------- */
function CapitalComets() {
  const refs = useRef<THREE.Mesh[]>([])
  const comets = useMemo(
    () =>
      Array.from({ length: 3 }).map((_, i) => ({
        radius: 2.0 + i * 0.5,
        speed: 0.6 + i * 0.25,
        tilt: i * 0.4,
        phase: (i / 3) * Math.PI * 2,
        color: ['#fbbf24', '#34d399', '#f472b6'][i],
      })),
    [],
  )
  useFrame((s) => {
    const t = s.clock.elapsedTime
    refs.current.forEach((m, i) => {
      if (!m) return
      const c = comets[i]
      const a = t * c.speed + c.phase
      m.position.set(
        Math.cos(a) * c.radius,
        Math.sin(a * 1.3 + c.tilt) * 0.6 + 1.2,
        Math.sin(a) * c.radius,
      )
    })
  })
  return (
    <>
      {comets.map((c, i) => (
        <Trail
          key={i}
          width={0.7}
          length={5}
          color={new THREE.Color(c.color)}
          attenuation={(w) => w * w}
        >
          <mesh ref={(el) => el && (refs.current[i] = el)}>
            <sphereGeometry args={[0.09, 16, 16]} />
            <meshStandardMaterial
              color={c.color}
              emissive={c.color}
              emissiveIntensity={2}
            />
          </mesh>
        </Trail>
      ))}
    </>
  )
}

/* ---------- 5. Scene Parallax Wrapper ---------- */
function SceneTilt({ children }: { children: React.ReactNode }) {
  const group = useRef<THREE.Group>(null)
  const mouse = useCursor()
  useFrame(() => {
    if (!group.current) return
    group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, mouse.x * 0.18, 0.05)
    group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, -mouse.y * 0.1, 0.05)
  })
  return (
    <group ref={group} position={[2.4, 0, 0]}>
      {children}
    </group>
  )
}

export function BusinessScene({ className }: { className?: string }) {
  return (
    <Canvas
      className={className}
      dpr={[1, 2]}
      camera={{ position: [0, 1.4, 6], fov: 45 }}
      gl={{ alpha: true, antialias: true }}
      style={{ background: 'transparent' }}
    >
      <ambientLight intensity={0.3} />
      <directionalLight position={[4, 6, 4]} intensity={1.1} />
      <pointLight position={[-4, 2, -2]} intensity={0.8} color="#6366f1" />
      <pointLight position={[4, 1, 3]} intensity={0.6} color="#22d3ee" />

      <SceneTilt>
        <Constellation />
        <GrowthHelix />
        <CapitalComets />
        <CoreIdea />
        <Sparkles
          count={60}
          scale={[6, 5, 6]}
          size={2}
          speed={0.3}
          opacity={0.7}
          color="#c4b5fd"
        />
      </SceneTilt>

      <Environment preset="city" />
    </Canvas>
  )
}

export default BusinessScene
