"use client";

import React, { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { getBrushedMetalTexture } from "./proceduralTextures";

interface MicrowaveCablesProps {
  scrollProgress: number;
}

/**
 * MicrowaveCables:
 * Organised cryogenic microwave cabling architecture:
 * - 4 banks of semi-rigid UT-85 gold-jacketed & silver-jacketed coaxial transmission lines
 * - Thermal contraction stress-relief coils between 4K plate and Still plate
 * - Precision vertical loomed runs passing through stage feedthrough brackets
 * - Centripetal spline interpolation preventing any wild loops or intersecting lines
 * - Cryogenic RF attenuators (-20dB, -10dB, -3dB) with gold SMA connector hardware
 */
export default function MicrowaveCables({ scrollProgress }: MicrowaveCablesProps) {
  const groupRef = useRef<THREE.Group>(null);
  const currentOpacity = useRef<number>(1.0);
  const brushedTexture = useMemo(() => getBrushedMetalTexture(), []);

  const materials = useMemo(() => {
    return {
      goldCoax: new THREE.MeshStandardMaterial({
        color: "#F3C77C",
        metalness: 0.96,
        roughness: 0.16,
        envMapIntensity: 2.3,
        transparent: true,
        opacity: 1.0,
      }),
      silverCoax: new THREE.MeshStandardMaterial({
        color: "#CBD5E1",
        metalness: 0.96,
        roughness: 0.15,
        envMapIntensity: 2.1,
        transparent: true,
        opacity: 1.0,
      }),
      attenuatorBody: new THREE.MeshStandardMaterial({
        color: "#475569",
        metalness: 0.88,
        roughness: 0.3,
        bumpMap: brushedTexture,
        bumpScale: 0.0015,
        envMapIntensity: 1.6,
        transparent: true,
        opacity: 1.0,
      }),
      smaConnector: new THREE.MeshStandardMaterial({
        color: "#D4AF37",
        metalness: 0.96,
        roughness: 0.18,
        transparent: true,
        opacity: 1.0,
      }),
      bracket: new THREE.MeshStandardMaterial({
        color: "#94A3B8",
        metalness: 0.85,
        roughness: 0.35,
        transparent: true,
        opacity: 1.0,
      }),
      labelBand: new THREE.MeshBasicMaterial({
        color: "#F8FAFC",
        transparent: true,
        opacity: 1.0,
      }),
    };
  }, [brushedTexture]);

  // Stage Y levels matching CoolingStages
  const stageY = [1.5, 0.95, 0.42, -0.12, -0.62, -1.08];

  // 4 banks of 3 coaxial cables distributed azimuthally
  const cableBanks = useMemo(() => {
    const banks = [];
    const bankAngles = [0.2, Math.PI * 0.5 + 0.2, Math.PI + 0.2, Math.PI * 1.5 + 0.2];

    for (let b = 0; b < bankAngles.length; b++) {
      const baseAng = bankAngles[b];
      const cablesInBank = [];

      for (let c = 0; c < 3; c++) {
        const offsetAng = baseAng + (c - 1) * 0.07;
        const pts: THREE.Vector3[] = [];

        // Generate clean vertical stepped runs that step inward with each stage
        for (let s = 0; s < stageY.length; s++) {
          const y = stageY[s];
          const r = THREE.MathUtils.lerp(0.66, 0.32, s / (stageY.length - 1)) + c * 0.02;
          const x = Math.cos(offsetAng) * r;
          const z = Math.sin(offsetAng) * r;

          // Top of stage feedthrough
          pts.push(new THREE.Vector3(x, y + 0.025, z));
          // Bottom of stage feedthrough
          pts.push(new THREE.Vector3(x, y - 0.025, z));

          // Thermal expansion stress-relief loop between 4K (s=2) and Still stage (s=3)
          if (s === 2) {
            const nextY = stageY[s + 1];
            const coilRadius = r + 0.025;
            for (let k = 1; k <= 4; k++) {
              const frac = k / 5;
              const loopAng = offsetAng + Math.sin(frac * Math.PI) * 0.12 * (c - 1 >= 0 ? 1 : -1);
              const cy = THREE.MathUtils.lerp(y - 0.06, nextY + 0.06, frac);
              pts.push(new THREE.Vector3(Math.cos(loopAng) * coilRadius, cy, Math.sin(loopAng) * coilRadius));
            }
          }
        }

        // Use centripetal Catmull-Rom curve to guarantee NO overshoot looping
        const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal");
        cablesInBank.push({ curve, isGold: (b + c) % 2 === 0 });
      }

      banks.push(cablesInBank);
    }
    return banks;
  }, []);

  // Pre-allocate TubeGeometries for high performance
  const cableGeometries = useMemo(() => {
    return cableBanks.map((bank) =>
      bank.map((c) => new THREE.TubeGeometry(c.curve, 36, 0.0075, 8, false))
    );
  }, [cableBanks]);

  // Clean GPU geometries on unmount
  React.useEffect(() => {
    return () => {
      cableGeometries.forEach((bank) => bank.forEach((g) => g.dispose()));
    };
  }, [cableGeometries]);

  // Attenuators mounted underneath stages
  const attenuators = useMemo(() => {
    const list: { pos: [number, number, number]; rot: [number, number, number] }[] = [];
    const attConfigs = [
      { y: 0.95 },
      { y: 0.42 },
      { y: -0.12 },
      { y: -0.62 },
    ];

    attConfigs.forEach(({ y }, sIdx) => {
      const r = THREE.MathUtils.lerp(0.64, 0.34, sIdx / 3);
      const count = 4;
      for (let i = 0; i < count; i++) {
        const ang = (i / count) * Math.PI * 2 + sIdx * 0.5 + 0.2;
        const x = Math.cos(ang) * r;
        const z = Math.sin(ang) * r;
        list.push({
          pos: [x, y - 0.075, z],
          rot: [0, ang, 0],
        });
      }
    });

    return list;
  }, []);

  // SMA Feedthrough bulkhead nuts on each stage
  const feedthroughs = useMemo(() => {
    const list: [number, number, number][] = [];
    const bankAngles = [0.2, Math.PI * 0.5 + 0.2, Math.PI + 0.2, Math.PI * 1.5 + 0.2];

    stageY.forEach((y, sIdx) => {
      bankAngles.forEach((baseAng) => {
        for (let c = 0; c < 3; c++) {
          const offsetAng = baseAng + (c - 1) * 0.07;
          const r = THREE.MathUtils.lerp(0.66, 0.32, sIdx / (stageY.length - 1)) + c * 0.02;
          list.push([Math.cos(offsetAng) * r, y, Math.sin(offsetAng) * r]);
        }
      });
    });

    return list;
  }, []);

  // Smooth frame-by-frame opacity interpolation (no abrupt disappearance)
  useFrame(() => {
    const p = scrollProgress;
    let targetOpacity = 1.0;

    if (p >= 0.28 && p <= 0.74) {
      if (p < 0.36) {
        // Fade out smoothly entering Scene 3
        targetOpacity = 1.0 - (p - 0.28) / 0.08;
      } else if (p > 0.68) {
        // Fade back in leaving Scene 4
        targetOpacity = (p - 0.68) / 0.06;
      } else {
        targetOpacity = 0.0;
      }
    } else if (p > 0.74 && p < 0.84) {
      // Fade out for Scene 5 (Calibration Bloch sphere)
      targetOpacity = 0.0;
    } else if (p >= 0.84) {
      targetOpacity = Math.min(1.0, (p - 0.84) / 0.08);
    }

    currentOpacity.current = THREE.MathUtils.lerp(currentOpacity.current, targetOpacity, 0.08);
    const alpha = currentOpacity.current;

    if (groupRef.current) {
      groupRef.current.visible = alpha > 0.008;
    }

    materials.goldCoax.opacity = alpha;
    materials.silverCoax.opacity = alpha;
    materials.attenuatorBody.opacity = alpha;
    materials.smaConnector.opacity = alpha;
    materials.bracket.opacity = alpha;
    materials.labelBand.opacity = alpha;
  });

  return (
    <group ref={groupRef}>
      {/* 1. Coaxial Transmission Cables with Stress-Relief Loops */}
      {cableBanks.map((bank, bIdx) =>
        bank.map((cable, cIdx) => (
          <mesh
            key={`cable-${bIdx}-${cIdx}`}
            geometry={cableGeometries[bIdx][cIdx]}
            material={cable.isGold ? materials.goldCoax : materials.silverCoax}
          />
        ))
      )}

      {/* 2. SMA Bulkhead Hex Nuts Clamping Cables at Each Stage */}
      {feedthroughs.map(([x, y, z], fIdx) => (
        <group key={`feed-${fIdx}`} position={[x, y + 0.02, z]}>
          <mesh>
            <cylinderGeometry args={[0.011, 0.011, 0.016, 6]} />
            <primitive object={materials.smaConnector} attach="material" />
          </mesh>
        </group>
      ))}

      {/* 3. Cryogenic RF Attenuator Canisters with Knurled Rings & Laser Labels */}
      {attenuators.map((att, aIdx) => (
        <group key={`att-${aIdx}`} position={att.pos} rotation={att.rot}>
          {/* Main Attenuator Cylindrical Body */}
          <mesh>
            <cylinderGeometry args={[0.016, 0.016, 0.08, 16]} />
            <primitive object={materials.attenuatorBody} attach="material" />
          </mesh>

          {/* Top Brass SMA Coupling Nut */}
          <mesh position={[0, 0.045, 0]}>
            <cylinderGeometry args={[0.013, 0.013, 0.018, 6]} />
            <primitive object={materials.smaConnector} attach="material" />
          </mesh>

          {/* Bottom Brass SMA Coupling Nut */}
          <mesh position={[0, -0.045, 0]}>
            <cylinderGeometry args={[0.013, 0.013, 0.018, 6]} />
            <primitive object={materials.smaConnector} attach="material" />
          </mesh>

          {/* Laser-Etched Identification Collar */}
          <mesh position={[0, 0, 0]}>
            <cylinderGeometry args={[0.0165, 0.0165, 0.02, 16]} />
            <primitive object={materials.labelBand} attach="material" />
          </mesh>
        </group>
      ))}
    </group>
  );
}
