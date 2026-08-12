"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { format } from "date-fns";
import { Canvas } from "@react-three/fiber";
import { AfterimageObject } from "@/components/three/AfterimageObject";
import { fetchAfterimage } from "@/lib/api";
import type { Afterimage } from "@/lib/demo-data";
import { shortHash } from "@/lib/hash";
import { cn, statusColor } from "@/lib/cn";
import { isLowPowerDevice, prefersReducedMotion } from "@/lib/motion";

type Tab =
  | "TIMELINE"
  | "EVIDENCE"
  | "WITNESSES"
  | "DISPUTES"
  | "FORENSIC"
  | "CHAIN"
  | "MACHINE"
  | "HISTORY"
  | "STORY"
  | "MEMORY";

const TABS: Tab[] = [
  "TIMELINE",
  "EVIDENCE",
  "WITNESSES",
  "DISPUTES",
  "FORENSIC",
  "CHAIN",
  "MACHINE",
  "HISTORY",
  "STORY",
  "MEMORY",
];

export default function AfterimageDetailPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<Afterimage | null>(null);
  const [demo, setDemo] = useState(true);
  const [tab, setTab] = useState<Tab>("TIMELINE");
  const [scrub, setScrub] = useState(1);
  const [ghostMode, setGhostMode] = useState(false);
  const [chat, setChat] = useState<Array<{ role: "user" | "memory"; text: string }>>(
    [],
  );
  const [prompt, setPrompt] = useState("");
  const [simplified, setSimplified] = useState(false);

  useEffect(() => {
    setSimplified(isLowPowerDevice() || prefersReducedMotion());
    if (!params?.id) return;
    fetchAfterimage(params.id).then((res) => {
      setData(res.data);
      setDemo(res.demo);
      if (res.data?.status === "GONE") setGhostMode(true);
    });
  }, [params?.id]);

  const nodes: Node[] = useMemo(() => {
    if (!data) return [];
    return [
      {
        id: "root",
        position: { x: 180, y: 40 },
        data: { label: data.name },
        style: nodeStyle,
      },
      ...data.events.map((e, i) => ({
        id: e.id,
        position: { x: 40 + (i % 3) * 160, y: 140 + Math.floor(i / 3) * 90 },
        data: { label: e.label },
        style: nodeStyle,
      })),
    ];
  }, [data]);

  const edges: Edge[] = useMemo(() => {
    if (!data) return [];
    return data.events.map((e) => ({
      id: `root-${e.id}`,
      source: "root",
      target: e.id,
      style: { stroke: "#c4a574" },
    }));
  }, [data]);

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center pt-[var(--nav-h)]">
        <p className="muted-label">LOADING TRACE…</p>
      </div>
    );
  }

  const eventIndex = Math.min(
    data.events.length - 1,
    Math.floor(scrub * Math.max(data.events.length - 1, 0)),
  );

  function askMemory() {
    if (!prompt.trim() || !data) return;
    const q = prompt.trim();
    setChat((c) => [
      ...c,
      { role: "user", text: q },
      {
        role: "memory",
        text:
          data.story[Math.floor(Math.random() * data.story.length)] +
          ` — recalled from hash ${shortHash(data.contentHash)}.`,
      },
    ]);
    setPrompt("");
  }

  return (
    <div
      className={cn(
        "min-h-screen bg-bg pt-[var(--nav-h)]",
        ghostMode && "opacity-90",
      )}
    >
      <div className="border-b border-[color:var(--line)] px-5 py-10 md:grid md:grid-cols-[1fr_280px] md:px-10">
        <div>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <p
              className="muted-label"
              style={{ color: statusColor(data.status) }}
            >
              {data.status}
            </p>
            <span className="font-mono text-[10px] text-muted">
              {demo ? "DEMO" : "LIVE"} · {data.type}
            </span>
            {data.status === "GONE" && (
              <button
                type="button"
                onClick={() => setGhostMode((g) => !g)}
                className="muted-label text-accent"
              >
                {ghostMode ? "EXIT GHOST MODE" : "GHOST MODE"}
              </button>
            )}
          </div>
          <h1 className="editorial-display text-[clamp(2.2rem,7vw,4.8rem)]">
            {data.name}
          </h1>
          <p className="mt-6 max-w-2xl text-sm leading-relaxed text-muted">
            {data.description}
          </p>
          <p className="mt-4 font-mono text-[10px] tracking-wider text-muted">
            {data.locationLabel} · OBSERVED {data.yearObserved}
            {data.yearGone ? ` · GONE ${data.yearGone}` : ""}
          </p>
        </div>
        <div className="mt-8 h-48 md:mt-0">
          <Canvas camera={{ position: [0, 0, 3.5], fov: 40 }}>
            <ambientLight intensity={0.4} />
            <directionalLight position={[2, 3, 2]} intensity={1} />
            <AfterimageObject
              status={ghostMode ? "GONE" : data.status}
              simplified={simplified}
            />
          </Canvas>
        </div>
      </div>

      <div className="no-scrollbar flex gap-4 overflow-x-auto border-b border-[color:var(--line)] px-5 py-4 md:px-10">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "muted-label whitespace-nowrap",
              tab === t ? "text-accent" : "text-muted",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mx-auto max-w-[1100px] px-5 py-12 md:px-10">
        {tab === "TIMELINE" && (
          <ol className="space-y-8">
            {data.events.map((e) => (
              <li key={e.id} className="border-l border-[color:var(--line)] pl-6">
                <p className="font-mono text-[10px] text-muted">
                  {format(new Date(e.at), "yyyy.MM.dd HH:mm")} · {e.kind}
                </p>
                <p className="mt-2 text-xl">{e.label}</p>
                {e.note && (
                  <p className="mt-1 text-sm text-muted">{e.note}</p>
                )}
              </li>
            ))}
          </ol>
        )}

        {tab === "EVIDENCE" && (
          <ul className="space-y-4">
            {data.evidence.map((ev) => (
              <li
                key={ev.id}
                className="flex flex-wrap items-baseline justify-between gap-3 border border-[color:var(--line)] p-4"
              >
                <div>
                  <p className="text-lg">{ev.label}</p>
                  <p className="mt-1 font-mono text-[10px] text-muted">
                    {ev.mediaType} · {format(new Date(ev.capturedAt), "yyyy.MM.dd")}
                  </p>
                </div>
                <p className="font-mono text-[10px] text-accent">
                  {shortHash(ev.hash)}
                </p>
              </li>
            ))}
          </ul>
        )}

        {tab === "WITNESSES" && (
          <ul className="space-y-4">
            {data.witnesses.map((w) => (
              <li key={w.id} className="flex justify-between gap-4 border-b border-[color:var(--line)] py-4">
                <span>{w.handle}</span>
                <span className="font-mono text-xs text-muted">{w.address}</span>
              </li>
            ))}
          </ul>
        )}

        {tab === "DISPUTES" &&
          (data.disputes.length === 0 ? (
            <p className="text-muted">No open disputes.</p>
          ) : (
            <ul className="space-y-4">
              {data.disputes.map((d) => (
                <li key={d.id} className="border border-[color:var(--danger)]/40 p-4">
                  <p className="muted-label mb-2 !text-[color:var(--danger)]">
                    {d.status}
                  </p>
                  <p>{d.claim}</p>
                </li>
              ))}
            </ul>
          ))}

        {tab === "FORENSIC" && (
          <div className="space-y-4 font-mono text-xs leading-relaxed text-muted">
            <p>CONTENT HASH · {data.contentHash}</p>
            <p>EVIDENCE COUNT · {data.evidenceCount}</p>
            <p>WITNESS COUNT · {data.witnessCount}</p>
            <p>
              LOCATION ·{" "}
              {data.locationLabel} (visibility-controlled; coordinates may be
              approximate)
            </p>
            <p>
              CHAIN COMMIT ·{" "}
              {data.txHash ?? "NONE — awaiting on-chain registration"}
            </p>
            <p className="text-[10px] tracking-wide text-muted/70">
              Forensic view lists recorded fields only. It does not assert
              objective truth.
            </p>
          </div>
        )}

        {tab === "CHAIN" && (
          <div className="space-y-4">
            <p className="muted-label">BLOCKCHAIN PROOF</p>
            {data.txHash ? (
              <>
                <p className="break-all font-mono text-sm text-accent">
                  {data.txHash}
                </p>
                <p className="text-sm text-muted">
                  Anchored as an afterimage commitment. Explorer links appear only
                  when configured.
                </p>
              </>
            ) : (
              <>
                <p className="editorial-display text-2xl text-muted">
                  NOT YET COMMITTED
                </p>
                <p className="max-w-md text-sm leading-relaxed text-muted">
                  Demo archive entries show structured history without invented
                  transaction hashes. Connect a local Anvil deploy to register
                  real commitments.
                </p>
              </>
            )}
          </div>
        )}

        {tab === "MACHINE" && (
          <div>
            <p className="mb-6 muted-label">TIME MACHINE</p>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={scrub}
              onChange={(e) => setScrub(Number(e.target.value))}
              className="w-full accent-[color:var(--accent)]"
              aria-label="Scrub timeline"
            />
            <p className="mt-6 text-2xl">
              {data.events[eventIndex]?.label ?? "—"}
            </p>
            <p className="mt-2 font-mono text-[10px] text-muted">
              {data.events[eventIndex]
                ? format(new Date(data.events[eventIndex].at), "PPP p")
                : ""}
            </p>
          </div>
        )}

        {tab === "HISTORY" && (
          <div className="h-[420px] border border-[color:var(--line)]">
            <ReactFlow nodes={nodes} edges={edges} fitView>
              <Background color="#2a2a2a" gap={24} />
              <Controls />
            </ReactFlow>
          </div>
        )}

        {tab === "STORY" && (
          <div className="space-y-10">
            {data.story.map((line, i) => (
              <p
                key={i}
                className="editorial-display text-[clamp(1.6rem,4vw,2.8rem)]"
              >
                {line}
              </p>
            ))}
          </div>
        )}

        {tab === "MEMORY" && (
          <div className="max-w-xl">
            <p className="mb-6 muted-label">MEMORY ENGINE</p>
            <div className="mb-6 max-h-72 space-y-4 overflow-y-auto">
              {chat.length === 0 && (
                <p className="text-sm text-muted">
                  Ask what the afterimage still remembers.
                </p>
              )}
              {chat.map((m, i) => (
                <p
                  key={i}
                  className={cn(
                    "text-sm",
                    m.role === "user" ? "text-fg" : "text-accent",
                  )}
                >
                  <span className="muted-label mr-2">
                    {m.role === "user" ? "YOU" : "MEMORY"}
                  </span>
                  {m.text}
                </p>
              ))}
            </div>
            <form
              className="flex gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                askMemory();
              }}
            >
              <input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="What remains?"
                className="flex-1 border-b border-[color:var(--line)] bg-transparent py-3 outline-none focus:border-accent"
              />
              <button type="submit" className="muted-label text-accent">
                ASK
              </button>
            </form>
          </div>
        )}

        <div className="mt-16">
          <Link href="/field" className="muted-label text-muted hover:text-fg">
            ← BACK TO FIELD
          </Link>
        </div>
      </div>
    </div>
  );
}

const nodeStyle = {
  background: "#0a0a0a",
  color: "#f2efe8",
  border: "1px solid rgba(242,239,232,0.12)",
  borderRadius: 0,
  fontSize: 11,
  fontFamily: "inherit",
};
