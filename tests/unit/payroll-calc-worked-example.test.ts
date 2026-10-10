import { describe, expect, it } from "vitest";
import { calculateEmployeeSalary } from "@/server/payroll/calc/salary";
import { toPaise } from "@/lib/money";
import type { StatutoryRates } from "@/server/payroll/calc/types";

/** Seed / docs/PAYROLL_RULES.md defaults as numbers (not hardcoded in calc). */
const config: StatutoryRates = {
  id: "cfg-test",
  effectiveFrom: "2026-01-01",
  pfEmployeeRate: 0.12,
  pfEmployerEpsRate: 0.0833,
  pfEmployerEpfRate: 0.0367,
  pfWageCeilingPaise: toPaise(15000),
  edliRate: 0.005,
  pfAdminRate: 0.005,
  esicEmployeeRate: 0.0075,
  esicEmployerRate: 0.0325,
  esicWageCeilingPaise: toPaise(21000),
  dayDivisor: "CALENDAR_DAYS",
};

describe("payroll worked example (PAYROLL_RULES.md)", () => {
  it("matches Sep 2026 ₹18,000 structure exactly", () => {
    const result = calculateEmployeeSalary({
      month: "2026-09",
      daysInMonth: 30,
      payableDays: 28.5, // 22P + 0.5HD + 1PL + 1H + 4WO
      weeklyOffDaysInMonth: 4,
      holidaysInMonth: 1,
      structure: {
        id: "struct-1",
        monthlyGrossPaise: toPaise(18000),
        effectiveFrom: "2026-01-01",
        components: [
          {
            key: "BASIC",
            label: "Basic",
            amountPaise: toPaise(9000),
            pfWage: true,
            esicWage: true,
          },
          {
            key: "HRA",
            label: "HRA",
            amountPaise: toPaise(4500),
            pfWage: false,
            esicWage: true,
          },
          {
            key: "SPECIAL",
            label: "Special",
            amountPaise: toPaise(4500),
            pfWage: false,
            esicWage: true,
          },
        ],
      },
      pfApplicable: true,
      pfOnActualWage: false,
      esicApplicableFlag: true,
      adjustments: [],
      config,
    });

    expect(result.payableDays).toBe(28.5);
    expect(result.factor).toBe(0.95);
    expect(result.earnedGrossPaise).toBe(toPaise(17100));
    expect(
      result.componentsEarned.find((c) => c.key === "BASIC")?.earnedPaise,
    ).toBe(toPaise(8550));
    expect(result.pfEmployeePaise).toBe(toPaise(1026));
    expect(result.esicWagePaise).toBe(toPaise(17100));
    expect(result.esicEmployeePaise).toBe(toPaise(129));
    expect(result.employerEsicPaise).toBe(toPaise(556));
    expect(result.employerEpsPaise).toBe(toPaise(712));
    expect(result.employerEpfPaise).toBe(toPaise(314));
    expect(result.netPayPaise).toBe(toPaise(15945));
  });
});
