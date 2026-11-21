"use client";

import React, { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

interface QubitLatticeProps {
  scrollProgress: number; // 0.0 to 1.0
}

interface PhysicalQubit {
  id: number;
  x: number;
  y: number;
  isDefect?: boolean;
  isActive?: boolean;
}

interface CouplerLine {
  src: [number, number];
  tgt: [number, number];
  isActive: boolean;
}

/**
 * SCENE 04: The Qubit Connection & Heavy-Hex Architecture
 * Real-device inspired planar lattice of superconducting transmon qubits:
 * - Cross-shaped transmon capacitor pads with shared GPU materials
 * - Inter-qubit microwave coupling lines
 * - Signal packets traveling between active computational subgraphs
 * - Highlighting physical defect zones and optimal routing pathways
 */
export default function QubitLattice3D({ scrollProgress }: QubitLatticeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const packetsRef = useRef<THREE.InstancedMesh>(null);

  // Generate heavy-hex inspired lattice layout
  const { qubits, couplers } = useMemo(() => {
    const qList: PhysicalQubit[] = [];
    const cList: CouplerLine[] = [];
    const rows = 5;
    const cols = 7;
    const spacingX = 0.52;
    const spacingY = 0.46;

    let id = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = (c - cols / 2) * spacingX;
        const y = (r - rows / 2) * spacingY;
        const isDefect = id === 11 || id === 23;
        const isActive = [14, 15, 16, 21, 22].includes(id);

        qList.push({ id, x, y, isDefect, isActive });

        // Connect horizontally
        if (c < cols - 1) {
          cList.push({
            src: [x, y],
            tgt: [x + spacingX, y],
            isActive: isActive && [14, 15, 16, 21, 22].includes(id + 1),
          });
        }

        // Connect vertically
        if (r < rows - 1 && (r + c) % 2 === 0) {
          cList.push({
            src: [x, y],
            tgt: [x, y + spacingY],
            isActive: isActive && [14, 15, 16, 21, 22].includes(id + cols),
          });
        }

        id++;
      }
    }

    return { qubits: qList, couplers: cList };
  }, []);

  // Shared reusable materials to eliminate GC pauses and memory churn
  const materials = useMemo(() => {
    return {
      activeMat: new THREE.MeshStandardMaterial({
        color: "#06B6D4",
        emissive: "#06B6D4",
        emissiveIntensity: 1.2,
        metalness: 0.9,
        roughness: 0.15,
      }),
      defectMat: new THREE.MeshStandardMaterial({
        color: "#EF4444",
        emissive: "#EF4444",
        emissiveIntensity: 1.0,
        metalness: 0.9,
        roughness: 0.15,
      }),
      idleMat: new THREE.MeshStandardMaterial({
        color: "#6366F1",
        emissive: "#6366F1",
        emissiveIntensity: 0.4,
        metalness: 0.9,
        roughness: 0.15,
      }),
      activeCoronaMat: new THREE.MeshBasicMaterial({
        color: "#06B6D4",
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
      }),
      defectCoronaMat: new THREE.MeshBasicMaterial({
        color: "#EF4444",
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
      }),
      couplerLineMat: new THREE.LineBasicMaterial({
        color: "#334155",
        transparent: true,
        opacity: 0.65,
      }),
      packetMat: new THREE.MeshBasicMaterial({
        color: "#06B6D4",
        transparent: true,
        opacity: 0.9,
      }),
    };
  }, []);

  // Shared geometries
  const geometries = useMemo(() => {
    return {
      crossHoriz: new THREE.BoxGeometry(0.14, 0.045, 0.02),
      crossVert: new THREE.BoxGeometry(0.045, 0.14, 0.02),
      activeRing: new THREE.RingGeometry(0.12, 0.16, 24),
      defectRing: new THREE.RingGeometry(0.13, 0.17, 24),
    };
  }, []);

  // Coupler lines geometry
  const couplerGeo = useMemo(() => {
    const pts: number[] = [];
    couplers.forEach((c) => {
      pts.push(c.src[0], c.src[1], 0.02);
      pts.push(c.tgt[0], c.tgt[1], 0.02);
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return geo;
  }, [couplers]);

  // Active signal packets
  const activeCouplers = useMemo(() => couplers.filter((c) => c.isActive), [couplers]);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((state) => {
    if (!packetsRef.current || activeCouplers.length === 0) return;
    const t = state.clock.elapsedTime * 2.2;

    activeCouplers.forEach((c, idx) => {
      const p = (Math.sin(t + idx * 1.2) + 1) * 0.5;
      const x = THREE.MathUtils.lerp(c.src[0], c.tgt[0], p);
      const y = THREE.MathUtils.lerp(c.src[1], c.tgt[1], p);

      dummy.position.set(x, y, 0.06);
      const s = 0.045 + Math.sin(t * 4 + idx) * 0.015;
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      packetsRef.current!.setMatrixAt(idx, dummy.matrix);
    });
    packetsRef.current.instanceMatrix.needsUpdate = true;
  });

  const isVisible = (scrollProgress >= 0.45 && scrollProgress <= 0.85) || scrollProgress >= 0.88;
  if (!isVisible) return null;

  return (
    <group ref={groupRef} position={[0, -3.2, 0.12]} rotation={[-Math.PI / 4, 0, 0]}>
      {/* Physical Coupler Waveguides */}
      <lineSegments geometry={couplerGeo} material={materials.couplerLineMat} />

      {/* Active High-Fidelity Signal Packets */}
      {activeCouplers.length > 0 && (
        <instancedMesh
          ref={packetsRef}
          args={[undefined, undefined, activeCouplers.length]}
          material={materials.packetMat}
        >
          <sphereGeometry args={[1, 12, 12]} />
        </instancedMesh>
      )}

      {/* 35 Physical Qubit Transmon Pads */}
      {qubits.map((q) => {
        const mat = q.isDefect ? materials.defectMat : q.isActive ? materials.activeMat : materials.idleMat;

        return (
          <group key={`qubit-${q.id}`} position={[q.x, q.y, 0.04]}>
            {/* Cross-shaped transmon capacitor pad */}
            <mesh geometry={geometries.crossHoriz} material={mat} />
            <mesh geometry={geometries.crossVert} material={mat} />

            {/* Glowing state corona on active qubits */}
            {q.isActive && (
              <mesh position={[0, 0, 0.02]} geometry={geometries.activeRing} material={materials.activeCoronaMat} />
            )}

            {/* Warning perimeter on defect qubit */}
            {q.isDefect && (
              <mesh position={[0, 0, 0.02]} geometry={geometries.defectRing} material={materials.defectCoronaMat} />
            )}
          </group>
        );
      })}
    </group>
  );
}
