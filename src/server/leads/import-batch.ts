import "server-only";

import { LeadSource, LeadStatus, Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { writeAudit } from "@/server/audit/write";
import { IMPORT_CHUNK_SIZE } from "@/lib/validators/leads";
import type { MappedLeadRow } from "@/server/leads/map-rows";

export async function commitLeadImport(input: {
  fileName: string;
  uploadedById: string;
  validNew: MappedLeadRow[];
  duplicatesCount: number;
  invalidCount: number;
  totalRows: number;
  ip?: string | null;
}) {
  const batch = await prisma.importBatch.create({
    data: {
      fileName: input.fileName,
      uploadedById: input.uploadedById,
      totalRows: input.totalRows,
      imported: 0,
      duplicates: input.duplicatesCount,
      invalid: input.invalidCount,
    },
  });

  let imported = 0;
  for (let i = 0; i < input.validNew.length; i += IMPORT_CHUNK_SIZE) {
    const chunk = input.validNew.slice(i, i + IMPORT_CHUNK_SIZE);
    const data: Prisma.LeadCreateManyInput[] = chunk.map((row) => ({
      phone: row.phone!,
      name: row.name,
      city: row.city,
      trade: row.trade,
      experienceYears:
        row.experienceYears != null
          ? new Prisma.Decimal(row.experienceYears)
          : null,
      source: LeadSource.IMPORT,
      importBatchId: batch.id,
      status: LeadStatus.NEW,
      priority: 0,
      extra:
        Object.keys(row.extra).length > 0
          ? (row.extra as Prisma.InputJsonValue)
          : undefined,
    }));

    const result = await prisma.lead.createMany({
      data,
      skipDuplicates: true,
    });
    imported += result.count;
  }

  const updated = await prisma.importBatch.update({
    where: { id: batch.id },
    data: { imported },
  });

  await writeAudit({
    actorId: input.uploadedById,
    action: "LEAD_IMPORT",
    entityType: "ImportBatch",
    entityId: batch.id,
    meta: {
      fileName: input.fileName,
      totalRows: input.totalRows,
      imported,
      duplicates: input.duplicatesCount,
      invalid: input.invalidCount,
    },
    ip: input.ip,
  });

  return updated;
}

/**
 * Revert: delete only this batch's leads that are still NEW and never claimed
 * (no Case rows of any status).
 */
export async function revertImportBatch(input: {
  batchId: string;
  actorId: string;
  ip?: string | null;
}) {
  const batch = await prisma.importBatch.findUnique({
    where: { id: input.batchId },
  });
  if (!batch) {
    return { ok: false as const, error: "Import batch not found" };
  }
  if (batch.revertedAt) {
    return { ok: false as const, error: "This batch was already reverted" };
  }

  const candidates = await prisma.lead.findMany({
    where: {
      importBatchId: batch.id,
      status: LeadStatus.NEW,
      cases: { none: {} },
    },
    select: { id: true },
  });

  const ids = candidates.map((c) => c.id);
  const deleted = await prisma.$transaction(async (tx) => {
    if (ids.length > 0) {
      await tx.lead.deleteMany({ where: { id: { in: ids } } });
    }
    await tx.importBatch.update({
      where: { id: batch.id },
      data: { revertedAt: new Date() },
    });
    return ids.length;
  });

  await writeAudit({
    actorId: input.actorId,
    action: "LEAD_IMPORT_REVERT",
    entityType: "ImportBatch",
    entityId: batch.id,
    meta: { deletedLeads: deleted, eligible: ids.length },
    ip: input.ip,
  });

  return {
    ok: true as const,
    data: { deleted: deleted, batchId: batch.id },
  };
}

export async function listImportBatches() {
  return prisma.importBatch.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      uploadedBy: { select: { id: true, name: true, email: true } },
      _count: {
        select: {
          leads: true,
        },
      },
    },
  });
}

export async function countRevertEligible(batchId: string): Promise<number> {
  return prisma.lead.count({
    where: {
      importBatchId: batchId,
      status: LeadStatus.NEW,
      cases: { none: {} },
    },
  });
}
