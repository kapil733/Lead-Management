"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { setLeadJoinedAction } from "@/server/leads/actions";
import { setOwnLeadJoinedAction } from "@/server/cases/actions";
import { cn } from "@/lib/utils";

export function JoinedToggle({
  leadId,
  joined: initial,
  mode = "admin",
}: {
  leadId: string;
  joined: boolean;
  mode?: "admin" | "employee";
}) {
  const [joined, setJoined] = useState(initial);
  const [isPending, startTransition] = useTransition();

  function toggle(next: boolean) {
    if (!next) {
      const ok = window.confirm(
        "Turn off Joined for this lead? This will clear the joined timestamp.",
      );
      if (!ok) return;
    }
    const prev = joined;
    setJoined(next);
    startTransition(async () => {
      const action =
        mode === "employee" ? setOwnLeadJoinedAction : setLeadJoinedAction;
      const result = await action({ leadId, joined: next });
      if (!result.ok) {
        setJoined(prev);
        toast.error(result.error.message);
        return;
      }
      toast.success(next ? "Marked as joined" : "Joined cleared");
    });
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={joined}
      disabled={isPending}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(!joined);
      }}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50",
        joined ? "border-success bg-success" : "border-border bg-surface-2",
      )}
    >
      <span
        className={cn(
          "pointer-events-none absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform",
          joined ? "left-5" : "left-0.5",
        )}
      />
      <span className="sr-only">Joined</span>
    </button>
  );
}
