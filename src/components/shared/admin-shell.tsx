"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Briefcase,
  Building2,
  CalendarDays,
  CalendarRange,
  ClipboardList,
  LayoutDashboard,
  Settings,
  Upload,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UserMenu } from "@/components/shared/user-menu";
import { SkipLink } from "@/components/shared/skip-link";
import { LogoMark } from "@/components/shared/logo-mark";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { ConsoleSearch } from "@/components/shared/console-search";
import type { ConsoleChrome } from "@/server/dashboard/chrome";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  match?: (path: string) => boolean;
};

export function AdminShell({
  children,
  user,
  chrome,
}: {
  children: React.ReactNode;
  user: { name: string; email: string };
  chrome: ConsoleChrome;
}) {
  const pathname = usePathname();
  const payroll = pathname.startsWith("/admin/payroll");

  const crmNav: NavItem[] = [
    { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    {
      href: "/admin/analytics",
      label: "Analytics",
      icon: BarChart3,
      match: (p) => p.startsWith("/admin/analytics"),
    },
    {
      href: "/admin/leads",
      label: "Leads",
      icon: Users,
      badge: String(chrome.totalLeads),
      match: (p) =>
        p.startsWith("/admin/leads") && !p.startsWith("/admin/leads/import"),
    },
    { href: "/admin/leads/import", label: "Import", icon: Upload },
    {
      href: "/admin/employees",
      label: "Telecallers",
      icon: UserRound,
      badge: String(chrome.telecallers),
      match: (p) => p.startsWith("/admin/employees"),
    },
    {
      href: "/admin/audit-log",
      label: "Audit log",
      icon: ClipboardList,
      match: (p) => p.startsWith("/admin/audit-log"),
    },
  ];

  const payrollNav: NavItem[] = [
    {
      href: "/admin/payroll/employees",
      label: "Employees",
      icon: Briefcase,
      badge: String(chrome.employees),
      match: (p) => p.startsWith("/admin/payroll/employees"),
    },
    {
      href: "/admin/payroll/attendance",
      label: "Attendance",
      icon: CalendarRange,
      match: (p) => p.startsWith("/admin/payroll/attendance"),
    },
    {
      href: "/admin/payroll/holidays",
      label: "Holidays",
      icon: CalendarDays,
      match: (p) => p.startsWith("/admin/payroll/holidays"),
    },
    {
      href: "/admin/payroll/runs",
      label: "Runs",
      icon: Wallet,
      match: (p) => p.startsWith("/admin/payroll/runs"),
    },
    {
      href: "/admin/payroll/clients",
      label: "Clients",
      icon: Building2,
      badge: String(chrome.clients),
      match: (p) => p.startsWith("/admin/payroll/clients"),
    },
    {
      href: "/admin/payroll/settings",
      label: "Settings",
      icon: Settings,
      match: (p) => p.startsWith("/admin/payroll/settings"),
    },
  ];

  const nav = payroll ? payrollNav : crmNav;
  const poolPct =
    chrome.totalLeads === 0
      ? 0
      : Math.min(100, Math.round((chrome.newLeads / chrome.totalLeads) * 100));

  return (
    <div className="flex min-h-screen flex-col bg-bg text-text">
      <SkipLink />
      <header className="flex flex-wrap items-center gap-4 border-b border-border px-5 py-3.5 lg:gap-5 lg:px-7">
        <Link href="/admin/dashboard" className="flex min-w-[200px] items-center gap-3">
          <LogoMark />
          <span>
            <span className="block font-display text-lg font-bold leading-none tracking-tight">
              TechConnect
            </span>
            <span className="mt-1 block font-mono text-[11px] tracking-[0.14em] text-muted">
              OPS CONSOLE
            </span>
          </span>
        </Link>

        <div className="flex gap-1 rounded-xl border border-border bg-surface p-1">
          <Link
            href="/admin/dashboard"
            className={cn(
              "rounded-[9px] px-4 py-2 text-sm font-semibold",
              !payroll ? "bg-primary text-primary-fg" : "text-muted",
            )}
          >
            Recruitment
          </Link>
          <Link
            href="/admin/payroll/employees"
            className={cn(
              "rounded-[9px] px-4 py-2 text-sm font-semibold",
              payroll ? "bg-primary text-primary-fg" : "text-muted",
            )}
          >
            Payroll
          </Link>
        </div>

        <ConsoleSearch />

        <div className="ml-auto flex items-center gap-3">
          <ThemeToggle />
          <UserMenu name={user.name} email={user.email} />
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <nav
          aria-label="Primary"
          className="flex w-full flex-col gap-1.5 border-b border-border px-4 py-4 lg:w-[248px] lg:shrink-0 lg:border-b-0 lg:border-r lg:px-4 lg:py-6"
        >
          <p className="px-3 pb-2 font-mono text-[11px] tracking-[0.16em] text-muted-2">
            {payroll ? "PAYROLL" : "RECRUITMENT CRM"}
          </p>
          <div className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
            {nav.map((item) => {
              const match = item.match
                ? item.match(pathname)
                : pathname === item.href;
              const active =
                item.href === "/admin/dashboard"
                  ? pathname === "/admin/dashboard"
                  : match;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 shrink-0 items-center gap-3 rounded-[11px] border px-3 py-2.5 text-sm font-medium",
                    active
                      ? "border-border-strong bg-surface-2 text-text"
                      : "border-transparent text-muted hover:bg-surface-2/70",
                  )}
                >
                  <Icon
                    className={cn(
                      "size-5 shrink-0",
                      active ? "text-accent-text" : "text-muted",
                    )}
                  />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge ? (
                    <span className="rounded-full border border-border bg-bg px-2 py-0.5 font-mono text-[11px] text-muted">
                      {item.badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>

          <div className="mt-4 hidden lg:mt-auto lg:block lg:pt-6">
            {payroll ? (
              <div className="rounded-[14px] border border-border bg-surface p-4">
                <div className="flex justify-between font-mono text-[11px] tracking-[0.12em] text-muted">
                  <span>{chrome.run ? `${chrome.run.month} RUN` : "PAYROLL RUN"}</span>
                  <span className={chrome.run?.status === "LOCKED" ? "text-warning" : "text-info"}>
                    {chrome.run?.status ?? "NONE"}
                  </span>
                </div>
                <p className="mt-2.5 text-[13px] leading-relaxed text-muted">
                  {chrome.run
                    ? chrome.run.status === "LOCKED"
                      ? "This month is locked. Unlock before changing attendance."
                      : "Attendance is open. Lock the month before recalculating."
                    : "No payroll run yet. Open Runs to start a month."}
                </p>
              </div>
            ) : (
              <div className="rounded-[14px] border border-border bg-surface p-4">
                <div className="flex justify-between font-mono text-[11px] tracking-[0.12em] text-muted">
                  <span>LEAD POOL</span>
                  {chrome.poolLow ? <span className="text-warning">LOW</span> : null}
                </div>
                <p className="mt-2.5 font-mono text-[26px] font-medium leading-none">
                  {chrome.newLeads}
                  <span className="text-base text-muted-2"> / {chrome.totalLeads}</span>
                </p>
                <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-border">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      chrome.poolLow ? "bg-warning" : "bg-primary",
                    )}
                    style={{ width: `${poolPct}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </nav>

        <main
          id="main-content"
          className="min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-9 lg:px-10 lg:pb-14"
          tabIndex={-1}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
