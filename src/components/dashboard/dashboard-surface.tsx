import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type DashboardSurfaceProps = {
  children: ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg";
  variant?: "default" | "subtle" | "inset";
};

const paddingClass = {
  none: "",
  sm: "p-4",
  md: "p-5 sm:p-6",
  lg: "p-6 sm:p-8",
} as const;

export function DashboardSurface({
  children,
  className,
  padding = "md",
  variant = "default",
}: DashboardSurfaceProps) {
  return (
    <div
      className={cn(
        "dashboard-surface",
        variant === "subtle" && "dashboard-surface-subtle",
        variant === "inset" && "dashboard-surface-inset",
        paddingClass[padding],
        className,
      )}
    >
      {children}
    </div>
  );
}

export function DashboardChip({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-border/50 bg-background/50 px-2.5 py-1 font-mono text-[11px] tabular-nums text-muted-foreground shadow-[inset_0_1px_0_color-mix(in_srgb,var(--foreground)_4%,transparent)]",
        className,
      )}
    >
      {children}
    </span>
  );
}
