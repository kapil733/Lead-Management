import { redirect } from "next/navigation";
import { CallOutcome, Role } from "@prisma/client";
import { auth } from "@/server/auth";
import { listCompletedCasesForEmployee } from "@/server/cases/completed";
import { completedFiltersSchema } from "@/lib/validators/completed";
import { CompletedFilters } from "@/components/completed/completed-filters";
import { CompletedList } from "@/components/completed/completed-list";
import { PageIntro } from "@/components/shared/page-intro";

export default async function EmployeeCompletedPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== Role.EMPLOYEE) {
    redirect("/admin/dashboard");
  }

  const raw = await searchParams;
  const get = (key: string) => {
    const v = raw[key];
    return Array.isArray(v) ? v[0] : v;
  };

  const outcomeRaw = get("outcome");
  const joinedRaw = get("joined");
  const filters = completedFiltersSchema.parse({
    from: get("from") || undefined,
    to: get("to") || undefined,
    rating: get("rating") || undefined,
    outcome:
      outcomeRaw &&
      Object.values(CallOutcome).includes(outcomeRaw as CallOutcome)
        ? outcomeRaw
        : undefined,
    joined:
      joinedRaw === "yes" || joinedRaw === "no" ? joinedRaw : "all",
    q: get("q") || undefined,
    page: get("page") ?? "1",
    pageSize: "25",
  });

  const result = await listCompletedCasesForEmployee(
    session.user.id,
    filters,
  );

  return (
    <div className="space-y-6">
      <PageIntro
        kicker="Your closed cases"
        title="History"
        description="Toggle Joined when a technician joins."
      />

      <CompletedFilters />

      <CompletedList
        rows={result.rows.map((r) => ({
          ...r,
          closedAt: r.closedAt?.toISOString() ?? null,
        }))}
        total={result.total}
        pageSize={result.pageSize}
      />
    </div>
  );
}
