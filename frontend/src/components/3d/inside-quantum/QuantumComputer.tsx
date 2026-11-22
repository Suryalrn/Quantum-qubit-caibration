"use client";

import React, { useMemo, useRef } from "react";
import * as THREE from "three";
import CoolingStages from "./CoolingStages";
import MicrowaveCables from "./MicrowaveCables";
import CryogenicChamber from "./CryogenicChamber";
import { getBrushedMetalTexture } from "./proceduralTextures";

interface QuantumComputerProps {
  scrollProgress: number;
}

/**
 * QuantumComputer:
 * Unified Master Assembly of the Dilution Refrigerator Chandelier:
 * - Positioned at X = 0.95 to balance the composition (leaving the left hemisphere clear for editorial text)
 * - Scaled to physically realistic proportions (radius ~0.9m, height ~3.4m)
 * - Integrates CoolingStages, MicrowaveCables, and CryogenicChamber in rigid structural alignment
 * - Turnbuckle suspension tensioners and laboratory ISO vacuum flange collar
 */
export default function QuantumComputer({ scrollProgress }: QuantumComputerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const brushedTexture = useMemo(() => getBrushedMetalTexture(), []);

  const materials = useMemo(() => {
    return {
      gantryFlange: new THREE.MeshStandardMaterial({
        color: "#64748B",
        metalness: 0.94,
        roughness: 0.22,
        bumpMap: brushedTexture,
        bumpScale: 0.002,
        envMapIntensity: 1.8,
      }),
      cableSteel: new THREE.MeshStandardMaterial({
        color: "#94A3B8",
        metalness: 0.96,
        roughness: 0.18,
      }),
      turnbuckleBrass: new THREE.MeshStandardMaterial({
        color: "#D4AF37",
        metalness: 0.95,
        roughness: 0.25,
      }),
    };
  }, [brushedTexture]);

  return (
    <group ref={groupRef} position={[0.95, 0.0, 0.0]}>
      {/* 1. Top Laboratory Suspension Gantry Ring & Vacuum Collar */}
      <group position={[0, 1.82, 0]}>
        <mesh>
          <cylinderGeometry args={[1.05, 1.05, 0.08, 48]} />
          <primitive object={materials.gantryFlange} attach="material" />
        </mesh>
        {/* Perimeter Flange Clamp Ring (FLAT horizontal) */}
        <mesh position={[0, 0.045, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.06, 0.012, 12, 48]} />
          <primitive object={materials.gantryFlange} attach="material" />
        </mesh>
      </group>

      {/* 2. Ceiling Suspension Cables with Turnbuckles (4 cables rising to lab ceiling) */}
      {[0, 1, 2, 3].map((idx) => {
        const ang = (idx / 4) * Math.PI * 2 + 0.4;
        const x = Math.cos(ang) * 0.92;
        const z = Math.sin(ang) * 0.92;
        return (
          <group key={`gantry-cable-${idx}`} position={[x, 0, z]}>
            {/* Cable Run */}
            <mesh position={[0, 2.35, 0]}>
              <cylinderGeometry args={[0.007, 0.007, 0.95, 12]} />
              <primitive object={materials.cableSteel} attach="material" />
            </mesh>

            {/* Turnbuckle Cable Tensioner Body */}
            <mesh position={[0, 1.95, 0]}>
              <cylinderGeometry args={[0.016, 0.016, 0.08, 12]} />
              <primitive object={materials.turnbuckleBrass} attach="material" />
            </mesh>

            {/* Mounting Eyelet */}
            <mesh position={[0, 1.88, 0]}>
              <torusGeometry args={[0.014, 0.005, 8, 16]} />
              <primitive object={materials.cableSteel} attach="material" />
            </mesh>
          </group>
        );
      })}

      {/* 3. Structural Gold-Plated Cooling Stages */}
      <CoolingStages scrollProgress={scrollProgress} />

      {/* 4. Semi-Rigid Coaxial Transmission Cabling Banks */}
      <MicrowaveCables scrollProgress={scrollProgress} />

      {/* 5. Cryogenic Interior Shielding & Microwave Amplifiers */}
      <CryogenicChamber scrollProgress={scrollProgress} />

      {/* 6. Delicate Cryogenic Warm-Gold Stage Bounce Light */}
      <pointLight position={[0, 0.5, 0.6]} intensity={1.8} color="#E5B869" distance={4.5} />
      <pointLight position={[0, -0.8, 0.4]} intensity={2.2} color="#06B6D4" distance={3.5} />
    </group>
  );
}
