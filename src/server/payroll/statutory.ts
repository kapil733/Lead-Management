import "server-only";

import { DayDivisor } from "@prisma/client";
import { prisma } from "@/server/db";
import { writeAudit } from "@/server/audit/write";
import type { StatutoryRates } from "@/server/payroll/calc/types";
import { ymdFromDate } from "@/server/payroll/attendance/resolve";

function dec(n: unknown): number {
  return typeof n === "number" ? n : Number(n);
}

export function toStatutoryRates(row: {
  id: string;
  effectiveFrom: Date;
  pfEmployeeRate: unknown;
  pfEmployerEpsRate: unknown;
  pfEmployerEpfRate: unknown;
  pfWageCeilingPaise: number;
  edliRate: unknown;
  pfAdminRate: unknown;
  esicEmployeeRate: unknown;
  esicEmployerRate: unknown;
  esicWageCeilingPaise: number;
  dayDivisor: DayDivisor;
}): StatutoryRates {
  return {
    id: row.id,
    effectiveFrom: ymdFromDate(row.effectiveFrom),
    pfEmployeeRate: dec(row.pfEmployeeRate),
    pfEmployerEpsRate: dec(row.pfEmployerEpsRate),
    pfEmployerEpfRate: dec(row.pfEmployerEpfRate),
    pfWageCeilingPaise: row.pfWageCeilingPaise,
    edliRate: dec(row.edliRate),
    pfAdminRate: dec(row.pfAdminRate),
    esicEmployeeRate: dec(row.esicEmployeeRate),
    esicEmployerRate: dec(row.esicEmployerRate),
    esicWageCeilingPaise: row.esicWageCeilingPaise,
    dayDivisor: row.dayDivisor,
  };
}

export async function getEffectiveStatutoryConfig(
  onYmd: string,
): Promise<StatutoryRates | null> {
  const row = await prisma.statutoryConfig.findFirst({
    where: { effectiveFrom: { lte: new Date(`${onYmd}T00:00:00.000Z`) } },
    orderBy: { effectiveFrom: "desc" },
  });
  return row ? toStatutoryRates(row) : null;
}

export async function listStatutoryConfigs() {
  const rows = await prisma.statutoryConfig.findMany({
    orderBy: { effectiveFrom: "desc" },
  });
  return rows.map(toStatutoryRates);
}

export type StatutoryInput = {
  effectiveFrom: string;
  pfEmployeeRate: number;
  pfEmployerEpsRate: number;
  pfEmployerEpfRate: number;
  pfWageCeilingPaise: number;
  edliRate: number;
  pfAdminRate: number;
  esicEmployeeRate: number;
  esicEmployerRate: number;
  esicWageCeilingPaise: number;
  dayDivisor: DayDivisor;
};

export async function createStatutoryConfig(input: {
  data: StatutoryInput;
  actorId: string;
  ip?: string | null;
}): Promise<
  { ok: true; data: StatutoryRates } | { ok: false; error: string }
> {
  const effectiveFrom = new Date(`${input.data.effectiveFrom}T00:00:00.000Z`);
  const clash = await prisma.statutoryConfig.findFirst({
    where: { effectiveFrom },
  });
  if (clash) {
    return {
      ok: false,
      error: "A statutory config already exists for this effective date",
    };
  }

  const row = await prisma.statutoryConfig.create({
    data: {
      effectiveFrom,
      pfEmployeeRate: input.data.pfEmployeeRate,
      pfEmployerEpsRate: input.data.pfEmployerEpsRate,
      pfEmployerEpfRate: input.data.pfEmployerEpfRate,
      pfWageCeilingPaise: input.data.pfWageCeilingPaise,
      edliRate: input.data.edliRate,
      pfAdminRate: input.data.pfAdminRate,
      esicEmployeeRate: input.data.esicEmployeeRate,
      esicEmployerRate: input.data.esicEmployerRate,
      esicWageCeilingPaise: input.data.esicWageCeilingPaise,
      dayDivisor: input.data.dayDivisor,
    },
  });

  await writeAudit({
    actorId: input.actorId,
    action: "STATUTORY_CONFIG_CREATED",
    entityType: "StatutoryConfig",
    entityId: row.id,
    meta: { effectiveFrom: input.data.effectiveFrom },
    ip: input.ip,
  });

  return { ok: true, data: toStatutoryRates(row) };
}
