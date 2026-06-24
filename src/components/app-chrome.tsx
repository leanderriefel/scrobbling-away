import type { ReactNode } from "react";

export function AppChrome({ children }: { children: ReactNode }) {
  return <div className="flex min-h-svh flex-col bg-background">{children}</div>;
}
