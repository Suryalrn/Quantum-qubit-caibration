"use client";

import React, { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { getBrushedMetalTexture, getSiliconDieTexture } from "./proceduralTextures";

interface JosephsonJunction3DProps {
  scrollProgress: number;
}

/**
 * JosephsonJunction3D:
 * Scientifically accurate, photorealistic microscopic hero shot of the
 * Superconductor-Insulator-Superconductor (SIS) Dolan Bridge Josephson Junction:
 * - High-resistivity silicon substrate base with polished crystalline luster
 * - Thin-film niobium ground plane with etched transmon pocket clearance
 * - Bottom Aluminum Electrode (~30nm film thickness, angle-evaporated)
 * - Amorphous AlOx Dielectric Tunnel Barrier (~1.5nm thickness, quantum refractive glow)
 * - Top Aluminum Counter-Electrode (~60nm film thickness, overlap junction)
 * - 12 Animated Cooper-Pair (2e-) bosonic wavepackets streaming across the barrier
 * - Rotating superconducting phase difference indicator (Delta phi = phi1 - phi2)
 * - Precision nanoscale measurement reticle with 100nm scale bar
 */
export default function JosephsonJunction3D({ scrollProgress }: JosephsonJunction3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const cooperGroupRef = useRef<THREE.Group>(null);
  const phaseIndicatorRef = useRef<THREE.Mesh>(null);
  const currentOpacity = useRef<number>(0);
  const currentScale = useRef<number>(0.85);

  const brushedTexture = useMemo(() => getBrushedMetalTexture(), []);
  const siliconTexture = useMemo(() => getSiliconDieTexture(), []);

  // Shared PBR materials
  const materials = useMemo(() => {
    return {
      siliconSubstrate: new THREE.MeshStandardMaterial({
        color: "#080D1A",
        map: siliconTexture,
        metalness: 0.94,
        roughness: 0.10,
        envMapIntensity: 2.4,
        transparent: true,
        opacity: 0,
      }),
      groundPlaneNb: new THREE.MeshStandardMaterial({
        color: "#1E293B",
        metalness: 0.95,
        roughness: 0.16,
        bumpMap: brushedTexture,
        bumpScale: 0.0015,
        transparent: true,
        opacity: 0,
      }),
      aluminumBottom: new THREE.MeshStandardMaterial({
        color: "#E2E8F0",
        metalness: 0.96,
        roughness: 0.16,
        bumpMap: brushedTexture,
        bumpScale: 0.0012,
        envMapIntensity: 2.6,
        transparent: true,
        opacity: 0,
      }),
      aluminumTop: new THREE.MeshStandardMaterial({
        color: "#CBD5E1",
        metalness: 0.96,
        roughness: 0.15,
        bumpMap: brushedTexture,
        bumpScale: 0.0012,
        envMapIntensity: 2.6,
        transparent: true,
        opacity: 0,
      }),
      oxideBarrier: new THREE.MeshPhysicalMaterial({
        color: "#00F0FF",
        emissive: "#06B6D4",
        emissiveIntensity: 0.9,
        roughness: 0.08,
        metalness: 0.1,
        transmission: 0.6,
        thickness: 0.08,
        transparent: true,
        opacity: 0,
      }),
      cooperPairWave: new THREE.MeshBasicMaterial({
        color: "#38BDF8",
        transparent: true,
        opacity: 0,
      }),
      cooperPairCore: new THREE.MeshBasicMaterial({
        color: "#FFFFFF",
        transparent: true,
        opacity: 0,
      }),
      reticleLine: new THREE.LineBasicMaterial({
        color: "#00F0FF",
        transparent: true,
        opacity: 0,
      }),
      dialRing: new THREE.MeshBasicMaterial({
        color: "#6366F1",
        transparent: true,
        opacity: 0,
      }),
    };
  }, [brushedTexture, siliconTexture]);

  // Cooper pair particles (12 paired wavepackets)
  const cooperPairs = useMemo(() => {
    const list = [];
    const count = 12;
    for (let i = 0; i < count; i++) {
      list.push({
        id: i,
        baseY: (Math.random() - 0.5) * 0.12,
        speed: 0.6 + Math.random() * 0.4,
        phaseOffset: (i / count) * Math.PI * 2,
      });
    }
    return list;
  }, []);

  // Measurement reticle geometry
  const reticleGeometry = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const w = 0.44;
    const h = 0.30;
    const c = 0.08;

    // Corner brackets
    // Top-Left
    pts.push(new THREE.Vector3(-w, h, 0.035), new THREE.Vector3(-w + c, h, 0.035));
    pts.push(new THREE.Vector3(-w, h, 0.035), new THREE.Vector3(-w, h - c, 0.035));
    // Top-Right
    pts.push(new THREE.Vector3(w, h, 0.035), new THREE.Vector3(w - c, h, 0.035));
    pts.push(new THREE.Vector3(w, h, 0.035), new THREE.Vector3(w, h - c, 0.035));
    // Bottom-Left
    pts.push(new THREE.Vector3(-w, -h, 0.035), new THREE.Vector3(-w + c, -h, 0.035));
    pts.push(new THREE.Vector3(-w, -h, 0.035), new THREE.Vector3(-w, -h + c, 0.035));
    // Bottom-Right
    pts.push(new THREE.Vector3(w, -h, 0.035), new THREE.Vector3(w - c, -h, 0.035));
    pts.push(new THREE.Vector3(w, -h, 0.035), new THREE.Vector3(w, -h + c, 0.035));

    // 100 nm Dimension Scale Bar at bottom
    pts.push(new THREE.Vector3(-0.15, -h - 0.04, 0.035), new THREE.Vector3(0.15, -h - 0.04, 0.035));
    pts.push(new THREE.Vector3(-0.15, -h - 0.025, 0.035), new THREE.Vector3(-0.15, -h - 0.055, 0.035));
    pts.push(new THREE.Vector3(0.15, -h - 0.025, 0.035), new THREE.Vector3(0.15, -h - 0.055, 0.035));

    return new THREE.BufferGeometry().setFromPoints(pts);
  }, []);

  // Frame-by-frame animation of Cooper pairs, phase angle, and opacity
  useFrame((state) => {
    const p = scrollProgress;
    const t = state.clock.elapsedTime;

    // Displayed during Scene 4 (0.50 -> 0.72)
    let targetOpacity = 0.0;
    let targetScale = 0.85;

    if (p >= 0.52 && p <= 0.74) {
      if (p < 0.58) {
        const frac = (p - 0.52) / 0.06;
        const eased = Math.sin((frac * Math.PI) / 2);
        targetOpacity = eased;
        targetScale = 0.85 + eased * 0.15;
      } else if (p > 0.66) {
        const frac = (p - 0.66) / 0.08;
        const eased = Math.sin((frac * Math.PI) / 2);
        targetOpacity = 1.0 - eased;
        targetScale = 1.0 + eased * 0.1;
      } else {
        targetOpacity = 1.0;
        targetScale = 1.0;
      }
    }

    currentOpacity.current = THREE.MathUtils.lerp(currentOpacity.current, targetOpacity, 0.08);
    currentScale.current = THREE.MathUtils.lerp(currentScale.current, targetScale, 0.08);

    const alpha = currentOpacity.current;

    if (groupRef.current) {
      groupRef.current.visible = alpha > 0.008;
      const s = currentScale.current;
      groupRef.current.scale.set(s, s, s);
    }

    materials.siliconSubstrate.opacity = alpha * 0.95;
    materials.groundPlaneNb.opacity = alpha * 0.92;
    materials.aluminumBottom.opacity = alpha * 0.98;
    materials.aluminumTop.opacity = alpha * 0.98;
    materials.oxideBarrier.opacity = alpha * 0.90;
    materials.cooperPairWave.opacity = alpha * 0.80;
    materials.cooperPairCore.opacity = alpha * 0.98;
    materials.reticleLine.opacity = alpha * 0.80;
    materials.dialRing.opacity = alpha * 0.75;

    // Animate Cooper pairs tunneling through the barrier
    if (cooperGroupRef.current) {
      cooperGroupRef.current.children.forEach((child, i) => {
        const cp = cooperPairs[i % cooperPairs.length];
        const cycle = (t * cp.speed + cp.phaseOffset) % 2.0;
        const xPos = (cycle - 1.0) * 0.28;
        const probAmp = Math.exp(-Math.pow(xPos / 0.10, 2));

        child.position.set(xPos, cp.baseY, 0.022);
        const s = 0.016 * probAmp + 0.005;
        child.scale.set(s, s, s);
      });
    }

    // Animate superconducting phase angle indicator
    if (phaseIndicatorRef.current) {
      phaseIndicatorRef.current.rotation.z = t * 2.8;
    }
  });

  return (
    <group ref={groupRef} position={[0.95, -0.90, 0.25]} rotation={[-0.20, 0, 0]}>
      {/* 1. High-Resistivity Silicon Die Substrate (Expanded Crystalline Wafer Base) */}
      <mesh position={[0, 0, -0.025]}>
        <boxGeometry args={[2.8, 2.0, 0.04]} />
        <primitive object={materials.siliconSubstrate} attach="material" />
      </mesh>

      {/* 2. Thin-Film Niobium Ground Plane with Etched Transmon Pocket Clearance */}
      <mesh position={[0, 0, 0.001]}>
        <ringGeometry args={[0.32, 0.72, 4, 1, Math.PI / 4]} />
        <primitive object={materials.groundPlaneNb} attach="material" />
      </mesh>

      {/* Electron-Beam Lithography Vernier Crosshairs & Fiducial Alignment Marks */}
      {[-0.45, 0.45].map((fx, i) =>
        [-0.32, 0.32].map((fy, j) => (
          <group key={`fiducial-${i}-${j}`} position={[fx, fy, 0.002]}>
            <mesh>
              <planeGeometry args={[0.04, 0.003]} />
              <primitive object={materials.reticleLine} attach="material" />
            </mesh>
            <mesh>
              <planeGeometry args={[0.003, 0.04]} />
              <primitive object={materials.reticleLine} attach="material" />
            </mesh>
          </group>
        ))
      )}

      {/* 3. Bottom Aluminum Superconducting Electrode (Evaporated at -45° Angle) */}
      <group position={[-0.20, 0, 0.010]}>
        {/* Broad Coplanar Waveguide Center Conductor Pad */}
        <mesh position={[-0.06, 0, 0]}>
          <boxGeometry args={[0.26, 0.16, 0.016]} />
          <primitive object={materials.aluminumBottom} attach="material" />
        </mesh>
        {/* Tapered Dolan Bridge Lead Constriction */}
        <mesh position={[0.11, 0, 0]}>
          <boxGeometry args={[0.09, 0.055, 0.016]} />
          <primitive object={materials.aluminumBottom} attach="material" />
        </mesh>
        {/* Sub-Micron Overlap Junction Finger */}
        <mesh position={[0.18, 0, 0]}>
          <boxGeometry args={[0.06, 0.024, 0.016]} />
          <primitive object={materials.aluminumBottom} attach="material" />
        </mesh>
      </group>

      {/* Shadow Evaporation Ghost Artifact Trace (Physical Dolan Bridge Footprint) */}
      <mesh position={[-0.04, 0.045, 0.002]}>
        <planeGeometry args={[0.05, 0.020]} />
        <meshBasicMaterial color="#64748B" transparent opacity={0.25} />
      </mesh>

      {/* 4. Amorphous AlOx Tunnel Barrier (~1.5nm Quantum Dielectric Layer) */}
      <mesh position={[0.005, 0, 0.020]}>
        <boxGeometry args={[0.016, 0.038, 0.022]} />
        <primitive object={materials.oxideBarrier} attach="material" />
      </mesh>

      {/* 5. Top Aluminum Counter-Electrode (Evaporated at +45°, Dolan Bridge Overlap) */}
      <group position={[0.20, 0, 0.024]}>
        {/* Broad Coplanar Waveguide Center Conductor Pad */}
        <mesh position={[0.06, 0, 0]}>
          <boxGeometry args={[0.26, 0.16, 0.016]} />
          <primitive object={materials.aluminumTop} attach="material" />
        </mesh>
        {/* Tapered Dolan Bridge Counter Lead */}
        <mesh position={[-0.11, 0, 0]}>
          <boxGeometry args={[0.09, 0.055, 0.016]} />
          <primitive object={materials.aluminumTop} attach="material" />
        </mesh>
        {/* Overlap Counter Finger Stepping Directly Over the AlOx Barrier */}
        <mesh position={[-0.18, 0, -0.003]}>
          <boxGeometry args={[0.06, 0.024, 0.016]} />
          <primitive object={materials.aluminumTop} attach="material" />
        </mesh>
      </group>

      {/* 6. Cooper-Pair Tunneling Wavepackets (2e- Paired Bosonic States) */}
      <group ref={cooperGroupRef}>
        {cooperPairs.map((cp) => (
          <group key={`cp-${cp.id}`}>
            {/* Wavepacket probability envelope */}
            <mesh>
              <sphereGeometry args={[1, 10, 10]} />
              <primitive object={materials.cooperPairWave} attach="material" />
            </mesh>
            {/* 2e- paired electron cores */}
            <mesh position={[0.35, 0, 0]} scale={[0.3, 0.3, 0.3]}>
              <sphereGeometry args={[1, 6, 6]} />
              <primitive object={materials.cooperPairCore} attach="material" />
            </mesh>
            <mesh position={[-0.35, 0, 0]} scale={[0.3, 0.3, 0.3]}>
              <sphereGeometry args={[1, 6, 6]} />
              <primitive object={materials.cooperPairCore} attach="material" />
            </mesh>
          </group>
        ))}
      </group>

      {/* 7. Nanoscale Measurement Reticle */}
      <lineSegments geometry={reticleGeometry}>
        <primitive object={materials.reticleLine} attach="material" />
      </lineSegments>

      {/* 8. Superconducting Phase Difference Gauge (Delta phi) */}
      <group position={[0.36, 0.24, 0.04]}>
        {/* Circular Dial Ring */}
        <mesh>
          <ringGeometry args={[0.045, 0.055, 32]} />
          <primitive object={materials.dialRing} attach="material" />
        </mesh>
        {/* Rotating Phase Vector Pointer */}
        <mesh ref={phaseIndicatorRef} position={[0, 0, 0.002]}>
          <planeGeometry args={[0.006, 0.045]} />
          <meshBasicMaterial color="#00F0FF" />
        </mesh>
      </group>

      {/* 9. Dedicated Nanoscale Cinema Lighting */}
      <pointLight position={[0, 0, 0.25]} intensity={2.6} color="#00F0FF" distance={1.2} />
      <pointLight position={[0.2, 0.15, 0.2]} intensity={1.8} color="#F8FAFC" distance={1.0} />
    </group>
  );
}
