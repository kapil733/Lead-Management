"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { UserMenu } from "@/components/shared/user-menu";
import { SkipLink } from "@/components/shared/skip-link";
import { LogoMark } from "@/components/shared/logo-mark";
import { ThemeToggle } from "@/components/shared/theme-toggle";

export function EmployeeShell({
  children,
  user,
  hideNav = false,
}: {
  children: React.ReactNode;
  user: { name: string; email: string };
  casesToday?: number;
  hideNav?: boolean;
}) {
  const pathname = usePathname();
  const onHistory = pathname.startsWith("/app/completed");
  const onCase = pathname.startsWith("/app/case");
  const onDesk = pathname === "/app" || onCase;

  return (
    <div
      className={cn(
        "flex flex-col bg-bg text-text",
        onCase ? "h-dvh overflow-hidden" : "min-h-screen",
      )}
    >
      <SkipLink />
      {!hideNav ? (
        <header className="flex flex-wrap items-center gap-4 border-b border-border px-4 py-3 sm:px-6">
          <Link href="/app" className="flex items-center gap-2.5">
            <LogoMark className="size-[34px] rounded-[10px]" iconClassName="size-[18px]" />
            <span className="font-display text-[17px] font-bold tracking-tight">
              TechConnect
            </span>
          </Link>
          <nav
            className="flex gap-1 rounded-xl border border-border bg-surface p-1"
            aria-label="Primary"
          >
            <Link
              href="/app"
              aria-current={onDesk ? "page" : undefined}
              className={cn(
                "inline-flex min-h-9 items-center rounded-[9px] px-4 text-sm font-semibold",
                onDesk ? "bg-primary text-primary-fg" : "text-muted",
              )}
            >
              Desk
            </Link>
            <Link
              href="/app/completed"
              aria-current={onHistory ? "page" : undefined}
              className={cn(
                "inline-flex min-h-9 items-center rounded-[9px] px-4 text-sm font-semibold",
                onHistory ? "bg-primary text-primary-fg" : "text-muted",
              )}
            >
              History
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <ThemeToggle />
            <UserMenu
              name={user.name}
              email={user.email}
              profileHref="/app/profile"
            />
          </div>
        </header>
      ) : null}
      <main
        id="main-content"
        className={cn(
          "mx-auto w-full max-w-[1360px] flex-1 px-4 sm:px-6",
          onCase
            ? "flex min-h-0 max-w-none flex-col overflow-hidden py-3"
            : "py-6 pb-28",
        )}
        tabIndex={-1}
      >
        {children}
      </main>
    </div>
  );
}
