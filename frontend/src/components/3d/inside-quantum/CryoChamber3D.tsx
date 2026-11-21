"use client";

import React, { useMemo, useRef } from "react";
import * as THREE from "three";

interface CryoChamberProps {
  scrollProgress: number; // 0.0 to 1.0
}

/**
 * SCENE 02: Cryogenic Chamber Internal Architecture
 * Detailed view of the interior dilution stage:
 * - Concentric thermal radiation shielding
 * - OFHC copper thermal busbars & braided heat links
 * - Cryogenic circulators, isolators & low-noise HEMT amplifiers
 * - Rigid structural interface to the mixing chamber base
 */
export default function CryoChamber3D({ scrollProgress }: CryoChamberProps) {
  const groupRef = useRef<THREE.Group>(null);

  const materials = useMemo(() => {
    return {
      polishedCopper: new THREE.MeshStandardMaterial({
        color: "#C87548",
        metalness: 0.94,
        roughness: 0.18,
      }),
      goldPlating: new THREE.MeshStandardMaterial({
        color: "#E5B869",
        metalness: 0.95,
        roughness: 0.2,
      }),
      darkTitanium: new THREE.MeshStandardMaterial({
        color: "#334155",
        metalness: 0.85,
        roughness: 0.35,
      }),
      shieldGlass: new THREE.MeshPhysicalMaterial({
        color: "#080B18",
        metalness: 0.1,
        roughness: 0.1,
        transmission: 0.85,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
      }),
      cyanTrace: new THREE.MeshBasicMaterial({
        color: "#06B6D4",
        transparent: true,
        opacity: 0.8,
      }),
      indigoTrace: new THREE.MeshBasicMaterial({
        color: "#6366F1",
        transparent: true,
        opacity: 0.8,
      }),
    };
  }, []);

  // Shared strap geometry
  const strapGeometry = useMemo(() => new THREE.BoxGeometry(0.08, 1.4, 0.3), []);

  // Fade in during Scene 2 (0.10 to 0.60) and keep visible in wide reveal Scene 6
  const isVisible = (scrollProgress >= 0.10 && scrollProgress <= 0.60) || scrollProgress >= 0.84;
  if (!isVisible) return null;

  return (
    <group ref={groupRef} position={[0, -1.8, 0]}>
      {/* Outer Concentric Radiation Shield (Cutaway view) */}
      <mesh position={[0, 0.6, 0]}>
        <cylinderGeometry args={[2.8, 2.8, 3.8, 36, 1, true, 0, Math.PI * 1.5]} />
        <primitive object={materials.shieldGlass} attach="material" />
      </mesh>

      {/* Inner 4K to 100mK Thermal Ring */}
      <mesh position={[0, 1.4, 0]}>
        <torusGeometry args={[2.2, 0.08, 16, 48]} />
        <primitive object={materials.polishedCopper} attach="material" />
      </mesh>

      {/* Braided Copper Thermal Links (Flexible heat straps) */}
      {[0, 1, 2, 3, 4, 5].map((idx) => {
        const ang = (idx / 6) * Math.PI * 2;
        const x = Math.cos(ang) * 1.8;
        const z = Math.sin(ang) * 1.8;
        return (
          <group key={`strap-${idx}`} position={[x, 0.8, z]} rotation={[0, ang, 0.3]}>
            <mesh geometry={strapGeometry} material={materials.polishedCopper} />
          </group>
        );
      })}

      {/* Cryogenic Microwave Circulators & Low-Noise HEMT Amplifiers */}
      {[0, 1, 2, 3].map((idx) => {
        const ang = (idx / 4) * Math.PI * 2 + 0.3;
        const x = Math.cos(ang) * 1.4;
        const z = Math.sin(ang) * 1.4;
        return (
          <group key={`hemt-${idx}`} position={[x, 0.2, z]}>
            <mesh>
              <boxGeometry args={[0.35, 0.45, 0.22]} />
              <primitive object={materials.goldPlating} attach="material" />
            </mesh>
            <mesh position={[0, 0, 0.12]}>
              <cylinderGeometry args={[0.04, 0.04, 0.12, 12]} />
              <primitive object={materials.darkTitanium} attach="material" />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
