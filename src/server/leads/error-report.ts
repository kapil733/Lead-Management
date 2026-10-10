import "server-only";

import ExcelJS from "exceljs";
import type { MappedLeadRow } from "@/server/leads/map-rows";

export async function buildErrorReportBuffer(input: {
  invalid: MappedLeadRow[];
  duplicates: MappedLeadRow[];
}): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Errors");
  sheet.addRow([
    "Row",
    "Category",
    "Phone (raw)",
    "Phone (normalised)",
    "Name",
    "Reason",
  ]);

  for (const row of input.invalid) {
    sheet.addRow([
      row.rowNumber,
      "Invalid",
      row.rawPhone,
      row.phone ?? "",
      row.name ?? "",
      row.error ?? "Invalid",
    ]);
  }
  for (const row of input.duplicates) {
    sheet.addRow([
      row.rowNumber,
      "Duplicate",
      row.rawPhone,
      row.phone ?? "",
      row.name ?? "",
      row.error ?? "Duplicate",
    ]);
  }

  const buf = await workbook.xlsx.writeBuffer();
  return Buffer.from(buf);
}
