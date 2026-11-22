"use client";

import React, { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import QubitConnections from "./QubitConnections";

interface QubitArrayProps {
  scrollProgress: number;
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
 * QubitArray (Scene 03 / 04):
 * Heavy-Hex transmon qubit lattice on the silicon die surface:
 * - Planar Xmon cross-capacitor pads etched into the superconducting niobium ground plane
 * - Sub-micron Josephson junction SQUID loops in transmon centers
 * - Coplanar waveguide bus resonators coupling neighboring qubits
 * - Restrained, realistic physical materials (sputtered thin-film niobium, zero cartoon bloom)
 * - Perfectly aligned on the silicon chip die surface (no floating disconnected geometry)
 */
export default function QubitArray({ scrollProgress }: QubitArrayProps) {
  // Generate heavy-hex inspired lattice layout scaled to the silicon die (0.34 x 0.34)
  const { qubits, couplers } = useMemo(() => {
    const qList: PhysicalQubit[] = [];
    const cList: CouplerLine[] = [];
    const rows = 5;
    const cols = 6;
    const spacingX = 0.046;
    const spacingY = 0.040;

    let id = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = (c - (cols - 1) * 0.5) * spacingX;
        const y = (r - (rows - 1) * 0.5) * spacingY;
        const isDefect = id === 9 || id === 19;
        const isActive = [11, 12, 13, 17, 18].includes(id);

        qList.push({ id, x, y, isDefect, isActive });

        // Connect horizontally with coplanar waveguide bus resonators
        if (c < cols - 1) {
          cList.push({
            src: [x, y],
            tgt: [x + spacingX, y],
            isActive: isActive && [11, 12, 13, 17, 18].includes(id + 1),
          });
        }

        // Connect vertically according to heavy-hex coordination
        if (r < rows - 1 && (r + c) % 2 === 0) {
          cList.push({
            src: [x, y],
            tgt: [x, y + spacingY],
            isActive: isActive && [11, 12, 13, 17, 18].includes(id + cols),
          });
        }

        id++;
      }
    }

    return { qubits: qList, couplers: cList };
  }, []);

  const groupRef = useRef<THREE.Group>(null);
  const currentOpacity = useRef<number>(1.0);

  // Shared photorealistic PBR materials (true laboratory thin-film metals)
  const materials = useMemo(() => {
    return {
      idleNiobium: new THREE.MeshStandardMaterial({
        color: "#78879B",
        metalness: 0.96,
        roughness: 0.16,
        transparent: true,
        opacity: 1.0,
      }),
      activeNiobium: new THREE.MeshStandardMaterial({
        color: "#8899AF",
        emissive: "#00F0FF",
        emissiveIntensity: 0.25,
        metalness: 0.96,
        roughness: 0.14,
        transparent: true,
        opacity: 1.0,
      }),
      defectNiobium: new THREE.MeshStandardMaterial({
        color: "#78879B",
        emissive: "#EF4444",
        emissiveIntensity: 0.30,
        metalness: 0.94,
        roughness: 0.18,
        transparent: true,
        opacity: 1.0,
      }),
      pocketEtch: new THREE.MeshBasicMaterial({
        color: "#0A0E17", // Bare high-resistivity silicon exposed in clearance slot
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 1.0,
      }),
      activeRingMat: new THREE.MeshBasicMaterial({
        color: "#00F0FF",
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
      }),
      defectRingMat: new THREE.MeshBasicMaterial({
        color: "#EF4444",
        transparent: true,
        opacity: 0.50,
        side: THREE.DoubleSide,
      }),
      jjLoopMat: new THREE.MeshStandardMaterial({
        color: "#E2E8F0",
        metalness: 0.96,
        roughness: 0.16,
        transparent: true,
        opacity: 1.0,
      }),
    };
  }, []);

  // Geometries scaled to physical micro-scale
  const geometries = useMemo(() => {
    return {
      pocket: new THREE.PlaneGeometry(0.024, 0.024),
      crossH: new THREE.PlaneGeometry(0.016, 0.0035),
      crossV: new THREE.PlaneGeometry(0.0035, 0.016),
      activeRing: new THREE.RingGeometry(0.012, 0.014, 24),
      defectRing: new THREE.RingGeometry(0.012, 0.014, 24),
      jjLoop: new THREE.PlaneGeometry(0.0025, 0.0025),
    };
  }, []);

  // Smooth continuous opacity interpolation synchronized with ProcessorChip
  useFrame(() => {
    const p = scrollProgress;
    let target = 1.0;

    if (p > 0.46 && p < 0.84) {
      if (p <= 0.54) {
        target = 1.0 - (p - 0.46) / 0.08;
      } else if (p >= 0.78) {
        target = (p - 0.78) / 0.06;
      } else {
        target = 0.0;
      }
    } else if (p >= 0.84) {
      target = 1.0;
    }

    currentOpacity.current = THREE.MathUtils.lerp(currentOpacity.current, target, 0.08);
    const alpha = currentOpacity.current;

    if (groupRef.current) {
      groupRef.current.visible = alpha > 0.008;
    }

    materials.idleNiobium.opacity = alpha;
    materials.activeNiobium.opacity = alpha;
    materials.defectNiobium.opacity = alpha;
    materials.pocketEtch.opacity = alpha;
    materials.activeRingMat.opacity = alpha * 0.35;
    materials.defectRingMat.opacity = alpha * 0.50;
    materials.jjLoopMat.opacity = alpha;
  });

  return (
    <group ref={groupRef} position={[0.95, -1.35, 0.016]} rotation={[-Math.PI / 4, 0, 0]}>
      {/* 1. Microwave Coupling Buslines & Traveling Coherent Packets */}
      <QubitConnections couplers={couplers} scrollProgress={scrollProgress} />

      {/* 2. Physical Superconducting Transmon Qubits (Planar etched geometry) */}
      {qubits.map((q) => {
        const mat = q.isDefect ? materials.defectNiobium : q.isActive ? materials.activeNiobium : materials.idleNiobium;

        return (
          <group key={`qubit-${q.id}`} position={[q.x, q.y, 0.001]}>
            {/* Recessed Ground Plane Clearance Pocket (Etched down to Silicon) */}
            <mesh geometry={geometries.pocket} material={materials.pocketEtch} />

            {/* Planar Cross Capacitor Shunt Pads (Superconducting Niobium Film) */}
            <mesh position={[0, 0, 0.0006]} geometry={geometries.crossH} material={mat} />
            <mesh position={[0, 0, 0.0006]} geometry={geometries.crossV} material={mat} />

            {/* Central Sub-Micron Josephson Junction SQUID Loop */}
            <mesh position={[0, 0, 0.001]} geometry={geometries.jjLoop} material={materials.jjLoopMat} />

            {/* Subtle Coherent Microwave State Phase Ring */}
            {q.isActive && (
              <mesh position={[0, 0, 0.0008]} geometry={geometries.activeRing} material={materials.activeRingMat} />
            )}

            {/* Subtle Hardware Defect Masking Ring */}
            {q.isDefect && (
              <mesh position={[0, 0, 0.0008]} geometry={geometries.defectRing} material={materials.defectRingMat} />
            )}
          </group>
        );
      })}
    </group>
  );
}
