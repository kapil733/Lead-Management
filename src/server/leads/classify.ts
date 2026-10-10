import "server-only";

import { prisma } from "@/server/db";
import {
  mapRows,
  type MappedLeadRow,
} from "@/server/leads/map-rows";

export type { MappedLeadRow };
export { mapRows };

export type ClassifiedImport = {
  totalRows: number;
  validNew: MappedLeadRow[];
  duplicates: MappedLeadRow[];
  invalid: MappedLeadRow[];
  previewValid: MappedLeadRow[];
};

export async function classifyMappedRows(
  mapped: MappedLeadRow[],
): Promise<ClassifiedImport> {
  const invalid: MappedLeadRow[] = [];
  const withPhone: MappedLeadRow[] = [];

  for (const row of mapped) {
    if (!row.phone || row.error) {
      invalid.push(row);
    } else {
      withPhone.push(row);
    }
  }

  const seenInFile = new Set<string>();
  const uniqueCandidates: MappedLeadRow[] = [];
  const fileDupes: MappedLeadRow[] = [];

  for (const row of withPhone) {
    const phone = row.phone!;
    if (seenInFile.has(phone)) {
      fileDupes.push({ ...row, error: "Duplicate phone in file" });
    } else {
      seenInFile.add(phone);
      uniqueCandidates.push(row);
    }
  }

  const phones = uniqueCandidates.map((r) => r.phone!);
  const existing = new Set<string>();
  const chunk = 1000;
  for (let i = 0; i < phones.length; i += chunk) {
    const slice = phones.slice(i, i + chunk);
    const found = await prisma.lead.findMany({
      where: { phone: { in: slice } },
      select: { phone: true },
    });
    for (const f of found) existing.add(f.phone);
  }

  const validNew: MappedLeadRow[] = [];
  const dbDupes: MappedLeadRow[] = [];
  for (const row of uniqueCandidates) {
    if (existing.has(row.phone!)) {
      dbDupes.push({ ...row, error: "Already in database" });
    } else {
      validNew.push(row);
    }
  }

  const duplicates = [...fileDupes, ...dbDupes];

  return {
    totalRows: mapped.length,
    validNew,
    duplicates,
    invalid,
    previewValid: validNew.slice(0, 20),
  };
}
