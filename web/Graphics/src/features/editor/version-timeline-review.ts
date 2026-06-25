import { getVersionCompareReview } from "@/features/editor/version-compare-review";
import type { DesignDocument } from "@/features/editor/types";
import type { DesignFileVersionSummary } from "@/features/files/actions";

export type VersionTimelineReviewStatus = "ready" | "review" | "blocked";

export type VersionTimelineReviewKind =
  | "checkpoint"
  | "duplicate"
  | "merge"
  | "restore"
  | "stale"
  | "volume";

export type VersionTimelineReviewRow = {
  id: string;
  status: VersionTimelineReviewStatus;
  kind: VersionTimelineReviewKind;
  versionId?: string;
  versionName?: string;
  label: string;
  detail: string;
  changeCount: number;
  createdAt?: string;
};

export type VersionTimelineReviewReport = {
  score: number;
  versionCount: number;
  highRiskCount: number;
  mediumRiskCount: number;
  duplicateNameCount: number;
  staleVersionCount: number;
  noRecentCheckpoint: boolean;
  blockedCount: number;
  reviewCount: number;
  readyCount: number;
  latestVersionAt: string | null;
  rows: VersionTimelineReviewRow[];
};

const recentCheckpointWindowMs = 7 * 24 * 60 * 60 * 1000;
const staleVersionWindowMs = 30 * 24 * 60 * 60 * 1000;
const versionVolumeReviewCount = 20;

export function getVersionTimelineReview({
  currentDocument,
  now = Date.now(),
  versions,
}: {
  currentDocument: DesignDocument;
  now?: number;
  versions: DesignFileVersionSummary[];
}): VersionTimelineReviewReport {
  const sortedVersions = [...versions].sort(
    (first, second) =>
      getTime(second.createdAt) - getTime(first.createdAt),
  );
  const rows: VersionTimelineReviewRow[] = [];
  const compareRows = sortedVersions.map((version) => ({
    version,
    review: getVersionCompareReview(currentDocument, version.document),
  }));
  const highRiskVersions = compareRows.filter(
    (item) => item.review.risk === "high",
  );
  const mediumRiskVersions = compareRows.filter(
    (item) => item.review.risk === "medium",
  );
  const staleVersions = sortedVersions.filter(
    (version) => now - getTime(version.createdAt) >= staleVersionWindowMs,
  );
  const duplicateNameGroups = getDuplicateNameGroups(sortedVersions);
  const latestVersion = sortedVersions[0];
  const noRecentCheckpoint = latestVersion
    ? now - getTime(latestVersion.createdAt) >= recentCheckpointWindowMs
    : true;

  for (const { version, review } of highRiskVersions.slice(0, 8)) {
    rows.push({
      id: `high-risk-${version.id}`,
      status: "blocked",
      kind: review.removedCount > 0 ? "restore" : "merge",
      versionId: version.id,
      versionName: version.name,
      label: "High-risk version action",
      detail: review.summary,
      changeCount: review.totalChangeCount,
      createdAt: version.createdAt,
    });
  }

  for (const { version, review } of mediumRiskVersions.slice(0, 8)) {
    rows.push({
      id: `medium-risk-${version.id}`,
      status: "review",
      kind: "merge",
      versionId: version.id,
      versionName: version.name,
      label: "Version needs review",
      detail: review.summary,
      changeCount: review.totalChangeCount,
      createdAt: version.createdAt,
    });
  }

  if (noRecentCheckpoint) {
    rows.push({
      id: "no-recent-checkpoint",
      status: versions.length > 0 ? "review" : "blocked",
      kind: "checkpoint",
      label: "No recent named version",
      detail:
        versions.length > 0
          ? `Latest checkpoint is ${formatAge(now - getTime(latestVersion?.createdAt))} old.`
          : "Save a named version before risky merge, restore, import, or library work.",
      changeCount: 0,
      createdAt: latestVersion?.createdAt,
    });
  }

  for (const group of duplicateNameGroups) {
    rows.push({
      id: `duplicate-${normalizeName(group.name)}`,
      status: "review",
      kind: "duplicate",
      label: "Duplicate version name",
      detail: `${group.name} is used by ${group.versions.length} named versions.`,
      changeCount: group.versions.length,
      createdAt: group.versions[0]?.createdAt,
    });
  }

  for (const version of staleVersions.slice(0, 6)) {
    rows.push({
      id: `stale-${version.id}`,
      status: "review",
      kind: "stale",
      versionId: version.id,
      versionName: version.name,
      label: "Stale checkpoint",
      detail: `${version.name} is ${formatAge(now - getTime(version.createdAt))} old.`,
      changeCount: 0,
      createdAt: version.createdAt,
    });
  }

  if (versions.length > versionVolumeReviewCount) {
    rows.push({
      id: "version-volume",
      status: "review",
      kind: "volume",
      label: "Large version timeline",
      detail: `${versions.length} named versions should be pruned or labeled before handoff.`,
      changeCount: versions.length,
      createdAt: latestVersion?.createdAt,
    });
  }

  if (rows.length === 0) {
    rows.push({
      id: "version-timeline-ready",
      status: "ready",
      kind: "checkpoint",
      label: "Version timeline is ready",
      detail:
        versions.length > 0
          ? "Named versions have low restore and merge risk."
          : "No named versions are saved yet.",
      changeCount: 0,
      createdAt: latestVersion?.createdAt,
    });
  }

  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;

  return {
    score: Math.max(0, 100 - blockedCount * 18 - reviewCount * 6),
    versionCount: versions.length,
    highRiskCount: highRiskVersions.length,
    mediumRiskCount: mediumRiskVersions.length,
    duplicateNameCount: duplicateNameGroups.reduce(
      (count, group) => count + group.versions.length,
      0,
    ),
    staleVersionCount: staleVersions.length,
    noRecentCheckpoint,
    blockedCount,
    reviewCount,
    readyCount,
    latestVersionAt: latestVersion?.createdAt ?? null,
    rows,
  };
}

export function getVersionTimelineReviewCsv(
  report: VersionTimelineReviewReport,
  rows: VersionTimelineReviewRow[] = report.rows,
) {
  const header: Array<keyof VersionTimelineReviewRow> = [
    "id",
    "status",
    "kind",
    "versionId",
    "versionName",
    "label",
    "detail",
    "changeCount",
    "createdAt",
  ];

  return [
    [
      "score",
      "versions",
      "high_risk",
      "medium_risk",
      "duplicates",
      "stale_versions",
      "blocked",
      "review",
    ].join(","),
    [
      report.score,
      report.versionCount,
      report.highRiskCount,
      report.mediumRiskCount,
      report.duplicateNameCount,
      report.staleVersionCount,
      report.blockedCount,
      report.reviewCount,
    ]
      .map(escapeCsvCell)
      .join(","),
    "",
    header.join(","),
    ...rows.map((row) => header.map((key) => escapeCsvCell(row[key])).join(",")),
  ].join("\n");
}

export function getVersionTimelineReviewMarkdown(
  report: VersionTimelineReviewReport,
  rows: VersionTimelineReviewRow[] = report.rows,
) {
  return [
    "# Version Timeline Review",
    "",
    `Score: ${report.score}`,
    `Named versions: ${report.versionCount}`,
    `High risk: ${report.highRiskCount}`,
    `Medium risk: ${report.mediumRiskCount}`,
    `Duplicate names: ${report.duplicateNameCount}`,
    `Stale versions: ${report.staleVersionCount}`,
    `Latest checkpoint: ${report.latestVersionAt ?? "No named version"}`,
    "",
    "## Review Queue",
    ...(rows.length > 0
      ? rows.map(
          (row) =>
            `- [${row.status}] ${row.label}: ${row.detail}${row.versionName ? ` (${row.versionName})` : ""}`,
        )
      : ["- No version timeline review rows."]),
  ].join("\n");
}

function getDuplicateNameGroups(versions: DesignFileVersionSummary[]) {
  const groups = new Map<string, DesignFileVersionSummary[]>();

  for (const version of versions) {
    const key = normalizeName(version.name);
    groups.set(key, [...(groups.get(key) ?? []), version]);
  }

  return Array.from(groups.entries())
    .map(([key, group]) => ({
      name: group[0]?.name ?? key,
      versions: group,
    }))
    .filter((group) => group.versions.length > 1);
}

function normalizeName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "-") || "unnamed";
}

function getTime(value?: string) {
  if (!value) {
    return 0;
  }

  const time = new Date(value).getTime();

  return Number.isFinite(time) ? time : 0;
}

function formatAge(value: number) {
  const days = Math.max(1, Math.round(value / (24 * 60 * 60 * 1000)));

  return `${days} day${days === 1 ? "" : "s"}`;
}

function escapeCsvCell(value: boolean | number | string | null | undefined) {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value);

  if (!/[",\n\r]/.test(text)) {
    return text;
  }

  return `"${text.replace(/"/g, '""')}"`;
}
