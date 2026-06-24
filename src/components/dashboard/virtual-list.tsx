import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export function VirtualList<TItem>({
  className,
  emptyMessage = "Nothing here yet",
  estimateSize = 53,
  getItemKey,
  height = "24rem",
  items,
  overscan = 8,
  renderItem,
}: {
  className?: string;
  emptyMessage?: string;
  estimateSize?: number;
  getItemKey?: (item: TItem, index: number) => string | number;
  height?: string;
  items: TItem[];
  overscan?: number;
  renderItem: (item: TItem, index: number) => ReactNode;
}) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    getItemKey: (index) => {
      const item = items[index];

      return item && getItemKey ? getItemKey(item, index) : index;
    },
    overscan,
  });

  if (items.length === 0) {
    return <div className="py-10 text-center text-sm text-muted-foreground">{emptyMessage}</div>;
  }

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div
      ref={parentRef}
      className={cn(
        "scrollbar-thin overflow-y-auto rounded-lg outline-none focus-visible:ring-1 focus-visible:ring-ring/40",
        className,
      )}
      style={{ height }}
      tabIndex={0}
    >
      <div
        className="relative pr-2"
        style={{
          height: `${virtualizer.getTotalSize()}px`,
        }}
      >
        {virtualItems.map((virtualItem) => {
          const item = items[virtualItem.index];

          if (!item) return null;

          return (
            <div
              key={virtualItem.key}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              className="absolute left-0 top-0 w-full"
              style={{
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              {renderItem(item, virtualItem.index)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
