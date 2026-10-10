import { listStatutoryConfigs } from "@/server/payroll/statutory";
import { StatutorySettings } from "@/components/payroll/statutory-settings";
import { PageIntro } from "@/components/shared/page-intro";

export default async function PayrollSettingsPage() {
  const configs = await listStatutoryConfigs();

  return (
    <div className="space-y-4">
      <PageIntro
        kicker="Payroll · statutory"
        title="Statutory settings"
        description="Effective-dated PF and ESIC rates and the day divisor."
      />
      <StatutorySettings configs={configs} />
    </div>
  );
}
