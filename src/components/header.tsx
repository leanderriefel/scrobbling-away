import { Link } from "@tanstack/react-router";

export default function Header() {
  return (
    <header className="relative">
      <div className="mx-auto flex max-w-[960px] items-center px-5 py-4">
        <Link
          to="/"
          className="text-sm font-medium text-foreground/70 transition-colors hover:text-foreground"
        >
          Scrobbling Away
        </Link>
      </div>
      <div className="dither-border" />
    </header>
  );
}
