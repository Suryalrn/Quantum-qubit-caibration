"use client";

import React, { useMemo } from "react";
import * as THREE from "three";
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
  const brushedTexture = useMemo(() => getBrushedMetalTexture(), []);

  // Shared PBR materials with realistic brushed metallic grain
  const materials = useMemo(() => {
    return {
      goldPlating: new THREE.MeshStandardMaterial({
        color: "#F3C77C",
        metalness: 0.96,
        roughness: 0.16,
        bumpMap: brushedTexture,
        bumpScale: 0.0015,
        envMapIntensity: 2.3,
      }),
      milledPocketGold: new THREE.MeshStandardMaterial({
        color: "#E2B35B",
        metalness: 0.94,
        roughness: 0.26,
        bumpMap: brushedTexture,
        bumpScale: 0.002,
        envMapIntensity: 1.8,
      }),
      ofhcCopper: new THREE.MeshStandardMaterial({
        color: "#D97736",
        metalness: 0.94,
        roughness: 0.22,
        bumpMap: brushedTexture,
        bumpScale: 0.0018,
        envMapIntensity: 1.8,
      }),
      titaniumFlange: new THREE.MeshStandardMaterial({
        color: "#94A3B8",
        metalness: 0.95,
        roughness: 0.22,
        bumpMap: brushedTexture,
        bumpScale: 0.002,
        envMapIntensity: 1.6,
      }),
      stainlessBolt: new THREE.MeshStandardMaterial({
        color: "#E2E8F0",
        metalness: 0.96,
        roughness: 0.18,
      }),
      goldStandoff: new THREE.MeshStandardMaterial({
        color: "#E5B869",
        metalness: 0.92,
        roughness: 0.28,
      }),
      centralPumpingTube: new THREE.MeshStandardMaterial({
        color: "#CBD5E1",
        metalness: 0.94,
        roughness: 0.15,
      }),
      vacuumBellows: new THREE.MeshStandardMaterial({
        color: "#94A3B8",
        metalness: 0.92,
        roughness: 0.25,
      }),
      combBracket: new THREE.MeshStandardMaterial({
        color: "#D4AF37",
        metalness: 0.95,
        roughness: 0.2,
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

  // Macro mode during Scenes 3 & 4 (hide upper 5 stages so they don't block the chip macro shot)
  const isMacroMode = scrollProgress >= 0.30 && scrollProgress <= 0.72;
  // Calibration mode during Scene 5 (hide all physical stages to showcase holographic Bloch sphere)
  const isCalibrationMode = scrollProgress > 0.72 && scrollProgress < 0.85;

  if (isCalibrationMode) return null;

  // Render only lowest stage (Mixing chamber) during macro chip scenes
  const visibleStages = isMacroMode ? [stageSpecs[5]] : stageSpecs;

  return (
    <group>
      {/* 1. Continuous Central Vacuum & Helium Pumping Core Tube with Corrugated Bellows */}
      {!isMacroMode && (
        <group position={[0, 0.2, 0]}>
          <mesh>
            <cylinderGeometry args={[0.045, 0.045, 2.7, 32]} />
            <primitive object={materials.centralPumpingTube} attach="material" />
          </mesh>

          {/* Stainless Steel Flexible Corrugated Vacuum Bellows Rings */}
          {[-0.8, -0.75, -0.7, 0.1, 0.15, 0.2, 0.7, 0.75, 0.8].map((by, bIdx) => (
            <mesh key={`bellows-${bIdx}`} position={[0, by, 0]}>
              <torusGeometry args={[0.047, 0.005, 12, 32]} />
              <primitive object={materials.vacuumBellows} attach="material" />
            </mesh>
          ))}
        </group>
      )}

      {/* 2. Precision Machined Stage Plates with CNC Milled Pockets, Outer Lips & Bolt Circles */}
      {visibleStages.map((st, sIdx) => {
        const boltRadius = st.r - 0.035;
        return (
          <group key={`stage-${sIdx}`} position={[0, st.y, 0]}>
            {/* Main Stage Disc */}
            <mesh>
              <cylinderGeometry args={[st.r, st.r, st.h, 48]} />
              <primitive object={st.mat} attach="material" />
            </mesh>

            {/* CNC Machined Weight-Reduction Recessed Pocket (Top surface) */}
            <mesh position={[0, st.h * 0.5 + 0.001, 0]}>
              <ringGeometry args={[st.r * 0.4, st.r * 0.75, 48]} />
              <primitive object={materials.milledPocketGold} attach="material" />
            </mesh>

            {/* CNC Machined Weight-Reduction Recessed Pocket (Bottom surface) */}
            <mesh position={[0, -st.h * 0.5 - 0.001, 0]} rotation={[Math.PI, 0, 0]}>
              <ringGeometry args={[st.r * 0.4, st.r * 0.75, 48]} />
              <primitive object={materials.milledPocketGold} attach="material" />
            </mesh>

            {/* Chamfered Copper Perimeter Rim */}
            <mesh position={[0, -st.h * 0.48, 0]}>
              <torusGeometry args={[st.r, 0.012, 12, 48]} />
              <primitive object={materials.ofhcCopper} attach="material" />
            </mesh>

            {/* Top Lip Bevel */}
            <mesh position={[0, st.h * 0.48, 0]}>
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

      {/* 3. Structural Polished Titanium Tie-Rods with Knurled Gold Standoffs (Full view only) */}
      {!isMacroMode &&
        rodPositions.map(([x, z], rIdx) => (
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
  );
}
