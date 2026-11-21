"use client";

import React, { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

interface ProcessorChipProps {
  scrollProgress: number; // 0.0 to 1.0
}

/**
 * SCENE 03: The Quantum Processor Chip
 * Detailed macro representation of the superconducting quantum chip package:
 * - High-resistivity silicon / sapphire die substrate (15mm x 15mm scale)
 * - Superconducting Niobium/Aluminum thin-film ground plane
 * - Coplanar waveguide (CPW) transmission lines and resonator geometries
 * - Radial gold wire bonds bridging chip pads to package launcher leads
 * - Ceramic/copper chip carrier package with SMP RF connectors
 */
export default function ProcessorChip3D({ scrollProgress }: ProcessorChipProps) {
  const groupRef = useRef<THREE.Group>(null);

  // Subtle breathing rotation for macro inspection
  useFrame((state) => {
    if (groupRef.current) {
      const t = state.clock.elapsedTime * 0.2;
      groupRef.current.rotation.z = Math.sin(t * 0.3) * 0.02;
    }
  });

  const materials = useMemo(() => {
    return {
      siliconDie: new THREE.MeshStandardMaterial({
        color: "#0B1120", // Deep dark silicon
        metalness: 0.85,
        roughness: 0.15,
      }),
      superconductingTraces: new THREE.MeshStandardMaterial({
        color: "#06B6D4", // Luminous Cyan superconducting Nb
        emissive: "#06B6D4",
        emissiveIntensity: 0.6,
        metalness: 0.95,
        roughness: 0.1,
      }),
      goldCarrier: new THREE.MeshStandardMaterial({
        color: "#D4AF37", // 24k Gold plating
        metalness: 0.96,
        roughness: 0.2,
      }),
      packagePCB: new THREE.MeshStandardMaterial({
        color: "#1E293B", // Dark Rogers RO4003 substrate PCB
        metalness: 0.4,
        roughness: 0.6,
      }),
      wireBond: new THREE.MeshStandardMaterial({
        color: "#FACC15", // Pure Gold Wire Bonds
        metalness: 0.98,
        roughness: 0.1,
      }),
      connectorPin: new THREE.MeshStandardMaterial({
        color: "#E2E8F0", // Titanium/Gold Pin
        metalness: 0.92,
        roughness: 0.25,
      }),
    };
  }, []);

  // Generate wire bonds connecting chip perimeter to carrier pads
  const wireBonds = useMemo(() => {
    const bonds: THREE.CatmullRomCurve3[] = [];
    const countPerSide = 12;
    const chipHalf = 1.35;
    const carrierHalf = 2.15;

    // 4 sides
    const sides = [
      { axis: "x", sign: 1, constAxis: "y", constSign: 1 },
      { axis: "x", sign: 1, constAxis: "y", constSign: -1 },
      { axis: "y", sign: 1, constAxis: "x", constSign: 1 },
      { axis: "y", sign: 1, constAxis: "x", constSign: -1 },
    ];

    sides.forEach(({ axis, constAxis, constSign }) => {
      for (let i = 0; i < countPerSide; i++) {
        const offset = ((i - countPerSide / 2) / (countPerSide / 2)) * (chipHalf * 0.85);
        const pStart = new THREE.Vector3();
        const pEnd = new THREE.Vector3();
        const pMid = new THREE.Vector3();

        if (axis === "x") {
          pStart.set(offset, constSign * chipHalf, 0.08);
          pEnd.set(offset * 1.35, constSign * carrierHalf, 0.02);
          pMid.set(offset * 1.15, constSign * (chipHalf + (carrierHalf - chipHalf) * 0.45), 0.35);
        } else {
          pStart.set(constSign * chipHalf, offset, 0.08);
          pEnd.set(constSign * carrierHalf, offset * 1.35, 0.02);
          pMid.set(constSign * (chipHalf + (carrierHalf - chipHalf) * 0.45), offset * 1.15, 0.35);
        }

        bonds.push(new THREE.CatmullRomCurve3([pStart, pMid, pEnd]));
      }
    });

    return bonds;
  }, []);

  // Pre-allocate TubeGeometries for 48 wire bonds to prevent per-frame allocations
  const wireBondGeos = useMemo(() => {
    return wireBonds.map((bond) => new THREE.TubeGeometry(bond, 14, 0.012, 6, false));
  }, [wireBonds]);

  React.useEffect(() => {
    return () => {
      wireBondGeos.forEach((g) => g.dispose());
    };
  }, [wireBondGeos]);

  // Show during scenes 3, 4, 5 and in wide network reveal Scene 6
  const isVisible = (scrollProgress >= 0.28 && scrollProgress <= 0.88) || scrollProgress >= 0.84;
  if (!isVisible) return null;

  return (
    <group ref={groupRef} position={[0, -3.2, 0]} rotation={[-Math.PI / 4, 0, 0]}>
      {/* Outer Chip Carrier Package Base (OFHC Copper / Invar) */}
      <mesh position={[0, 0, -0.15]}>
        <boxGeometry args={[5.2, 5.2, 0.28]} />
        <primitive object={materials.goldCarrier} attach="material" />
      </mesh>

      {/* High-Frequency PCB Substrate */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[4.8, 4.8, 0.08]} />
        <primitive object={materials.packagePCB} attach="material" />
      </mesh>

      {/* Gold Perimeter Wire Bonding Pads Frame */}
      <mesh position={[0, 0, 0.045]}>
        <ringGeometry args={[1.5, 2.3, 4, 1, Math.PI / 4]} />
        <primitive object={materials.goldCarrier} attach="material" />
      </mesh>

      {/* Central Quantum Processor Silicon/Sapphire Die */}
      <mesh position={[0, 0, 0.07]}>
        <boxGeometry args={[2.8, 2.8, 0.06]} />
        <primitive object={materials.siliconDie} attach="material" />
      </mesh>

      {/* Superconducting Coplanar Waveguide Resonator Traces */}
      {[-0.8, -0.4, 0.0, 0.4, 0.8].map((xOffset, idx) => (
        <group key={`res-${idx}`} position={[xOffset, 0, 0.11]}>
          {/* Serpentine readout resonator trace */}
          <mesh position={[0, 0, 0]}>
            <planeGeometry args={[0.04, 2.2]} />
            <primitive object={materials.superconductingTraces} attach="material" />
          </mesh>
          <mesh position={[0, 0.8, 0]}>
            <ringGeometry args={[0.08, 0.14, 16]} />
            <primitive object={materials.superconductingTraces} attach="material" />
          </mesh>
          <mesh position={[0, -0.8, 0]}>
            <ringGeometry args={[0.08, 0.14, 16]} />
            <primitive object={materials.superconductingTraces} attach="material" />
          </mesh>
        </group>
      ))}

      {/* Gold Wire Bonds (Radiating around perimeter with pre-allocated geometries) */}
      {wireBondGeos.map((geo, bIdx) => (
        <mesh key={`wirebond-${bIdx}`} geometry={geo} material={materials.wireBond} />
      ))}

      {/* Peripheral SMP RF Launcher Coaxial Connectors */}
      {[0, 1, 2, 3].map((side) => {
        const angle = (side * Math.PI) / 2;
        return (
          <group key={`smp-side-${side}`} rotation={[0, 0, angle]}>
            {[-1.8, -0.6, 0.6, 1.8].map((offset, pinIdx) => (
              <mesh key={`pin-${side}-${pinIdx}`} position={[offset, 2.45, 0.05]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.1, 0.1, 0.35, 12]} />
                <primitive object={materials.connectorPin} attach="material" />
              </mesh>
            ))}
          </group>
        );
      })}

      {/* Focused Chip Lighting */}
      <spotLight
        position={[0, 0, 3.5]}
        angle={0.6}
        penumbra={0.7}
        intensity={2.8}
        color="#F8FAFC"
      />
      <pointLight position={[1.2, 1.2, 1.5]} intensity={1.5} color="#06B6D4" distance={4} />
      <pointLight position={[-1.2, -1.2, 1.5]} intensity={1.5} color="#6366F1" distance={4} />
    </group>
  );
}
