"use client";

import React, { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { getBrushedMetalTexture, getWovenBraidTexture } from "./proceduralTextures";

interface CryogenicChamberProps {
  scrollProgress: number;
}

/**
 * CryogenicChamber (Scene 02):
 * Physically authentic interior cryogenic architecture:
 * - Positioned strictly in the rear hemisphere (Z <= 0) as an architectural backdrop
 * - Completely open front (facing camera) so the golden chandelier is never obscured or sliced
 * - Smooth sine-eased opacity that only reveals during Scene 2 (0.16 -> 0.35)
 * - 304 Stainless steel vacuum vessel with machined ISO vacuum flanges
 * - 50K gold-plated radiation shield with conformal thermal tracer cooling pipes
 * - 4K oxygen-free high-conductivity (OFHC) copper inner shield
 * - Flexible woven braided OFHC copper thermal links (heat straps) with stamped gold lugs
 * - 3-port SMA microwave ferrite circulators / isolators
 * - Low-noise cryogenic HEMT amplifiers with copper heatsink fins
 * - Cryoperm high-permeability magnetic shield canister enclosing the QPU
 */
export default function CryogenicChamber({ scrollProgress }: CryogenicChamberProps) {
  const groupRef = useRef<THREE.Group>(null);
  const currentOpacity = useRef<number>(0);
  const currentSlideY = useRef<number>(0.2);

  const brushedTexture = useMemo(() => getBrushedMetalTexture(), []);
  const braidTexture = useMemo(() => getWovenBraidTexture(), []);

  // Shared PBR materials
  const materials = useMemo(() => {
    return {
      vacuumVessel: new THREE.MeshStandardMaterial({
        color: "#94A3B8",
        metalness: 0.94,
        roughness: 0.22,
        bumpMap: brushedTexture,
        bumpScale: 0.002,
        side: THREE.DoubleSide,
        envMapIntensity: 1.8,
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
        color: "#E5B869",
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
        color: "#D4AF37",
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

  // Pre-generate smooth conformal tracer pipe curve (120-degree arc around rear)
  const tracerCurves = useMemo(() => {
    return [0.6, 0.0, -0.6].map((y) => {
      const pts: THREE.Vector3[] = [];
      const steps = 32;
      const r = 0.885;
      for (let i = 0; i <= steps; i++) {
        // Arc from -0.42*PI to +0.42*PI (all points have z < 0)
        const ang = -Math.PI * 0.42 + (i / steps) * (Math.PI * 0.84);
        const x = -r * Math.sin(ang);
        const z = -r * Math.cos(ang);
        pts.push(new THREE.Vector3(x, y, z));
      }
      return new THREE.CatmullRomCurve3(pts);
    });
  }, []);

  const tracerGeometries = useMemo(() => {
    return tracerCurves.map((curve) => new THREE.TubeGeometry(curve, 32, 0.008, 8, false));
  }, [tracerCurves]);

  React.useEffect(() => {
    return () => {
      tracerGeometries.forEach((g) => g.dispose());
    };
  }, [tracerGeometries]);

  // Frame-by-frame smooth interpolation
  useFrame(() => {
    const p = scrollProgress;
    let targetOpacity = 0.0;
    let targetSlideY = 0.0;

    // Reveal strictly in Scene 2 (0.16 -> 0.34)
    if (p >= 0.14 && p <= 0.36) {
      if (p < 0.22) {
        // Easing entrance
        const t = (p - 0.14) / 0.08;
        const eased = Math.sin((t * Math.PI) / 2);
        targetOpacity = eased;
        targetSlideY = (1.0 - eased) * 0.25;
      } else if (p > 0.28) {
        // Easing exit toward chip push-in
        const t = (p - 0.28) / 0.08;
        const eased = Math.sin((t * Math.PI) / 2);
        targetOpacity = 1.0 - eased;
        targetSlideY = -eased * 0.25;
      } else {
        targetOpacity = 1.0;
        targetSlideY = 0.0;
      }
    } else if (p >= 0.84) {
      // Gentle presence in wide network reveal (Scene 6)
      const t = Math.min(1.0, (p - 0.84) / 0.12);
      targetOpacity = Math.sin((t * Math.PI) / 2) * 0.8;
      targetSlideY = 0.0;
    }

    currentOpacity.current = THREE.MathUtils.lerp(currentOpacity.current, targetOpacity, 0.08);
    currentSlideY.current = THREE.MathUtils.lerp(currentSlideY.current, targetSlideY, 0.08);

    const alpha = currentOpacity.current;

    if (groupRef.current) {
      groupRef.current.position.y = currentSlideY.current;
      groupRef.current.visible = alpha > 0.008;
    }

    materials.vacuumVessel.opacity = alpha * 0.92;
    materials.copperShield.opacity = alpha * 0.90;
    materials.goldShield.opacity = alpha * 0.90;
    materials.braidedCopper.opacity = alpha * 0.88;
    materials.goldHardware.opacity = alpha * 0.92;
    materials.cryoperm.opacity = alpha * 0.88;
    materials.smaPort.opacity = alpha * 0.92;
    materials.tracerPipe.opacity = alpha * 0.88;
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* 
        Orientation:
        thetaStart = -Math.PI * 0.44, thetaLength = Math.PI * 0.88
        Since x = -r*sin(theta) and z = -r*cos(theta), for theta in [-0.44*PI, +0.44*PI],
        cos(theta) > 0, so z is strictly negative (z <= -0.18).
        This guarantees the cutaway shell is 100% in the rear backdrop!
        The camera facing from +Z looks directly into the illuminated chandelier.
      */}
      <group>
        {/* 1. Outer 304 Stainless Steel Vacuum Vessel (Backdrop Arc) */}
        <group position={[0, 0.2, 0]}>
          <mesh>
            <cylinderGeometry
              args={[0.98, 0.98, 2.7, 48, 1, true, -Math.PI * 0.44, Math.PI * 0.88]}
            />
            <primitive object={materials.vacuumVessel} attach="material" />
          </mesh>

          {/* Top Flange Rim */}
          <mesh position={[0, 1.35, 0]}>
            <cylinderGeometry
              args={[1.03, 1.03, 0.05, 48, 1, true, -Math.PI * 0.44, Math.PI * 0.88]}
            />
            <primitive object={materials.vacuumVessel} attach="material" />
          </mesh>

          {/* Bottom Flange Rim */}
          <mesh position={[0, -1.35, 0]}>
            <cylinderGeometry
              args={[1.03, 1.03, 0.05, 48, 1, true, -Math.PI * 0.44, Math.PI * 0.88]}
            />
            <primitive object={materials.vacuumVessel} attach="material" />
          </mesh>
        </group>

        {/* 2. 50K Thermal Radiation Shield (Gold-Plated Rear Shell) */}
        <group position={[0, 0.15, 0]}>
          <mesh>
            <cylinderGeometry
              args={[0.88, 0.88, 2.05, 40, 1, true, -Math.PI * 0.42, Math.PI * 0.84]}
            />
            <primitive object={materials.goldShield} attach="material" />
          </mesh>

          {/* Conformal Fluid Cooling Tracer Pipes hugging rear shield */}
          {tracerGeometries.map((geo, idx) => (
            <mesh key={`tracer-pipe-${idx}`} geometry={geo} material={materials.tracerPipe} />
          ))}
        </group>

        {/* 3. 4K Inner Radiation Shield (OFHC Copper Nested Rear Arc) */}
        <mesh position={[0, -0.35, 0]}>
          <cylinderGeometry
            args={[0.76, 0.76, 1.45, 36, 1, true, -Math.PI * 0.40, Math.PI * 0.80]}
          />
          <primitive object={materials.copperShield} attach="material" />
        </mesh>

        {/* 4. Cryoperm High-Permeability Magnetic Shield (At mixing chamber) */}
        <group position={[0, -1.35, 0]}>
          <mesh>
            <cylinderGeometry
              args={[0.34, 0.34, 0.45, 32, 1, true, -Math.PI * 0.45, Math.PI * 0.90]}
            />
            <primitive object={materials.cryoperm} attach="material" />
          </mesh>
          <mesh position={[0, 0.22, 0]}>
            <cylinderGeometry
              args={[0.36, 0.36, 0.02, 32, 1, true, -Math.PI * 0.45, Math.PI * 0.90]}
            />
            <primitive object={materials.goldHardware} attach="material" />
          </mesh>
        </group>
      </group>

      {/* 5. Braided OFHC Copper Thermal Straps (Conformally linked to stages) */}
      {[0, 1, 2, 3].map((idx) => {
        const ang = (idx / 4) * Math.PI * 1.2 - Math.PI * 0.6;
        const x = Math.cos(ang) * 0.42;
        const z = -Math.abs(Math.sin(ang) * 0.42);
        return (
          <group key={`strap-${idx}`} position={[x, -0.85, z]} rotation={[0, ang, 0.18]}>
            <mesh>
              <boxGeometry args={[0.016, 0.40, 0.05]} />
              <primitive object={materials.braidedCopper} attach="material" />
            </mesh>
            {/* Stamped Gold End Lugs */}
            <mesh position={[0, 0.20, 0]}>
              <boxGeometry args={[0.022, 0.03, 0.06]} />
              <primitive object={materials.goldHardware} attach="material" />
            </mesh>
            <mesh position={[0, -0.20, 0]}>
              <boxGeometry args={[0.022, 0.03, 0.06]} />
              <primitive object={materials.goldHardware} attach="material" />
            </mesh>
          </group>
        );
      })}

      {/* 6. Microwave Ferrite Circulators / Isolators (Under 4K plate) */}
      {[0, 1, 2].map((idx) => {
        const ang = (idx / 3) * Math.PI * 1.1 - Math.PI * 0.55;
        const x = Math.cos(ang) * 0.48;
        const z = -Math.abs(Math.sin(ang) * 0.48);
        return (
          <group key={`circulator-${idx}`} position={[x, 0.22, z]} rotation={[0, ang, 0]}>
            {/* Hexagonal Gold Circulator Housing */}
            <mesh>
              <cylinderGeometry args={[0.040, 0.040, 0.030, 6]} />
              <primitive object={materials.goldHardware} attach="material" />
            </mesh>
            {/* 3 SMA Coaxial Ports */}
            {[0, 1, 2].map((pIdx) => {
              const pAng = (pIdx / 3) * Math.PI * 2;
              return (
                <mesh
                  key={`circ-port-${idx}-${pIdx}`}
                  position={[Math.cos(pAng) * 0.045, 0, Math.sin(pAng) * 0.045]}
                  rotation={[0, pAng, Math.PI / 2]}
                >
                  <cylinderGeometry args={[0.007, 0.007, 0.016, 12]} />
                  <primitive object={materials.smaPort} attach="material" />
                </mesh>
              );
            })}
          </group>
        );
      })}

      {/* 7. Cryogenic Low-Noise HEMT Amplifiers */}
      {[0, 1].map((idx) => {
        const ang = idx * 0.9 - 0.45;
        const x = Math.cos(ang) * 0.52;
        const z = -Math.abs(Math.sin(ang) * 0.52);
        return (
          <group key={`hemt-${idx}`} position={[x, 0.28, z]}>
            {/* Main Gold HEMT Chassis */}
            <mesh>
              <boxGeometry args={[0.075, 0.11, 0.042]} />
              <primitive object={materials.goldHardware} attach="material" />
            </mesh>
            {/* Heatsink Cooling Fins */}
            {[-0.025, -0.008, 0.008, 0.025].map((finOffset, fIdx) => (
              <mesh key={`fin-${fIdx}`} position={[finOffset, 0, 0.026]}>
                <boxGeometry args={[0.007, 0.10, 0.012]} />
                <primitive object={materials.copperShield} attach="material" />
              </mesh>
            ))}
          </group>
        );
      })}
    </group>
  );
}
