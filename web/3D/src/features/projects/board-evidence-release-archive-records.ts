import { createHash } from "node:crypto";
import type { BoardEvidenceCloseoutReport, BoardEvidenceCloseoutStatus } from "@/features/projects/board-evidence-closeout-report";
import type {
  BoardEvidenceReleasePromotionGateReport,
  BoardEvidenceReleasePromotionGateStatus,
} from "@/features/projects/board-evidence-release-promotion-gate";

export type BoardEvidenceReleaseArchiveStatus = "archived" | "blocked";

export interface BoardEvidenceReleaseArchiveActor {
  email: string | null;
  name: string | null;
  userId: string | null;
}

export interface BoardEvidenceReleaseArchiveRecord {
  actorEmail: string | null;
  actorName: string;
  actorUserId: string | null;
  archiveHash: string;
  archiveId: string;
  archivedAt: string;
  closeoutHash: string;
  closeoutJsonFileName: string;
  closeoutStatus: BoardEvidenceCloseoutStatus;
  promotionAllowed: boolean;
  promotionGateHash: string;
  promotionGateJsonFileName: string;
  promotionGateStatus: BoardEvidenceReleasePromotionGateStatus;
  releasePromotionId: string | null;
  workspaceId: string;
}

export interface BoardEvidenceReleaseArchiveRecordReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  records: BoardEvidenceReleaseArchiveRecord[];
  summary: {
    archiveCount: number;
    latestArchiveHash: string | null;
    nextAction: string;
    promotionAllowed: boolean;
    status: BoardEvidenceReleaseArchiveStatus;
  };
  workspaceId: string;
}

export interface CreateBoardEvidenceReleaseArchiveRecordReportInput {
  actor: BoardEvidenceReleaseArchiveActor;
  closeout: BoardEvidenceCloseoutReport;
  generatedAt?: string;
  promotionGate: BoardEvidenceReleasePromotionGateReport;
  workspaceId?: string;
}

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

function csvCell(value: string | number | boolean | null) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function encodeCsvDataUri(csvContent: string) {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`;
}

function encodeJsonDataUri(jsonContent: string) {
  return `data:application/json;charset=utf-8,${encodeURIComponent(jsonContent)}`;
}

function actorName(actor: BoardEvidenceReleaseArchiveActor) {
  return actor.name?.trim() || actor.email?.trim() || "Unknown actor";
}

function archiveId(input: {
  archivedAt: string;
  releasePromotionId: string | null;
  workspaceId: string;
}) {
  return `board-evidence-release-archive:${slug(input.workspaceId)}:${slug(input.releasePromotionId ?? "unassigned-release")}:${dateStamp(input.archivedAt)}`;
}

function createRecord(input: CreateBoardEvidenceReleaseArchiveRecordReportInput & { generatedAt: string; workspaceId: string }): BoardEvidenceReleaseArchiveRecord {
  const closeoutHash = sha256({
    csvContent: input.closeout.csvContent,
    jsonContent: input.closeout.jsonContent,
    sections: input.closeout.sections,
    summary: input.closeout.summary,
  });
  const promotionGateHash = sha256({
    csvContent: input.promotionGate.csvContent,
    gates: input.promotionGate.gates,
    jsonContent: input.promotionGate.jsonContent,
    summary: input.promotionGate.summary,
  });
  const recordCore = {
    actor: input.actor,
    archivedAt: input.generatedAt,
    closeoutHash,
    promotionAllowed: input.promotionGate.summary.promotionAllowed,
    promotionGateHash,
    releasePromotionId: input.promotionGate.releasePromotionId,
    workspaceId: input.workspaceId,
  };

  return {
    actorEmail: input.actor.email,
    actorName: actorName(input.actor),
    actorUserId: input.actor.userId,
    archiveHash: sha256(recordCore),
    archiveId: archiveId({
      archivedAt: input.generatedAt,
      releasePromotionId: input.promotionGate.releasePromotionId,
      workspaceId: input.workspaceId,
    }),
    archivedAt: input.generatedAt,
    closeoutHash,
    closeoutJsonFileName: input.closeout.jsonFileName,
    closeoutStatus: input.closeout.summary.status,
    promotionAllowed: input.promotionGate.summary.promotionAllowed,
    promotionGateHash,
    promotionGateJsonFileName: input.promotionGate.jsonFileName,
    promotionGateStatus: input.promotionGate.summary.status,
    releasePromotionId: input.promotionGate.releasePromotionId,
    workspaceId: input.workspaceId,
  };
}

function summarize(record: BoardEvidenceReleaseArchiveRecord): BoardEvidenceReleaseArchiveRecordReport["summary"] {
  return {
    archiveCount: 1,
    latestArchiveHash: record.archiveHash,
    nextAction: record.promotionAllowed
      ? "Board evidence release archive is sealed for release promotion."
      : "Resolve promotion blockers before treating the archive as releasable.",
    promotionAllowed: record.promotionAllowed,
    status: record.promotionAllowed ? "archived" : "blocked",
  };
}

function createCsv(records: BoardEvidenceReleaseArchiveRecord[]) {
  const header = [
    "archive_id",
    "release_promotion_id",
    "archived_at",
    "actor",
    "closeout_hash",
    "promotion_gate_hash",
    "archive_hash",
    "promotion_allowed",
  ];
  const body = records.map((record) =>
    [
      record.archiveId,
      record.releasePromotionId,
      record.archivedAt,
      record.actorName,
      record.closeoutHash,
      record.promotionGateHash,
      record.archiveHash,
      record.promotionAllowed,
    ]
      .map(csvCell)
      .join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function createJson(input: {
  generatedAt: string;
  records: BoardEvidenceReleaseArchiveRecord[];
  summary: BoardEvidenceReleaseArchiveRecordReport["summary"];
  workspaceId: string;
}) {
  return JSON.stringify(
    {
      generatedAt: input.generatedAt,
      records: input.records,
      summary: input.summary,
      workspaceId: input.workspaceId,
    },
    null,
    2,
  );
}

export function createBoardEvidenceReleaseArchiveRecordReport(
  input: CreateBoardEvidenceReleaseArchiveRecordReportInput,
): BoardEvidenceReleaseArchiveRecordReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.closeout.workspaceId;
  const record = createRecord({
    ...input,
    generatedAt,
    workspaceId,
  });
  const records = [record];
  const summary = summarize(record);
  const csvContent = createCsv(records);
  const jsonContent = createJson({
    generatedAt,
    records,
    summary,
    workspaceId,
  });
  const fileBase = `${slug(workspaceId)}-board-evidence-release-archive-records-${dateStamp(generatedAt)}`;

  return {
    csvContent,
    csvDataUri: encodeCsvDataUri(csvContent),
    csvFileName: `${fileBase}.csv`,
    generatedAt,
    jsonContent,
    jsonDataUri: encodeJsonDataUri(jsonContent),
    jsonFileName: `${fileBase}.json`,
    records,
    summary,
    workspaceId,
  };
}
