/**
 * Pure attendance day resolution — no Prisma.
 * Explicit mark > global holiday > weekly off > unmarked.
 */

export type ExplicitStatus =
  | "PRESENT"
  | "HALF_DAY"
  | "ABSENT"
  | "PAID_LEAVE"
  | "WEEKLY_OFF"
  | "HOLIDAY_WORKED";

export type EffectiveKind =
  | ExplicitStatus
  | "HOLIDAY"
  | "UNMARKED"
  | "OUT_OF_RANGE";

export type ResolvedDay = {
  date: string; // YYYY-MM-DD
  weekday: number; // 0=Sun … 6=Sat (UTC date components)
  effective: EffectiveKind;
  explicit: ExplicitStatus | null;
  code: string;
  editable: boolean;
  /** Payable contribution for this day (0 | 0.5 | 1). */
  payable: number;
  isWeekendColumn: boolean; // Sat/Sun for grid shading
  holidayName: string | null;
};

const CODE: Record<EffectiveKind, string> = {
  PRESENT: "P",
  HALF_DAY: "½",
  ABSENT: "A",
  PAID_LEAVE: "PL",
  WEEKLY_OFF: "WO",
  HOLIDAY_WORKED: "H",
  HOLIDAY: "H",
  UNMARKED: "",
  OUT_OF_RANGE: "",
};

export function ymdFromDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function dateFromYmd(ymd: string): Date {
  return new Date(`${ymd}T00:00:00.000Z`);
}

export function daysInMonth(year: number, month1to12: number): number {
  return new Date(Date.UTC(year, month1to12, 0)).getUTCDate();
}

export function parseMonthKey(month: string): { year: number; month: number } {
  const m = /^(\d{4})-(\d{2})$/.exec(month);
  if (!m) throw new Error(`Invalid month key ${month}`);
  return { year: Number(m[1]), month: Number(m[2]) };
}

export function weekdayUtc(ymd: string): number {
  return dateFromYmd(ymd).getUTCDay();
}

export function payableForEffective(kind: EffectiveKind): number {
  switch (kind) {
    case "PRESENT":
    case "PAID_LEAVE":
    case "WEEKLY_OFF":
    case "HOLIDAY":
      return 1;
    case "HALF_DAY":
      return 0.5;
    case "HOLIDAY_WORKED":
      // OQ-002: treat as Present for payable days until clarified
      return 1;
    default:
      return 0;
  }
}

export function resolveDayStatus(input: {
  date: string; // YYYY-MM-DD
  explicit: ExplicitStatus | null;
  holiday: { name: string; isPaid: boolean } | null;
  weeklyOffDays: number[];
  dateOfJoining: string; // YYYY-MM-DD
  dateOfExit: string | null;
}): ResolvedDay {
  const weekday = weekdayUtc(input.date);
  const isWeekendColumn = weekday === 0 || weekday === 6;

  if (
    input.date < input.dateOfJoining ||
    (input.dateOfExit != null && input.date > input.dateOfExit)
  ) {
    return {
      date: input.date,
      weekday,
      effective: "OUT_OF_RANGE",
      explicit: null,
      code: "",
      editable: false,
      payable: 0,
      isWeekendColumn,
      holidayName: input.holiday?.name ?? null,
    };
  }

  if (input.explicit) {
    return {
      date: input.date,
      weekday,
      effective: input.explicit,
      explicit: input.explicit,
      code: CODE[input.explicit],
      editable: true,
      payable: payableForEffective(input.explicit),
      isWeekendColumn,
      holidayName: input.holiday?.name ?? null,
    };
  }

  if (input.holiday) {
    // Unpaid holiday → still HOLIDAY display but payable 0
    const payable = input.holiday.isPaid ? 1 : 0;
    return {
      date: input.date,
      weekday,
      effective: "HOLIDAY",
      explicit: null,
      code: "H",
      editable: true,
      payable,
      isWeekendColumn,
      holidayName: input.holiday.name,
    };
  }

  if (input.weeklyOffDays.includes(weekday)) {
    return {
      date: input.date,
      weekday,
      effective: "WEEKLY_OFF",
      explicit: null,
      code: "WO",
      editable: true,
      payable: 1,
      isWeekendColumn,
      holidayName: null,
    };
  }

  return {
    date: input.date,
    weekday,
    effective: "UNMARKED",
    explicit: null,
    code: "",
    editable: true,
    payable: 0,
    isWeekendColumn,
    holidayName: null,
  };
}

export function monthDateList(monthKey: string): string[] {
  const { year, month } = parseMonthKey(monthKey);
  const n = daysInMonth(year, month);
  const out: string[] = [];
  for (let d = 1; d <= n; d++) {
    out.push(
      `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
    );
  }
  return out;
}

/** Unmarked working days (editable + effective UNMARKED). */
export function countUnmarkedWorking(days: ResolvedDay[]): number {
  return days.filter((d) => d.effective === "UNMARKED" && d.editable).length;
}

export function sumPayable(days: ResolvedDay[]): number {
  return days.reduce((a, d) => a + d.payable, 0);
}
