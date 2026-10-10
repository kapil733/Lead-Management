"use client";

import { useRouter } from "next/navigation";
import { ImportWizard } from "@/components/leads/import-wizard";
import {
  ImportHistory,
  type ImportBatchRow,
} from "@/components/leads/import-history";

export function ImportLeadsClient({ batches }: { batches: ImportBatchRow[] }) {
  const router = useRouter();
  const refresh = () => router.refresh();

  return (
    <div className="space-y-6">
      <ImportWizard onImported={refresh} />
      <ImportHistory batches={batches} onChanged={refresh} />
    </div>
  );
}
