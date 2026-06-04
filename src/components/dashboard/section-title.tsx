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
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-1.5">
        <h2 className="text-sm font-semibold tracking-tight text-foreground/70">{children}</h2>
        {description && <HelpTooltip>{description}</HelpTooltip>}
      </div>
      {action}
    </div>
  );
}
