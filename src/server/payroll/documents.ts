import "server-only";

import type { DocumentType } from "@prisma/client";
import { prisma } from "@/server/db";
import { writeAudit } from "@/server/audit/write";
import {
  deletePayrollFile,
  readPayrollFile,
  storePayrollFile,
} from "@/server/payroll/storage";
import { DOC_MAX_BYTES } from "@/lib/validators/payroll";

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export async function listDocuments(employeeId: string) {
  return prisma.employeeDocument.findMany({
    where: { employeeId },
    orderBy: { uploadedAt: "desc" },
  });
}

export async function uploadDocument(input: {
  employeeId: string;
  type: DocumentType;
  fileName: string;
  bytes: Buffer;
  contentType: string;
  actorId: string;
  ip?: string | null;
}) {
  const emp = await prisma.contractEmployee.findUnique({
    where: { id: input.employeeId },
    select: { id: true, employeeCode: true },
  });
  if (!emp) {
    return { ok: false as const, error: "Employee not found" };
  }

  if (input.bytes.length > DOC_MAX_BYTES) {
    return { ok: false as const, error: "File must be ≤ 5 MB" };
  }
  if (!ALLOWED_MIME.has(input.contentType)) {
    return {
      ok: false as const,
      error: "Allowed types: PDF, JPEG, PNG, WEBP, DOC, DOCX",
    };
  }

  const stored = await storePayrollFile({
    employeeId: input.employeeId,
    fileName: input.fileName,
    bytes: input.bytes,
    contentType: input.contentType,
  });

  const doc = await prisma.employeeDocument.create({
    data: {
      employeeId: input.employeeId,
      type: input.type,
      blobUrl: stored.blobUrl,
      fileName: input.fileName.slice(0, 200),
    },
  });

  await writeAudit({
    actorId: input.actorId,
    action: "EMPLOYEE_DOCUMENT_UPLOADED",
    entityType: "EmployeeDocument",
    entityId: doc.id,
    meta: {
      employeeId: emp.id,
      employeeCode: emp.employeeCode,
      type: input.type,
      fileName: doc.fileName,
    },
    ip: input.ip,
  });

  return { ok: true as const, data: doc };
}

export async function deleteDocument(input: {
  id: string;
  actorId: string;
  ip?: string | null;
}) {
  const doc = await prisma.employeeDocument.findUnique({
    where: { id: input.id },
  });
  if (!doc) {
    return { ok: false as const, error: "Document not found" };
  }

  await deletePayrollFile(doc.blobUrl);
  await prisma.employeeDocument.delete({ where: { id: doc.id } });

  await writeAudit({
    actorId: input.actorId,
    action: "EMPLOYEE_DOCUMENT_DELETED",
    entityType: "EmployeeDocument",
    entityId: doc.id,
    meta: {
      employeeId: doc.employeeId,
      type: doc.type,
      fileName: doc.fileName,
    },
    ip: input.ip,
  });

  return { ok: true as const, data: { id: doc.id } };
}

export async function getDocumentBytes(id: string) {
  const doc = await prisma.employeeDocument.findUnique({ where: { id } });
  if (!doc) return null;
  const file = await readPayrollFile(doc.blobUrl);
  return { doc, ...file };
}
