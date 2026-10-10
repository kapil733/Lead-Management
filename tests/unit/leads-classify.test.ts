import { describe, expect, it } from "vitest";
import { mapRows } from "@/server/leads/map-rows";
import { guessColumnTarget } from "@/lib/validators/leads";

describe("guessColumnTarget", () => {
  it("guesses common headers", () => {
    expect(guessColumnTarget("Phone")).toBe("phone");
    expect(guessColumnTarget("Mobile Number")).toBe("phone");
    expect(guessColumnTarget("Name")).toBe("name");
    expect(guessColumnTarget("Experience (years)")).toBe("experienceYears");
    expect(guessColumnTarget("Notes")).toBe("extra");
    expect(guessColumnTarget("Mobile No.")).toBe("phone");
    expect(guessColumnTarget("Alternative Family Mobile No")).toBe(
      "alternatePhone",
    );
    expect(guessColumnTarget("DOB")).toBe("dob");
    expect(guessColumnTarget("Email ID")).toBe("email");
    expect(guessColumnTarget("Location")).toBe("city");
    expect(guessColumnTarget("Status")).toBe("recruitmentStatus");
    expect(guessColumnTarget("Current Company")).toBe("currentCompany");
    expect(guessColumnTarget("Current Salary")).toBe("currentSalary");
    expect(guessColumnTarget("Expected Salary")).toBe("expectedSalary");
    expect(guessColumnTarget("Notice Period")).toBe("noticePeriod");
    expect(guessColumnTarget("Hala Confirmed CTC")).toBe("confirmedCtc");
    expect(guessColumnTarget("DOJ")).toBe("dateOfJoining");
    expect(guessColumnTarget("Position Applied For")).toBe("trade");
    expect(guessColumnTarget("Resume's")).toBe("resumeUrl");
    expect(guessColumnTarget("S.No")).toBe("serial");
  });
});

describe("mapRows", () => {
  it("maps and validates phones", () => {
    const mapped = mapRows(
      ["Phone", "Name", "City"],
      [
        ["9876543210", "Ramesh", "Pune"],
        ["bad", "X", "Delhi"],
        ["+91 91234-56780", "Suresh", "Noida"],
      ],
      {
        Phone: "phone",
        Name: "name",
        City: "city",
      },
    );
    expect(mapped[0]?.phone).toBe("9876543210");
    expect(mapped[1]?.error).toBeTruthy();
    expect(mapped[2]?.phone).toBe("9123456780");
  });

  it("keeps every Halla profile field", () => {
    const mapped = mapRows(
      [
        "S.No",
        "Name",
        "Mobile No.",
        "DOB",
        "Email ID",
        "Location",
        "Status",
        "Current Company",
        "Current Salary",
        "Expected Salary",
        "Notice Period",
        "Hala Confirmed CTC",
        "DOJ",
        "Position Applied For",
        "Experience",
        "Resume",
        "Alternative Family Mobile No",
      ],
      [[
        "1",
        "B YAKUB",
        "7386476508",
        "26/07/2004",
        "Royalb858@gmail.com",
        "Nacharam",
        "Backout",
        "Ather",
        "21000",
        "25000",
        "Immediate joiner",
        "340800",
        "01/10/2026",
        "Service Engineer",
        "4+ Years",
        "https://drive.google.com/file/d/abc/view",
        "9052240992",
      ]],
      {
        "S.No": "serial",
        Name: "name",
        "Mobile No.": "phone",
        DOB: "dob",
        "Email ID": "email",
        Location: "city",
        Status: "recruitmentStatus",
        "Current Company": "currentCompany",
        "Current Salary": "currentSalary",
        "Expected Salary": "expectedSalary",
        "Notice Period": "noticePeriod",
        "Hala Confirmed CTC": "confirmedCtc",
        DOJ: "dateOfJoining",
        "Position Applied For": "trade",
        Experience: "experienceYears",
        Resume: "resumeUrl",
        "Alternative Family Mobile No": "alternatePhone",
      },
    );
    const row = mapped[0]!;
    expect(row.phone).toBe("7386476508");
    expect(row.name).toBe("B YAKUB");
    expect(row.city).toBe("Nacharam");
    expect(row.trade).toBe("Service Engineer");
    expect(row.experienceYears).toBe(4);
    expect(row.extra).toMatchObject({
      "S.No": "1",
      DOB: "26/07/2004",
      Email: "Royalb858@gmail.com",
      "Recruitment status": "Backout",
      "Current company": "Ather",
      "Current salary": "21000",
      "Expected salary": "25000",
      "Notice period": "Immediate joiner",
      "Confirmed CTC": "340800",
      DOJ: "01/10/2026",
      Experience: "4+ Years",
      Resume: "https://drive.google.com/file/d/abc/view",
      "Alternative mobile": "9052240992",
    });
  });

  it("collects extra columns", () => {
    const mapped = mapRows(
      ["Phone", "Notes"],
      [["9876543210", "Prefers mornings"]],
      { Phone: "phone", Notes: "extra" },
    );
    expect(mapped[0]?.extra).toEqual({ Notes: "Prefers mornings" });
  });
});
