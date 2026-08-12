import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-5 pt-[var(--nav-h)] text-center">
      <p className="muted-label mb-6">404</p>
      <h1 className="editorial-display text-[clamp(2rem,8vw,5rem)]">
        THE TRACE WAS LOST.
      </h1>
      <p className="mt-6 max-w-md text-sm text-muted">
        This afterimage is not in the field — or never was.
      </p>
      <Link
        href="/field"
        className="mt-12 border border-[color:var(--line)] px-6 py-3 muted-label hover:border-accent hover:text-accent"
      >
        RETURN TO FIELD
      </Link>
    </div>
  );
}
