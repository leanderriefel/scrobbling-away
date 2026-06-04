import { HelpTooltip } from "../help-tooltip";

export function MiniLabel({ label, help }: { label: string; help: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span>{label}</span>
      <HelpTooltip>{help}</HelpTooltip>
    </div>
  );
}
