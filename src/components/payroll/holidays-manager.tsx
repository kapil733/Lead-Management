"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  deleteHolidayAction,
  upsertHolidayAction,
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

type HolidayRow = {
  id: string;
  date: string;
  name: string;
  isPaid: boolean;
};

export function HolidaysManager({
  year,
  initial,
}: {
  year: number;
  initial: HolidayRow[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<HolidayRow | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      date: String(fd.get("date") ?? ""),
      name: String(fd.get("name") ?? ""),
      isPaid: fd.get("isPaid") === "on",
    };
    startTransition(async () => {
      const result = await upsertHolidayAction(payload);
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success(edit ? "Holiday updated" : "Holiday saved");
      setOpen(false);
      setEdit(null);
      router.refresh();
    });
  }

  function onDelete(id: string) {
    startTransition(async () => {
      const result = await deleteHolidayAction({ id });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Holiday deleted");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm">
          <Link
            href={`/admin/payroll/holidays?year=${year - 1}`}
            className="underline-offset-2 hover:underline"
          >
            ← {year - 1}
          </Link>
          <span className="font-medium">{year}</span>
          <Link
            href={`/admin/payroll/holidays?year=${year + 1}`}
            className="underline-offset-2 hover:underline"
          >
            {year + 1} →
          </Link>
        </div>
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
              Add holiday
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={submit}>
              <DialogHeader>
                <DialogTitle>
                  {edit ? "Edit holiday" : "Add holiday"}
                </DialogTitle>
              </DialogHeader>
              <div className="mt-4 space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    name="date"
                    type="date"
                    required
                    defaultValue={edit?.date ?? `${year}-01-01`}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    name="name"
                    required
                    defaultValue={edit?.name ?? ""}
                  />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="isPaid"
                    defaultChecked={edit?.isPaid ?? true}
                  />
                  Paid holiday
                </label>
              </div>
              <DialogFooter className="mt-4">
                <Button type="submit" disabled={isPending}>
                  Save
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-left">
            <tr>
              <th className="px-3 py-2 font-medium">Date</th>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Paid</th>
              <th className="px-3 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {initial.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-muted">
                  No holidays for {year}
                </td>
              </tr>
            ) : (
              initial.map((h) => (
                <tr key={h.id} className="border-t">
                  <td className="px-3 py-2 tabular-nums">{h.date}</td>
                  <td className="px-3 py-2">{h.name}</td>
                  <td className="px-3 py-2">{h.isPaid ? "Paid" : "Unpaid"}</td>
                  <td className="px-3 py-2 text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEdit(h);
                        setOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isPending}
                      onClick={() => onDelete(h.id)}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
