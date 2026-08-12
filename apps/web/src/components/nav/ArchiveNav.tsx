"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

const LINKS = [
  { href: "/archive", label: "ARCHIVE" },
  { href: "/field", label: "FIELD" },
  { href: "/create", label: "CREATE" },
  { href: "/about", label: "ABOUT" },
];

export function ArchiveNav() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-colors duration-500",
        scrolled ? "bg-[color:var(--bg)]/90 backdrop-blur-[2px]" : "bg-transparent",
      )}
    >
      <nav
        className="mx-auto flex h-[var(--nav-h)] max-w-[1400px] items-center justify-between px-5 md:px-10"
        aria-label="Primary"
      >
        <Link
          href="/"
          className="font-display text-sm font-bold tracking-[0.22em] text-fg"
          data-cursor="OPEN"
        >
          AFTERIMAGE
        </Link>

        <ul className="hidden items-center gap-8 md:flex">
          {LINKS.map((link) => {
            const active =
              pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  data-cursor="OPEN"
                  className={cn(
                    "muted-label transition-colors hover:text-fg",
                    active ? "text-fg" : "text-muted",
                  )}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          className="muted-label md:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "CLOSE" : "MENU"}
        </button>
      </nav>

      {open && (
        <div
          id="mobile-nav"
          className="border-t border-[color:var(--line)] bg-[color:var(--bg)] px-5 py-6 md:hidden"
        >
          <ul className="flex flex-col gap-5">
            {LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="editorial-display text-2xl text-fg"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </header>
  );
}
