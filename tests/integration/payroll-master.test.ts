import "dotenv/config";
import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient, Role } from "@prisma/client";
import { createClient } from "@/server/payroll/clients";
import {
  createContractEmployee,
  revealSensitiveField,
  updateEmployeeStatutory,
  getContractEmployee,
  toEmployeeSafeView,
} from "@/server/payroll/employees";
import { addSalaryStructure } from "@/server/payroll/salary";
import { toPaise } from "@/lib/money";

const prisma = new PrismaClient();

describe("payroll master Phase 7", () => {
  const code = "CE-TEST-P7";
  let adminId: string;
  let clientId: string;
  let employeeId: string | undefined;

  afterAll(async () => {
    if (employeeId) {
      await prisma.salaryStructure.deleteMany({ where: { employeeId } });
      await prisma.employeeDocument.deleteMany({ where: { employeeId } });
      await prisma.contractEmployee.deleteMany({ where: { id: employeeId } });
    }
    await prisma.contractEmployee.deleteMany({ where: { employeeCode: code } });
    if (clientId) {
      await prisma.client.deleteMany({
        where: { id: clientId, name: "Phase7 Test Client" },
      });
    }
    await prisma.auditLog.deleteMany({
      where: {
        action: {
          in: [
            "CLIENT_CREATED",
            "CONTRACT_EMPLOYEE_CREATED",
            "CONTRACT_EMPLOYEE_STATUTORY_UPDATED",
            "SENSITIVE_FIELD_REVEALED",
            "SALARY_STRUCTURE_CREATED",
          ],
        },
      },
    });
    await prisma.$disconnect();
  });

  it("creates client, employee, encrypted KYC, salary history, reveal", async () => {
    const admin = await prisma.user.findFirst({ where: { role: Role.ADMIN } });
    expect(admin).not.toBeNull();
    adminId = admin!.id;

    const client = await createClient({
      data: {
        name: "Phase7 Test Client",
        contactName: "Ops",
        contactPhone: "9810011111",
        address: null,
        isActive: true,
      },
      actorId: adminId,
    });
    expect(client.ok).toBe(true);
    clientId = client.data.id;

    const emp = await createContractEmployee({
      data: {
        employeeCode: code,
        fullName: "Test Worker",
        gender: "Male",
        dob: "1992-05-10",
        mobile: "9876500123",
        email: null,
        addressLine: "1 Test Road",
        city: "Pune",
        state: "Maharashtra",
        pincode: "411001",
        designation: "EV Technician",
        clientId,
        dateOfJoining: "2026-01-01",
        status: "ACTIVE",
        weeklyOffDays: [0],
      },
      actorId: adminId,
    });
    expect(emp.ok).toBe(true);
    if (!emp.ok) return;
    employeeId = emp.data.id;

    const statutory = await updateEmployeeStatutory({
      data: {
        employeeId: emp.data.id,
        aadhaar: "234567890123",
        pan: "ABCDE1234F",
        accountNumber: "123456789012",
        pfApplicable: true,
        pfOnActualWage: false,
        esicApplicable: true,
        uan: null,
        esicIpNumber: null,
        bankName: "Test Bank",
        accountHolder: "Test Worker",
        ifsc: "HDFC0001234",
        emergencyContactName: null,
        emergencyContactPhone: null,
        nomineeName: null,
        nomineeRelation: null,
      },
      actorId: adminId,
    });
    expect(statutory.ok).toBe(true);

    const loaded = await getContractEmployee(emp.data.id);
    expect(loaded).not.toBeNull();
    const safe = toEmployeeSafeView(loaded!);
    expect(safe.aadhaarLast4).toBe("0123");
    expect(safe.hasAadhaar).toBe(true);
    expect(JSON.stringify(safe)).not.toContain("234567890123");
    expect(loaded!.aadhaarEnc).toBeTruthy();
    expect(loaded!.aadhaarEnc).not.toContain("234567890123");

    const reveal = await revealSensitiveField({
      employeeId: emp.data.id,
      field: "aadhaar",
      actorId: adminId,
    });
    expect(reveal.ok).toBe(true);
    if (reveal.ok) expect(reveal.data.value).toBe("234567890123");

    const gross = toPaise(20000);
    const s1 = await addSalaryStructure({
      data: {
        employeeId: emp.data.id,
        effectiveFrom: "2026-01-01",
        monthlyGrossPaise: gross,
        components: [
          {
            key: "BASIC",
            label: "Basic",
            amountPaise: toPaise(10000),
            pfWage: true,
            esicWage: true,
          },
          {
            key: "HRA",
            label: "HRA",
            amountPaise: toPaise(5000),
            pfWage: false,
            esicWage: true,
          },
          {
            key: "SPECIAL",
            label: "Special",
            amountPaise: toPaise(5000),
            pfWage: false,
            esicWage: true,
          },
        ],
      },
      actorId: adminId,
    });
    expect(s1.ok).toBe(true);

    const s2 = await addSalaryStructure({
      data: {
        employeeId: emp.data.id,
        effectiveFrom: "2026-06-01",
        monthlyGrossPaise: toPaise(22000),
        components: [
          {
            key: "BASIC",
            label: "Basic",
            amountPaise: toPaise(11000),
            pfWage: true,
            esicWage: true,
          },
          {
            key: "HRA",
            label: "HRA",
            amountPaise: toPaise(5500),
            pfWage: false,
            esicWage: true,
          },
          {
            key: "SPECIAL",
            label: "Special",
            amountPaise: toPaise(5500),
            pfWage: false,
            esicWage: true,
          },
        ],
      },
      actorId: adminId,
    });
    expect(s2.ok).toBe(true);

    const history = await prisma.salaryStructure.count({
      where: { employeeId: emp.data.id },
    });
    expect(history).toBe(2);
  });
});
