import "server-only";

import {
  CallOutcome,
  CaseStatus,
  LeadSource,
  LeadStatus,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/server/db";
import { writeAudit } from "@/server/audit/write";
import { getAppSettings } from "@/server/settings";
import { FRIEND_PHONE_ERROR, normalisePhone } from "@/lib/phone";
import {
  closeCaseSchema,
  type CloseCaseInput,
} from "@/lib/validators/cases";

export type CloseCaseResult =
  | {
      ok: true;
      data: {
        caseId: string;
        outcome: CallOutcome;
        rating: number | null;
        referralsSaved: number;
        referralNotes: string[];
      };
    }
  | {
      ok: false;
      error: {
        code: string;
        message: string;
        fieldErrors?: Record<string, string[]>;
      };
    };

function referralPriority(rating: number | null | undefined): number {
  if (rating === 4 || rating === 5) return 10;
  return 5;
}

function parseExperienceYears(text: string | undefined): number | null {
  if (!text?.trim()) return null;
  const m = text.trim().match(/(\d+(?:\.\d+)?)/);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n < 0 || n > 60) return null;
  return Math.round(n * 10) / 10;
}

export async function closeCase(input: {
  employeeId: string;
  payload: unknown;
  ip?: string | null;
}): Promise<CloseCaseResult> {
  const parsed = closeCaseSchema.safeParse(input.payload);
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
        message: "Please fix the form errors",
        fieldErrors,
      },
    };
  }

  const data: CloseCaseInput = parsed.data;
  const settings = await getAppSettings();

  // Normalise + dedupe referrals within the form
  const referralNotes: string[] = [];
  const normalisedReferrals: Array<{
    phone: string;
    name?: string;
    experienceText?: string;
    designation?: string;
  }> = [];
  const seenPhones = new Set<string>();

  for (const row of data.referrals) {
    if (!row.phone?.trim()) continue;
    const phone = normalisePhone(row.phone);
    if (!phone) {
      return {
        ok: false,
        error: {
          code: "VALIDATION",
          message: FRIEND_PHONE_ERROR,
          fieldErrors: { referrals: [FRIEND_PHONE_ERROR] },
        },
      };
    }
    if (seenPhones.has(phone)) continue;
    seenPhones.add(phone);
    normalisedReferrals.push({
      phone,
      name: row.name?.trim() || undefined,
      experienceText: row.experienceText?.trim() || undefined,
      designation: row.designation?.trim() || undefined,
    });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const openCase = await tx.case.findFirst({
        where: {
          id: data.caseId,
          employeeId: input.employeeId,
          status: CaseStatus.OPEN,
        },
        include: { lead: true },
      });
      if (!openCase) {
        throw Object.assign(new Error("NOT_FOUND"), {
          code: "NOT_FOUND",
          message: "No open case found to close",
        });
      }

      const closedAt = new Date();
      const durationSeconds = Math.max(
        0,
        Math.floor((closedAt.getTime() - openCase.startedAt.getTime()) / 1000),
      );

      const isRetry =
        data.outcome === CallOutcome.NO_ANSWER ||
        data.outcome === CallOutcome.SWITCHED_OFF ||
        data.outcome === CallOutcome.CALL_BACK_LATER;

      let nextLeadStatus: LeadStatus = LeadStatus.CLOSED;
      let nextAttempts = openCase.lead.attempts;
      let nextEligibleAt: Date | null = null;

      if (isRetry) {
        nextAttempts = openCase.lead.attempts + 1;
        if (nextAttempts >= settings.maxAttempts) {
          nextLeadStatus = LeadStatus.EXHAUSTED;
        } else {
          nextLeadStatus = LeadStatus.NEW;
          nextEligibleAt = new Date(
            closedAt.getTime() + settings.retryCooldownHours * 60 * 60 * 1000,
          );
        }
      } else if (data.outcome === CallOutcome.WRONG_NUMBER) {
        nextLeadStatus = LeadStatus.CLOSED;
      } else {
        // CONNECTED
        nextLeadStatus = LeadStatus.CLOSED;
      }

      await tx.case.update({
        where: { id: openCase.id },
        data: {
          status: CaseStatus.CLOSED,
          closedAt,
          outcome: data.outcome,
          rating:
            data.outcome === CallOutcome.CONNECTED ? data.rating : null,
          remarks: data.remarks?.trim() ? data.remarks.trim() : null,
          durationSeconds,
        },
      });

      await tx.lead.update({
        where: { id: openCase.leadId },
        data: {
          status: nextLeadStatus,
          attempts: nextAttempts,
          nextEligibleAt:
            nextLeadStatus === LeadStatus.NEW ? nextEligibleAt : null,
        },
      });

      let referralsSaved = 0;
      const priority = referralPriority(
        data.outcome === CallOutcome.CONNECTED ? data.rating : null,
      );

      for (const ref of normalisedReferrals) {
        const existing = await tx.lead.findUnique({
          where: { phone: ref.phone },
          select: { id: true },
        });

        let leadId: string;
        if (existing) {
          leadId = existing.id;
          referralNotes.push(
            `${ref.name ?? "A friend number"} is already in our database`,
          );
        } else {
          const years = parseExperienceYears(ref.experienceText);
          const created = await tx.lead.create({
            data: {
              phone: ref.phone,
              name: ref.name ?? null,
              trade: ref.designation ?? null,
              experienceYears:
                years != null ? new Prisma.Decimal(years) : null,
              source: LeadSource.REFERRAL,
              referredByLeadId: openCase.leadId,
              status: LeadStatus.NEW,
              priority,
            },
            select: { id: true },
          });
          leadId = created.id;
        }

        await tx.referral.create({
          data: {
            caseId: openCase.id,
            leadId,
            phone: ref.phone,
            name: ref.name ?? null,
            experienceText: ref.experienceText ?? null,
            designation: ref.designation ?? null,
          },
        });
        referralsSaved += 1;
      }

      return {
        caseId: openCase.id,
        outcome: data.outcome,
        rating:
          data.outcome === CallOutcome.CONNECTED ? (data.rating ?? null) : null,
        referralsSaved,
      };
    });

    await writeAudit({
      actorId: input.employeeId,
      action: "CASE_CLOSE",
      entityType: "Case",
      entityId: result.caseId,
      meta: {
        outcome: result.outcome,
        rating: result.rating,
        referralsSaved: result.referralsSaved,
      },
      ip: input.ip,
    });

    return {
      ok: true,
      data: { ...result, referralNotes },
    };
  } catch (err) {
    const e = err as { code?: string; message?: string };
    if (e.code === "NOT_FOUND") {
      return {
        ok: false,
        error: { code: "NOT_FOUND", message: e.message ?? "Not found" },
      };
    }
    throw err;
  }
}
