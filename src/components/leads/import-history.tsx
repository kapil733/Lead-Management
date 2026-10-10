"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getRevertEligibleCountAction,
  revertImportBatchAction,
} from "@/server/leads/actions";
import { formatDisplayDate } from "@/lib/dates";

export type ImportBatchRow = {
  id: string;
  fileName: string;
  totalRows: number;
  imported: number;
  duplicates: number;
  invalid: number;
  createdAt: string;
  revertedAt: string | null;
  uploadedByName: string;
  leadCount: number;
};

export function ImportHistory({
  batches,
  onChanged,
}: {
  batches: ImportBatchRow[];
  onChanged?: () => void;
}) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function confirmRevert(batch: ImportBatchRow) {
    startTransition(async () => {
      setPendingId(batch.id);
      const eligible = await getRevertEligibleCountAction(batch.id);
      if (!eligible.ok) {
        toast.error(eligible.error.message);
        setPendingId(null);
        return;
      }
      const count = eligible.data.count;
      const ok = window.confirm(
        `Revert import “${batch.fileName}”?\n\nThis will delete ${count} lead(s) that are still NEW and never claimed. Leads that were claimed or changed status will be kept.\n\nThis cannot be undone.`,
      );
      if (!ok) {
        setPendingId(null);
        return;
      }
      const result = await revertImportBatchAction({ batchId: batch.id });
      setPendingId(null);
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success(`Removed ${result.data.deleted} lead(s)`);
      onChanged?.();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import history</CardTitle>
        <CardDescription>
          Revert deletes only NEW leads from that batch that were never claimed.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {batches.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <p className="text-sm font-medium">No imports yet</p>
            <p className="text-sm text-muted">
              Completed import batches will show up here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-[var(--radius-control)] border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-2 text-xs">
                <tr>
                  <th className="px-3 py-2 font-medium">File</th>
                  <th className="px-3 py-2 font-medium">Imported</th>
                  <th className="px-3 py-2 font-medium">Dup / Invalid</th>
                  <th className="px-3 py-2 font-medium">By</th>
                  <th className="px-3 py-2 font-medium">When</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => (
                  <tr key={b.id} className="border-t border-border hover:bg-surface-2">
                    <td className="px-3 py-2">
                      <div className="font-medium">{b.fileName}</div>
                      <div className="text-xs text-muted tabular">
                        {b.leadCount} leads linked
                      </div>
                    </td>
                    <td className="px-3 py-2 tabular">
                      {b.imported} / {b.totalRows}
                    </td>
                    <td className="px-3 py-2 tabular">
                      {b.duplicates} / {b.invalid}
                    </td>
                    <td className="px-3 py-2">{b.uploadedByName}</td>
                    <td className="px-3 py-2 tabular">
                      {formatDisplayDate(b.createdAt)}
                    </td>
                    <td className="px-3 py-2">
                      {b.revertedAt ? (
                        <Badge variant="warning">Reverted</Badge>
                      ) : (
                        <Badge variant="success">Active</Badge>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        disabled={!!b.revertedAt || isPending}
                        onClick={() => confirmRevert(b)}
                      >
                        {pendingId === b.id ? "…" : "Revert"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
