"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  createClientAction,
  updateClientAction,
} from "@/server/payroll/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type ClientRow = {
  id: string;
  name: string;
  contactName: string | null;
  contactPhone: string | null;
  address: string | null;
  isActive: boolean;
  employeeCount: number;
};

export function ClientsManager({ initial }: { initial: ClientRow[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<ClientRow | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      id: edit?.id,
      name: String(fd.get("name") ?? ""),
      contactName: String(fd.get("contactName") ?? "") || null,
      contactPhone: String(fd.get("contactPhone") ?? "") || null,
      address: String(fd.get("address") ?? "") || null,
      isActive: fd.get("isActive") === "on",
    };
    startTransition(async () => {
      const result = edit
        ? await updateClientAction(payload)
        : await createClientAction(payload);
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success(edit ? "Client updated" : "Client created");
      setOpen(false);
      setEdit(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (!v) setEdit(null);
          }}
        >
          <DialogTrigger asChild>
            <Button
              type="button"
              onClick={() => {
                setEdit(null);
                setOpen(true);
              }}
            >
              Add client
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={submit} className="space-y-4">
              <DialogHeader>
                <DialogTitle>{edit ? "Edit client" : "Add client"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="c-name">Name</Label>
                  <Input
                    id="c-name"
                    name="name"
                    required
                    defaultValue={edit?.name ?? ""}
                    disabled={isPending}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="c-contact">Contact name</Label>
                  <Input
                    id="c-contact"
                    name="contactName"
                    defaultValue={edit?.contactName ?? ""}
                    disabled={isPending}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="c-phone">Contact phone</Label>
                  <Input
                    id="c-phone"
                    name="contactPhone"
                    defaultValue={edit?.contactPhone ?? ""}
                    disabled={isPending}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="c-addr">Address</Label>
                  <Input
                    id="c-addr"
                    name="address"
                    defaultValue={edit?.address ?? ""}
                    disabled={isPending}
                  />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="isActive"
                    defaultChecked={edit?.isActive ?? true}
                    disabled={isPending}
                  />
                  Active
                </label>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Saving…" : "Save"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {initial.length === 0 ? (
        <div className="rounded-[var(--radius-card)] border border-border bg-surface py-16 text-center text-sm text-muted shadow-[var(--shadow-card)]">
          No clients yet
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-card)] border border-border bg-surface shadow-[var(--shadow-card)]">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-surface-2 text-xs">
              <tr>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Contact</th>
                <th className="px-3 py-2 font-medium">Employees</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {initial.map((c) => (
                <tr key={c.id} className="h-10 border-t border-border">
                  <td className="px-3 py-1 font-medium">{c.name}</td>
                  <td className="px-3 py-1 text-muted">
                    {c.contactName ?? "—"}
                    {c.contactPhone ? ` · ${c.contactPhone}` : ""}
                  </td>
                  <td className="px-3 py-1 tabular">{c.employeeCount}</td>
                  <td className="px-3 py-1">
                    {c.isActive ? (
                      <span className="rounded-full bg-success-soft px-2 py-0.5 text-xs text-success-strong">
                        Active
                      </span>
                    ) : (
                      <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-1 text-right">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setEdit(c);
                        setOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
