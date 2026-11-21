"use client";

import React, { useRef, useState, useMemo, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import * as THREE from "three";
import { QubitNode, CouplerEdge } from "@/types/quantum";

interface ScrollQuantumProcessor3DProps {
  nodes: QubitNode[];
  edges: CouplerEdge[];
  scrollProgress: number; // 0.0 to 1.0
  activeLayout?: Record<number, number> | null;
  interactive?: boolean;
}

// Warm Luxury Observatory Color Palette (Strictly Enforced)
const COLORS = {
  optimal: "#C6A56B",        // Champagne Gold
  warning: "#D9944A",        // Warm Amber
  critical: "#943846",       // Deep Terracotta
  dead: "#702D3A",           // Rich Wine Burgundy
  deadGlow: "#943846",       // Terracotta Warning Glow
  selected: "#F4EFE6",       // Warm Ivory
  mapped: "#C66B42",         // Burnt Orange
  mappedGlow: "#E88A58",     // Amber Corona
  coupler: "#4A3B32",        // Warm Antique Bronze Wire
  couplerActive: "#C6A56B",  // Gold Signal Wire
  couplerBroken: "#702D3A",  // Burgundy Defect Wire
  gridLine: "#2E2522",       // Cryo-Plate Substrate Grid
  dust: "#C6A56B",           // Quantum Particles
};

function getQubitColor(node: QubitNode, isMapped: boolean) {
  if (isMapped) return COLORS.mapped;
  if (node.status === "dead") return COLORS.dead;
  if (node.error_tier === "warning") return COLORS.warning;
  return COLORS.optimal;
}

// ---------------------------------------------------------------------------
// 1. Cryogenic Substrate Plate (IBM Heron Dilution Package Base)
// ---------------------------------------------------------------------------
function SubstratePlate() {
  const meshRef = useRef<THREE.Mesh>(null);

  return (
    <group position={[0, 0, -2.5]}>
      {/* Dark warm cryo-plate base */}
      <mesh ref={meshRef} receiveShadow>
        <planeGeometry args={[42, 34, 16, 16]} />
        <meshStandardMaterial
          color="#181311"
          roughness={0.88}
          metalness={0.35}
          wireframe={false}
        />
      </mesh>

      {/* Subtle cryo-grid relief */}
      <gridHelper
        args={[40, 20, COLORS.coupler, COLORS.gridLine]}
        rotation={[Math.PI / 2, 0, 0]}
        position={[0, 0, 0.05]}
      />
    </group>
  );
}

// ---------------------------------------------------------------------------
// 2. Quantum Starfield Dust (Ambient Parallax Depth)
// ---------------------------------------------------------------------------
function QuantumDust({ count = 180 }: { count?: number }) {
  const pointsRef = useRef<THREE.Points>(null);

  const [positions, scales] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const sc = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3 + 0] = (Math.random() - 0.5) * 44;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 36;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 22;
      sc[i] = Math.random() * 0.8 + 0.4;
    }
    return [pos, sc];
  }, [count]);

  useFrame((state) => {
    if (pointsRef.current) {
      const t = state.clock.elapsedTime * 0.04;
      pointsRef.current.rotation.y = t * 0.3;
      pointsRef.current.rotation.x = Math.sin(t * 0.2) * 0.05;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.16}
        color={COLORS.dust}
        transparent
        opacity={0.35}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// ---------------------------------------------------------------------------
// 3. Animated Signal Packets Traveling on Active Couplers
// ---------------------------------------------------------------------------
function ActiveSignalPackets({
  mappedNodes,
  edges,
}: {
  mappedNodes: Map<number, QubitNode>;
  edges: CouplerEdge[];
}) {
  const packetsRef = useRef<THREE.InstancedMesh>(null);
  const activePairs = useMemo(() => {
    const pairs: { src: [number, number, number]; tgt: [number, number, number] }[] = [];
    edges.forEach((edge) => {
      const s = mappedNodes.get(edge.source);
      const t = mappedNodes.get(edge.target);
      if (s && t && edge.is_primary) {
        pairs.push({
          src: [s.x3d, s.y3d, s.z3d],
          tgt: [t.x3d, t.y3d, t.z3d],
        });
      }
    });
    return pairs;
  }, [mappedNodes, edges]);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((state) => {
    if (!packetsRef.current || activePairs.length === 0) return;
    const t = state.clock.elapsedTime * 1.5;

    activePairs.forEach((pair, idx) => {
      // Periodic ping-pong pulse between source and target
      const progress = (Math.sin(t + idx * 0.8) + 1) * 0.5;
      const x = THREE.MathUtils.lerp(pair.src[0], pair.tgt[0], progress);
      const y = THREE.MathUtils.lerp(pair.src[1], pair.tgt[1], progress);
      const z = THREE.MathUtils.lerp(pair.src[2], pair.tgt[2], progress) + 0.12;

      dummy.position.set(x, y, z);
      const pulseScale = 0.12 + Math.sin(t * 3 + idx) * 0.04;
      dummy.scale.set(pulseScale, pulseScale, pulseScale);
      dummy.updateMatrix();
      packetsRef.current!.setMatrixAt(idx, dummy.matrix);
    });

    packetsRef.current.instanceMatrix.needsUpdate = true;
  });

  if (activePairs.length === 0) return null;

  return (
    <instancedMesh
      ref={packetsRef}
      args={[undefined, undefined, activePairs.length]}
    >
      <sphereGeometry args={[1, 12, 12]} />
      <meshBasicMaterial
        color={COLORS.couplerActive}
        transparent
        opacity={0.9}
        blending={THREE.AdditiveBlending}
      />
    </instancedMesh>
  );
}

// ---------------------------------------------------------------------------
// 4. Scroll & Pointer Choreographed Camera Controller
// ---------------------------------------------------------------------------
function CameraController({
  scrollProgress,
  isManual,
}: {
  scrollProgress: number;
  isManual: boolean;
}) {
  const targetPos = useRef(new THREE.Vector3(0, 1.5, 23));
  const targetLook = useRef(new THREE.Vector3(0, 0, 0));

  useFrame((state) => {
    if (isManual) return;

    const p = Math.max(0, Math.min(1, scrollProgress));
    // Subtle mouse parallax offset
    const mouseX = state.pointer.x * 1.8;
    const mouseY = state.pointer.y * 1.2;

    // 5 Distinct Choreographed Waypoints:
    if (p < 0.22) {
      // Stage 1: Hero Overview (Wide cinematic isometric)
      const t = p / 0.22;
      targetPos.current.set(
        THREE.MathUtils.lerp(0, -2.5, t) + mouseX,
        THREE.MathUtils.lerp(1.5, 2.5, t) + mouseY,
        THREE.MathUtils.lerp(23, 17, t)
      );
      targetLook.current.set(
        THREE.MathUtils.lerp(0, -0.8, t),
        THREE.MathUtils.lerp(0, 0.4, t),
        0
      );
    } else if (p < 0.45) {
      // Stage 2: Heavy-Hex Lattice (Low angle tilt into hexagonal topology)
      const t = (p - 0.22) / 0.23;
      targetPos.current.set(
        THREE.MathUtils.lerp(-2.5, 4.2, t) + mouseX,
        THREE.MathUtils.lerp(2.5, -2.8, t) + mouseY,
        THREE.MathUtils.lerp(17, 13.5, t)
      );
      targetLook.current.set(
        THREE.MathUtils.lerp(-0.8, 1.8, t),
        THREE.MathUtils.lerp(0.4, -0.6, t),
        0
      );
    } else if (p < 0.68) {
      // Stage 3: GNN Active Subgraph (Close-up focus on mapped cluster Q65..Q77)
      const t = (p - 0.45) / 0.23;
      targetPos.current.set(
        THREE.MathUtils.lerp(4.2, -4.5, t) + mouseX,
        THREE.MathUtils.lerp(-2.8, 3.2, t) + mouseY,
        THREE.MathUtils.lerp(13.5, 12, t)
      );
      targetLook.current.set(
        THREE.MathUtils.lerp(1.8, -1.8, t),
        THREE.MathUtils.lerp(-0.6, 1.2, t),
        0
      );
    } else if (p < 0.88) {
      // Stage 4: Defect Corridor Isolation (Focus on dead qubits 113, 121, 131, 146)
      const t = (p - 0.68) / 0.20;
      targetPos.current.set(
        THREE.MathUtils.lerp(-4.5, 5.5, t) + mouseX,
        THREE.MathUtils.lerp(3.2, 3.8, t) + mouseY,
        THREE.MathUtils.lerp(12, 14, t)
      );
      targetLook.current.set(
        THREE.MathUtils.lerp(-1.8, 2.2, t),
        THREE.MathUtils.lerp(1.2, 1.5, t),
        0
      );
    } else {
      // Stage 5: Temporal Calibration Drift (Grand high-altitude observatory view)
      const t = (p - 0.88) / 0.12;
      targetPos.current.set(
        THREE.MathUtils.lerp(5.5, 0, t) + mouseX,
        THREE.MathUtils.lerp(3.8, 5.5, t) + mouseY,
        THREE.MathUtils.lerp(14, 24, t)
      );
      targetLook.current.set(
        THREE.MathUtils.lerp(2.2, 0, t),
        THREE.MathUtils.lerp(1.5, -0.5, t),
        0
      );
    }

    // High precision lerp dampening for buttery-smooth camera flight
    state.camera.position.lerp(targetPos.current, 0.05);
    state.camera.lookAt(targetLook.current);
  });

  return null;
}

// ---------------------------------------------------------------------------
// 5. Pulsing Hazard Rings around Defect Qubits
// ---------------------------------------------------------------------------
function DefectHazardMarker({ position }: { position: [number, number, number] }) {
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (ringRef.current) {
      const t = state.clock.elapsedTime * 2.2;
      const s = 1.0 + Math.sin(t) * 0.22;
      ringRef.current.scale.set(s, s, s);
      const mat = ringRef.current.material as THREE.MeshBasicMaterial;
      if (mat) mat.opacity = 0.4 + Math.sin(t) * 0.25;
    }
  });

  return (
    <group position={position}>
      <mesh ref={ringRef} rotation={[0, 0, 0]}>
        <ringGeometry args={[0.38, 0.48, 24]} />
        <meshBasicMaterial
          color={COLORS.dead}
          transparent
          opacity={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
// 6. Pulsing Golden Corona around Active Mapped Qubits
// ---------------------------------------------------------------------------
function MappedCoronaMarker({ position }: { position: [number, number, number] }) {
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (ringRef.current) {
      const t = state.clock.elapsedTime * 2.8;
      const s = 1.0 + Math.sin(t) * 0.18;
      ringRef.current.scale.set(s, s, s);
      const mat = ringRef.current.material as THREE.MeshBasicMaterial;
      if (mat) mat.opacity = 0.55 + Math.sin(t) * 0.3;
    }
  });

  return (
    <group position={position}>
      <mesh ref={ringRef} rotation={[0, 0, 0]}>
        <ringGeometry args={[0.42, 0.52, 24]} />
        <meshBasicMaterial
          color={COLORS.mapped}
          transparent
          opacity={0.7}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
// 7. Complete Animated Heavy-Hex Lattice
// ---------------------------------------------------------------------------
function AnimatedLattice({
  nodes,
  edges,
  scrollProgress,
  activeLayout,
}: {
  nodes: QubitNode[];
  edges: CouplerEdge[];
  scrollProgress: number;
  activeLayout?: Record<number, number> | null;
}) {
  const groupRef = useRef<THREE.Group>(null);

  const mappedSet = useMemo(() => {
    if (!activeLayout) return new Set<number>();
    return new Set(Object.values(activeLayout).map(Number));
  }, [activeLayout]);

  const nodesMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  const mappedNodes = useMemo(() => {
    const map = new Map<number, QubitNode>();
    mappedSet.forEach((id) => {
      const node = nodesMap.get(id);
      if (node) map.set(id, node);
    });
    return map;
  }, [mappedSet, nodesMap]);

  // Gentle procedural float modulated by scroll position
  useFrame((state) => {
    if (groupRef.current) {
      const t = state.clock.elapsedTime;
      // Fluid scroll-coupled rotation
      groupRef.current.rotation.y = Math.sin(t * 0.18) * 0.05 + (scrollProgress * Math.PI * 0.38);
      groupRef.current.rotation.x = Math.cos(t * 0.14) * 0.03 + (scrollProgress * 0.22);
      groupRef.current.position.y = Math.sin(t * 0.25) * 0.15;
    }
  });

  // Coupler lines geometry & coloring
  const lineData = useMemo(() => {
    const points: [number, number, number][] = [];
    const colors: THREE.Color[] = [];

    edges.forEach((edge) => {
      const src = nodesMap.get(edge.source);
      const tgt = nodesMap.get(edge.target);
      if (src && tgt && edge.is_primary) {
        points.push([src.x3d, src.y3d, src.z3d]);
        points.push([tgt.x3d, tgt.y3d, tgt.z3d]);

        let col = new THREE.Color(COLORS.coupler);
        if (edge.status === "broken" || src.status === "dead" || tgt.status === "dead") {
          col = new THREE.Color(COLORS.couplerBroken);
        } else if (mappedSet.has(src.id) && mappedSet.has(tgt.id)) {
          col = new THREE.Color(COLORS.couplerActive);
        } else if (edge.cz_error_pct > 1.2) {
          col = new THREE.Color(COLORS.warning);
        }
        colors.push(col, col);
      }
    });

    return { points, colors };
  }, [edges, nodesMap, mappedSet]);

  const couplerGeometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(lineData.points.flat());
    const cols = new Float32Array(lineData.colors.flatMap((c) => [c.r, c.g, c.b]));
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(cols, 3));
    return g;
  }, [lineData]);

  return (
    <group ref={groupRef}>
      {/* Dilution Refrigerator Substrate */}
      <SubstratePlate />

      {/* Floating Ambient Quantum Dust */}
      <QuantumDust count={160} />

      {/* Physical 352 Coupler Waveguides */}
      <lineSegments geometry={couplerGeometry}>
        <lineBasicMaterial
          vertexColors
          transparent
          opacity={0.65}
          linewidth={1.5}
        />
      </lineSegments>

      {/* Real-Time Gate Signal Packets traveling between mapped qubits */}
      <ActiveSignalPackets mappedNodes={mappedNodes} edges={edges} />

      {/* 156 Physical Qubit Nodes */}
      {nodes.map((node) => {
        const isMapped = mappedSet.has(node.id);
        const isDead = node.status === "dead";
        const color = getQubitColor(node, isMapped);

        return (
          <group key={node.id} position={[node.x3d, node.y3d, node.z3d]}>
            {/* Core Qubit Sphere */}
            <mesh>
              <sphereGeometry args={[isDead ? 0.32 : isMapped ? 0.36 : 0.24, 24, 24]} />
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={isDead ? 0.95 : isMapped ? 0.85 : 0.38}
                roughness={0.22}
                metalness={0.82}
              />
            </mesh>

            {/* Pulsing Marker Rings */}
            {isDead && <DefectHazardMarker position={[0, 0, 0.05]} />}
            {isMapped && <MappedCoronaMarker position={[0, 0, 0.05]} />}

            {/* High-Contrast Scientific Qubit Badges for Key Coordinates */}
            {(isDead || isMapped || node.id === 0 || node.id === 67 || node.id === 155) && (
              <Html position={[0, 0.46, 0]} center distanceFactor={17}>
                <div
                  className={`font-mono text-[9px] font-bold px-1.5 py-0.5 rounded pointer-events-none select-none whitespace-nowrap border shadow-card-warm ${
                    isDead
                      ? "bg-[#702D3A]/90 text-[#F4EFE6] border-[#943846]"
                      : isMapped
                      ? "bg-[#C66B42]/90 text-[#141110] border-[#E88A58]"
                      : "bg-[#1E1917]/90 text-accent-gold border-accent-gold/40"
                  }`}
                >
                  {isDead ? `DEFECT Q${node.id}` : isMapped ? `MAP Q${node.id}` : `Q${node.id}`}
                </div>
              </Html>
            )}
          </group>
        );
      })}
    </group>
  );
}

// ---------------------------------------------------------------------------
// Main Exported Component
// ---------------------------------------------------------------------------
export default function ScrollQuantumProcessor3D({
  nodes,
  edges,
  scrollProgress,
  activeLayout = null,
  interactive = false,
}: ScrollQuantumProcessor3DProps) {
  const [isManual, setIsManual] = useState(false);

  return (
    <div className="relative w-full h-full select-none pointer-events-auto">
      <Canvas
        camera={{ position: [0, 1.5, 23], fov: 46 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      >
        {/* Warm Observatory Ambient Lighting */}
        <ambientLight intensity={0.65} color="#F4EFE6" />
        {/* Warm Champagne Key Light */}
        <pointLight position={[16, 14, 18]} intensity={1.6} color={COLORS.optimal} />
        {/* Warm Amber Secondary Rim Light */}
        <pointLight position={[-16, -12, 14]} intensity={1.3} color={COLORS.mapped} />
        {/* Overhead Cryo-Stage Spotlight */}
        <spotLight
          position={[0, 20, 14]}
          angle={0.65}
          penumbra={0.8}
          intensity={1.1}
          color="#FFE6CC"
        />

        {/* Scroll & Parallax Choreographed Camera Controller */}
        <CameraController scrollProgress={scrollProgress} isManual={isManual} />

        {/* Orbit Controls (Enabled when Interactive Orbit Mode is active) */}
        {interactive && (
          <OrbitControls
            enableRotate={true}
            enablePan={false}
            enableZoom={false}
            minDistance={8}
            maxDistance={35}
            onStart={() => setIsManual(true)}
          />
        )}

        {/* Full 156-Qubit Heavy-Hex Lattice */}
        <AnimatedLattice
          nodes={nodes}
          edges={edges}
          scrollProgress={scrollProgress}
          activeLayout={activeLayout}
        />
      </Canvas>

      {/* Manual Orbit Mode Notification & Reset Pill */}
      {isManual && (
        <div className="absolute bottom-6 right-6 z-20">
          <button
            onClick={() => setIsManual(false)}
            className="px-3.5 py-1.5 rounded-lg text-xs font-mono bg-[#1E1917]/95 text-accent-gold border border-accent-gold/40 shadow-gold-glow hover:bg-[#26201E] transition-all flex items-center gap-2"
          >
            <span className="w-2 h-2 rounded-full bg-accent-gold animate-ping" />
            Resume Scroll Choreography
          </button>
        </div>
      )}
    </div>
  );
}
