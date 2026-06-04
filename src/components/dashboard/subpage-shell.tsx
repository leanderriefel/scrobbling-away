import { ArrowLeftIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";

type SubpageShellProps = {
  children: ReactNode;
  onBack: () => void;
  title?: string;
};

export const SubpageShell = ({ children, onBack, title }: SubpageShellProps) => (
  <div className="fixed inset-0 z-50 flex flex-col bg-background/55 p-2 backdrop-blur-[3px] sm:p-3">
    <div className="animate-subpage-in motion-reduce:animate-none flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
      <header className="flex shrink-0 items-center gap-3 border-b border-border px-3 py-2.5 sm:px-4">
        <Button
          aria-label="Go back"
          className="shrink-0"
          size="icon-sm"
          type="button"
          variant="ghost"
          onClick={onBack}
        >
          <ArrowLeftIcon className="size-4" />
        </Button>
        {title ? <h2 className="min-w-0 truncate text-sm font-medium">{title}</h2> : null}
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">{children}</div>
    </div>
  </div>
);
