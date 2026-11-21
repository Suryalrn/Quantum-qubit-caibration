"use client";

import React, { useRef } from "react";
import * as THREE from "three";
import CoolingStages from "./CoolingStages";
import MicrowaveCables from "./MicrowaveCables";
import CryogenicChamber from "./CryogenicChamber";

interface QuantumComputerProps {
  scrollProgress: number;
}

/**
 * QuantumComputer:
 * Unified Master Assembly of the Dilution Refrigerator Chandelier:
 * - Positioned at X = 0.95 to balance the composition (leaving the left hemisphere clear for editorial text)
 * - Scaled to physically realistic proportions (radius ~0.9m, height ~3.4m)
 * - Integrates CoolingStages, MicrowaveCables, and CryogenicChamber in rigid structural alignment
 * - Preserved in Scene 06 as the central master core of the quantum network
 */
export default function QuantumComputer({ scrollProgress }: QuantumComputerProps) {
  const groupRef = useRef<THREE.Group>(null);

  return (
    <group ref={groupRef} position={[0.95, 0.0, 0.0]}>
      {/* 1. Top Laboratory Suspension Gantry Ring & Vacuum Collar */}
      <mesh position={[0, 1.82, 0]}>
        <cylinderGeometry args={[1.05, 1.05, 0.08, 48]} />
        <meshStandardMaterial color="#64748B" metalness={0.92} roughness={0.25} />
      </mesh>

      {/* Ceiling suspension cables (4 cables rising to lab ceiling) */}
      {[0, 1, 2, 3].map((idx) => {
        const ang = (idx / 4) * Math.PI * 2 + 0.4;
        const x = Math.cos(ang) * 0.92;
        const z = Math.sin(ang) * 0.92;
        return (
          <mesh key={`gantry-cable-${idx}`} position={[x, 2.3, z]}>
            <cylinderGeometry args={[0.008, 0.008, 0.9, 12]} />
            <meshStandardMaterial color="#94A3B8" metalness={0.95} roughness={0.2} />
          </mesh>
        );
      })}

      {/* 2. Structural Gold-Plated Cooling Stages */}
      <CoolingStages scrollProgress={scrollProgress} />

      {/* 3. Semi-Rigid Coaxial Transmission Cabling Banks */}
      <MicrowaveCables scrollProgress={scrollProgress} />

      {/* 4. Cryogenic Interior Shielding & Microwave Amplifiers */}
      <CryogenicChamber scrollProgress={scrollProgress} />

      {/* 5. Delicate Cryogenic Warm-Gold Stage Bounce Light */}
      <pointLight position={[0, 0.5, 0.6]} intensity={1.6} color="#E5B869" distance={4.5} />
      <pointLight position={[0, -0.8, 0.4]} intensity={2.0} color="#06B6D4" distance={3.5} />
    </group>
  );
}
