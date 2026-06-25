import type { LibraryPublishReadinessReport } from "@/features/editor/library-publish-readiness";
import type { LibraryPublishRiskReport } from "@/features/editor/library-publish-risk";

export type LibraryReleaseApprovalSeverity =
  | "review"
  | "blocked"
  | "medium"
  | "high";

export type LibraryReleaseApprovalItem = {
  id: string;
  label: string;
  detail: string;
  source: "readiness" | "risk";
  severity: LibraryReleaseApprovalSeverity;
  acknowledged: boolean;
  note?: string;
};

export type LibraryReleaseApprovalReport = {
  itemCount: number;
  acknowledgedCount: number;
  outstandingCount: number;
  canApprove: boolean;
  items: LibraryReleaseApprovalItem[];
};

export type LibraryReleaseApprovalSnapshot = {
  id: string;
  createdAt: string;
  label: string;
  readinessScore: number;
  riskScore: number;
  itemCount: number;
  acknowledgedCount: number;
  outstandingCount: number;
  reviewOwner?: string;
  reviewerNote?: string;
  acknowledgedItemIds: string[];
  notes: Record<string, string>;
};

type LibraryReleaseApprovalInput = {
  publishReadiness: LibraryPublishReadinessReport;
  publishRisk: LibraryPublishRiskReport;
  acknowledgedItemIds: ReadonlySet<string>;
  acknowledgementNotes?: Record<string, string>;
};

type LibraryReleaseApprovalSnapshotInput = {
  report: LibraryReleaseApprovalReport;
  publishReadiness: LibraryPublishReadinessReport;
  publishRisk: LibraryPublishRiskReport;
  libraryName: string;
  targetVersion: number;
  sessionLabel?: string;
  reviewOwner?: string;
  reviewerNote?: string;
};

export function getLibraryReleaseApprovalReport({
  publishReadiness,
  publishRisk,
  acknowledgedItemIds,
  acknowledgementNotes = {},
}: LibraryReleaseApprovalInput): LibraryReleaseApprovalReport {
  const readinessItems = publishReadiness.items
    .filter((item) => item.status !== "ready")
    .map<LibraryReleaseApprovalItem>((item) => {
      const id = `readiness:${item.id}`;

      return {
        id,
        label: `Readiness / ${item.label}`,
        detail: item.detail,
        source: "readiness",
        severity: item.status === "blocked" ? "blocked" : "review",
        acknowledged: acknowledgedItemIds.has(id),
        note: acknowledgementNotes[id],
      };
    });
  const riskItems = publishRisk.items
    .filter((item) => item.severity !== "low")
    .map<LibraryReleaseApprovalItem>((item) => {
      const id = `risk:${item.id}`;

      return {
        id,
        label: `Risk / ${item.label}`,
        detail: `${item.detail} / impact ${item.impact}`,
        source: "risk",
        severity: item.severity === "high" ? "high" : "medium",
        acknowledged: acknowledgedItemIds.has(id),
        note: acknowledgementNotes[id],
      };
    });
  const items = [...readinessItems, ...riskItems].sort(sortApprovalItems);
  const acknowledgedCount = items.filter((item) => item.acknowledged).length;

  return {
    itemCount: items.length,
    acknowledgedCount,
    outstandingCount: items.length - acknowledgedCount,
    canApprove: items.length === acknowledgedCount,
    items,
  };
}

export function createLibraryReleaseApprovalSnapshot({
  report,
  publishReadiness,
  publishRisk,
  libraryName,
  targetVersion,
  sessionLabel,
  reviewOwner,
  reviewerNote,
}: LibraryReleaseApprovalSnapshotInput): LibraryReleaseApprovalSnapshot {
  const createdAt = new Date().toISOString();
  const notes = Object.fromEntries(
    report.items
      .filter((item) => item.note?.trim())
      .map((item) => [item.id, item.note?.trim() ?? ""]),
  );

  return {
    id: `${targetVersion}:${createdAt}`,
    createdAt,
    label: sessionLabel?.trim() || `${libraryName} v${targetVersion}`,
    readinessScore: publishReadiness.score,
    riskScore: publishRisk.score,
    itemCount: report.itemCount,
    acknowledgedCount: report.acknowledgedCount,
    outstandingCount: report.outstandingCount,
    reviewOwner: reviewOwner?.trim() || undefined,
    reviewerNote: reviewerNote?.trim() || undefined,
    acknowledgedItemIds: report.items
      .filter((item) => item.acknowledged)
      .map((item) => item.id),
    notes,
  };
}

export function getLibraryReleaseApprovalSnapshotsCsv(
  snapshots: LibraryReleaseApprovalSnapshot[],
) {
  const header: Array<keyof LibraryReleaseApprovalSnapshot> = [
    "id",
    "createdAt",
    "label",
    "readinessScore",
    "riskScore",
    "itemCount",
    "acknowledgedCount",
    "outstandingCount",
    "reviewOwner",
    "reviewerNote",
  ];

  return [
    header.join(","),
    ...snapshots.map((snapshot) =>
      header.map((key) => escapeCsvCell(snapshot[key])).join(","),
    ),
    "",
    "snapshotId,acknowledgedItemId",
    ...snapshots.flatMap((snapshot) =>
      snapshot.acknowledgedItemIds.map((itemId) =>
        [snapshot.id, itemId].map(escapeCsvCell).join(","),
      ),
    ),
    "",
    "snapshotId,itemId,note",
    ...snapshots.flatMap((snapshot) =>
      Object.entries(snapshot.notes).map(([itemId, note]) =>
        [snapshot.id, itemId, note].map(escapeCsvCell).join(","),
      ),
    ),
  ].join("\n");
}

function sortApprovalItems(
  first: LibraryReleaseApprovalItem,
  second: LibraryReleaseApprovalItem,
) {
  const priorityDifference =
    getApprovalSeverityPriority(first.severity) -
    getApprovalSeverityPriority(second.severity);

  if (priorityDifference !== 0) {
    return priorityDifference;
  }

  return first.label.localeCompare(second.label);
}

function getApprovalSeverityPriority(severity: LibraryReleaseApprovalSeverity) {
  if (severity === "blocked" || severity === "high") {
    return 0;
  }

  if (severity === "medium") {
    return 1;
  }

  return 2;
}

function escapeCsvCell(
  value: string | number | string[] | Record<string, string> | undefined,
) {
  if (value === undefined) {
    return "";
  }

  const text = Array.isArray(value)
    ? value.join("; ")
    : typeof value === "object"
      ? JSON.stringify(value)
      : String(value);

  if (!/[",\n]/.test(text)) {
    return text;
  }

  return `"${text.replace(/"/g, '""')}"`;
}
