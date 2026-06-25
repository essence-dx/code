import type {
  CampaignLaunchRoom,
  CampaignLaunchRoomStatus,
} from "@/features/campaigns/campaign-launch-rooms-types";

export function scoreToLaunchStatus(
  score: number,
  hasBlockedSignal = false,
): CampaignLaunchRoomStatus {
  if (hasBlockedSignal || score < 50) return "blocked";
  if (score < 85) return "review";

  return "ready";
}

export function average(values: number[], fallback = 100) {
  if (!values.length) return fallback;

  return Math.round(
    values.reduce((total, value) => total + value, 0) / values.length,
  );
}

export function ratioScore(value: number, total: number, emptyScore = 0) {
  if (!total) return emptyScore;

  return Math.round((value / total) * 100);
}

export function statusWeight(status: CampaignLaunchRoomStatus) {
  if (status === "blocked") return 0;
  if (status === "review") return 1;

  return 2;
}

export function addDays(isoDate: string, days: number) {
  const date = new Date(isoDate);

  if (Number.isNaN(date.getTime())) return null;

  date.setDate(date.getDate() + days);

  return date.toISOString();
}

export function sortLaunchRooms(
  left: CampaignLaunchRoom,
  right: CampaignLaunchRoom,
) {
  return (
    statusWeight(left.status) - statusWeight(right.status) ||
    left.score - right.score ||
    compareNullableDates(left.launchAt, right.launchAt) ||
    left.campaignName.localeCompare(right.campaignName)
  );
}

export function compareNullableDates(
  left: string | null,
  right: string | null,
) {
  if (!left && !right) return 0;
  if (!left) return -1;
  if (!right) return 1;

  return Date.parse(left) - Date.parse(right);
}

export function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  );
}
