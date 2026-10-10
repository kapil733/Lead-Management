import { formatInTimeZone } from "date-fns-tz";

export const APP_TZ = "Asia/Kolkata";

/** Display format: DD MMM YYYY */
export function formatDisplayDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return formatInTimeZone(d, APP_TZ, "dd MMM yyyy");
}

/** Display format: DD MMM YYYY, HH:mm (IST) */
export function formatDisplayDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return formatInTimeZone(d, APP_TZ, "dd MMM yyyy, HH:mm");
}

/** Month key: YYYY-MM in Asia/Kolkata */
export function monthKey(date: Date = new Date()): string {
  return formatInTimeZone(date, APP_TZ, "yyyy-MM");
}

/** Start of "today" in Asia/Kolkata as UTC Date (for comparisons). */
export function startOfTodayIST(now: Date = new Date()): Date {
  const ymd = formatInTimeZone(now, APP_TZ, "yyyy-MM-dd");
  // Interpret midnight IST as absolute instant
  return new Date(`${ymd}T00:00:00+05:30`);
}
