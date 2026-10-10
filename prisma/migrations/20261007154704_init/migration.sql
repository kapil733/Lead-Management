-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'EMPLOYEE');

-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('IMPORT', 'REFERRAL', 'MANUAL');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'IN_CASE', 'CLOSED', 'EXHAUSTED');

-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('OPEN', 'CLOSED', 'RELEASED');

-- CreateEnum
CREATE TYPE "CallOutcome" AS ENUM ('CONNECTED', 'NO_ANSWER', 'SWITCHED_OFF', 'WRONG_NUMBER', 'CALL_BACK_LATER');

-- CreateEnum
CREATE TYPE "ContractEmployeeStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'EXITED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('AADHAAR', 'PAN', 'PHOTO', 'BANK_PROOF', 'OFFER', 'OTHER');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'HALF_DAY', 'ABSENT', 'PAID_LEAVE', 'WEEKLY_OFF', 'HOLIDAY_WORKED');

-- CreateEnum
CREATE TYPE "AdjustmentType" AS ENUM ('BONUS', 'OVERTIME_PAY', 'OTHER_EARNING', 'ADVANCE_DEDUCTION', 'OTHER_DEDUCTION');

-- CreateEnum
CREATE TYPE "DayDivisor" AS ENUM ('CALENDAR_DAYS', 'FIXED_30', 'WORKING_DAYS');

-- CreateEnum
CREATE TYPE "PayrollRunStatus" AS ENUM ('DRAFT', 'LOCKED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "totalRows" INTEGER NOT NULL,
    "imported" INTEGER NOT NULL,
    "duplicates" INTEGER NOT NULL,
    "invalid" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revertedAt" TIMESTAMP(3),

    CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT,
    "city" TEXT,
    "trade" TEXT,
    "experienceYears" DECIMAL(4,1),
    "source" "LeadSource" NOT NULL,
    "referredByLeadId" TEXT,
    "importBatchId" TEXT,
    "extra" JSONB,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextEligibleAt" TIMESTAMP(3),
    "priority" INTEGER NOT NULL DEFAULT 0,
    "joined" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(3),
    "joinedMarkedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Case" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "status" "CaseStatus" NOT NULL DEFAULT 'OPEN',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "callClickedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "outcome" "CallOutcome",
    "rating" INTEGER,
    "remarks" TEXT,
    "durationSeconds" INTEGER,
    "releasedById" TEXT,
    "releaseReason" TEXT,

    CONSTRAINT "Case_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Referral" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT,
    "experienceText" TEXT,
    "designation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "meta" JSONB,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "contactPhone" TEXT,
    "address" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractEmployee" (
    "id" TEXT NOT NULL,
    "employeeCode" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "fatherName" TEXT,
    "gender" TEXT NOT NULL,
    "dob" DATE NOT NULL,
    "mobile" TEXT NOT NULL,
    "email" TEXT,
    "addressLine" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "department" TEXT,
    "clientId" TEXT,
    "deploymentSite" TEXT,
    "dateOfJoining" DATE NOT NULL,
    "dateOfExit" DATE,
    "status" "ContractEmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
    "weeklyOffDays" INTEGER[] DEFAULT ARRAY[0]::INTEGER[],
    "aadhaarEnc" TEXT,
    "aadhaarLast4" TEXT,
    "panEnc" TEXT,
    "pan4" TEXT,
    "uan" TEXT,
    "pfApplicable" BOOLEAN NOT NULL DEFAULT true,
    "pfOnActualWage" BOOLEAN NOT NULL DEFAULT false,
    "esicApplicable" BOOLEAN NOT NULL DEFAULT true,
    "esicIpNumber" TEXT,
    "bankName" TEXT,
    "accountHolder" TEXT,
    "accountNumberEnc" TEXT,
    "accountLast4" TEXT,
    "ifsc" TEXT,
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "nomineeName" TEXT,
    "nomineeRelation" TEXT,
    "notes" TEXT,

    CONSTRAINT "ContractEmployee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeDocument" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "blobUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalaryStructure" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "monthlyGrossPaise" INTEGER NOT NULL,
    "components" JSONB NOT NULL,
    "note" TEXT,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "SalaryStructure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceRecord" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "overtimeHours" DECIMAL(4,2),
    "note" TEXT,
    "updatedById" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Holiday" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "name" TEXT NOT NULL,
    "isPaid" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Holiday_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollAdjustment" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "type" "AdjustmentType" NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "note" TEXT,

    CONSTRAINT "PayrollAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatutoryConfig" (
    "id" TEXT NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "pfEmployeeRate" DECIMAL(6,4) NOT NULL,
    "pfEmployerEpsRate" DECIMAL(6,4) NOT NULL,
    "pfEmployerEpfRate" DECIMAL(6,4) NOT NULL,
    "pfWageCeilingPaise" INTEGER NOT NULL,
    "edliRate" DECIMAL(6,4) NOT NULL,
    "pfAdminRate" DECIMAL(6,4) NOT NULL,
    "esicEmployeeRate" DECIMAL(6,4) NOT NULL,
    "esicEmployerRate" DECIMAL(6,4) NOT NULL,
    "esicWageCeilingPaise" INTEGER NOT NULL,
    "dayDivisor" "DayDivisor" NOT NULL,

    CONSTRAINT "StatutoryConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollRun" (
    "id" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "status" "PayrollRunStatus" NOT NULL DEFAULT 'DRAFT',
    "lockedAt" TIMESTAMP(3),
    "lockedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayrollRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollLine" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "payableDays" DECIMAL(5,2) NOT NULL,
    "earnedGrossPaise" INTEGER NOT NULL,
    "pfEmployeePaise" INTEGER NOT NULL,
    "esicEmployeePaise" INTEGER NOT NULL,
    "otherDeductionsPaise" INTEGER NOT NULL,
    "otherEarningsPaise" INTEGER NOT NULL,
    "netPayPaise" INTEGER NOT NULL,
    "employerPfPaise" INTEGER NOT NULL,
    "employerEsicPaise" INTEGER NOT NULL,
    "employerEdliPaise" INTEGER NOT NULL,
    "employerAdminPaise" INTEGER NOT NULL,

    CONSTRAINT "PayrollLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_phone_key" ON "Lead"("phone");

-- CreateIndex
CREATE INDEX "Lead_status_priority_nextEligibleAt_createdAt_idx" ON "Lead"("status", "priority", "nextEligibleAt", "createdAt");

-- CreateIndex
CREATE INDEX "Lead_importBatchId_idx" ON "Lead"("importBatchId");

-- CreateIndex
CREATE INDEX "Lead_referredByLeadId_idx" ON "Lead"("referredByLeadId");

-- CreateIndex
CREATE INDEX "Case_employeeId_status_closedAt_idx" ON "Case"("employeeId", "status", "closedAt");

-- CreateIndex
CREATE INDEX "Case_leadId_status_idx" ON "Case"("leadId", "status");

-- CreateIndex
CREATE INDEX "Case_status_startedAt_idx" ON "Case"("status", "startedAt");

-- CreateIndex
CREATE INDEX "Referral_caseId_idx" ON "Referral"("caseId");

-- CreateIndex
CREATE INDEX "Referral_leadId_idx" ON "Referral"("leadId");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ContractEmployee_employeeCode_key" ON "ContractEmployee"("employeeCode");

-- CreateIndex
CREATE INDEX "ContractEmployee_clientId_status_idx" ON "ContractEmployee"("clientId", "status");

-- CreateIndex
CREATE INDEX "ContractEmployee_status_idx" ON "ContractEmployee"("status");

-- CreateIndex
CREATE INDEX "EmployeeDocument_employeeId_idx" ON "EmployeeDocument"("employeeId");

-- CreateIndex
CREATE INDEX "SalaryStructure_employeeId_effectiveFrom_idx" ON "SalaryStructure"("employeeId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "AttendanceRecord_date_idx" ON "AttendanceRecord"("date");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceRecord_employeeId_date_key" ON "AttendanceRecord"("employeeId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Holiday_date_key" ON "Holiday"("date");

-- CreateIndex
CREATE INDEX "PayrollAdjustment_employeeId_month_idx" ON "PayrollAdjustment"("employeeId", "month");

-- CreateIndex
CREATE INDEX "StatutoryConfig_effectiveFrom_idx" ON "StatutoryConfig"("effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollRun_month_key" ON "PayrollRun"("month");

-- CreateIndex
CREATE INDEX "PayrollLine_employeeId_idx" ON "PayrollLine"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollLine_runId_employeeId_key" ON "PayrollLine"("runId", "employeeId");

-- AddForeignKey
ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_referredByLeadId_fkey" FOREIGN KEY ("referredByLeadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_joinedMarkedById_fkey" FOREIGN KEY ("joinedMarkedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_releasedById_fkey" FOREIGN KEY ("releasedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractEmployee" ADD CONSTRAINT "ContractEmployee_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeDocument" ADD CONSTRAINT "EmployeeDocument_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "ContractEmployee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryStructure" ADD CONSTRAINT "SalaryStructure_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "ContractEmployee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryStructure" ADD CONSTRAINT "SalaryStructure_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "ContractEmployee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollAdjustment" ADD CONSTRAINT "PayrollAdjustment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "ContractEmployee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollRun" ADD CONSTRAINT "PayrollRun_lockedById_fkey" FOREIGN KEY ("lockedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollLine" ADD CONSTRAINT "PayrollLine_runId_fkey" FOREIGN KEY ("runId") REFERENCES "PayrollRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollLine" ADD CONSTRAINT "PayrollLine_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "ContractEmployee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Partial unique indexes: one OPEN case per employee / per lead
CREATE UNIQUE INDEX one_open_case_per_employee ON "Case"("employeeId") WHERE status = 'OPEN';
CREATE UNIQUE INDEX one_open_case_per_lead ON "Case"("leadId") WHERE status = 'OPEN';
