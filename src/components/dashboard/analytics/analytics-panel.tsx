import type { ReactNode } from "react";

import { SectionTitle } from "../section-title";

export function AnalyticsPanel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-10 grid min-w-0 break-inside-avoid content-start gap-5">
      <SectionTitle description={description}>{title}</SectionTitle>
      {children}
    </div>
  );
}
