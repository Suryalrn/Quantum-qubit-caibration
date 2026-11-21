"use client";

import React, { useMemo, useRef } from "react";
import * as THREE from "three";

interface ProcessorChipProps {
  scrollProgress: number;
}

/**
 * Procedural generation of ultra-high-resolution photolithographic
 * semiconductor surface texture (etched niobium ground plane, micro-vias, CPW transmission traces)
 */
function createPhotolithographyTexture(): THREE.CanvasTexture {
  if (typeof document === "undefined") {
    // Return a dummy texture during SSR
    return new THREE.CanvasTexture({} as HTMLCanvasElement);
  }

  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // 1. Deep reflective silicon substrate base (#0B1120)
  ctx.fillStyle = "#0A0F1D";
  ctx.fillRect(0, 0, 1024, 1024);

  // 2. Superconducting Niobium Ground Plane (#162038)
  ctx.fillStyle = "#16223A";
  ctx.fillRect(64, 64, 896, 896);

  // 3. Etched Anti-Vortex Micro-Vias Grid (thousands of tiny clearance holes in ground plane)
  ctx.fillStyle = "#0A0F1D";
  const step = 16;
  for (let x = 80; x < 944; x += step) {
    for (let y = 80; y < 944; y += step) {
      // Leave clearance for central qubit lattice & CPW traces
      const distFromCenter = Math.hypot(x - 512, y - 512);
      if (distFromCenter > 380 || (distFromCenter < 340 && (x % 32 === 0 || y % 32 === 0))) {
        ctx.fillRect(x - 1, y - 1, 3, 3);
      }
    }
  }

  // 4. Coplanar Waveguide (CPW) Transmission Lines & Meandering Resonators
  ctx.strokeStyle = "#0A0F1D";
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Meandering resonator traces radiating to transmon pockets
  const numPockets = 16;
  for (let i = 0; i < numPockets; i++) {
    const ang = (i / numPockets) * Math.PI * 2;
    const rStart = 420;
    const rEnd = 240;
    const x0 = 512 + Math.cos(ang) * rStart;
    const y0 = 512 + Math.sin(ang) * rStart;
    const x1 = 512 + Math.cos(ang) * rEnd;
    const y1 = 512 + Math.sin(ang) * rEnd;

    // Meandering wiggle in the middle
    const midX = (x0 + x1) * 0.5 + Math.sin(i * 3) * 25;
    const midY = (y0 + y1) * 0.5 + Math.cos(i * 3) * 25;

    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(midX, midY, x1, y1);
    ctx.stroke();

    // Etched transmon capacitor clearance pocket
    ctx.fillStyle = "#0A0F1D";
    ctx.fillRect(x1 - 18, y1 - 18, 36, 36);

    // Inner superconducting capacitor pads inside pocket (#38BDF8)
    ctx.fillStyle = "#0284C7";
    ctx.fillRect(x1 - 12, y1 - 12, 10, 24);
    ctx.fillRect(x1 + 2, y1 - 12, 10, 24);

    // Central sub-micron SQUID loop
    ctx.fillStyle = "#E2E8F0";
    ctx.fillRect(x1 - 2, y1 - 3, 4, 6);
  }

  // 5. Perimeter Die Wirebond Landing Pads (48 gold pads around die edges)
  ctx.fillStyle = "#F59E0B";
  const padW = 12;
  const padH = 16;
  const countPerSide = 12;
  for (let i = 0; i < countPerSide; i++) {
    const offset = 100 + i * (824 / (countPerSide - 1));
    // Top & Bottom pads
    ctx.fillRect(offset - padW / 2, 70, padW, padH);
    ctx.fillRect(offset - padW / 2, 954 - padH, padW, padH);
    // Left & Right pads
    ctx.fillRect(70, offset - padW / 2, padH, padW);
    ctx.fillRect(954 - padH, offset - padW / 2, padH, padW);
  }

  // 6. High-Frequency Gold Center Ground Bus
  ctx.strokeStyle = "#F59E0B";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(512, 512, 140, 0, Math.PI * 2);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 8;
  texture.generateMipmaps = true;
  return texture;
}

/**
 * ProcessorChip (Scene 03):
 * Photorealistic macro representation of the superconducting quantum chip package:
 * - High-resistivity silicon die with polished deep-slate mirror luster & micro-lithography
 * - Thin-film niobium superconducting coplanar waveguide (CPW) transmission traces
 * - 48 radial catenary pure gold wire bonds bridging die pads to carrier launchers
 * - 24k gold-plated perimeter RF shielding frame with precision Allen screws
 * - Ceramic Rogers RO4003 substrate package with non-magnetic SMP RF launchers
 */
export default function ProcessorChip({ scrollProgress }: ProcessorChipProps) {
  const groupRef = useRef<THREE.Group>(null);

  // Generate procedural photolithographic semiconductor texture
  const chipTexture = useMemo(() => createPhotolithographyTexture(), []);

  const materials = useMemo(() => {
    return {
      siliconDie: new THREE.MeshStandardMaterial({
        color: "#1E293B",
        map: chipTexture,
        metalness: 0.94,
        roughness: 0.12,
        envMapIntensity: 2.4,
      }),
      goldCarrier: new THREE.MeshStandardMaterial({
        color: "#F3C77C",
        metalness: 0.96,
        roughness: 0.18,
        envMapIntensity: 2.2,
      }),
      packagePCB: new THREE.MeshStandardMaterial({
        color: "#1E293B",
        metalness: 0.45,
        roughness: 0.55,
      }),
      wireBond: new THREE.MeshStandardMaterial({
        color: "#F59E0B",
        metalness: 0.98,
        roughness: 0.12,
        envMapIntensity: 2.5,
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
  }, [chipTexture]);

  // Generate 48 wire bonds connecting die perimeter pads to carrier package
  const wireBonds = useMemo(() => {
    const bonds: THREE.CatmullRomCurve3[] = [];
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
        } else {
          pStart.set(constSign * dieHalf, offset, 0.012);
          pEnd.set(constSign * carrierHalf, offset * 1.25, 0.005);
          pMid.set(constSign * (dieHalf + (carrierHalf - dieHalf) * 0.42), offset * 1.1, 0.048);
        }

        bonds.push(new THREE.CatmullRomCurve3([pStart, pMid, pEnd]));
      }
    });

    return bonds;
  }, []);

  // Pre-allocate TubeGeometries for all 48 wire bonds
  const wireBondGeos = useMemo(() => {
    return wireBonds.map((bond) => new THREE.TubeGeometry(bond, 16, 0.0028, 8, false));
  }, [wireBonds]);

  React.useEffect(() => {
    return () => {
      wireBondGeos.forEach((g) => g.dispose());
      chipTexture.dispose();
    };
  }, [wireBondGeos, chipTexture]);

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

      {/* 6. Corner Mounting Allen Screws */}
      {[
        [-0.31, -0.31],
        [-0.31, 0.31],
        [0.31, -0.31],
        [0.31, 0.31],
      ].map(([sx, sy], sIdx) => (
        <mesh key={`screw-${sIdx}`} position={[sx, sy, 0.01]}>
          <cylinderGeometry args={[0.016, 0.016, 0.012, 12]} />
          <primitive object={materials.screwHardware} attach="material" />
        </mesh>
      ))}

      {/* 7. Peripheral Non-Magnetic SMP RF Launchers (4 per side = 16 launchers) */}
      {[0, 1, 2, 3].map((side) => {
        const angle = (side * Math.PI) / 2;
        return (
          <group key={`smp-side-${side}`} rotation={[0, 0, angle]}>
            {[-0.24, -0.08, 0.08, 0.24].map((offset, pinIdx) => (
              <mesh key={`pin-${side}-${pinIdx}`} position={[offset, 0.35, 0.008]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.013, 0.013, 0.045, 12]} />
                <primitive object={materials.smpPin} attach="material" />
              </mesh>
            ))}
          </group>
        );
      })}

      {/* 8. Dedicated Cinema Lighting on the Superconducting Chip */}
      <pointLight position={[0, 0, 0.35]} intensity={2.4} color="#06B6D4" distance={1.2} />
      <pointLight position={[0.2, 0.2, 0.25]} intensity={1.8} color="#F8FAFC" distance={1.0} />
    </group>
  );
}
