"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { fetchAfterimages } from "@/lib/api";
import { STATUS_ORDER, type Afterimage } from "@/lib/demo-data";
import { statusColor } from "@/lib/cn";

export default function ArchivePage() {
  const [items, setItems] = useState<Afterimage[]>([]);
  const [demo, setDemo] = useState(true);

  useEffect(() => {
    fetchAfterimages().then((res) => {
      setItems(res.data);
      setDemo(res.demo);
    });
  }, []);

  const grouped = useMemo(() => {
    const map = Object.fromEntries(
      STATUS_ORDER.map((s) => [s, [] as Afterimage[]]),
    ) as Record<string, Afterimage[]>;
    for (const item of items) {
      (map[item.status] ??= []).push(item);
    }
    return map;
  }, [items]);

  return (
    <div className="min-h-screen bg-bg pt-[var(--nav-h)]">
      <div className="border-b border-[color:var(--line)] px-5 py-12 md:px-10">
        <p className="muted-label mb-3">PERSONAL INDEX</p>
        <h1 className="editorial-display text-[clamp(2.5rem,8vw,5.5rem)]">
          MY AFTERIMAGES
        </h1>
        <p className="mt-6 max-w-lg text-sm text-muted">
          Experimental grouping by status — not a dashboard.{" "}
          {demo ? "Showing demo traces." : "Live archive."}
        </p>
      </div>

      <div className="space-y-20 px-5 py-16 md:px-10">
        {STATUS_ORDER.map((status) => {
          const list = grouped[status] ?? [];
          return (
            <section key={status}>
              <div className="mb-8 flex items-baseline gap-4">
                <h2
                  className="editorial-display text-3xl md:text-5xl"
                  style={{ color: statusColor(status) }}
                >
                  {status}
                </h2>
                <span className="font-mono text-[10px] text-muted">
                  {list.length}
                </span>
              </div>
              {list.length === 0 ? (
                <p className="text-sm text-muted/60">No traces in this state.</p>
              ) : (
                <ul className="grid gap-x-10 gap-y-8 md:grid-cols-2 lg:grid-cols-3">
                  {list.map((a) => (
                    <li key={a.id}>
                      <Link
                        href={`/afterimage/${a.id}`}
                        data-cursor="OPEN"
                        className="group block"
                      >
                        <p className="muted-label mb-2">{a.type}</p>
                        <p className="editorial-display text-2xl transition-colors group-hover:text-accent">
                          {a.name}
                        </p>
                        <p className="mt-2 font-mono text-[10px] text-muted">
                          {a.locationLabel} · {a.yearObserved}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
