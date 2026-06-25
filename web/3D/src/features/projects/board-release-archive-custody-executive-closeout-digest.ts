import { createHash } from "node:crypto";
import type { BoardReleaseArchiveCustodyAccessReviewQueueReport } from "@/features/projects/board-release-archive-custody-access-review-queue";
import type { BoardReleaseArchiveCustodyChainOfControlLedgerReport } from "@/features/projects/board-release-archive-custody-chain-of-control-ledger";
import type { BoardReleaseArchiveCustodyRestoreRehearsalPacketReport } from "@/features/projects/board-release-archive-custody-restore-rehearsal-packet";
import type { BoardReleaseArchiveCustodyRetentionLockWorkflowReport } from "@/features/projects/board-release-archive-custody-retention-lock-workflow";

export type BoardReleaseArchiveCustodyExecutiveCloseoutDigestKind =
  | "access-review"
  | "chain-of-control"
  | "release-recommendation"
  | "restore-rehearsal"
  | "retention-lock";

export type BoardReleaseArchiveCustodyExecutiveCloseoutDigestStatus = "approved" | "blocked" | "watch";

export interface BoardReleaseArchiveCustodyExecutiveCloseoutDigestRow {
  closeoutHash: string;
  evidenceHash: string;
  id: string;
  kind: BoardReleaseArchiveCustodyExecutiveCloseoutDigestKind;
  nextAction: string;
  score: number;
  status: BoardReleaseArchiveCustodyExecutiveCloseoutDigestStatus;
  title: string;
}

export interface BoardReleaseArchiveCustodyExecutiveCloseoutDigestReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  rows: BoardReleaseArchiveCustodyExecutiveCloseoutDigestRow[];
  summary: {
    approvedCount: number;
    blockedCount: number;
    closeoutDigestHash: string;
    closeoutScore: number;
    executiveRecommendation: string;
    nextAction: string;
    rowCount: number;
    status: BoardReleaseArchiveCustodyExecutiveCloseoutDigestStatus;
    watchCount: number;
  };
  workspaceId: string;
}

export interface CreateBoardReleaseArchiveCustodyExecutiveCloseoutDigestInput {
  accessReviewQueue: BoardReleaseArchiveCustodyAccessReviewQueueReport;
  chainOfControlLedger: BoardReleaseArchiveCustodyChainOfControlLedgerReport;
  generatedAt?: string;
  restoreRehearsalPacket: BoardReleaseArchiveCustodyRestoreRehearsalPacketReport;
  retentionLockWorkflow: BoardReleaseArchiveCustodyRetentionLockWorkflowReport;
  workspaceId?: string;
}

const kindRank: Record<BoardReleaseArchiveCustodyExecutiveCloseoutDigestKind, number> = {
  "chain-of-control": 0,
  "retention-lock": 1,
  "access-review": 2,
  "restore-rehearsal": 3,
  "release-recommendation": 4,
};

const statusRank: Record<BoardReleaseArchiveCustodyExecutiveCloseoutDigestStatus, number> = {
  blocked: 0,
  watch: 1,
  approved: 2,
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
  return `sha256:${createHash("sha256").update(typeof value === "string" ? value : stableJson(value)).digest("hex")}`;
}

function csvCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function encodeCsvDataUri(csvContent: string) {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`;
}

function encodeJsonDataUri(jsonContent: string) {
  return `data:application/json;charset=utf-8,${encodeURIComponent(jsonContent)}`;
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

function chainStatus(status: BoardReleaseArchiveCustodyChainOfControlLedgerReport["summary"]["status"]) {
  if (status === "broken") {
    return "blocked" satisfies BoardReleaseArchiveCustodyExecutiveCloseoutDigestStatus;
  }

  return status === "pending" ? "watch" : "approved";
}

function retentionStatus(status: BoardReleaseArchiveCustodyRetentionLockWorkflowReport["summary"]["status"]) {
  if (status === "blocked") {
    return "blocked" satisfies BoardReleaseArchiveCustodyExecutiveCloseoutDigestStatus;
  }

  return status === "pending" ? "watch" : "approved";
}

function accessStatus(status: BoardReleaseArchiveCustodyAccessReviewQueueReport["summary"]["status"]) {
  return status;
}

function restoreStatus(status: BoardReleaseArchiveCustodyRestoreRehearsalPacketReport["summary"]["status"]) {
  if (status === "blocked") {
    return "blocked" satisfies BoardReleaseArchiveCustodyExecutiveCloseoutDigestStatus;
  }

  return status === "watch" ? "watch" : "approved";
}

function row(input: {
  evidenceHash: string;
  kind: BoardReleaseArchiveCustodyExecutiveCloseoutDigestKind;
  nextAction: string;
  score: number;
  status: BoardReleaseArchiveCustodyExecutiveCloseoutDigestStatus;
  title: string;
  workspaceId: string;
}) {
  const closeoutHash = sha256({
    evidenceHash: input.evidenceHash,
    kind: input.kind,
    score: input.score,
    status: input.status,
    title: input.title,
  });

  return {
    closeoutHash,
    evidenceHash: input.evidenceHash,
    id: `archive-custody-executive-closeout:${slug(input.workspaceId)}:${input.kind}`,
    kind: input.kind,
    nextAction: input.nextAction,
    score: input.score,
    status: input.status,
    title: input.title,
  } satisfies BoardReleaseArchiveCustodyExecutiveCloseoutDigestRow;
}

function recommendation(input: {
  componentRows: BoardReleaseArchiveCustodyExecutiveCloseoutDigestRow[];
  workspaceId: string;
}) {
  const blocked = input.componentRows.filter((entry) => entry.status === "blocked");
  const watch = input.componentRows.filter((entry) => entry.status === "watch");
  const score = Math.round(input.componentRows.reduce((total, entry) => total + entry.score, 0) / Math.max(1, input.componentRows.length));
  const status: BoardReleaseArchiveCustodyExecutiveCloseoutDigestStatus = blocked.length > 0 ? "blocked" : watch.length > 0 ? "watch" : "approved";
  const nextAction =
    status === "blocked"
      ? `Resolve ${blocked[0]?.title ?? "blocked custody evidence"} before release archive custody closeout.`
      : status === "watch"
        ? `Monitor ${watch[0]?.title ?? "watch custody evidence"} before executive closeout.`
        : "Approve release archive custody closeout and keep evidence attached to board records.";

  return row({
    evidenceHash: sha256(input.componentRows.map((entry) => entry.closeoutHash)),
    kind: "release-recommendation",
    nextAction,
    score,
    status,
    title: "Release archive custody recommendation",
    workspaceId: input.workspaceId,
  });
}

function createRows(input: CreateBoardReleaseArchiveCustodyExecutiveCloseoutDigestInput & { workspaceId: string }) {
  const componentRows = [
    row({
      evidenceHash: input.chainOfControlLedger.summary.ledgerHash,
      kind: "chain-of-control",
      nextAction: input.chainOfControlLedger.summary.nextAction,
      score: input.chainOfControlLedger.summary.custodyScore,
      status: chainStatus(input.chainOfControlLedger.summary.status),
      title: "Chain-of-control ledger",
      workspaceId: input.workspaceId,
    }),
    row({
      evidenceHash: input.retentionLockWorkflow.summary.retentionLockHash,
      kind: "retention-lock",
      nextAction: input.retentionLockWorkflow.summary.nextAction,
      score: input.retentionLockWorkflow.summary.retentionScore,
      status: retentionStatus(input.retentionLockWorkflow.summary.status),
      title: "Retention lock workflow",
      workspaceId: input.workspaceId,
    }),
    row({
      evidenceHash: input.accessReviewQueue.summary.accessReviewHash,
      kind: "access-review",
      nextAction: input.accessReviewQueue.summary.nextAction,
      score: input.accessReviewQueue.summary.reviewScore,
      status: accessStatus(input.accessReviewQueue.summary.status),
      title: "Access review queue",
      workspaceId: input.workspaceId,
    }),
    row({
      evidenceHash: input.restoreRehearsalPacket.summary.restorePacketHash,
      kind: "restore-rehearsal",
      nextAction: input.restoreRehearsalPacket.summary.nextAction,
      score: input.restoreRehearsalPacket.summary.restoreScore,
      status: restoreStatus(input.restoreRehearsalPacket.summary.status),
      title: "Restore rehearsal packet",
      workspaceId: input.workspaceId,
    }),
  ];

  return [...componentRows, recommendation({ componentRows, workspaceId: input.workspaceId })].sort(
    (first, second) => kindRank[first.kind] - kindRank[second.kind] || statusRank[first.status] - statusRank[second.status] || first.title.localeCompare(second.title),
  );
}

function executiveRecommendationFor(input: {
  blockedCount: number;
  closeoutScore: number;
  watchCount: number;
}) {
  if (input.blockedCount > 0) {
    return `BLOCK archive custody closeout until blocked chain, retention, access, or restore evidence is repaired. Current score: ${input.closeoutScore}/100.`;
  }

  if (input.watchCount > 0) {
    return `WATCH archive custody closeout and complete executive monitoring before final release recommendation. Current score: ${input.closeoutScore}/100.`;
  }

  return `APPROVE archive custody closeout with sealed chain-of-control, locked retention, approved access review, and restored rehearsal evidence. Current score: ${input.closeoutScore}/100.`;
}

function summarize(rows: BoardReleaseArchiveCustodyExecutiveCloseoutDigestRow[]): BoardReleaseArchiveCustodyExecutiveCloseoutDigestReport["summary"] {
  const approvedCount = rows.filter((entry) => entry.status === "approved").length;
  const blockedCount = rows.filter((entry) => entry.status === "blocked").length;
  const watchCount = rows.filter((entry) => entry.status === "watch").length;
  const status: BoardReleaseArchiveCustodyExecutiveCloseoutDigestStatus = blockedCount > 0 ? "blocked" : watchCount > 0 ? "watch" : "approved";
  const closeoutScore = rows.length > 0 ? Math.max(0, Math.round(rows.reduce((total, entry) => total + entry.score, 0) / rows.length - blockedCount * 12 - watchCount * 5)) : 100;
  const nextRow = rows.find((entry) => entry.status === "blocked") ?? rows.find((entry) => entry.status === "watch") ?? rows.find((entry) => entry.kind === "release-recommendation") ?? null;

  return {
    approvedCount,
    blockedCount,
    closeoutDigestHash: sha256(rows.map((entry) => entry.closeoutHash)),
    closeoutScore,
    executiveRecommendation: executiveRecommendationFor({
      blockedCount,
      closeoutScore,
      watchCount,
    }),
    nextAction: nextRow?.nextAction ?? "Review archive custody executive closeout digest.",
    rowCount: rows.length,
    status,
    watchCount,
  };
}

function createCsv(rows: BoardReleaseArchiveCustodyExecutiveCloseoutDigestRow[]) {
  const header = ["closeout_id", "kind", "title", "status", "score", "evidence_hash", "closeout_hash", "next_action"];
  const body = rows.map((entry) =>
    [entry.id, entry.kind, entry.title, entry.status, entry.score, entry.evidenceHash, entry.closeoutHash, entry.nextAction].map(csvCell).join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function createJson(input: {
  generatedAt: string;
  rows: BoardReleaseArchiveCustodyExecutiveCloseoutDigestRow[];
  summary: BoardReleaseArchiveCustodyExecutiveCloseoutDigestReport["summary"];
  workspaceId: string;
}) {
  return JSON.stringify(input, null, 2);
}

export function createBoardReleaseArchiveCustodyExecutiveCloseoutDigest(
  input: CreateBoardReleaseArchiveCustodyExecutiveCloseoutDigestInput,
): BoardReleaseArchiveCustodyExecutiveCloseoutDigestReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.chainOfControlLedger.workspaceId;
  const rows = createRows({
    ...input,
    workspaceId,
  });
  const summary = summarize(rows);
  const csvContent = createCsv(rows);
  const jsonContent = createJson({
    generatedAt,
    rows,
    summary,
    workspaceId,
  });
  const fileBase = `${slug(workspaceId)}-board-release-archive-custody-executive-closeout-digest-${dateStamp(generatedAt)}`;

  return {
    csvContent,
    csvDataUri: encodeCsvDataUri(csvContent),
    csvFileName: `${fileBase}.csv`,
    generatedAt,
    jsonContent,
    jsonDataUri: encodeJsonDataUri(jsonContent),
    jsonFileName: `${fileBase}.json`,
    rows,
    summary,
    workspaceId,
  };
}
