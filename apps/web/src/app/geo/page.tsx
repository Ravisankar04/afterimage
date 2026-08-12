"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { fetchAfterimages } from "@/lib/api";
import type { Afterimage } from "@/lib/demo-data";
import { statusColor } from "@/lib/cn";

/** Project lat/lng into a stylized dark canvas map (not Google Maps). */
function project(lat: number, lng: number) {
  const x = ((lng + 180) / 360) * 100;
  const y = ((90 - lat) / 180) * 100;
  return { x, y };
}

export default function GeoPage() {
  const [items, setItems] = useState<Afterimage[]>([]);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    fetchAfterimages().then((res) => setItems(res.data));
  }, []);

  const points = useMemo(
    () =>
      items.map((a) => ({
        ...a,
        ...project(a.lat, a.lng),
      })),
    [items],
  );

  const selected = points.find((p) => p.id === active) ?? null;

  return (
    <div className="min-h-screen bg-bg pt-[var(--nav-h)]">
      <div className="border-b border-[color:var(--line)] px-5 py-10 md:px-10">
        <p className="muted-label mb-3">GEO INDEX</p>
        <h1 className="editorial-display text-[clamp(2.4rem,7vw,4.8rem)]">
          COORDINATES OF LOSS
        </h1>
      </div>

      <div className="relative mx-auto max-w-[1200px] px-5 py-10 md:px-10">
        <div
          className="relative aspect-[16/10] w-full overflow-hidden border border-[color:var(--line)]"
          style={{
            background:
              "radial-gradient(ellipse at 30% 20%, #141210 0%, #0a0a0a 55%), repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(242,239,232,0.04) 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(242,239,232,0.04) 40px)",
          }}
        >
          <svg
            className="absolute inset-0 h-full w-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden
          >
            <path
              d="M8 42 C 22 38, 30 30, 45 34 S 70 28, 88 40"
              fill="none"
              stroke="rgba(242,239,232,0.08)"
              strokeWidth="0.3"
            />
            <path
              d="M12 70 C 28 62, 40 68, 55 60 S 78 55, 92 66"
              fill="none"
              stroke="rgba(242,239,232,0.06)"
              strokeWidth="0.25"
            />
          </svg>

          {points.map((p) => (
            <button
              key={p.id}
              type="button"
              data-cursor="INSPECT"
              aria-label={p.name}
              onClick={() => setActive(p.id)}
              className="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full transition-transform hover:scale-150"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                background: statusColor(p.status),
                boxShadow:
                  active === p.id
                    ? `0 0 0 4px rgba(196,165,116,0.25)`
                    : undefined,
              }}
            />
          ))}
        </div>

        {selected && (
          <div className="mt-8 max-w-md">
            <p
              className="muted-label mb-2"
              style={{ color: statusColor(selected.status) }}
            >
              {selected.status}
            </p>
            <h2 className="editorial-display text-3xl">{selected.name}</h2>
            <p className="mt-2 font-mono text-[10px] text-muted">
              {selected.lat.toFixed(4)}, {selected.lng.toFixed(4)} ·{" "}
              {selected.locationLabel}
            </p>
            <Link
              href={`/afterimage/${selected.id}`}
              data-cursor="OPEN"
              className="mt-6 inline-block muted-label text-accent"
            >
              OPEN TRACE →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
