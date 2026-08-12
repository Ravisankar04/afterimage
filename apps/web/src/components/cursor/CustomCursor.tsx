"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

export function CustomCursor() {
  const [pos, setPos] = useState({ x: -100, y: -100 });
  const [label, setLabel] = useState("");
  const [visible, setVisible] = useState(false);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    const touch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    setEnabled(fine && !touch);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const onMove = (e: MouseEvent) => {
      setPos({ x: e.clientX, y: e.clientY });
      setVisible(true);
      const el = (e.target as HTMLElement | null)?.closest?.(
        "[data-cursor]",
      ) as HTMLElement | null;
      setLabel(el?.dataset.cursor ?? "");
    };

    const onLeave = () => setVisible(false);

    window.addEventListener("mousemove", onMove);
    document.addEventListener("mouseleave", onLeave);
    return () => {
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none fixed left-0 top-0 z-[100] mix-blend-difference transition-opacity duration-200",
        visible ? "opacity-100" : "opacity-0",
      )}
      style={{ transform: `translate3d(${pos.x}px, ${pos.y}px, 0)` }}
    >
      <div
        className={cn(
          "-translate-x-1/2 -translate-y-1/2 rounded-full border border-[color:var(--fg)] transition-all duration-300",
          label ? "h-16 w-16" : "h-2.5 w-2.5 bg-[color:var(--fg)]",
        )}
      />
      {label && (
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-mono text-[9px] tracking-[0.2em] text-fg">
          {label}
        </span>
      )}
    </div>
  );
}
