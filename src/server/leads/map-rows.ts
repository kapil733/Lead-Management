import { normalisePhone } from "@/lib/phone";
import {
  PROFILE_EXTRA_KEYS,
  type ColumnTarget,
} from "@/lib/validators/leads";

export type MappedLeadRow = {
  rowNumber: number;
  phone: string | null;
  rawPhone: string;
  name: string | null;
  city: string | null;
  trade: string | null;
  experienceYears: number | null;
  extra: Record<string, string>;
  error?: string;
};

function parseExperience(raw: string): number | null {
  if (!raw.trim()) return null;
  const match = raw.trim().match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const n = Number(match[1]);
  if (!Number.isFinite(n) || n < 0 || n > 60) return null;
  return Math.round(n * 10) / 10;
}

export function mapRows(
  headers: string[],
  rows: string[][],
  mapping: Record<string, ColumnTarget>,
): MappedLeadRow[] {
  const phoneHeader = Object.entries(mapping).find(([, t]) => t === "phone")?.[0];
  if (!phoneHeader) {
    throw new Error("Phone column must be mapped");
  }

  return rows.map((row, index) => {
    const byHeader = (header: string) => {
      const i = headers.indexOf(header);
      return i >= 0 ? (row[i] ?? "").trim() : "";
    };

    let name: string | null = null;
    let city: string | null = null;
    let trade: string | null = null;
    let experienceYears: number | null = null;
    const extra: Record<string, string> = {};
    let rawPhone = "";

    for (const [header, target] of Object.entries(mapping)) {
      const value = byHeader(header);
      switch (target) {
        case "phone":
          rawPhone = value;
          break;
        case "name":
          name = value || null;
          break;
        case "city":
          city = value || null;
          break;
        case "trade":
          trade = value || null;
          break;
        case "experienceYears":
          experienceYears = value ? parseExperience(value) : null;
          if (value) extra[PROFILE_EXTRA_KEYS.experienceYears!] = value;
          break;
        case "alternatePhone": {
          if (!value) break;
          const key = PROFILE_EXTRA_KEYS.alternatePhone!;
          extra[key] = normalisePhone(value) ?? value;
          break;
        }
        case "dob":
        case "email":
        case "recruitmentStatus":
        case "currentCompany":
        case "currentSalary":
        case "expectedSalary":
        case "noticePeriod":
        case "confirmedCtc":
        case "dateOfJoining":
        case "resumeUrl":
        case "serial":
          if (value) extra[PROFILE_EXTRA_KEYS[target]!] = value;
          break;
        case "extra":
          if (value) extra[header] = value;
          break;
        case "ignore":
          break;
      }
    }

    const phone = rawPhone ? normalisePhone(rawPhone) : null;
    const mapped: MappedLeadRow = {
      rowNumber: index + 1,
      phone,
      rawPhone,
      name,
      city,
      trade,
      experienceYears,
      extra,
    };

    if (!rawPhone) {
      mapped.error = "Phone is required";
      mapped.phone = null;
    } else if (!phone) {
      mapped.error = "Invalid phone number";
    }

    return mapped;
  });
}
