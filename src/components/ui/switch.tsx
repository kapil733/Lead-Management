"use client";

import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer inline-flex h-[22px] w-[38px] shrink-0 cursor-pointer items-center rounded-full border-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-text disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-border-strong",
      className,
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block size-4 rounded-full transition-transform data-[state=checked]:translate-x-[18px] data-[state=checked]:bg-primary-fg data-[state=unchecked]:translate-x-[3px] data-[state=unchecked]:bg-muted",
      )}
    />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
