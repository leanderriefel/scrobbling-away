import { LoaderCircleIcon, SquareIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatBytes, formatNumber } from "@/utils/format";

export function ScrobbleExportBar({
  rowsWritten,
  bytesWritten,
  onCancel,
}: {
  rowsWritten: number;
  bytesWritten: number;
  onCancel: () => void;
}) {
  return (
    <div className="grid gap-2 rounded-lg border border-border/60 px-3 py-2.5">
      <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
        <LoaderCircleIcon className="size-3 animate-spin" />
        <span>Exporting scrobbles…</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="ml-auto h-6 px-2 text-[11px]"
          onClick={onCancel}
        >
          <SquareIcon className="size-3" />
          Cancel
        </Button>
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground/70">
        <span>Rows written: {formatNumber(rowsWritten)}</span>
        <span>File size: {formatBytes(bytesWritten)}</span>
      </div>
    </div>
  );
}
