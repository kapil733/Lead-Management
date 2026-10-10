"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

type Theme = "dark" | "light";

function subscribe(onStoreChange: () => void) {
  window.addEventListener("tc-theme", onStoreChange);
  return () => window.removeEventListener("tc-theme", onStoreChange);
}

function snapshot(): Theme {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, snapshot, () => "dark" as Theme);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    document.documentElement.style.colorScheme = next;
    try {
      window.localStorage.setItem("tc-theme", next);
    } catch {
      /* storage unavailable */
    }
    window.dispatchEvent(new Event("tc-theme"));
  }

  const label =
    theme === "light" ? "Switch to dark theme" : "Switch to light theme";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="flex size-10 items-center justify-center rounded-full border border-border-strong bg-surface text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-text"
    >
      {theme === "light" ? (
        <Moon className="size-[18px]" aria-hidden />
      ) : (
        <Sun className="size-[18px]" aria-hidden />
      )}
    </button>
  );
}
