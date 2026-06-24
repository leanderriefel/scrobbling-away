import { Link, useRouterState } from "@tanstack/react-router";

export default function Header() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const onDocs = pathname.startsWith("/docs");

  return (
    <header className="border-b border-border/40">
      <div className="mx-auto flex max-w-[960px] items-center justify-between gap-4 px-5 py-3.5">
        <div className="flex items-center gap-2 text-[13px]">
          <Link
            to="/"
            className="font-medium text-foreground/80 transition-colors hover:text-foreground"
          >
            Scrobbling Away
          </Link>
          {onDocs && (
            <>
              <span className="text-muted-foreground/40">/</span>
              <span className="font-medium text-foreground">Docs</span>
            </>
          )}
        </div>
        {!onDocs && (
          <nav>
            <Link
              to="/docs/$slug"
              params={{ slug: "overview" }}
              className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
            >
              Docs
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
