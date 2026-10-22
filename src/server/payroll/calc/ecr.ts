import { roundHalfUpRupee } from "@/server/payroll/calc/rounding";

/** One payroll line, plus the member identity EPFO needs on the ECR. */
export type EcrSourceLine = {
  employeeCode: string;
  fullName: string;
  uan: string | null;
  payableDays: number;
  earnedGrossPaise: number;
  otherEarningsPaise: number;
  pfEmployeePaise: number;
  snapshot: unknown;
};

export type EcrSkip = {
  employeeCode: string;
  fullName: string;
};

export type EcrFile = {
  text: string;
  skipped: EcrSkip[];
};

const UAN_RE = /^\d{12}$/;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

function rupees(paise: number): number {
  return roundHalfUpRupee(paise) / 100;
}

/** EPFO does not accept a half day. Half-up, then clamp to the month. */
export function ecrNcpDays(
  epfWagesRupees: number,
  payableDays: number,
  daysInMonth: number,
): number {
  if (epfWagesRupees === 0) return daysInMonth;
  const raw = daysInMonth - payableDays;
  const rounded =
    raw >= 0 ? Math.floor(raw + 0.5) : -Math.floor(Math.abs(raw) + 0.5);
  return Math.min(daysInMonth, Math.max(0, rounded));
}

function memberName(fullName: string, employeeCode: string): string {
  const cleaned = fullName
    .replace(/[#~\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || employeeCode;
}

type PfParts = {
  applicable: boolean;
  pfBasePaise: number;
  employerEpsPaise: number;
  employerEpfPaise: number;
  ceilingPaise: number | null;
};

function readPf(snapshot: unknown, fallbackCeilingPaise: number | null): PfParts {
  const root = asRecord(snapshot);
  if (!root) {
    return {
      applicable: false,
      pfBasePaise: 0,
      employerEpsPaise: 0,
      employerEpfPaise: 0,
      ceilingPaise: fallbackCeilingPaise,
    };
  }
  const results = asRecord(root.results);
  const rates = asRecord(root.rates);
  return {
    applicable: root.pfApplicable === true,
    pfBasePaise: asNumber(root.pfBasePaise) ?? 0,
    employerEpsPaise: asNumber(results?.employerEpsPaise) ?? 0,
    employerEpfPaise: asNumber(results?.employerEpfPaise) ?? 0,
    ceilingPaise: asNumber(rates?.pfWageCeilingPaise) ?? fallbackCeilingPaise,
  };
}

/**
 * EPFO ECR 2.0 text: one member per line, 11 fields separated by `#~#`.
 * Wages and contributions are whole rupees. Refund of advances is 0.
 */
export function buildEcrFile(
  lines: EcrSourceLine[],
  daysInMonth: number,
  fallbackCeilingPaise: number | null = null,
): EcrFile {
  const rows: string[] = [];
  const skipped: EcrSkip[] = [];

  for (const line of lines) {
    const pf = readPf(line.snapshot, fallbackCeilingPaise);
    if (!pf.applicable) continue;

    const uan = line.uan?.trim() ?? "";
    if (!UAN_RE.test(uan)) {
      skipped.push({
        employeeCode: line.employeeCode,
        fullName: line.fullName,
      });
      continue;
    }

    const gross = rupees(line.earnedGrossPaise + line.otherEarningsPaise);
    const epf = Math.min(rupees(pf.pfBasePaise), gross);
    const ceiling =
      pf.ceilingPaise == null ? epf : Math.min(epf, rupees(pf.ceilingPaise));
    const epsWages = ceiling;
    const edliWages = ceiling;
    const fields = [
      uan,
      memberName(line.fullName, line.employeeCode),
      String(gross),
      String(epf),
      String(epsWages),
      String(edliWages),
      String(rupees(line.pfEmployeePaise)),
      String(rupees(pf.employerEpsPaise)),
      String(rupees(pf.employerEpfPaise)),
      String(ecrNcpDays(epf, line.payableDays, daysInMonth)),
      "0",
    ];
    rows.push(fields.join("#~#"));
  }

  return {
    text: rows.length > 0 ? `${rows.join("\n")}\n` : "",
    skipped,
  };
}
