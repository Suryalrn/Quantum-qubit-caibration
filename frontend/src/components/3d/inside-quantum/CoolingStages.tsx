"use client";

import React, { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { getBrushedMetalTexture } from "./proceduralTextures";

interface CoolingStagesProps {
  scrollProgress: number;
}

/**
 * CoolingStages:
 * Physically authentic, CNC-machined gold-plated OFHC copper stages of a dilution refrigerator:
 * - Room Temperature Flange (Titanium/304 Stainless with bolt ring)
 * - 50K Radiation Flange (Gold-plated copper with edge rim & CNC weight pockets)
 * - 4K Pulse-Tube Cold Plate (Gold-plated copper with mounting standoffs)
 * - Still Plate (~800 mK)
 * - Cold Plate (~100 mK)
 * - Mixing Chamber Base Plate (~15 mK, 24k mirror-plated)
 * - 3 polished titanium structural support rods with knurled gold standoffs and locking nuts
 * - 16 stainless steel perimeter hex bolts per stage
 * - Continuous central vacuum pumping core tube with corrugated flexible bellows
 * - Precision cable loom comb brackets clamping coaxial lines
 */
export default function CoolingStages({ scrollProgress }: CoolingStagesProps) {
  const groupRef = useRef<THREE.Group>(null);
  const upperGroupRef = useRef<THREE.Group>(null);
  const lowerGroupRef = useRef<THREE.Group>(null);
  const brushedTexture = useMemo(() => getBrushedMetalTexture(), []);

  // Shared PBR materials with realistic brushed metallic grain and smooth transparency support
  const materials = useMemo(() => {
    return {
      goldPlating: new THREE.MeshStandardMaterial({
        color: "#F3C77C",
        metalness: 0.96,
        roughness: 0.16,
        bumpMap: brushedTexture,
        bumpScale: 0.0015,
        envMapIntensity: 2.3,
        transparent: true,
        opacity: 1.0,
      }),
      milledPocketGold: new THREE.MeshStandardMaterial({
        color: "#E2B35B",
        metalness: 0.94,
        roughness: 0.26,
        bumpMap: brushedTexture,
        bumpScale: 0.002,
        envMapIntensity: 1.8,
        transparent: true,
        opacity: 1.0,
      }),
      ofhcCopper: new THREE.MeshStandardMaterial({
        color: "#D97736",
        metalness: 0.94,
        roughness: 0.22,
        bumpMap: brushedTexture,
        bumpScale: 0.0018,
        envMapIntensity: 1.8,
        transparent: true,
        opacity: 1.0,
      }),
      titaniumFlange: new THREE.MeshStandardMaterial({
        color: "#94A3B8",
        metalness: 0.95,
        roughness: 0.22,
        bumpMap: brushedTexture,
        bumpScale: 0.002,
        envMapIntensity: 1.6,
        transparent: true,
        opacity: 1.0,
      }),
      stainlessBolt: new THREE.MeshStandardMaterial({
        color: "#E2E8F0",
        metalness: 0.96,
        roughness: 0.18,
        transparent: true,
        opacity: 1.0,
      }),
      goldStandoff: new THREE.MeshStandardMaterial({
        color: "#E5B869",
        metalness: 0.92,
        roughness: 0.28,
        transparent: true,
        opacity: 1.0,
      }),
      centralPumpingTube: new THREE.MeshStandardMaterial({
        color: "#CBD5E1",
        metalness: 0.94,
        roughness: 0.15,
        transparent: true,
        opacity: 1.0,
      }),
      vacuumBellows: new THREE.MeshStandardMaterial({
        color: "#94A3B8",
        metalness: 0.92,
        roughness: 0.25,
        transparent: true,
        opacity: 1.0,
      }),
      combBracket: new THREE.MeshStandardMaterial({
        color: "#D4AF37",
        metalness: 0.95,
        roughness: 0.2,
        transparent: true,
        opacity: 1.0,
      }),
    };
  }, [brushedTexture]);

  // Physically proportioned stages: [y, radius, thickness, name, material]
  const stageSpecs = useMemo(() => [
    { y: 1.5, r: 0.92, h: 0.055, name: "Room Temp Flange", mat: materials.titaniumFlange },
    { y: 0.95, r: 0.84, h: 0.040, name: "50K Stage", mat: materials.goldPlating },
    { y: 0.42, r: 0.72, h: 0.038, name: "4K Pulse Tube Stage", mat: materials.goldPlating },
    { y: -0.12, r: 0.60, h: 0.034, name: "Still Stage (800mK)", mat: materials.goldPlating },
    { y: -0.62, r: 0.50, h: 0.032, name: "Cold Plate (100mK)", mat: materials.goldPlating },
    { y: -1.08, r: 0.42, h: 0.040, name: "Mixing Chamber (15mK)", mat: materials.goldPlating },
  ], [materials]);

  // Support rod standoffs (3 vertical rods at 120° angles)
  const rodPositions = useMemo(() => {
    const rods: [number, number][] = [];
    const count = 3;
    const r = 0.52;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + 0.35;
      rods.push([Math.cos(angle) * r, Math.sin(angle) * r]);
    }
    return rods;
  }, []);

  // Perimeter bolt offsets (16 bolts per stage)
  const boltAngles = useMemo(() => {
    const angles = [];
    const count = 16;
    for (let i = 0; i < count; i++) {
      angles.push((i / count) * Math.PI * 2);
    }
    return angles;
  }, []);

  // Smooth frame-by-frame animation of opacity and lift
  useFrame(() => {
    const p = scrollProgress;

    // 1. Overall assembly opacity: hides during Scene 5 (Calibration Bloch sphere) with smooth crossfade
    let mainOpacity = 1.0;
    if (p >= 0.70 && p <= 0.86) {
      if (p < 0.76) {
        mainOpacity = 1.0 - (p - 0.70) / 0.06;
      } else if (p > 0.80) {
        mainOpacity = (p - 0.80) / 0.06;
      } else {
        mainOpacity = 0.0;
      }
    }

    if (groupRef.current) {
      groupRef.current.visible = mainOpacity > 0.01;
    }

    // 2. Upper 5 stages lift & fade during macro chip push-in (Scenes 3 & 4)
    let upperOpacity = 1.0;
    let upperLiftY = 0.0;
    if (p >= 0.28 && p <= 0.74) {
      if (p < 0.36) {
        const t = (p - 0.28) / 0.08;
        upperOpacity = 1.0 - t;
        upperLiftY = t * 0.4;
      } else if (p > 0.68) {
        const t = (p - 0.68) / 0.06;
        upperOpacity = t;
        upperLiftY = (1.0 - t) * 0.4;
      } else {
        upperOpacity = 0.0;
        upperLiftY = 0.4;
      }
    }

    if (upperGroupRef.current) {
      upperGroupRef.current.position.y = THREE.MathUtils.lerp(upperGroupRef.current.position.y, upperLiftY, 0.08);
      upperGroupRef.current.visible = upperOpacity > 0.01;
    }

    // 3. Lowest stage (mixing chamber) fades out during microscopic Dolan bridge inspection (Scene 4) and Bloch sphere (Scene 5)
    let lowerOpacity = 1.0;
    if (p >= 0.52 && p <= 0.86) {
      if (p < 0.58) {
        lowerOpacity = 1.0 - (p - 0.52) / 0.06;
      } else if (p > 0.80) {
        lowerOpacity = (p - 0.80) / 0.06;
      } else {
        lowerOpacity = 0.0;
      }
    }
    if (lowerGroupRef.current) {
      lowerGroupRef.current.visible = lowerOpacity > 0.01;
    }

    // Apply smooth opacities to materials
    const effectiveOpacity = Math.max(0, Math.min(1, mainOpacity * upperOpacity));
    materials.goldPlating.opacity = Math.max(0, Math.min(1, mainOpacity));
    materials.titaniumFlange.opacity = effectiveOpacity;
    materials.milledPocketGold.opacity = Math.max(0, Math.min(1, mainOpacity));
    materials.ofhcCopper.opacity = Math.max(0, Math.min(1, mainOpacity));
    materials.centralPumpingTube.opacity = effectiveOpacity;
    materials.vacuumBellows.opacity = effectiveOpacity;
    materials.goldStandoff.opacity = effectiveOpacity;
    materials.stainlessBolt.opacity = Math.max(0, Math.min(1, mainOpacity));
    materials.combBracket.opacity = Math.max(0, Math.min(1, mainOpacity));
  });

  return (
    <group ref={groupRef}>
      {/* Upper Assembly: Stages 0 to 4 + Central Tube + Tie Rods */}
      <group ref={upperGroupRef}>
        {/* 1. Continuous Central Vacuum & Helium Pumping Core Tube with Corrugated Bellows */}
        <group position={[0, 0.2, 0]}>
          <mesh>
            <cylinderGeometry args={[0.045, 0.045, 2.7, 32]} />
            <primitive object={materials.centralPumpingTube} attach="material" />
          </mesh>

          {/* Stainless Steel Flexible Corrugated Vacuum Bellows Rings (ROTATED FLAT -Math.PI/2) */}
          {[-0.8, -0.75, -0.7, 0.1, 0.15, 0.2, 0.7, 0.75, 0.8].map((by, bIdx) => (
            <mesh key={`bellows-${bIdx}`} position={[0, by, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.047, 0.005, 12, 32]} />
              <primitive object={materials.vacuumBellows} attach="material" />
            </mesh>
          ))}
        </group>

        {/* 2. Upper Stages 0 through 4 (Room Temp through Cold Plate) */}
        {stageSpecs.slice(0, 5).map((st, sIdx) => {
          const boltRadius = st.r - 0.035;
          return (
            <group key={`stage-${sIdx}`} position={[0, st.y, 0]}>
              {/* Main Stage Disc */}
              <mesh>
                <cylinderGeometry args={[st.r, st.r, st.h, 48]} />
                <primitive object={st.mat} attach="material" />
              </mesh>

              {/* CNC Machined Weight-Reduction Recessed Pocket (Top surface, FLAT rotation) */}
              <mesh position={[0, st.h * 0.5 + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[st.r * 0.4, st.r * 0.75, 48]} />
                <primitive object={materials.milledPocketGold} attach="material" />
              </mesh>

              {/* CNC Machined Weight-Reduction Recessed Pocket (Bottom surface, FLAT rotation) */}
              <mesh position={[0, -st.h * 0.5 - 0.001, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <ringGeometry args={[st.r * 0.4, st.r * 0.75, 48]} />
                <primitive object={materials.milledPocketGold} attach="material" />
              </mesh>

              {/* Chamfered Copper Perimeter Rim (FLAT rotation) */}
              <mesh position={[0, -st.h * 0.48, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <torusGeometry args={[st.r, 0.012, 12, 48]} />
                <primitive object={materials.ofhcCopper} attach="material" />
              </mesh>

              {/* Top Lip Bevel (FLAT rotation) */}
              <mesh position={[0, st.h * 0.48, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <torusGeometry args={[st.r - 0.005, 0.008, 12, 48]} />
                <primitive object={materials.ofhcCopper} attach="material" />
              </mesh>

              {/* Central Vacuum Line Aperture Collar */}
              <mesh position={[0, 0, 0]}>
                <cylinderGeometry args={[0.075, 0.075, st.h + 0.02, 24]} />
                <primitive object={materials.goldStandoff} attach="material" />
              </mesh>

              {/* Perimeter Stainless Steel Hex Bolts */}
              {boltAngles.map((ang, bIdx) => (
                <mesh
                  key={`bolt-${sIdx}-${bIdx}`}
                  position={[Math.cos(ang) * boltRadius, st.h * 0.5 + 0.006, Math.sin(ang) * boltRadius]}
                >
                  <cylinderGeometry args={[0.008, 0.008, 0.012, 6]} />
                  <primitive object={materials.stainlessBolt} attach="material" />
                </mesh>
              ))}

              {/* Cable Loom Comb Brackets Clamping Coaxial Runs (4 positions) */}
              {[0.2, Math.PI * 0.5 + 0.2, Math.PI + 0.2, Math.PI * 1.5 + 0.2].map((ang, cIdx) => (
                <mesh
                  key={`comb-${sIdx}-${cIdx}`}
                  position={[Math.cos(ang) * (st.r - 0.04), st.h * 0.5 + 0.008, Math.sin(ang) * (st.r - 0.04)]}
                  rotation={[0, ang, 0]}
                >
                  <boxGeometry args={[0.025, 0.016, 0.06]} />
                  <primitive object={materials.combBracket} attach="material" />
                </mesh>
              ))}
            </group>
          );
        })}

        {/* 3. Structural Polished Titanium Tie-Rods with Knurled Gold Standoffs */}
        {rodPositions.map(([x, z], rIdx) => (
          <group key={`rod-${rIdx}`}>
            {/* Main Continuous Titanium Rod */}
            <mesh position={[x, 0.2, z]}>
              <cylinderGeometry args={[0.012, 0.012, 2.65, 16]} />
              <primitive object={materials.titaniumFlange} attach="material" />
            </mesh>

            {/* Knurled Gold Standoff Sleeves at every Stage Junction */}
            {stageSpecs.slice(0, 5).map((st, sIdx) => {
              const nextSt = stageSpecs[sIdx + 1];
              const midY = (st.y + nextSt.y) * 0.5;
              const spanH = Math.abs(st.y - nextSt.y) - 0.04;
              return (
                <group key={`standoff-${rIdx}-${sIdx}`}>
                  {/* Upper Mounting Nut */}
                  <mesh position={[x, st.y - 0.025, z]}>
                    <cylinderGeometry args={[0.022, 0.022, 0.025, 6]} />
                    <primitive object={materials.goldStandoff} attach="material" />
                  </mesh>
                  {/* Spacer Sleeve */}
                  <mesh position={[x, midY, z]}>
                    <cylinderGeometry args={[0.018, 0.018, spanH * 0.4, 16]} />
                    <primitive object={materials.goldStandoff} attach="material" />
                  </mesh>
                  {/* Lower Mounting Nut */}
                  <mesh position={[x, nextSt.y + 0.025, z]}>
                    <cylinderGeometry args={[0.022, 0.022, 0.025, 6]} />
                    <primitive object={materials.goldStandoff} attach="material" />
                  </mesh>
                </group>
              );
            })}
          </group>
        ))}
      </group>

      {/* 4. Lowest Stage: Mixing Chamber (15 mK Base Plate) - Always Anchored */}
      {(() => {
        const st = stageSpecs[5];
        const boltRadius = st.r - 0.035;
        return (
          <group ref={lowerGroupRef} position={[0, st.y, 0]}>
            {/* Main Stage Disc */}
            <mesh>
              <cylinderGeometry args={[st.r, st.r, st.h, 48]} />
              <primitive object={st.mat} attach="material" />
            </mesh>

            {/* CNC Machined Weight-Reduction Recessed Pocket (Top surface, FLAT) */}
            <mesh position={[0, st.h * 0.5 + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[st.r * 0.4, st.r * 0.75, 48]} />
              <primitive object={materials.milledPocketGold} attach="material" />
            </mesh>

            {/* CNC Machined Weight-Reduction Recessed Pocket (Bottom surface, FLAT) */}
            <mesh position={[0, -st.h * 0.5 - 0.001, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <ringGeometry args={[st.r * 0.4, st.r * 0.75, 48]} />
              <primitive object={materials.milledPocketGold} attach="material" />
            </mesh>

            {/* Chamfered Copper Perimeter Rim (FLAT) */}
            <mesh position={[0, -st.h * 0.48, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <torusGeometry args={[st.r, 0.012, 12, 48]} />
              <primitive object={materials.ofhcCopper} attach="material" />
            </mesh>

            {/* Top Lip Bevel (FLAT) */}
            <mesh position={[0, st.h * 0.48, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <torusGeometry args={[st.r - 0.005, 0.008, 12, 48]} />
              <primitive object={materials.ofhcCopper} attach="material" />
            </mesh>

            {/* Central Vacuum Line Aperture Collar */}
            <mesh position={[0, 0, 0]}>
              <cylinderGeometry args={[0.075, 0.075, st.h + 0.02, 24]} />
              <primitive object={materials.goldStandoff} attach="material" />
            </mesh>

            {/* Perimeter Stainless Steel Hex Bolts */}
            {boltAngles.map((ang, bIdx) => (
              <mesh
                key={`bolt-mix-${bIdx}`}
                position={[Math.cos(ang) * boltRadius, st.h * 0.5 + 0.006, Math.sin(ang) * boltRadius]}
              >
                <cylinderGeometry args={[0.008, 0.008, 0.012, 6]} />
                <primitive object={materials.stainlessBolt} attach="material" />
              </mesh>
            ))}

            {/* Cable Loom Comb Brackets Clamping Coaxial Runs */}
            {[0.2, Math.PI * 0.5 + 0.2, Math.PI + 0.2, Math.PI * 1.5 + 0.2].map((ang, cIdx) => (
              <mesh
                key={`comb-mix-${cIdx}`}
                position={[Math.cos(ang) * (st.r - 0.04), st.h * 0.5 + 0.008, Math.sin(ang) * (st.r - 0.04)]}
                rotation={[0, ang, 0]}
              >
                <boxGeometry args={[0.025, 0.016, 0.06]} />
                <primitive object={materials.combBracket} attach="material" />
              </mesh>
            ))}
          </group>
        );
      })()}
    </group>
  );
}
