"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { WagmiProvider, createConfig, http, injected } from "wagmi";
import { foundry, sepolia } from "viem/chains";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { PageTransition } from "@/components/motion/PageTransition";
import { CustomCursor } from "@/components/cursor/CustomCursor";
import { ArchiveNav } from "@/components/nav/ArchiveNav";

const wagmiConfig = createConfig({
  chains: [foundry, sepolia],
  connectors: [injected()],
  transports: {
    [foundry.id]: http(
      process.env.NEXT_PUBLIC_RPC_URL ?? "http://127.0.0.1:8545",
    ),
    [sepolia.id]: http(),
  },
});

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, refetchOnWindowFocus: false },
        },
      }),
  );

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <SmoothScroll>
          <CustomCursor />
          <ArchiveNav />
          <PageTransition>{children}</PageTransition>
        </SmoothScroll>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
