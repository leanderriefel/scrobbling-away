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

const getTrackItemKey = (item: TrackListItem) => item.id;

export function TrackList({
  items,
  emptyMessage = "Nothing here yet",
  height = "24rem",
  onItemClick,
}: {
  items: TrackListItem[];
  emptyMessage?: string;
  height?: string;
  onItemClick?: (item: TrackListItem) => void;
}) {
  if (items.length === 0) {
    return <div className="py-10 text-center text-sm text-muted-foreground">{emptyMessage}</div>;
  }

  return (
    <VirtualList
      emptyMessage={emptyMessage}
      getItemKey={getTrackItemKey}
      height={height}
      items={items}
      renderItem={(item) => <TrackRow item={item} onItemClick={onItemClick} />}
    />
  );
}

function TrackRow({
  item,
  onItemClick,
}: {
  item: TrackListItem;
  onItemClick?: (item: TrackListItem) => void;
}) {
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
    "group relative flex min-w-0 items-center gap-3 rounded-sm px-2 py-2 transition-all duration-300 ease-out hover:bg-accent/40 before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[2px] before:rounded-full before:bg-primary before:opacity-0 before:transition-all before:duration-300 hover:before:opacity-100 hover:pl-3";

  if (onItemClick) {
    return (
      <button
        type="button"
        className={`${className} w-full cursor-pointer text-left`}
        onClick={() => onItemClick(item)}
      >
        {content}
      </button>
    );
  }

  if (item.href) {
    return (
      <a href={item.href} className={className}>
        {content}
      </a>
    );
  }

  return <div className={className}>{content}</div>;
}
