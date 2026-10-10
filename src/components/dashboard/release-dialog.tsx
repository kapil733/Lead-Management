"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { releaseCaseAction } from "@/server/dashboard/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function ReleaseDialog({
  caseId,
  employeeName,
  open,
  onOpenChange,
}: {
  caseId: string | null;
  employeeName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!caseId) return;
    startTransition(async () => {
      const result = await releaseCaseAction({ caseId, reason });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Case released — lead returned to pool");
      setReason("");
      onOpenChange(false);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setReason("");
      }}
    >
      <DialogContent>
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Release case</DialogTitle>
            <DialogDescription>
              End {employeeName}&apos;s open case and return the lead to the
              pool. A reason is required.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1">
            <Label htmlFor="release-reason">Reason</Label>
            <textarea
              id="release-reason"
              required
              minLength={3}
              maxLength={500}
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isPending}
              className="flex w-full rounded-[var(--radius-control)] border border-border bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              placeholder="e.g. Stuck for over an hour; employee offline"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              disabled={isPending}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={isPending}>
              {isPending ? "Releasing…" : "Release case"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
