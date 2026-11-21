"use client";

import React, { useMemo, useRef } from "react";
import * as THREE from "three";

interface ChandelierProps {
  scrollProgress: number; // 0.0 to 1.0
}

/**
 * SCENE 01 & 02 & 06: Complete Dilution Refrigerator Chandelier
 * Accurately models the multi-stage cryogenic dilution refrigerator:
 * - Room Temp Top Flange (Stainless steel/titanium)
 * - 50K Stage (Gold-plated copper disc)
 * - 4K Stage (Pulse-tube cooled copper plate)
 * - Still Stage (~800 mK)
 * - Cold Plate (~100 mK)
 * - Mixing Chamber / Base Plate (15 mK cold stage)
 * - Helical coaxial RF wiring harnesses (Gold & Silver)
 * - Vacuum shield rings and attenuation cylinders
 * - Preserved in Scene 06 as the central master core of the network
 */
export default function Chandelier3D({ scrollProgress }: ChandelierProps) {
  const groupRef = useRef<THREE.Group>(null);

  // Material Palette (Gold-plated OFHC Copper, Titanium, Polished Silver)
  const materials = useMemo(() => {
    return {
      goldPlate: new THREE.MeshStandardMaterial({
        color: "#E5B869",
        metalness: 0.94,
        roughness: 0.18,
        envMapIntensity: 1.5,
      }),
      copper: new THREE.MeshStandardMaterial({
        color: "#C87548",
        metalness: 0.9,
        roughness: 0.25,
      }),
      titaniumRod: new THREE.MeshStandardMaterial({
        color: "#94A3B8",
        metalness: 0.95,
        roughness: 0.22,
      }),
      coaxGold: new THREE.MeshStandardMaterial({
        color: "#F3C77C",
        metalness: 0.92,
        roughness: 0.25,
      }),
      coaxSilver: new THREE.MeshStandardMaterial({
        color: "#CBD5E1",
        metalness: 0.94,
        roughness: 0.18,
      }),
      attenuator: new THREE.MeshStandardMaterial({
        color: "#475569",
        metalness: 0.85,
        roughness: 0.35,
      }),
      cryoGlow: new THREE.MeshBasicMaterial({
        color: "#06B6D4",
        transparent: true,
        opacity: 0.6,
      }),
    };
  }, []);

  // Structural stage plates data [y, radius, thickness, label]
  const stages = useMemo(() => [
    { y: 7.0, r: 4.8, h: 0.35, name: "50K Stage" },
    { y: 4.5, r: 4.2, h: 0.32, name: "4K Stage" },
    { y: 2.2, r: 3.6, h: 0.28, name: "Still Stage (800mK)" },
    { y: 0.2, r: 3.0, h: 0.25, name: "Cold Plate (100mK)" },
    { y: -1.8, r: 2.5, h: 0.28, name: "Mixing Chamber (15mK)" },
  ], []);

  // Helical coaxial microwave lines connecting the stages
  const coaxCurves = useMemo(() => {
    const curves: THREE.CatmullRomCurve3[] = [];
    const count = 14;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const pts: THREE.Vector3[] = [];
      const steps = 28;
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const y = THREE.MathUtils.lerp(7.0, -1.8, t);
        const r = THREE.MathUtils.lerp(3.8, 1.8, t) + Math.sin(t * Math.PI * 4 + i) * 0.12;
        const curAngle = angle + t * 2.5;
        pts.push(new THREE.Vector3(Math.cos(curAngle) * r, y, Math.sin(curAngle) * r));
      }
      curves.push(new THREE.CatmullRomCurve3(pts));
    }
    return curves;
  }, []);

  // Pre-generate and memoize TubeGeometries to eliminate per-render allocations
  const tubeGeometries = useMemo(() => {
    return coaxCurves.map((crv) => new THREE.TubeGeometry(crv, 40, 0.035, 8, false));
  }, [coaxCurves]);

  // Clean GPU geometries on unmount
  React.useEffect(() => {
    return () => {
      tubeGeometries.forEach((g) => g.dispose());
    };
  }, [tubeGeometries]);

  // Visibility logic:
  // Visible during Scenes 1 & 2 (0.0 to 0.52)
  // Soft fade during macro inspection of chip (0.52 to 0.84)
  // Re-appears in Scene 06 as the central master core of the network (0.84 to 1.0)
  const isScene1or2 = scrollProgress <= 0.54;
  const isScene6 = scrollProgress >= 0.84;
  const isVisible = isScene1or2 || isScene6;
  if (!isVisible) return null;

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* Top Mounting Plate / Room Temperature Flange */}
      <mesh position={[0, 8.8, 0]}>
        <cylinderGeometry args={[5.2, 5.2, 0.45, 48]} />
        <primitive object={materials.titaniumRod} attach="material" />
      </mesh>

      {/* Main Structural Titanium Support Struts */}
      {[0, 1, 2].map((idx) => {
        const ang = (idx / 3) * Math.PI * 2;
        const x = Math.cos(ang) * 3.4;
        const z = Math.sin(ang) * 3.4;
        return (
          <mesh key={`strut-${idx}`} position={[x, 3.0, z]}>
            <cylinderGeometry args={[0.08, 0.08, 10.5, 16]} />
            <primitive object={materials.titaniumRod} attach="material" />
          </mesh>
        );
      })}

      {/* Cryogenic Stage Plates (Gold-Plated Copper Discs) */}
      {stages.map((st, idx) => (
        <group key={`stage-${idx}`} position={[0, st.y, 0]}>
          <mesh>
            <cylinderGeometry args={[st.r, st.r, st.h, 48]} />
            <primitive object={materials.goldPlate} attach="material" />
          </mesh>

          {/* Under-plate perimeter gold lip */}
          <mesh position={[0, -st.h * 0.5, 0]}>
            <ringGeometry args={[st.r - 0.25, st.r, 36]} />
            <primitive object={materials.copper} attach="material" />
          </mesh>

          {/* Cryogenic Microwave Attenuators & Amplifier Blocks */}
          {[0, 1, 2, 3, 4].map((aIdx) => {
            const aAng = (aIdx / 5) * Math.PI * 2 + idx * 0.4;
            const ax = Math.cos(aAng) * (st.r * 0.65);
            const az = Math.sin(aAng) * (st.r * 0.65);
            return (
              <mesh key={`att-${idx}-${aIdx}`} position={[ax, -0.4, az]}>
                <cylinderGeometry args={[0.12, 0.12, 0.55, 16]} />
                <primitive object={materials.attenuator} attach="material" />
              </mesh>
            );
          })}
        </group>
      ))}

      {/* Spiraling Coaxial RF Transmission Cables (Using pre-allocated geometries) */}
      {tubeGeometries.map((geo, cIdx) => (
        <mesh
          key={`coax-${cIdx}`}
          geometry={geo}
          material={cIdx % 2 === 0 ? materials.coaxGold : materials.coaxSilver}
        />
      ))}

      {/* Central Vacuum Cold-Finger / Cryo-Canister Shield at Base */}
      <mesh position={[0, -3.2, 0]}>
        <cylinderGeometry args={[1.6, 1.6, 2.4, 36, 1, true]} />
        <meshStandardMaterial
          color="#06B6D4"
          metalness={0.9}
          roughness={0.2}
          transparent
          opacity={0.35}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Subtle Cryo Lighting Highlights */}
      <pointLight position={[0, -1.8, 0]} intensity={2.0} color="#6366F1" distance={8} />
      <pointLight position={[0, 4.0, 0]} intensity={1.5} color="#06B6D4" distance={10} />
    </group>
  );
}
