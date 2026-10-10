import "server-only";

import {
  ContractEmployeeStatus,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/server/db";
import { writeAudit } from "@/server/audit/write";
import { normalisePhone } from "@/lib/phone";
import {
  encryptField,
  last4Digits,
  normaliseAadhaar,
  normalisePan,
  normaliseAccountNumber,
} from "@/server/crypto/fields";
import type {
  EmployeeCoreInput,
  EmployeeStatutoryInput,
} from "@/lib/validators/payroll";

type ListFilters = {
  status?: ContractEmployeeStatus;
  clientId?: string;
  q?: string;
  page: number;
  pageSize: number;
};

function parseYmd(ymd: string): Date {
  return new Date(`${ymd}T00:00:00.000Z`);
}

function emptyToNull(v: string | null | undefined): string | null {
  if (v == null || v === "") return null;
  return v;
}

export async function listContractEmployees(filters: ListFilters) {
  const where: Prisma.ContractEmployeeWhereInput = {};
  if (filters.status) where.status = filters.status;
  if (filters.clientId) where.clientId = filters.clientId;
  if (filters.q && filters.q.length > 0) {
    const phone = normalisePhone(filters.q);
    where.OR = [
      { fullName: { contains: filters.q, mode: "insensitive" } },
      { employeeCode: { contains: filters.q, mode: "insensitive" } },
      ...(phone ? [{ mobile: phone }] : []),
      { mobile: { contains: filters.q.replace(/\D/g, "") } },
    ];
  }

  const skip = (filters.page - 1) * filters.pageSize;
  const [total, rows] = await Promise.all([
    prisma.contractEmployee.count({ where }),
    prisma.contractEmployee.findMany({
      where,
      orderBy: { employeeCode: "asc" },
      skip,
      take: filters.pageSize,
      select: {
        id: true,
        employeeCode: true,
        fullName: true,
        mobile: true,
        designation: true,
        city: true,
        status: true,
        dateOfJoining: true,
        client: { select: { id: true, name: true } },
        salaryStructures: {
          orderBy: { effectiveFrom: "desc" },
          take: 1,
          select: { monthlyGrossPaise: true, effectiveFrom: true },
        },
      },
    }),
  ]);

  return {
    total,
    page: filters.page,
    pageSize: filters.pageSize,
    rows: rows.map((r) => ({
      id: r.id,
      employeeCode: r.employeeCode,
      fullName: r.fullName,
      mobile: r.mobile,
      designation: r.designation,
      city: r.city,
      status: r.status,
      dateOfJoining: r.dateOfJoining,
      client: r.client,
      currentGrossPaise: r.salaryStructures[0]?.monthlyGrossPaise ?? null,
      salaryEffectiveFrom: r.salaryStructures[0]?.effectiveFrom ?? null,
    })),
  };
}

export async function getContractEmployee(id: string) {
  return prisma.contractEmployee.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, name: true } },
      salaryStructures: {
        orderBy: { effectiveFrom: "desc" },
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
        },
      },
      documents: { orderBy: { uploadedAt: "desc" } },
    },
  });
}

/** Public view — never includes ciphertext. */
export function toEmployeeSafeView(
  emp: NonNullable<Awaited<ReturnType<typeof getContractEmployee>>>,
) {
  return {
    id: emp.id,
    employeeCode: emp.employeeCode,
    fullName: emp.fullName,
    fatherName: emp.fatherName,
    gender: emp.gender,
    dob: emp.dob,
    mobile: emp.mobile,
    email: emp.email,
    addressLine: emp.addressLine,
    city: emp.city,
    state: emp.state,
    pincode: emp.pincode,
    designation: emp.designation,
    department: emp.department,
    clientId: emp.clientId,
    client: emp.client,
    deploymentSite: emp.deploymentSite,
    dateOfJoining: emp.dateOfJoining,
    dateOfExit: emp.dateOfExit,
    status: emp.status,
    weeklyOffDays: emp.weeklyOffDays,
    notes: emp.notes,
    uan: emp.uan,
    pfApplicable: emp.pfApplicable,
    pfOnActualWage: emp.pfOnActualWage,
    esicApplicable: emp.esicApplicable,
    esicIpNumber: emp.esicIpNumber,
    bankName: emp.bankName,
    accountHolder: emp.accountHolder,
    ifsc: emp.ifsc,
    emergencyContactName: emp.emergencyContactName,
    emergencyContactPhone: emp.emergencyContactPhone,
    nomineeName: emp.nomineeName,
    nomineeRelation: emp.nomineeRelation,
    aadhaarLast4: emp.aadhaarLast4,
    pan4: emp.pan4,
    accountLast4: emp.accountLast4,
    hasAadhaar: Boolean(emp.aadhaarEnc),
    hasPan: Boolean(emp.panEnc),
    hasAccount: Boolean(emp.accountNumberEnc),
    salaryStructures: emp.salaryStructures,
    documents: emp.documents,
  };
}

export async function createContractEmployee(input: {
  data: EmployeeCoreInput;
  actorId: string;
  ip?: string | null;
}) {
  const mobile = normalisePhone(input.data.mobile);
  if (!mobile) {
    return { ok: false as const, error: "Invalid mobile number" };
  }

  const existing = await prisma.contractEmployee.findUnique({
    where: { employeeCode: input.data.employeeCode },
  });
  if (existing) {
    return { ok: false as const, error: "Employee code already exists" };
  }

  if (input.data.clientId) {
    const client = await prisma.client.findUnique({
      where: { id: input.data.clientId },
    });
    if (!client) {
      return { ok: false as const, error: "Client not found" };
    }
  }

  const emp = await prisma.contractEmployee.create({
    data: {
      employeeCode: input.data.employeeCode,
      fullName: input.data.fullName,
      fatherName: emptyToNull(input.data.fatherName),
      gender: input.data.gender,
      dob: parseYmd(input.data.dob),
      mobile,
      email: emptyToNull(input.data.email),
      addressLine: input.data.addressLine,
      city: input.data.city,
      state: input.data.state,
      pincode: input.data.pincode,
      designation: input.data.designation,
      department: emptyToNull(input.data.department),
      clientId: emptyToNull(input.data.clientId),
      deploymentSite: emptyToNull(input.data.deploymentSite),
      dateOfJoining: parseYmd(input.data.dateOfJoining),
      dateOfExit: input.data.dateOfExit
        ? parseYmd(input.data.dateOfExit)
        : null,
      status: input.data.status,
      weeklyOffDays: input.data.weeklyOffDays,
      notes: emptyToNull(input.data.notes),
    },
  });

  await writeAudit({
    actorId: input.actorId,
    action: "CONTRACT_EMPLOYEE_CREATED",
    entityType: "ContractEmployee",
    entityId: emp.id,
    meta: { employeeCode: emp.employeeCode, fullName: emp.fullName },
    ip: input.ip,
  });

  return { ok: true as const, data: emp };
}

export async function updateContractEmployeeCore(input: {
  id: string;
  data: EmployeeCoreInput;
  actorId: string;
  ip?: string | null;
}) {
  const existing = await prisma.contractEmployee.findUnique({
    where: { id: input.id },
  });
  if (!existing) {
    return { ok: false as const, error: "Employee not found" };
  }

  const mobile = normalisePhone(input.data.mobile);
  if (!mobile) {
    return { ok: false as const, error: "Invalid mobile number" };
  }

  if (input.data.employeeCode !== existing.employeeCode) {
    const clash = await prisma.contractEmployee.findUnique({
      where: { employeeCode: input.data.employeeCode },
    });
    if (clash) {
      return { ok: false as const, error: "Employee code already exists" };
    }
  }

  const emp = await prisma.contractEmployee.update({
    where: { id: input.id },
    data: {
      employeeCode: input.data.employeeCode,
      fullName: input.data.fullName,
      fatherName: emptyToNull(input.data.fatherName),
      gender: input.data.gender,
      dob: parseYmd(input.data.dob),
      mobile,
      email: emptyToNull(input.data.email),
      addressLine: input.data.addressLine,
      city: input.data.city,
      state: input.data.state,
      pincode: input.data.pincode,
      designation: input.data.designation,
      department: emptyToNull(input.data.department),
      clientId: emptyToNull(input.data.clientId),
      deploymentSite: emptyToNull(input.data.deploymentSite),
      dateOfJoining: parseYmd(input.data.dateOfJoining),
      dateOfExit: input.data.dateOfExit
        ? parseYmd(input.data.dateOfExit)
        : null,
      status: input.data.status,
      weeklyOffDays: input.data.weeklyOffDays,
      notes: emptyToNull(input.data.notes),
    },
  });

  await writeAudit({
    actorId: input.actorId,
    action: "CONTRACT_EMPLOYEE_UPDATED",
    entityType: "ContractEmployee",
    entityId: emp.id,
    meta: { employeeCode: emp.employeeCode },
    ip: input.ip,
  });

  return { ok: true as const, data: emp };
}

export async function updateEmployeeStatutory(input: {
  data: EmployeeStatutoryInput;
  actorId: string;
  ip?: string | null;
}) {
  const existing = await prisma.contractEmployee.findUnique({
    where: { id: input.data.employeeId },
  });
  if (!existing) {
    return { ok: false as const, error: "Employee not found" };
  }

  const patch: Prisma.ContractEmployeeUpdateInput = {
    uan: emptyToNull(input.data.uan),
    pfApplicable: input.data.pfApplicable,
    pfOnActualWage: input.data.pfOnActualWage,
    esicApplicable: input.data.esicApplicable,
    esicIpNumber: emptyToNull(input.data.esicIpNumber),
    bankName: emptyToNull(input.data.bankName),
    accountHolder: emptyToNull(input.data.accountHolder),
    ifsc: input.data.ifsc
      ? input.data.ifsc.trim().toUpperCase()
      : null,
    emergencyContactName: emptyToNull(input.data.emergencyContactName),
    emergencyContactPhone: emptyToNull(input.data.emergencyContactPhone),
    nomineeName: emptyToNull(input.data.nomineeName),
    nomineeRelation: emptyToNull(input.data.nomineeRelation),
  };

  // Only update encrypted fields when a new plaintext value is provided
  if (input.data.aadhaar != null && input.data.aadhaar.trim() !== "") {
    const aadhaar = normaliseAadhaar(input.data.aadhaar);
    if (!aadhaar) {
      return { ok: false as const, error: "Aadhaar must be 12 digits" };
    }
    patch.aadhaarEnc = encryptField(aadhaar);
    patch.aadhaarLast4 = last4Digits(aadhaar);
  }

  if (input.data.pan != null && input.data.pan.trim() !== "") {
    const pan = normalisePan(input.data.pan);
    if (!pan) {
      return { ok: false as const, error: "Invalid PAN format" };
    }
    patch.panEnc = encryptField(pan);
    patch.pan4 = pan.slice(-4);
  }

  if (
    input.data.accountNumber != null &&
    input.data.accountNumber.trim() !== ""
  ) {
    const acct = normaliseAccountNumber(input.data.accountNumber);
    if (!acct) {
      return {
        ok: false as const,
        error: "Account number must be 9–18 digits",
      };
    }
    patch.accountNumberEnc = encryptField(acct);
    patch.accountLast4 = last4Digits(acct);
  }

  const emp = await prisma.contractEmployee.update({
    where: { id: input.data.employeeId },
    data: patch,
  });

  await writeAudit({
    actorId: input.actorId,
    action: "CONTRACT_EMPLOYEE_STATUTORY_UPDATED",
    entityType: "ContractEmployee",
    entityId: emp.id,
    meta: {
      updatedAadhaar: Boolean(input.data.aadhaar?.trim()),
      updatedPan: Boolean(input.data.pan?.trim()),
      updatedAccount: Boolean(input.data.accountNumber?.trim()),
    },
    ip: input.ip,
  });

  return { ok: true as const, data: { id: emp.id } };
}

export async function revealSensitiveField(input: {
  employeeId: string;
  field: "aadhaar" | "pan" | "account";
  actorId: string;
  ip?: string | null;
}) {
  const emp = await prisma.contractEmployee.findUnique({
    where: { id: input.employeeId },
    select: {
      id: true,
      aadhaarEnc: true,
      panEnc: true,
      accountNumberEnc: true,
      employeeCode: true,
    },
  });
  if (!emp) {
    return { ok: false as const, error: "Employee not found" };
  }

  const { decryptField } = await import("@/server/crypto/fields");
  let value: string | null = null;
  if (input.field === "aadhaar" && emp.aadhaarEnc) {
    value = decryptField(emp.aadhaarEnc);
  } else if (input.field === "pan" && emp.panEnc) {
    value = decryptField(emp.panEnc);
  } else if (input.field === "account" && emp.accountNumberEnc) {
    value = decryptField(emp.accountNumberEnc);
  }

  if (!value) {
    return { ok: false as const, error: "No value stored for this field" };
  }

  await writeAudit({
    actorId: input.actorId,
    action: "SENSITIVE_FIELD_REVEALED",
    entityType: "ContractEmployee",
    entityId: emp.id,
    meta: { field: input.field, employeeCode: emp.employeeCode },
    ip: input.ip,
  });

  return { ok: true as const, data: { field: input.field, value } };
}

export async function listEmployeeActivity(employeeId: string) {
  return prisma.auditLog.findMany({
    where: {
      OR: [
        { entityType: "ContractEmployee", entityId: employeeId },
        {
          entityType: "SalaryStructure",
          meta: { path: ["employeeId"], equals: employeeId },
        },
        {
          entityType: "EmployeeDocument",
          meta: { path: ["employeeId"], equals: employeeId },
        },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      action: true,
      entityType: true,
      entityId: true,
      meta: true,
      createdAt: true,
      actor: { select: { name: true, email: true } },
    },
  });
}
