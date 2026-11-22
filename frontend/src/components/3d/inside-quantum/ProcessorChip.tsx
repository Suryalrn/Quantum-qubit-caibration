"use client";

import React, { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { getSiliconDieTexture, getBrushedMetalTexture } from "./proceduralTextures";

interface ProcessorChipProps {
  scrollProgress: number;
}

/**
 * ProcessorChip (Scene 03):
 * Scientifically authentic, mechanically complete superconducting quantum processor package:
 * - High-resistivity silicon die with thin-film niobium ground plane & CPW lithography
 * - 48 ultrasonic pure gold wedge wire bonds (25μm gauge scale, realistic catenary arch)
 * - Compressed wedge bond termination feet on die pads and carrier landing pads
 * - Rogers RO4003C high-frequency microwave PCB substrate with gold-plated GCPW launch lines
 * - Gold-plated OFHC copper cavity carrier with M2 stainless socket head cap screws
 * - 16 peripheral non-magnetic SMP RF launchers with coaxial center conductor pins
 * - Rigid OFHC copper mounting cold finger mechanically bolted to the 15mK mixing chamber
 * - Smooth continuous opacity fading during microscopic and calibration inspection
 */
export default function ProcessorChip({ scrollProgress }: ProcessorChipProps) {
  const groupRef = useRef<THREE.Group>(null);
  const currentOpacity = useRef<number>(1.0);

  const chipTexture = useMemo(() => getSiliconDieTexture(), []);
  const brushedTexture = useMemo(() => getBrushedMetalTexture(), []);

  // Photorealistic PBR materials with transparency support for cinematic cross-fades
  const materials = useMemo(() => {
    return {
      siliconDie: new THREE.MeshStandardMaterial({
        color: "#0E1522",
        map: chipTexture,
        metalness: 0.92,
        roughness: 0.08,
        envMapIntensity: 2.2,
        transparent: true,
        opacity: 1.0,
      }),
      goldCarrier: new THREE.MeshStandardMaterial({
        color: "#E2B35B",
        metalness: 0.96,
        roughness: 0.18,
        bumpMap: brushedTexture,
        bumpScale: 0.0015,
        envMapIntensity: 2.0,
        transparent: true,
        opacity: 1.0,
      }),
      packagePCB: new THREE.MeshStandardMaterial({
        color: "#18202F",
        metalness: 0.35,
        roughness: 0.55,
        transparent: true,
        opacity: 1.0,
      }),
      pcbTraces: new THREE.MeshStandardMaterial({
        color: "#D4AF37",
        metalness: 0.95,
        roughness: 0.16,
        transparent: true,
        opacity: 1.0,
      }),
      wireBondGold: new THREE.MeshStandardMaterial({
        color: "#F59E0B",
        metalness: 0.98,
        roughness: 0.12,
        envMapIntensity: 2.4,
        transparent: true,
        opacity: 1.0,
      }),
      bondFootGold: new THREE.MeshStandardMaterial({
        color: "#D97706",
        metalness: 0.96,
        roughness: 0.15,
        transparent: true,
        opacity: 1.0,
      }),
      smpHousing: new THREE.MeshStandardMaterial({
        color: "#D4AF37",
        metalness: 0.96,
        roughness: 0.18,
        transparent: true,
        opacity: 1.0,
      }),
      smpPin: new THREE.MeshStandardMaterial({
        color: "#F8FAFC",
        metalness: 0.96,
        roughness: 0.14,
        transparent: true,
        opacity: 1.0,
      }),
      stainlessScrews: new THREE.MeshStandardMaterial({
        color: "#94A3B8",
        metalness: 0.95,
        roughness: 0.20,
        transparent: true,
        opacity: 1.0,
      }),
      copperColdFinger: new THREE.MeshStandardMaterial({
        color: "#C87548",
        metalness: 0.94,
        roughness: 0.22,
        bumpMap: brushedTexture,
        bumpScale: 0.002,
        envMapIntensity: 1.8,
        transparent: true,
        opacity: 1.0,
      }),
    };
  }, [chipTexture, brushedTexture]);

  // Generate 48 realistic ultrasonic wedge wire bonds connecting die pads to carrier landing pads
  const { wireBonds, dieFeet, carrierFeet, pcbTracesList } = useMemo(() => {
    const bonds: THREE.CatmullRomCurve3[] = [];
    const dFeet: [number, number, number][] = [];
    const cFeet: [number, number, number][] = [];
    const traces: { start: [number, number]; end: [number, number] }[] = [];

    const countPerSide = 12;
    const dieHalf = 0.178; // Die edge radius
    const carrierHalf = 0.275; // Carrier PCB landing pad radius
    const loopPeakH = 0.016; // Physically plausible 0.4mm loop height above surface

    const sides = [
      { axis: "x", constSign: 1 },
      { axis: "x", constSign: -1 },
      { axis: "y", constSign: 1 },
      { axis: "y", constSign: -1 },
    ];

    sides.forEach(({ axis, constSign }) => {
      for (let i = 0; i < countPerSide; i++) {
        // Distribute pads uniformly along each side
        const span = dieHalf * 1.76;
        const offset = ((i - (countPerSide - 1) / 2) / ((countPerSide - 1) / 2)) * (span * 0.5);

        const pStart = new THREE.Vector3();
        const pMid = new THREE.Vector3();
        const pEnd = new THREE.Vector3();

        if (axis === "x") {
          // Take-off at die edge pad
          pStart.set(offset, constSign * dieHalf, 0.010);
          // Landing at PCB pad
          pEnd.set(offset * 1.18, constSign * carrierHalf, 0.004);
          // Parabolic catenary apex (slightly shifted toward die for ultrasonic take-off geometry)
          pMid.set(offset * 1.06, constSign * (dieHalf + (carrierHalf - dieHalf) * 0.45), 0.010 + loopPeakH);

          dFeet.push([offset, constSign * (dieHalf - 0.003), 0.010]);
          cFeet.push([offset * 1.18, constSign * (carrierHalf + 0.002), 0.004]);

          // Microstrip PCB trace leading to SMP launcher
          traces.push({
            start: [offset * 1.18, constSign * (carrierHalf + 0.004)],
            end: [offset * 1.35, constSign * 0.32],
          });
        } else {
          pStart.set(constSign * dieHalf, offset, 0.010);
          pEnd.set(constSign * carrierHalf, offset * 1.18, 0.004);
          pMid.set(constSign * (dieHalf + (carrierHalf - dieHalf) * 0.45), offset * 1.06, 0.010 + loopPeakH);

          dFeet.push([constSign * (dieHalf - 0.003), offset, 0.010]);
          cFeet.push([constSign * (carrierHalf + 0.002), offset * 1.18, 0.004]);

          traces.push({
            start: [constSign * (carrierHalf + 0.004), offset * 1.18],
            end: [constSign * 0.32, offset * 1.35],
          });
        }

        bonds.push(new THREE.CatmullRomCurve3([pStart, pMid, pEnd]));
      }
    });

    return { wireBonds: bonds, dieFeet: dFeet, carrierFeet: cFeet, pcbTracesList: traces };
  }, []);

  // Pre-allocate TubeGeometries for 48 wire bonds with scale-accurate 25μm radius (0.00095 units)
  const wireBondGeos = useMemo(() => {
    return wireBonds.map((bond) => new THREE.TubeGeometry(bond, 16, 0.00095, 8, false));
  }, [wireBonds]);

  React.useEffect(() => {
    return () => {
      wireBondGeos.forEach((g) => g.dispose());
    };
  }, [wireBondGeos]);

  // Continuous smooth opacity interpolation:
  // Visible during Scene 1, 2, and 3 (p <= 0.46)
  // Fades out between 0.46 and 0.54 for the sub-micron Dolan bridge hero inspection
  // Fades back in at p >= 0.84 for the full ecosystem reveal
  useFrame(() => {
    const p = scrollProgress;
    let target = 1.0;

    if (p > 0.46 && p < 0.84) {
      if (p <= 0.54) {
        target = 1.0 - (p - 0.46) / 0.08;
      } else if (p >= 0.78) {
        target = (p - 0.78) / 0.06;
      } else {
        target = 0.0;
      }
    } else if (p >= 0.84) {
      target = 1.0;
    }

    currentOpacity.current = THREE.MathUtils.lerp(currentOpacity.current, target, 0.08);
    const alpha = currentOpacity.current;

    if (groupRef.current) {
      groupRef.current.visible = alpha > 0.008;
    }

    materials.siliconDie.opacity = alpha;
    materials.goldCarrier.opacity = alpha;
    materials.packagePCB.opacity = alpha;
    materials.pcbTraces.opacity = alpha;
    materials.wireBondGold.opacity = alpha;
    materials.bondFootGold.opacity = alpha;
    materials.smpHousing.opacity = alpha;
    materials.smpPin.opacity = alpha;
    materials.stainlessScrews.opacity = alpha;
    materials.copperColdFinger.opacity = alpha;
  });

  return (
    <group ref={groupRef} position={[0.95, -1.35, 0.0]} rotation={[-Math.PI / 4, 0, 0]}>
      {/* =========================================================================
          1. MECHANICAL MOUNTING COLD FINGER & BRACKET (RIGID CONNECTION TO 15mK PLATE)
          ========================================================================= */}
      {/* Vertical OFHC Copper Thermal Standoff Bracket rising to Mixing Chamber Plate (y = -1.08) */}
      <group position={[0, 0, -0.06]}>
        {/* Main Copper Cold Finger Column */}
        <mesh position={[0, 0.38, 0.02]}>
          <boxGeometry args={[0.24, 0.32, 0.04]} />
          <primitive object={materials.copperColdFinger} attach="material" />
        </mesh>
        {/* Top Bolting Flange securing to Mixing Chamber */}
        <mesh position={[0, 0.54, 0.02]}>
          <boxGeometry args={[0.36, 0.04, 0.05]} />
          <primitive object={materials.copperColdFinger} attach="material" />
        </mesh>
        {/* M3 Stainless Mounting Screws connecting to Mixing Chamber */}
        {[-0.14, 0.14].map((sx, idx) => (
          <mesh key={`m3-screw-${idx}`} position={[sx, 0.54, 0.048]}>
            <cylinderGeometry args={[0.016, 0.016, 0.018, 16]} />
            <primitive object={materials.stainlessScrews} attach="material" />
          </mesh>
        ))}
      </group>

      {/* =========================================================================
          2. SAMPLE CARRIER BASE & CAVITY (GOLD-PLATED OFHC COPPER / INVAR)
          ========================================================================= */}
      {/* Main Machined Carrier Body */}
      <mesh position={[0, 0, -0.025]}>
        <boxGeometry args={[0.72, 0.72, 0.04]} />
        <primitive object={materials.goldCarrier} attach="material" />
      </mesh>

      {/* Recessed Die Pocket Floor */}
      <mesh position={[0, 0, -0.004]}>
        <boxGeometry args={[0.40, 0.40, 0.006]} />
        <primitive object={materials.goldCarrier} attach="material" />
      </mesh>

      {/* =========================================================================
          3. HIGH-FREQUENCY MICROWAVE PCB (ROGERS RO4003C / TMM10i)
          ========================================================================= */}
      {/* Substrate Frame Surrounding Recessed Die Pocket */}
      <mesh position={[0, 0, 0.002]}>
        <boxGeometry args={[0.66, 0.66, 0.010]} />
        <primitive object={materials.packagePCB} attach="material" />
      </mesh>

      {/* Wirebonding Ground Landing Frame Ring */}
      <mesh position={[0, 0, 0.006]}>
        <ringGeometry args={[0.20, 0.28, 4, 1, Math.PI / 4]} />
        <primitive object={materials.goldCarrier} attach="material" />
      </mesh>

      {/* Gold-Plated GCPW Microstrip Traces etched into PCB */}
      {pcbTracesList.map((tr, tIdx) => {
        const dx = tr.end[0] - tr.start[0];
        const dy = tr.end[1] - tr.start[1];
        const len = Math.hypot(dx, dy);
        const ang = Math.atan2(dy, dx);
        const mx = (tr.start[0] + tr.end[0]) * 0.5;
        const my = (tr.start[1] + tr.end[1]) * 0.5;
        return (
          <mesh key={`pcb-trace-${tIdx}`} position={[mx, my, 0.007]} rotation={[0, 0, ang]}>
            <planeGeometry args={[len, 0.004]} />
            <primitive object={materials.pcbTraces} attach="material" />
          </mesh>
        );
      })}

      {/* =========================================================================
          4. SUPERCONDUCTING QUANTUM PROCESSOR DIE (HIGH-RESISTIVITY SILICON)
          ========================================================================= */}
      {/* Silicon Die Substrate (0.38 x 0.38 x 0.012) */}
      <mesh position={[0, 0, 0.008]}>
        <boxGeometry args={[0.38, 0.38, 0.010]} />
        <primitive object={materials.siliconDie} attach="material" />
      </mesh>

      {/* =========================================================================
          5. SCALE-ACCURATE ULTRASONIC GOLD WEDGE WIRE BONDS (25μm GAUGE SCALE)
          ========================================================================= */}
      {/* 48 Delicate Catenary Wire Bond Arches */}
      {wireBondGeos.map((geo, bIdx) => (
        <mesh key={`wirebond-${bIdx}`} geometry={geo} material={materials.wireBondGold} />
      ))}

      {/* Ultrasonic Wedge Bond Feet on Die Perimeter Pads (Flattened Rectangular Heel/Toe) */}
      {dieFeet.map(([fx, fy, fz], dfIdx) => (
        <mesh key={`dfoot-${dfIdx}`} position={[fx, fy, fz]}>
          <boxGeometry args={[0.004, 0.006, 0.0018]} />
          <primitive object={materials.bondFootGold} attach="material" />
        </mesh>
      ))}

      {/* Ultrasonic Wedge Bond Feet on Package PCB Landing Pads */}
      {carrierFeet.map(([cx, cy, cz], cfIdx) => (
        <mesh key={`cfoot-${cfIdx}`} position={[cx, cy, cz]}>
          <boxGeometry args={[0.005, 0.008, 0.0018]} />
          <primitive object={materials.bondFootGold} attach="material" />
        </mesh>
      ))}

      {/* =========================================================================
          6. FASTENERS & MECHANICAL HARDWARE
          ========================================================================= */}
      {/* 4 Corner Stainless M2 Socket Head Cap Screws Clamping Package to Cold Finger */}
      {[
        [-0.30, -0.30],
        [-0.30, 0.30],
        [0.30, -0.30],
        [0.30, 0.30],
      ].map(([sx, sy], sIdx) => (
        <group key={`screw-${sIdx}`} position={[sx, sy, 0.008]}>
          <mesh>
            <cylinderGeometry args={[0.015, 0.015, 0.014, 16]} />
            <primitive object={materials.stainlessScrews} attach="material" />
          </mesh>
          {/* Hex Socket Broach */}
          <mesh position={[0, 0.0075, 0]}>
            <cylinderGeometry args={[0.008, 0.008, 0.002, 6]} />
            <meshBasicMaterial color="#0A0E17" />
          </mesh>
        </group>
      ))}

      {/* =========================================================================
          7. NON-MAGNETIC SMP MICROWAVE RF LAUNCHERS (4 PER SIDE = 16 LAUNCHERS)
          ========================================================================= */}
      {[0, 1, 2, 3].map((side) => {
        const angle = (side * Math.PI) / 2;
        return (
          <group key={`smp-side-${side}`} rotation={[0, 0, angle]}>
            {[-0.22, -0.07, 0.07, 0.22].map((offset, pinIdx) => (
              <group key={`pin-${side}-${pinIdx}`} position={[offset, 0.35, 0.006]} rotation={[Math.PI / 2, 0, 0]}>
                {/* Gold-Plated Outer Barrel */}
                <mesh>
                  <cylinderGeometry args={[0.012, 0.012, 0.040, 16]} />
                  <primitive object={materials.smpHousing} attach="material" />
                </mesh>
                {/* PTFE Dielectric Insulator Bushing */}
                <mesh position={[0, 0.021, 0]}>
                  <cylinderGeometry args={[0.008, 0.008, 0.004, 16]} />
                  <meshStandardMaterial color="#E2E8F0" roughness={0.4} />
                </mesh>
                {/* Beryllium Copper Gold-Plated Center Signal Pin */}
                <mesh position={[0, 0.024, 0]}>
                  <cylinderGeometry args={[0.0024, 0.0024, 0.012, 8]} />
                  <primitive object={materials.smpPin} attach="material" />
                </mesh>
              </group>
            ))}
          </group>
        );
      })}

      {/* Dedicated Laboratory Microscope Grazing Light */}
      <pointLight position={[0, 0, 0.32]} intensity={2.4} color="#F8FAFC" distance={1.2} />
      <pointLight position={[0.2, 0.2, 0.20]} intensity={1.6} color="#00F0FF" distance={1.0} />
    </group>
  );
}
