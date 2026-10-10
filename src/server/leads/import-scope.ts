import "server-only";

import { NextResponse } from "next/server";
import { filterRowsByCities } from "@/lib/sheet-tables";
import { parseCitiesField } from "@/server/leads/http";
import type { ParsedSheet } from "@/server/leads/parse-file";

export function scopeImportSheet(
  form: FormData,
  sheet: ParsedSheet,
):
  | { ok: true; sheet: ParsedSheet }
  | { ok: false; response: NextResponse } {
  const citiesField = parseCitiesField(form);
  if (!citiesField.ok) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          ok: false,
          error: { code: "VALIDATION", message: citiesField.error },
        },
        { status: 400 },
      ),
    };
  }

  if (sheet.sections.length === 0 || !citiesField.cities) {
    return { ok: true, sheet };
  }

  if (citiesField.cities.length === 0) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          ok: false,
          error: {
            code: "VALIDATION",
            message: "Select at least one city",
          },
        },
        { status: 400 },
      ),
    };
  }

  const filtered = filterRowsByCities(sheet, citiesField.cities);
  return {
    ok: true,
    sheet: {
      ...sheet,
      rows: filtered.rows,
      rowSections: filtered.rowSections,
      totalRows: filtered.rows.length,
      previewRows: filtered.rows.slice(0, 5),
    },
  };
}
