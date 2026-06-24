import { cn } from "@/lib/utils";

export function Legend({ items }: { items: Array<{ label: string; className: string }> }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5">
          <span className={cn("size-2 rounded-md", item.className)} />
          {item.label}
        </span>
      ))}
    </div>
  );
}
