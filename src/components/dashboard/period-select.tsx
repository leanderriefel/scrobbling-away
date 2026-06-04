import { LASTFM_PERIODS, type LastFmPeriod } from "@/lib/lastfm-stats-cache";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const periodLabels: Record<LastFmPeriod, string> = {
  "12month": "12 months",
  "1month": "1 month",
  "3month": "3 months",
  "6month": "6 months",
  "7day": "7 days",
  overall: "All time",
};

export const PeriodSelect = ({
  onValueChange,
  value,
}: {
  onValueChange: (period: LastFmPeriod) => void;
  value: LastFmPeriod;
}) => (
  <Select value={value} onValueChange={(next) => onValueChange(next as LastFmPeriod)}>
    <SelectTrigger size="sm">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectGroup>
        {LASTFM_PERIODS.map((period) => (
          <SelectItem key={period} value={period}>
            {periodLabels[period]}
          </SelectItem>
        ))}
      </SelectGroup>
    </SelectContent>
  </Select>
);
