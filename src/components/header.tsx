import { Link } from "@tanstack/react-router";

export default function Header() {
  return (
    <header className="relative">
      <div className="mx-auto flex max-w-[960px] items-center px-5 py-3">
        <Link
          to="/"
          className="text-[13px] font-semibold tracking-tight text-foreground/70 transition-colors hover:text-foreground"
        >
          Scrobbling Away
        </Link>
      </div>
      <div className="h-px bg-border" />
    </header>
  );
}
