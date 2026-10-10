/**
 * Pure payroll calculation — no Prisma / I/O.
 * Rates come from CalcEmployeeInput.config (StatutoryConfig), never literals.
 */

import {
  ceilRupee,
  roundHalfUpRupee,
  roundNearestPaise,
} from "@/server/payroll/calc/rounding";
import type {
  CalcEmployeeInput,
  CalcResult,
  EarnedComponent,
} from "@/server/payroll/calc/types";

export function resolveDivisor(input: CalcEmployeeInput): number {
  switch (input.config.dayDivisor) {
    case "FIXED_30":
      return 30;
    case "WORKING_DAYS":
      return Math.max(
        1,
        input.daysInMonth -
          input.weeklyOffDaysInMonth -
          input.holidaysInMonth,
      );
    case "CALENDAR_DAYS":
    default:
      return input.daysInMonth;
  }
}

export function calculateEmployeeSalary(
  input: CalcEmployeeInput,
): CalcResult {
  const payableDays = Math.min(input.payableDays, input.daysInMonth);
  const divisor = resolveDivisor(input);
  const factor = Math.min(1, payableDays / divisor);

  const componentsEarned: EarnedComponent[] = input.structure.components.map(
    (c) => ({
      ...c,
      earnedPaise: roundNearestPaise(c.amountPaise * factor),
    }),
  );
  const earnedGrossPaise = componentsEarned.reduce(
    (a, c) => a + c.earnedPaise,
    0,
  );

  const pfWagePaise = componentsEarned
    .filter((c) => c.pfWage)
    .reduce((a, c) => a + c.earnedPaise, 0);

  let pfEmployeePaise = 0;
  let employerEpsPaise = 0;
  let employerEpfPaise = 0;
  let employerEdliPaise = 0;
  let employerAdminPaise = 0;
  let pfBasePaise = 0;

  if (input.pfApplicable && pfWagePaise > 0) {
    const ceiling = input.config.pfWageCeilingPaise;
    pfBasePaise = input.pfOnActualWage
      ? pfWagePaise
      : Math.min(pfWagePaise, ceiling);
    const epsBase = Math.min(pfWagePaise, ceiling);

    pfEmployeePaise = roundHalfUpRupee(
      pfBasePaise * input.config.pfEmployeeRate,
    );
    employerEpsPaise = roundHalfUpRupee(
      epsBase * input.config.pfEmployerEpsRate,
    );
    const employer12 = roundHalfUpRupee(
      pfBasePaise * input.config.pfEmployeeRate,
    );
    employerEpfPaise = Math.max(0, employer12 - employerEpsPaise);
    employerEdliPaise = roundHalfUpRupee(pfBasePaise * input.config.edliRate);
    employerAdminPaise = roundHalfUpRupee(
      pfBasePaise * input.config.pfAdminRate,
    );
  }

  const employerPfPaise = employerEpsPaise + employerEpfPaise;

  // Adjustments
  let otherEarningsPaise = 0;
  let otherDeductionsPaise = 0;
  let overtimeForEsicPaise = 0;
  for (const adj of input.adjustments) {
    switch (adj.type) {
      case "BONUS":
      case "OTHER_EARNING":
        otherEarningsPaise += adj.amountPaise;
        break;
      case "OVERTIME_PAY":
        otherEarningsPaise += adj.amountPaise;
        overtimeForEsicPaise += adj.amountPaise; // OQ-003: include OT in ESIC wages
        break;
      case "ADVANCE_DEDUCTION":
      case "OTHER_DEDUCTION":
        otherDeductionsPaise += adj.amountPaise;
        break;
    }
  }

  // ESIC: covered if flag AND full monthly structure gross ≤ ceiling
  const esicCovered =
    input.esicApplicableFlag &&
    input.structure.monthlyGrossPaise <= input.config.esicWageCeilingPaise;

  const esicWageFromComponents = componentsEarned
    .filter((c) => c.esicWage)
    .reduce((a, c) => a + c.earnedPaise, 0);
  const esicWagePaise = esicCovered
    ? esicWageFromComponents + overtimeForEsicPaise
    : 0;

  let esicEmployeePaise = 0;
  let employerEsicPaise = 0;
  if (esicCovered && esicWagePaise > 0) {
    esicEmployeePaise = ceilRupee(
      esicWagePaise * input.config.esicEmployeeRate,
    );
    employerEsicPaise = ceilRupee(
      esicWagePaise * input.config.esicEmployerRate,
    );
  }

  const rawNet =
    earnedGrossPaise +
    otherEarningsPaise -
    pfEmployeePaise -
    esicEmployeePaise -
    otherDeductionsPaise;

  const netShortfallPaise = rawNet < 0 ? -rawNet : 0;
  const netPayPaise = Math.max(0, rawNet);

  const snapshot: Record<string, unknown> = {
    month: input.month,
    payableDays,
    divisor,
    factor,
    dayDivisor: input.config.dayDivisor,
    structureId: input.structure.id,
    structureEffectiveFrom: input.structure.effectiveFrom,
    monthlyGrossPaise: input.structure.monthlyGrossPaise,
    components: componentsEarned,
    pfApplicable: input.pfApplicable,
    pfOnActualWage: input.pfOnActualWage,
    pfWagePaise,
    pfBasePaise,
    esicApplicableFlag: input.esicApplicableFlag,
    esicCovered,
    esicWagePaise,
    adjustments: input.adjustments,
    otherEarningsPaise,
    otherDeductionsPaise,
    statutoryConfigId: input.config.id,
    statutoryEffectiveFrom: input.config.effectiveFrom,
    rates: {
      pfEmployeeRate: input.config.pfEmployeeRate,
      pfEmployerEpsRate: input.config.pfEmployerEpsRate,
      pfEmployerEpfRate: input.config.pfEmployerEpfRate,
      pfWageCeilingPaise: input.config.pfWageCeilingPaise,
      edliRate: input.config.edliRate,
      pfAdminRate: input.config.pfAdminRate,
      esicEmployeeRate: input.config.esicEmployeeRate,
      esicEmployerRate: input.config.esicEmployerRate,
      esicWageCeilingPaise: input.config.esicWageCeilingPaise,
    },
    results: {
      earnedGrossPaise,
      pfEmployeePaise,
      esicEmployeePaise,
      employerEpsPaise,
      employerEpfPaise,
      employerPfPaise,
      employerEdliPaise,
      employerAdminPaise,
      employerEsicPaise,
      netPayPaise,
      netShortfallPaise,
    },
  };

  return {
    payableDays,
    divisor,
    factor,
    componentsEarned,
    earnedGrossPaise,
    pfWagePaise,
    pfBasePaise,
    pfEmployeePaise,
    employerEpsPaise,
    employerEpfPaise,
    employerPfPaise,
    employerEdliPaise,
    employerAdminPaise,
    esicCovered,
    esicWagePaise,
    esicEmployeePaise,
    employerEsicPaise,
    otherEarningsPaise,
    otherDeductionsPaise,
    netPayPaise,
    netShortfallPaise,
    snapshot,
  };
}
