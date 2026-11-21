"use client";

import React, { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";

interface NetworkRevealProps {
  scrollProgress: number; // 0.0 to 1.0
}

interface QuantumNode {
  id: number;
  position: [number, number, number];
  scale: number;
  label: string;
}

/**
 * SCENE 06: The Final Reveal — Multi-Core Quantum Network Architecture
 * Visualizes the macro-scale quantum computing ecosystem:
 * - Distributed quantum processor nodes (QPUs) connected via coherent photonic links
 * - Entanglement bus lines with traveling photon packets
 * - Ambient quantum state fluctuation particle field
 * - Harmonious composition revealing the full intelligent quantum computing architecture
 */
export default function NetworkReveal3D({ scrollProgress }: NetworkRevealProps) {
  const groupRef = useRef<THREE.Group>(null);
  const particlesRef = useRef<THREE.Points>(null);
  const packetMeshRef = useRef<THREE.InstancedMesh>(null);

  // Define 7 distributed QPU core nodes arranged in 3D constellation
  const nodes: QuantumNode[] = useMemo(() => [
    { id: 0, position: [0, 0, 0], scale: 1.2, label: "Core QPU α (Master)" },
    { id: 1, position: [-4.2, 1.8, -1.5], scale: 0.85, label: "Sub-QPU β₁" },
    { id: 2, position: [4.2, 1.6, -1.2], scale: 0.85, label: "Sub-QPU β₂" },
    { id: 3, position: [-3.5, -2.5, 0.5], scale: 0.9, label: "Sub-QPU γ₁" },
    { id: 4, position: [3.8, -2.2, 0.8], scale: 0.9, label: "Sub-QPU γ₂" },
    { id: 5, position: [0, 3.8, -2.5], scale: 0.75, label: "Routing Arbiter" },
    { id: 6, position: [0, -4.2, -1.8], scale: 0.75, label: "Cryo Storage" },
  ], []);

  // Interconnect links between the nodes
  const links = useMemo(() => [
    [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6],
    [1, 5], [2, 5], [1, 3], [2, 4], [3, 6], [4, 6],
  ], []);

  // Link lines geometry
  const linkGeometry = useMemo(() => {
    const pts: number[] = [];
    links.forEach(([srcIdx, tgtIdx]) => {
      const p1 = nodes[srcIdx].position;
      const p2 = nodes[tgtIdx].position;
      pts.push(p1[0], p1[1], p1[2]);
      pts.push(p2[0], p2[1], p2[2]);
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return geo;
  }, [nodes, links]);

  // Ambient Quantum Fluctuation Particle Field (600 particles)
  const particleField = useMemo(() => {
    const count = 600;
    const pos = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    const cCyan = new THREE.Color("#06B6D4");
    const cIndigo = new THREE.Color("#6366F1");
    const cWhite = new THREE.Color("#F8FAFC");

    for (let i = 0; i < count; i++) {
      const r = 4 + Math.random() * 14;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);

      const mix = Math.random();
      const col = mix < 0.5 ? cCyan : mix < 0.85 ? cIndigo : cWhite;
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return geo;
  }, []);

  // Animate constellation rotation and flying photon packets
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((state) => {
    const t = state.clock.elapsedTime * 0.15;

    if (groupRef.current) {
      groupRef.current.rotation.y = t * 0.4;
      groupRef.current.rotation.x = Math.sin(t * 0.5) * 0.08;
    }

    if (particlesRef.current) {
      particlesRef.current.rotation.y = -t * 0.2;
    }

    // Animate traveling photon packets along links
    if (packetMeshRef.current) {
      const time = state.clock.elapsedTime * 1.8;
      links.forEach(([srcIdx, tgtIdx], i) => {
        const p1 = nodes[srcIdx].position;
        const p2 = nodes[tgtIdx].position;
        const phase = (time + i * 0.7) % 1; // 0 to 1

        const x = THREE.MathUtils.lerp(p1[0], p2[0], phase);
        const y = THREE.MathUtils.lerp(p1[1], p2[1], phase);
        const z = THREE.MathUtils.lerp(p1[2], p2[2], phase);

        dummy.position.set(x, y, z);
        const s = 0.08 + Math.sin(time * 3 + i) * 0.02;
        dummy.scale.set(s, s, s);
        dummy.updateMatrix();
        packetMeshRef.current!.setMatrixAt(i, dummy.matrix);
      });
      packetMeshRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  // Only render during final reveal (scroll progress >= 0.80)
  const isVisible = scrollProgress >= 0.78;
  if (!isVisible) return null;

  // Calculate fade-in opacity for smooth entry
  const opacity = Math.min(1, Math.max(0, (scrollProgress - 0.78) / 0.1));

  return (
    <group ref={groupRef} position={[0, 0, -2]}>
      {/* 1. Ambient Cosmic Quantum Particle Field */}
      <points ref={particlesRef} geometry={particleField}>
        <pointsMaterial
          size={0.07}
          vertexColors
          transparent
          opacity={0.7 * opacity}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* 2. Coherent Interconnect Links */}
      <lineSegments geometry={linkGeometry}>
        <lineBasicMaterial
          color="#6366F1"
          transparent
          opacity={0.45 * opacity}
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>

      {/* 3. Traveling Quantum Photon Packets */}
      <instancedMesh ref={packetMeshRef} args={[undefined, undefined, links.length]}>
        <sphereGeometry args={[1, 12, 12]} />
        <meshBasicMaterial
          color="#06B6D4"
          transparent
          opacity={0.9 * opacity}
          blending={THREE.AdditiveBlending}
        />
      </instancedMesh>

      {/* 4. Distributed QPU Core Nodes */}
      {nodes.map((node) => (
        <Float key={node.id} speed={1.5} rotationIntensity={0.2} floatIntensity={0.3}>
          <group position={node.position}>
            {/* Core Geodesic Outer Shell */}
            <mesh>
              <icosahedronGeometry args={[0.45 * node.scale, 2]} />
              <meshBasicMaterial
                color={node.id === 0 ? "#06B6D4" : "#6366F1"}
                wireframe
                transparent
                opacity={0.4 * opacity}
              />
            </mesh>

            {/* Glowing Nucleus */}
            <mesh>
              <sphereGeometry args={[0.22 * node.scale, 16, 16]} />
              <meshStandardMaterial
                color={node.id === 0 ? "#06B6D4" : "#8B5CF6"}
                emissive={node.id === 0 ? "#06B6D4" : "#8B5CF6"}
                emissiveIntensity={1.2 * opacity}
                roughness={0.1}
                metalness={0.9}
              />
            </mesh>

            {/* Orbiting Equatorial Coherence Ring */}
            <mesh rotation={[Math.PI / 3, 0, 0]}>
              <ringGeometry args={[0.55 * node.scale, 0.58 * node.scale, 32]} />
              <meshBasicMaterial
                color="#F8FAFC"
                side={THREE.DoubleSide}
                transparent
                opacity={0.35 * opacity}
              />
            </mesh>
          </group>
        </Float>
      ))}
    </group>
  );
}
