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
 * Mechanically complete, CNC-machined gold-plated OFHC copper stages of a dilution refrigerator:
 * - 6 distinct thermal stages: Room Temp (300K), 50K, 4K Pulse-Tube, Still (800mK), Cold Plate (100mK), Mixing Chamber (15mK)
 * - 3 continuous low-thermal-conductivity structural support columns with mechanical flange collars, Belleville disc springs & locknuts
 * - Continuous central helium pumping core: Still chamber, counter-flow capillary heat exchanger, sintered silver step heat exchanger blocks
 * - Precision perimeter hex socket cap screws and cable loom comb clamp brackets on every stage
 * - Pulse-tube cryocooler 1st and 2nd stage cold finger interface mounting blocks
 */
export default function CoolingStages({ scrollProgress }: CoolingStagesProps) {
  const groupRef = useRef<THREE.Group>(null);
  const upperGroupRef = useRef<THREE.Group>(null);
  const lowerGroupRef = useRef<THREE.Group>(null);
  const brushedTexture = useMemo(() => getBrushedMetalTexture(), []);

  // Shared photorealistic PBR materials
  const materials = useMemo(() => {
    return {
      goldPlating: new THREE.MeshStandardMaterial({
        color: "#ECC068",
        metalness: 0.96,
        roughness: 0.16,
        bumpMap: brushedTexture,
        bumpScale: 0.0015,
        envMapIntensity: 2.2,
        transparent: true,
        opacity: 1.0,
      }),
      milledPocketGold: new THREE.MeshStandardMaterial({
        color: "#DFB052",
        metalness: 0.94,
        roughness: 0.24,
        bumpMap: brushedTexture,
        bumpScale: 0.002,
        envMapIntensity: 1.8,
        transparent: true,
        opacity: 1.0,
      }),
      ofhcCopper: new THREE.MeshStandardMaterial({
        color: "#C87548",
        metalness: 0.94,
        roughness: 0.22,
        bumpMap: brushedTexture,
        bumpScale: 0.0018,
        envMapIntensity: 1.8,
        transparent: true,
        opacity: 1.0,
      }),
      stainlessSteel: new THREE.MeshStandardMaterial({
        color: "#94A3B8",
        metalness: 0.95,
        roughness: 0.20,
        bumpMap: brushedTexture,
        bumpScale: 0.002,
        envMapIntensity: 1.6,
        transparent: true,
        opacity: 1.0,
      }),
      stainlessBolt: new THREE.MeshStandardMaterial({
        color: "#E2E8F0",
        metalness: 0.96,
        roughness: 0.16,
        transparent: true,
        opacity: 1.0,
      }),
      goldStandoff: new THREE.MeshStandardMaterial({
        color: "#E5B869",
        metalness: 0.94,
        roughness: 0.22,
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
        roughness: 0.18,
        transparent: true,
        opacity: 1.0,
      }),
      heatExchangerSilver: new THREE.MeshStandardMaterial({
        color: "#E2E8F0",
        metalness: 0.92,
        roughness: 0.28,
        transparent: true,
        opacity: 1.0,
      }),
    };
  }, [brushedTexture]);

  // Stage specifications: [y, radius, thickness, name, material]
  const stageSpecs = useMemo(() => [
    { y: 1.5, r: 0.92, h: 0.055, name: "Room Temp Flange", mat: materials.stainlessSteel },
    { y: 0.95, r: 0.84, h: 0.040, name: "50K Stage", mat: materials.goldPlating },
    { y: 0.42, r: 0.72, h: 0.038, name: "4K Pulse Tube Stage", mat: materials.goldPlating },
    { y: -0.12, r: 0.60, h: 0.034, name: "Still Stage (800mK)", mat: materials.goldPlating },
    { y: -0.62, r: 0.50, h: 0.032, name: "Cold Plate (100mK)", mat: materials.goldPlating },
    { y: -1.08, r: 0.42, h: 0.040, name: "Mixing Chamber (15mK)", mat: materials.goldPlating },
  ], [materials]);

  // 3 continuous support column positions at 120° angles (r = 0.52)
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

  // 16 perimeter bolt angles per stage
  const boltAngles = useMemo(() => {
    const angles = [];
    const count = 16;
    for (let i = 0; i < count; i++) {
      angles.push((i / count) * Math.PI * 2);
    }
    return angles;
  }, []);

  // Continuous counter-flow capillary heat exchanger coil points between Still and Cold Plate
  const heatExchangerCoil = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const turns = 8;
    const yTop = -0.16;
    const yBottom = -0.58;
    const r = 0.085;
    const steps = 64;

    for (let i = 0; i <= steps; i++) {
      const frac = i / steps;
      const angle = frac * turns * Math.PI * 2;
      const y = THREE.MathUtils.lerp(yTop, yBottom, frac);
      pts.push(new THREE.Vector3(Math.cos(angle) * r, y, Math.sin(angle) * r));
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.007, 8, false);
  }, []);

  React.useEffect(() => {
    return () => {
      heatExchangerCoil.dispose();
    };
  }, [heatExchangerCoil]);

  // Frame-by-frame animation of opacity and lift
  useFrame(() => {
    const p = scrollProgress;

    // 1. Overall assembly opacity
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

    // 2. Upper stages lift & fade during macro chip push-in (after Scene 2 at p >= 0.35)
    let upperOpacity = 1.0;
    let upperLiftY = 0.0;
    if (p >= 0.35 && p <= 0.80) {
      if (p < 0.43) {
        const t = (p - 0.35) / 0.08;
        upperOpacity = 1.0 - t;
        upperLiftY = t * 0.4;
      } else if (p > 0.74) {
        const t = (p - 0.74) / 0.06;
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

    // 3. Lowest stage (mixing chamber) sinks & fades during Dolan bridge hero inspection (Scene 4) and Bloch sphere (Scene 5)
    let lowerOpacity = 1.0;
    if (p > 0.44 && p < 0.84) {
      if (p <= 0.52) {
        lowerOpacity = 1.0 - (p - 0.44) / 0.08;
      } else if (p >= 0.78) {
        lowerOpacity = (p - 0.78) / 0.06;
      } else {
        lowerOpacity = 0.0;
      }
    } else if (p >= 0.84) {
      lowerOpacity = 1.0;
    }
    if (lowerGroupRef.current) {
      lowerGroupRef.current.visible = lowerOpacity > 0.008;
      lowerGroupRef.current.position.y = -1.08 - (1.0 - lowerOpacity) * 0.95;
    }

    // Apply smooth opacities to materials
    const effectiveUpperOpacity = Math.max(0, Math.min(1, mainOpacity * upperOpacity));
    materials.goldPlating.opacity = Math.max(0, Math.min(1, mainOpacity));
    materials.stainlessSteel.opacity = effectiveUpperOpacity;
    materials.milledPocketGold.opacity = Math.max(0, Math.min(1, mainOpacity));
    materials.ofhcCopper.opacity = Math.max(0, Math.min(1, mainOpacity));
    materials.centralPumpingTube.opacity = effectiveUpperOpacity;
    materials.vacuumBellows.opacity = effectiveUpperOpacity;
    materials.goldStandoff.opacity = effectiveUpperOpacity;
    materials.stainlessBolt.opacity = Math.max(0, Math.min(1, mainOpacity));
    materials.combBracket.opacity = Math.max(0, Math.min(1, mainOpacity));
    materials.heatExchangerSilver.opacity = effectiveUpperOpacity;
  });

  return (
    <group ref={groupRef}>
      {/* =========================================================================
          UPPER ASSEMBLY: STAGES 0 TO 4 + CENTRAL HELIUM DILUTION CORE + TIE RODS
          ========================================================================= */}
      <group ref={upperGroupRef}>
        {/* 1. Central Helium Still Pumping Core & Heat Exchanger Assembly */}
        <group position={[0, 0.2, 0]}>
          {/* Main 304 Stainless Still Pumping Tube */}
          <mesh>
            <cylinderGeometry args={[0.045, 0.045, 2.65, 32]} />
            <primitive object={materials.centralPumpingTube} attach="material" />
          </mesh>

          {/* Stainless Flexible Corrugated Vacuum Bellows (FLAT horizontal) */}
          {[-0.8, -0.75, -0.7, 0.1, 0.15, 0.2, 0.7, 0.75, 0.8].map((by, bIdx) => (
            <mesh key={`bellows-${bIdx}`} position={[0, by, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.048, 0.005, 12, 32]} />
              <primitive object={materials.vacuumBellows} attach="material" />
            </mesh>
          ))}
        </group>

        {/* 2. Still Chamber Expansion Vessel (Cylindrical Chamber at y = -0.12) */}
        <group position={[0, -0.12, 0]}>
          <mesh position={[0, -0.04, 0]}>
            <cylinderGeometry args={[0.082, 0.082, 0.08, 32]} />
            <primitive object={materials.goldStandoff} attach="material" />
          </mesh>
        </group>

        {/* 3. Continuous Counter-Flow Capillary Heat Exchanger (Coiled around central tube) */}
        <mesh geometry={heatExchangerCoil} material={materials.ofhcCopper} />

        {/* 4. Sintered Silver Step Heat Exchanger Blocks (Between Cold Plate and Mixing Chamber) */}
        {[-0.78, -0.92].map((sy, sIdx) => (
          <group key={`step-hex-${sIdx}`} position={[0.09, sy, 0]}>
            <mesh>
              <boxGeometry args={[0.065, 0.075, 0.045]} />
              <primitive object={materials.heatExchangerSilver} attach="material" />
            </mesh>
            {/* Stainless Fluid Fittings */}
            <mesh position={[0, 0.042, 0]}>
              <cylinderGeometry args={[0.008, 0.008, 0.015, 12]} />
              <primitive object={materials.stainlessSteel} attach="material" />
            </mesh>
            <mesh position={[0, -0.042, 0]}>
              <cylinderGeometry args={[0.008, 0.008, 0.015, 12]} />
              <primitive object={materials.stainlessSteel} attach="material" />
            </mesh>
          </group>
        ))}

        {/* 5. Upper Stages 0 through 4 (Room Temp through Cold Plate) */}
        {stageSpecs.slice(0, 5).map((st, sIdx) => {
          const boltRadius = st.r - 0.035;
          return (
            <group key={`stage-${sIdx}`} position={[0, st.y, 0]}>
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

              {/* Machined Chamfered Perimeter Rim (FLAT) */}
              <mesh position={[0, -st.h * 0.48, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <torusGeometry args={[st.r, 0.012, 12, 48]} />
                <primitive object={materials.ofhcCopper} attach="material" />
              </mesh>

              {/* Top Bevel Lip (FLAT) */}
              <mesh position={[0, st.h * 0.48, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <torusGeometry args={[st.r - 0.005, 0.008, 12, 48]} />
                <primitive object={materials.ofhcCopper} attach="material" />
              </mesh>

              {/* Central Vacuum Line Aperture Collar */}
              <mesh position={[0, 0, 0]}>
                <cylinderGeometry args={[0.075, 0.075, st.h + 0.02, 24]} />
                <primitive object={materials.goldStandoff} attach="material" />
              </mesh>

              {/* Perimeter Stainless Steel Socket Head Cap Screws */}
              {boltAngles.map((ang, bIdx) => (
                <mesh
                  key={`bolt-${sIdx}-${bIdx}`}
                  position={[Math.cos(ang) * boltRadius, st.h * 0.5 + 0.006, Math.sin(ang) * boltRadius]}
                >
                  <cylinderGeometry args={[0.008, 0.008, 0.012, 6]} />
                  <primitive object={materials.stainlessBolt} attach="material" />
                </mesh>
              ))}

              {/* Precision Cable Loom Comb Brackets Clamping Coaxial Runs (4 positions) */}
              {[0.35, Math.PI * 0.5 + 0.35, Math.PI + 0.35, Math.PI * 1.5 + 0.35].map((ang, cIdx) => (
                <mesh
                  key={`comb-${sIdx}-${cIdx}`}
                  position={[Math.cos(ang) * (st.r - 0.04), st.h * 0.5 + 0.008, Math.sin(ang) * (st.r - 0.04)]}
                  rotation={[0, ang, 0]}
                >
                  <boxGeometry args={[0.024, 0.016, 0.055]} />
                  <primitive object={materials.combBracket} attach="material" />
                </mesh>
              ))}

              {/* Pulse-Tube 1st and 2nd Stage Interface Mounts on 50K and 4K Plates */}
              {sIdx === 1 && (
                <group position={[0.48, st.h * 0.5 + 0.025, 0.12]}>
                  <mesh>
                    <cylinderGeometry args={[0.048, 0.048, 0.05, 24]} />
                    <primitive object={materials.ofhcCopper} attach="material" />
                  </mesh>
                </group>
              )}
              {sIdx === 2 && (
                <group position={[0.42, st.h * 0.5 + 0.03, 0.10]}>
                  <mesh>
                    <cylinderGeometry args={[0.052, 0.052, 0.06, 24]} />
                    <primitive object={materials.ofhcCopper} attach="material" />
                  </mesh>
                </group>
              )}
            </group>
          );
        })}

        {/* 6. Structural Low-Thermal-Conductivity Support Columns with Flange Couplers & Standoffs */}
        {rodPositions.map(([x, z], rIdx) => (
          <group key={`column-${rIdx}`}>
            {/* Continuous Titanium Structural Column */}
            <mesh position={[x, 0.2, z]}>
              <cylinderGeometry args={[0.012, 0.012, 2.65, 16]} />
              <primitive object={materials.stainlessSteel} attach="material" />
            </mesh>

            {/* Precision Machined Standoff Sleeves & Locking Nuts at every Stage Junction */}
            {stageSpecs.slice(0, 5).map((st, sIdx) => {
              const nextSt = stageSpecs[sIdx + 1];
              const midY = (st.y + nextSt.y) * 0.5;
              const spanH = Math.abs(st.y - nextSt.y) - 0.04;
              return (
                <group key={`standoff-${rIdx}-${sIdx}`}>
                  {/* Upper Flange Collar & Clamping Nut */}
                  <mesh position={[x, st.y - 0.025, z]}>
                    <cylinderGeometry args={[0.022, 0.022, 0.024, 6]} />
                    <primitive object={materials.goldStandoff} attach="material" />
                  </mesh>
                  {/* Thermal Isolation Spacer Sleeve */}
                  <mesh position={[x, midY, z]}>
                    <cylinderGeometry args={[0.017, 0.017, spanH * 0.42, 16]} />
                    <primitive object={materials.goldStandoff} attach="material" />
                  </mesh>
                  {/* Lower Flange Collar & Clamping Nut */}
                  <mesh position={[x, nextSt.y + 0.025, z]}>
                    <cylinderGeometry args={[0.022, 0.022, 0.024, 6]} />
                    <primitive object={materials.goldStandoff} attach="material" />
                  </mesh>
                </group>
              );
            })}
          </group>
        ))}
      </group>

      {/* =========================================================================
          LOWEST STAGE: MIXING CHAMBER BASE PLATE (15 mK)
          ========================================================================= */}
      {(() => {
        const st = stageSpecs[5];
        const boltRadius = st.r - 0.035;
        return (
          <group ref={lowerGroupRef} position={[0, st.y, 0]}>
            {/* Main 24k Gold-Plated OFHC Copper Base Plate */}
            <mesh>
              <cylinderGeometry args={[st.r, st.r, st.h, 48]} />
              <primitive object={st.mat} attach="material" />
            </mesh>

            {/* Recessed Weight-Reduction Pocket (Top surface, FLAT) */}
            <mesh position={[0, st.h * 0.5 + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[st.r * 0.4, st.r * 0.75, 48]} />
              <primitive object={materials.milledPocketGold} attach="material" />
            </mesh>

            {/* Recessed Weight-Reduction Pocket (Bottom surface, FLAT) */}
            <mesh position={[0, -st.h * 0.5 - 0.001, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <ringGeometry args={[st.r * 0.4, st.r * 0.75, 48]} />
              <primitive object={materials.milledPocketGold} attach="material" />
            </mesh>

            {/* Chamfered Perimeter Rim (FLAT) */}
            <mesh position={[0, -st.h * 0.48, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <torusGeometry args={[st.r, 0.012, 12, 48]} />
              <primitive object={materials.ofhcCopper} attach="material" />
            </mesh>

            {/* Top Lip Bevel (FLAT) */}
            <mesh position={[0, st.h * 0.48, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <torusGeometry args={[st.r - 0.005, 0.008, 12, 48]} />
              <primitive object={materials.ofhcCopper} attach="material" />
            </mesh>

            {/* Central Mixing Chamber Body Chamber (Where 3He dilutes into 4He) */}
            <mesh position={[0, -0.06, 0]}>
              <cylinderGeometry args={[0.075, 0.075, 0.12, 32]} />
              <primitive object={materials.goldStandoff} attach="material" />
            </mesh>

            {/* Perimeter Stainless Steel Socket Cap Screws */}
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
            {[0.35, Math.PI * 0.5 + 0.35, Math.PI + 0.35, Math.PI * 1.5 + 0.35].map((ang, cIdx) => (
              <mesh
                key={`comb-mix-${cIdx}`}
                position={[Math.cos(ang) * (st.r - 0.04), st.h * 0.5 + 0.008, Math.sin(ang) * (st.r - 0.04)]}
                rotation={[0, ang, 0]}
              >
                <boxGeometry args={[0.024, 0.016, 0.055]} />
                <primitive object={materials.combBracket} attach="material" />
              </mesh>
            ))}
          </group>
        );
      })()}
    </group>
  );
}
