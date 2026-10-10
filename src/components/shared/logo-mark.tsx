import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export function LogoMark({
  className,
  iconClassName,
}: {
  className?: string;
  iconClassName?: string;
}) {
  return (
    <div
      className={cn(
        "flex size-[38px] items-center justify-center rounded-[11px] bg-primary text-primary-fg",
        className,
      )}
    >
      <Zap className={cn("size-5", iconClassName)} aria-hidden />
    </div>
  );
}
