import { createFileRoute, Outlet } from "@tanstack/react-router";

import { DocsLayout } from "@/docs/components/docs-layout";

export const Route = createFileRoute("/docs")({
  component: DocsRoute,
  ssr: false,
});

function DocsRoute() {
  return (
    <div className="relative flex flex-1 flex-col bg-background">
      <DocsLayout>
        <Outlet />
      </DocsLayout>
    </div>
  );
}
