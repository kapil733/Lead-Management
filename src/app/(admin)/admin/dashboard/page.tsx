import { getDashboardData } from "@/server/dashboard/queries";
import { dashboardPeriodSchema } from "@/lib/validators/dashboard";
import Link from "next/link";
import { AlertTriangle, Upload } from "lucide-react";
import { PeriodToggle } from "@/components/dashboard/period-toggle";
import { AlertsStrip } from "@/components/dashboard/alerts-strip";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { Button } from "@/components/ui/button";
import { CasesChart } from "@/components/dashboard/cases-chart";
import { LiveActivity } from "@/components/dashboard/live-activity";
import { TelecallerBars } from "@/components/dashboard/telecaller-bars";

const PERIOD_LABEL = {
  today: "today (IST)",
  "7d": "last 7 days",
  "30d": "last 30 days",
} as const;

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const periodRaw = Array.isArray(raw.period) ? raw.period[0] : raw.period;
  const period = dashboardPeriodSchema.parse(periodRaw ?? "30d");

  const data = await getDashboardData(period);

  const segments = 30;
  const filled =
    data.pool.totalLeads === 0
      ? 0
      : Math.round((data.pool.newLeads / data.pool.totalLeads) * segments);

  return (
    <div className="space-y-4">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="kicker">Recruitment · manager view</p>
          <h1 className="page-title mt-1.5">Dashboard</h1>
        </div>
        <PeriodToggle />
      </div>

      <div className="flex flex-wrap items-stretch gap-4">
      <section className="min-w-0 flex-[1.6] basis-[560px] rounded-[18px] border border-border bg-surface p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="kicker">Lead pool · new leads</p>
            <p className="mt-2.5 font-mono text-[84px] font-medium leading-none tracking-[-0.04em]">
              {data.pool.newLeads}
              <span className="text-[30px] tracking-normal text-muted-2">
                {" "}
                / {data.pool.totalLeads} total
              </span>
            </p>
          </div>
          {data.alerts.poolLow ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-warning-soft px-3 py-1.5 font-mono text-xs font-semibold tracking-wide text-warning">
              <AlertTriangle className="size-3.5" aria-hidden />
              Pool running low
            </span>
          ) : null}
        </div>
        <div className="mt-6 flex gap-1">
          {Array.from({ length: segments }, (_, i) => (
            <div
              key={i}
              className={
                i < filled
                  ? "h-[46px] flex-1 rounded-[4px] bg-warning"
                  : "h-[46px] flex-1 rounded-[4px] bg-border"
              }
            />
          ))}
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
          <p className="max-w-[440px] text-sm leading-relaxed text-muted">
            Alert triggers under 50 NEW leads or under 10% of the pool. Import
            more leads soon.
          </p>
          <Button asChild>
            <Link href="/admin/leads/import">
              <Upload className="size-4" />
              Import leads
            </Link>
          </Button>
        </div>
      </section>
      <div className="min-w-0 flex-1 basis-[320px]">
        <LiveActivity
          cases={data.live.map((c) => ({
            ...c,
            startedAt: c.startedAt.toISOString(),
          }))}
          staleCaseMinutes={data.settings.staleCaseMinutes}
        />
      </div>
      </div>

      {data.alerts.staleCount > 0 ? (
        <AlertsStrip
          poolLow={false}
          newLeads={data.alerts.newLeads}
          totalLeads={data.alerts.totalLeads}
          staleCount={data.alerts.staleCount}
          staleCaseMinutes={data.settings.staleCaseMinutes}
        />
      ) : null}

      <KpiCards kpis={data.kpis} />

      <CasesChart data={data.chart} periodLabel={PERIOD_LABEL[period]} />

      <div>
        <p className="mb-2 font-display text-lg font-bold">
          Telecallers · {PERIOD_LABEL[period]}
        </p>
        <TelecallerBars rows={data.telecallers} />
      </div>
    </div>
  );
}
