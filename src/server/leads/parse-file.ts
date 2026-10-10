import "server-only";

import ExcelJS from "exceljs";
import Papa from "papaparse";
import {
  IMPORT_MAX_BYTES,
  IMPORT_MAX_ROWS,
} from "@/lib/validators/leads";
import { flattenCityTables, type CitySection } from "@/lib/sheet-tables";

export type ParsedSheet = {
  fileName: string;
  headers: string[];
  rows: string[][];
  rowSections: string[];
  sections: CitySection[];
  totalRows: number;
  previewRows: string[][];
};

function cellToString(value: ExcelJS.CellValue): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value).trim();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "object") {
    if ("text" in value && typeof value.text === "string") {
      return value.text.trim();
    }
    if ("result" in value && value.result != null) {
      return String(value.result).trim();
    }
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((t) => t.text).join("").trim();
    }
  }
  return String(value).trim();
}

export async function parseLeadImportFile(
  buffer: Buffer,
  fileName: string,
): Promise<{ ok: true; data: ParsedSheet } | { ok: false; error: string }> {
  if (buffer.byteLength > IMPORT_MAX_BYTES) {
    return {
      ok: false,
      error: `File is too large (max ${IMPORT_MAX_BYTES / (1024 * 1024)} MB). Vercel body limit is ~4.5 MB.`,
    };
  }

  const lower = fileName.toLowerCase();
  const isCsv = lower.endsWith(".csv");
  const isXlsx = lower.endsWith(".xlsx");
  if (!isCsv && !isXlsx) {
    return { ok: false, error: "Only .xlsx and .csv files are accepted." };
  }

  let matrix: string[][] = [];

  if (isCsv) {
    const text = buffer.toString("utf8");
    const parsed = Papa.parse<string[]>(text, {
      header: false,
      skipEmptyLines: "greedy",
    });
    if (parsed.errors.length > 0 && !parsed.data.length) {
      return {
        ok: false,
        error: parsed.errors[0]?.message ?? "Failed to parse CSV",
      };
    }
    matrix = parsed.data
      .filter((r) => r.some((c) => String(c ?? "").trim() !== ""))
      .map((r) => r.map((c) => String(c ?? "").trim()));
  } else {
    const workbook = new ExcelJS.Workbook();
    // exceljs typings accept Buffer via ArrayBuffer-like
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
    const sheet = workbook.worksheets[0];
    if (!sheet) {
      return { ok: false, error: "Workbook has no worksheets." };
    }
    sheet.eachRow({ includeEmpty: false }, (row) => {
      const values: string[] = [];
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        values[colNumber - 1] = cellToString(cell.value);
      });
      // Fill holes
      for (let i = 0; i < values.length; i++) {
        if (values[i] === undefined) values[i] = "";
      }
      if (values.some((v) => v !== "")) {
        matrix.push(values);
      }
    });
  }

  if (matrix.length === 0) {
    return { ok: false, error: "File has no rows." };
  }

  const flat = flattenCityTables(matrix);
  const headers = flat.headers;
  const rows = flat.rows;

  if (headers.length === 0 || rows.length === 0) {
    return { ok: false, error: "File has no data rows." };
  }

  if (rows.length > IMPORT_MAX_ROWS) {
    return {
      ok: false,
      error: `Too many data rows (${rows.length}). Maximum is ${IMPORT_MAX_ROWS.toLocaleString()}.`,
    };
  }

  return {
    ok: true,
    data: {
      fileName,
      headers,
      rows,
      rowSections: flat.rowSections,
      sections: flat.sections,
      totalRows: rows.length,
      previewRows: rows.slice(0, 5),
    },
  };
}

export async function buildSampleTemplateBuffer(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Leads");
  sheet.addRow(["Phone", "Name", "City", "Trade", "Experience", "Source"]);
  sheet.addRow([
    "9876543210",
    "Ramesh Kumar",
    "Pune",
    "EV Technician",
    "4",
    "Import",
  ]);
  sheet.addRow([
    "9123456780",
    "Suresh Patel",
    "Delhi",
    "Electrician",
    "6",
    "Import",
  ]);
  const buf = await workbook.xlsx.writeBuffer();
  return Buffer.from(buf);
}
