"use client";

import React, { useMemo } from "react";
import * as THREE from "three";

interface MicrowaveCablesProps {
  scrollProgress: number;
}

/**
 * MicrowaveCables:
 * Organised cryogenic microwave cabling architecture:
 * - 4 banks of semi-rigid UT-85 gold-jacketed & silver-jacketed coaxial transmission lines
 * - Precision vertical loomed runs passing through stage feedthrough brackets
 * - Centripetal spline interpolation preventing any wild loops or intersecting lines
 * - Cryogenic RF attenuators (-20dB, -10dB, -3dB) with gold SMA connector hardware
 */
export default function MicrowaveCables({ scrollProgress }: MicrowaveCablesProps) {
  const materials = useMemo(() => {
    return {
      goldCoax: new THREE.MeshStandardMaterial({
        color: "#F3C77C",
        metalness: 0.96,
        roughness: 0.16,
        envMapIntensity: 2.2,
      }),
      silverCoax: new THREE.MeshStandardMaterial({
        color: "#CBD5E1",
        metalness: 0.96,
        roughness: 0.15,
        envMapIntensity: 2.0,
      }),
      attenuatorBody: new THREE.MeshStandardMaterial({
        color: "#475569",
        metalness: 0.88,
        roughness: 0.3,
        envMapIntensity: 1.5,
      }),
      smaConnector: new THREE.MeshStandardMaterial({
        color: "#D4AF37",
        metalness: 0.96,
        roughness: 0.2,
      }),
      bracket: new THREE.MeshStandardMaterial({
        color: "#94A3B8",
        metalness: 0.85,
        roughness: 0.35,
      }),
      labelBand: new THREE.MeshBasicMaterial({
        color: "#F8FAFC",
      }),
    };
  }, []);

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

          // Top of stage
          pts.push(new THREE.Vector3(x, y + 0.025, z));
          // Bottom of stage
          pts.push(new THREE.Vector3(x, y - 0.025, z));
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
      bank.map((c) => new THREE.TubeGeometry(c.curve, 32, 0.0075, 8, false))
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

  // Visible during Scene 1, 2, and in wide network reveal Scene 6
  // Hidden during macro chip inspection (Scene 3 & 4) and calibration (Scene 5)
  const isVisible = scrollProgress <= 0.30 || scrollProgress >= 0.84;
  if (!isVisible) return null;

  return (
    <group>
      {/* 1. Coaxial Transmission Cables */}
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
