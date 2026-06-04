import { MONTH_LABELS } from "@/utils/calendar-labels";

const ANALYTICS_MONTH_FORMAT = new Intl.DateTimeFormat(undefined, {
  month: "short",
  year: "numeric",
});

export const resolveTimelineStart = (
  registeredAt?: number,
  firstScrobbleAt?: number,
): number | undefined => {
  if (registeredAt !== undefined && registeredAt > 0) {
    return registeredAt;
  }

  return firstScrobbleAt;
};

export const monthKeyFromTimestamp = (timestamp: number) => {
  const date = new Date(timestamp * 1000);

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

export const monthRangeKeys = (
  startTimestamp: number,
  endTimestamp = Math.floor(Date.now() / 1000),
) => {
  const start = new Date(startTimestamp * 1000);
  const end = new Date(endTimestamp * 1000);
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);
  const keys: string[] = [];

  while (cursor <= endMonth) {
    keys.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`);
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return keys;
};

export const yearRangeKeys = (
  startTimestamp: number,
  endTimestamp = Math.floor(Date.now() / 1000),
) => {
  const startYear = new Date(startTimestamp * 1000).getFullYear();
  const endYear = new Date(endTimestamp * 1000).getFullYear();

  return Array.from({ length: endYear - startYear + 1 }, (_, index) => String(startYear + index));
};

export const formatMonthKeyShort = (yearMonth: string) => {
  const [year = "", month = ""] = yearMonth.split("-");
  const monthIndex = Number(month) - 1;
  const shortMonth = MONTH_LABELS[monthIndex]?.slice(0, 3) ?? month;

  return `${shortMonth} '${year.slice(-2)}'`;
};

export const formatMonthKeyLong = (yearMonth: string) => {
  const [year = "", month = ""] = yearMonth.split("-");
  const monthIndex = Number(month) - 1;
  const monthName = MONTH_LABELS[monthIndex] ?? month;

  return `${monthName} ${year}`;
};

export const formatMonthKeyAnalytics = (yearMonth: string) => {
  const [year = "", month = ""] = yearMonth.split("-");
  const monthIndex = Number(month) - 1;

  return ANALYTICS_MONTH_FORMAT.format(new Date(Number(year), monthIndex, 1));
};

export const fillYearlyBuckets = (
  countsByYear: Map<string, number>,
  startTimestamp: number,
): Array<{ label: string; count: number }> =>
  yearRangeKeys(startTimestamp).map((label) => ({
    label,
    count: countsByYear.get(label) ?? 0,
  }));
