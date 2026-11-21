"use client";

import React, { useMemo, useRef } from "react";
import * as THREE from "three";
import { getSiliconDieTexture, getBrushedMetalTexture } from "./proceduralTextures";

interface ProcessorChipProps {
  scrollProgress: number;
}

/**
 * ProcessorChip (Scene 03):
 * Photorealistic macro representation of the superconducting quantum chip package:
 * - High-resistivity silicon die with polished deep-slate mirror luster & procedural micro-lithography
 * - Thin-film niobium superconducting coplanar waveguide (CPW) transmission traces
 * - 48 radial catenary pure gold wire bonds with wedge bond termination feet
 * - 24k gold-plated perimeter RF shielding frame with precision Allen screws
 * - Ceramic Rogers RO4003 substrate package with microstrip traces & SMP RF launchers
 */
export default function ProcessorChip({ scrollProgress }: ProcessorChipProps) {
  const groupRef = useRef<THREE.Group>(null);

  const chipTexture = useMemo(() => getSiliconDieTexture(), []);
  const brushedTexture = useMemo(() => getBrushedMetalTexture(), []);

  const materials = useMemo(() => {
    return {
      siliconDie: new THREE.MeshStandardMaterial({
        color: "#1E293B",
        map: chipTexture,
        metalness: 0.95,
        roughness: 0.10,
        envMapIntensity: 2.6,
      }),
      goldCarrier: new THREE.MeshStandardMaterial({
        color: "#F3C77C",
        metalness: 0.96,
        roughness: 0.16,
        bumpMap: brushedTexture,
        bumpScale: 0.0015,
        envMapIntensity: 2.3,
      }),
      packagePCB: new THREE.MeshStandardMaterial({
        color: "#182234",
        metalness: 0.45,
        roughness: 0.50,
      }),
      copperTraces: new THREE.MeshStandardMaterial({
        color: "#D97736",
        metalness: 0.94,
        roughness: 0.2,
      }),
      wireBond: new THREE.MeshStandardMaterial({
        color: "#F59E0B",
        metalness: 0.98,
        roughness: 0.10,
        envMapIntensity: 2.6,
      }),
      bondFoot: new THREE.MeshStandardMaterial({
        color: "#D97706",
        metalness: 0.96,
        roughness: 0.14,
      }),
      smpPin: new THREE.MeshStandardMaterial({
        color: "#E2E8F0",
        metalness: 0.95,
        roughness: 0.18,
      }),
      screwHardware: new THREE.MeshStandardMaterial({
        color: "#94A3B8",
        metalness: 0.96,
        roughness: 0.2,
      }),
    };
  }, [chipTexture, brushedTexture]);

  // Generate 48 wire bonds connecting die perimeter pads to carrier package
  const { wireBonds, dieFeet, carrierFeet } = useMemo(() => {
    const bonds: THREE.CatmullRomCurve3[] = [];
    const dFeet: [number, number, number][] = [];
    const cFeet: [number, number, number][] = [];
    const countPerSide = 12;
    const dieHalf = 0.18;
    const carrierHalf = 0.29;

    const sides = [
      { axis: "x", constSign: 1 },
      { axis: "x", constSign: -1 },
      { axis: "y", constSign: 1 },
      { axis: "y", constSign: -1 },
    ];

    sides.forEach(({ axis, constSign }) => {
      for (let i = 0; i < countPerSide; i++) {
        const offset = ((i - (countPerSide - 1) / 2) / ((countPerSide - 1) / 2)) * (dieHalf * 0.88);
        const pStart = new THREE.Vector3();
        const pEnd = new THREE.Vector3();
        const pMid = new THREE.Vector3();

        if (axis === "x") {
          pStart.set(offset, constSign * dieHalf, 0.012);
          pEnd.set(offset * 1.25, constSign * carrierHalf, 0.005);
          pMid.set(offset * 1.1, constSign * (dieHalf + (carrierHalf - dieHalf) * 0.42), 0.048);
          dFeet.push([offset, constSign * (dieHalf - 0.004), 0.012]);
          cFeet.push([offset * 1.25, constSign * carrierHalf, 0.005]);
        } else {
          pStart.set(constSign * dieHalf, offset, 0.012);
          pEnd.set(constSign * carrierHalf, offset * 1.25, 0.005);
          pMid.set(constSign * (dieHalf + (carrierHalf - dieHalf) * 0.42), offset * 1.1, 0.048);
          dFeet.push([constSign * (dieHalf - 0.004), offset, 0.012]);
          cFeet.push([constSign * carrierHalf, offset * 1.25, 0.005]);
        }

        bonds.push(new THREE.CatmullRomCurve3([pStart, pMid, pEnd]));
      }
    });

    return { wireBonds: bonds, dieFeet: dFeet, carrierFeet: cFeet };
  }, []);

  // Pre-allocate TubeGeometries for all 48 wire bonds
  const wireBondGeos = useMemo(() => {
    return wireBonds.map((bond) => new THREE.TubeGeometry(bond, 16, 0.0028, 8, false));
  }, [wireBonds]);

  React.useEffect(() => {
    return () => {
      wireBondGeos.forEach((g) => g.dispose());
    };
  }, [wireBondGeos]);

  // Active during scenes 3, 4, and in wide network reveal Scene 6 (hidden during scene 5 calibration)
  const isVisible = (scrollProgress >= 0.28 && scrollProgress <= 0.72) || scrollProgress >= 0.86;
  if (!isVisible) return null;

  return (
    <group ref={groupRef} position={[1.05, -1.45, 0.0]} rotation={[-Math.PI / 4, 0, 0]}>
      {/* 1. Outer Chip Carrier Base Package (OFHC Copper / Invar) */}
      <mesh position={[0, 0, -0.025]}>
        <boxGeometry args={[0.74, 0.74, 0.04]} />
        <primitive object={materials.goldCarrier} attach="material" />
      </mesh>

      {/* 2. High-Frequency PCB Substrate (Rogers RO4003) */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.68, 0.68, 0.012]} />
        <primitive object={materials.packagePCB} attach="material" />
      </mesh>

      {/* 3. Gold Wire Bonding Perimeter Frame */}
      <mesh position={[0, 0, 0.007]}>
        <ringGeometry args={[0.22, 0.32, 4, 1, Math.PI / 4]} />
        <primitive object={materials.goldCarrier} attach="material" />
      </mesh>

      {/* 4. Silicon / Sapphire Die Substrate with Photolithographic Metallization */}
      <mesh position={[0, 0, 0.01]}>
        <boxGeometry args={[0.38, 0.38, 0.012]} />
        <primitive object={materials.siliconDie} attach="material" />
      </mesh>

      {/* 5. Gold Wire Bonds (48 arched catenary loops radiating around perimeter) */}
      {wireBondGeos.map((geo, bIdx) => (
        <mesh key={`wirebond-${bIdx}`} geometry={geo} material={materials.wireBond} />
      ))}

      {/* 6. Realistic Ultrasonic Wedge Bond Feet on Die Pads */}
      {dieFeet.map(([fx, fy, fz], dfIdx) => (
        <mesh key={`dfoot-${dfIdx}`} position={[fx, fy, fz]}>
          <boxGeometry args={[0.005, 0.008, 0.003]} />
          <primitive object={materials.bondFoot} attach="material" />
        </mesh>
      ))}

      {/* 7. Wedge Bond Feet on Carrier PCB Pads */}
      {carrierFeet.map(([cx, cy, cz], cfIdx) => (
        <mesh key={`cfoot-${cfIdx}`} position={[cx, cy, cz]}>
          <boxGeometry args={[0.007, 0.012, 0.003]} />
          <primitive object={materials.bondFoot} attach="material" />
        </mesh>
      ))}

      {/* 8. Corner Mounting Allen Screws with Hex Sockets */}
      {[
        [-0.31, -0.31],
        [-0.31, 0.31],
        [0.31, -0.31],
        [0.31, 0.31],
      ].map(([sx, sy], sIdx) => (
        <group key={`screw-${sIdx}`} position={[sx, sy, 0.01]}>
          <mesh>
            <cylinderGeometry args={[0.016, 0.016, 0.012, 16]} />
            <primitive object={materials.screwHardware} attach="material" />
          </mesh>
          {/* Inner Hex Socket Hole */}
          <mesh position={[0, 0.0065, 0]}>
            <cylinderGeometry args={[0.009, 0.009, 0.002, 6]} />
            <meshBasicMaterial color="#0A0F1D" />
          </mesh>
        </group>
      ))}

      {/* 9. Peripheral Non-Magnetic SMP RF Launchers (4 per side = 16 launchers) */}
      {[0, 1, 2, 3].map((side) => {
        const angle = (side * Math.PI) / 2;
        return (
          <group key={`smp-side-${side}`} rotation={[0, 0, angle]}>
            {[-0.24, -0.08, 0.08, 0.24].map((offset, pinIdx) => (
              <group key={`pin-${side}-${pinIdx}`} position={[offset, 0.35, 0.008]} rotation={[Math.PI / 2, 0, 0]}>
                {/* Outer Brass / Beryllium Copper Barrel */}
                <mesh>
                  <cylinderGeometry args={[0.013, 0.013, 0.045, 12]} />
                  <primitive object={materials.smpPin} attach="material" />
                </mesh>
                {/* Center Signal Conductor Pin */}
                <mesh position={[0, 0.024, 0]}>
                  <cylinderGeometry args={[0.003, 0.003, 0.01, 8]} />
                  <primitive object={materials.wireBond} attach="material" />
                </mesh>
              </group>
            ))}
          </group>
        );
      })}

      {/* 10. Dedicated Laboratory Macro Cinema Lighting */}
      <pointLight position={[0, 0, 0.35]} intensity={2.6} color="#06B6D4" distance={1.2} />
      <pointLight position={[0.2, 0.2, 0.25]} intensity={1.9} color="#F8FAFC" distance={1.0} />
    </group>
  );
}
