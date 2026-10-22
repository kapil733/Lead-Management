# Data Model

Authoritative field list. Keep in sync with `prisma/schema.prisma`. Relations and indexes may be added as needed; partial unique indexes are applied via raw SQL in migrations.

## Enums

```prisma
enum Role { ADMIN EMPLOYEE }
enum LeadSource { IMPORT REFERRAL MANUAL }
enum LeadStatus { NEW IN_CASE CLOSED EXHAUSTED }       // EXHAUSTED = max attempts reached
enum CaseStatus { OPEN CLOSED RELEASED }
enum CallOutcome { CONNECTED NO_ANSWER SWITCHED_OFF WRONG_NUMBER CALL_BACK_LATER }
enum BikeType { PETROL_BIKE EV_BIKE }
```

## Core auth & CRM

```prisma
model User {            // admins and telecallers
  id String @id @default(cuid())
  email String @unique
  name String
  passwordHash String
  role Role
  isActive Boolean @default(true)
  mustChangePassword Boolean @default(true)
  lastLoginAt DateTime?
  createdAt DateTime @default(now())
}

model ImportBatch {
  id String @id @default(cuid())
  fileName String
  uploadedById String
  totalRows Int
  imported Int
  duplicates Int
  invalid Int
  createdAt DateTime @default(now())
  revertedAt DateTime?
}

model Lead {
  id String @id @default(cuid())
  phone String @unique              // 10-digit normalised
  name String?
  city String?
  location String?                  // area / site, edited on the calling desk
  bikeType BikeType?                // petrol bike technician | EV bike technician, edited on the calling desk
  trade String?                     // e.g. EV Technician, Electrician
  experienceYears Decimal?
  source LeadSource
  referredByLeadId String?          // when source = REFERRAL
  importBatchId String?
  extra Json?                       // import profile fields (DOB, email, salary text, resume, …) and any column mapped as extra
  status LeadStatus @default(NEW)
  attempts Int @default(0)
  nextEligibleAt DateTime?          // cooldown for retries
  priority Int @default(0)          // higher = served first
  joined Boolean @default(false)
  joinedAt DateTime?
  joinedMarkedById String?
  createdAt DateTime @default(now())
  @@index([status, priority, nextEligibleAt, createdAt])
}

model Case {
  id String @id @default(cuid())
  leadId String
  employeeId String
  status CaseStatus @default(OPEN)
  startedAt DateTime @default(now())
  callClickedAt DateTime?
  closedAt DateTime?
  outcome CallOutcome?
  rating Int?                        // 0..5, required when outcome = CONNECTED
  remarks String?
  durationSeconds Int?
  releasedById String?
  releaseReason String?
  @@index([employeeId, status, closedAt])
  // RAW SQL in migration:
  // CREATE UNIQUE INDEX one_open_case_per_employee ON "Case"("employeeId") WHERE status='OPEN';
  // CREATE UNIQUE INDEX one_open_case_per_lead ON "Case"("leadId") WHERE status='OPEN';
}

model Referral {
  id String @id @default(cuid())
  caseId String
  leadId String                      // the created/linked Lead
  phone String
  name String?
  experienceText String?
  designation String?
  createdAt DateTime @default(now())
}

model AuditLog {
  id String @id @default(cuid())
  actorId String?
  action String
  entityType String
  entityId String
  meta Json?
  ip String?
  createdAt DateTime @default(now())
  @@index([action, createdAt])
}

model AppSetting {
  key String @id
  value Json
}
// Known keys: dailyCaseCap, maxAttempts, retryCooldownHours, staleCaseMinutes, poolOrder
```

## Payroll

```prisma
model Client {
  id String @id @default(cuid())
  name String
  contactName String?
  contactPhone String?
  address String?
  isActive Boolean @default(true)
}

model ContractEmployee {
  id String @id @default(cuid())
  employeeCode String @unique
  fullName String
  fatherName String?
  gender String
  dob DateTime
  mobile String
  email String?
  addressLine String
  city String
  state String
  pincode String
  designation String
  department String?
  clientId String?
  deploymentSite String?
  dateOfJoining DateTime @db.Date
  dateOfExit DateTime? @db.Date
  status ContractEmployeeStatus        // ACTIVE | INACTIVE | EXITED
  weeklyOffDays Int[] @default([0])    // 0 = Sunday
  // statutory + KYC
  aadhaarEnc String?
  aadhaarLast4 String?
  panEnc String?
  pan4 String?
  uan String?
  pfApplicable Boolean @default(true)
  pfOnActualWage Boolean @default(false)
  esicApplicable Boolean @default(true)
  esicIpNumber String?
  // bank
  bankName String?
  accountHolder String?
  accountNumberEnc String?
  accountLast4 String?
  ifsc String?
  emergencyContactName String?
  emergencyContactPhone String?
  nomineeName String?
  nomineeRelation String?
  notes String?
}

enum ContractEmployeeStatus { ACTIVE INACTIVE EXITED }

model EmployeeDocument {
  id String @id @default(cuid())
  employeeId String
  type DocumentType                    // AADHAAR | PAN | PHOTO | BANK_PROOF | OFFER | OTHER
  blobUrl String
  fileName String
  uploadedAt DateTime @default(now())
}

enum DocumentType { AADHAAR PAN PHOTO BANK_PROOF OFFER OTHER }

model SalaryStructure {
  id String @id @default(cuid())
  employeeId String
  effectiveFrom DateTime @db.Date
  monthlyGrossPaise Int
  components Json   // [{ key, label, amountPaise, pfWage, esicWage }] must sum to gross
  note String?
  createdById String
}

model AttendanceRecord {
  id String @id @default(cuid())
  employeeId String
  date DateTime @db.Date
  status AttendanceStatus
  overtimeHours Decimal?
  note String?
  updatedById String
  updatedAt DateTime @updatedAt
  @@unique([employeeId, date])
}

// Explicit marks only. Effective status also includes derived HOLIDAY / WEEKLY_OFF / UNMARKED.
enum AttendanceStatus {
  PRESENT
  HALF_DAY
  ABSENT
  PAID_LEAVE
  WEEKLY_OFF
  HOLIDAY_WORKED
}

model Holiday {
  id String @id @default(cuid())
  date DateTime @db.Date @unique
  name String
  isPaid Boolean @default(true)
}

model PayrollAdjustment {
  id String @id @default(cuid())
  employeeId String
  month String                         // YYYY-MM
  type AdjustmentType
  amountPaise Int
  note String?
}

enum AdjustmentType {
  BONUS
  OVERTIME_PAY
  OTHER_EARNING
  ADVANCE_DEDUCTION
  OTHER_DEDUCTION
}

model StatutoryConfig {
  id String @id @default(cuid())
  effectiveFrom DateTime @db.Date
  pfEmployeeRate Decimal
  pfEmployerEpsRate Decimal
  pfEmployerEpfRate Decimal
  pfWageCeilingPaise Int
  edliRate Decimal
  pfAdminRate Decimal
  esicEmployeeRate Decimal
  esicEmployerRate Decimal
  esicWageCeilingPaise Int
  dayDivisor DayDivisor                // CALENDAR_DAYS | FIXED_30 | WORKING_DAYS
}

enum DayDivisor { CALENDAR_DAYS FIXED_30 WORKING_DAYS }

model PayrollRun {
  id String @id @default(cuid())
  month String @unique                 // YYYY-MM
  status PayrollRunStatus              // DRAFT | LOCKED
  lockedAt DateTime?
  lockedById String?
  createdAt DateTime @default(now())
}

enum PayrollRunStatus { DRAFT LOCKED }

model PayrollLine {
  id String @id @default(cuid())
  runId String
  employeeId String
  snapshot Json                        // all inputs + config used
  payableDays Decimal
  earnedGrossPaise Int
  pfEmployeePaise Int
  esicEmployeePaise Int
  otherDeductionsPaise Int
  otherEarningsPaise Int
  netPayPaise Int
  employerPfPaise Int
  employerEsicPaise Int
  employerEdliPaise Int
  employerAdminPaise Int
  @@unique([runId, employeeId])
}
```

## Invariants

- `Lead.status` changes **only** inside `src/server/cases/*` transactions.
- Money fields are integer **paise**.
- Attendance/holiday dates are Postgres `DATE` (no time).
- Phones: normalised `^[6-9]\d{9}$`, unique on `Lead.phone`.
- IDs: `cuid()` strings.
