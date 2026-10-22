import Link from "next/link";
import { notFound } from "next/navigation";
import { getLeadDetail } from "@/server/leads/queries";
import { formatPhoneDisplay } from "@/lib/phone";
import { formatDisplayDate } from "@/lib/dates";
import { JoinedToggle } from "@/components/leads/joined-toggle";
import {
  LeadSourceBadge,
  LeadStatusBadge,
  RatingChip,
} from "@/components/leads/status-badge";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { bikeTypeLabel } from "@/lib/validators/cases";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lead = await getLeadDetail(id);
  if (!lead) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="secondary" size="sm">
          <Link href="/admin/leads">
            <ArrowLeft className="size-4" />
            Back
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle className="text-2xl font-semibold leading-8">
              {lead.name ?? "Unnamed lead"}
            </CardTitle>
            <CardDescription className="mt-1 text-base tabular phone-no-select">
              {formatPhoneDisplay(lead.phone)}
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <LeadStatusBadge status={lead.status} />
            <LeadSourceBadge source={lead.source} />
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted">Joined</span>
              <JoinedToggle leadId={lead.id} joined={lead.joined} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="City" value={lead.city} />
          <Field label="Location" value={lead.location} />
          <Field label="Technician" value={bikeTypeLabel(lead.bikeType)} />
          <Field label="Trade" value={lead.trade} />
          <Field
            label="Experience"
            value={
              lead.experienceYears != null
                ? `${lead.experienceYears.toString()} yrs`
                : null
            }
          />
          <Field label="Attempts" value={String(lead.attempts)} />
          <Field
            label="Imported on"
            value={formatDisplayDate(lead.createdAt)}
          />
          <Field
            label="Import batch"
            value={lead.importBatch?.fileName ?? null}
          />
          {lead.referredBy ? (
            <Field
              label="Referred by"
              value={`${lead.referredBy.name ?? "Lead"} (${formatPhoneDisplay(lead.referredBy.phone)})`}
            />
          ) : null}
          {lead.joined && lead.joinedAt ? (
            <Field
              label="Joined at"
              value={`${formatDisplayDate(lead.joinedAt)}${
                lead.joinedMarkedBy
                  ? ` · ${lead.joinedMarkedBy.name}`
                  : ""
              }`}
            />
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Case history</CardTitle>
          <CardDescription>
            Timeline of calls against this lead.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {lead.cases.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">
              No cases yet for this lead.
            </p>
          ) : (
            <ol className="space-y-4">
              {lead.cases.map((c) => (
                <li
                  key={c.id}
                  className="rounded-[var(--radius-control)] border border-border p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="default">{c.status}</Badge>
                    {c.outcome ? (
                      <Badge variant="info">
                        {c.outcome.replaceAll("_", " ")}
                      </Badge>
                    ) : null}
                    <RatingChip rating={c.rating} />
                    <span className="text-sm text-muted">
                      {c.employee.name}
                    </span>
                    <span className="text-xs text-muted tabular">
                      {formatDisplayDate(c.startedAt)}
                      {c.durationSeconds != null
                        ? ` · ${Math.round(c.durationSeconds / 60)} min`
                        : ""}
                    </span>
                  </div>
                  {c.remarks ? (
                    <p className="mt-2 text-sm text-text">{c.remarks}</p>
                  ) : null}
                  {c.referrals.length > 0 ? (
                    <p className="mt-2 text-xs text-muted">
                      Friends added: {c.referrals.length}
                    </p>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Referrals given</CardTitle>
            <CardDescription>
              Leads this person referred into the pool.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {lead.referralsGiven.length === 0 ? (
              <p className="text-sm text-muted">None yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {lead.referralsGiven.map((r) => (
                  <li key={r.id}>
                    <Link
                      href={`/admin/leads/${r.id}`}
                      className="text-primary hover:underline"
                    >
                      {r.name ?? formatPhoneDisplay(r.phone)}
                    </Link>{" "}
                    <span className="text-muted">
                      · {r.status} · {r.source}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Extra fields</CardTitle>
            <CardDescription>
              Unmapped columns kept from import.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {lead.extra &&
            typeof lead.extra === "object" &&
            !Array.isArray(lead.extra) &&
            Object.keys(lead.extra).length > 0 ? (
              <dl className="space-y-2 text-sm">
                {Object.entries(lead.extra as Record<string, unknown>).map(
                  ([k, v]) => (
                    <div key={k} className="flex gap-2">
                      <dt className="text-muted">{k}</dt>
                      <dd>{String(v)}</dd>
                    </div>
                  ),
                )}
              </dl>
            ) : (
              <p className="text-sm text-muted">No extra fields.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className="text-sm font-medium">{value ?? "—"}</p>
    </div>
  );
}
