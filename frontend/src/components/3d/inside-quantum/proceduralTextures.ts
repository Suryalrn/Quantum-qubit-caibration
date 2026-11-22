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

  // Neutral grey base (128 for bump map zero displacement)
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

  // Base copper tone
  ctx.fillStyle = "#9A4D1E";
  ctx.fillRect(0, 0, 256, 256);

  // Intertwined herringbone / cross-hatch weave pattern
  const step = 8;
  for (let y = 0; y < 256; y += step) {
    for (let x = 0; x < 256; x += step) {
      const isDiagonal = ((x + y) / step) % 2 === 0;
      ctx.fillStyle = isDiagonal ? "#B85D28" : "#7E3A12";
      ctx.fillRect(x, y, step, step);

      // Fine wire filament highlights
      ctx.fillStyle = isDiagonal ? "#D97736" : "#642A0C";
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
 * Scientifically authentic, photorealistic micro-fabrication map:
 * - High-resistivity single-crystal silicon substrate (#0A0E17)
 * - Sputtered thin-film superconducting niobium ground plane (#5A697E, metallic silver-grey)
 * - Anti-vortex flux-pinning hole matrix (uniform 4μm etched holes)
 * - 50-ohm coplanar waveguide (CPW) transmission lines (etched slot gaps revealing silicon substrate)
 * - Meandering quarter-wave (λ/4) readout resonators
 * - Transmon capacitor pocket clearance trenches with niobium capacitor cross pads
 * - Perimeter wirebonding landing pads (pure gold metallization)
 * - Alignment vernier fiducials and chip serialization markings
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

  // 1. Pristine High-Resistivity Silicon Substrate (#0A0E17 - deep neutral semiconductor slate)
  ctx.fillStyle = "#0A0E17";
  ctx.fillRect(0, 0, 1024, 1024);

  // 2. Sputtered Superconducting Niobium Ground Plane (#5B6B80 - metallic niobium film)
  ctx.fillStyle = "#5B6B80";
  ctx.fillRect(52, 52, 920, 920);

  // 3. Anti-Vortex Flux-Pinning Micro-Via Grid (etched holes through niobium down to silicon)
  ctx.fillStyle = "#0A0E17";
  const viaStep = 14;
  for (let x = 68; x < 956; x += viaStep) {
    for (let y = 68; y < 956; y += viaStep) {
      const distFromCenter = Math.hypot(x - 512, y - 512);
      // Keep clear of transmon lattice, feedlines, and perimeter pads
      const isClearOfPads = x > 110 && x < 914 && y > 110 && y < 914;
      const isClearOfCenter = distFromCenter > 360 || (distFromCenter < 300 && (x % 28 === 0 || y % 28 === 0));
      if (isClearOfPads && isClearOfCenter) {
        ctx.fillRect(x - 1, y - 1, 2.5, 2.5);
      }
    }
  }

  // 4. Coplanar Waveguide (CPW) Transmission Lines & Meandering Readout Resonators
  // Etched slot gaps reveal bare dark silicon substrate
  ctx.strokeStyle = "#0A0E17";
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const numResonators = 16;
  for (let i = 0; i < numResonators; i++) {
    const ang = (i / numResonators) * Math.PI * 2;
    const rOuter = 415;
    const rInner = 220;

    const x0 = 512 + Math.cos(ang) * rOuter;
    const y0 = 512 + Math.sin(ang) * rOuter;
    const x1 = 512 + Math.cos(ang) * rInner;
    const y1 = 512 + Math.sin(ang) * rInner;

    // Meandering serpentine resonator bends
    const midX = (x0 + x1) * 0.5 + Math.sin(i * 3.7) * 26;
    const midY = (y0 + y1) * 0.5 + Math.cos(i * 3.7) * 26;

    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(midX, midY, x1, y1);
    ctx.stroke();

    // Etched transmon capacitor clearance pocket (square opening in ground plane)
    ctx.fillStyle = "#0A0E17";
    ctx.fillRect(x1 - 18, y1 - 18, 36, 36);

    // Planar Transmon Superconducting Niobium Capacitor Pads (#8897AC - metallic film)
    ctx.fillStyle = "#8897AC";
    ctx.fillRect(x1 - 12, y1 - 12, 10, 24);
    ctx.fillRect(x1 + 2, y1 - 12, 10, 24);

    // Central SQUID Loop with Josephson junction weak links
    ctx.fillStyle = "#D1D5DB";
    ctx.fillRect(x1 - 2, y1 - 3, 4, 6);
    ctx.fillStyle = "#0A0E17";
    ctx.fillRect(x1 - 1, y1 - 2, 2, 4);
  }

  // 5. Perimeter Die Wirebond Landing Pads (48 gold pads around die perimeter)
  ctx.fillStyle = "#D4AF37"; // Realistic 24k gold bond pad
  const padW = 12;
  const padH = 16;
  const countPerSide = 12;
  for (let i = 0; i < countPerSide; i++) {
    const offset = 88 + i * (848 / (countPerSide - 1));
    // Top & Bottom pads
    ctx.fillRect(offset - padW / 2, 58, padW, padH);
    ctx.fillRect(offset - padW / 2, 966 - padH, padW, padH);
    // Left & Right pads
    ctx.fillRect(58, offset - padW / 2, padH, padW);
    ctx.fillRect(966 - padH, offset - padW / 2, padH, padW);
  }

  // 6. Common Microwave Readout Feedline Ring (metallic niobium trace)
  ctx.strokeStyle = "#8897AC";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(512, 512, 130, 0, Math.PI * 2);
  ctx.stroke();

  // 7. Lithographic Alignment Fiducial Crosses & Scale Verniers
  ctx.strokeStyle = "#D4AF37";
  ctx.lineWidth = 1.5;
  const fiducialCorners = [
    [82, 82],
    [942, 82],
    [82, 942],
    [942, 942],
  ];
  fiducialCorners.forEach(([cx, cy]) => {
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy);
    ctx.lineTo(cx + 10, cy);
    ctx.moveTo(cx, cy - 10);
    ctx.lineTo(cx, cy + 10);
    ctx.stroke();
    ctx.strokeRect(cx - 14, cy - 14, 28, 28);
  });

  // Micro-scale serial code
  ctx.fillStyle = "#D4AF37";
  ctx.font = "bold 10px monospace";
  ctx.fillText("QPU-156Q-SN2408", 430, 948);

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 16;
  texture.generateMipmaps = true;

  cachedSiliconDie = texture;
  return texture;
}
