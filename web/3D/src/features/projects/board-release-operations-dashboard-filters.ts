import type { BoardReleaseOperationsApprovalSnapshotReport } from "@/features/projects/board-release-operations-approval-snapshots";
import type { BoardReleaseOperationsExportPacketReport } from "@/features/projects/board-release-operations-export-packets";
import type { BoardReleaseOperationsHistoryReport } from "@/features/projects/board-release-operations-history";
import type { BoardReleaseOperationsReviewQueueReport } from "@/features/projects/board-release-operations-review-queue";

export type BoardReleaseOperationsDashboardFilterStatus = "archived" | "blocked" | "ready" | "watch";
export type BoardReleaseOperationsDashboardFilterSource = "approval-snapshot" | "export-packet" | "history" | "review-queue";

export interface BoardReleaseOperationsDashboardFilterEntry {
  evidenceHash: string | null;
  filterStatus: BoardReleaseOperationsDashboardFilterStatus;
  nextAction: string;
  ownerName: string | null;
  releasePromotionId: string | null;
  score: number | null;
  source: BoardReleaseOperationsDashboardFilterSource;
  sourceId: string;
  workspaceId: string;
}

export interface BoardReleaseOperationsDashboardFilterBucket {
  entries: BoardReleaseOperationsDashboardFilterEntry[];
  nextAction: string;
  status: BoardReleaseOperationsDashboardFilterStatus;
}

export interface BoardReleaseOperationsDashboardFilterReport {
  buckets: BoardReleaseOperationsDashboardFilterBucket[];
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  entries: BoardReleaseOperationsDashboardFilterEntry[];
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  summary: {
    archivedCount: number;
    blockedCount: number;
    entryCount: number;
    nextAction: string;
    readyCount: number;
    status: BoardReleaseOperationsDashboardFilterStatus;
    watchCount: number;
  };
  workspaceId: string;
}

export interface CreateBoardReleaseOperationsDashboardFilterReportInput {
  approvalSnapshots: BoardReleaseOperationsApprovalSnapshotReport;
  exportPackets: BoardReleaseOperationsExportPacketReport;
  generatedAt?: string;
  history: BoardReleaseOperationsHistoryReport;
  queue: BoardReleaseOperationsReviewQueueReport;
  workspaceId?: string;
}

const filterStatuses: BoardReleaseOperationsDashboardFilterStatus[] = ["blocked", "watch", "ready", "archived"];

const statusRank: Record<BoardReleaseOperationsDashboardFilterStatus, number> = {
  blocked: 0,
  watch: 1,
  ready: 2,
  archived: 3,
};

function slug(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 72) || "workspace"
  );
}

function dateStamp(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "current" : date.toISOString().slice(0, 10).replaceAll("-", "");
}

function csvCell(value: string | number | null) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function encodeCsvDataUri(csvContent: string) {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`;
}

function encodeJsonDataUri(jsonContent: string) {
  return `data:application/json;charset=utf-8,${encodeURIComponent(jsonContent)}`;
}

function queueFilterStatus(status: string): BoardReleaseOperationsDashboardFilterStatus {
  if (status === "blocked") {
    return "blocked";
  }

  if (status === "in-review") {
    return "watch";
  }

  return status === "closed" ? "archived" : "ready";
}

function createEntries(input: CreateBoardReleaseOperationsDashboardFilterReportInput & { workspaceId: string }): BoardReleaseOperationsDashboardFilterEntry[] {
  const historyEntries = input.history.records.map<BoardReleaseOperationsDashboardFilterEntry>((record) => ({
    evidenceHash: record.historyHash,
    filterStatus: record.status,
    nextAction:
      record.status === "blocked"
        ? "Resolve blocked board release operations before promotion."
        : record.status === "watch"
          ? "Review watched board release operations before closeout."
          : record.status === "archived"
            ? "Confirm archived release operations remain closed."
            : "Approve release operations closeout.",
    ownerName: null,
    releasePromotionId: record.releasePromotionId,
    score: record.gateScore,
    source: "history",
    sourceId: record.historyId,
    workspaceId: input.workspaceId,
  }));
  const queueEntries = input.queue.items.map<BoardReleaseOperationsDashboardFilterEntry>((item) => ({
    evidenceHash: item.historyHash,
    filterStatus: queueFilterStatus(item.status),
    nextAction: item.nextAction,
    ownerName: item.ownerName,
    releasePromotionId: item.releasePromotionId,
    score: null,
    source: "review-queue",
    sourceId: item.queueId,
    workspaceId: item.workspaceId,
  }));
  const approvalEntries = input.approvalSnapshots.snapshots.map<BoardReleaseOperationsDashboardFilterEntry>((snapshot) => ({
    evidenceHash: snapshot.snapshotHash,
    filterStatus: snapshot.status,
    nextAction: snapshot.nextAction,
    ownerName: null,
    releasePromotionId: snapshot.releasePromotionId,
    score: snapshot.currentGateScore,
    source: "approval-snapshot",
    sourceId: snapshot.snapshotId,
    workspaceId: snapshot.workspaceId,
  }));
  const exportEntries = input.exportPackets.packets.map<BoardReleaseOperationsDashboardFilterEntry>((packet) => ({
    evidenceHash: packet.packetHash,
    filterStatus: packet.status,
    nextAction:
      packet.status === "blocked"
        ? "Resolve blocked release operations before distributing the signed export packet."
        : packet.status === "watch"
          ? "Review watched release operations evidence before final packet distribution."
          : "Signed board release operations export packet is ready for distribution.",
    ownerName: packet.signerName,
    releasePromotionId: packet.releasePromotionId,
    score: null,
    source: "export-packet",
    sourceId: packet.packetId,
    workspaceId: packet.workspaceId,
  }));

  return [...historyEntries, ...queueEntries, ...approvalEntries, ...exportEntries].sort(
    (first, second) => statusRank[first.filterStatus] - statusRank[second.filterStatus] || first.source.localeCompare(second.source) || first.sourceId.localeCompare(second.sourceId),
  );
}

function bucketNextAction(status: BoardReleaseOperationsDashboardFilterStatus, count: number) {
  if (count === 0) {
    return `No ${status} board release operations are currently visible.`;
  }

  if (status === "blocked") {
    return "Resolve blocked release operations before promotion or packet distribution.";
  }

  if (status === "watch") {
    return "Review watched release operations before closeout.";
  }

  return status === "archived" ? "Confirm archived release operations remain closed." : "Approve ready release operations.";
}

function createBuckets(entries: BoardReleaseOperationsDashboardFilterEntry[]) {
  return filterStatuses.map<BoardReleaseOperationsDashboardFilterBucket>((status) => {
    const bucketEntries = entries.filter((entry) => entry.filterStatus === status);

    return {
      entries: bucketEntries,
      nextAction: bucketNextAction(status, bucketEntries.length),
      status,
    };
  });
}

function summarize(buckets: BoardReleaseOperationsDashboardFilterBucket[]): BoardReleaseOperationsDashboardFilterReport["summary"] {
  const countFor = (status: BoardReleaseOperationsDashboardFilterStatus) => buckets.find((bucket) => bucket.status === status)?.entries.length ?? 0;
  const blockedCount = countFor("blocked");
  const watchCount = countFor("watch");
  const readyCount = countFor("ready");
  const archivedCount = countFor("archived");
  const status: BoardReleaseOperationsDashboardFilterStatus = blockedCount > 0 ? "blocked" : watchCount > 0 ? "watch" : readyCount > 0 ? "ready" : "archived";

  return {
    archivedCount,
    blockedCount,
    entryCount: blockedCount + watchCount + readyCount + archivedCount,
    nextAction: bucketNextAction(status, countFor(status)),
    readyCount,
    status,
    watchCount,
  };
}

function createCsv(entries: BoardReleaseOperationsDashboardFilterEntry[]) {
  const header = ["source", "source_id", "release_promotion_id", "filter_status", "owner", "score", "evidence_hash", "next_action"];
  const body = entries.map((entry) =>
    [entry.source, entry.sourceId, entry.releasePromotionId, entry.filterStatus, entry.ownerName, entry.score, entry.evidenceHash, entry.nextAction].map(csvCell).join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function createJson(input: {
  buckets: BoardReleaseOperationsDashboardFilterBucket[];
  entries: BoardReleaseOperationsDashboardFilterEntry[];
  generatedAt: string;
  summary: BoardReleaseOperationsDashboardFilterReport["summary"];
  workspaceId: string;
}) {
  return JSON.stringify(
    {
      buckets: input.buckets,
      entries: input.entries,
      generatedAt: input.generatedAt,
      summary: input.summary,
      workspaceId: input.workspaceId,
    },
    null,
    2,
  );
}

export function createBoardReleaseOperationsDashboardFilterReport(
  input: CreateBoardReleaseOperationsDashboardFilterReportInput,
): BoardReleaseOperationsDashboardFilterReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.history.workspaceId;
  const entries = createEntries({
    ...input,
    workspaceId,
  });
  const buckets = createBuckets(entries);
  const summary = summarize(buckets);
  const csvContent = createCsv(entries);
  const jsonContent = createJson({
    buckets,
    entries,
    generatedAt,
    summary,
    workspaceId,
  });
  const fileBase = `${slug(workspaceId)}-board-release-operations-dashboard-filters-${dateStamp(generatedAt)}`;

  return {
    buckets,
    csvContent,
    csvDataUri: encodeCsvDataUri(csvContent),
    csvFileName: `${fileBase}.csv`,
    entries,
    generatedAt,
    jsonContent,
    jsonDataUri: encodeJsonDataUri(jsonContent),
    jsonFileName: `${fileBase}.json`,
    summary,
    workspaceId,
  };
}
