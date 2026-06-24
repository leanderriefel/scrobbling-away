import type { ReactNode } from "react";

import { HelpTooltip } from "./help-tooltip";

export function SectionTitle({
  children,
  action,
  description,
}: {
  children: ReactNode;
  action?: ReactNode;
  description?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5 pb-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-1.5">
          <h2 className="text-xs font-semibold text-foreground/70">{children}</h2>
          {description && <HelpTooltip>{description}</HelpTooltip>}
        </div>
        {action}
      </div>
      <div className="h-[2px] w-8 rounded-full bg-gradient-to-r from-primary/60 to-transparent" />
    </div>
  );
}
