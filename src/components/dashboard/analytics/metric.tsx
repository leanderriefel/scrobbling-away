import { HelpTooltip } from "../help-tooltip";

export function Metric({ label, value, help }: { label: string; value: string; help: string }) {
  return (
    <div className="min-w-0">
      <div className="truncate font-mono text-[17px] tabular-nums tracking-tight text-foreground">
        {value}
      </div>
      <div className="mt-1.5 flex min-w-0 items-center gap-1.5 text-[11px] font-medium tracking-wide text-muted-foreground/80">
        <span className="truncate">{label}</span>
        <HelpTooltip>{help}</HelpTooltip>
      </div>
    </div>
  );
}
