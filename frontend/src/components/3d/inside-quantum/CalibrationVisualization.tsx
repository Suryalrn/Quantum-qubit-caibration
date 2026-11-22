"use client";

import React, { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

interface CalibrationVisualizationProps {
  scrollProgress: number;
}

/**
 * CalibrationVisualization (Scene 05):
 * Explanatory mathematical state tomography & qubit calibration:
 * - Holographic Bloch Sphere showing state vector |psi> with Larmor precession
 * - Microwave drive pulse waveforms (X_pi/2 Gaussian DRAG pulse envelope)
 * - Readout cavity dispersive frequency resonance shift |S_21(f)|
 * - Positioned on the right side of the screen ([0.85, -0.2, 0.4]) to perfectly balance editorial text
 */
export default function CalibrationVisualization({ scrollProgress }: CalibrationVisualizationProps) {
  const groupRef = useRef<THREE.Group>(null);
  const vectorRef = useRef<THREE.Group>(null);
  const pulseWaveRef = useRef<THREE.Line>(null);
  const currentOpacity = useRef<number>(0);

  // Materials
  const materials = useMemo(() => {
    return {
      sphereWire: new THREE.MeshBasicMaterial({
        color: "#6366F1",
        wireframe: true,
        transparent: true,
        opacity: 0.12,
      }),
      equatorRing: new THREE.LineBasicMaterial({
        color: "#06B6D4",
        transparent: true,
        opacity: 0.75,
      }),
      equatorDisk: new THREE.MeshBasicMaterial({
        color: "#06B6D4",
        transparent: true,
        opacity: 0.04,
        side: THREE.DoubleSide,
      }),
      axisLine: new THREE.LineBasicMaterial({
        color: "#94A3B8",
        transparent: true,
        opacity: 0.45,
      }),
      stateVector: new THREE.MeshStandardMaterial({
        color: "#06B6D4",
        emissive: "#06B6D4",
        emissiveIntensity: 1.2,
        metalness: 0.9,
        roughness: 0.1,
      }),
      tipGlow: new THREE.MeshBasicMaterial({
        color: "#F8FAFC",
      }),
      probabilityCloud: new THREE.MeshBasicMaterial({
        color: "#06B6D4",
        transparent: true,
        opacity: 0.35,
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

  // Coordinate axes
  const axesGeometry = useMemo(() => {
    const pts = [
      new THREE.Vector3(0, -0.95, 0),
      new THREE.Vector3(0, 0.95, 0),
      new THREE.Vector3(-0.95, 0, 0),
      new THREE.Vector3(0.95, 0, 0),
      new THREE.Vector3(0, 0, -0.95),
      new THREE.Vector3(0, 0, 0.95),
    ];
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, []);

  // Equator circle line
  const equatorLine = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const segments = 64;
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(theta) * 0.8, 0, Math.sin(theta) * 0.8));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    return new THREE.Line(geo, materials.equatorRing);
  }, [materials.equatorRing]);

  // Precession trajectory orbit line
  const precessionLine = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const theta = Math.PI / 4;
    const r = 0.8 * Math.sin(theta);
    const y = 0.8 * Math.cos(theta);
    for (let i = 0; i <= 64; i++) {
      const phi = (i / 64) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(phi) * r, y, Math.sin(phi) * r));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineDashedMaterial({
      color: "#8B5CF6",
      dashSize: 0.05,
      gapSize: 0.03,
      transparent: true,
      opacity: 0.7,
    });
    return new THREE.Line(geo, mat);
  }, []);

  // Microwave pulse line (Gaussian DRAG envelope)
  const pulseLine = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const count = 90;
    for (let i = 0; i < count; i++) {
      const u = (i / count) * 4 - 2;
      pts.push(new THREE.Vector3(u * 0.55, 0, 0));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    return new THREE.Line(geo, materials.pulseColor);
  }, [materials.pulseColor]);

  // Readout resonator S21 Lorentzian dip line
  const resonanceLine = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const count = 70;
    for (let i = 0; i <= count; i++) {
      const f = (i / count) * 2 - 1.0;
      const dip0 = 0.35 / (1 + Math.pow((f + 0.35) * 8, 2));
      const dip1 = 0.35 / (1 + Math.pow((f - 0.35) * 8, 2));
      const y = 0.35 - (dip0 + dip1 * 0.75);
      pts.push(new THREE.Vector3(f * 0.85, y, 0));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    return new THREE.Line(geo, materials.resonanceColor);
  }, [materials.resonanceColor]);

  // Animate state vector precession & microwave pulse
  useFrame((state) => {
    const t = state.clock.elapsedTime;

    if (vectorRef.current) {
      const theta = Math.PI / 4 + Math.sin(t * 0.4) * 0.12;
      const phi = t * 1.2;
      const r = 0.8;

      const x = r * Math.sin(theta) * Math.cos(phi);
      const y = r * Math.cos(theta);
      const z = r * Math.sin(theta) * Math.sin(phi);

      vectorRef.current.lookAt(x, y, z);
    }

    if (pulseWaveRef.current) {
      const positions = pulseWaveRef.current.geometry.attributes.position as THREE.BufferAttribute;
      const count = 90;
      for (let i = 0; i < count; i++) {
        const u = (i / count) * 4 - 2;
        // Gaussian envelope
        const env = Math.exp(-u * u * 2.2);
        // High frequency carrier oscillation
        const y = Math.sin(u * 14 - t * 6) * env * 0.32;
        positions.setY(i, y);
      }
      positions.needsUpdate = true;
    }

    // Continuous smooth opacity interpolation
    const p = scrollProgress;
    let target = 0.0;
    if (p >= 0.70 && p <= 0.90) {
      if (p < 0.76) {
        target = (p - 0.70) / 0.06;
      } else if (p > 0.84) {
        target = (0.90 - p) / 0.06;
      } else {
        target = 1.0;
      }
    }

    currentOpacity.current = THREE.MathUtils.lerp(currentOpacity.current, target, 0.08);
    const alpha = currentOpacity.current;

    if (groupRef.current) {
      groupRef.current.visible = alpha > 0.008;
    }

    materials.sphereWire.opacity = alpha * 0.12;
    materials.equatorRing.opacity = alpha * 0.75;
    materials.equatorDisk.opacity = alpha * 0.04;
    materials.axisLine.opacity = alpha * 0.45;
    materials.probabilityCloud.opacity = alpha * 0.35;
    materials.pulseColor.opacity = alpha * 0.90;
    materials.resonanceColor.opacity = alpha * 0.85;
  });

  return (
    <group ref={groupRef} position={[0.95, -0.05, 0.2]}>
      {/* 1. Holographic Bloch Sphere */}
      <group position={[0, 0.35, 0]}>
        {/* Wireframe Coordinate Sphere */}
        <mesh>
          <sphereGeometry args={[0.8, 24, 24]} />
          <primitive object={materials.sphereWire} attach="material" />
        </mesh>

        {/* Equatorial Disc & Boundary Ring */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.8, 48]} />
          <primitive object={materials.equatorDisk} attach="material" />
        </mesh>
        <primitive object={equatorLine} />

        {/* Orthogonal Axes */}
        <lineSegments geometry={axesGeometry} material={materials.axisLine} />

        {/* Larmor Precession Trajectory Orbit */}
        <primitive object={precessionLine} />

        {/* Animated State Vector |psi> */}
        <group ref={vectorRef}>
          {/* Shaft */}
          <mesh position={[0, 0, 0.4]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.007, 0.007, 0.8, 12]} />
            <primitive object={materials.stateVector} attach="material" />
          </mesh>
          {/* Vector Arrowhead Tip */}
          <mesh position={[0, 0, 0.8]} rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.024, 0.06, 12]} />
            <primitive object={materials.tipGlow} attach="material" />
          </mesh>
          {/* Probability Cloud Orb */}
          <mesh position={[0, 0, 0.8]}>
            <sphereGeometry args={[0.045, 16, 16]} />
            <primitive object={materials.probabilityCloud} attach="material" />
          </mesh>
        </group>
      </group>

      {/* 2. Microwave DRAG Pulse Envelope Waveform Display (Mounted cleanly below sphere) */}
      <group position={[0, -0.55, 0]}>
        <primitive object={pulseLine} ref={pulseWaveRef} />

        {/* Axis Baseline */}
        <lineSegments>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={2}
              array={new Float32Array([-1.1, 0, 0, 1.1, 0, 0])}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#334155" transparent opacity={0.6} />
        </lineSegments>
      </group>

      {/* 3. Dispersive Readout Cavity Resonance Curve |S_21(f)| */}
      <group position={[0, -0.95, 0]}>
        <primitive object={resonanceLine} />
      </group>
    </group>
  );
}
