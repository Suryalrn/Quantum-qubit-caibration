"use client";

import React, { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

interface FinalNetworkProps {
  scrollProgress: number;
}

interface QuantumNode {
  id: number;
  position: [number, number, number];
  scale: number;
  label: string;
}

/**
 * FinalNetwork (Scene 06):
 * Macro-scale distributed quantum computing ecosystem:
 * - 6 satellite quantum processor modules linked to the central dilution refrigerator
 * - Coherent photonic quantum interconnect channels
 * - Traveling quantum photon packets
 * - Ambient quantum field fluctuation particles
 * - Sophisticated, cinematic conclusion to the 3D journey
 */
export default function FinalNetwork({ scrollProgress }: FinalNetworkProps) {
  const groupRef = useRef<THREE.Group>(null);
  const particlesRef = useRef<THREE.Points>(null);
  const packetMeshRef = useRef<THREE.InstancedMesh>(null);
  const currentOpacity = useRef<number>(0);

  // 6 satellite QPU nodes orbiting the central quantum computer (located at X=0.95, Y=0.0)
  const nodes: QuantumNode[] = useMemo(() => [
    { id: 1, position: [-1.9, 1.3, -0.8], scale: 0.65, label: "Sub-QPU α (IBM Heron)" },
    { id: 2, position: [3.6, 1.1, -0.6], scale: 0.65, label: "Sub-QPU β (IBM Eagle)" },
    { id: 3, position: [-1.5, -1.8, 0.4], scale: 0.70, label: "Sub-QPU γ (IBM Falcon)" },
    { id: 4, position: [3.3, -1.6, 0.5], scale: 0.70, label: "Sub-QPU δ (IBM Hummingbird)" },
    { id: 5, position: [0.95, 2.6, -1.5], scale: 0.60, label: "Classical Arbiter (GNN)" },
    { id: 6, position: [0.95, -2.7, -1.2], scale: 0.60, label: "Cryo Storage (Q-RAM)" },
  ], []);

  // Interconnect channels connecting satellite nodes to each other and to the central unit (0.95, 0, 0)
  const links = useMemo(() => {
    const list: [[number, number, number], [number, number, number]][] = [];
    const center: [number, number, number] = [0.95, 0, 0];

    // Connect each node to central machine
    nodes.forEach((n) => {
      list.push([center, n.position]);
    });

    // Outer perimeter ring links
    list.push([nodes[0].position, nodes[4].position]);
    list.push([nodes[1].position, nodes[4].position]);
    list.push([nodes[0].position, nodes[2].position]);
    list.push([nodes[1].position, nodes[3].position]);
    list.push([nodes[2].position, nodes[5].position]);
    list.push([nodes[3].position, nodes[5].position]);

    return list;
  }, [nodes]);

  // Link line geometry
  const linkGeometry = useMemo(() => {
    const pts: number[] = [];
    links.forEach(([p1, p2]) => {
      pts.push(p1[0], p1[1], p1[2]);
      pts.push(p2[0], p2[1], p2[2]);
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return geo;
  }, [links]);

  // Ambient Quantum Field Fluctuation Particles (450 particles)
  const particleField = useMemo(() => {
    const count = 450;
    const pos = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    const cCyan = new THREE.Color("#06B6D4");
    const cIndigo = new THREE.Color("#6366F1");
    const cWhite = new THREE.Color("#F8FAFC");

    for (let i = 0; i < count; i++) {
      const r = 2.5 + Math.random() * 8.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      pos[i * 3] = 0.95 + r * Math.sin(phi) * Math.cos(theta);
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

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((state) => {
    const t = state.clock.elapsedTime * 0.15;

    if (particlesRef.current) {
      particlesRef.current.rotation.y = t * 0.25;
    }

    // Animate photon packets along interconnects
    if (packetMeshRef.current) {
      const time = state.clock.elapsedTime * 1.6;
      links.forEach(([p1, p2], i) => {
        const phase = (time + i * 0.45) % 1;
        const x = THREE.MathUtils.lerp(p1[0], p2[0], phase);
        const y = THREE.MathUtils.lerp(p1[1], p2[1], phase);
        const z = THREE.MathUtils.lerp(p1[2], p2[2], phase);

        dummy.position.set(x, y, z);
        const s = 0.035 + Math.sin(time * 3 + i) * 0.01;
        dummy.scale.set(s, s, s);
        dummy.updateMatrix();
        packetMeshRef.current!.setMatrixAt(i, dummy.matrix);
      });
      packetMeshRef.current.instanceMatrix.needsUpdate = true;
    }

    // Continuous smooth opacity interpolation for Scene 6 reveal
    const p = scrollProgress;
    let target = 0.0;
    if (p >= 0.85) {
      target = Math.min(1.0, (p - 0.85) / 0.08);
    }
    currentOpacity.current = THREE.MathUtils.lerp(currentOpacity.current, target, 0.08);
    const alpha = currentOpacity.current;

    if (groupRef.current) {
      groupRef.current.visible = alpha > 0.008;
    }
  });

  return (
    <group ref={groupRef}>
      {/* 1. Photonic Quantum Interconnect Channels */}
      <lineSegments geometry={linkGeometry}>
        <lineBasicMaterial color="#6366F1" transparent opacity={0.35} />
      </lineSegments>

      {/* 2. Coherent Photon Wave Packets Streaming on Channels */}
      <instancedMesh
        ref={packetMeshRef}
        args={[undefined, undefined, links.length]}
      >
        <sphereGeometry args={[1, 10, 10]} />
        <meshBasicMaterial color="#06B6D4" />
      </instancedMesh>

      {/* 3. Distributed Satellite QPU Module Nodes */}
      {nodes.map((n) => (
        <group key={`sat-node-${n.id}`} position={n.position} scale={n.scale}>
          {/* Miniature Cryogenic Shielded Core */}
          <mesh>
            <cylinderGeometry args={[0.22, 0.22, 0.28, 24]} />
            <meshStandardMaterial color="#1E293B" metalness={0.92} roughness={0.25} />
          </mesh>

          {/* Gold Flange Rim */}
          <mesh position={[0, 0.14, 0]}>
            <cylinderGeometry args={[0.26, 0.26, 0.02, 24]} />
            <meshStandardMaterial color="#E5B869" metalness={0.96} roughness={0.18} />
          </mesh>

          {/* Inner Silicon Die Core */}
          <mesh position={[0, 0.155, 0]}>
            <boxGeometry args={[0.14, 0.01, 0.14]} />
            <meshStandardMaterial color="#06B6D4" emissive="#06B6D4" emissiveIntensity={0.6} />
          </mesh>

          {/* Protective Holographic Quantum Field Ring */}
          <mesh rotation={[Math.PI / 3, Math.PI / 4, 0]}>
            <torusGeometry args={[0.38, 0.008, 12, 36]} />
            <meshBasicMaterial color="#06B6D4" transparent opacity={0.65} />
          </mesh>
          <mesh rotation={[-Math.PI / 3, -Math.PI / 4, 0]}>
            <torusGeometry args={[0.42, 0.006, 12, 36]} />
            <meshBasicMaterial color="#8B5CF6" transparent opacity={0.5} />
          </mesh>
        </group>
      ))}

      {/* 4. Ambient Quantum Fluctuation Particle Field */}
      <points ref={particlesRef} geometry={particleField}>
        <pointsMaterial
          size={0.035}
          vertexColors
          transparent
          opacity={0.65}
          sizeAttenuation
        />
      </points>
    </group>
  );
}
