import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { auth } from "@/server/auth";
import { getOpenCaseForEmployee } from "@/server/cases/active";
import { getAppSettings } from "@/server/settings";
import { ActiveCaseForm } from "@/components/case/active-case-form";
import { leadExtra } from "@/lib/lead-extra";

export default async function ActiveCasePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== Role.EMPLOYEE) {
    redirect("/admin/dashboard");
  }

  const [open, settings] = await Promise.all([
    getOpenCaseForEmployee(session.user.id),
    getAppSettings(),
  ]);

  if (!open) {
    redirect("/app");
  }

  return (
    <ActiveCaseForm
      key={open.id}
      caseId={open.id}
      startedAt={open.startedAt.toISOString()}
      maxAttempts={settings.maxAttempts}
      lead={{
        id: open.lead.id,
        phone: open.lead.phone,
        name: open.lead.name,
        city: open.lead.city,
        trade: open.lead.trade,
        experienceYears:
          open.lead.experienceYears != null
            ? open.lead.experienceYears.toString()
            : null,
        extra: leadExtra(open.lead.extra),
        source: open.lead.source,
        attempts: open.lead.attempts,
      }}
    />
  );
}
