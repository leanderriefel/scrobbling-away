export const decimalFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });

export const oneDecimalFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 1,
});

export const formatMinutes = (minutes: number) => {
  if (minutes < 60) return `${Math.round(minutes)}m`;

  return `${oneDecimalFormatter.format(minutes / 60)}h`;
};
