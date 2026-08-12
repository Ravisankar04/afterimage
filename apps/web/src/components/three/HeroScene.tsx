"use client";

import {
  Suspense,
  useEffect,
  useMemo,
  useState,
  type MutableRefObject,
} from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, PerspectiveCamera } from "@react-three/drei";
import {
  DisappearingObject,
  type DisappearStage,
} from "@/components/three/DisappearingObject";
import { MemoryParticles } from "@/components/three/MemoryParticles";
import { GhostObject } from "@/components/three/GhostObject";
import { isLowPowerDevice, prefersReducedMotion } from "@/lib/motion";

const STAGES: DisappearStage[] = [
  "REAL",
  "OBSERVED",
  "DOCUMENTED",
  "DISAPPEARING",
  "GONE",
  "REMEMBERED",
  "AFTERIMAGE",
];

export const HERO_STAGE_LABELS = [
  "REAL",
  "OBSERVED",
  "DOCUMENTED",
  "DISAPPEARING",
  "GONE",
  "BUT NOT FORGOTTEN",
  "AFTERIMAGE",
] as const;

type Props = {
  progressRef?: MutableRefObject<number>;
  className?: string;
};

export function HeroScene({ progressRef, className }: Props) {
  const [stageIndex, setStageIndex] = useState(0);
  const [simplified, setSimplified] = useState(false);
  const reduced = useMemo(
    () => (typeof window !== "undefined" ? prefersReducedMotion() : false),
    [],
  );

  useEffect(() => {
    setSimplified(isLowPowerDevice() || prefersReducedMotion());
  }, []);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const p = progressRef?.current ?? 0;
      const idx = Math.min(
        STAGES.length - 1,
        Math.max(0, Math.floor(p * STAGES.length)),
      );
      setStageIndex(idx);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [progressRef]);

  const stage = STAGES[stageIndex];

  return (
    <div className={className} aria-hidden>
      <Canvas dpr={simplified ? [1, 1.25] : [1, 1.75]} gl={{ antialias: true }}>
        <PerspectiveCamera makeDefault position={[0, 0.2, 4.2]} fov={42} />
        <color attach="background" args={["#0a0a0a"]} />
        <ambientLight intensity={0.35} />
        <directionalLight position={[4, 6, 2]} intensity={1.1} color="#f2efe8" />
        <directionalLight position={[-3, -2, -4]} intensity={0.35} color="#c4a574" />
        <Suspense fallback={null}>
          <DisappearingObject stage={stage} simplified={simplified || reduced} />
          {!simplified && !reduced && (
            <>
              <MemoryParticles count={220} spread={7} />
              {(stage === "GONE" || stage === "REMEMBERED") && (
                <GhostObject count={140} />
              )}
              <Environment preset="night" />
            </>
          )}
        </Suspense>
      </Canvas>
      <div className="pointer-events-none absolute bottom-8 left-1/2 -translate-x-1/2">
        <p className="font-mono text-[10px] tracking-[0.35em] text-muted">
          {HERO_STAGE_LABELS[stageIndex]}
        </p>
      </div>
    </div>
  );
}
