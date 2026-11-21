"use client";

import React, { useMemo } from "react";
import * as THREE from "three";

interface CryogenicChamberProps {
  scrollProgress: number;
}

/**
 * CryogenicChamber:
 * Physically authentic interior cryogenic architecture (Scene 02):
 * - Concentric thermal radiation shielding with architectural cutaways
 * - Polished 304 stainless steel vacuum vessel with vacuum flange & O-ring grooves
 * - 50K gold/nickel radiation shield with thermal tracer tubes
 * - 4K oxygen-free high conductivity copper inner shield
 * - Flexible braided OFHC copper thermal links (heat straps)
 * - Microwave ferrite circulators / isolators with 3-port SMA geometry
 * - Low-noise cryogenic HEMT amplifiers mounted to the 4K cold plate
 * - Cryoperm high-permeability magnetic shield canister housing the QPU
 */
export default function CryogenicChamber({ scrollProgress }: CryogenicChamberProps) {
  const materials = useMemo(() => {
    return {
      vacuumVessel: new THREE.MeshStandardMaterial({
        color: "#94A3B8",
        metalness: 0.94,
        roughness: 0.22,
        side: THREE.DoubleSide,
        envMapIntensity: 2.0,
      }),
      copperShield: new THREE.MeshStandardMaterial({
        color: "#D97736",
        metalness: 0.94,
        roughness: 0.22,
        side: THREE.DoubleSide,
        envMapIntensity: 1.8,
      }),
      goldShield: new THREE.MeshStandardMaterial({
        color: "#F3C77C",
        metalness: 0.96,
        roughness: 0.16,
        side: THREE.DoubleSide,
        envMapIntensity: 2.2,
      }),
      goldHardware: new THREE.MeshStandardMaterial({
        color: "#E5B869",
        metalness: 0.96,
        roughness: 0.18,
      }),
      cryoperm: new THREE.MeshStandardMaterial({
        color: "#334155",
        metalness: 0.92,
        roughness: 0.28,
        side: THREE.DoubleSide,
      }),
      smaPort: new THREE.MeshStandardMaterial({
        color: "#D4AF37",
        metalness: 0.96,
        roughness: 0.2,
      }),
      tracerPipe: new THREE.MeshStandardMaterial({
        color: "#CBD5E1",
        metalness: 0.95,
        roughness: 0.18,
      }),
    };
  }, []);

  // Shared braided strap geometry
  const strapGeometry = useMemo(() => new THREE.BoxGeometry(0.016, 0.42, 0.06), []);

  // Visible during Scene 2 (0.10 to 0.36) and in wide network reveal Scene 6 (0.84 to 1.0)
  // Fades out during Scenes 3, 4, 5 so the camera has an unobstructed macro view of the processor chip
  const isVisible = (scrollProgress >= 0.10 && scrollProgress <= 0.36) || scrollProgress >= 0.84;
  if (!isVisible) return null;

  return (
    <group position={[0, 0, 0]}>
      {/* 1. Outer 304 Stainless Steel Vacuum Vessel (Clean 150° Cutaway Arc on the right) */}
      <group position={[0, 0.2, 0]}>
        <mesh>
          {/* Cylinder arc from angle 0 to 1.35 * PI to reveal the internal chandelier */}
          <cylinderGeometry args={[0.98, 0.98, 2.8, 48, 1, true, 0, Math.PI * 1.3]} />
          <primitive object={materials.vacuumVessel} attach="material" />
        </mesh>

        {/* Top Vacuum Vessel Flange Rim */}
        <mesh position={[0, 1.4, 0]}>
          <cylinderGeometry args={[1.04, 1.04, 0.05, 48]} />
          <primitive object={materials.vacuumVessel} attach="material" />
        </mesh>

        {/* Bottom Flange Rim */}
        <mesh position={[0, -1.4, 0]}>
          <cylinderGeometry args={[1.04, 1.04, 0.05, 48]} />
          <primitive object={materials.vacuumVessel} attach="material" />
        </mesh>
      </group>

      {/* 2. 50K Thermal Radiation Shield (Gold-Plated Cutaway Arc) */}
      <group position={[0, 0.15, 0]}>
        <mesh>
          <cylinderGeometry args={[0.88, 0.88, 2.1, 40, 1, true, 0.1, Math.PI * 1.25]} />
          <primitive object={materials.goldShield} attach="material" />
        </mesh>

        {/* Cooling tracer fluid pipes coiled around 50K shield */}
        {[0.6, 0.0, -0.6].map((y, pIdx) => (
          <mesh key={`tracer-${pIdx}`} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.885, 0.008, 12, 48, Math.PI * 1.25]} />
            <primitive object={materials.tracerPipe} attach="material" />
          </mesh>
        ))}
      </group>

      {/* 3. 4K Inner Radiation Shield (OFHC Copper Nested Cutaway) */}
      <mesh position={[0, -0.35, 0]}>
        <cylinderGeometry args={[0.76, 0.76, 1.45, 36, 1, true, 0.15, Math.PI * 1.2]} />
        <primitive object={materials.copperShield} attach="material" />
      </mesh>

      {/* 4. Cryoperm High-Permeability Magnetic Shield (Enclosing QPU at mixing chamber) */}
      <group position={[0, -1.35, 0]}>
        <mesh>
          <cylinderGeometry args={[0.34, 0.34, 0.45, 32, 1, true, 0.2, Math.PI * 1.15]} />
          <primitive object={materials.cryoperm} attach="material" />
        </mesh>
        {/* Top Gold Mounting Flange */}
        <mesh position={[0, 0.22, 0]}>
          <cylinderGeometry args={[0.37, 0.37, 0.02, 32]} />
          <primitive object={materials.goldHardware} attach="material" />
        </mesh>
      </group>

      {/* 5. Braided OFHC Copper Thermal Straps (Flexible heat dissipation links) */}
      {[0, 1, 2, 3, 4, 5].map((idx) => {
        const ang = (idx / 6) * Math.PI * 2;
        const x = Math.cos(ang) * 0.46;
        const z = Math.sin(ang) * 0.46;
        return (
          <group key={`strap-${idx}`} position={[x, -0.85, z]} rotation={[0, ang, 0.22]}>
            <mesh geometry={strapGeometry} material={materials.copperShield} />
            {/* Stamped Gold End Lug */}
            <mesh position={[0, 0.21, 0]}>
              <boxGeometry args={[0.024, 0.03, 0.07]} />
              <primitive object={materials.goldHardware} attach="material" />
            </mesh>
            <mesh position={[0, -0.21, 0]}>
              <boxGeometry args={[0.024, 0.03, 0.07]} />
              <primitive object={materials.goldHardware} attach="material" />
            </mesh>
          </group>
        );
      })}

      {/* 6. Microwave Ferrite Circulators / Isolators (Mounted below 4K stage) */}
      {[0, 1, 2, 3].map((idx) => {
        const ang = (idx / 4) * Math.PI * 2 + 0.35;
        const x = Math.cos(ang) * 0.50;
        const z = Math.sin(ang) * 0.50;
        return (
          <group key={`circulator-${idx}`} position={[x, 0.22, z]} rotation={[0, ang, 0]}>
            {/* Hexagonal Gold Circulator Housing */}
            <mesh>
              <cylinderGeometry args={[0.042, 0.042, 0.032, 6]} />
              <primitive object={materials.goldHardware} attach="material" />
            </mesh>
            {/* 3 SMA Coaxial Ports */}
            {[0, 1, 2].map((pIdx) => {
              const pAng = (pIdx / 3) * Math.PI * 2;
              return (
                <mesh
                  key={`circ-port-${idx}-${pIdx}`}
                  position={[Math.cos(pAng) * 0.048, 0, Math.sin(pAng) * 0.048]}
                  rotation={[0, pAng, Math.PI / 2]}
                >
                  <cylinderGeometry args={[0.008, 0.008, 0.018, 12]} />
                  <primitive object={materials.smaPort} attach="material" />
                </mesh>
              );
            })}
          </group>
        );
      })}

      {/* 7. Cryogenic Low-Noise HEMT Amplifiers with Cooling Fins */}
      {[0, 1].map((idx) => {
        const ang = idx * Math.PI + 0.9;
        const x = Math.cos(ang) * 0.54;
        const z = Math.sin(ang) * 0.54;
        return (
          <group key={`hemt-${idx}`} position={[x, 0.28, z]}>
            {/* Main Gold HEMT Chassis */}
            <mesh>
              <boxGeometry args={[0.08, 0.12, 0.045]} />
              <primitive object={materials.goldHardware} attach="material" />
            </mesh>
            {/* Heatsink Cooling Fins */}
            {[ -0.03, -0.01, 0.01, 0.03 ].map((finOffset, fIdx) => (
              <mesh key={`fin-${fIdx}`} position={[finOffset, 0, 0.028]}>
                <boxGeometry args={[0.008, 0.11, 0.012]} />
                <primitive object={materials.copperShield} attach="material" />
              </mesh>
            ))}
          </group>
        );
      })}
    </group>
  );
}
