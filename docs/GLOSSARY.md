# Glossary

| Term | Meaning |
|---|---|
| **Lead** | A technician contact (phone required). Lives in the pool until claimed, closed, or exhausted. |
| **Case** | A work unit: one employee temporarily owns one lead. Status: `OPEN`, `CLOSED`, or `RELEASED`. |
| **Outcome** | Result of the call (`CONNECTED`, `NO_ANSWER`, `SWITCHED_OFF`, `WRONG_NUMBER`, `CALL_BACK_LATER`). |
| **Rating** | Interest score 0–5, required only when outcome is `CONNECTED`. |
| **Referral** | A friend's phone (and optional name/experience/designation) captured during a case; may create or link a Lead. |
| **Joined** | Boolean on the Lead indicating the technician joined the company/platform. Toggleable by the owning employee on closed cases, or by admin. |
| **Pool** | Set of leads with `status=NEW` that are eligible (`nextEligibleAt` null or past). |
| **Claim** | Transaction that assigns the next eligible lead to an employee as an OPEN case. |
| **Release** | Admin action that ends a stale OPEN case (`RELEASED`) and returns the lead to `NEW`. |
| **Contract Employee** | A technician on the company's payroll deployed to a client site (not a telecaller User). |
| **Payable Days** | Days that count toward salary: Present + 0.5×HalfDay + PaidLeave + WeeklyOff + PaidHoliday. |
| **LOP** | Loss of Pay. Half day = 0.5 LOP; Absent / unpaid holiday / unmarked working day = full day LOP (unmarked until treated as absent at lock). |
| **PF / EPF / EPS / EDLI** | Provident Fund schemes: employee PF, employer EPF, employer EPS, and EDLI insurance. Rates/ceilings from `StatutoryConfig`. |
| **ESIC** | Employee State Insurance Corporation contributions (employee + employer). Round **up** to next rupee. |
| **UAN** | Universal Account Number (PF). |
| **IP Number** | ESIC Insured Person number. |
| **Payroll Run** | Monthly calculation set for all active contract employees (`DRAFT` or `LOCKED`). |
| **Lock** | Makes a payroll month and its attendance/lines immutable. Unlock is admin-only and audit-logged. |
