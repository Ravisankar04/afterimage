import type { Metadata } from "next";
import { JetBrains_Mono, Syne } from "next/font/google";
import { Providers } from "@/components/providers/Providers";
import "./globals.css";

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: {
    default: "AFTERIMAGE",
    template: "%s · AFTERIMAGE",
  },
  description:
    "Some things are meant to disappear. AFTERIMAGE remembers — a cryptographic archive of places, objects, and moments that will not last.",
  metadataBase: new URL("https://afterimage.local"),
  openGraph: {
    title: "AFTERIMAGE",
    description: "Gone. Not forgotten.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${syne.variable} ${mono.variable}`}>
      <body className="grain bg-bg font-display text-fg antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:bg-accent focus:px-3 focus:py-2 focus:text-bg"
        >
          Skip to content
        </a>
        <Providers>
          <main id="main">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
