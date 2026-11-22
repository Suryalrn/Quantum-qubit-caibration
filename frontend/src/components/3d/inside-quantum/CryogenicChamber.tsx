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
 * Mechanically complete, scientifically authentic interior cryogenic architecture:
 * - Positioned strictly in the rear hemisphere (Z <= -0.18) as an architectural backdrop
 * - 100% open front facing the camera (no foreground slicing or obstruction)
 * - 304 Stainless steel vacuum vessel with machined ISO vacuum flanges
 * - 50K gold-plated radiation shield with top mounting collar bolted to 50K plate & conformal cooling tracer pipes
 * - 4K oxygen-free high-conductivity (OFHC) copper inner shield with mounting flange bolted to 4K plate
 * - Flexible woven braided OFHC copper thermal links (heat straps) connecting pulse-tube stages with machined copper lugs
 * - 3-port SMA microwave ferrite circulators / isolators with copper mounting L-brackets bolted to Still plate
 * - Low-noise cryogenic HEMT amplifiers with copper heatsink fins bolted to 4K cold plate
 * - Cryoperm high-permeability magnetic shield canister with mounting flange bolted to mixing chamber plate
 */
export default function CryogenicChamber({ scrollProgress }: CryogenicChamberProps) {
  const groupRef = useRef<THREE.Group>(null);
  const currentOpacity = useRef<number>(0);
  const currentSlideY = useRef<number>(0.2);

  const brushedTexture = useMemo(() => getBrushedMetalTexture(), []);
  const braidTexture = useMemo(() => getWovenBraidTexture(), []);

  // Shared photorealistic PBR materials
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
        color: "#C87548",
        metalness: 0.94,
        roughness: 0.22,
        bumpMap: brushedTexture,
        bumpScale: 0.0018,
        side: THREE.DoubleSide,
        envMapIntensity: 1.8,
        transparent: true,
        opacity: 0,
      }),
      ofhcCopper: new THREE.MeshStandardMaterial({
        color: "#C87548",
        metalness: 0.94,
        roughness: 0.22,
        bumpMap: brushedTexture,
        bumpScale: 0.0018,
        envMapIntensity: 1.8,
        transparent: true,
        opacity: 0,
      }),
      goldShield: new THREE.MeshStandardMaterial({
        color: "#ECC068",
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
        color: "#C87548",
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
      stainlessBolts: new THREE.MeshStandardMaterial({
        color: "#E2E8F0",
        metalness: 0.96,
        roughness: 0.16,
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
        roughness: 0.18,
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

    // Reveal strictly in Scene 2 (0.15 -> 0.35)
    if (p >= 0.14 && p <= 0.36) {
      if (p < 0.22) {
        const t = (p - 0.14) / 0.08;
        const eased = Math.sin((t * Math.PI) / 2);
        targetOpacity = eased;
        targetSlideY = (1.0 - eased) * 0.25;
      } else if (p > 0.28) {
        const t = (p - 0.28) / 0.08;
        const eased = Math.sin((t * Math.PI) / 2);
        targetOpacity = 1.0 - eased;
        targetSlideY = -eased * 0.25;
      } else {
        targetOpacity = 1.0;
        targetSlideY = 0.0;
      }
    } else if (p >= 0.84) {
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
    materials.ofhcCopper.opacity = alpha * 0.90;
    materials.goldShield.opacity = alpha * 0.90;
    materials.braidedCopper.opacity = alpha * 0.88;
    materials.goldHardware.opacity = alpha * 0.92;
    materials.stainlessBolts.opacity = alpha * 0.94;
    materials.cryoperm.opacity = alpha * 0.88;
    materials.smaPort.opacity = alpha * 0.92;
    materials.tracerPipe.opacity = alpha * 0.88;
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* 
        Orientation:
        thetaStart = Math.PI * 0.56, thetaLength = Math.PI * 0.88 (centered at PI = 180 deg)
        Since x = r*sin(theta) and z = r*cos(theta), for theta in [0.56*PI, 1.44*PI],
        cos(theta) <= -0.187 < 0, so z is strictly negative (z <= -0.18).
        This guarantees the cutaway shell is 100% in the rear backdrop, leaving the front facing camera 100% open!
      */}
      <group>
        {/* =========================================================================
            1. OUTER 304 STAINLESS STEEL VACUUM VESSEL (REAR CUTAWAY BACKDROP)
            ========================================================================= */}
        <group position={[0, 0.2, 0]}>
          <mesh>
            <cylinderGeometry
              args={[0.98, 0.98, 2.7, 48, 1, true, Math.PI * 0.56, Math.PI * 0.88]}
            />
            <primitive object={materials.vacuumVessel} attach="material" />
          </mesh>

          {/* Top Flange Rim (ISO-K Vacuum Collar) */}
          <mesh position={[0, 1.35, 0]}>
            <cylinderGeometry
              args={[1.03, 1.03, 0.05, 48, 1, true, Math.PI * 0.56, Math.PI * 0.88]}
            />
            <primitive object={materials.vacuumVessel} attach="material" />
          </mesh>

          {/* Bottom Flange Rim */}
          <mesh position={[0, -1.35, 0]}>
            <cylinderGeometry
              args={[1.03, 1.03, 0.05, 48, 1, true, Math.PI * 0.56, Math.PI * 0.88]}
            />
            <primitive object={materials.vacuumVessel} attach="material" />
          </mesh>
        </group>

        {/* =========================================================================
            2. 50K THERMAL RADIATION SHIELD (GOLD-PLATED COPPER REAR SHELL)
            ========================================================================= */}
        <group position={[0, 0.15, 0]}>
          {/* Main Curved Radiation Shield Wall */}
          <mesh>
            <cylinderGeometry
              args={[0.88, 0.88, 2.05, 40, 1, true, Math.PI * 0.58, Math.PI * 0.84]}
            />
            <primitive object={materials.goldShield} attach="material" />
          </mesh>

          {/* Top Machined Mounting Flange Bolted to 50K Stage Disc */}
          <mesh position={[0, 1.025, 0]}>
            <cylinderGeometry
              args={[0.90, 0.90, 0.024, 40, 1, true, Math.PI * 0.58, Math.PI * 0.84]}
            />
            <primitive object={materials.goldHardware} attach="material" />
          </mesh>

          {/* Conformal Fluid Cooling Tracer Pipes hugging rear shield */}
          {tracerGeometries.map((geo, idx) => (
            <mesh key={`tracer-pipe-${idx}`} geometry={geo} material={materials.tracerPipe} />
          ))}
        </group>

        {/* =========================================================================
            3. 4K INNER RADIATION SHIELD (OFHC COPPER NESTED REAR ARC)
            ========================================================================= */}
        <group position={[0, -0.35, 0]}>
          {/* Main Curved OFHC Copper Shield */}
          <mesh>
            <cylinderGeometry
              args={[0.76, 0.76, 1.45, 36, 1, true, Math.PI * 0.60, Math.PI * 0.80]}
            />
            <primitive object={materials.copperShield} attach="material" />
          </mesh>

          {/* Top Mounting Flange Collar Bolted to 4K Plate */}
          <mesh position={[0, 0.725, 0]}>
            <cylinderGeometry
              args={[0.78, 0.78, 0.022, 36, 1, true, Math.PI * 0.60, Math.PI * 0.80]}
            />
            <primitive object={materials.ofhcCopper} attach="material" />
          </mesh>
        </group>

        {/* =========================================================================
            4. CRYOPERM HIGH-PERMEABILITY MAGNETIC SHIELD (ENCLOSING MIXING CHAMBER)
            ========================================================================= */}
        <group position={[0, -1.35, 0]}>
          {/* Main Cylindrical Mu-Metal Enclosure */}
          <mesh>
            <cylinderGeometry
              args={[0.34, 0.34, 0.45, 32, 1, true, Math.PI * 0.55, Math.PI * 0.90]}
            />
            <primitive object={materials.cryoperm} attach="material" />
          </mesh>
          {/* Top Gold Mounting Flange Bolted to Mixing Chamber Plate */}
          <mesh position={[0, 0.22, 0]}>
            <cylinderGeometry
              args={[0.36, 0.36, 0.02, 32, 1, true, Math.PI * 0.55, Math.PI * 0.90]}
            />
            <primitive object={materials.goldHardware} attach="material" />
          </mesh>
        </group>
      </group>

      {/* =========================================================================
          5. BRAIDED OFHC COPPER THERMAL HEAT STRAPS (CONNECTING TO PULSE TUBE HEADS)
          ========================================================================= */}
      {/* 2 Straps at 50K Stage (y = 0.95) */}
      {[0, 1].map((idx) => {
        const ang = idx * 0.8 - 0.4;
        const x = Math.cos(ang) * 0.48;
        const z = -Math.abs(Math.sin(ang) * 0.48);
        return (
          <group key={`strap-50k-${idx}`} position={[x, 0.92, z]} rotation={[0, ang, 0.15]}>
            <mesh>
              <boxGeometry args={[0.016, 0.28, 0.045]} />
              <primitive object={materials.braidedCopper} attach="material" />
            </mesh>
            {/* Stamped Copper End Lugs with Hex Bolts */}
            <mesh position={[0, 0.14, 0]}>
              <boxGeometry args={[0.022, 0.028, 0.055]} />
              <primitive object={materials.ofhcCopper} attach="material" />
            </mesh>
            <mesh position={[0, -0.14, 0]}>
              <boxGeometry args={[0.022, 0.028, 0.055]} />
              <primitive object={materials.ofhcCopper} attach="material" />
            </mesh>
          </group>
        );
      })}

      {/* 2 Straps at 4K Stage (y = 0.42) */}
      {[0, 1].map((idx) => {
        const ang = idx * 0.8 + 0.6;
        const x = Math.cos(ang) * 0.44;
        const z = -Math.abs(Math.sin(ang) * 0.44);
        return (
          <group key={`strap-4k-${idx}`} position={[x, 0.39, z]} rotation={[0, ang, -0.15]}>
            <mesh>
              <boxGeometry args={[0.016, 0.26, 0.045]} />
              <primitive object={materials.braidedCopper} attach="material" />
            </mesh>
            <mesh position={[0, 0.13, 0]}>
              <boxGeometry args={[0.022, 0.028, 0.055]} />
              <primitive object={materials.ofhcCopper} attach="material" />
            </mesh>
            <mesh position={[0, -0.13, 0]}>
              <boxGeometry args={[0.022, 0.028, 0.055]} />
              <primitive object={materials.ofhcCopper} attach="material" />
            </mesh>
          </group>
        );
      })}

      {/* =========================================================================
          6. MICROWAVE FERRITE CIRCULATORS / ISOLATORS (BOLTED TO STILL STAGE)
          ========================================================================= */}
      {[0, 1, 2].map((idx) => {
        const ang = (idx / 3) * Math.PI * 1.1 - Math.PI * 0.55;
        const x = Math.cos(ang) * 0.46;
        const z = -Math.abs(Math.sin(ang) * 0.46);
        return (
          <group key={`circulator-${idx}`} position={[x, -0.16, z]} rotation={[0, ang, 0]}>
            {/* Gold-Plated Copper Mounting L-Bracket Bolted to Still Plate */}
            <mesh position={[0, 0.035, -0.02]}>
              <boxGeometry args={[0.045, 0.040, 0.008]} />
              <primitive object={materials.goldHardware} attach="material" />
            </mesh>
            {/* Hexagonal Gold Circulator Housing */}
            <mesh>
              <cylinderGeometry args={[0.038, 0.038, 0.028, 6]} />
              <primitive object={materials.goldHardware} attach="material" />
            </mesh>
            {/* 3 SMA Coaxial Ports (Input from chip, Output to HEMT, 50Ω Termination) */}
            {[0, 1, 2].map((pIdx) => {
              const pAng = (pIdx / 3) * Math.PI * 2;
              return (
                <mesh
                  key={`circ-port-${idx}-${pIdx}`}
                  position={[Math.cos(pAng) * 0.042, 0, Math.sin(pAng) * 0.042]}
                  rotation={[0, pAng, Math.PI / 2]}
                >
                  <cylinderGeometry args={[0.007, 0.007, 0.015, 12]} />
                  <primitive object={materials.smaPort} attach="material" />
                </mesh>
              );
            })}
          </group>
        );
      })}

      {/* =========================================================================
          7. CRYOGENIC LOW-NOISE HEMT AMPLIFIERS (BOLTED TO 4K COLD PLATE)
          ========================================================================= */}
      {[0, 1].map((idx) => {
        const ang = idx * 0.85 - 0.42;
        const x = Math.cos(ang) * 0.50;
        const z = -Math.abs(Math.sin(ang) * 0.50);
        return (
          <group key={`hemt-${idx}`} position={[x, 0.38, z]}>
            {/* Copper Thermal Mounting Bracket Bolted to 4K Plate */}
            <mesh position={[0, 0.065, 0]}>
              <boxGeometry args={[0.078, 0.016, 0.048]} />
              <primitive object={materials.ofhcCopper} attach="material" />
            </mesh>
            {/* Main Gold HEMT Chassis */}
            <mesh>
              <boxGeometry args={[0.072, 0.105, 0.040]} />
              <primitive object={materials.goldHardware} attach="material" />
            </mesh>
            {/* Copper Heatsink Cooling Fins */}
            {[-0.024, -0.008, 0.008, 0.024].map((finOffset, fIdx) => (
              <mesh key={`fin-${fIdx}`} position={[finOffset, 0, 0.024]}>
                <boxGeometry args={[0.006, 0.095, 0.010]} />
                <primitive object={materials.copperShield} attach="material" />
              </mesh>
            ))}
            {/* Input & Output SMA Ports */}
            <mesh position={[0, -0.058, 0]} rotation={[0, 0, 0]}>
              <cylinderGeometry args={[0.007, 0.007, 0.015, 12]} />
              <primitive object={materials.smaPort} attach="material" />
            </mesh>
            <mesh position={[0, 0.058, 0]} rotation={[0, 0, 0]}>
              <cylinderGeometry args={[0.007, 0.007, 0.015, 12]} />
              <primitive object={materials.smaPort} attach="material" />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
