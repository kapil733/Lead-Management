import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { filterRowsByCities, flattenCityTables } from "@/lib/sheet-tables";
import { mapRows } from "@/server/leads/map-rows";
import { parseLeadImportFile } from "@/server/leads/parse-file";

const HEADER = [
  "S.No",
  "Name",
  "Mobile No.",
  "Location",
  "Current Salary",
  "Expected Salary",
  "Notice Period",
  "Position Applied For",
  "Experience",
  "Remarks",
];

describe("flattenCityTables", () => {
  it("keeps a normal single table and reports no city sections", () => {
    const flat = flattenCityTables([
      ["Phone", "Name", "City"],
      ["9876543210", "Ramesh", "Pune"],
      ["9123456780", "Suresh", "Delhi"],
    ]);
    expect(flat.sections).toEqual([]);
    expect(flat.headers).toEqual(["Phone", "Name", "City"]);
    expect(flat.rows).toHaveLength(2);
    expect(flat.rows[0]?.[0]).toBe("9876543210");
  });

  it("splits stacked city tables and skips repeated headers", () => {
    const flat = flattenCityTables([
      ["NOIDA"],
      HEADER,
      ["1", "Vishal", "8750931537", "Noida", "24000", "24000", "Immediate", "Technician", "3 years", "Joined"],
      ["2", "Avinash", "6388138181", "Noida", "22000", "24000", "15 days", "Technician", "2.5 years", ""],
      ["CHENNAI"],
      HEADER,
      ["10", "Yogesh", "9884191890", "Chennai", "19500", "25000", "Immediate", "Technician", "2+ years", ""],
      ["MUMBAI"],
      HEADER,
      ["12", "Rohan", "8828076198", "Mumbai (Goregaon)", "26000", "28000", "Immediate", "Operations", "4 years", ""],
    ]);

    expect(flat.sections).toEqual([
      { name: "NOIDA", count: 2 },
      { name: "CHENNAI", count: 1 },
      { name: "MUMBAI", count: 1 },
    ]);
    expect(flat.headers[2]).toBe("Mobile No.");
    expect(flat.rows).toHaveLength(4);
    expect(flat.rows.map((row) => row[1])).toEqual([
      "Vishal",
      "Avinash",
      "Yogesh",
      "Rohan",
    ]);
    expect(flat.rowSections).toEqual(["NOIDA", "NOIDA", "CHENNAI", "MUMBAI"]);
  });

  it("filters to the selected cities", () => {
    const flat = flattenCityTables([
      ["PUNE"],
      HEADER,
      ["16", "Deva", "7276105053", "Pune", "", "", "", "Technician", "3 years", ""],
      ["DELHI"],
      HEADER,
      ["24", "Sumit", "9896541197", "Delhi (Aya Nagar)", "", "", "", "Motor", "5+ years", ""],
    ]);
    const picked = filterRowsByCities(flat, ["delhi"]);
    expect(picked.rows).toHaveLength(1);
    expect(picked.rows[0]?.[1]).toBe("Sumit");
  });

  it("reads a stacked city workbook from xlsx", async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("August");
    sheet.addRow(["NOIDA"]);
    sheet.mergeCells("A1:J1");
    sheet.addRow(HEADER);
    sheet.addRow([
      "1",
      "Vishal",
      "8750931537",
      "Noida",
      "24000",
      "24000",
      "Immediate",
      "Technician",
      "3 years",
      "Joined",
    ]);
    sheet.addRow(["CHENNAI"]);
    sheet.addRow(HEADER);
    sheet.addRow([
      "10",
      "Yogesh",
      "9884191890",
      "",
      "19500",
      "25000",
      "Immediate",
      "Technician",
      "2 years",
      "",
    ]);

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    const parsed = await parseLeadImportFile(buffer, "EVeez-August.xlsx");
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    expect(parsed.data.sections).toEqual([
      { name: "NOIDA", count: 1 },
      { name: "CHENNAI", count: 1 },
    ]);

    const chennai = filterRowsByCities(parsed.data, ["CHENNAI"]);
    const mapped = mapRows(
      parsed.data.headers,
      chennai.rows,
      {
        "Mobile No.": "phone",
        Name: "name",
        Location: "city",
        "Position Applied For": "trade",
      },
      chennai.rowSections,
    );
    expect(mapped).toHaveLength(1);
    expect(mapped[0]?.name).toBe("Yogesh");
    expect(mapped[0]?.city).toBe("CHENNAI");
    expect(mapped[0]?.phone).toBe("9884191890");
  });
});
