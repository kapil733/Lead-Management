import { LeadSource, LeadStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  const variant =
    status === "NEW"
      ? "info"
      : status === "IN_CASE"
        ? "primary"
        : status === "CLOSED"
          ? "success"
          : "warning";
  return <Badge variant={variant}>{status.replaceAll("_", " ")}</Badge>;
}

export function LeadSourceBadge({ source }: { source: LeadSource }) {
  return <Badge variant="default">{source}</Badge>;
}

export function RatingChip({ rating }: { rating: number | null }) {
  if (rating == null) return <span className="text-muted">—</span>;
  const colors = [
    "var(--rating-0)",
    "var(--rating-1)",
    "var(--rating-2)",
    "var(--rating-3)",
    "var(--rating-4)",
    "var(--rating-5)",
  ];
  return (
    <span
      className="inline-flex size-7 items-center justify-center rounded-full text-xs font-semibold text-white tabular"
      style={{ background: colors[rating] ?? "var(--muted)" }}
    >
      {rating}
    </span>
  );
}
