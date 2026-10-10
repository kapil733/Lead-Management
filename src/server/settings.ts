import "server-only";

import { prisma } from "@/server/db";

export type AppSettings = {
  dailyCaseCap: number;
  maxAttempts: number;
  retryCooldownHours: number;
  staleCaseMinutes: number;
};

const DEFAULTS: AppSettings = {
  dailyCaseCap: 200,
  maxAttempts: 3,
  retryCooldownHours: 4,
  staleCaseMinutes: 60,
};

function asNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

export async function getAppSettings(): Promise<AppSettings> {
  const rows = await prisma.appSetting.findMany({
    where: {
      key: {
        in: [
          "dailyCaseCap",
          "maxAttempts",
          "retryCooldownHours",
          "staleCaseMinutes",
        ],
      },
    },
  });
  const map = new Map(rows.map((r) => [r.key, r.value]));
  return {
    dailyCaseCap: asNumber(map.get("dailyCaseCap"), DEFAULTS.dailyCaseCap),
    maxAttempts: asNumber(map.get("maxAttempts"), DEFAULTS.maxAttempts),
    retryCooldownHours: asNumber(
      map.get("retryCooldownHours"),
      DEFAULTS.retryCooldownHours,
    ),
    staleCaseMinutes: asNumber(
      map.get("staleCaseMinutes"),
      DEFAULTS.staleCaseMinutes,
    ),
  };
}
