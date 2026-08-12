"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-5 pt-[var(--nav-h)] text-center">
      <p className="muted-label mb-6 !text-[color:var(--danger)]">
        ARCHIVE FAULT
      </p>
      <h1 className="editorial-display text-[clamp(2rem,7vw,4.5rem)]">
        THE RECORD FRACTURED.
      </h1>
      <p className="mt-6 max-w-md text-sm text-muted">
        Something failed while reading or writing a trace.
        {error.digest ? ` Digest ${error.digest}.` : ""}
      </p>
      <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
        <button
          type="button"
          onClick={reset}
          className="border border-accent px-6 py-3 muted-label !text-accent"
        >
          RETRY
        </button>
        <Link
          href="/"
          className="border border-[color:var(--line)] px-6 py-3 muted-label"
        >
          HOME
        </Link>
      </div>
    </div>
  );
}
