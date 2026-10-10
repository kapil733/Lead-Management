import "server-only";

import { prisma } from "@/server/db";
import { writeAudit } from "@/server/audit/write";
import type { ClientInput } from "@/lib/validators/payroll";

export async function listClients() {
  return prisma.client.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { employees: true } },
    },
  });
}

export async function getClient(id: string) {
  return prisma.client.findUnique({
    where: { id },
    include: { _count: { select: { employees: true } } },
  });
}

export async function createClient(input: {
  data: ClientInput;
  actorId: string;
  ip?: string | null;
}) {
  const client = await prisma.client.create({
    data: {
      name: input.data.name,
      contactName: input.data.contactName || null,
      contactPhone: input.data.contactPhone || null,
      address: input.data.address || null,
      isActive: input.data.isActive,
    },
  });
  await writeAudit({
    actorId: input.actorId,
    action: "CLIENT_CREATED",
    entityType: "Client",
    entityId: client.id,
    meta: { name: client.name },
    ip: input.ip,
  });
  return { ok: true as const, data: client };
}

export async function updateClient(input: {
  id: string;
  data: ClientInput;
  actorId: string;
  ip?: string | null;
}) {
  const existing = await prisma.client.findUnique({ where: { id: input.id } });
  if (!existing) {
    return { ok: false as const, error: "Client not found" };
  }
  const client = await prisma.client.update({
    where: { id: input.id },
    data: {
      name: input.data.name,
      contactName: input.data.contactName || null,
      contactPhone: input.data.contactPhone || null,
      address: input.data.address || null,
      isActive: input.data.isActive,
    },
  });
  await writeAudit({
    actorId: input.actorId,
    action: "CLIENT_UPDATED",
    entityType: "Client",
    entityId: client.id,
    meta: { name: client.name },
    ip: input.ip,
  });
  return { ok: true as const, data: client };
}
