"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { prefersReducedMotion } from "@/lib/motion";

export type DisappearStage =
  | "REAL"
  | "OBSERVED"
  | "DOCUMENTED"
  | "DISAPPEARING"
  | "GONE"
  | "REMEMBERED"
  | "AFTERIMAGE";

type Props = {
  stage: DisappearStage;
  simplified?: boolean;
};

const STAGE_MAP: Record<
  DisappearStage,
  { opacity: number; wire: boolean; scale: number; disperse: number }
> = {
  REAL: { opacity: 1, wire: false, scale: 1, disperse: 0 },
  OBSERVED: { opacity: 0.9, wire: false, scale: 1.02, disperse: 0.05 },
  DOCUMENTED: { opacity: 0.75, wire: false, scale: 0.98, disperse: 0.12 },
  DISAPPEARING: { opacity: 0.4, wire: true, scale: 1.1, disperse: 0.55 },
  GONE: { opacity: 0.08, wire: true, scale: 1.25, disperse: 1 },
  REMEMBERED: { opacity: 0.22, wire: true, scale: 1.05, disperse: 0.7 },
  AFTERIMAGE: { opacity: 0.55, wire: false, scale: 0.92, disperse: 0.2 },
};

export function DisappearingObject({ stage, simplified = false }: Props) {
  const mesh = useRef<THREE.Mesh>(null);
  const shell = useRef<THREE.Mesh>(null);
  const target = STAGE_MAP[stage];
  const current = useRef({ ...target });

  useFrame((state, delta) => {
    const damp = prefersReducedMotion() ? 1 : 1 - Math.exp(-3 * delta);
    current.current.opacity += (target.opacity - current.current.opacity) * damp;
    current.current.scale += (target.scale - current.current.scale) * damp;
    current.current.disperse +=
      (target.disperse - current.current.disperse) * damp;

    const t = state.clock.elapsedTime;
    if (mesh.current) {
      const mat = mesh.current.material as THREE.MeshStandardMaterial;
      mat.opacity = current.current.opacity;
      mat.wireframe = target.wire;
      const s = current.current.scale;
      const j =
        !simplified && !prefersReducedMotion() && stage === "DISAPPEARING"
          ? Math.sin(t * 8) * 0.03
          : 0;
      mesh.current.scale.setScalar(s + j);
      if (!prefersReducedMotion() && !simplified) {
        mesh.current.rotation.y = t * (0.15 + current.current.disperse * 0.4);
        mesh.current.rotation.x = Math.sin(t * 0.4) * 0.15;
      }
    }
    if (shell.current) {
      const mat = shell.current.material as THREE.MeshBasicMaterial;
      mat.opacity = current.current.disperse * 0.35;
      shell.current.scale.setScalar(1.3 + current.current.disperse * 0.8);
    }
  });

  return (
    <group>
      <mesh ref={mesh}>
        <icosahedronGeometry args={[1.15, simplified ? 0 : 1]} />
        <meshStandardMaterial
          color="#c4a574"
          roughness={0.4}
          metalness={0.3}
          transparent
          opacity={1}
          flatShading
        />
      </mesh>
      <mesh ref={shell}>
        <icosahedronGeometry args={[1.15, 0]} />
        <meshBasicMaterial
          color="#f2efe8"
          wireframe
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
