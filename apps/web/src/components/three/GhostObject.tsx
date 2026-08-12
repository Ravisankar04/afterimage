"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { prefersReducedMotion } from "@/lib/motion";

type Props = {
  count?: number;
  color?: string;
  radius?: number;
};

export function GhostObject({
  count = 180,
  color = "#f2efe8",
  radius = 1.6,
}: Props) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const t = i / count;
      const spiral = t * Math.PI * 6;
      arr[i * 3] = Math.cos(spiral) * radius * (0.4 + t);
      arr[i * 3 + 1] = (t - 0.5) * radius * 2.2;
      arr[i * 3 + 2] = Math.sin(spiral) * radius * (0.4 + t);
    }
    return arr;
  }, [count, radius]);

  useFrame((state) => {
    if (prefersReducedMotion() || !ref.current) return;
    ref.current.rotation.y = state.clock.elapsedTime * 0.08;
    const mat = ref.current.material as THREE.PointsMaterial;
    mat.opacity = 0.25 + Math.sin(state.clock.elapsedTime * 0.7) * 0.12;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.035}
        color={color}
        transparent
        opacity={0.35}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}
