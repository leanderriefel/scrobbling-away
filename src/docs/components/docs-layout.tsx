import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { docsSections } from "@/docs/nav";

export function DocsLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const activeSlug = pathname.replace(/^\/docs\/?/, "") || "overview";

  return (
    <div className="min-h-full bg-background">
      <div className="mx-auto flex w-full max-w-[1100px]">
        <aside className="hidden w-[220px] shrink-0 border-r border-border/50 md:block">
          <nav className="sticky top-0 max-h-svh overflow-y-auto px-5 py-10 scrollbar-thin">
            {docsSections.map((section) => (
              <div key={section.title} className="mb-8 last:mb-0">
                <p className="mb-2 text-[11px] text-muted-foreground/70">{section.title}</p>
                <ul className="grid gap-0.5">
                  {section.items.map((item) => {
                    const isActive = activeSlug === item.slug;

                    return (
                      <li key={item.slug}>
                        <Link
                          to="/docs/$slug"
                          params={{ slug: item.slug }}
                          className={`block py-1 text-[13px] leading-5 transition-colors ${
                            isActive
                              ? "font-medium text-foreground"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {item.title}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="border-b border-border/50 px-6 py-3 md:hidden">
            <label className="sr-only" htmlFor="docs-mobile-nav">
              Page
            </label>
            <select
              id="docs-mobile-nav"
              className="w-full appearance-none bg-transparent text-[13px] text-foreground outline-none"
              value={activeSlug}
              onChange={(event) => {
                void navigate({ to: "/docs/$slug", params: { slug: event.target.value } });
              }}
            >
              {docsSections.flatMap((section) =>
                section.items.map((item) => (
                  <option key={item.slug} value={item.slug}>
                    {item.title}
                  </option>
                )),
              )}
            </select>
          </div>

          <article className="px-6 py-10 md:px-12 md:py-14">
            <div className="mx-auto max-w-[40rem]">{children}</div>
          </article>
        </div>
      </div>
    </div>
  );
}

export function DocsPageHeader({ title, description }: { title: string; description: string }) {
  return (
    <header className="mb-12">
      <h1 className="text-[22px] font-medium tracking-[-0.02em] text-foreground">{title}</h1>
      <p className="mt-3 text-[14px] leading-[1.6] text-muted-foreground">{description}</p>
    </header>
  );
}
