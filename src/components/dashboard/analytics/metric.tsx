import { HelpTooltip } from "../help-tooltip";

export function Metric({ label, value, help }: { label: string; value: string; help: string }) {
  return (
    <div className="min-w-0">
      <div className="truncate font-mono text-xl font-semibold tabular-nums tracking-tight metallic-text">
        {value}
      </div>
      <div className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
        <span className="truncate">{label}</span>
        <HelpTooltip>{help}</HelpTooltip>
      </div>
    </div>
  );
}
