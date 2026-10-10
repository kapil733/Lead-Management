export type SalaryComponent = {
  key: string;
  label: string;
  amountPaise: number;
  pfWage: boolean;
  esicWage: boolean;
};

export type AdjustmentInput = {
  type:
    | "BONUS"
    | "OVERTIME_PAY"
    | "OTHER_EARNING"
    | "ADVANCE_DEDUCTION"
    | "OTHER_DEDUCTION";
  amountPaise: number;
  note?: string | null;
};

export type StatutoryRates = {
  id: string;
  effectiveFrom: string; // YYYY-MM-DD
  pfEmployeeRate: number;
  pfEmployerEpsRate: number;
  pfEmployerEpfRate: number;
  pfWageCeilingPaise: number;
  edliRate: number;
  pfAdminRate: number;
  esicEmployeeRate: number;
  esicEmployerRate: number;
  esicWageCeilingPaise: number;
  dayDivisor: "CALENDAR_DAYS" | "FIXED_30" | "WORKING_DAYS";
};

export type CalcEmployeeInput = {
  month: string;
  daysInMonth: number;
  payableDays: number;
  /** Count of weekly-off days in month (employee schedule) for WORKING_DAYS divisor. */
  weeklyOffDaysInMonth: number;
  /** Count of global holidays overlapping month for WORKING_DAYS divisor. */
  holidaysInMonth: number;
  structure: {
    id: string;
    monthlyGrossPaise: number;
    components: SalaryComponent[];
    effectiveFrom: string;
  };
  pfApplicable: boolean;
  pfOnActualWage: boolean;
  esicApplicableFlag: boolean;
  adjustments: AdjustmentInput[];
  config: StatutoryRates;
};

export type EarnedComponent = SalaryComponent & {
  earnedPaise: number;
};

export type CalcResult = {
  payableDays: number;
  divisor: number;
  factor: number;
  componentsEarned: EarnedComponent[];
  earnedGrossPaise: number;
  pfWagePaise: number;
  pfBasePaise: number;
  pfEmployeePaise: number;
  employerEpsPaise: number;
  employerEpfPaise: number;
  employerPfPaise: number;
  employerEdliPaise: number;
  employerAdminPaise: number;
  esicCovered: boolean;
  esicWagePaise: number;
  esicEmployeePaise: number;
  employerEsicPaise: number;
  otherEarningsPaise: number;
  otherDeductionsPaise: number;
  netPayPaise: number;
  /** Amount by which deductions exceeded earnings before floor at 0. */
  netShortfallPaise: number;
  snapshot: Record<string, unknown>;
};
