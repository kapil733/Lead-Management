import "server-only";

import { prisma } from "@/server/db";
import type { Prisma } from "@prisma/client";

export async function writeAudit(input: {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  meta?: Prisma.InputJsonValue;
  ip?: string | null;
}) {
  await prisma.auditLog.create({
    data: {
      actorId: input.actorId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      meta: input.meta,
      ip: input.ip ?? null,
    },
  });
}
