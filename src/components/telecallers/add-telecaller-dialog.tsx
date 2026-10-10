"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createTelecallerAction } from "@/server/telecallers/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function AddTelecallerDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function resetForm() {
    setName("");
    setEmail("");
    setTempPassword(null);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await createTelecallerAction({ name, email });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      setTempPassword(result.data.tempPassword);
      toast.success(`Created ${result.data.name}`);
    });
  }

  async function copyPassword() {
    if (!tempPassword) return;
    try {
      await navigator.clipboard.writeText(tempPassword);
      toast.success("Temp password copied");
    } catch {
      toast.error("Could not copy — select and copy manually");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <Button type="button">Add telecaller</Button>
      </DialogTrigger>
      <DialogContent>
        {!tempPassword ? (
          <form onSubmit={onSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Add telecaller</DialogTitle>
              <DialogDescription>
                Creates an EMPLOYEE login with a one-time temporary password.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="tc-name">Name</Label>
                <Input
                  id="tc-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={isPending}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="tc-email">Email</Label>
                <Input
                  id="tc-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isPending}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Creating…" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle>Temporary password</DialogTitle>
              <DialogDescription>
                Copy now — it will not be shown again. User must change it on
                first login.
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-[var(--radius-control)] border border-border bg-surface-2 px-3 py-3 font-mono text-sm tabular">
              {tempPassword}
            </div>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={copyPassword}>
                Copy password
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setOpen(false);
                  resetForm();
                }}
              >
                Done
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
