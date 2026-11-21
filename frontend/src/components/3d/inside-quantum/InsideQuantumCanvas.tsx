"use client";

import React, { useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Environment, ContactShadows } from "@react-three/drei";
import QuantumComputer from "./QuantumComputer";
import ProcessorChip from "./ProcessorChip";
import QubitArray from "./QubitArray";
import CalibrationVisualization from "./CalibrationVisualization";
import FinalNetwork from "./FinalNetwork";

interface InsideQuantumCanvasProps {
  scrollProgress: number; // 0.0 to 1.0
  interactive?: boolean; // OrbitControls mode
}

interface Waypoint {
  t: number;
  pos: [number, number, number];
  target: [number, number, number];
  fov: number;
}

/**
 * Coordinated Continuous Camera Waypoints:
 * - Scene 01 (Hero): Wide 3/4 angle framing the full height of the golden chandelier on the right
 * - Scene 02 (Descent): Approaching cutaway thermal shields, braided copper straps & mixing chamber
 * - Scene 03 (Processor): Macro push-in on silicon die, gold wire bonds, and ceramic carrier package
 * - Scene 04 (Qubit Architecture): Ultra-macro surface sweep across planar transmon pockets & CPW traces
 * - Scene 05 (Calibration): Explanatory holographic Bloch sphere & microwave pulse train on the right
 * - Scene 06 (Final Reveal): Panoramic pullback revealing the central machine in a distributed quantum network
 */
const WAYPOINTS: Waypoint[] = [
  {
    t: 0.0,
    pos: [-0.35, 0.25, 4.8],
    target: [0.95, 0.05, 0.0],
    fov: 38,
  },
  {
    t: 0.20,
    pos: [0.18, -0.28, 2.85],
    target: [0.95, -0.22, 0.0],
    fov: 35,
  },
  {
    t: 0.42,
    pos: [0.80, -1.35, 0.65],
    target: [1.05, -1.45, 0.0],
    fov: 30,
  },
  {
    t: 0.62,
    pos: [0.92, -1.38, 0.35],
    target: [1.05, -1.45, 0.018],
    fov: 28,
  },
  {
    t: 0.80,
    pos: [-0.05, -0.05, 3.5],
    target: [0.95, -0.05, 0.2],
    fov: 36,
  },
  {
    t: 1.0,
    pos: [0.0, 0.65, 7.2],
    target: [0.95, 0.1, 0.0],
    fov: 42,
  },
];

/**
 * Centered Camera Controller coordinating continuous spline interpolation
 */
function CameraFlightController({
  scrollProgress,
  interactive,
}: {
  scrollProgress: number;
  interactive: boolean;
}) {
  const { camera } = useThree();
  const currentLookAt = useRef(new THREE.Vector3(0.95, 0.05, 0.0));
  const desiredPos = useRef(new THREE.Vector3());
  const desiredLookAt = useRef(new THREE.Vector3());

  useFrame((state) => {
    if (interactive) return;

    const p = Math.min(1, Math.max(0, scrollProgress));

    // Find bounding waypoints
    let i0 = 0;
    while (i0 < WAYPOINTS.length - 2 && WAYPOINTS[i0 + 1].t < p) {
      i0++;
    }
    const i1 = i0 + 1;
    const w0 = WAYPOINTS[i0];
    const w1 = WAYPOINTS[i1];

    const segSpan = w1.t - w0.t;
    const rawLocalT = segSpan > 0 ? (p - w0.t) / segSpan : 0;
    // Smooth cosine interpolation
    const localT = (1 - Math.cos(rawLocalT * Math.PI)) * 0.5;

    // Adapt distance for mobile portrait
    const isPortrait = state.size.width < 768 && state.size.height > state.size.width;
    const distScale = isPortrait ? 1.35 : 1.0;

    // Interpolate camera position
    desiredPos.current.set(
      THREE.MathUtils.lerp(w0.pos[0], w1.pos[0], localT) * (isPortrait ? 0.6 : 1.0),
      THREE.MathUtils.lerp(w0.pos[1], w1.pos[1], localT),
      THREE.MathUtils.lerp(w0.pos[2], w1.pos[2], localT) * distScale
    );

    // Subtle responsive mouse parallax
    const px = state.pointer.x * 0.22;
    const py = state.pointer.y * 0.16;
    desiredPos.current.x += px;
    desiredPos.current.y += py;

    // Interpolate target lookAt
    desiredLookAt.current.set(
      THREE.MathUtils.lerp(w0.target[0], w1.target[0], localT),
      THREE.MathUtils.lerp(w0.target[1], w1.target[1], localT),
      THREE.MathUtils.lerp(w0.target[2], w1.target[2], localT)
    );

    // Smooth Lerp
    camera.position.lerp(desiredPos.current, 0.065);
    currentLookAt.current.lerp(desiredLookAt.current, 0.065);
    camera.lookAt(currentLookAt.current);

    // Interpolate FOV
    const persp = camera as THREE.PerspectiveCamera;
    if (persp.fov) {
      const targetFov = THREE.MathUtils.lerp(w0.fov, w1.fov, localT);
      persp.fov = THREE.MathUtils.lerp(persp.fov, targetFov, 0.065);
      persp.updateProjectionMatrix();
    }
  });

  return null;
}

/**
 * Master Canvas for "INSIDE THE QUANTUM"
 */
export default function InsideQuantumCanvas({
  scrollProgress,
  interactive = false,
}: InsideQuantumCanvasProps) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.2;
      }}
      className="w-full h-full"
    >
      <PerspectiveCamera makeDefault position={[-0.35, 0.25, 4.8]} fov={38} />

      {/* Realistic Image-Based Lighting (IBL) Environment Map */}
      <Environment preset="city" environmentIntensity={0.8} />

      {/* Cinematic Studio Lighting with Realistic Shadows */}
      <ambientLight intensity={0.55} color="#0A0F24" />

      {/* Key Light: High-quality directional light with soft shadow mapping */}
      <directionalLight
        position={[4.2, 5.5, 4.5]}
        intensity={2.8}
        color="#F1F5F9"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0001}
      />

      {/* Cyan Fill Light: Cryogenic laboratory ambient reflection */}
      <directionalLight
        position={[-4.5, -0.8, 3.2]}
        intensity={1.6}
        color="#06B6D4"
      />

      {/* Electric Indigo Rim Light: High-contrast silhouette edge separation */}
      <directionalLight
        position={[0.5, -2.5, -4.0]}
        intensity={2.2}
        color="#6366F1"
      />

      {/* Warm 24k Gold Uplight for Stage Plates */}
      <pointLight position={[0.95, 0.1, 1.2]} intensity={2.0} color="#F59E0B" distance={5.0} />

      {/* Micro-Glow at the Silicon QPU Substrate */}
      <pointLight position={[0.95, -1.45, 0.35]} intensity={2.2} color="#06B6D4" distance={2.5} />

      {/* Soft Floor Contact Shadow for Realistic Grounding */}
      <ContactShadows
        position={[0.95, -2.1, 0]}
        opacity={0.65}
        scale={6.5}
        blur={2.4}
        far={4.5}
        color="#080B18"
      />

      {/* All 6 Continuous Scenes in Cohesive Spatial Assembly */}
      <group>
        {/* Physical Cryogenic Hardware Assembly */}
        <group>
          {/* Scenes 01 & 02 & 06: Complete Golden Dilution Chandelier */}
          <QuantumComputer scrollProgress={scrollProgress} />

          {/* Scene 03: High-Resistivity Silicon Processor & Wirebonds */}
          <ProcessorChip scrollProgress={scrollProgress} />

          {/* Scene 04: Heavy-Hex Transmon Qubit Lattice & Active Packets */}
          <QubitArray scrollProgress={scrollProgress} />
        </group>

        {/* Scene 05: Explanatory Mathematical State Tomography & Pulse Waveform */}
        <CalibrationVisualization scrollProgress={scrollProgress} />

        {/* Scene 06: Distributed Multi-Core Quantum Network Ecosystem */}
        <FinalNetwork scrollProgress={scrollProgress} />
      </group>

      {/* Centralized Camera Controller */}
      <CameraFlightController scrollProgress={scrollProgress} interactive={interactive} />

      {/* Free Orbit Controls Mode when toggled */}
      {interactive && (
        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.06}
          minDistance={0.8}
          maxDistance={12}
          target={[0.95, 0.0, 0.0]}
        />
      )}
    </Canvas>
  );
}
