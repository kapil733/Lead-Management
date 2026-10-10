import { listHolidays } from "@/server/payroll/holidays";
import { HolidaysManager } from "@/components/payroll/holidays-manager";
import { PageIntro } from "@/components/shared/page-intro";

export default async function HolidaysPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const sp = await searchParams;
  const year = Number(sp.year) || 2026;
  const holidays = await listHolidays(year);

  return (
    <div className="space-y-4">
      <PageIntro
        kicker="Payroll · calendar"
        title="Holidays"
        description="Global paid and unpaid holidays used by the attendance grid."
      />
      <HolidaysManager year={year} initial={holidays} />
    </div>
  );
}
