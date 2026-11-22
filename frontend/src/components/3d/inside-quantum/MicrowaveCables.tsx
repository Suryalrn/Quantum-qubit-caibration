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
 * Continuous, fully connected cryogenic microwave transmission network:
 * - 4 azimuthal banks of semi-rigid UT-085 copper & silver-jacketed coaxial transmission lines
 * - Complete, unbroken paths originating at room-temperature hermetic SMA vacuum feedthroughs
 * - Precision vertical loomed runs passing through stage bulkhead clamping nuts
 * - Compact helical strain-relief coils between 4K and Still stages
 * - Cryogenic RF attenuators (-20dB, -10dB, -3dB) mounted underneath each thermal stage
 * - Continuous lines terminating directly into the 16 SMP RF launchers on the processor chip carrier
 * - Superconducting NbTi readout output lines connecting to 4K cryogenic HEMT amplifiers & circulators
 */
export default function MicrowaveCables({ scrollProgress }: MicrowaveCablesProps) {
  const groupRef = useRef<THREE.Group>(null);
  const currentOpacity = useRef<number>(1.0);
  const brushedTexture = useMemo(() => getBrushedMetalTexture(), []);

  // Shared photorealistic PBR materials
  const materials = useMemo(() => {
    return {
      goldCoax: new THREE.MeshStandardMaterial({
        color: "#ECC068",
        metalness: 0.96,
        roughness: 0.16,
        envMapIntensity: 2.2,
        transparent: true,
        opacity: 1.0,
      }),
      silverCoax: new THREE.MeshStandardMaterial({
        color: "#CBD5E1",
        metalness: 0.96,
        roughness: 0.15,
        envMapIntensity: 2.0,
        transparent: true,
        opacity: 1.0,
      }),
      superconductingNbTi: new THREE.MeshStandardMaterial({
        color: "#64748B",
        metalness: 0.94,
        roughness: 0.20,
        transparent: true,
        opacity: 1.0,
      }),
      attenuatorBody: new THREE.MeshStandardMaterial({
        color: "#475569",
        metalness: 0.88,
        roughness: 0.30,
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
      labelBand: new THREE.MeshBasicMaterial({
        color: "#F8FAFC",
        transparent: true,
        opacity: 1.0,
      }),
    };
  }, [brushedTexture]);

  // Stage Y levels matching CoolingStages
  const stageY = useMemo(() => [1.5, 0.95, 0.42, -0.12, -0.62, -1.08], []);

  // Generate 4 loomed banks of 3 semi-rigid coaxial cables connecting all the way to the chip carrier launchers
  const { cableCurves, isGoldFlags, readoutCurves } = useMemo(() => {
    const curves: THREE.CatmullRomCurve3[] = [];
    const goldFlags: boolean[] = [];
    const bankAngles = [0.35, Math.PI * 0.5 + 0.35, Math.PI + 0.35, Math.PI * 1.5 + 0.35];

    // SMP launcher target offsets on the chip package (centered at [0, -1.35, 0] in local coords)
    const chipY = -1.35;

    bankAngles.forEach((baseAng, bIdx) => {
      for (let c = 0; c < 3; c++) {
        const offsetAng = baseAng + (c - 1) * 0.055;
        const pts: THREE.Vector3[] = [];

        // 1. Start at Room Temp Flange hermetic feedthrough (y = 1.5)
        const topR = 0.65 + (c - 1) * 0.022;
        pts.push(new THREE.Vector3(Math.cos(offsetAng) * topR, stageY[0] + 0.04, Math.sin(offsetAng) * topR));

        // 2. Route down through each intermediate cryogenic stage
        for (let s = 0; s < stageY.length; s++) {
          const y = stageY[s];
          const r = THREE.MathUtils.lerp(0.65, 0.30, s / (stageY.length - 1)) + (c - 1) * 0.020;
          const x = Math.cos(offsetAng) * r;
          const z = Math.sin(offsetAng) * r;

          // Point above stage plate
          pts.push(new THREE.Vector3(x, y + 0.025, z));
          // Point below stage plate
          pts.push(new THREE.Vector3(x, y - 0.025, z));

          // Controlled compact helical strain-relief coil between 4K (s=2) and Still (s=3)
          if (s === 2) {
            const nextY = stageY[s + 1];
            const coilSteps = 6;
            for (let k = 1; k < coilSteps; k++) {
              const frac = k / coilSteps;
              const loopPhase = frac * Math.PI * 2;
              const dRadius = Math.sin(loopPhase) * 0.022;
              const dTang = Math.cos(loopPhase) * 0.020;
              const curR = r + dRadius;
              const curAng = offsetAng + dTang;
              const curY = THREE.MathUtils.lerp(y - 0.07, nextY + 0.07, frac);
              pts.push(new THREE.Vector3(Math.cos(curAng) * curR, curY, Math.sin(curAng) * curR));
            }
          }
        }

        // 3. Continuous termination into the chip carrier SMP launchers at y = -1.35
        const launcherR = 0.22 + c * 0.04;
        const launcherX = Math.cos(offsetAng) * launcherR;
        const launcherZ = Math.sin(offsetAng) * launcherR;
        // Mid-approach curve
        pts.push(new THREE.Vector3(launcherX * 1.15, chipY + 0.08, launcherZ * 1.15));
        // Mating connector at chip launcher
        pts.push(new THREE.Vector3(launcherX, chipY + 0.02, launcherZ));

        const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal", 0.5);
        curves.push(curve);
        goldFlags.push((bIdx + c) % 2 === 0);
      }
    });

    // 2 Readout Output Coaxial Lines (NbTi Superconducting coaxial lines connecting chip to HEMT)
    const rOutCurves: THREE.CatmullRomCurve3[] = [];
    [-0.15, 0.15].map((xOffset) => {
      const pts = [
        new THREE.Vector3(xOffset, chipY + 0.02, -0.18),
        new THREE.Vector3(xOffset * 1.2, -1.08, -0.22),
        new THREE.Vector3(xOffset * 1.4, -0.62, -0.25),
        new THREE.Vector3(xOffset * 1.6, -0.12, -0.30),
        new THREE.Vector3(xOffset * 1.8, 0.22, -0.32), // Circulator port
        new THREE.Vector3(xOffset * 1.8, 0.42, -0.35), // 4K HEMT amplifier input
        new THREE.Vector3(xOffset * 1.8, 0.95, -0.38),
        new THREE.Vector3(xOffset * 1.8, 1.54, -0.40), // Room temp output
      ];
      rOutCurves.push(new THREE.CatmullRomCurve3(pts, false, "centripetal", 0.5));
    });

    return { cableCurves: curves, isGoldFlags: goldFlags, readoutCurves: rOutCurves };
  }, [stageY]);

  // Pre-allocate TubeGeometries for high performance
  const cableGeometries = useMemo(() => {
    return cableCurves.map((curve) => new THREE.TubeGeometry(curve, 54, 0.0065, 8, false));
  }, [cableCurves]);

  const readoutGeometries = useMemo(() => {
    return readoutCurves.map((curve) => new THREE.TubeGeometry(curve, 48, 0.007, 8, false));
  }, [readoutCurves]);

  React.useEffect(() => {
    return () => {
      cableGeometries.forEach((g) => g.dispose());
      readoutGeometries.forEach((g) => g.dispose());
    };
  }, [cableGeometries, readoutGeometries]);

  // Attenuators mounted underneath stages
  const attenuators = useMemo(() => {
    const list: { pos: [number, number, number]; rot: [number, number, number] }[] = [];
    const attStages = [
      { y: 0.95, label: "-20dB" },
      { y: 0.42, label: "-20dB" },
      { y: -0.12, label: "-10dB" },
      { y: -0.62, label: "-3dB" },
      { y: -1.08, label: "-20dB" },
    ];

    attStages.forEach(({ y }, sIdx) => {
      const r = THREE.MathUtils.lerp(0.62, 0.30, sIdx / 4);
      const count = 4;
      for (let i = 0; i < count; i++) {
        const ang = (i / count) * Math.PI * 2 + sIdx * 0.4 + 0.35;
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

  // SMA Bulkhead nuts on each stage plate
  const feedthroughs = useMemo(() => {
    const list: [number, number, number][] = [];
    const bankAngles = [0.35, Math.PI * 0.5 + 0.35, Math.PI + 0.35, Math.PI * 1.5 + 0.35];

    stageY.forEach((y, sIdx) => {
      bankAngles.forEach((baseAng) => {
        for (let c = 0; c < 3; c++) {
          const offsetAng = baseAng + (c - 1) * 0.055;
          const r = THREE.MathUtils.lerp(0.65, 0.30, sIdx / (stageY.length - 1)) + (c - 1) * 0.020;
          list.push([Math.cos(offsetAng) * r, y, Math.sin(offsetAng) * r]);
        }
      });
    });

    return list;
  }, [stageY]);

  // Frame-by-frame opacity interpolation:
  // Fully visible in Scene 1, 2, and 3 (p <= 0.46)
  // Fades out between 0.46 and 0.54 as camera zooms into microscopic Dolan bridge
  // Fades back in at p >= 0.84 for full network reveal
  useFrame(() => {
    const p = scrollProgress;
    let targetOpacity = 1.0;

    if (p > 0.46 && p < 0.84) {
      if (p <= 0.54) {
        targetOpacity = 1.0 - (p - 0.46) / 0.08;
      } else if (p >= 0.78) {
        targetOpacity = (p - 0.78) / 0.06;
      } else {
        targetOpacity = 0.0;
      }
    } else if (p >= 0.84) {
      targetOpacity = 1.0;
    }

    currentOpacity.current = THREE.MathUtils.lerp(currentOpacity.current, targetOpacity, 0.08);
    const alpha = currentOpacity.current;

    if (groupRef.current) {
      groupRef.current.visible = alpha > 0.008;
    }

    materials.goldCoax.opacity = alpha;
    materials.silverCoax.opacity = alpha;
    materials.superconductingNbTi.opacity = alpha;
    materials.attenuatorBody.opacity = alpha;
    materials.smaConnector.opacity = alpha;
    materials.labelBand.opacity = alpha;
  });

  return (
    <group ref={groupRef}>
      {/* 1. Precision Semi-Rigid Coaxial Lines (Drive Lines) */}
      {cableGeometries.map((geo, idx) => (
        <mesh
          key={`cable-run-${idx}`}
          geometry={geo}
          material={isGoldFlags[idx] ? materials.goldCoax : materials.silverCoax}
        />
      ))}

      {/* 2. Superconducting NbTi Readout Lines (Output Path) */}
      {readoutGeometries.map((geo, idx) => (
        <mesh
          key={`readout-run-${idx}`}
          geometry={geo}
          material={materials.superconductingNbTi}
        />
      ))}

      {/* 3. Hexagonal Brass SMA Bulkhead Nut Couplers */}
      {feedthroughs.map(([x, y, z], fIdx) => (
        <group key={`feed-${fIdx}`} position={[x, y + 0.015, z]}>
          <mesh>
            <cylinderGeometry args={[0.009, 0.009, 0.018, 6]} />
            <primitive object={materials.smaConnector} attach="material" />
          </mesh>
        </group>
      ))}

      {/* 4. Cryogenic RF Attenuators with Laser-Marked Identification */}
      {attenuators.map((att, aIdx) => (
        <group key={`att-${aIdx}`} position={att.pos} rotation={att.rot}>
          {/* Main Attenuator Cylindrical Body */}
          <mesh>
            <cylinderGeometry args={[0.014, 0.014, 0.08, 16]} />
            <primitive object={materials.attenuatorBody} attach="material" />
          </mesh>

          {/* Top SMA Connector */}
          <mesh position={[0, 0.045, 0]}>
            <cylinderGeometry args={[0.011, 0.011, 0.016, 6]} />
            <primitive object={materials.smaConnector} attach="material" />
          </mesh>

          {/* Bottom SMA Connector */}
          <mesh position={[0, -0.045, 0]}>
            <cylinderGeometry args={[0.011, 0.011, 0.016, 6]} />
            <primitive object={materials.smaConnector} attach="material" />
          </mesh>

          {/* Center Laser-Etched Identification Ring */}
          <mesh position={[0, 0, 0]}>
            <cylinderGeometry args={[0.0145, 0.0145, 0.018, 16]} />
            <primitive object={materials.labelBand} attach="material" />
          </mesh>
        </group>
      ))}
    </group>
  );
}
