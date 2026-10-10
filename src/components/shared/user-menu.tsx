"use client";

import { signOut } from "next-auth/react";
import { LogOut, User } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function UserMenu({
  name,
  email,
  profileHref,
}: {
  name: string;
  email: string;
  profileHref?: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex min-h-11 items-center gap-3 rounded-full px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-text"
        aria-label="User menu"
      >
        <span className="hidden text-right text-sm sm:block">
          <span className="block font-semibold text-text">{name}</span>
          <span className="block font-mono text-xs text-muted">{email}</span>
        </span>
        <Avatar className="size-10 border border-border-strong">
          <AvatarFallback>{initials(name) || "?"}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {profileHref ? (
          <DropdownMenuItem asChild>
            <Link href={profileHref} className="flex items-center gap-2">
              <User className="size-4" />
              Profile
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem
          onSelect={() => {
            void signOut({ callbackUrl: "/login" });
          }}
          className="text-danger focus:text-danger"
        >
          <LogOut className="size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
