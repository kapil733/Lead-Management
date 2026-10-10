# Payroll Rules

Pure functions in `src/server/payroll/calc/*.ts`. Statutory rates/ceilings come from effective-dated `StatutoryConfig`, never hardcoded in calc code. Rounding rules live in one file (`rounding.ts`).

**UI note (settings):** *"Verify rates with your CA / EPFO / ESIC notifications before relying on payroll."*

## Seed defaults (StatutoryConfig)

| Field | Default |
|---|---|
| PF employee | 12% |
| Employer EPS | 8.33% (on wages capped at ₹15,000) |
| Employer EPF | 12% − EPS part |
| PF wage ceiling | ₹15,000 (1,500,000 paise) |
| EDLI | 0.5% |
| PF admin charge | 0.5% |
| ESIC employee | 0.75% |
| ESIC employer | 3.25% |
| ESIC wage ceiling | ₹21,000 (2,100,000 paise) |
| Day divisor | `CALENDAR_DAYS` |

## Rounding

| Kind | Rule |
|---|---|
| PF (employee & employer parts, EDLI, admin) | Round **half up** to nearest rupee |
| ESIC (employee & employer) | Round **UP** (ceil) to next rupee |
| Component proration | Round to nearest paise per component, then sum |

Money storage: integer **paise**. Display via `formatINR` / `Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })`.

## Formulas

### 1. Payable days

```
payableDays = Present + 0.5×HalfDay + PaidLeave + WeeklyOff + PaidHoliday
```

Unpaid holiday and unmarked = 0. Cap at days-in-month. Half day = 0.5 payable and 0.5 LOP.

### 2. Divisor

| Mode | Value |
|---|---|
| `CALENDAR_DAYS` | days in month |
| `FIXED_30` | 30 |
| `WORKING_DAYS` | days in month − weekly offs − holidays |

### 3. Earned factor & gross

```
factor = min(1, payableDays / divisor)
componentEarned = round(component × factor)   // in paise
earnedGross = sum(componentEarned)
```

### 4. PF

```
pfWage = sum(earned components where pfWage=true)
if !pfApplicable → all PF/EDLI/admin = 0
pfBase = pfOnActualWage ? pfWage : min(pfWage, ceiling)
employeePF = roundHalfUp(12% × pfBase) to nearest rupee
employerEPS = round(8.33% × min(pfWage, ceiling))
employerEPF = (12% of pfBase, rounded) − employerEPS   // employer total 12% − EPS
EDLI = round(edliRate × pfBase)
admin = round(pfAdminRate × pfBase)
```

Use rates from config, not literals, in code.

### 5. ESIC

Applicability: `esicApplicable` **AND** structure's **full monthly gross** ≤ ESIC ceiling (coverage by wage entitlement; contribution on actual earned wages).

```
esicWages = earned wages for esicWage components + overtime pay (if flagged in settings)
employeeESIC = ceil(0.75% × esicWages)   // to next rupee
employerESIC = ceil(3.25% × esicWages)
```

Contribution-period "stays covered until period end": **not in v1** (see `OPEN_QUESTIONS.md`).

### 6. Net pay

```
net = earnedGross + otherEarnings − PF_employee − ESIC_employee − advance − otherDeductions
```

Never below 0: if negative, show red warning and carry shortfall as a note; do **not** auto-create a loan.

### 7. Lock

Locking writes `PayrollLine` snapshots (inputs + config used). Later config changes must not alter locked results.

## Out of scope

Professional Tax, TDS, gratuity, Bonus Act, leave encashment. Leave `StatutoryRule` extension points but build none.

## Worked example (must be a unit test)

**Structure:** gross ₹18,000 = Basic 9,000 (PF wage) + HRA 4,500 + Special 4,500.

**Month:** Sep 2026 (30 days).

**Attendance:** Present 22, Half 1, Paid leave 1, Holiday (paid) 1, Weekly off 4, Absent 1.

| Step | Result |
|---|---|
| Payable days | **28.5** |
| Factor (CALENDAR_DAYS) | **0.95** |
| Earned gross | **₹17,100** |
| Earned basic | **₹8,550** |
| Employee PF | **₹1,026** |
| ESIC wages | ₹17,100 |
| Employee ESIC | **₹129** (128.25 rounded up) |
| Employer ESIC | **₹556** (555.75 up) |
| Employer EPS | **₹712** |
| Employer EPF | **₹314** |
| Net pay | **₹15,945** |

Verification sketch:

- payable = 22 + 0.5 + 1 + 1 + 4 = 28.5
- factor = 28.5 / 30 = 0.95
- earned basic = 9000 × 0.95 = 8550; HRA/Special = 4500 × 0.95 = 4275 each; gross = 17100
- PF base = min(8550, 15000) = 8550; 12% = 1026
- ESIC: 0.75% × 17100 = 128.25 → ceil ₹129; 3.25% × 17100 = 555.75 → ceil ₹556
- EPS: 8.33% × min(8550, 15000) ≈ 712.215 → round ₹712; EPF = 1026 − 712 = 314
- net = 17100 − 1026 − 129 = 15945
