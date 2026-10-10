"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { claimNextCaseAction } from "@/server/cases/actions";

export function HomeClaimButton({
  hasOpenCase,
  disabled,
  disabledReason,
}: {
  hasOpenCase: boolean;
  disabled: boolean;
  disabledReason: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <div className="mt-3 space-y-2 text-center">
      <Button
        type="button"
        size="lg"
        className="h-[62px] min-h-14 rounded-2xl px-8 text-lg"
        disabled={disabled || isPending}
        onClick={() => {
          if (hasOpenCase) {
            router.push("/app/case");
            return;
          }
          startTransition(async () => {
            const result = await claimNextCaseAction();
            if (!result.ok) {
              toast.error(result.error.message);
              router.refresh();
              return;
            }
            router.push("/app/case");
            router.refresh();
          });
        }}
      >
        {isPending ? (
          <Loader2 className="size-5 animate-spin" />
        ) : null}
        {hasOpenCase ? "Resume case" : "Get next lead"}
        {isPending ? null : <ArrowRight className="size-5" />}
      </Button>
      {disabled && disabledReason ? (
        <p className="text-sm text-muted">{disabledReason}</p>
      ) : null}
    </div>
  );
}
