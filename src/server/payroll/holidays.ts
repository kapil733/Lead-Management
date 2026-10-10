import "server-only";

import { prisma } from "@/server/db";
import { writeAudit } from "@/server/audit/write";
import { dateFromYmd, ymdFromDate } from "@/server/payroll/attendance/resolve";

export type HolidayRow = {
  id: string;
  date: string;
  name: string;
  isPaid: boolean;
};

export async function listHolidays(year: number): Promise<HolidayRow[]> {
  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year, 11, 31));
  const rows = await prisma.holiday.findMany({
    where: { date: { gte: start, lte: end } },
    orderBy: { date: "asc" },
  });
  return rows.map((h) => ({
    id: h.id,
    date: ymdFromDate(h.date),
    name: h.name,
    isPaid: h.isPaid,
  }));
}

export async function listHolidaysInRange(
  fromYmd: string,
  toYmd: string,
): Promise<Map<string, { name: string; isPaid: boolean }>> {
  const rows = await prisma.holiday.findMany({
    where: {
      date: { gte: dateFromYmd(fromYmd), lte: dateFromYmd(toYmd) },
    },
  });
  const map = new Map<string, { name: string; isPaid: boolean }>();
  for (const h of rows) {
    map.set(ymdFromDate(h.date), { name: h.name, isPaid: h.isPaid });
  }
  return map;
}

export async function upsertHoliday(input: {
  date: string;
  name: string;
  isPaid: boolean;
  actorId: string;
  ip?: string | null;
}): Promise<{ ok: true; data: HolidayRow } | { ok: false; error: string }> {
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Name is required" };
  const date = dateFromYmd(input.date);
  const row = await prisma.holiday.upsert({
    where: { date },
    create: { date, name, isPaid: input.isPaid },
    update: { name, isPaid: input.isPaid },
  });
  await writeAudit({
    actorId: input.actorId,
    action: "HOLIDAY_UPSERTED",
    entityType: "Holiday",
    entityId: row.id,
    meta: { date: input.date, name, isPaid: input.isPaid },
    ip: input.ip,
  });
  return {
    ok: true,
    data: {
      id: row.id,
      date: ymdFromDate(row.date),
      name: row.name,
      isPaid: row.isPaid,
    },
  };
}

export async function deleteHoliday(input: {
  id: string;
  actorId: string;
  ip?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const existing = await prisma.holiday.findUnique({ where: { id: input.id } });
  if (!existing) return { ok: false, error: "Holiday not found" };
  await prisma.holiday.delete({ where: { id: input.id } });
  await writeAudit({
    actorId: input.actorId,
    action: "HOLIDAY_DELETED",
    entityType: "Holiday",
    entityId: input.id,
    meta: { date: ymdFromDate(existing.date), name: existing.name },
    ip: input.ip,
  });
  return { ok: true };
}
