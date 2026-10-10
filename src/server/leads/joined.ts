import "server-only";

import { CaseStatus, Role } from "@prisma/client";
import { prisma } from "@/server/db";
import { writeAudit } from "@/server/audit/write";

export async function setLeadJoined(input: {
  leadId: string;
  joined: boolean;
  actorId: string;
  actorRole: Role;
  ip?: string | null;
}) {
  const lead = await prisma.lead.findUnique({ where: { id: input.leadId } });
  if (!lead) {
    return { ok: false as const, error: "Lead not found" };
  }

  if (input.actorRole === Role.EMPLOYEE) {
    const owns = await prisma.case.findFirst({
      where: {
        leadId: input.leadId,
        employeeId: input.actorId,
        status: CaseStatus.CLOSED,
      },
      select: { id: true },
    });
    if (!owns) {
      return {
        ok: false as const,
        error: "You can only toggle Joined on your own closed cases",
      };
    }
  }

  const updated = await prisma.lead.update({
    where: { id: input.leadId },
    data: input.joined
      ? {
          joined: true,
          joinedAt: new Date(),
          joinedMarkedById: input.actorId,
        }
      : {
          joined: false,
          joinedAt: null,
          joinedMarkedById: null,
        },
  });

  await writeAudit({
    actorId: input.actorId,
    action: input.joined ? "LEAD_JOINED_ON" : "LEAD_JOINED_OFF",
    entityType: "Lead",
    entityId: lead.id,
    meta: {
      previous: lead.joined,
      next: input.joined,
      role: input.actorRole,
    },
    ip: input.ip,
  });

  return { ok: true as const, data: updated };
}
