import { z } from "zod";

export const dashboardPeriodSchema = z.enum(["today", "7d", "30d"]).default("30d");

export type DashboardPeriod = z.infer<typeof dashboardPeriodSchema>;

export const releaseCaseSchema = z.object({
  caseId: z.string().min(1),
  reason: z
    .string()
    .trim()
    .min(3, "Reason must be at least 3 characters")
    .max(500),
});

export type ReleaseCaseInput = z.infer<typeof releaseCaseSchema>;
