"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";
import { HeroScene } from "@/components/three/HeroScene";
import { prefersReducedMotion } from "@/lib/motion";

gsap.registerPlugin(ScrollTrigger);

const CHANGE_LINES = [
  "THE WORLD CHANGES.",
  "BUILDINGS FALL.",
  "ART DISAPPEARS.",
  "BUSINESSES CLOSE.",
  "OBJECTS BREAK.",
  "MOMENTS END.",
];

const PIPELINE = [
  "CAPTURE",
  "HASH",
  "SIGN",
  "WITNESS",
  "RECORD",
  "DISAPPEAR",
];

export function LandingExperience() {
  const root = useRef<HTMLDivElement>(null);
  const progress = useRef(0);
  const cursorGlow = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;

    const onMove = (e: MouseEvent) => {
      if (!cursorGlow.current || prefersReducedMotion()) return;
      gsap.to(cursorGlow.current, {
        x: e.clientX,
        y: e.clientY,
        duration: 0.6,
        ease: "power3.out",
      });
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const reduced = prefersReducedMotion();

      ScrollTrigger.create({
        trigger: ".hero-pin",
        start: "top top",
        end: "+=280%",
        pin: true,
        scrub: reduced ? false : 0.7,
        onUpdate: (self) => {
          progress.current = self.progress;
          const label = document.querySelector(".hero-stage-fade");
          if (label) {
            (label as HTMLElement).style.opacity = String(
              0.35 + self.progress * 0.65,
            );
          }
        },
      });

      if (!reduced) {
        gsap.fromTo(
          ".hero-line",
          { yPercent: 140, opacity: 0, rotateX: 18 },
          {
            yPercent: 0,
            opacity: 1,
            rotateX: 0,
            stagger: 0.14,
            ease: "power4.out",
            scrollTrigger: {
              trigger: ".hero-pin",
              start: "top top",
              end: "+=35%",
              scrub: true,
            },
          },
        );

        gsap.to(".hero-eyebrow", {
          opacity: 0,
          y: -20,
          scrollTrigger: {
            trigger: ".hero-pin",
            start: "top top",
            end: "+=20%",
            scrub: true,
          },
        });

        gsap.fromTo(
          ".remember-block",
          { opacity: 0, scale: 0.92, filter: "blur(12px)" },
          {
            opacity: 1,
            scale: 1,
            filter: "blur(0px)",
            ease: "power2.out",
            scrollTrigger: {
              trigger: ".remember-section",
              start: "top 80%",
              end: "center center",
              scrub: true,
            },
          },
        );

        gsap.fromTo(
          ".change-line",
          { xPercent: 18, opacity: 0, filter: "blur(8px)" },
          {
            xPercent: 0,
            opacity: 1,
            filter: "blur(0px)",
            stagger: 0.18,
            ease: "none",
            scrollTrigger: {
              trigger: ".change-section",
              start: "top 70%",
              end: "bottom 35%",
              scrub: true,
            },
          },
        );

        gsap.to(".change-parallax", {
          yPercent: -12,
          ease: "none",
          scrollTrigger: {
            trigger: ".change-section",
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        });

        gsap.fromTo(
          ".were-here",
          { letterSpacing: "0.4em", opacity: 0 },
          {
            letterSpacing: "0.08em",
            opacity: 1,
            ease: "power2.out",
            scrollTrigger: {
              trigger: ".were-section",
              start: "top 70%",
              end: "center center",
              scrub: true,
            },
          },
        );

        const pipeline = gsap.utils.toArray<HTMLElement>(".pipe-word");
        gsap.fromTo(
          pipeline,
          { opacity: 0.15, y: 60, filter: "blur(10px)", scale: 0.94 },
          {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
            scale: 1,
            stagger: 0.22,
            ease: "power2.out",
            scrollTrigger: {
              trigger: ".pipeline-section",
              start: "top 55%",
              end: "+=90%",
              scrub: true,
            },
          },
        );

        gsap.to(".pipe-track", {
          xPercent: -42,
          ease: "none",
          scrollTrigger: {
            trigger: ".pipeline-section",
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        });

        gsap.fromTo(
          ".gone-main",
          { scale: 1.35, opacity: 0, filter: "blur(20px)" },
          {
            scale: 1,
            opacity: 1,
            filter: "blur(0px)",
            ease: "power3.out",
            scrollTrigger: {
              trigger: ".gone-section",
              start: "top 75%",
              end: "center center",
              scrub: true,
            },
          },
        );

        gsap.fromTo(
          ".gone-sub",
          { y: 40, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            stagger: 0.2,
            scrollTrigger: {
              trigger: ".gone-section",
              start: "top 55%",
              end: "center 40%",
              scrub: true,
            },
          },
        );

        gsap.fromTo(
          ".brand-reveal",
          { clipPath: "inset(0 100% 0 0)", opacity: 0.4 },
          {
            clipPath: "inset(0 0% 0 0)",
            opacity: 1,
            ease: "power3.inOut",
            scrollTrigger: {
              trigger: ".brand-section",
              start: "top 70%",
              end: "center center",
              scrub: true,
            },
          },
        );

        gsap.fromTo(
          ".cta-reveal",
          { y: 100, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            ease: "power3.out",
            scrollTrigger: {
              trigger: ".cta-section",
              start: "top 80%",
              end: "top 45%",
              scrub: true,
            },
          },
        );

        gsap.to(".cta-orbit", {
          rotate: 360,
          duration: 40,
          repeat: -1,
          ease: "none",
        });

        gsap.utils.toArray<HTMLElement>(".float-meta").forEach((node, i) => {
          gsap.to(node, {
            y: i % 2 === 0 ? -24 : 18,
            x: i % 2 === 0 ? 12 : -10,
            duration: 4 + i,
            yoyo: true,
            repeat: -1,
            ease: "sine.inOut",
          });
        });
      } else {
        gsap.set(
          [
            ".hero-line",
            ".change-line",
            ".pipe-word",
            ".gone-main",
            ".gone-sub",
            ".cta-reveal",
            ".remember-block",
            ".were-here",
            ".brand-reveal",
          ],
          { clearProps: "all", opacity: 1, y: 0, x: 0 },
        );
      }
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={root} className="relative bg-bg text-fg">
      <div
        ref={cursorGlow}
        className="pointer-events-none fixed left-0 top-0 z-[5] hidden h-[42vw] w-[42vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(196,165,116,0.07),transparent_70%)] md:block"
        aria-hidden
      />

      {/* 1 — Hero */}
      <section className="hero-pin relative h-screen overflow-hidden">
        <HeroScene
          progressRef={progress}
          className="absolute inset-0 h-full w-full"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[color:var(--bg)]/30 via-transparent to-[color:var(--bg)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(10,10,10,0.55)_100%)]" />

        <div className="relative z-10 flex h-full flex-col justify-between px-5 pb-20 pt-[calc(var(--nav-h)+1.5rem)] md:px-12 md:pb-24">
          <p className="hero-eyebrow muted-label">PRESERVE WHAT TIME REMOVES</p>
          <div>
            <h1 className="max-w-6xl [perspective:800px]">
              <span className="hero-line editorial-display block origin-left text-[clamp(2.8rem,12vw,9rem)]">
                SOME THINGS
              </span>
              <span className="hero-line editorial-display block origin-left text-[clamp(2.8rem,12vw,9rem)] text-muted">
                ARE MEANT
              </span>
              <span className="hero-line editorial-display block origin-left text-[clamp(2.8rem,12vw,9rem)] text-accent">
                TO DISAPPEAR.
              </span>
            </h1>
            <p className="hero-stage-fade mt-10 font-mono text-[10px] tracking-[0.4em] text-muted md:mt-14">
              SCROLL TO WITNESS
            </p>
          </div>
        </div>

        <span className="float-meta pointer-events-none absolute right-[8%] top-[28%] hidden font-mono text-[9px] tracking-[0.25em] text-muted/50 md:block">
          LAT 13.08 · LON 80.27
        </span>
        <span className="float-meta pointer-events-none absolute bottom-[32%] left-[6%] hidden font-mono text-[9px] tracking-[0.25em] text-muted/40 md:block">
          OBS #0000
        </span>
      </section>

      {/* 2 — World changes */}
      <section className="change-section relative min-h-[160vh] overflow-hidden px-5 py-36 md:px-12">
        <div className="change-parallax pointer-events-none absolute -right-10 top-24 select-none font-mono text-[18vw] leading-none text-fg/[0.03]">
          2026
        </div>
        <div className="relative z-10 mx-auto max-w-[1200px]">
          <p className="mb-20 muted-label">FIELD NOTES · VOLUME I</p>
          <div className="space-y-5 md:space-y-9">
            {CHANGE_LINES.map((line, i) => (
              <p
                key={line}
                className={`change-line editorial-display text-[clamp(1.9rem,6.5vw,5.2rem)] ${
                  i === 0 ? "text-fg" : "text-fg/90"
                }`}
                style={{ paddingLeft: `${Math.min(i * 2.5, 12)}%` }}
              >
                {line}
              </p>
            ))}
          </div>
        </div>
      </section>

      {/* 3 — Remembers */}
      <section className="remember-section relative flex min-h-[70vh] items-center border-y border-[color:var(--line)] px-5 py-28 md:px-12">
        <div className="remember-block mx-auto w-full max-w-[1200px]">
          <p className="muted-label mb-8">THE PROTOCOL</p>
          <h2 className="editorial-display text-[clamp(2.4rem,9vw,7rem)]">
            AFTERIMAGE
          </h2>
          <p className="editorial-display mt-2 text-[clamp(2.4rem,9vw,7rem)] text-accent">
            REMEMBERS.
          </p>
          <p className="mt-10 max-w-lg text-sm leading-relaxed text-muted">
            Not truth. Not a marketplace. A chronological commitment layer for
            claims, hashes, signatures, and corroboration — after the physical
            subject is gone.
          </p>
        </div>
      </section>

      {/* 4 — But they were here */}
      <section className="were-section relative flex min-h-[50vh] items-center justify-center px-5 py-24 md:px-12">
        <p className="were-here editorial-display text-center text-[clamp(1.4rem,4vw,2.8rem)] text-muted">
          BUT THEY WERE HERE.
        </p>
      </section>

      {/* 5 — Kinetic pipeline */}
      <section className="pipeline-section relative overflow-hidden border-y border-[color:var(--line)] py-32">
        <p className="mb-16 px-5 muted-label md:px-12">THE RITUAL</p>
        <div className="pipe-track flex w-max gap-12 px-5 md:gap-20 md:px-12">
          {PIPELINE.map((word, i) => (
            <div
              key={word}
              className="pipe-word flex items-baseline gap-12 md:gap-20"
            >
              <span className="editorial-display text-[clamp(2.6rem,9vw,6.5rem)]">
                {word}
              </span>
              {i < PIPELINE.length - 1 && (
                <span className="font-mono text-xl text-accent" aria-hidden>
                  ↓
                </span>
              )}
            </div>
          ))}
        </div>
        <p className="mx-auto mt-20 max-w-xl px-5 text-sm leading-relaxed text-muted md:px-12">
          Photograph. Hash the bytes. Sign the observation. Invite witnesses.
          Commit the record. Let the world erase the rest.
        </p>
      </section>

      {/* 6 — Gone */}
      <section className="gone-section relative flex min-h-screen items-center px-5 py-36 md:px-12">
        <div className="mx-auto w-full max-w-[1200px]">
          <p className="gone-main editorial-display text-[clamp(4rem,18vw,14rem)] leading-[0.85]">
            GONE.
          </p>
          <p className="gone-sub editorial-display mt-6 text-[clamp(1.8rem,7vw,4.5rem)] text-muted">
            NOT FORGOTTEN.
          </p>
          <p className="gone-sub mt-8 max-w-sm font-mono text-[10px] tracking-[0.28em] text-muted">
            LAST VERIFIED · BLOCK COMMITTED · EVIDENCE OFF-CHAIN
          </p>
        </div>
      </section>

      {/* 7 — Brand mark */}
      <section className="brand-section relative flex min-h-[60vh] items-center justify-center overflow-hidden px-5 py-24">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.04]">
          <div className="cta-orbit h-[70vw] w-[70vw] max-h-[720px] max-w-[720px] rounded-full border border-dashed border-fg" />
        </div>
        <h2 className="brand-reveal editorial-display relative z-10 text-[clamp(3rem,12vw,9rem)] text-accent">
          AFTERIMAGE
        </h2>
      </section>

      {/* 8 — CTA */}
      <section className="cta-section relative border-t border-[color:var(--line)] px-5 py-44 md:px-12">
        <div className="cta-reveal mx-auto flex max-w-[1200px] flex-col items-start gap-10">
          <p className="muted-label">ENTER THE ARCHIVE</p>
          <h2 className="editorial-display max-w-4xl text-[clamp(2.4rem,8vw,5.5rem)]">
            EXPLORE THE FIELD
          </h2>
          <p className="max-w-md text-sm leading-relaxed text-muted">
            A spatial index of places, objects, art, and moments that will not
            last — or already have not.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/field"
              data-cursor="OPEN"
              className="group inline-flex items-center gap-4 border border-[color:var(--line)] px-8 py-4 transition-colors hover:border-accent hover:text-accent"
            >
              <span className="muted-label !text-inherit">ENTER</span>
              <span
                className="font-mono text-accent transition-transform group-hover:translate-x-1"
                aria-hidden
              >
                →
              </span>
            </Link>
            <Link
              href="/create"
              data-cursor="OPEN"
              className="inline-flex items-center gap-4 px-6 py-4 text-muted transition-colors hover:text-fg"
            >
              <span className="muted-label !text-inherit">CREATE</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
