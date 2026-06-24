import { createFileRoute, notFound } from "@tanstack/react-router";

import { getDocsPage } from "@/docs/nav";
import { docsPageComponents } from "@/docs/pages";

export const Route = createFileRoute("/docs/$slug")({
  component: DocsSlugPage,
  ssr: false,
  loader: ({ params }) => {
    const page = getDocsPage(params.slug);

    if (!page) {
      throw notFound();
    }

    return page;
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData
          ? `${loaderData.title} — Docs — Scrobbling Away`
          : "Docs — Scrobbling Away",
      },
      {
        name: "description",
        content: loaderData?.description ?? "Analytics documentation for Scrobbling Away.",
      },
    ],
  }),
});

function DocsSlugPage() {
  const page = Route.useLoaderData();
  const PageComponent = docsPageComponents[page.slug];

  if (!PageComponent) {
    throw notFound();
  }

  return <PageComponent />;
}
