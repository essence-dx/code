import { createHash } from "node:crypto";
import type { BoardEvidenceReleaseArchiveRecordReport } from "@/features/projects/board-evidence-release-archive-records";
import type { BoardEvidenceReleaseCloseoutNotificationReport } from "@/features/projects/board-evidence-release-closeout-notifications";
import type { BoardEvidenceReleaseVarianceReport } from "@/features/projects/board-evidence-release-variance";
import type { BoardReleaseOperationsApprovalSnapshotReport } from "@/features/projects/board-release-operations-approval-snapshots";
import type { BoardReleaseOperationsHistoryReport } from "@/features/projects/board-release-operations-history";
import type { BoardReleaseOperationsReviewQueueReport } from "@/features/projects/board-release-operations-review-queue";

export type BoardReleaseOperationsExportPacketStatus = "blocked" | "ready" | "watch";
export type BoardReleaseOperationsExportPacketFileKind = "archive" | "approval-snapshot" | "history" | "notification" | "queue" | "variance";

export interface BoardReleaseOperationsExportPacketFile {
  fileHash: string;
  fileKind: BoardReleaseOperationsExportPacketFileKind;
  fileName: string;
  rowCount: number;
}

export interface BoardReleaseOperationsExportPacket {
  archiveHash: string | null;
  manifestHash: string;
  notificationEligibleRouteCount: number;
  packetHash: string;
  packetId: string;
  releasePromotionId: string | null;
  signatureHash: string;
  signedAt: string;
  signerName: string;
  status: BoardReleaseOperationsExportPacketStatus;
  varianceBlockerCount: number;
  varianceCount: number;
  workspaceId: string;
}

export interface BoardReleaseOperationsExportPacketReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  files: BoardReleaseOperationsExportPacketFile[];
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  packets: BoardReleaseOperationsExportPacket[];
  summary: {
    blockedCount: number;
    exportFileCount: number;
    nextAction: string;
    packetCount: number;
    readyCount: number;
    signedPacketCount: number;
    status: BoardReleaseOperationsExportPacketStatus;
    varianceBlockerCount: number;
    varianceCount: number;
    watchCount: number;
  };
  workspaceId: string;
}

export interface CreateBoardReleaseOperationsExportPacketReportInput {
  approvalSnapshots: BoardReleaseOperationsApprovalSnapshotReport;
  archive: BoardEvidenceReleaseArchiveRecordReport;
  generatedAt?: string;
  history: BoardReleaseOperationsHistoryReport;
  notifications: BoardEvidenceReleaseCloseoutNotificationReport;
  queue: BoardReleaseOperationsReviewQueueReport;
  signerName?: string;
  variance: BoardEvidenceReleaseVarianceReport;
  workspaceId?: string;
}

const statusRank: Record<BoardReleaseOperationsExportPacketStatus, number> = {
  blocked: 0,
  watch: 1,
  ready: 2,
};

function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableJson(entry)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([first], [second]) => first.localeCompare(second))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value) ?? "null";
}

function sha256(value: unknown) {
  return `sha256:${createHash("sha256").update(stableJson(value)).digest("hex")}`;
}

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

function packetStatus(input: CreateBoardReleaseOperationsExportPacketReportInput): BoardReleaseOperationsExportPacketStatus {
  if (
    input.archive.summary.status === "blocked" ||
    input.approvalSnapshots.summary.status === "blocked" ||
    input.history.summary.status === "blocked" ||
    input.queue.summary.status === "blocked" ||
    input.variance.summary.blockerCount > 0
  ) {
    return "blocked";
  }

  if (
    input.approvalSnapshots.summary.status === "watch" ||
    input.history.summary.status === "watch" ||
    input.notifications.summary.status === "watch" ||
    input.queue.summary.status === "in-review" ||
    input.variance.summary.watchCount > 0
  ) {
    return "watch";
  }

  return "ready";
}

function fileHash(content: string) {
  return sha256(content);
}

function createFiles(input: CreateBoardReleaseOperationsExportPacketReportInput): BoardReleaseOperationsExportPacketFile[] {
  return [
    {
      fileHash: fileHash(input.archive.jsonContent),
      fileKind: "archive",
      fileName: input.archive.jsonFileName,
      rowCount: input.archive.records.length,
    },
    {
      fileHash: fileHash(input.history.jsonContent),
      fileKind: "history",
      fileName: input.history.jsonFileName,
      rowCount: input.history.records.length,
    },
    {
      fileHash: fileHash(input.queue.jsonContent),
      fileKind: "queue",
      fileName: input.queue.jsonFileName,
      rowCount: input.queue.items.length,
    },
    {
      fileHash: fileHash(input.approvalSnapshots.jsonContent),
      fileKind: "approval-snapshot",
      fileName: input.approvalSnapshots.jsonFileName,
      rowCount: input.approvalSnapshots.snapshots.length,
    },
    {
      fileHash: fileHash(input.notifications.jsonContent),
      fileKind: "notification",
      fileName: input.notifications.jsonFileName,
      rowCount: input.notifications.notifications.length,
    },
    {
      fileHash: fileHash(input.variance.jsonContent),
      fileKind: "variance",
      fileName: input.variance.jsonFileName,
      rowCount: input.variance.variances.length,
    },
  ];
}

function packetId(input: {
  generatedAt: string;
  releasePromotionId: string | null;
  workspaceId: string;
}) {
  return `board-release-operations-export:${slug(input.workspaceId)}:${slug(input.releasePromotionId ?? "unassigned-release")}:${dateStamp(input.generatedAt)}`;
}

function createPacket(input: CreateBoardReleaseOperationsExportPacketReportInput & { files: BoardReleaseOperationsExportPacketFile[]; generatedAt: string; workspaceId: string }) {
  const releasePromotionId =
    input.history.summary.latestReleasePromotionId ??
    input.archive.records[0]?.releasePromotionId ??
    input.approvalSnapshots.snapshots[0]?.releasePromotionId ??
    null;
  const archiveHash = input.archive.summary.latestArchiveHash;
  const manifestHash = sha256({
    files: input.files,
    generatedAt: input.generatedAt,
    releasePromotionId,
    workspaceId: input.workspaceId,
  });
  const status = packetStatus(input);
  const signerName = input.signerName?.trim() || input.archive.records[0]?.actorName || "Workspace owner";
  const packetCore = {
    archiveHash,
    manifestHash,
    notificationEligibleRouteCount: input.notifications.summary.eligibleRouteCount,
    releasePromotionId,
    status,
    varianceBlockerCount: input.variance.summary.blockerCount,
    varianceCount: input.variance.summary.varianceCount,
    workspaceId: input.workspaceId,
  };
  const packetHash = sha256(packetCore);

  return {
    archiveHash,
    manifestHash,
    notificationEligibleRouteCount: input.notifications.summary.eligibleRouteCount,
    packetHash,
    packetId: packetId({
      generatedAt: input.generatedAt,
      releasePromotionId,
      workspaceId: input.workspaceId,
    }),
    releasePromotionId,
    signatureHash: sha256({
      packetHash,
      signedAt: input.generatedAt,
      signerName,
    }),
    signedAt: input.generatedAt,
    signerName,
    status,
    varianceBlockerCount: input.variance.summary.blockerCount,
    varianceCount: input.variance.summary.varianceCount,
    workspaceId: input.workspaceId,
  } satisfies BoardReleaseOperationsExportPacket;
}

function summarize(packets: BoardReleaseOperationsExportPacket[], files: BoardReleaseOperationsExportPacketFile[]): BoardReleaseOperationsExportPacketReport["summary"] {
  const blockedCount = packets.filter((packet) => packet.status === "blocked").length;
  const watchCount = packets.filter((packet) => packet.status === "watch").length;
  const readyCount = packets.filter((packet) => packet.status === "ready").length;
  const firstAttention = packets.find((packet) => packet.status === "blocked" || packet.status === "watch") ?? null;

  return {
    blockedCount,
    exportFileCount: files.length,
    nextAction:
      firstAttention?.status === "blocked"
        ? "Resolve blocked release operations before distributing the signed export packet."
        : firstAttention?.status === "watch"
          ? "Review watched release operations evidence before final packet distribution."
          : "Signed board release operations export packet is ready for distribution.",
    packetCount: packets.length,
    readyCount,
    signedPacketCount: packets.filter((packet) => packet.signatureHash.startsWith("sha256:")).length,
    status: packets.reduce<BoardReleaseOperationsExportPacketStatus>(
      (worst, packet) => (statusRank[packet.status] < statusRank[worst] ? packet.status : worst),
      "ready",
    ),
    varianceBlockerCount: packets.reduce((total, packet) => total + packet.varianceBlockerCount, 0),
    varianceCount: packets.reduce((total, packet) => total + packet.varianceCount, 0),
    watchCount,
  };
}

function createCsv(packets: BoardReleaseOperationsExportPacket[], files: BoardReleaseOperationsExportPacketFile[]) {
  const header = [
    "packet_id",
    "release_promotion_id",
    "status",
    "archive_hash",
    "manifest_hash",
    "packet_hash",
    "signature_hash",
    "notification_routes",
    "variance_count",
    "variance_blockers",
    "files",
  ];
  const fileList = files.map((file) => `${file.fileKind}:${file.fileName}`).join(" | ");
  const body = packets.map((packet) =>
    [
      packet.packetId,
      packet.releasePromotionId,
      packet.status,
      packet.archiveHash,
      packet.manifestHash,
      packet.packetHash,
      packet.signatureHash,
      packet.notificationEligibleRouteCount,
      packet.varianceCount,
      packet.varianceBlockerCount,
      fileList,
    ]
      .map(csvCell)
      .join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function createJson(input: {
  files: BoardReleaseOperationsExportPacketFile[];
  generatedAt: string;
  packets: BoardReleaseOperationsExportPacket[];
  summary: BoardReleaseOperationsExportPacketReport["summary"];
  workspaceId: string;
}) {
  return JSON.stringify(
    {
      files: input.files,
      generatedAt: input.generatedAt,
      packets: input.packets,
      summary: input.summary,
      workspaceId: input.workspaceId,
    },
    null,
    2,
  );
}

export function createBoardReleaseOperationsExportPacketReport(input: CreateBoardReleaseOperationsExportPacketReportInput): BoardReleaseOperationsExportPacketReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.history.workspaceId;
  const files = createFiles(input);
  const packets = [
    createPacket({
      ...input,
      files,
      generatedAt,
      workspaceId,
    }),
  ];
  const summary = summarize(packets, files);
  const csvContent = createCsv(packets, files);
  const jsonContent = createJson({
    files,
    generatedAt,
    packets,
    summary,
    workspaceId,
  });
  const fileBase = `${slug(workspaceId)}-board-release-operations-export-packets-${dateStamp(generatedAt)}`;

  return {
    csvContent,
    csvDataUri: encodeCsvDataUri(csvContent),
    csvFileName: `${fileBase}.csv`,
    files,
    generatedAt,
    jsonContent,
    jsonDataUri: encodeJsonDataUri(jsonContent),
    jsonFileName: `${fileBase}.json`,
    packets,
    summary,
    workspaceId,
  };
}
