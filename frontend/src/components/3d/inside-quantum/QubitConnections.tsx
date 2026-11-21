"use client";

import React, { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

interface CouplerLine {
  src: [number, number];
  tgt: [number, number];
  isActive: boolean;
}

interface QubitConnectionsProps {
  couplers: CouplerLine[];
  scrollProgress: number;
}

/**
 * QubitConnections (Scene 04):
 * Planar microwave coupling waveguides between physical transmon qubits:
 * - Directional bus resonators linking qubits in a heavy-hexagonal topology
 * - Luminous cyan energy packets traveling along active multi-qubit gate channels
 * - Visualizing hardware connectivity and noise-avoiding routing paths
 */
export default function QubitConnections({ couplers, scrollProgress }: QubitConnectionsProps) {
  const packetsRef = useRef<THREE.InstancedMesh>(null);
  const activeCouplers = useMemo(() => couplers.filter((c) => c.isActive), [couplers]);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Material and line geometry
  const materials = useMemo(() => {
    return {
      busLine: new THREE.LineBasicMaterial({
        color: "#334155",
        transparent: true,
        opacity: 0.65,
      }),
      packet: new THREE.MeshBasicMaterial({
        color: "#06B6D4",
        transparent: true,
        opacity: 0.9,
      }),
    };
  }, []);

  const couplerGeo = useMemo(() => {
    const pts: number[] = [];
    couplers.forEach((c) => {
      pts.push(c.src[0], c.src[1], 0.003);
      pts.push(c.tgt[0], c.tgt[1], 0.003);
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return geo;
  }, [couplers]);

  // Animate coherent signal packet transit
  useFrame((state) => {
    if (!packetsRef.current || activeCouplers.length === 0) return;
    const t = state.clock.elapsedTime * 2.5;

    activeCouplers.forEach((c, idx) => {
      const p = (Math.sin(t + idx * 1.3) + 1) * 0.5;
      const x = THREE.MathUtils.lerp(c.src[0], c.tgt[0], p);
      const y = THREE.MathUtils.lerp(c.src[1], c.tgt[1], p);

      dummy.position.set(x, y, 0.008);
      const s = 0.007 + Math.sin(t * 4 + idx) * 0.0025;
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      packetsRef.current!.setMatrixAt(idx, dummy.matrix);
    });
    packetsRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      {/* 1. Microwave Coupling Buslines */}
      <lineSegments geometry={couplerGeo} material={materials.busLine} />

      {/* 2. Coherent Quantum State Packets */}
      {activeCouplers.length > 0 && (
        <instancedMesh
          ref={packetsRef}
          args={[undefined, undefined, activeCouplers.length]}
          material={materials.packet}
        >
          <sphereGeometry args={[1, 10, 10]} />
        </instancedMesh>
      )}
    </group>
  );
}
