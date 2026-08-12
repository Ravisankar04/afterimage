"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { AfterimageStatus } from "@/lib/demo-data";
import { prefersReducedMotion } from "@/lib/motion";
import { statusColor } from "@/lib/cn";

type Props = {
  status: AfterimageStatus;
  position?: [number, number, number];
  scale?: number;
  simplified?: boolean;
};

export function AfterimageObject({
  status,
  position = [0, 0, 0],
  scale = 1,
  simplified = false,
}: Props) {
  const group = useRef<THREE.Group>(null);
  const mesh = useRef<THREE.Mesh>(null);
  const ghost = useRef<THREE.Points>(null);
  const color = statusColor(status);

  const particles = useMemo(() => {
    const count = simplified ? 40 : 120;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 1.2 + Math.random() * 1.4;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }
    return positions;
  }, [simplified]);

  useFrame((state) => {
    if (prefersReducedMotion() || simplified) return;
    const t = state.clock.elapsedTime;
    if (group.current) {
      group.current.rotation.y = t * 0.12;
      group.current.rotation.x = Math.sin(t * 0.2) * 0.08;
    }
    if (mesh.current && status === "CHANGING") {
      const s = 1 + Math.sin(t * 2.2) * 0.06;
      mesh.current.scale.set(s, 1 / s, s);
      mesh.current.rotation.z = Math.sin(t * 1.4) * 0.15;
    }
    if (ghost.current && (status === "GONE" || status === "LAST_SEEN")) {
      ghost.current.rotation.y = -t * 0.25;
    }
  });

  const opacity =
    status === "GONE"
      ? 0.12
      : status === "LAST_SEEN"
        ? 0.35
        : status === "ACTIVE"
          ? 0.92
          : 0.7;

  const wireframe = status === "GONE";
  const contested = status === "CONTESTED";

  return (
    <group ref={group} position={position} scale={scale}>
      {contested ? (
        <>
          <mesh position={[-0.35, 0, 0]}>
            <icosahedronGeometry args={[0.85, 0]} />
            <meshStandardMaterial
              color="#c46b5a"
              roughness={0.45}
              metalness={0.2}
              flatShading
            />
          </mesh>
          <mesh position={[0.35, 0, 0]}>
            <octahedronGeometry args={[0.75, 0]} />
            <meshStandardMaterial
              color="#c4a574"
              roughness={0.35}
              metalness={0.35}
              flatShading
              wireframe
            />
          </mesh>
        </>
      ) : (
        <mesh ref={mesh}>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial
            color={color}
            roughness={status === "ACTIVE" ? 0.35 : 0.7}
            metalness={0.25}
            transparent
            opacity={opacity}
            wireframe={wireframe}
            flatShading
          />
        </mesh>
      )}

      {(status === "GONE" || status === "LAST_SEEN") && (
        <points ref={ghost}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={particles.length / 3}
              array={particles}
              itemSize={3}
            />
          </bufferGeometry>
          <pointsMaterial
            size={simplified ? 0.04 : 0.03}
            color={color}
            transparent
            opacity={0.55}
            sizeAttenuation
            depthWrite={false}
          />
        </points>
      )}
    </group>
  );
}
