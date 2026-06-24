export const decimalFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });

export const oneDecimalFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 1,
});

export const formatMinutes = (minutes: number) => {
  if (minutes < 60) return `${Math.round(minutes)}m`;

  return `${oneDecimalFormatter.format(minutes / 60)}h`;
};

export const formatReplayGap = (gapDays: number) => {
  if (!Number.isFinite(gapDays) || gapDays < 0) return "—";

  const minutes = gapDays * 24 * 60;

  if (minutes < 90) return `~${Math.max(1, Math.round(minutes))}m`;

  const hours = gapDays * 24;

  if (hours < 36) return `~${Math.round(hours)}h`;

  if (gapDays < 14) return `~${Math.round(gapDays)}d`;

  return `~${oneDecimalFormatter.format(gapDays)}d`;
};
