"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

export function ConsoleSearch() {
  const pathname = usePathname();
  const router = useRouter();
  const payroll = pathname.startsWith("/admin/payroll");
  const [q, setQ] = useState("");

  return (
    <form
      className="flex h-11 min-w-0 max-w-[420px] flex-1 items-center gap-2.5 rounded-xl border border-border bg-surface px-3.5 text-muted"
      onSubmit={(e) => {
        e.preventDefault();
        const query = q.trim();
        const base = payroll ? "/admin/payroll/employees" : "/admin/leads";
        router.push(query ? `${base}?q=${encodeURIComponent(query)}` : base);
      }}
    >
      <Search className="size-[18px] shrink-0" aria-hidden />
      <input
        aria-label={payroll ? "Search employees" : "Search leads"}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={
          payroll
            ? "Search employees"
            : "Search leads, telecallers, employees"
        }
        className="min-w-0 flex-1 bg-transparent text-sm text-text outline-none placeholder:text-muted-2"
      />
    </form>
  );
}
