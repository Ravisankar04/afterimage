export type DurationKey = "instant" | "fast" | "base" | "slow" | "glacial";

export const duration: Record<DurationKey, number> = {
  instant: 0.12,
  fast: 0.28,
  base: 0.55,
  slow: 0.9,
  glacial: 1.6,
};

export const easing = {
  out: [0.16, 1, 0.3, 1] as const,
  inOut: [0.65, 0, 0.35, 1] as const,
  soft: [0.22, 1, 0.36, 1] as const,
  cinematic: [0.77, 0, 0.175, 1] as const,
};

export const stagger = {
  tight: 0.04,
  base: 0.08,
  loose: 0.14,
  section: 0.22,
};

export const spring = {
  snappy: { type: "spring" as const, stiffness: 380, damping: 32 },
  soft: { type: "spring" as const, stiffness: 180, damping: 28 },
  heavy: { type: "spring" as const, stiffness: 90, damping: 22 },
};

export const pageTransition = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
  transition: {
    duration: duration.base,
    ease: easing.out,
  },
};

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function motionScale(multiplier = 1): number {
  return prefersReducedMotion() ? 0 : multiplier;
}

export function safeDuration(seconds: number): number {
  return prefersReducedMotion() ? 0.01 : seconds;
}

export function isLowPowerDevice(): boolean {
  if (typeof window === "undefined") return false;
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean; effectiveType?: string };
  };
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const narrow = window.matchMedia("(max-width: 768px)").matches;
  const saveData = Boolean(nav.connection?.saveData);
  const slowNet = ["slow-2g", "2g", "3g"].includes(
    nav.connection?.effectiveType ?? "",
  );
  const lowMem = typeof nav.deviceMemory === "number" && nav.deviceMemory <= 4;
  return coarse || narrow || saveData || slowNet || lowMem;
}
