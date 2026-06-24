import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function DashboardSection({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn("border-t border-border/50 pt-12 first:border-t-0 first:pt-0", className)}
    >
      {children}
    </section>
  );
}
