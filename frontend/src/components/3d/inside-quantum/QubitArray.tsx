"use client";

import React, { useMemo } from "react";
import * as THREE from "three";
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
 * QubitArray (Scene 04):
 * Heavy-Hex transmon qubit lattice on the chip surface:
 * - Planar transmon capacitor pockets etched into the superconducting ground plane
 * - Sub-micron Josephson junction SQUID loops in transmon centers
 * - Heavy-hexagonal topology (degree d=2 and d=3 coordination)
 * - Restrained defect isolation markers and active GNN routing channels
 * - Perfectly flush on the silicon chip die surface (no oversized floating symbols)
 */
export default function QubitArray({ scrollProgress }: QubitArrayProps) {
  // Generate heavy-hex inspired lattice layout scaled to the silicon die (0.38 x 0.38)
  const { qubits, couplers } = useMemo(() => {
    const qList: PhysicalQubit[] = [];
    const cList: CouplerLine[] = [];
    const rows = 5;
    const cols = 6;
    const spacingX = 0.048;
    const spacingY = 0.042;

    let id = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = (c - (cols - 1) * 0.5) * spacingX;
        const y = (r - (rows - 1) * 0.5) * spacingY;
        const isDefect = id === 9 || id === 19;
        const isActive = [11, 12, 13, 17, 18].includes(id);

        qList.push({ id, x, y, isDefect, isActive });

        // Connect horizontally
        if (c < cols - 1) {
          cList.push({
            src: [x, y],
            tgt: [x + spacingX, y],
            isActive: isActive && [11, 12, 13, 17, 18].includes(id + 1),
          });
        }

        // Connect vertically
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

  // Shared GPU materials
  const materials = useMemo(() => {
    return {
      activeMat: new THREE.MeshStandardMaterial({
        color: "#06B6D4",
        emissive: "#06B6D4",
        emissiveIntensity: 0.9,
        metalness: 0.95,
        roughness: 0.12,
      }),
      defectMat: new THREE.MeshStandardMaterial({
        color: "#EF4444",
        emissive: "#EF4444",
        emissiveIntensity: 0.8,
        metalness: 0.92,
        roughness: 0.15,
      }),
      idleMat: new THREE.MeshStandardMaterial({
        color: "#94A3B8",
        metalness: 0.94,
        roughness: 0.18,
      }),
      pocketEtch: new THREE.MeshBasicMaterial({
        color: "#080B18",
        side: THREE.DoubleSide,
      }),
      activeRingMat: new THREE.MeshBasicMaterial({
        color: "#06B6D4",
        transparent: true,
        opacity: 0.45,
        side: THREE.DoubleSide,
      }),
      defectRingMat: new THREE.MeshBasicMaterial({
        color: "#EF4444",
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide,
      }),
      jjLoopMat: new THREE.MeshBasicMaterial({
        color: "#F8FAFC",
      }),
    };
  }, []);

  // Shared geometries sized accurately to micro-scale
  const geometries = useMemo(() => {
    return {
      pocket: new THREE.PlaneGeometry(0.024, 0.024),
      crossH: new THREE.PlaneGeometry(0.016, 0.0035),
      crossV: new THREE.PlaneGeometry(0.0035, 0.016),
      activeRing: new THREE.RingGeometry(0.012, 0.015, 24),
      defectRing: new THREE.RingGeometry(0.012, 0.015, 24),
      jjLoop: new THREE.PlaneGeometry(0.002, 0.002),
    };
  }, []);

  // Visible during Scene 3 (chip inspection) and Scene 6 (wide network reveal)
  const isVisible = (scrollProgress >= 0.32 && scrollProgress <= 0.52) || scrollProgress >= 0.88;
  if (!isVisible) return null;

  return (
    <group position={[1.05, -1.45, 0.018]} rotation={[-Math.PI / 4, 0, 0]}>
      {/* 1. Microwave Coupling Buslines & Traveling Wave Packets */}
      <QubitConnections couplers={couplers} scrollProgress={scrollProgress} />

      {/* 2. Physical Superconducting Transmon Qubits (Planar etched geometry) */}
      {qubits.map((q) => {
        const mat = q.isDefect ? materials.defectMat : q.isActive ? materials.activeMat : materials.idleMat;

        return (
          <group key={`qubit-${q.id}`} position={[q.x, q.y, 0.001]}>
            {/* Recessed Ground Plane Clearance Pocket */}
            <mesh geometry={geometries.pocket} material={materials.pocketEtch} />

            {/* Planar Cross Capacitor Pads */}
            <mesh position={[0, 0, 0.0005]} geometry={geometries.crossH} material={mat} />
            <mesh position={[0, 0, 0.0005]} geometry={geometries.crossV} material={mat} />

            {/* Central Sub-Micron Josephson Junction SQUID Loop */}
            <mesh position={[0, 0, 0.0008]} geometry={geometries.jjLoop} material={materials.jjLoopMat} />

            {/* Active Coherent Halo */}
            {q.isActive && (
              <mesh position={[0, 0, 0.0007]} geometry={geometries.activeRing} material={materials.activeRingMat} />
            )}

            {/* Hardware Defect Isolation Indicator */}
            {q.isDefect && (
              <mesh position={[0, 0, 0.0007]} geometry={geometries.defectRing} material={materials.defectRingMat} />
            )}
          </group>
        );
      })}
    </group>
  );
}
