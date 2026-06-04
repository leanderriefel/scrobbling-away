import { createFileRoute } from "@tanstack/react-router";

import { StatsWorkspace } from "@/components/dashboard/stats-workspace";

export const Route = createFileRoute("/")({
  component: HomeComponent,
  ssr: false,
});

function HomeComponent() {
  return <StatsWorkspace />;
}
