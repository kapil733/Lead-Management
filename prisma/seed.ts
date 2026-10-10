/**
 * Idempotent demo seed. Runs only when SEED_DEMO=true or NODE_ENV !== 'production'.
 */
import "dotenv/config";
import { createCipheriv, randomBytes } from "crypto";
import {
  Prisma,
  PrismaClient,
  Role,
  LeadSource,
  LeadStatus,
  CaseStatus,
  CallOutcome,
  DayDivisor,
  ContractEmployeeStatus,
  AttendanceStatus,
  PayrollRunStatus,
} from "@prisma/client";
import { hashPassword } from "../src/server/auth/password";
import { normalisePhone } from "../src/lib/phone";
import { toPaise } from "../src/lib/money";

function seedEncrypt(plain: string): string {
  const key = Buffer.from(process.env.FIELD_ENCRYPTION_KEY ?? "", "base64");
  if (key.length !== 32) {
    throw new Error("FIELD_ENCRYPTION_KEY must be 32 bytes base64 for seed");
  }
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

const prisma = new PrismaClient();

const CITIES = [
  "Delhi",
  "Gurugram",
  "Noida",
  "Pune",
  "Bengaluru",
  "Hyderabad",
  "Jaipur",
  "Lucknow",
] as const;

const TRADES = [
  "EV Technician",
  "Electrician",
  "Battery Technician",
  "Two-wheeler Mechanic",
  "Charging Station Technician",
] as const;

const FIRST = [
  "Ramesh",
  "Suresh",
  "Amit",
  "Priya",
  "Neha",
  "Rahul",
  "Vikram",
  "Anjali",
  "Deepak",
  "Kavita",
  "Sanjay",
  "Pooja",
  "Arjun",
  "Meena",
  "Imran",
  "Fatima",
  "Karan",
  "Nisha",
  "Rohit",
  "Sana",
];

const LAST = [
  "Kumar",
  "Sharma",
  "Singh",
  "Patel",
  "Verma",
  "Gupta",
  "Yadav",
  "Reddy",
  "Nair",
  "Khan",
  "Joshi",
  "Chopra",
  "Malhotra",
  "Iyer",
  "Das",
];

function assertSeedAllowed() {
  const seedDemo = process.env.SEED_DEMO === "true" || process.env.SEED_DEMO === "1";
  const isProd = process.env.NODE_ENV === "production";
  if (isProd && !seedDemo) {
    throw new Error("Seed refused: set SEED_DEMO=true to seed non-local production deliberately");
  }
  if (!seedDemo && isProd) {
    throw new Error("Seed refused in production without SEED_DEMO=true");
  }
}

function phoneFromIndex(i: number): string {
  // Deterministic valid Indian mobiles starting 6–9
  const prefix = [6, 7, 8, 9][i % 4]!;
  const rest = String(100000000 + i).slice(-9);
  const phone = `${prefix}${rest}`;
  const n = normalisePhone(phone);
  if (!n) throw new Error(`Bad seed phone ${phone}`);
  return n;
}

async function upsertUser(data: {
  email: string;
  name: string;
  role: Role;
  password: string;
  mustChangePassword: boolean;
}) {
  const passwordHash = await hashPassword(data.password);
  return prisma.user.upsert({
    where: { email: data.email },
    create: {
      email: data.email,
      name: data.name,
      role: data.role,
      passwordHash,
      mustChangePassword: data.mustChangePassword,
      isActive: true,
    },
    update: {
      name: data.name,
      role: data.role,
      passwordHash,
      mustChangePassword: data.mustChangePassword,
      isActive: true,
    },
  });
}

async function main() {
  assertSeedAllowed();

  const admin = await upsertUser({
    email: "admin@demo.test",
    name: "Ops Admin",
    role: Role.ADMIN,
    password: "Admin@12345",
    mustChangePassword: false,
  });

  const telecallerDefs = [
    { email: "priya@demo.test", name: "Priya Sharma" },
    { email: "rahul@demo.test", name: "Rahul Verma" },
    { email: "neha@demo.test", name: "Neha Patel" },
    { email: "amit@demo.test", name: "Amit Kumar" },
    { email: "sana@demo.test", name: "Sana Khan" },
  ] as const;

  const telecallers = [];
  for (const t of telecallerDefs) {
    telecallers.push(
      await upsertUser({
        ...t,
        role: Role.EMPLOYEE,
        password: "Caller@12345",
        mustChangePassword: false,
      }),
    );
  }

  const settings: { key: string; value: Prisma.InputJsonValue }[] = [
    { key: "dailyCaseCap", value: 200 },
    { key: "maxAttempts", value: 3 },
    { key: "retryCooldownHours", value: 4 },
    { key: "staleCaseMinutes", value: 60 },
    { key: "poolOrder", value: "priority_desc_created_asc" },
  ];
  for (const setting of settings) {
    await prisma.appSetting.upsert({
      where: { key: setting.key },
      create: setting,
      update: { value: setting.value },
    });
  }

  const statutoryCount = await prisma.statutoryConfig.count();
  if (statutoryCount === 0) {
    await prisma.statutoryConfig.create({
      data: {
        effectiveFrom: new Date("2026-01-01"),
        pfEmployeeRate: 0.12,
        pfEmployerEpsRate: 0.0833,
        pfEmployerEpfRate: 0.0367,
        pfWageCeilingPaise: toPaise(15000),
        edliRate: 0.005,
        pfAdminRate: 0.005,
        esicEmployeeRate: 0.0075,
        esicEmployerRate: 0.0325,
        esicWageCeilingPaise: toPaise(21000),
        dayDivisor: DayDivisor.CALENDAR_DAYS,
      },
    });
  }

  const holidays = [
    { date: new Date("2026-01-26"), name: "Republic Day" },
    { date: new Date("2026-08-15"), name: "Independence Day" },
    { date: new Date("2026-10-02"), name: "Gandhi Jayanti" },
  ];
  for (const h of holidays) {
    await prisma.holiday.upsert({
      where: { date: h.date },
      create: { ...h, isPaid: true },
      update: { name: h.name, isPaid: true },
    });
  }

  // Leads — upsert by phone (idempotent)
  const leadIds: string[] = [];
  for (let i = 0; i < 400; i++) {
    const phone = phoneFromIndex(i);
    const name = `${FIRST[i % FIRST.length]} ${LAST[i % LAST.length]}`;
    const status: LeadStatus =
      i < 280
        ? LeadStatus.NEW
        : i < 360
          ? LeadStatus.CLOSED
          : LeadStatus.EXHAUSTED;
    const lead = await prisma.lead.upsert({
      where: { phone },
      create: {
        phone,
        name,
        city: CITIES[i % CITIES.length],
        trade: TRADES[i % TRADES.length],
        experienceYears: 1 + (i % 12),
        source: LeadSource.IMPORT,
        status,
        attempts: status === LeadStatus.EXHAUSTED ? 3 : status === LeadStatus.CLOSED ? 1 : 0,
        priority: 0,
      },
      update: {
        name,
        city: CITIES[i % CITIES.length],
        trade: TRADES[i % TRADES.length],
      },
    });
    leadIds.push(lead.id);
  }

  // Closed cases across last 30 days (~140) — only create if none exist for demo
  const existingClosed = await prisma.case.count({
    where: { status: CaseStatus.CLOSED },
  });
  if (existingClosed === 0) {
    const outcomes: CallOutcome[] = [];
    // ~55% connected, 20% no answer, 10% switched, 8% wrong, 7% callback
    for (let i = 0; i < 140; i++) {
      const r = i % 100;
      if (r < 55) outcomes.push(CallOutcome.CONNECTED);
      else if (r < 75) outcomes.push(CallOutcome.NO_ANSWER);
      else if (r < 85) outcomes.push(CallOutcome.SWITCHED_OFF);
      else if (r < 93) outcomes.push(CallOutcome.WRONG_NUMBER);
      else outcomes.push(CallOutcome.CALL_BACK_LATER);
    }

    const ratingDist = [0, 0, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5];

    for (let i = 0; i < 140; i++) {
      const employee = telecallers[i % telecallers.length]!;
      const leadId = leadIds[280 + (i % 80)]!;
      const outcome = outcomes[i]!;
      const closedAt = new Date(Date.now() - (i % 30) * 24 * 60 * 60 * 1000 - (i % 9) * 60 * 60 * 1000);
      const startedAt = new Date(closedAt.getTime() - (1 + (i % 9)) * 60 * 1000);
      const rating =
        outcome === CallOutcome.CONNECTED
          ? ratingDist[i % ratingDist.length]!
          : null;

      await prisma.case.create({
        data: {
          leadId,
          employeeId: employee.id,
          status: CaseStatus.CLOSED,
          startedAt,
          closedAt,
          outcome,
          rating,
          remarks:
            outcome === CallOutcome.CONNECTED
              ? "Spoke with candidate; interested in EV roles."
              : "Could not complete a detailed conversation.",
          durationSeconds: Math.floor((closedAt.getTime() - startedAt.getTime()) / 1000),
        },
      });
    }

    // Joined marks on 6 leads
    for (let i = 0; i < 6; i++) {
      await prisma.lead.update({
        where: { id: leadIds[280 + i]! },
        data: {
          joined: true,
          joinedAt: new Date(Date.now() - i * 3 * 24 * 60 * 60 * 1000),
          joinedMarkedById: telecallers[i % telecallers.length]!.id,
          status: LeadStatus.CLOSED,
        },
      });
    }
  }

  // One OPEN stale case for Priya (~75 min ago)
  const priya = telecallers[0]!;
  const openLead = await prisma.lead.findFirst({
    where: { status: LeadStatus.NEW },
    orderBy: { createdAt: "asc" },
  });
  if (openLead) {
    await prisma.case.deleteMany({
      where: { employeeId: priya.id, status: CaseStatus.OPEN },
    });
    // Release lead if previously IN_CASE from a failed seed mid-way
    await prisma.lead.update({
      where: { id: openLead.id },
      data: { status: LeadStatus.NEW },
    });
    await prisma.$transaction([
      prisma.lead.update({
        where: { id: openLead.id },
        data: { status: LeadStatus.IN_CASE },
      }),
      prisma.case.create({
        data: {
          leadId: openLead.id,
          employeeId: priya.id,
          status: CaseStatus.OPEN,
          startedAt: new Date(Date.now() - 75 * 60 * 1000),
        },
      }),
    ]);
  }

  // Payroll demo: 2 clients + 14 employees (structures only; full attendance in later phases can expand)
  const clientA = await prisma.client.upsert({
    where: { id: "seed_client_voltride" },
    create: {
      id: "seed_client_voltride",
      name: "VoltRide Mobility",
      contactName: "Ankit Mehta",
      contactPhone: "9810012345",
      isActive: true,
    },
    update: { name: "VoltRide Mobility", isActive: true },
  });
  const clientB = await prisma.client.upsert({
    where: { id: "seed_client_greencharge" },
    create: {
      id: "seed_client_greencharge",
      name: "GreenCharge Networks",
      contactName: "Divya Rao",
      contactPhone: "9820012345",
      isActive: true,
    },
    update: { name: "GreenCharge Networks", isActive: true },
  });

  for (let i = 0; i < 14; i++) {
    const code = `CE${String(i + 1).padStart(3, "0")}`;
    const gross = 14000 + i * 900; // 14k–25.7k
    const aboveEsic = gross > 21000;
    const employee = await prisma.contractEmployee.upsert({
      where: { employeeCode: code },
      create: {
        employeeCode: code,
        fullName: `${FIRST[i]} ${LAST[i]}`,
        gender: i % 2 === 0 ? "Male" : "Female",
        dob: new Date(1990 + (i % 10), i % 12, 1 + (i % 20)),
        mobile: phoneFromIndex(500 + i),
        addressLine: `${10 + i} Industrial Area`,
        city: CITIES[i % CITIES.length],
        state: "Maharashtra",
        pincode: "411001",
        designation: TRADES[i % TRADES.length],
        clientId: i % 2 === 0 ? clientA.id : clientB.id,
        dateOfJoining: i === 12 ? new Date("2026-09-10") : new Date("2025-01-15"),
        dateOfExit: i === 13 ? new Date("2026-09-15") : null,
        status:
          i === 13
            ? ContractEmployeeStatus.EXITED
            : ContractEmployeeStatus.ACTIVE,
        weeklyOffDays: [0],
        pfApplicable: true,
        pfOnActualWage: i === 5,
        esicApplicable: !aboveEsic,
      },
      update: {
        fullName: `${FIRST[i]} ${LAST[i]}`,
        clientId: i % 2 === 0 ? clientA.id : clientB.id,
        esicApplicable: !aboveEsic,
        pfOnActualWage: i === 5,
      },
    });

    // Sample encrypted KYC on first employee for Phase 7 demos
    if (i === 0 && !employee.aadhaarEnc) {
      const aadhaar = "234567890123";
      const pan = "ABCDE1234F";
      const account = "123456789012";
      await prisma.contractEmployee.update({
        where: { id: employee.id },
        data: {
          aadhaarEnc: seedEncrypt(aadhaar),
          aadhaarLast4: aadhaar.slice(-4),
          panEnc: seedEncrypt(pan),
          pan4: pan.slice(-4),
          accountNumberEnc: seedEncrypt(account),
          accountLast4: account.slice(-4),
          bankName: "HDFC Bank",
          accountHolder: employee.fullName,
          ifsc: "HDFC0001234",
          uan: "100012345678",
        },
      });
    }

    const existingStructure = await prisma.salaryStructure.findFirst({
      where: { employeeId: employee.id },
    });
    if (!existingStructure) {
      const basic = Math.round(gross * 0.5);
      const hra = Math.round(gross * 0.25);
      const special = gross - basic - hra;
      await prisma.salaryStructure.create({
        data: {
          employeeId: employee.id,
          effectiveFrom: new Date("2026-01-01"),
          monthlyGrossPaise: toPaise(gross),
          createdById: admin.id,
          components: [
            {
              key: "BASIC",
              label: "Basic",
              amountPaise: toPaise(basic),
              pfWage: true,
              esicWage: true,
            },
            {
              key: "HRA",
              label: "HRA",
              amountPaise: toPaise(hra),
              pfWage: false,
              esicWage: true,
            },
            {
              key: "SPECIAL",
              label: "Special allowance",
              amountPaise: toPaise(special),
              pfWage: false,
              esicWage: true,
            },
          ],
        },
      });
    }
  }

  // Minimal Sep 2026 attendance sample for first active employee (expand in Phase 8)
  const sampleEmp = await prisma.contractEmployee.findFirst({
    where: { employeeCode: "CE001" },
  });
  if (sampleEmp) {
    const marks: { day: number; status: AttendanceStatus }[] = [
      { day: 1, status: AttendanceStatus.PRESENT },
      { day: 2, status: AttendanceStatus.PRESENT },
      { day: 3, status: AttendanceStatus.HALF_DAY },
      { day: 4, status: AttendanceStatus.ABSENT },
      { day: 5, status: AttendanceStatus.PAID_LEAVE },
    ];
    for (const m of marks) {
      const date = new Date(Date.UTC(2026, 8, m.day));
      await prisma.attendanceRecord.upsert({
        where: {
          employeeId_date: { employeeId: sampleEmp.id, date },
        },
        create: {
          employeeId: sampleEmp.id,
          date,
          status: m.status,
          updatedById: admin.id,
        },
        update: { status: m.status, updatedById: admin.id },
      });
    }
  }

  // August locked empty run shell (lines filled in Phase 9)
  await prisma.payrollRun.upsert({
    where: { month: "2026-08" },
    create: {
      month: "2026-08",
      status: PayrollRunStatus.LOCKED,
      lockedAt: new Date("2026-09-02"),
      lockedById: admin.id,
    },
    update: {
      status: PayrollRunStatus.LOCKED,
      lockedById: admin.id,
    },
  });
  await prisma.payrollRun.upsert({
    where: { month: "2026-09" },
    create: {
      month: "2026-09",
      status: PayrollRunStatus.DRAFT,
    },
    update: { status: PayrollRunStatus.DRAFT },
  });

  console.log("Seed complete:", {
    admin: admin.email,
    telecallers: telecallers.map((t) => t.email),
    leads: await prisma.lead.count(),
    cases: await prisma.case.count(),
    contractEmployees: await prisma.contractEmployee.count(),
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
