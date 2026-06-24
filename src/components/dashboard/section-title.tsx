import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { HelpTooltip } from "./help-tooltip";

export function SectionTitle({
  children,
  action,
  className,
  description,
  variant = "section",
}: {
  children: ReactNode;
  action?: ReactNode;
  className?: string;
  description?: ReactNode;
  variant?: "section" | "subsection";
}) {
  const isSection = variant === "section";

  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3",
        isSection ? "mb-5" : "mb-3",
        className,
      )}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <h2
            className={cn(
              "font-medium tracking-[-0.01em]",
              isSection ? "text-[14px] text-foreground" : "text-[13px] text-foreground/90",
            )}
          >
            {children}
          </h2>
          {description && !isSection && <HelpTooltip>{description}</HelpTooltip>}
        </div>
        {description && isSection && (
          <p className="mt-1 max-w-xl text-[12px] leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
