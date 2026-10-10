import { z } from "zod";
import { LeadSource, LeadStatus } from "@prisma/client";

export const IMPORT_MAX_BYTES = 4 * 1024 * 1024;
export const IMPORT_MAX_ROWS = 20_000;
export const IMPORT_CHUNK_SIZE = 500;

/** City table names chosen on a multi-table import. */
export const importCitiesSchema = z
  .array(z.string().trim().min(1).max(80))
  .max(200);

export const columnTargetSchema = z.enum([
  "phone",
  "name",
  "city",
  "trade",
  "experienceYears",
  "dob",
  "email",
  "recruitmentStatus",
  "currentCompany",
  "currentSalary",
  "expectedSalary",
  "noticePeriod",
  "confirmedCtc",
  "dateOfJoining",
  "resumeUrl",
  "alternatePhone",
  "serial",
  "ignore",
  "extra",
]);

export type ColumnTarget = z.infer<typeof columnTargetSchema>;

/** Map-to choices, in the order they appear on the import wizard. */
export const COLUMN_TARGET_OPTIONS: { value: ColumnTarget; label: string }[] = [
  { value: "phone", label: "Phone (required)" },
  { value: "alternatePhone", label: "Alternative mobile" },
  { value: "name", label: "Name" },
  { value: "serial", label: "Serial no." },
  { value: "dob", label: "Date of birth" },
  { value: "email", label: "Email" },
  { value: "city", label: "Location / city" },
  { value: "recruitmentStatus", label: "Recruitment status" },
  { value: "currentCompany", label: "Current company" },
  { value: "currentSalary", label: "Current salary" },
  { value: "expectedSalary", label: "Expected salary" },
  { value: "noticePeriod", label: "Notice period" },
  { value: "confirmedCtc", label: "Confirmed CTC" },
  { value: "dateOfJoining", label: "Date of joining" },
  { value: "trade", label: "Position / trade" },
  { value: "experienceYears", label: "Experience" },
  { value: "resumeUrl", label: "Resume" },
  { value: "ignore", label: "Ignore" },
  { value: "extra", label: "Keep as extra" },
];

/** Stable extra-JSON key for profile fields that have no Lead column. */
export const PROFILE_EXTRA_KEYS: Partial<Record<ColumnTarget, string>> = {
  dob: "DOB",
  email: "Email",
  recruitmentStatus: "Recruitment status",
  currentCompany: "Current company",
  currentSalary: "Current salary",
  expectedSalary: "Expected salary",
  noticePeriod: "Notice period",
  confirmedCtc: "Confirmed CTC",
  dateOfJoining: "DOJ",
  resumeUrl: "Resume",
  alternatePhone: "Alternative mobile",
  serial: "S.No",
  experienceYears: "Experience",
};

export const columnMappingSchema = z.record(z.string(), columnTargetSchema);

export const leadListFiltersSchema = z.object({
  status: z.nativeEnum(LeadStatus).optional(),
  source: z.nativeEnum(LeadSource).optional(),
  joined: z.enum(["all", "yes", "no"]).default("all"),
  importBatchId: z.string().optional(),
  q: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export type LeadListFilters = z.infer<typeof leadListFiltersSchema>;

/** Auto-guess mapping target from a header label. */
export function guessColumnTarget(header: string): ColumnTarget {
  const h = header
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[_\s.]+/g, " ")
    .trim();

  if (
    h.includes("alternate") ||
    h.includes("alternative") ||
    h.includes("family mobile") ||
    h.includes("family phone")
  ) {
    return "alternatePhone";
  }
  if (
    h === "phone" ||
    h === "mobile" ||
    h === "mobile no" ||
    h === "mobile number" ||
    h === "phone number" ||
    h === "contact" ||
    h.includes("phone") ||
    h.includes("mobile")
  ) {
    return "phone";
  }
  if (h === "name" || h === "full name" || h === "candidate name") {
    return "name";
  }
  if (h === "s no" || h === "sno" || h === "serial" || h === "serial no") {
    return "serial";
  }
  if (h === "dob" || h === "date of birth" || h === "birth date") {
    return "dob";
  }
  if (h === "email" || h === "email id" || h === "e mail" || h.includes("email")) {
    return "email";
  }
  if (h === "city" || h === "location" || h === "town") {
    return "city";
  }
  if (h === "status" || h === "recruitment status" || h === "candidate status") {
    return "recruitmentStatus";
  }
  if (h === "current company" || h === "company" || h.includes("current company")) {
    return "currentCompany";
  }
  if (h.includes("current salary")) {
    return "currentSalary";
  }
  if (h.includes("expected salary")) {
    return "expectedSalary";
  }
  if (h.includes("notice")) {
    return "noticePeriod";
  }
  if (h.includes("ctc") || h.includes("confirmed")) {
    return "confirmedCtc";
  }
  if (h === "doj" || h === "date of joining" || h.includes("joining")) {
    return "dateOfJoining";
  }
  if (
    h === "trade" ||
    h === "skill" ||
    h === "designation" ||
    h === "role" ||
    h.includes("position") ||
    h.includes("applied for")
  ) {
    return "trade";
  }
  if (
    h === "experience" ||
    h === "experience years" ||
    h === "exp" ||
    h === "exp years" ||
    h.includes("experience")
  ) {
    return "experienceYears";
  }
  if (h.includes("resume")) {
    return "resumeUrl";
  }
  if (h === "source") {
    return "ignore";
  }
  return "extra";
}
