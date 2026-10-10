"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export function RouteError({
  error,
  reset,
  title = "Something went wrong",
}: {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
}) {
  useEffect(() => {
    // Avoid logging PII; digest is enough for support.
    console.error("Route error", error.digest ?? error.message);
  }, [error]);

  return (
    <div
      role="alert"
      className="mx-auto flex max-w-lg flex-col items-start gap-4 px-6 py-16"
    >
      <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
      <p className="text-sm text-muted">
        An unexpected error occurred. You can try again, or go back and continue
        from another page.
      </p>
      {error.digest ? (
        <p className="text-xs text-muted tabular">Ref: {error.digest}</p>
      ) : null}
      <Button type="button" onClick={() => reset()}>
        Try again
      </Button>
    </div>
  );
}
