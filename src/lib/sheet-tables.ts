export type CitySection = {
  name: string;
  count: number;
};

const HEADER_HINT =
  /\b(s\.?\s*no|serial|name|mobile|phone|location|city|salary|notice|position|experience|remarks)\b/i;

function trimTrailingEmpty(row: string[]): string[] {
  let end = row.length;
  while (end > 0 && !(row[end - 1] ?? "").trim()) end -= 1;
  return row.slice(0, end);
}

function nonEmpty(row: string[]): string[] {
  return row.map((cell) => cell.trim()).filter(Boolean);
}

/** A repeated column-title row such as S.No / Name / Mobile No. */
export function isHeaderRow(row: string[]): boolean {
  const cells = nonEmpty(row);
  if (cells.length < 3) return false;
  let hits = 0;
  for (const cell of cells) {
    if (HEADER_HINT.test(cell)) hits += 1;
  }
  return hits >= 2;
}

function sectionTitle(row: string[], next: string[] | undefined): string | null {
  if (!next || !isHeaderRow(next)) return null;
  const cells = nonEmpty(row);
  if (cells.length === 0) return null;
  const title = cells[0] ?? "";
  if (!title || title.length > 40 || /^\d+$/.test(title)) return null;
  if (!cells.every((cell) => cell.toLowerCase() === title.toLowerCase())) {
    return null;
  }
  if (isHeaderRow(row)) return null;
  return title;
}

function uniqueHeaders(raw: string[]): string[] {
  const seen = new Map<string, number>();
  return raw.map((header, index) => {
    const base = header.trim() || `Column ${index + 1}`;
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base} (${count + 1})`;
  });
}

function align(row: string[], width: number): string[] {
  return Array.from({ length: width }, (_, index) => (row[index] ?? "").trim());
}

/**
 * Turn a sheet of stacked city tables into one header plus data rows.
 * A normal single table (header on row 1) is unchanged and has no sections.
 */
export function flattenCityTables(matrix: string[][]): {
  headers: string[];
  rows: string[][];
  rowSections: string[];
  sections: CitySection[];
} {
  const rowsIn = matrix.map((row) => trimTrailingEmpty(row.map((cell) => cell ?? "")));
  const nonempty = rowsIn.filter((row) => row.some((cell) => cell.trim() !== ""));
  if (nonempty.length === 0) {
    return { headers: [], rows: [], rowSections: [], sections: [] };
  }

  const sawHeader = nonempty.some((row) => isHeaderRow(row));
  if (!sawHeader) {
    const headers = uniqueHeaders(nonempty[0] ?? []);
    const rows = nonempty.slice(1).map((row) => align(row, headers.length));
    return { headers, rows, rowSections: rows.map(() => ""), sections: [] };
  }

  let headers: string[] | null = null;
  let current = "";
  const rows: string[][] = [];
  const rowSections: string[] = [];
  const order: string[] = [];
  const counts = new Map<string, number>();

  for (let index = 0; index < nonempty.length; index += 1) {
    const row = nonempty[index] ?? [];
    const title = sectionTitle(row, nonempty[index + 1]);
    if (title) {
      current = title;
      continue;
    }
    if (isHeaderRow(row)) {
      if (!headers) headers = uniqueHeaders(trimTrailingEmpty(row));
      continue;
    }
    if (!headers) continue;
    rows.push(align(row, headers.length));
    rowSections.push(current);
    if (current) {
      counts.set(current, (counts.get(current) ?? 0) + 1);
      if (!order.includes(current)) order.push(current);
    }
  }

  return {
    headers: headers ?? [],
    rows,
    rowSections,
    sections: order.map((name) => ({ name, count: counts.get(name) ?? 0 })),
  };
}

export function filterRowsByCities<
  T extends { rows: string[][]; rowSections: string[] },
>(sheet: T, cities: string[]): T {
  const allow = new Set(cities.map((city) => city.trim().toLowerCase()));
  const rows: string[][] = [];
  const rowSections: string[] = [];
  sheet.rows.forEach((row, index) => {
    const section = sheet.rowSections[index] ?? "";
    if (allow.has(section.toLowerCase())) {
      rows.push(row);
      rowSections.push(section);
    }
  });
  return { ...sheet, rows, rowSections };
}
