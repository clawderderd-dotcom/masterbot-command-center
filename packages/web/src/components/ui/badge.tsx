import * as React from "react";
import { cn } from "../../lib/utils";

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        "border-slate-200 bg-slate-50 text-slate-700",
        "dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200",
        className,
      )}
      {...props}
    />
  );
}
