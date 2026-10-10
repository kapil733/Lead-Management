import { PROFILE_EXTRA_KEYS } from "@/lib/validators/leads";

/** Turn Prisma JSON `Lead.extra` into a string map. */
export function leadExtra(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (raw == null) continue;
    const text = String(raw).trim();
    if (text) out[key] = text;
  }
  return out;
}

/** Profile fields to show under the case header. Experience is shown beside city. */
export function profileEntries(extra: Record<string, string> | undefined): Array<[string, string]> {
  if (!extra) return [];
  const order = Object.values(PROFILE_EXTRA_KEYS).filter(
    (key) => key && key !== "Experience",
  );
  const seen = new Set<string>();
  const rows: Array<[string, string]> = [];
  for (const key of order) {
    const value = extra[key];
    if (!value) continue;
    seen.add(key);
    rows.push([key, value]);
  }
  for (const [key, value] of Object.entries(extra)) {
    if (seen.has(key) || key === "Experience" || !value) continue;
    rows.push([key, value]);
  }
  return rows;
}
