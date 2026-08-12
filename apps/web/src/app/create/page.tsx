"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { sha256File, shortHash } from "@/lib/hash";
import { createAfterimage } from "@/lib/api";
import type { AfterimageType } from "@/lib/demo-data";
import { cn } from "@/lib/cn";

const TYPES: AfterimageType[] = [
  "PLACES",
  "OBJECTS",
  "ART",
  "EVENTS",
  "PRODUCTS",
  "SCIENCE",
  "ARCHITECTURE",
];

const STEPS = [
  "TYPE",
  "NAME",
  "DESCRIPTION",
  "UPLOAD",
  "WHERE",
  "WHEN",
  "SIGN",
  "PRESERVE",
] as const;

const PIPELINE = [
  "UPLOAD",
  "VALIDATE",
  "HASH",
  "STORE",
  "SIGN",
  "BLOCKCHAIN",
] as const;

export default function CreatePage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [type, setType] = useState<AfterimageType>("PLACES");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [when, setWhen] = useState("2026");
  const [fileName, setFileName] = useState("");
  const [hash, setHash] = useState("");
  const [hashing, setHashing] = useState(false);
  const [signed, setSigned] = useState(false);
  const [pipeIndex, setPipeIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const canNext = useMemo(() => {
    switch (step) {
      case 0:
        return Boolean(type);
      case 1:
        return name.trim().length > 1;
      case 2:
        return description.trim().length > 8;
      case 3:
        return Boolean(hash);
      case 4:
        return location.trim().length > 1;
      case 5:
        return Boolean(when);
      case 6:
        return signed;
      case 7:
        return true;
      default:
        return false;
    }
  }, [step, type, name, description, hash, location, when, signed]);

  async function onFile(file: File | null) {
    if (!file) return;
    setFileName(file.name);
    setHashing(true);
    setPipeIndex(0);
    try {
      setPipeIndex(1);
      await new Promise((r) => setTimeout(r, 200));
      setPipeIndex(2);
      const digest = await sha256File(file);
      setHash(digest);
      setPipeIndex(3);
    } finally {
      setHashing(false);
    }
  }

  function sign() {
    setPipeIndex(4);
    setSigned(true);
    setTimeout(() => setPipeIndex(5), 400);
  }

  async function preserve() {
    setSubmitting(true);
    const res = await createAfterimage({
      name,
      description,
      type,
      locationLabel: location,
      yearObserved: Number(when) || 2026,
      contentHash: hash,
      status: "ACTIVE",
    });
    setSubmitting(false);
    router.push(res.id ? `/afterimage/${res.id}` : "/field");
  }

  return (
    <div className="min-h-screen bg-bg pt-[var(--nav-h)]">
      <div className="border-b border-[color:var(--line)] px-5 py-10 md:px-10">
        <p className="muted-label mb-3">CREATE FLOW</p>
        <h1 className="editorial-display text-[clamp(2.2rem,7vw,4.5rem)]">
          PRESERVE A TRACE
        </h1>
      </div>

      <div className="mx-auto grid max-w-[1100px] gap-10 px-5 py-12 md:grid-cols-[200px_1fr] md:px-10">
        <ol className="space-y-3" aria-label="Steps">
          {STEPS.map((label, i) => (
            <li key={label}>
              <button
                type="button"
                onClick={() => i <= step && setStep(i)}
                className={cn(
                  "muted-label text-left transition-colors",
                  i === step
                    ? "text-accent"
                    : i < step
                      ? "text-fg"
                      : "text-muted/50",
                )}
              >
                {String(i + 1).padStart(2, "0")} · {label}
              </button>
            </li>
          ))}
        </ol>

        <div className="min-h-[50vh]">
          {step === 0 && (
            <div>
              <h2 className="editorial-display mb-8 text-4xl">
                WHAT ARE YOU PRESERVING?
              </h2>
              <div className="flex flex-wrap gap-3">
                {TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={cn(
                      "border px-4 py-3 muted-label transition-colors",
                      type === t
                        ? "border-accent text-accent"
                        : "border-[color:var(--line)] text-muted",
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <h2 className="editorial-display mb-8 text-4xl">NAME IT.</h2>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Old Textile Factory"
                className="w-full border-b border-[color:var(--line)] bg-transparent py-4 text-3xl outline-none placeholder:text-muted/40 focus:border-accent"
                autoFocus
              />
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="editorial-display mb-8 text-4xl">
                WHAT DID YOU SEE?
              </h2>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
                placeholder="What will disappear — or already has?"
                className="w-full resize-none border border-[color:var(--line)] bg-transparent p-4 text-lg leading-relaxed outline-none focus:border-accent"
                autoFocus
              />
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="editorial-display mb-4 text-4xl">SHOW US.</h2>
              <p className="mb-8 text-sm text-muted">
                Live SHA-256 via Web Crypto. Nothing leaves this device until
                you preserve.
              </p>
              <label
                data-cursor="VERIFY"
                className="flex cursor-pointer flex-col items-start gap-4 border border-dashed border-[color:var(--line)] p-10 transition-colors hover:border-accent"
              >
                <span className="muted-label">CHOOSE FILE</span>
                <input
                  type="file"
                  className="sr-only"
                  onChange={(e) => onFile(e.target.files?.[0] ?? null)}
                />
                {fileName && (
                  <span className="font-mono text-xs text-fg">{fileName}</span>
                )}
                {hashing && (
                  <span className="font-mono text-xs text-accent">
                    HASHING…
                  </span>
                )}
                {hash && (
                  <span className="break-all font-mono text-xs text-accent">
                    SHA-256 · {shortHash(hash, 12, 12)}
                  </span>
                )}
              </label>

              <div className="mt-10 flex flex-wrap gap-3">
                {PIPELINE.map((p, i) => (
                  <span
                    key={p}
                    className={cn(
                      "font-mono text-[10px] tracking-widest",
                      i <= pipeIndex ? "text-accent" : "text-muted/40",
                    )}
                  >
                    {p}
                    {i < PIPELINE.length - 1 ? " →" : ""}
                  </span>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <h2 className="editorial-display mb-8 text-4xl">WHERE?</h2>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="South Canal District"
                className="w-full border-b border-[color:var(--line)] bg-transparent py-4 text-3xl outline-none focus:border-accent"
                autoFocus
              />
            </div>
          )}

          {step === 5 && (
            <div>
              <h2 className="editorial-display mb-8 text-4xl">WHEN?</h2>
              <input
                value={when}
                onChange={(e) => setWhen(e.target.value)}
                type="number"
                min={2020}
                max={2040}
                className="w-40 border-b border-[color:var(--line)] bg-transparent py-4 text-3xl outline-none focus:border-accent"
                autoFocus
              />
            </div>
          )}

          {step === 6 && (
            <div>
              <h2 className="editorial-display mb-4 text-4xl">SIGN IT.</h2>
              <p className="mb-8 max-w-md text-sm text-muted">
                Wallet connection is optional in demo mode. Signing attests you
                witnessed this evidence.
              </p>
              <button
                type="button"
                data-cursor="VERIFY"
                onClick={sign}
                className="border border-accent px-6 py-4 muted-label !text-accent"
              >
                {signed ? "SIGNED ✓" : "ATTEST & SIGN"}
              </button>
              {signed && (
                <p className="mt-6 font-mono text-xs text-muted">
                  Pipeline advanced to SIGN → BLOCKCHAIN
                </p>
              )}
            </div>
          )}

          {step === 7 && (
            <div>
              <h2 className="editorial-display mb-4 text-4xl">PRESERVE.</h2>
              <dl className="mb-10 space-y-3 font-mono text-xs text-muted">
                <div className="flex gap-4">
                  <dt className="w-28">NAME</dt>
                  <dd className="text-fg">{name}</dd>
                </div>
                <div className="flex gap-4">
                  <dt className="w-28">TYPE</dt>
                  <dd className="text-fg">{type}</dd>
                </div>
                <div className="flex gap-4">
                  <dt className="w-28">HASH</dt>
                  <dd className="break-all text-accent">
                    {shortHash(hash, 16, 12)}
                  </dd>
                </div>
              </dl>
              <button
                type="button"
                data-cursor="VERIFY"
                disabled={submitting}
                onClick={preserve}
                className="border border-fg px-8 py-4 muted-label hover:border-accent hover:text-accent disabled:opacity-50"
              >
                {submitting ? "SEALING…" : "SEAL AFTERIMAGE"}
              </button>
            </div>
          )}

          <div className="mt-16 flex items-center gap-4">
            <button
              type="button"
              disabled={step === 0}
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              className="muted-label disabled:opacity-30"
            >
              BACK
            </button>
            {step < STEPS.length - 1 && (
              <button
                type="button"
                disabled={!canNext}
                onClick={() => setStep((s) => s + 1)}
                className="muted-label text-accent disabled:opacity-30"
              >
                CONTINUE →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
