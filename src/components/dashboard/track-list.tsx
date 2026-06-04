import { Music2Icon } from "lucide-react";

import { formatCompact } from "@/utils/format";

import { VirtualList } from "./virtual-list";

export type TrackListItem = {
  id: string;
  rank?: number;
  label: string;
  detail?: string;
  count: number;
  imageUrl?: string;
  href?: string;
};

export function TrackList({
  items,
  emptyMessage = "Nothing here yet",
  height = "24rem",
}: {
  items: TrackListItem[];
  emptyMessage?: string;
  height?: string;
}) {
  if (items.length === 0) {
    return <div className="py-10 text-center text-sm text-muted-foreground">{emptyMessage}</div>;
  }

  return (
    <VirtualList
      emptyMessage={emptyMessage}
      height={height}
      items={items}
      renderItem={(item) => <TrackRow item={item} />}
    />
  );
}

function TrackRow({ item }: { item: TrackListItem }) {
  const content = (
    <>
      <span className="w-5 shrink-0 text-right font-mono text-[11px] tabular-nums text-muted-foreground/30">
        {item.rank ?? ""}
      </span>
      {item.imageUrl ? (
        <img
          src={item.imageUrl}
          alt=""
          className="size-9 shrink-0 rounded object-cover"
          loading="lazy"
        />
      ) : (
        <span className="grid size-9 shrink-0 place-items-center rounded bg-muted/60">
          <Music2Icon className="size-3.5 text-muted-foreground/50" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] leading-tight">{item.label}</span>
        {item.detail && (
          <span className="block truncate text-[11px] leading-tight text-muted-foreground">
            {item.detail}
          </span>
        )}
      </span>
      <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground/60">
        {formatCompact(item.count)}
      </span>
    </>
  );

  const className =
    "flex min-w-0 items-center gap-3 rounded-sm px-2 py-2 transition-colors duration-150 hover:bg-accent/60";

  if (item.href) {
    return (
      <a href={item.href} className={className}>
        {content}
      </a>
    );
  }

  return <div className={className}>{content}</div>;
}
