import * as React from "react";
import { cn } from "@/lib/utils";

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-lg border border-border bg-card text-card-foreground shadow-xl shadow-black/5 dark:shadow-black/20",
        className
      )}
      {...props}
    />
  )
);
Card.displayName = "Card";
