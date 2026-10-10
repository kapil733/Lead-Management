"use client";

import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ChartCard({
  title,
  subtitle,
  children,
  empty,
  emptyMessage = "No data for these filters",
  onExport,
  onClearFilter,
  clearLabel,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  empty?: boolean;
  emptyMessage?: string;
  onExport?: () => void;
  onClearFilter?: () => void;
  clearLabel?: string;
}) {
  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-surface shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-2 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">{title}</p>
          {subtitle ? (
            <p className="text-xs text-muted">{subtitle}</p>
          ) : null}
        </div>
        {(onExport || onClearFilter) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 shrink-0"
                aria-label={`${title} menu`}
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onClearFilter ? (
                <DropdownMenuItem onSelect={onClearFilter}>
                  {clearLabel ?? "Clear this filter"}
                </DropdownMenuItem>
              ) : null}
              {onExport ? (
                <DropdownMenuItem onSelect={onExport}>
                  Export CSV (current filters)
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      <div className="p-4">
        {empty ? (
          <div className="flex h-48 items-center justify-center text-sm text-muted">
            {emptyMessage}
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

export function ChartSkeleton({ title }: { title: string }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-[var(--shadow-card)]">
      <div className="mb-3 h-4 w-32 animate-pulse rounded bg-surface-2" />
      <p className="sr-only">Loading {title}</p>
      <div className="h-48 animate-pulse rounded bg-surface-2" />
    </div>
  );
}
