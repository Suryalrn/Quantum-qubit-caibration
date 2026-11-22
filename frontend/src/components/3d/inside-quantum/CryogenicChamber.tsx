"use client";

import React, { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { getBrushedMetalTexture, getWovenBraidTexture } from "./proceduralTextures";

interface CryogenicChamberProps {
  scrollProgress: number;
}

/**
 * CryogenicChamber:
 * Physically authentic interior cryogenic architecture (Scene 02):
 * - Smooth continuous opacity & position easing (zero jarring pop-ins)
 * - Architectural cutaway shell wrapping neatly behind the chandelier
 * - 180° front opening permanently facing the camera so the chandelier is never obstructed
 * - Polished 304 stainless steel vacuum vessel with brushed texture & vacuum flanges
 * - 50K gold/nickel radiation shield with horizontal thermal tracer cooling coils
 * - 4K oxygen-free high conductivity copper inner shield
 * - Flexible woven braided OFHC copper thermal links (heat straps) with stamped gold lugs
 * - Microwave ferrite circulators / isolators with 3-port SMA geometry
 * - Low-noise cryogenic HEMT amplifiers mounted to the 4K cold plate
 * - Cryoperm high-permeability magnetic shield canister housing the QPU
 */
export default function CryogenicChamber({ scrollProgress }: CryogenicChamberProps) {
  const groupRef = useRef<THREE.Group>(null);
  const currentOpacity = useRef<number>(0);
  const currentSlideY = useRef<number>(0.3);

  const brushedTexture = useMemo(() => getBrushedMetalTexture(), []);
  const braidTexture = useMemo(() => getWovenBraidTexture(), []);

  // Shared PBR materials with full transparency support for butter-smooth transitions
  const materials = useMemo(() => {
    return {
      vacuumVessel: new THREE.MeshStandardMaterial({
        color: "#94A3B8",
        metalness: 0.94,
        roughness: 0.22,
        bumpMap: brushedTexture,
        bumpScale: 0.002,
        side: THREE.DoubleSide,
        envMapIntensity: 2.0,
        transparent: true,
        opacity: 0,
      }),
      copperShield: new THREE.MeshStandardMaterial({
        color: "#D97736",
        metalness: 0.94,
        roughness: 0.22,
        bumpMap: brushedTexture,
        bumpScale: 0.0018,
        side: THREE.DoubleSide,
        envMapIntensity: 1.8,
        transparent: true,
        opacity: 0,
      }),
      goldShield: new THREE.MeshStandardMaterial({
        color: "#F3C77C",
        metalness: 0.96,
        roughness: 0.16,
        bumpMap: brushedTexture,
        bumpScale: 0.0015,
        side: THREE.DoubleSide,
        envMapIntensity: 2.2,
        transparent: true,
        opacity: 0,
      }),
      braidedCopper: new THREE.MeshStandardMaterial({
        color: "#D97736",
        map: braidTexture,
        metalness: 0.88,
        roughness: 0.35,
        bumpMap: braidTexture,
        bumpScale: 0.004,
        envMapIntensity: 1.6,
        transparent: true,
        opacity: 0,
      }),
      goldHardware: new THREE.MeshStandardMaterial({
        color: "#E5B869",
        metalness: 0.96,
        roughness: 0.18,
        transparent: true,
        opacity: 0,
      }),
      cryoperm: new THREE.MeshStandardMaterial({
        color: "#334155",
        metalness: 0.92,
        roughness: 0.28,
        bumpMap: brushedTexture,
        bumpScale: 0.0015,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0,
      }),
      smaPort: new THREE.MeshStandardMaterial({
        color: "#D4AF37",
        metalness: 0.96,
        roughness: 0.2,
        transparent: true,
        opacity: 0,
      }),
      tracerPipe: new THREE.MeshStandardMaterial({
        color: "#CBD5E1",
        metalness: 0.95,
        roughness: 0.18,
        transparent: true,
        opacity: 0,
      }),
    };
  }, [brushedTexture, braidTexture]);

  // Shared braided strap geometry
  const strapGeometry = useMemo(() => new THREE.BoxGeometry(0.016, 0.42, 0.06), []);

  // Butter-smooth frame-by-frame interpolation
  useFrame(() => {
    const p = scrollProgress;
    let targetOpacity = 0.0;
    let targetSlideY = 0.0;

    if (p >= 0.06 && p <= 0.38) {
      if (p < 0.18) {
        // Smooth entrance: 0.06 -> 0.18 (eases into place as user scrolls toward Scene 2)
        const t = (p - 0.06) / 0.12;
        const eased = Math.sin((t * Math.PI) / 2);
        targetOpacity = eased;
        targetSlideY = (1.0 - eased) * 0.35; // smoothly settles 35cm down into position
      } else if (p > 0.26) {
        // Smooth exit toward Scene 3 (macro chip push-in): 0.26 -> 0.38
        const t = (p - 0.26) / 0.12;
        const eased = Math.sin((t * Math.PI) / 2);
        targetOpacity = 1.0 - eased;
        targetSlideY = -eased * 0.35; // smoothly descends away
      } else {
        // Rock-solid display during Scene 2
        targetOpacity = 1.0;
        targetSlideY = 0.0;
      }
    } else if (p >= 0.82) {
      // Smooth re-appearance in Scene 6 (distributed wide network reveal)
      const t = Math.min(1.0, (p - 0.82) / 0.12);
      targetOpacity = Math.sin((t * Math.PI) / 2);
      targetSlideY = 0.0;
    }

    // Smooth lerp to eliminate any jitter or micro-steps
    currentOpacity.current = THREE.MathUtils.lerp(currentOpacity.current, targetOpacity, 0.08);
    currentSlideY.current = THREE.MathUtils.lerp(currentSlideY.current, targetSlideY, 0.08);

    const alpha = currentOpacity.current;

    if (groupRef.current) {
      groupRef.current.position.y = currentSlideY.current;
      groupRef.current.visible = alpha > 0.008;
    }

    // Dynamically update material opacities and depthWrite
    const isFullyOpaque = alpha > 0.95;
    materials.vacuumVessel.opacity = alpha * 0.95;
    materials.vacuumVessel.depthWrite = isFullyOpaque;
    materials.copperShield.opacity = alpha * 0.92;
    materials.copperShield.depthWrite = isFullyOpaque;
    materials.goldShield.opacity = alpha * 0.92;
    materials.goldShield.depthWrite = isFullyOpaque;
    materials.braidedCopper.opacity = alpha * 0.90;
    materials.goldHardware.opacity = alpha * 0.95;
    materials.cryoperm.opacity = alpha * 0.90;
    materials.smaPort.opacity = alpha * 0.95;
    materials.tracerPipe.opacity = alpha * 0.90;
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* 
        Orientation calculation:
        rotation={[0, Math.PI * 0.42, 0]} with thetaStart=0, thetaLength=Math.PI * 1.05
        places the entire curved shell safely behind the chandelier (wrapping from right around back to left).
        The front (facing the camera) is 100% open so the chandelier is never obstructed or bisected!
      */}
      <group rotation={[0, Math.PI * 0.42, 0]}>
        {/* 1. Outer 304 Stainless Steel Vacuum Vessel (Backdrop Cutaway Arc) */}
        <group position={[0, 0.2, 0]}>
          <mesh>
            <cylinderGeometry args={[0.98, 0.98, 2.8, 48, 1, true, 0, Math.PI * 1.05]} />
            <primitive object={materials.vacuumVessel} attach="material" />
          </mesh>

          {/* Top Vacuum Vessel Flange Rim */}
          <mesh position={[0, 1.4, 0]}>
            <cylinderGeometry args={[1.04, 1.04, 0.05, 48, 1, true, 0, Math.PI * 1.05]} />
            <primitive object={materials.vacuumVessel} attach="material" />
          </mesh>

          {/* Bottom Flange Rim */}
          <mesh position={[0, -1.4, 0]}>
            <cylinderGeometry args={[1.04, 1.04, 0.05, 48, 1, true, 0, Math.PI * 1.05]} />
            <primitive object={materials.vacuumVessel} attach="material" />
          </mesh>
        </group>

        {/* 2. 50K Thermal Radiation Shield (Gold-Plated Cutaway Arc) */}
        <group position={[0, 0.15, 0]}>
          <mesh>
            <cylinderGeometry args={[0.88, 0.88, 2.1, 40, 1, true, 0.04, Math.PI * 0.98]} />
            <primitive object={materials.goldShield} attach="material" />
          </mesh>

          {/* Cooling tracer fluid pipes coiled around 50K shield (ROTATED FLAT -Math.PI/2) */}
          {[0.6, 0.0, -0.6].map((y, pIdx) => (
            <mesh key={`tracer-${pIdx}`} position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.885, 0.008, 12, 48, Math.PI * 0.98]} />
              <primitive object={materials.tracerPipe} attach="material" />
            </mesh>
          ))}
        </group>

        {/* 3. 4K Inner Radiation Shield (OFHC Copper Nested Cutaway) */}
        <mesh position={[0, -0.35, 0]}>
          <cylinderGeometry args={[0.76, 0.76, 1.45, 36, 1, true, 0.08, Math.PI * 0.90]} />
          <primitive object={materials.copperShield} attach="material" />
        </mesh>

        {/* 4. Cryoperm High-Permeability Magnetic Shield (Enclosing QPU at mixing chamber) */}
        <group position={[0, -1.35, 0]}>
          <mesh>
            <cylinderGeometry args={[0.34, 0.34, 0.45, 32, 1, true, 0.1, Math.PI * 0.85]} />
            <primitive object={materials.cryoperm} attach="material" />
          </mesh>
          {/* Top Gold Mounting Flange */}
          <mesh position={[0, 0.22, 0]}>
            <cylinderGeometry args={[0.37, 0.37, 0.02, 32, 1, true, 0.1, Math.PI * 0.85]} />
            <primitive object={materials.goldHardware} attach="material" />
          </mesh>
        </group>
      </group>

      {/* 5. Braided OFHC Copper Thermal Straps (Woven texture heat dissipation links) */}
      {[0, 1, 2, 3].map((idx) => {
        const ang = (idx / 4) * Math.PI * 1.2 + 0.6;
        const x = Math.cos(ang) * 0.46;
        const z = Math.sin(ang) * 0.46;
        return (
          <group key={`strap-${idx}`} position={[x, -0.85, z]} rotation={[0, ang, 0.22]}>
            <mesh geometry={strapGeometry} material={materials.braidedCopper} />
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
      {[0, 1, 2].map((idx) => {
        const ang = (idx / 3) * Math.PI * 1.1 + 0.8;
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

      {/* 7. Cryogenic Low-Noise HEMT Amplifiers with Heatsink Cooling Fins */}
      {[0, 1].map((idx) => {
        const ang = idx * 0.9 + 1.2;
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
            {[-0.03, -0.01, 0.01, 0.03].map((finOffset, fIdx) => (
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
