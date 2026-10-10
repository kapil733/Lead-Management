"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { reopenReconnectAction } from "@/server/cases/actions";

export function OpenReconnectButton({
  caseId,
  label = "Open",
  className,
}: {
  caseId: string;
  label?: string;
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      className={className ?? "min-h-11"}
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const result = await reopenReconnectAction(caseId);
          if (!result.ok) {
            toast.error(result.error.message);
            return;
          }
          router.push("/app/case");
          router.refresh();
        });
      }}
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      {label}
    </Button>
  );
}
