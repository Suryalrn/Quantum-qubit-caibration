"use client";

import React, { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Text, Float } from "@react-three/drei";

interface CalibrationProps {
  scrollProgress: number; // 0.0 to 1.0
}

/**
 * SCENE 05: Quantum Calibration & State Tomography Visualization
 * Scientifically grounded explanatory visualization:
 * - Holographic Bloch Sphere showing state vector |psi> with Larmor precession
 * - Microwave drive pulse waveforms (X_pi/2 Gaussian DRAG pulse & CZ adiabatic waveform)
 * - Cavity dispersive frequency resonance dip S_21(f)
 * - Quantum coherence parameters (T_1, T_2*, Rabi oscillation Omega_R)
 */
export default function Calibration3D({ scrollProgress }: CalibrationProps) {
  const groupRef = useRef<THREE.Group>(null);
  const vectorRef = useRef<THREE.Group>(null);
  const pulseWaveRef = useRef<THREE.Line>(null);
  const resonanceCurveRef = useRef<THREE.Line>(null);

  // Animate Bloch state vector precession and microwave waveform
  useFrame((state) => {
    const t = state.clock.elapsedTime;

    // State vector precesses around Z-axis with nutation theta
    if (vectorRef.current) {
      const theta = Math.PI / 4 + Math.sin(t * 0.8) * 0.15; // 45 deg polar angle
      const phi = t * 1.5; // Azimuthal precession
      const r = 1.35;

      const x = r * Math.sin(theta) * Math.cos(phi);
      const z = r * Math.sin(theta) * Math.sin(phi);
      const y = r * Math.cos(theta);

      vectorRef.current.position.set(0, 0, 0);
      vectorRef.current.lookAt(x, y, z);
    }

    // Dynamic wave animation for microwave drive pulse
    if (pulseWaveRef.current) {
      const geo = pulseWaveRef.current.geometry as THREE.BufferGeometry;
      const pos = geo.attributes.position as THREE.BufferAttribute;
      const pts = pos.count;

      for (let i = 0; i < pts; i++) {
        const u = (i / pts) * 4 - 2; // -2 to +2
        // Gaussian envelope * carrier sine wave
        const env = Math.exp(-u * u * 1.8);
        const carrier = Math.sin(u * 12 - t * 6);
        pos.setY(i, env * carrier * 0.45);
      }
      pos.needsUpdate = true;
    }
  });

  // Materials
  const materials = useMemo(() => {
    return {
      sphereWire: new THREE.MeshBasicMaterial({
        color: "#6366F1",
        wireframe: true,
        transparent: true,
        opacity: 0.18,
      }),
      equatorRing: new THREE.LineBasicMaterial({
        color: "#06B6D4",
        transparent: true,
        opacity: 0.85,
      }),
      axisLine: new THREE.LineBasicMaterial({
        color: "#94A3B8",
        transparent: true,
        opacity: 0.5,
      }),
      stateVector: new THREE.MeshStandardMaterial({
        color: "#06B6D4",
        emissive: "#06B6D4",
        emissiveIntensity: 0.8,
        metalness: 0.9,
        roughness: 0.1,
      }),
      tipGlow: new THREE.MeshBasicMaterial({
        color: "#F8FAFC",
      }),
      pulseColor: new THREE.LineBasicMaterial({
        color: "#8B5CF6",
        transparent: true,
        opacity: 0.9,
      }),
      resonanceColor: new THREE.LineBasicMaterial({
        color: "#06B6D4",
        transparent: true,
        opacity: 0.85,
      }),
    };
  }, []);

  // Coordinate axes geometry
  const axesGeometry = useMemo(() => {
    const pts = [
      // Z axis (|0> to |1>)
      new THREE.Vector3(0, -1.6, 0),
      new THREE.Vector3(0, 1.6, 0),
      // X axis
      new THREE.Vector3(-1.6, 0, 0),
      new THREE.Vector3(1.6, 0, 0),
      // Y axis
      new THREE.Vector3(0, 0, -1.6),
      new THREE.Vector3(0, 0, 1.6),
    ];
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, []);

  // Equator circle line object
  const equatorLine = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const segments = 64;
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(theta) * 1.35, 0, Math.sin(theta) * 1.35));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    return new THREE.Line(geo, materials.equatorRing);
  }, [materials.equatorRing]);

  // Precession trace line object
  const precessionLine = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const theta = Math.PI / 4;
    const r = 1.35 * Math.sin(theta);
    const y = 1.35 * Math.cos(theta);
    for (let i = 0; i <= 48; i++) {
      const phi = (i / 48) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(phi) * r, y, Math.sin(phi) * r));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineDashedMaterial({
      color: "#8B5CF6",
      dashSize: 0.08,
      gapSize: 0.04,
      transparent: true,
      opacity: 0.65,
    });
    return new THREE.Line(geo, mat);
  }, []);

  // Microwave pulse waveform line
  const pulseLine = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const count = 100;
    for (let i = 0; i < count; i++) {
      const u = (i / count) * 4 - 2;
      pts.push(new THREE.Vector3(u, 0, 0));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    return new THREE.Line(geo, materials.pulseColor);
  }, [materials.pulseColor]);

  // Readout resonator S21 Lorentzian dip line
  const resonanceLine = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const count = 80;
    for (let i = 0; i <= count; i++) {
      const f = (i / count) * 3 - 1.5; // detuning in MHz
      const dip0 = 0.5 / (1 + Math.pow((f + 0.5) * 8, 2));
      const dip1 = 0.5 / (1 + Math.pow((f - 0.5) * 8, 2));
      const y = 0.6 - (dip0 + dip1 * 0.8);
      pts.push(new THREE.Vector3(f * 0.9, y, 0));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    return new THREE.Line(geo, materials.resonanceColor);
  }, [materials.resonanceColor]);

  // Active during Scene 5 (scroll 0.66 to 0.92)
  const isVisible = scrollProgress >= 0.64 && scrollProgress <= 0.94;
  if (!isVisible) return null;

  return (
    <group ref={groupRef} position={[1.1, -0.5, 2.0]}>
      {/* -------------------------------------------------------------
          1. HOLOGRAPHIC BLOCH SPHERE
          ------------------------------------------------------------- */}
      <Float speed={1.2} rotationIntensity={0.1} floatIntensity={0.2}>
        <group position={[-0.9, 0, 0]}>
          {/* Wireframe outer sphere */}
          <mesh>
            <sphereGeometry args={[1.25, 24, 16]} />
            <primitive object={materials.sphereWire} attach="material" />
          </mesh>

          {/* Coordinate Axes */}
          <lineSegments geometry={axesGeometry}>
            <primitive object={materials.axisLine} attach="material" />
          </lineSegments>

          {/* Equator & Meridian Guide Rings */}
          <primitive object={equatorLine} />

          {/* Precession Trajectory Orbit */}
          <primitive object={precessionLine} />

          {/* Dynamic State Vector |psi> Arrow */}
          <group ref={vectorRef}>
            {/* Cylinder shaft */}
            <mesh position={[0, 0, 0.625]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.02, 0.02, 1.25, 12]} />
              <primitive object={materials.stateVector} attach="material" />
            </mesh>
            {/* Cone tip */}
            <mesh position={[0, 0, 1.25]} rotation={[Math.PI / 2, 0, 0]}>
              <coneGeometry args={[0.06, 0.15, 12]} />
              <primitive object={materials.tipGlow} attach="material" />
            </mesh>
          </group>

          {/* Clean Polar State Labels */}
          <Text position={[0, 1.45, 0]} fontSize={0.12} color="#F8FAFC" anchorX="center" anchorY="middle">
            |0⟩
          </Text>
          <Text position={[0, -1.45, 0]} fontSize={0.12} color="#94A3B8" anchorX="center" anchorY="middle">
            |1⟩
          </Text>
        </group>
      </Float>

      {/* -------------------------------------------------------------
          2. MICROWAVE CONTROL PULSE (Gaussian DRAG Waveform)
          ------------------------------------------------------------- */}
      <group position={[1.2, 0.45, 0]}>
        {/* Pulse baseline */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[3.2, 0.005, 0.005]} />
          <meshBasicMaterial color="#334155" />
        </mesh>
        {/* Animated carrier wave */}
        <primitive object={pulseLine} ref={pulseWaveRef} />
      </group>

      {/* -------------------------------------------------------------
          3. CAVITY DISPERSIVE READOUT SPECTRUM S_21(f)
          ------------------------------------------------------------- */}
      <group position={[1.2, -0.65, 0]}>
        {/* Baseline */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[2.8, 0.005, 0.005]} />
          <meshBasicMaterial color="#334155" />
        </mesh>
        {/* Resonance curve with |0> and |1> frequency shift */}
        <primitive object={resonanceLine} ref={resonanceCurveRef} />
      </group>
    </group>
  );
}
