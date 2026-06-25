import type { DesignFileShareSummary } from "@/features/files/actions";

export type ShareLinkReviewStatus = "ready" | "review" | "blocked";

export type ShareLinkReviewKind =
  | "comments"
  | "disabled"
  | "download"
  | "expiry"
  | "preset"
  | "stale";

export type ShareLinkReviewRow = {
  id: string;
  status: ShareLinkReviewStatus;
  kind: ShareLinkReviewKind;
  shareId?: string;
  preset?: string;
  label: string;
  detail: string;
  createdAt?: string;
  count: number;
};

export type ShareLinkReviewReport = {
  score: number;
  shareCount: number;
  activeShareCount: number;
  disabledShareCount: number;
  downloadShareCount: number;
  commentShareCount: number;
  unexpiringShareCount: number;
  staleShareCount: number;
  blockedCount: number;
  reviewCount: number;
  readyCount: number;
  rows: ShareLinkReviewRow[];
};

const staleShareWindowMs = 30 * 24 * 60 * 60 * 1000;

export function getShareLinkReview({
  now = Date.now(),
  shares,
}: {
  now?: number;
  shares: DesignFileShareSummary[];
}): ShareLinkReviewReport {
  const activeShares = shares.filter((share) => !share.disabledAt);
  const disabledShares = shares.filter((share) => share.disabledAt);
  const rows: ShareLinkReviewRow[] = [];
  const downloadShares = activeShares.filter((share) => share.allowDownload);
  const commentShares = activeShares.filter((share) => share.allowComments);
  const unexpiringShares = activeShares.filter((share) => !share.expiresAt);
  const staleShares = activeShares.filter(
    (share) => now - getTime(share.createdAt) >= staleShareWindowMs,
  );

  for (const share of downloadShares) {
    rows.push({
      id: `download-${share.id}`,
      status: share.expiresAt ? "review" : "blocked",
      kind: "download",
      shareId: share.id,
      preset: share.permissionPreset,
      label: "Download-capable link",
      detail: share.expiresAt
        ? `${share.permissionPreset} link allows download until ${share.expiresAt}.`
        : `${share.permissionPreset} link allows download without an expiry.`,
      count: 1,
      createdAt: share.createdAt,
    });
  }

  for (const share of commentShares) {
    rows.push({
      id: `comments-${share.id}`,
      status: "review",
      kind: "comments",
      shareId: share.id,
      preset: share.permissionPreset,
      label: "Comment-capable link",
      detail: `${share.permissionPreset} link allows unauthenticated review comments.`,
      count: 1,
      createdAt: share.createdAt,
    });
  }

  for (const share of unexpiringShares) {
    rows.push({
      id: `expiry-${share.id}`,
      status: "review",
      kind: "expiry",
      shareId: share.id,
      preset: share.permissionPreset,
      label: "Link has no expiry",
      detail: `${share.permissionPreset} link should be disabled after handoff.`,
      count: 1,
      createdAt: share.createdAt,
    });
  }

  for (const share of staleShares) {
    rows.push({
      id: `stale-${share.id}`,
      status: "review",
      kind: "stale",
      shareId: share.id,
      preset: share.permissionPreset,
      label: "Stale active link",
      detail: `${share.permissionPreset} link has been active for ${formatAge(now - getTime(share.createdAt))}.`,
      count: 1,
      createdAt: share.createdAt,
    });
  }

  if (activeShares.length > 1) {
    rows.push({
      id: "many-active-links",
      status: "review",
      kind: "preset",
      label: "Multiple active link presets",
      detail: `${activeShares.length} active share links are available for this file.`,
      count: activeShares.length,
      createdAt: getLatestCreatedAt(activeShares),
    });
  }

  if (disabledShares.length > 0) {
    rows.push({
      id: "disabled-history",
      status: "ready",
      kind: "disabled",
      label: "Disabled link history",
      detail: `${disabledShares.length} disabled link${disabledShares.length === 1 ? "" : "s"} retained for audit context.`,
      count: disabledShares.length,
      createdAt: getLatestCreatedAt(disabledShares),
    });
  }

  if (rows.length === 0) {
    rows.push({
      id: "share-links-ready",
      status: "ready",
      kind: "preset",
      label: shares.length > 0 ? "Share links are ready" : "No share links",
      detail:
        shares.length > 0
          ? "No active download, comment, stale, or unexpiring share links detected."
          : "Create a share link when handoff or review is needed.",
      count: shares.length,
    });
  }

  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;

  return {
    score: Math.max(0, 100 - blockedCount * 20 - reviewCount * 6),
    shareCount: shares.length,
    activeShareCount: activeShares.length,
    disabledShareCount: disabledShares.length,
    downloadShareCount: downloadShares.length,
    commentShareCount: commentShares.length,
    unexpiringShareCount: unexpiringShares.length,
    staleShareCount: staleShares.length,
    blockedCount,
    reviewCount,
    readyCount,
    rows,
  };
}

export function getShareLinkReviewCsv(
  report: ShareLinkReviewReport,
  rows: ShareLinkReviewRow[] = report.rows,
) {
  const header: Array<keyof ShareLinkReviewRow> = [
    "id",
    "status",
    "kind",
    "shareId",
    "preset",
    "label",
    "detail",
    "createdAt",
    "count",
  ];

  return [
    [
      "score",
      "shares",
      "active",
      "disabled",
      "download",
      "comments",
      "unexpiring",
      "stale",
      "blocked",
      "review",
    ].join(","),
    [
      report.score,
      report.shareCount,
      report.activeShareCount,
      report.disabledShareCount,
      report.downloadShareCount,
      report.commentShareCount,
      report.unexpiringShareCount,
      report.staleShareCount,
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

export function getShareLinkReviewMarkdown(
  report: ShareLinkReviewReport,
  rows: ShareLinkReviewRow[] = report.rows,
) {
  return [
    "# Share Link Review",
    "",
    `Score: ${report.score}`,
    `Share links: ${report.shareCount}`,
    `Active links: ${report.activeShareCount}`,
    `Disabled links: ${report.disabledShareCount}`,
    `Download links: ${report.downloadShareCount}`,
    `Comment links: ${report.commentShareCount}`,
    `Unexpiring links: ${report.unexpiringShareCount}`,
    `Stale links: ${report.staleShareCount}`,
    "",
    "## Review Queue",
    ...(rows.length > 0
      ? rows.map(
          (row) =>
            `- [${row.status}] ${row.label}: ${row.detail}${row.preset ? ` (${row.preset})` : ""}`,
        )
      : ["- No share link review rows."]),
  ].join("\n");
}

function getLatestCreatedAt(shares: DesignFileShareSummary[]) {
  return shares
    .map((share) => share.createdAt)
    .sort((first, second) => getTime(second) - getTime(first))[0];
}

function getTime(value?: string | null) {
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
