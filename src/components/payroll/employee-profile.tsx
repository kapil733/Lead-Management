"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ContractEmployeeStatus, DocumentType } from "@prisma/client";
import {
  addSalaryStructureAction,
  deleteDocumentAction,
  revealSensitiveFieldAction,
  updateContractEmployeeAction,
  updateEmployeeStatutoryAction,
} from "@/server/payroll/actions";
import { formatINR, toPaise } from "@/lib/money";
import { formatPhoneDisplay } from "@/lib/phone";
import { formatDisplayDate, formatDisplayDateTime } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

function maskAadhaarLocal(last4: string | null) {
  if (!last4) return "—";
  return `XXXX XXXX ${last4}`;
}
function maskPanLocal(last4: string | null) {
  if (!last4) return "—";
  return `XXXXX${last4}`;
}
function maskAccountLocal(last4: string | null) {
  if (!last4) return "—";
  return `XXXXXX${last4}`;
}

type Tab =
  | "overview"
  | "statutory"
  | "salary"
  | "attendance"
  | "payslips"
  | "documents"
  | "activity";

type PayslipRow = {
  month: string;
  status: string;
  payableDays: number;
  earnedGrossPaise: number;
  netPayPaise: number;
  runLocked: boolean;
};

type SalaryRow = {
  id: string;
  effectiveFrom: string;
  monthlyGrossPaise: number;
  components: unknown;
  note: string | null;
  createdBy: { name: string };
};

type DocRow = {
  id: string;
  type: DocumentType;
  fileName: string;
  uploadedAt: string;
};

type ActivityRow = {
  id: string;
  action: string;
  entityType: string;
  createdAt: string;
  actor: { name: string; email: string } | null;
};

export type EmployeeProfileProps = {
  employee: {
    id: string;
    employeeCode: string;
    fullName: string;
    fatherName: string | null;
    gender: string;
    dob: string;
    mobile: string;
    email: string | null;
    addressLine: string;
    city: string;
    state: string;
    pincode: string;
    designation: string;
    department: string | null;
    clientId: string | null;
    client: { id: string; name: string } | null;
    deploymentSite: string | null;
    dateOfJoining: string;
    dateOfExit: string | null;
    status: ContractEmployeeStatus;
    weeklyOffDays: number[];
    notes: string | null;
    uan: string | null;
    pfApplicable: boolean;
    pfOnActualWage: boolean;
    esicApplicable: boolean;
    esicIpNumber: string | null;
    bankName: string | null;
    accountHolder: string | null;
    ifsc: string | null;
    emergencyContactName: string | null;
    emergencyContactPhone: string | null;
    nomineeName: string | null;
    nomineeRelation: string | null;
    aadhaarLast4: string | null;
    pan4: string | null;
    accountLast4: string | null;
    hasAadhaar: boolean;
    hasPan: boolean;
    hasAccount: boolean;
  };
  clients: { id: string; name: string }[];
  salaryStructures: SalaryRow[];
  documents: DocRow[];
  activity: ActivityRow[];
  payslips: PayslipRow[];
};

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "statutory", label: "Statutory & Bank" },
  { id: "salary", label: "Salary structure" },
  { id: "attendance", label: "Attendance" },
  { id: "payslips", label: "Payslips" },
  { id: "documents", label: "Documents" },
  { id: "activity", label: "Activity" },
];

export function EmployeeProfile(props: EmployeeProfileProps) {
  const [tab, setTab] = useState<Tab>("overview");
  const e = props.employee;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted tabular">{e.employeeCode}</p>
        <h2 className="text-2xl font-semibold leading-8">{e.fullName}</h2>
        <p className="text-sm text-muted">
          {e.designation}
          {e.client ? ` · ${e.client.name}` : ""} ·{" "}
          {formatPhoneDisplay(e.mobile)}
        </p>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-border" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "min-h-11 border-b-2 px-3 text-sm",
              tab === t.id
                ? "border-primary font-medium text-primary"
                : "border-transparent text-muted hover:text-text",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" ? <OverviewTab {...props} /> : null}
      {tab === "statutory" ? <StatutoryTab {...props} /> : null}
      {tab === "salary" ? <SalaryTab {...props} /> : null}
      {tab === "attendance" ? (
        <div className="space-y-2 rounded-[var(--radius-card)] border border-border bg-surface p-4 text-sm shadow-[var(--shadow-card)]">
          <p>Attendance is marked on the month grid for all employees.</p>
          <a
            href="/admin/payroll/attendance?month=2026-09"
            className="underline-offset-2 hover:underline"
          >
            Open attendance grid →
          </a>
        </div>
      ) : null}
      {tab === "payslips" ? (
        <PayslipsTab employeeId={e.id} payslips={props.payslips} />
      ) : null}
      {tab === "documents" ? <DocumentsTab {...props} /> : null}
      {tab === "activity" ? <ActivityTab activity={props.activity} /> : null}
    </div>
  );
}

function OverviewTab({ employee, clients }: EmployeeProfileProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const e = employee;

  function onSubmit(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const fd = new FormData(ev.currentTarget);
    const payload = {
      id: e.id,
      employeeCode: String(fd.get("employeeCode")),
      fullName: String(fd.get("fullName")),
      fatherName: String(fd.get("fatherName") || "") || null,
      gender: String(fd.get("gender")),
      dob: String(fd.get("dob")),
      mobile: String(fd.get("mobile")),
      email: String(fd.get("email") || "") || null,
      addressLine: String(fd.get("addressLine")),
      city: String(fd.get("city")),
      state: String(fd.get("state")),
      pincode: String(fd.get("pincode")),
      designation: String(fd.get("designation")),
      department: String(fd.get("department") || "") || null,
      clientId: String(fd.get("clientId") || "") || null,
      deploymentSite: String(fd.get("deploymentSite") || "") || null,
      dateOfJoining: String(fd.get("dateOfJoining")),
      dateOfExit: String(fd.get("dateOfExit") || "") || null,
      status: String(fd.get("status")) as ContractEmployeeStatus,
      weeklyOffDays: [0],
      notes: String(fd.get("notes") || "") || null,
    };
    startTransition(async () => {
      const result = await updateContractEmployeeAction(payload);
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Saved");
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="grid gap-3 rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-[var(--shadow-card)] sm:grid-cols-2"
    >
      <Field name="employeeCode" label="Code" defaultValue={e.employeeCode} required />
      <Field name="fullName" label="Full name" defaultValue={e.fullName} required />
      <Field name="fatherName" label="Father name" defaultValue={e.fatherName ?? ""} />
      <div className="space-y-1">
        <Label>Gender</Label>
        <select
          name="gender"
          defaultValue={e.gender}
          className="flex h-10 w-full rounded-[var(--radius-control)] border border-border px-3 text-sm"
        >
          <option>Male</option>
          <option>Female</option>
          <option>Other</option>
        </select>
      </div>
      <Field name="dob" label="DOB" type="date" defaultValue={e.dob.slice(0, 10)} required />
      <Field name="mobile" label="Mobile" defaultValue={e.mobile} required />
      <Field name="email" label="Email" defaultValue={e.email ?? ""} />
      <Field name="designation" label="Designation" defaultValue={e.designation} required />
      <Field name="department" label="Department" defaultValue={e.department ?? ""} />
      <div className="space-y-1">
        <Label>Client</Label>
        <select
          name="clientId"
          defaultValue={e.clientId ?? ""}
          className="flex h-10 w-full rounded-[var(--radius-control)] border border-border px-3 text-sm"
        >
          <option value="">None</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <Field
        name="deploymentSite"
        label="Deployment site"
        defaultValue={e.deploymentSite ?? ""}
      />
      <Field
        name="dateOfJoining"
        label="DOJ"
        type="date"
        defaultValue={e.dateOfJoining.slice(0, 10)}
        required
      />
      <Field
        name="dateOfExit"
        label="Date of exit"
        type="date"
        defaultValue={e.dateOfExit?.slice(0, 10) ?? ""}
      />
      <div className="space-y-1">
        <Label>Status</Label>
        <select
          name="status"
          defaultValue={e.status}
          className="flex h-10 w-full rounded-[var(--radius-control)] border border-border px-3 text-sm"
        >
          {Object.values(ContractEmployeeStatus).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <Field
        name="addressLine"
        label="Address"
        defaultValue={e.addressLine}
        required
        className="sm:col-span-2"
      />
      <Field name="city" label="City" defaultValue={e.city} required />
      <Field name="state" label="State" defaultValue={e.state} required />
      <Field name="pincode" label="Pincode" defaultValue={e.pincode} required />
      <Field
        name="notes"
        label="Notes"
        defaultValue={e.notes ?? ""}
        className="sm:col-span-2"
      />
      <div className="sm:col-span-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : "Save overview"}
        </Button>
      </div>
    </form>
  );
}

function StatutoryTab({ employee }: EmployeeProfileProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const e = employee;

  function reveal(field: "aadhaar" | "pan" | "account") {
    startTransition(async () => {
      const result = await revealSensitiveFieldAction({
        employeeId: e.id,
        field,
      });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      setRevealed((r) => ({ ...r, [field]: result.data.value }));
      toast.message("Revealed — action audited");
    });
  }

  function onSubmit(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const fd = new FormData(ev.currentTarget);
    startTransition(async () => {
      const result = await updateEmployeeStatutoryAction({
        employeeId: e.id,
        aadhaar: String(fd.get("aadhaar") || "") || null,
        pan: String(fd.get("pan") || "") || null,
        uan: String(fd.get("uan") || "") || null,
        pfApplicable: fd.get("pfApplicable") === "on",
        pfOnActualWage: fd.get("pfOnActualWage") === "on",
        esicApplicable: fd.get("esicApplicable") === "on",
        esicIpNumber: String(fd.get("esicIpNumber") || "") || null,
        bankName: String(fd.get("bankName") || "") || null,
        accountHolder: String(fd.get("accountHolder") || "") || null,
        accountNumber: String(fd.get("accountNumber") || "") || null,
        ifsc: String(fd.get("ifsc") || "") || null,
        emergencyContactName:
          String(fd.get("emergencyContactName") || "") || null,
        emergencyContactPhone:
          String(fd.get("emergencyContactPhone") || "") || null,
        nomineeName: String(fd.get("nomineeName") || "") || null,
        nomineeRelation: String(fd.get("nomineeRelation") || "") || null,
      });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Statutory & bank saved");
      setRevealed({});
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-6 rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-[var(--shadow-card)]"
    >
      <div>
        <p className="mb-3 text-sm font-medium">KYC (encrypted)</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <SensitiveField
            label="Aadhaar"
            mask={maskAadhaarLocal(e.aadhaarLast4)}
            hasValue={e.hasAadhaar}
            revealed={revealed.aadhaar}
            inputName="aadhaar"
            placeholder="Leave blank to keep · or enter 12 digits"
            onReveal={() => reveal("aadhaar")}
            pending={isPending}
          />
          <SensitiveField
            label="PAN"
            mask={maskPanLocal(e.pan4)}
            hasValue={e.hasPan}
            revealed={revealed.pan}
            inputName="pan"
            placeholder="Leave blank to keep · or enter PAN"
            onReveal={() => reveal("pan")}
            pending={isPending}
          />
          <Field name="uan" label="UAN" defaultValue={e.uan ?? ""} />
          <Field
            name="esicIpNumber"
            label="ESIC IP number"
            defaultValue={e.esicIpNumber ?? ""}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="pfApplicable" defaultChecked={e.pfApplicable} />
          PF applicable
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="pfOnActualWage"
            defaultChecked={e.pfOnActualWage}
          />
          PF on actual wage
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="esicApplicable"
            defaultChecked={e.esicApplicable}
          />
          ESIC applicable
        </label>
      </div>

      <div>
        <p className="mb-3 text-sm font-medium">Bank</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field name="bankName" label="Bank name" defaultValue={e.bankName ?? ""} />
          <Field
            name="accountHolder"
            label="Account holder"
            defaultValue={e.accountHolder ?? ""}
          />
          <SensitiveField
            label="Account number"
            mask={maskAccountLocal(e.accountLast4)}
            hasValue={e.hasAccount}
            revealed={revealed.account}
            inputName="accountNumber"
            placeholder="Leave blank to keep · or enter new number"
            onReveal={() => reveal("account")}
            pending={isPending}
          />
          <Field name="ifsc" label="IFSC" defaultValue={e.ifsc ?? ""} />
        </div>
      </div>

      <div>
        <p className="mb-3 text-sm font-medium">Emergency / nominee</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            name="emergencyContactName"
            label="Emergency contact"
            defaultValue={e.emergencyContactName ?? ""}
          />
          <Field
            name="emergencyContactPhone"
            label="Emergency phone"
            defaultValue={e.emergencyContactPhone ?? ""}
          />
          <Field
            name="nomineeName"
            label="Nominee"
            defaultValue={e.nomineeName ?? ""}
          />
          <Field
            name="nomineeRelation"
            label="Relation"
            defaultValue={e.nomineeRelation ?? ""}
          />
        </div>
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : "Save statutory & bank"}
      </Button>
    </form>
  );
}

function SensitiveField({
  label,
  mask,
  hasValue,
  revealed,
  inputName,
  placeholder,
  onReveal,
  pending,
}: {
  label: string;
  mask: string;
  hasValue: boolean;
  revealed?: string;
  inputName: string;
  placeholder: string;
  onReveal: () => void;
  pending: boolean;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <Label>{label}</Label>
        {hasValue ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={onReveal}
          >
            Reveal
          </Button>
        ) : null}
      </div>
      <p className="text-xs tabular text-muted">
        Stored: {revealed ?? mask}
      </p>
      <Input name={inputName} placeholder={placeholder} autoComplete="off" />
    </div>
  );
}

function SalaryTab({ employee, salaryStructures }: EmployeeProfileProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function onSubmit(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const fd = new FormData(ev.currentTarget);
    const grossRupees = Number(fd.get("grossRupees"));
    if (!Number.isFinite(grossRupees) || grossRupees <= 0) {
      toast.error("Enter a valid monthly gross");
      return;
    }
    const gross = toPaise(grossRupees);
    const basic = Math.round(gross * 0.5);
    const hra = Math.round(gross * 0.25);
    const special = gross - basic - hra;
    startTransition(async () => {
      const result = await addSalaryStructureAction({
        employeeId: employee.id,
        effectiveFrom: String(fd.get("effectiveFrom")),
        monthlyGrossPaise: gross,
        note: String(fd.get("note") || "") || null,
        components: [
          {
            key: "BASIC",
            label: "Basic",
            amountPaise: basic,
            pfWage: true,
            esicWage: true,
          },
          {
            key: "HRA",
            label: "HRA",
            amountPaise: hra,
            pfWage: false,
            esicWage: true,
          },
          {
            key: "SPECIAL",
            label: "Special allowance",
            amountPaise: special,
            pfWage: false,
            esicWage: true,
          },
        ],
      });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Salary structure added");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={onSubmit}
        className="grid gap-3 rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-[var(--shadow-card)] sm:grid-cols-3"
      >
        <p className="sm:col-span-3 text-sm font-medium">
          Add structure (history — previous rows kept)
        </p>
        <Field
          name="effectiveFrom"
          label="Effective from"
          type="date"
          required
          defaultValue={new Date().toISOString().slice(0, 10)}
        />
        <Field
          name="grossRupees"
          label="Monthly gross (₹)"
          type="number"
          required
          defaultValue=""
        />
        <Field name="note" label="Note" defaultValue="" />
        <p className="sm:col-span-3 text-xs text-muted">
          Components auto-split 50% Basic / 25% HRA / rest Special (same as seed).
        </p>
        <div>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Adding…" : "Add salary structure"}
          </Button>
        </div>
      </form>

      {salaryStructures.length === 0 ? (
        <p className="text-sm text-muted">No salary structures yet</p>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-card)] border border-border bg-surface shadow-[var(--shadow-card)]">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-surface-2 text-xs">
              <tr>
                <th className="px-3 py-2 font-medium">Effective</th>
                <th className="px-3 py-2 font-medium">Gross</th>
                <th className="px-3 py-2 font-medium">Components</th>
                <th className="px-3 py-2 font-medium">Created by</th>
                <th className="px-3 py-2 font-medium">Note</th>
              </tr>
            </thead>
            <tbody>
              {salaryStructures.map((s) => {
                const comps = Array.isArray(s.components)
                  ? (s.components as {
                      label: string;
                      amountPaise: number;
                    }[])
                  : [];
                return (
                  <tr key={s.id} className="border-t border-border">
                    <td className="px-3 py-2 tabular">
                      {formatDisplayDate(s.effectiveFrom)}
                    </td>
                    <td className="px-3 py-2 tabular font-medium">
                      {formatINR(s.monthlyGrossPaise)}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted">
                      {comps
                        .map((c) => `${c.label} ${formatINR(c.amountPaise)}`)
                        .join(" · ")}
                    </td>
                    <td className="px-3 py-2">{s.createdBy.name}</td>
                    <td className="px-3 py-2 text-muted">{s.note ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function DocumentsTab({ employee, documents }: EmployeeProfileProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function onUpload(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const form = ev.currentTarget;
    const fd = new FormData(form);
    fd.set("employeeId", employee.id);
    startTransition(async () => {
      const res = await fetch("/api/admin/payroll/documents/upload", {
        method: "POST",
        body: fd,
      });
      const json = (await res.json()) as {
        ok: boolean;
        error?: { message: string };
      };
      if (!json.ok) {
        toast.error(json.error?.message ?? "Upload failed");
        return;
      }
      toast.success("Document uploaded");
      form.reset();
      router.refresh();
    });
  }

  function onDelete(id: string, fileName: string) {
    if (!window.confirm(`Delete ${fileName}?`)) return;
    startTransition(async () => {
      const result = await deleteDocumentAction({ id });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Deleted");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={onUpload}
        className="grid gap-3 rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-[var(--shadow-card)] sm:grid-cols-3"
      >
        <div className="space-y-1">
          <Label htmlFor="doc-type">Type</Label>
          <select
            id="doc-type"
            name="type"
            className="flex h-10 w-full rounded-[var(--radius-control)] border border-border px-3 text-sm"
            defaultValue={DocumentType.OTHER}
          >
            {Object.values(DocumentType).map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="doc-file">File (≤ 5 MB)</Label>
          <Input id="doc-file" name="file" type="file" required />
        </div>
        <div>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Uploading…" : "Upload"}
          </Button>
        </div>
      </form>

      {documents.length === 0 ? (
        <p className="text-sm text-muted">No documents</p>
      ) : (
        <ul className="divide-y divide-border rounded-[var(--radius-card)] border border-border bg-surface shadow-[var(--shadow-card)]">
          {documents.map((d) => (
            <li
              key={d.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium">{d.fileName}</p>
                <p className="text-xs text-muted">
                  {d.type} · {formatDisplayDateTime(d.uploadedAt)}
                </p>
              </div>
              <div className="flex gap-2">
                <Button asChild variant="secondary" size="sm">
                  <a
                    href={`/api/admin/payroll/documents/${d.id}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open
                  </a>
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={isPending}
                  onClick={() => onDelete(d.id, d.fileName)}
                >
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PayslipsTab({
  employeeId,
  payslips,
}: {
  employeeId: string;
  payslips: PayslipRow[];
}) {
  if (payslips.length === 0) {
    return (
      <p className="text-sm text-muted">
        No payroll lines yet. Recalculate a month under Payroll → Runs.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto rounded-[var(--radius-card)] border border-border bg-surface shadow-[var(--shadow-card)]">
      <table className="w-full text-sm">
        <thead className="bg-surface-2 text-left">
          <tr>
            <th className="px-3 py-2">Month</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2 text-right">Days</th>
            <th className="px-3 py-2 text-right">Gross</th>
            <th className="px-3 py-2 text-right">Net</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {payslips.map((p) => (
            <tr key={p.month} className="border-t border-border">
              <td className="px-3 py-2 tabular-nums">{p.month}</td>
              <td className="px-3 py-2">{p.status}</td>
              <td className="px-3 py-2 text-right tabular-nums">
                {p.payableDays}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                {formatINR(p.earnedGrossPaise)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                {formatINR(p.netPayPaise)}
              </td>
              <td className="px-3 py-2 text-right">
                <a
                  href={`/api/admin/payroll/payslip/${employeeId}/${p.month}`}
                  className="underline-offset-2 hover:underline"
                >
                  PDF
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ActivityTab({ activity }: { activity: ActivityRow[] }) {
  if (activity.length === 0) {
    return <p className="text-sm text-muted">No activity yet</p>;
  }
  return (
    <ul className="divide-y divide-border rounded-[var(--radius-card)] border border-border bg-surface shadow-[var(--shadow-card)]">
      {activity.map((a) => (
        <li key={a.id} className="px-4 py-3 text-sm">
          <div className="flex flex-wrap justify-between gap-2">
            <span className="font-medium">{a.action}</span>
            <span className="tabular text-xs text-muted">
              {formatDisplayDateTime(a.createdAt)}
            </span>
          </div>
          <p className="text-xs text-muted">
            {a.actor?.name ?? "System"} · {a.entityType}
          </p>
        </li>
      ))}
    </ul>
  );
}

function Field({
  name,
  label,
  type = "text",
  required,
  defaultValue,
  className,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  className?: string;
}) {
  return (
    <div className={`space-y-1 ${className ?? ""}`}>
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
      />
    </div>
  );
}
