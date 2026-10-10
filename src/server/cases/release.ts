import "server-only";

import { CaseStatus, LeadStatus, Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { writeAudit } from "@/server/audit/write";
import {
  releaseCaseSchema,
  type ReleaseCaseInput,
} from "@/lib/validators/dashboard";

export type ReleaseCaseResult =
  | {
      ok: true;
      data: { caseId: string; leadId: string };
    }
  | {
      ok: false;
      error: {
        code: string;
        message: string;
        fieldErrors?: Record<string, string[]>;
      };
    };

/**
 * Admin release: OPEN case → RELEASED; lead returns to NEW.
 * Clears outcome fields; records releasedById + reason; audit CASE_RELEASE.
 */
export async function releaseCase(input: {
  actorId: string;
  payload: unknown;
  ip?: string | null;
}): Promise<ReleaseCaseResult> {
  const parsed = releaseCaseSchema.safeParse(input.payload);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".") || "form";
      fieldErrors[key] = fieldErrors[key] ?? [];
      fieldErrors[key]!.push(issue.message);
    }
    return {
      ok: false,
      error: {
        code: "VALIDATION",
        message: "Please provide a release reason",
        fieldErrors,
      },
    };
  }

  const data: ReleaseCaseInput = parsed.data;
  const now = new Date();

  try {
    const result = await prisma.$transaction(async (tx) => {
      const open = await tx.case.findFirst({
        where: { id: data.caseId, status: CaseStatus.OPEN },
        select: {
          id: true,
          leadId: true,
          employeeId: true,
          startedAt: true,
        },
      });
      if (!open) {
        throw Object.assign(new Error("NOT_FOUND"), {
          code: "NOT_FOUND",
          message: "Open case not found",
        });
      }

      await tx.case.update({
        where: { id: open.id },
        data: {
          status: CaseStatus.RELEASED,
          closedAt: now,
          releasedById: input.actorId,
          releaseReason: data.reason,
          durationSeconds: Math.max(
            0,
            Math.floor((now.getTime() - open.startedAt.getTime()) / 1000),
          ),
        },
      });

      await tx.lead.update({
        where: { id: open.leadId },
        data: {
          status: LeadStatus.NEW,
          // Eligible immediately after release
          nextEligibleAt: null,
        },
      });

      return {
        caseId: open.id,
        leadId: open.leadId,
        employeeId: open.employeeId,
      };
    });

    await writeAudit({
      actorId: input.actorId,
      action: "CASE_RELEASE",
      entityType: "Case",
      entityId: result.caseId,
      meta: {
        leadId: result.leadId,
        employeeId: result.employeeId,
        reason: data.reason,
      },
      ip: input.ip,
    });

    return {
      ok: true,
      data: { caseId: result.caseId, leadId: result.leadId },
    };
  } catch (err) {
    const e = err as { code?: string; message?: string };
    if (e.code === "NOT_FOUND") {
      return {
        ok: false,
        error: {
          code: "NOT_FOUND",
          message: e.message ?? "Open case not found",
        },
      };
    }
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
      return {
        ok: false,
        error: { code: "NOT_FOUND", message: "Open case not found" },
      };
    }
    throw err;
  }
}
