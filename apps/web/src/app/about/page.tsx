export const metadata = {
  title: "About",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-bg pt-[var(--nav-h)]">
      <article className="mx-auto max-w-[820px] px-5 py-20 md:px-10">
        <p className="muted-label mb-6">PHILOSOPHY</p>
        <h1 className="editorial-display text-[clamp(2.4rem,7vw,4.5rem)]">
          GONE IS NOT THE SAME AS FORGOTTEN.
        </h1>

        <div className="mt-16 space-y-10 text-lg leading-relaxed text-muted">
          <p>
            AFTERIMAGE is a protocol for remembering what will not last —
            buildings scheduled for demolition, temporary art, markets that
            fold overnight, scientific samples that expire after publication.
          </p>
          <p>
            We do not prevent disappearance. We refuse amnesia. Capture becomes
            hash. Hash becomes signature. Signature becomes witness. Witness
            becomes record. Then the thing itself may leave.
          </p>
          <p className="text-fg">
            The afterimage is what remains when the object is gone.
          </p>
          <p>
            Inspired by editorial kinetic practices and extreme whitespace —
            but built as an original archive identity: warm bronze on deep
            black, grotesk display, mono for hashes. No coin iconography. No
            glassmorphism theater. Memory as craft.
          </p>
        </div>

        <div className="mt-20 border-t border-[color:var(--line)] pt-10">
          <p className="editorial-display text-3xl text-accent">AFTERIMAGE</p>
          <p className="mt-4 muted-label">A MEMORY PROTOCOL · 2026</p>
        </div>
      </article>
    </div>
  );
}
