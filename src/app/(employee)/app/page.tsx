import Link from "next/link";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { ArrowRight } from "lucide-react";
import { auth } from "@/server/auth";
import { getEmployeeHomeStats } from "@/server/cases/active";
import { HomeClaimButton } from "@/components/case/home-claim-button";
import { RatingChip } from "@/components/leads/status-badge";
import { formatDisplayDate } from "@/lib/dates";
import { outcomeLabel } from "@/lib/outcomes";

function greeting(): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "numeric",
      hour12: false,
    }).format(new Date()),
  );
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default async function EmployeeHomePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== Role.EMPLOYEE) {
    redirect("/admin/dashboard");
  }

  const stats = await getEmployeeHomeStats(session.user.id);
  const firstName = (session.user.name ?? "there").split(" ")[0];
  const pct = Math.min(
    100,
    Math.round((stats.progress.used / stats.progress.cap) * 100),
  );
  const ring = `${Math.round((pct / 100) * 213.6)} 213.6`;

  return (
    <div className="flex flex-wrap items-start gap-5">
      <aside className="flex w-full max-w-full flex-col gap-4 lg:w-[340px] lg:shrink-0">
        <section className="rounded-[20px] border border-border bg-surface p-5">
          <div className="flex items-center gap-4">
            <div className="relative size-20 shrink-0">
              <svg width="80" height="80" viewBox="0 0 80 80" aria-hidden>
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  fill="none"
                  strokeWidth="8"
                  className="stroke-border"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  fill="none"
                  strokeWidth="8"
                  strokeLinecap="round"
                  transform="rotate(-90 40 40)"
                  strokeDasharray={ring}
                  className="stroke-primary"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center font-mono text-xl font-medium">
                {stats.kpis.closedToday}
              </div>
            </div>
            <div>
              <p className="kicker">Closed today</p>
              <p className="mt-1 font-display text-2xl font-bold leading-tight">
                {stats.kpis.closedToday}{" "}
                <span className="font-mono text-[15px] font-normal text-muted">
                  of {stats.progress.cap}
                </span>
              </p>
              <p className="mt-1 font-mono text-xs text-muted">
                {greeting()}, {firstName}
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <Mini
              label="Avg"
              value={
                stats.kpis.avgRating != null
                  ? stats.kpis.avgRating.toFixed(1)
                  : "—"
              }
            />
            <Mini label="Referrals" value={String(stats.kpis.referralsToday)} />
            <Mini label="Joined" value={String(stats.kpis.joinedMonth)} />
          </div>
        </section>

        <section className="overflow-hidden rounded-[20px] border border-border bg-surface">
          <div className="px-[18px] pb-3 pt-[18px]">
            <p className="font-display text-lg font-bold">Recent</p>
            <p className="mt-1 font-mono text-xs text-muted">
              Your last 5 closed cases
            </p>
          </div>
          {stats.recent.length === 0 ? (
            <p className="border-t border-border px-[18px] py-4 text-sm text-muted">
              Nothing closed yet today.
            </p>
          ) : (
            <ul>
              {stats.recent.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center gap-3 border-t border-border px-[18px] py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold capitalize">
                      {c.name ?? "Unnamed"}
                    </p>
                    <p className="mt-1 font-mono text-[11px] text-muted">
                      {c.closedAt ? formatDisplayDate(c.closedAt) : "—"}
                      {c.outcome ? ` · ${outcomeLabel(c.outcome)}` : ""}
                    </p>
                  </div>
                  <RatingChip rating={c.rating} />
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/app/completed"
            className="flex items-center justify-between border-t border-border bg-surface-2 px-[18px] py-3.5 text-sm font-semibold text-accent-text"
          >
            View full history
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </section>
      </aside>

      <section className="flex min-w-0 flex-1 basis-[560px] flex-col items-center gap-3.5 rounded-3xl border border-border bg-surface px-8 py-16 text-center">
        <p className="kicker text-accent-text">
          {stats.openCase ? "Case waiting" : "Ready to dial"}
        </p>
        <h1 className="max-w-[520px] font-display text-[clamp(2rem,4vw,2.75rem)] font-bold leading-[1.05] tracking-tight">
          {stats.openCase
            ? "Pick up where you left off."
            : "One lead. One call."}
        </h1>
        <p className="max-w-[420px] text-base leading-normal text-muted">
          {stats.claimBlockedReason ??
            "Close the case before the next number is served."}
        </p>
        <HomeClaimButton
          hasOpenCase={!!stats.openCase}
          disabled={!stats.openCase && !stats.canClaim}
          disabledReason={null}
        />
      </section>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface-2 px-3 py-2.5">
      <p className="font-mono text-[10px] font-medium tracking-[0.1em] text-muted">
        {label.toUpperCase()}
      </p>
      <p className="mt-1 font-mono text-xl font-medium">{value}</p>
    </div>
  );
}
