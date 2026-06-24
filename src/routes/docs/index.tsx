import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/docs/")({
  component: DocsIndex,
  ssr: false,
});

function DocsIndex() {
  return <Navigate to="/docs/$slug" params={{ slug: "overview" }} replace />;
}
