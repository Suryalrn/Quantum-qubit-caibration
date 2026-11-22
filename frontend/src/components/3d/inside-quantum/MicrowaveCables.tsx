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
 * Scientifically authentic cryogenic microwave cabling assembly:
 * - 4 azimuthal banks of semi-rigid UT-085 gold/silver jacketed coaxial transmission lines
 * - Precision vertical stepped loomed runs through stage bulkhead feedthroughs
 * - Compact, tightly coiled helical strain-relief loops between 4K and Still stages
 * - No wild overshoots or unconstrained spline ballooning
 * - Cryogenic RF attenuators (-20dB, -10dB, -3dB) with brass SMA connector hardware
 */
export default function MicrowaveCables({ scrollProgress }: MicrowaveCablesProps) {
  const groupRef = useRef<THREE.Group>(null);
  const currentOpacity = useRef<number>(1.0);
  const brushedTexture = useMemo(() => getBrushedMetalTexture(), []);

  const materials = useMemo(() => {
    return {
      goldCoax: new THREE.MeshStandardMaterial({
        color: "#E5B869",
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
      labelBand: new THREE.MeshBasicMaterial({
        color: "#F8FAFC",
        transparent: true,
        opacity: 1.0,
      }),
    };
  }, [brushedTexture]);

  // Stage Y levels matching CoolingStages
  const stageY = useMemo(() => [1.5, 0.95, 0.42, -0.12, -0.62, -1.08], []);

  // Generate 4 loomed banks of 3 semi-rigid coaxial cables
  const { cableCurves, isGoldFlags } = useMemo(() => {
    const curves: THREE.CatmullRomCurve3[] = [];
    const goldFlags: boolean[] = [];
    const bankAngles = [0.35, Math.PI * 0.5 + 0.35, Math.PI + 0.35, Math.PI * 1.5 + 0.35];

    bankAngles.forEach((baseAng, bIdx) => {
      for (let c = 0; c < 3; c++) {
        const offsetAng = baseAng + (c - 1) * 0.055;
        const pts: THREE.Vector3[] = [];

        for (let s = 0; s < stageY.length; s++) {
          const y = stageY[s];
          // Progressive inward taper matching conical stage profile
          const r = THREE.MathUtils.lerp(0.64, 0.30, s / (stageY.length - 1)) + (c - 1) * 0.022;
          const x = Math.cos(offsetAng) * r;
          const z = Math.sin(offsetAng) * r;

          // Point above stage plate
          pts.push(new THREE.Vector3(x, y + 0.03, z));
          // Point below stage plate
          pts.push(new THREE.Vector3(x, y - 0.03, z));

          // Controlled compact helical strain-relief coil between 4K (s=2) and Still (s=3)
          if (s === 2) {
            const nextY = stageY[s + 1];
            const coilSteps = 6;
            for (let k = 1; k < coilSteps; k++) {
              const frac = k / coilSteps;
              const loopPhase = frac * Math.PI * 2;
              // Small radius helical loop (~2cm) strictly confined
              const dRadius = Math.sin(loopPhase) * 0.025;
              const dTang = Math.cos(loopPhase) * 0.022;
              const curR = r + dRadius;
              const curAng = offsetAng + dTang;
              const curY = THREE.MathUtils.lerp(y - 0.08, nextY + 0.08, frac);
              pts.push(new THREE.Vector3(Math.cos(curAng) * curR, curY, Math.sin(curAng) * curR));
            }
          }
        }

        // Centripetal Catmull-Rom prevents overshoot oscillations
        const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal", 0.5);
        curves.push(curve);
        goldFlags.push((bIdx + c) % 2 === 0);
      }
    });

    return { cableCurves: curves, isGoldFlags: goldFlags };
  }, [stageY]);

  // Pre-allocate TubeGeometries
  const cableGeometries = useMemo(() => {
    return cableCurves.map((curve) => new THREE.TubeGeometry(curve, 48, 0.0065, 8, false));
  }, [cableCurves]);

  React.useEffect(() => {
    return () => {
      cableGeometries.forEach((g) => g.dispose());
    };
  }, [cableGeometries]);

  // Attenuators mounted underneath stages
  const attenuators = useMemo(() => {
    const list: { pos: [number, number, number]; rot: [number, number, number] }[] = [];
    const attStages = [
      { y: 0.95, label: "-20dB" },
      { y: 0.42, label: "-20dB" },
      { y: -0.12, label: "-10dB" },
      { y: -0.62, label: "-3dB" },
    ];

    attStages.forEach(({ y }, sIdx) => {
      const r = THREE.MathUtils.lerp(0.62, 0.32, sIdx / 3);
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
          const r = THREE.MathUtils.lerp(0.64, 0.30, sIdx / (stageY.length - 1)) + (c - 1) * 0.022;
          list.push([Math.cos(offsetAng) * r, y, Math.sin(offsetAng) * r]);
        }
      });
    });

    return list;
  }, [stageY]);

  // Smooth frame-by-frame opacity interpolation
  useFrame(() => {
    const p = scrollProgress;
    let targetOpacity = 1.0;

    if (p >= 0.30 && p <= 0.72) {
      if (p < 0.38) {
        targetOpacity = 1.0 - (p - 0.30) / 0.08;
      } else if (p > 0.64) {
        targetOpacity = (p - 0.64) / 0.08;
      } else {
        targetOpacity = 0.0;
      }
    } else if (p > 0.72 && p < 0.86) {
      targetOpacity = 0.0;
    } else if (p >= 0.86) {
      targetOpacity = Math.min(1.0, (p - 0.86) / 0.08);
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
    materials.labelBand.opacity = alpha;
  });

  return (
    <group ref={groupRef}>
      {/* 1. Precision Semi-Rigid Coaxial Lines */}
      {cableGeometries.map((geo, idx) => (
        <mesh
          key={`cable-run-${idx}`}
          geometry={geo}
          material={isGoldFlags[idx] ? materials.goldCoax : materials.silverCoax}
        />
      ))}

      {/* 2. Hexagonal Brass SMA Bulkhead Nut Couplers */}
      {feedthroughs.map(([x, y, z], fIdx) => (
        <group key={`feed-${fIdx}`} position={[x, y + 0.015, z]}>
          <mesh>
            <cylinderGeometry args={[0.009, 0.009, 0.018, 6]} />
            <primitive object={materials.smaConnector} attach="material" />
          </mesh>
        </group>
      ))}

      {/* 3. Cryogenic RF Attenuators with Laser-Marked Identification */}
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
