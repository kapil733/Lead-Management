import { z } from "zod";
import { CallOutcome } from "@prisma/client";

export const analyticsTabSchema = z.enum([
  "overview",
  "telecallers",
  "referrals",
  "time",
  "data",
]);

export type AnalyticsTab = z.infer<typeof analyticsTabSchema>;

export const analyticsFiltersSchema = z.object({
  tab: analyticsTabSchema.default("overview"),
  from: z.string().optional(), // YYYY-MM-DD IST
  to: z.string().optional(),
  employeeId: z.string().optional(),
  outcome: z.nativeEnum(CallOutcome).optional(),
  rating: z.coerce.number().int().min(0).max(5).optional(),
  city: z.string().trim().optional(),
  trade: z.string().trim().optional(),
  /** Cross-filter: hour of day 0–23 IST */
  hour: z.coerce.number().int().min(0).max(23).optional(),
  /** Cross-filter: day of week 0=Sun … 6=Sat IST */
  dow: z.coerce.number().int().min(0).max(6).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export type AnalyticsFilters = z.infer<typeof analyticsFiltersSchema>;

export const ANALYTICS_EXPORT_MAX = 10_000;
