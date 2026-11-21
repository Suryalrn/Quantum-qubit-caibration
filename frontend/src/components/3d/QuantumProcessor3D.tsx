"use client";

import React, { useRef, useState, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import * as THREE from "three";
import { QubitNode, CouplerEdge } from "@/types/quantum";

interface QuantumProcessor3DProps {
  nodes: QubitNode[];
  edges: CouplerEdge[];
  selectedQubitId: number | null;
  onSelectQubit: (qubit: QubitNode | null) => void;
  onSelectEdge: (edge: CouplerEdge | null) => void;
  activeLayout?: Record<number, number> | null;
  mode?: "3d" | "2d";
}

// Warm Luxury Color Palette (Replacing prohibited colors)
const PALETTE = {
  optimal: "#C6A56B",    // Champagne Gold
  warning: "#D9944A",    // Warm Amber
  critical: "#943846",   // Deep Terracotta
  dead: "#702D3A",       // Rich Wine Burgundy
  selected: "#F4EFE6",   // Warm Ivory
  mapped: "#C66B42",     // Burnt Orange
  coupler: "#4A3B32",    // Warm Antique Bronze Wire
  couplerBroken: "#702D3A",
};

// Qubit sphere color logic based on real telemetry
function getQubitColor(node: QubitNode, isSelected: boolean, isMapped: boolean) {
  if (isSelected) return PALETTE.selected;
  if (isMapped) return PALETTE.mapped;
  if (node.status === "dead") return PALETTE.dead;
  if (node.error_tier === "warning") return PALETTE.warning;
  return PALETTE.optimal;
}

function QubitSphere({
  node,
  isSelected,
  isMapped,
  onClick,
  onHover,
  is2D,
}: {
  node: QubitNode;
  isSelected: boolean;
  isMapped: boolean;
  onClick: () => void;
  onHover: (hovered: boolean) => void;
  is2D: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const color = useMemo(() => getQubitColor(node, isSelected, isMapped), [node, isSelected, isMapped]);
  const posX = is2D ? node.x2d : node.x3d;
  const posY = is2D ? node.y2d : node.y3d;
  const posZ = is2D ? 0 : node.z3d;

  useFrame((state) => {
    if (meshRef.current) {
      if (node.status === "dead") {
        // Deep burgundy slow pulsing warning for dead qubits
        const s = 1.0 + Math.sin(state.clock.elapsedTime * 3.5) * 0.12;
        meshRef.current.scale.set(s, s, s);
      } else if (isSelected || isMapped) {
        const s = 1.25 + Math.sin(state.clock.elapsedTime * 2.8) * 0.08;
        meshRef.current.scale.set(s, s, s);
      }
    }
  });

  return (
    <group position={[posX, posY, posZ]}>
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(true);
        }}
        onPointerOut={() => onHover(false)}
      >
        <sphereGeometry args={[isSelected || isMapped ? 0.38 : 0.26, 24, 24]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isSelected || isMapped ? 0.85 : (node.status === "dead" ? 0.9 : 0.35)}
          roughness={0.25}
          metalness={0.85}
        />
      </mesh>

      {/* Qubit ID Label using robust DOM Html */}
      {(isSelected || isMapped || node.id === 0 || node.id === 67 || node.status === "dead") && (
        <Html position={[0, 0.45, 0]} center distanceFactor={18}>
          <div
            className="font-mono text-[9px] font-bold px-1 py-0.5 rounded pointer-events-none select-none whitespace-nowrap bg-[#141110]/80 border border-white/10"
            style={{ color: isSelected ? PALETTE.selected : (node.status === "dead" ? "#D98282" : isMapped ? PALETTE.mapped : PALETTE.optimal) }}
          >
            {`Q${node.id}`}
          </div>
        </Html>
      )}
    </group>
  );
}

function CouplerLines({
  edges,
  nodesMap,
  is2D,
  onSelectEdge: _onSelectEdge,
}: {
  edges: CouplerEdge[];
  nodesMap: Map<number, QubitNode>;
  is2D: boolean;
  onSelectEdge: (edge: CouplerEdge) => void;
}) {
  const lineData = useMemo(() => {
    const points: [number, number, number][] = [];
    const colors: number[] = [];

    edges.forEach((edge) => {
      const src = nodesMap.get(edge.source);
      const tgt = nodesMap.get(edge.target);
      if (src && tgt && edge.is_primary) {
        const x1 = is2D ? src.x2d : src.x3d;
        const y1 = is2D ? src.y2d : src.y3d;
        const z1 = is2D ? 0 : src.z3d;

        const x2 = is2D ? tgt.x2d : tgt.x3d;
        const y2 = is2D ? tgt.y2d : tgt.y3d;
        const z2 = is2D ? 0 : tgt.z3d;

        points.push([x1, y1, z1]);
        points.push([x2, y2, z2]);

        const c = edge.status === "broken" ? 0x702d3a : (edge.cz_error_pct > 1.2 ? 0xd9944a : 0x4a3b32);
        colors.push(c, c);
      }
    });
    return { points, colors };
  }, [edges, nodesMap, is2D]);

  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(lineData.points.flat());
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, [lineData]);

  return (
    <lineSegments geometry={geom}>
      <lineBasicMaterial color={PALETTE.coupler} opacity={0.65} transparent linewidth={1} />
    </lineSegments>
  );
}

export default function QuantumProcessor3D({
  nodes,
  edges,
  selectedQubitId,
  onSelectQubit,
  onSelectEdge,
  activeLayout = null,
  mode = "3d",
}: QuantumProcessor3DProps) {
  const [hoveredQubit, setHoveredQubit] = useState<QubitNode | null>(null);
  const nodesMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  const mappedPhysicalQubits = useMemo(() => {
    if (!activeLayout) return new Set<number>();
    return new Set(Object.values(activeLayout).map(Number));
  }, [activeLayout]);

  const is2D = mode === "2d";

  return (
    <div className="relative w-full h-full bg-[#141110] rounded-xl overflow-hidden border border-white/10 select-none">
      <Canvas
        camera={{ position: [0, 0, is2D ? 20 : 22], fov: 48 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.5} color="#F4EFE6" />
        <pointLight position={[10, 10, 15]} intensity={1.2} color={PALETTE.optimal} />
        <pointLight position={[-10, -10, 15]} intensity={0.8} color={PALETTE.mapped} />
        <directionalLight position={[0, 15, 10]} intensity={0.6} color="#FFE6CC" />

        <OrbitControls
          enableRotate={!is2D}
          enablePan={false}
          enableZoom={false}
          dampingFactor={0.08}
        />

        {/* Physical Couplers */}
        <CouplerLines
          edges={edges}
          nodesMap={nodesMap}
          is2D={is2D}
          onSelectEdge={onSelectEdge}
        />

        {/* 156 Physical Qubits */}
        {nodes.map((node) => (
          <QubitSphere
            key={node.id}
            node={node}
            isSelected={selectedQubitId === node.id}
            isMapped={mappedPhysicalQubits.has(node.id)}
            onClick={() => onSelectQubit(selectedQubitId === node.id ? null : node)}
            onHover={(hovered) => setHoveredQubit(hovered ? node : null)}
            is2D={is2D}
          />
        ))}
      </Canvas>

      {/* Floating Hover HUD */}
      {hoveredQubit && (
        <div className="absolute bottom-5 left-5 pointer-events-none glass-panel p-3.5 rounded-lg border border-accent-gold/40 shadow-gold-glow text-xs z-20 max-w-xs animate-fadeIn">
          <div className="flex items-center justify-between pb-1.5 border-b border-white/10 mb-2">
            <span className="font-mono font-bold text-accent-gold text-sm">{hoveredQubit.label}</span>
            <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-semibold ${
              hoveredQubit.status === "dead" ? "bg-status-dead/30 text-[#D98282]" :
              hoveredQubit.error_tier === "warning" ? "bg-status-warning/20 text-status-warning" : "bg-status-optimal/20 text-status-optimal"
            }`}>
              {hoveredQubit.status}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-text-secondary">
            <div>T₁ Coherence:</div>
            <div className="font-mono text-text-primary text-right font-medium">{hoveredQubit.t1_us} µs</div>
            <div>T₂ Dephasing:</div>
            <div className="font-mono text-text-primary text-right font-medium">{hoveredQubit.t2_us} µs</div>
            <div>Readout Error:</div>
            <div className="font-mono text-text-primary text-right font-medium">{hoveredQubit.readout_error_pct}%</div>
            <div>Readout Duration:</div>
            <div className="font-mono text-text-primary text-right font-medium">{hoveredQubit.readout_length_ns} ns</div>
          </div>
        </div>
      )}

      {/* Controls & Legend Overlay */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
        <div className="glass-panel px-3 py-2 rounded-lg text-[11px] flex items-center gap-3 border border-white/10">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-status-optimal"></span>
            <span className="text-text-secondary">Optimal (Gold)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-status-warning"></span>
            <span className="text-text-secondary">Degraded</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-status-dead animate-pulse"></span>
            <span className="text-text-secondary">Dead (Q146)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-accent-ivory"></span>
            <span className="text-text-secondary">Selected</span>
          </div>
        </div>
      </div>
    </div>
  );
}
