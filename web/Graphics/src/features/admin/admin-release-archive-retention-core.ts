export type AdminReleaseArchiveRetentionStatus = "ready" | "review" | "blocked";

export type AdminReleaseArchiveItemKind =
  | "approval"
  | "desktop-update"
  | "manifest"
  | "operator-rehearsal"
  | "package"
  | "privacy"
  | "rollback"
  | "smoke";

export type AdminReleaseArchiveItem = {
  id: string;
  kind: AdminReleaseArchiveItemKind;
  status: AdminReleaseArchiveRetentionStatus;
  label: string;
  releaseLabel: string;
  createdAt: string;
  retentionUntil: string;
  searchableText: string;
  summary: string;
  recommendation: string;
  artifactCount: number;
  sourceId: string;
};

export type AdminReleaseArchivePackage = {
  id: string;
  status: AdminReleaseArchiveRetentionStatus;
  label: string;
  releaseLabel: string;
  createdAt: string;
  retentionUntil: string;
  score: number;
  itemCount: number;
  searchableText: string;
  items: AdminReleaseArchiveItem[];
};

export type AdminReleaseArchiveRetentionReport = {
  generatedAt: string;
  status: AdminReleaseArchiveRetentionStatus;
  score: number;
  retentionDays: number;
  packageCount: number;
  itemCount: number;
  approvalCount: number;
  smokeCount: number;
  privacyCount: number;
  rollbackCount: number;
  manifestCount: number;
  readyCount: number;
  reviewCount: number;
  blockedCount: number;
  expiredCount: number;
  searchableCount: number;
  packages: AdminReleaseArchivePackage[];
  items: AdminReleaseArchiveItem[];
  commands: string[];
};

export function createArchiveItem(input: AdminReleaseArchiveItem) {
  return input;
}

export function createArchivePackage({
  id,
  items,
  label,
  releaseLabel,
}: {
  id: string;
  items: AdminReleaseArchiveItem[];
  label: string;
  releaseLabel: string;
}): AdminReleaseArchivePackage {
  const createdAt = getLatestDate(items.map((item) => item.createdAt));
  const retentionUntil = getLatestDate(items.map((item) => item.retentionUntil));
  const status = getRowsStatus(items.map((item) => item.status));

  return {
    id,
    status,
    label,
    releaseLabel,
    createdAt,
    retentionUntil,
    score: getRowsScore(items),
    itemCount: items.length,
    searchableText: items.map((item) => item.searchableText).join(" "),
    items,
  };
}

export function getRowsStatus(
  statuses: AdminReleaseArchiveRetentionStatus[],
): AdminReleaseArchiveRetentionStatus {
  if (statuses.includes("blocked")) {
    return "blocked";
  }

  return statuses.includes("review") ? "review" : "ready";
}

export function getRowsScore(
  rows: Array<{ status: AdminReleaseArchiveRetentionStatus }>,
) {
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;

  return Math.max(0, 100 - blockedCount * 18 - reviewCount * 6);
}

export function addDays(value: string, days: number) {
  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return new Date().toISOString();
  }

  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString();
}

export function isExpired(value: string, now: number) {
  const time = new Date(value).getTime();

  return Number.isFinite(time) && time <= now;
}

export function searchable(...parts: Array<number | string | null | undefined>) {
  return parts
    .filter((part) => part !== null && part !== undefined)
    .map(String)
    .join(" ")
    .toLowerCase();
}

export function uniqueStrings(items: string[]) {
  return Array.from(new Set(items.filter(Boolean)));
}

function getLatestDate(values: string[]) {
  return values
    .filter(Boolean)
    .sort((left, right) => toTime(right) - toTime(left))[0] ?? new Date().toISOString();
}

function toTime(value: string) {
  const time = new Date(value).getTime();

  return Number.isFinite(time) ? time : 0;
}
