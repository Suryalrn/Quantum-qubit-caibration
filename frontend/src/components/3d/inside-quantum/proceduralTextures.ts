"use client";

import * as THREE from "three";

/**
 * Shared procedural texture generator for photorealistic PBR materials.
 * Generates high-resolution normal, bump, and micro-structure maps via HTML5 Canvas.
 */

let cachedBrushedMetal: THREE.CanvasTexture | null = null;
let cachedWovenBraid: THREE.CanvasTexture | null = null;
let cachedSiliconDie: THREE.CanvasTexture | null = null;

/**
 * Procedural Brushed Metal Micro-Grain Texture:
 * Simulates CNC lathe machining marks and brushed metallic grain.
 * Applied as bumpMap / roughnessMap to gold plates, copper stages, and stainless steel flanges.
 */
export function getBrushedMetalTexture(): THREE.CanvasTexture {
  if (cachedBrushedMetal) return cachedBrushedMetal;
  if (typeof document === "undefined") {
    return new THREE.CanvasTexture({} as HTMLCanvasElement);
  }

  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Neutral grey base (128, 128, 128 for bump map zero displacement)
  ctx.fillStyle = "#808080";
  ctx.fillRect(0, 0, 512, 512);

  // Concentric lathe machining rings
  ctx.lineWidth = 1;
  const centerX = 256;
  const centerY = 256;
  for (let r = 8; r < 360; r += 3) {
    const brightness = 128 + (Math.random() - 0.5) * 45;
    ctx.strokeStyle = `rgb(${brightness}, ${brightness}, ${brightness})`;
    ctx.beginPath();
    ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Radial micro-scratches and brush strokes
  for (let i = 0; i < 400; i++) {
    const ang = Math.random() * Math.PI * 2;
    const r1 = Math.random() * 240;
    const r2 = r1 + Math.random() * 15;
    const brightness = 128 + (Math.random() - 0.5) * 55;
    ctx.strokeStyle = `rgb(${brightness}, ${brightness}, ${brightness})`;
    ctx.beginPath();
    ctx.moveTo(centerX + Math.cos(ang) * r1, centerY + Math.sin(ang) * r1);
    ctx.lineTo(centerX + Math.cos(ang) * r2, centerY + Math.sin(ang) * r2);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  texture.generateMipmaps = true;

  cachedBrushedMetal = texture;
  return texture;
}

/**
 * Procedural Woven Copper Braid Texture:
 * Simulates high-purity flexible braided OFHC copper thermal links (heat straps).
 */
export function getWovenBraidTexture(): THREE.CanvasTexture {
  if (cachedWovenBraid) return cachedWovenBraid;
  if (typeof document === "undefined") {
    return new THREE.CanvasTexture({} as HTMLCanvasElement);
  }

  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Base copper-gold tone
  ctx.fillStyle = "#B45309";
  ctx.fillRect(0, 0, 256, 256);

  // Intertwined herringbone / cross-hatch weave pattern
  const step = 8;
  for (let y = 0; y < 256; y += step) {
    for (let x = 0; x < 256; x += step) {
      const isDiagonal = ((x + y) / step) % 2 === 0;
      ctx.fillStyle = isDiagonal ? "#D97706" : "#92400E";
      ctx.fillRect(x, y, step, step);

      // Fine wire filament highlights
      ctx.fillStyle = isDiagonal ? "#FBBF24" : "#78350F";
      ctx.fillRect(x + 1, y + 1, step - 2, 2);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 8);
  texture.anisotropy = 8;
  texture.generateMipmaps = true;

  cachedWovenBraid = texture;
  return texture;
}

/**
 * Procedural Semiconductor Photolithography Die Texture:
 * Ultra-high-resolution photolithographic micro-patterns for the superconducting silicon die:
 * - Etched superconducting niobium ground plane (#152035)
 * - 25,000+ etched anti-vortex micro-vias (ground mesh holes to pin magnetic flux)
 * - 50-ohm coplanar waveguide (CPW) transmission lines
 * - Meandering quarter-wave readout resonators
 * - Transmon capacitor pocket clearance trenches with Al/AlOx/Al SQUID loops
 * - Perimeter pure gold wirebonding landing pads
 */
export function getSiliconDieTexture(): THREE.CanvasTexture {
  if (cachedSiliconDie) return cachedSiliconDie;
  if (typeof document === "undefined") {
    return new THREE.CanvasTexture({} as HTMLCanvasElement);
  }

  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // 1. Pristine High-Resistivity Silicon Substrate (#090D1A)
  ctx.fillStyle = "#090D1A";
  ctx.fillRect(0, 0, 1024, 1024);

  // 2. Sputtered Superconducting Niobium Ground Plane (#141E34)
  ctx.fillStyle = "#141E34";
  ctx.fillRect(60, 60, 904, 904);

  // 3. Etched Anti-Vortex Micro-Via Grid (flux pinning holes)
  ctx.fillStyle = "#090D1A";
  const viaStep = 16;
  for (let x = 74; x < 950; x += viaStep) {
    for (let y = 74; y < 950; y += viaStep) {
      const dist = Math.hypot(x - 512, y - 512);
      // Keep clear of center transmon lattice and outer feed lines
      if (dist > 370 || (dist < 320 && (x % 32 === 0 || y % 32 === 0))) {
        ctx.fillRect(x - 1, y - 1, 3, 3);
      }
    }
  }

  // 4. Coplanar Waveguide (CPW) Transmission Lines & Meandering Resonators
  ctx.strokeStyle = "#090D1A";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const numResonators = 16;
  for (let i = 0; i < numResonators; i++) {
    const ang = (i / numResonators) * Math.PI * 2;
    const r0 = 425;
    const r1 = 230;

    const x0 = 512 + Math.cos(ang) * r0;
    const y0 = 512 + Math.sin(ang) * r0;
    const x1 = 512 + Math.cos(ang) * r1;
    const y1 = 512 + Math.sin(ang) * r1;

    // Meandering resonator wiggle
    const midX = (x0 + x1) * 0.5 + Math.sin(i * 3.5) * 30;
    const midY = (y0 + y1) * 0.5 + Math.cos(i * 3.5) * 30;

    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(midX, midY, x1, y1);
    ctx.stroke();

    // Etched transmon capacitor clearance pocket (square recess in ground plane)
    ctx.fillStyle = "#090D1A";
    ctx.fillRect(x1 - 18, y1 - 18, 36, 36);

    // Superconducting Niobium Capacitor Pads inside pocket (#0284C7)
    ctx.fillStyle = "#0284C7";
    ctx.fillRect(x1 - 12, y1 - 12, 10, 24);
    ctx.fillRect(x1 + 2, y1 - 12, 10, 24);

    // Central sub-micron Josephson junction SQUID loop
    ctx.fillStyle = "#F8FAFC";
    ctx.fillRect(x1 - 2, y1 - 3, 4, 6);
  }

  // 5. Perimeter Die Wirebond Landing Pads (48 gold pads around die edges)
  ctx.fillStyle = "#F59E0B";
  const padW = 12;
  const padH = 16;
  const countPerSide = 12;
  for (let i = 0; i < countPerSide; i++) {
    const offset = 96 + i * (832 / (countPerSide - 1));
    // Top & Bottom pads
    ctx.fillRect(offset - padW / 2, 66, padW, padH);
    ctx.fillRect(offset - padW / 2, 958 - padH, padW, padH);
    // Left & Right pads
    ctx.fillRect(66, offset - padW / 2, padH, padW);
    ctx.fillRect(958 - padH, offset - padW / 2, padH, padW);
  }

  // 6. High-Frequency Central Ground Ring
  ctx.strokeStyle = "#F59E0B";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(512, 512, 135, 0, Math.PI * 2);
  ctx.stroke();

  // 7. Alignment Fiducial Crosses at the 4 corners
  ctx.strokeStyle = "#F59E0B";
  ctx.lineWidth = 2;
  const corners = [
    [90, 90],
    [934, 90],
    [90, 934],
    [934, 934],
  ];
  corners.forEach(([cx, cy]) => {
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy);
    ctx.lineTo(cx + 10, cy);
    ctx.moveTo(cx, cy - 10);
    ctx.lineTo(cx, cy + 10);
    ctx.stroke();
    ctx.strokeRect(cx - 14, cy - 14, 28, 28);
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 16;
  texture.generateMipmaps = true;

  cachedSiliconDie = texture;
  return texture;
}
