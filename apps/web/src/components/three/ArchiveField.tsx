"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Afterimage } from "@/lib/demo-data";
import { statusColor } from "@/lib/cn";
import { prefersReducedMotion } from "@/lib/motion";

type Props = {
  items: Afterimage[];
  highlightId?: string | null;
  onSelect?: (id: string) => void;
  simplified?: boolean;
};

export function ArchiveField({
  items,
  highlightId,
  onSelect,
  simplified = false,
}: Props) {
  const group = useRef<THREE.Group>(null);

  const points = useMemo(
    () =>
      items.map((item) => ({
        id: item.id,
        position: [
          (item.fieldX - 50) / 12,
          (50 - item.fieldY) / 14,
          ((item.yearObserved % 10) - 5) / 4,
        ] as [number, number, number],
        color: statusColor(item.status),
        status: item.status,
      })),
    [items],
  );

  useFrame((state) => {
    if (prefersReducedMotion() || simplified || !group.current) return;
    group.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.08) * 0.12;
  });

  return (
    <group ref={group}>
      {points.map((p) => {
        const active = highlightId === p.id;
        return (
          <mesh
            key={p.id}
            position={p.position}
            scale={active ? 1.45 : 1}
            onClick={(e) => {
              e.stopPropagation();
              onSelect?.(p.id);
            }}
            onPointerOver={(e) => {
              e.stopPropagation();
              document.body.style.cursor = "pointer";
            }}
            onPointerOut={() => {
              document.body.style.cursor = "auto";
            }}
          >
            <sphereGeometry args={[0.08, 12, 12]} />
            <meshStandardMaterial
              color={p.color}
              emissive={p.color}
              emissiveIntensity={active ? 0.6 : 0.15}
              transparent
              opacity={p.status === "GONE" ? 0.35 : 0.9}
              wireframe={p.status === "GONE"}
            />
          </mesh>
        );
      })}
      {!simplified && (
        <lineSegments>
          <edgesGeometry
            args={[new THREE.BoxGeometry(10, 8, 4)]}
          />
          <lineBasicMaterial color="#f2efe8" transparent opacity={0.08} />
        </lineSegments>
      )}
    </group>
  );
}
