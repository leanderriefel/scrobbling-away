const numberFormatter = new Intl.NumberFormat();
const compactFormatter = new Intl.NumberFormat(undefined, {
  compactDisplay: "short",
  maximumFractionDigits: 1,
  notation: "compact",
});
const percentFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 1,
  style: "percent",
});

export const formatNumber = (value: number) => numberFormatter.format(value);

export const formatCompact = (value: number) => compactFormatter.format(value);

export const formatPercent = (value: number) =>
  percentFormatter.format(Number.isFinite(value) ? value : 0);

export const formatDateTime = (timestamp: number) =>
  new Date(timestamp * 1000).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

export const formatRelativeTime = (isoDate: string) =>
  formatDuration(Date.now() - new Date(isoDate).getTime());

export const formatTimeAgo = (unixSeconds: number) =>
  formatDuration(Date.now() - unixSeconds * 1000);

export const formatBytes = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

const formatDuration = (diffMs: number) => {
  const minutes = Math.max(0, Math.round(diffMs / 60_000));

  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.round(minutes / 60);

  if (hours < 24) return `${hours}h ago`;

  return `${Math.round(hours / 24)}d ago`;
};
