"use client";

import { SessionProvider } from "next-auth/react";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <NuqsAdapter>
        {children}
        <Toaster position="bottom-right" richColors closeButton />
      </NuqsAdapter>
    </SessionProvider>
  );
}
