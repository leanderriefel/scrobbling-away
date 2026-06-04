export const MONTH_LABELS = Array.from({ length: 12 }, (_, month) =>
  new Intl.DateTimeFormat(undefined, { month: "short" }).format(new Date(2024, month, 1)),
);
