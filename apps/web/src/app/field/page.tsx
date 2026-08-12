"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { ArchiveField } from "@/components/three/ArchiveField";
import { fetchAfterimages } from "@/lib/api";
import { TYPE_FILTERS, type Afterimage } from "@/lib/demo-data";
import { cn, statusColor } from "@/lib/cn";
import { isLowPowerDevice, prefersReducedMotion } from "@/lib/motion";

export default function FieldPage() {
  const [items, setItems] = useState<Afterimage[]>([]);
  const [demo, setDemo] = useState(true);
  const [type, setType] = useState<(typeof TYPE_FILTERS)[number]>("ALL");
  const [yearMin, setYearMin] = useState(2026);
  const [yearMax, setYearMax] = useState(2035);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Afterimage | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [simplified, setSimplified] = useState(false);
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(
    null,
  );

  useEffect(() => {
    setSimplified(isLowPowerDevice() || prefersReducedMotion());
    fetchAfterimages().then((res) => {
      setItems(res.data);
      setDemo(res.demo);
    });
  }, []);

  const filtered = useMemo(
    () =>
      items.filter((a) => {
        const typeOk = type === "ALL" || a.type === type;
        const yearOk =
          a.yearObserved >= yearMin && a.yearObserved <= yearMax;
        return typeOk && yearOk;
      }),
    [items, type, yearMin, yearMax],
  );

  const hoverItem = filtered.find((a) => a.id === hoverId) ?? null;

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      drag.current = {
        x: e.clientX,
        y: e.clientY,
        px: pan.x,
        py: pan.y,
      };
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    },
    [pan],
  );

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!drag.current) return;
    setPan({
      x: drag.current.px + (e.clientX - drag.current.x),
      y: drag.current.py + (e.clientY - drag.current.y),
    });
  }, []);

  const onPointerUp = useCallback(() => {
    drag.current = null;
  }, []);

  return (
    <div className="min-h-screen bg-bg pt-[var(--nav-h)]">
      <div className="border-b border-[color:var(--line)] px-5 py-8 md:px-10">
        <p className="muted-label mb-3">SPATIAL ARCHIVE</p>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="editorial-display text-[clamp(2.5rem,8vw,5.5rem)]">
            THE FIELD
          </h1>
          <p className="font-mono text-[10px] tracking-widest text-muted">
            {demo ? "DEMO MODE" : "LIVE"} · {filtered.length} TRACES
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-[color:var(--line)] px-5 py-4 md:px-10">
        {TYPE_FILTERS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={cn(
              "muted-label border px-3 py-1.5 transition-colors",
              type === t
                ? "border-accent text-accent"
                : "border-transparent text-muted hover:text-fg",
            )}
          >
            {t}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-3 font-mono text-[10px] text-muted">
          <label className="flex items-center gap-2">
            <span>FROM</span>
            <input
              type="range"
              min={2026}
              max={2035}
              value={yearMin}
              onChange={(e) => setYearMin(Number(e.target.value))}
              className="accent-[color:var(--accent)]"
              aria-label="Year from"
            />
            <span>{yearMin}</span>
          </label>
          <label className="flex items-center gap-2">
            <span>TO</span>
            <input
              type="range"
              min={2026}
              max={2035}
              value={yearMax}
              onChange={(e) => setYearMax(Number(e.target.value))}
              className="accent-[color:var(--accent)]"
              aria-label="Year to"
            />
            <span>{yearMax}</span>
          </label>
          <label className="flex items-center gap-2">
            <span>ZOOM</span>
            <input
              type="range"
              min={0.6}
              max={1.8}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="accent-[color:var(--accent)]"
              aria-label="Zoom"
            />
          </label>
        </div>
      </div>

      <div className="relative grid min-h-[70vh] lg:grid-cols-[1fr_320px]">
        <div
          className="relative h-[60vh] cursor-grab overflow-hidden active:cursor-grabbing lg:h-auto"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onWheel={(e) => {
            setZoom((z) =>
              Math.min(1.8, Math.max(0.6, z - e.deltaY * 0.001)),
            );
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: "center center",
            }}
          >
            <Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
              <ambientLight intensity={0.4} />
              <directionalLight position={[3, 4, 2]} intensity={0.9} />
              <Suspense fallback={null}>
                <ArchiveField
                  items={filtered}
                  highlightId={hoverId ?? selected?.id}
                  simplified={simplified}
                  onSelect={(id) => {
                    const found = filtered.find((a) => a.id === id) ?? null;
                    setSelected(found);
                    setHoverId(id);
                  }}
                />
              </Suspense>
              {!simplified && <OrbitControls enableZoom={false} enablePan={false} />}
            </Canvas>
          </div>

          {/* 2D overlay points for accessibility / hover meta */}
          <ul className="pointer-events-none absolute inset-0">
            {filtered.map((a) => (
              <li
                key={a.id}
                className="pointer-events-auto absolute"
                style={{
                  left: `${a.fieldX}%`,
                  top: `${a.fieldY}%`,
                  transform: `translate(${pan.x * 0.02}px, ${pan.y * 0.02}px)`,
                }}
              >
                <button
                  type="button"
                  data-cursor="INSPECT"
                  aria-label={a.name}
                  className="h-3 w-3 rounded-full border border-[color:var(--fg)]/40"
                  style={{ background: statusColor(a.status) }}
                  onMouseEnter={() => setHoverId(a.id)}
                  onMouseLeave={() => setHoverId(null)}
                  onFocus={() => setHoverId(a.id)}
                  onBlur={() => setHoverId(null)}
                  onClick={() => setSelected(a)}
                />
              </li>
            ))}
          </ul>

          {hoverItem && (
            <div className="pointer-events-none absolute bottom-6 left-6 max-w-xs border border-[color:var(--line)] bg-[color:var(--bg)]/90 p-4">
              <p className="muted-label mb-2">{hoverItem.status}</p>
              <p className="editorial-display text-xl">{hoverItem.name}</p>
              <p className="mt-2 font-mono text-[10px] text-muted">
                {hoverItem.locationLabel} · {hoverItem.yearObserved}
              </p>
            </div>
          )}
        </div>

        <aside className="border-t border-[color:var(--line)] p-6 lg:border-l lg:border-t-0">
          {selected ? (
            <div className="space-y-5">
              <p
                className="muted-label"
                style={{ color: statusColor(selected.status) }}
              >
                {selected.status}
              </p>
              <h2 className="editorial-display text-3xl">{selected.name}</h2>
              <p className="text-sm leading-relaxed text-muted">
                {selected.description}
              </p>
              <dl className="space-y-2 font-mono text-[10px] tracking-wider text-muted">
                <div className="flex justify-between gap-4">
                  <dt>TYPE</dt>
                  <dd className="text-fg">{selected.type}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>EVIDENCE</dt>
                  <dd className="text-fg">{selected.evidenceCount}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>WITNESSES</dt>
                  <dd className="text-fg">{selected.witnessCount}</dd>
                </div>
              </dl>
              <Link
                href={`/afterimage/${selected.id}`}
                data-cursor="OPEN"
                className="inline-flex border border-accent px-4 py-3 muted-label !text-accent"
              >
                OPEN TRACE
              </Link>
            </div>
          ) : (
            <p className="text-sm text-muted">
              Hover a point. Click to expand. Pan and zoom the field.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
