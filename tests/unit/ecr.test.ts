import { describe, expect, it } from "vitest";
import { buildEcrFile, type EcrSourceLine } from "@/server/payroll/calc/ecr";

const CEILING = 1_500_000;

function line(overrides: Partial<EcrSourceLine> = {}): EcrSourceLine {
  return {
    employeeCode: "E1",
    fullName: "Rahul Sharma",
    uan: "100912345678",
    payableDays: 30,
    earnedGrossPaise: 4_500_000,
    otherEarningsPaise: 0,
    pfEmployeePaise: 180_000,
    snapshot: {
      pfApplicable: true,
      pfBasePaise: 1_500_000,
      rates: { pfWageCeilingPaise: CEILING },
      results: {
        employerEpsPaise: 125_000,
        employerEpfPaise: 55_000,
      },
    },
    ...overrides,
  };
}

describe("buildEcrFile", () => {
  it("writes 11 hash-tilde fields in whole rupees", () => {
    const { text, skipped } = buildEcrFile([line()], 31, CEILING);
    expect(skipped).toEqual([]);
    expect(text).toBe(
      "100912345678#~#Rahul Sharma#~#45000#~#15000#~#15000#~#15000#~#1800#~#1250#~#550#~#1#~#0\n",
    );
    expect(text.trim().split("#~#")).toHaveLength(11);
  });

  it("sets NCP to the days in the month when EPF wages are 0", () => {
    const { text } = buildEcrFile(
      [
        line({
          payableDays: 0,
          earnedGrossPaise: 0,
          pfEmployeePaise: 0,
          snapshot: {
            pfApplicable: true,
            pfBasePaise: 0,
            rates: { pfWageCeilingPaise: CEILING },
            results: { employerEpsPaise: 0, employerEpfPaise: 0 },
          },
        }),
      ],
      31,
      CEILING,
    );
    expect(text).toBe(
      "100912345678#~#Rahul Sharma#~#0#~#0#~#0#~#0#~#0#~#0#~#0#~#31#~#0\n",
    );
  });

  it("rounds a half payable day up to a whole NCP day", () => {
    const { text } = buildEcrFile([line({ payableDays: 29.5 })], 31, CEILING);
    const ncp = text.trim().split("#~#")[9];
    expect(ncp).toBe("2");
  });

  it("adds other earnings into gross and caps EPF wages at gross", () => {
    const { text } = buildEcrFile(
      [
        line({
          earnedGrossPaise: 100_000,
          otherEarningsPaise: 50_000,
          snapshot: {
            pfApplicable: true,
            pfBasePaise: 200_000,
            rates: { pfWageCeilingPaise: CEILING },
            results: { employerEpsPaise: 0, employerEpfPaise: 0 },
          },
        }),
      ],
      30,
      CEILING,
    );
    const fields = text.trim().split("#~#");
    expect(fields[2]).toBe("1500");
    expect(fields[3]).toBe("1500");
    expect(fields[4]).toBe("1500");
    expect(fields[5]).toBe("1500");
  });

  it("caps EPS and EDLI wages at the PF ceiling", () => {
    const { text } = buildEcrFile(
      [
        line({
          earnedGrossPaise: 2_500_000,
          snapshot: {
            pfApplicable: true,
            pfBasePaise: 2_000_000,
            rates: { pfWageCeilingPaise: CEILING },
            results: { employerEpsPaise: 125_000, employerEpfPaise: 115_000 },
          },
        }),
      ],
      30,
      CEILING,
    );
    const fields = text.trim().split("#~#");
    expect(fields[2]).toBe("25000");
    expect(fields[3]).toBe("20000");
    expect(fields[4]).toBe("15000");
    expect(fields[5]).toBe("15000");
  });

  it("skips a PF member with a bad UAN and omits members who are not in PF", () => {
    const { text, skipped } = buildEcrFile(
      [
        line({
          employeeCode: "E2",
          fullName: "No Uan",
          uan: "123",
        }),
        line({
          employeeCode: "E3",
          fullName: "Missing",
          uan: null,
        }),
        line({
          employeeCode: "E4",
          fullName: "Not Covered",
          snapshot: {
            pfApplicable: false,
            pfBasePaise: 1_500_000,
            rates: { pfWageCeilingPaise: CEILING },
            results: { employerEpsPaise: 0, employerEpfPaise: 0 },
          },
        }),
        line({ fullName: "A#~#B\nC" }),
      ],
      30,
      CEILING,
    );
    expect(skipped).toEqual([
      { employeeCode: "E2", fullName: "No Uan" },
      { employeeCode: "E3", fullName: "Missing" },
    ]);
    expect(text).toBe(
      "100912345678#~#A B C#~#45000#~#15000#~#15000#~#15000#~#1800#~#1250#~#550#~#0#~#0\n",
    );
  });
});
