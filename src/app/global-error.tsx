"use client";

import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-[#0A0C0B] text-[#ECF0E6]`}>
        <div
          role="alert"
          className="mx-auto flex min-h-screen max-w-lg flex-col items-start justify-center gap-4 px-6"
        >
          <h1 className="text-xl font-semibold">Application error</h1>
          <p className="text-sm text-[#8C968A]">
            A critical error occurred. Please try again.
          </p>
          {error.digest ? (
            <p className="text-xs text-[#5E685C]">Ref: {error.digest}</p>
          ) : null}
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-[10px] bg-[#12A56E] px-4 py-2 text-sm font-semibold text-white"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
