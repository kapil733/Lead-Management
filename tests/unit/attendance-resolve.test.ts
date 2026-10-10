import { describe, expect, it } from "vitest";
import {
  countUnmarkedWorking,
  resolveDayStatus,
  sumPayable,
} from "@/server/payroll/attendance/resolve";

describe("resolveDayStatus §8.3", () => {
  const base = {
    weeklyOffDays: [0], // Sunday
    dateOfJoining: "2026-01-01",
    dateOfExit: null as string | null,
  };

  it("uses explicit mark over holiday and weekly off", () => {
    const r = resolveDayStatus({
      ...base,
      date: "2026-08-15", // Independence Day Saturday in 2026? Aug 15 2026 is Saturday
      explicit: "PRESENT",
      holiday: { name: "Independence Day", isPaid: true },
    });
    expect(r.effective).toBe("PRESENT");
    expect(r.code).toBe("P");
    expect(r.payable).toBe(1);
  });

  it("falls back to global holiday when no explicit", () => {
    const r = resolveDayStatus({
      ...base,
      date: "2026-08-15",
      explicit: null,
      holiday: { name: "Independence Day", isPaid: true },
    });
    expect(r.effective).toBe("HOLIDAY");
    expect(r.code).toBe("H");
    expect(r.payable).toBe(1);
    expect(r.holidayName).toBe("Independence Day");
  });

  it("unpaid holiday has payable 0", () => {
    const r = resolveDayStatus({
      ...base,
      date: "2026-09-10",
      explicit: null,
      holiday: { name: "Local", isPaid: false },
    });
    expect(r.effective).toBe("HOLIDAY");
    expect(r.payable).toBe(0);
  });

  it("weekly off when weekday in weeklyOffDays", () => {
    // 2026-09-06 is Sunday
    const r = resolveDayStatus({
      ...base,
      date: "2026-09-06",
      explicit: null,
      holiday: null,
    });
    expect(r.weekday).toBe(0);
    expect(r.effective).toBe("WEEKLY_OFF");
    expect(r.code).toBe("WO");
    expect(r.payable).toBe(1);
  });

  it("unmarked working day is not payable", () => {
    // 2026-09-01 is Tuesday
    const r = resolveDayStatus({
      ...base,
      date: "2026-09-01",
      explicit: null,
      holiday: null,
    });
    expect(r.effective).toBe("UNMARKED");
    expect(r.code).toBe("");
    expect(r.payable).toBe(0);
    expect(r.editable).toBe(true);
  });

  it("OUT_OF_RANGE before DOJ / after exit", () => {
    const before = resolveDayStatus({
      ...base,
      date: "2025-12-31",
      explicit: "PRESENT",
      holiday: null,
      dateOfJoining: "2026-01-01",
    });
    expect(before.effective).toBe("OUT_OF_RANGE");
    expect(before.editable).toBe(false);
    expect(before.payable).toBe(0);

    const after = resolveDayStatus({
      ...base,
      date: "2026-10-01",
      explicit: null,
      holiday: null,
      dateOfExit: "2026-09-15",
    });
    expect(after.effective).toBe("OUT_OF_RANGE");
  });

  it("half day payable 0.5; HOLIDAY_WORKED as Present (OQ-002)", () => {
    expect(
      resolveDayStatus({
        ...base,
        date: "2026-09-02",
        explicit: "HALF_DAY",
        holiday: null,
      }).payable,
    ).toBe(0.5);
    expect(
      resolveDayStatus({
        ...base,
        date: "2026-09-02",
        explicit: "HOLIDAY_WORKED",
        holiday: { name: "X", isPaid: true },
      }).payable,
    ).toBe(1);
  });

  it("sumPayable and countUnmarkedWorking", () => {
    const days = [
      resolveDayStatus({
        ...base,
        date: "2026-09-01",
        explicit: "PRESENT",
        holiday: null,
      }),
      resolveDayStatus({
        ...base,
        date: "2026-09-02",
        explicit: null,
        holiday: null,
      }),
      resolveDayStatus({
        ...base,
        date: "2026-09-06",
        explicit: null,
        holiday: null,
      }),
    ];
    expect(sumPayable(days)).toBe(2); // P + WO
    expect(countUnmarkedWorking(days)).toBe(1);
  });
});
