"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ContractEmployeeStatus } from "@prisma/client";
import { createContractEmployeeAction } from "@/server/payroll/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function AddEmployeeDialog({
  clients,
}: {
  clients: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      employeeCode: String(fd.get("employeeCode") ?? ""),
      fullName: String(fd.get("fullName") ?? ""),
      gender: String(fd.get("gender") ?? "Male"),
      dob: String(fd.get("dob") ?? ""),
      mobile: String(fd.get("mobile") ?? ""),
      email: String(fd.get("email") ?? "") || null,
      addressLine: String(fd.get("addressLine") ?? ""),
      city: String(fd.get("city") ?? ""),
      state: String(fd.get("state") ?? ""),
      pincode: String(fd.get("pincode") ?? ""),
      designation: String(fd.get("designation") ?? ""),
      clientId: String(fd.get("clientId") ?? "") || null,
      dateOfJoining: String(fd.get("dateOfJoining") ?? ""),
      status: ContractEmployeeStatus.ACTIVE,
      weeklyOffDays: [0],
    };
    startTransition(async () => {
      const result = await createContractEmployeeAction(payload);
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Employee created");
      setOpen(false);
      router.push(`/admin/payroll/employees/${result.data.id}`);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button">Add employee</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <form onSubmit={onSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Add contract employee</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field name="employeeCode" label="Code" required placeholder="CE015" />
            <Field name="fullName" label="Full name" required />
            <div className="space-y-1">
              <Label htmlFor="gender">Gender</Label>
              <select
                id="gender"
                name="gender"
                className="flex h-10 w-full rounded-[var(--radius-control)] border border-border px-3 text-sm"
                defaultValue="Male"
              >
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
            </div>
            <Field name="dob" label="DOB" type="date" required />
            <Field name="mobile" label="Mobile" required />
            <Field name="email" label="Email" type="email" />
            <Field
              name="addressLine"
              label="Address"
              required
              className="sm:col-span-2"
            />
            <Field name="city" label="City" required />
            <Field name="state" label="State" required />
            <Field name="pincode" label="Pincode" required />
            <Field name="designation" label="Designation" required />
            <div className="space-y-1">
              <Label htmlFor="clientId">Client</Label>
              <select
                id="clientId"
                name="clientId"
                className="flex h-10 w-full rounded-[var(--radius-control)] border border-border px-3 text-sm"
                defaultValue=""
              >
                <option value="">None</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <Field name="dateOfJoining" label="Date of joining" type="date" required />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  name,
  label,
  type = "text",
  required,
  placeholder,
  className,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
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
        placeholder={placeholder}
      />
    </div>
  );
}
