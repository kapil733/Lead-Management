import "server-only";

import { AdjustmentType } from "@prisma/client";
import { prisma } from "@/server/db";
import { writeAudit } from "@/server/audit/write";

export async function listAdjustments(employeeId: string, month: string) {
  return prisma.payrollAdjustment.findMany({
    where: { employeeId, month },
    orderBy: { id: "asc" },
  });
}

export async function upsertAdjustment(input: {
  employeeId: string;
  month: string;
  type: AdjustmentType;
  amountPaise: number;
  note?: string | null;
  actorId: string;
  ip?: string | null;
  id?: string;
}): Promise<{ ok: true; data: { id: string } } | { ok: false; error: string }> {
  const run = await prisma.payrollRun.findUnique({
    where: { month: input.month },
  });
  if (run?.status === "LOCKED") {
    return { ok: false, error: "Month is locked" };
  }

  if (input.amountPaise < 0) {
    return { ok: false, error: "Amount must be non-negative paise" };
  }

  let row;
  if (input.id) {
    row = await prisma.payrollAdjustment.update({
      where: { id: input.id },
      data: {
        type: input.type,
        amountPaise: input.amountPaise,
        note: input.note ?? null,
      },
    });
  } else {
    row = await prisma.payrollAdjustment.create({
      data: {
        employeeId: input.employeeId,
        month: input.month,
        type: input.type,
        amountPaise: input.amountPaise,
        note: input.note ?? null,
      },
    });
  }

  await writeAudit({
    actorId: input.actorId,
    action: "PAYROLL_ADJUSTMENT_UPSERTED",
    entityType: "PayrollAdjustment",
    entityId: row.id,
    meta: {
      employeeId: input.employeeId,
      month: input.month,
      type: input.type,
      amountPaise: input.amountPaise,
    },
    ip: input.ip,
  });

  return { ok: true, data: { id: row.id } };
}

export async function deleteAdjustment(input: {
  id: string;
  actorId: string;
  ip?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const existing = await prisma.payrollAdjustment.findUnique({
    where: { id: input.id },
  });
  if (!existing) return { ok: false, error: "Not found" };
  const run = await prisma.payrollRun.findUnique({
    where: { month: existing.month },
  });
  if (run?.status === "LOCKED") {
    return { ok: false, error: "Month is locked" };
  }
  await prisma.payrollAdjustment.delete({ where: { id: input.id } });
  await writeAudit({
    actorId: input.actorId,
    action: "PAYROLL_ADJUSTMENT_DELETED",
    entityType: "PayrollAdjustment",
    entityId: input.id,
    meta: { month: existing.month, employeeId: existing.employeeId },
    ip: input.ip,
  });
  return { ok: true };
}
