import { createHash } from "node:crypto";
import type { BoardReleaseArchiveOversightEvidenceQualityMonitorReport } from "@/features/projects/board-release-archive-oversight-evidence-quality-monitor";

export type BoardReleaseArchiveOversightBoardDistributionRecipientType = "audit" | "board" | "executive" | "records";
export type BoardReleaseArchiveOversightBoardDistributionStatus = "blocked" | "ready" | "watch";

export interface BoardReleaseArchiveOversightBoardDistributionDigestRow {
  distributionHash: string;
  id: string;
  nextAction: string;
  packetHash: string;
  recipient: string;
  recipientType: BoardReleaseArchiveOversightBoardDistributionRecipientType;
  reviewCadence: string;
  status: BoardReleaseArchiveOversightBoardDistributionStatus;
}

export interface BoardReleaseArchiveOversightBoardDistributionDigestReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  rows: BoardReleaseArchiveOversightBoardDistributionDigestRow[];
  summary: {
    blockedCount: number;
    distributionDigestHash: string;
    distributionScore: number;
    nextAction: string;
    readyCount: number;
    rowCount: number;
    status: BoardReleaseArchiveOversightBoardDistributionStatus;
    watchCount: number;
  };
  workspaceId: string;
}

export interface CreateBoardReleaseArchiveOversightBoardDistributionDigestInput {
  generatedAt?: string;
  qualityMonitor: BoardReleaseArchiveOversightEvidenceQualityMonitorReport;
  workspaceId?: string;
}

const recipientRank: Record<BoardReleaseArchiveOversightBoardDistributionRecipientType, number> = {
  board: 0,
  audit: 1,
  records: 2,
  executive: 3,
};

const statusRank: Record<BoardReleaseArchiveOversightBoardDistributionStatus, number> = {
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

function statusFor(summary: BoardReleaseArchiveOversightEvidenceQualityMonitorReport["summary"]) {
  if (summary.status === "blocked") {
    return "blocked" satisfies BoardReleaseArchiveOversightBoardDistributionStatus;
  }

  return summary.status === "watch" ? "watch" : "ready";
}

function nextActionFor(input: {
  recipient: string;
  status: BoardReleaseArchiveOversightBoardDistributionStatus;
}) {
  if (input.status === "blocked") {
    return `Resolve blocked archive oversight quality before sending the governance digest to ${input.recipient}.`;
  }

  if (input.status === "watch") {
    return `Send ${input.recipient} the governance digest with evidence quality watch notes.`;
  }

  return `Send ${input.recipient} the recurring archive oversight governance digest.`;
}

function recipientRows(input: CreateBoardReleaseArchiveOversightBoardDistributionDigestInput & { workspaceId: string }) {
  const status = statusFor(input.qualityMonitor.summary);
  const packetHash = sha256({
    qualityMonitorHash: input.qualityMonitor.summary.qualityMonitorHash,
    qualityScore: input.qualityMonitor.summary.qualityScore,
    status: input.qualityMonitor.summary.status,
  });
  const recipients = [
    {
      recipient: "Board archive chair",
      recipientType: "board" as const,
      reviewCadence: "weekly governance review",
    },
    {
      recipient: "External audit lead",
      recipientType: "audit" as const,
      reviewCadence: "monthly audit evidence review",
    },
    {
      recipient: "Records retention owner",
      recipientType: "records" as const,
      reviewCadence: "monthly retention review",
    },
    {
      recipient: "Executive release sponsor",
      recipientType: "executive" as const,
      reviewCadence: "quarterly executive review",
    },
  ];

  return recipients.map((recipient) => {
    const distributionHash = sha256({
      packetHash,
      recipient: recipient.recipient,
      recipientType: recipient.recipientType,
      reviewCadence: recipient.reviewCadence,
      status,
    });

    return {
      distributionHash,
      id: `archive-oversight-board-distribution:${slug(input.workspaceId)}:${recipient.recipientType}`,
      nextAction: nextActionFor({
        recipient: recipient.recipient,
        status,
      }),
      packetHash,
      recipient: recipient.recipient,
      recipientType: recipient.recipientType,
      reviewCadence: recipient.reviewCadence,
      status,
    } satisfies BoardReleaseArchiveOversightBoardDistributionDigestRow;
  });
}

function createRows(input: CreateBoardReleaseArchiveOversightBoardDistributionDigestInput & { workspaceId: string }) {
  return recipientRows(input).sort(
    (first, second) =>
      statusRank[first.status] - statusRank[second.status] || recipientRank[first.recipientType] - recipientRank[second.recipientType] || first.recipient.localeCompare(second.recipient),
  );
}

function createCsv(rows: BoardReleaseArchiveOversightBoardDistributionDigestRow[]) {
  const header = ["distribution_id", "recipient_type", "recipient", "status", "review_cadence", "packet_hash", "distribution_hash", "next_action"];
  const body = rows.map((entry) =>
    [entry.id, entry.recipientType, entry.recipient, entry.status, entry.reviewCadence, entry.packetHash, entry.distributionHash, entry.nextAction].map(csvCell).join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function summarize(rows: BoardReleaseArchiveOversightBoardDistributionDigestRow[]): BoardReleaseArchiveOversightBoardDistributionDigestReport["summary"] {
  const blockedCount = rows.filter((entry) => entry.status === "blocked").length;
  const readyCount = rows.filter((entry) => entry.status === "ready").length;
  const watchCount = rows.filter((entry) => entry.status === "watch").length;
  const status: BoardReleaseArchiveOversightBoardDistributionStatus = blockedCount > 0 ? "blocked" : watchCount > 0 ? "watch" : "ready";
  const nextRow = rows.find((entry) => entry.status === "blocked") ?? rows.find((entry) => entry.status === "watch") ?? rows[0] ?? null;

  return {
    blockedCount,
    distributionDigestHash: sha256(rows.map((entry) => entry.distributionHash)),
    distributionScore: rows.length > 0 ? Math.max(0, Math.round((readyCount / rows.length) * 100 - blockedCount * 16 - watchCount * 8)) : 100,
    nextAction:
      status === "ready"
        ? "Archive oversight board distribution digest is ready for recurring governance reviews."
        : (nextRow?.nextAction ?? "Review archive oversight board distribution digest."),
    readyCount,
    rowCount: rows.length,
    status,
    watchCount,
  };
}

function createJson(input: {
  generatedAt: string;
  rows: BoardReleaseArchiveOversightBoardDistributionDigestRow[];
  summary: BoardReleaseArchiveOversightBoardDistributionDigestReport["summary"];
  workspaceId: string;
}) {
  return JSON.stringify(input, null, 2);
}

export function createBoardReleaseArchiveOversightBoardDistributionDigest(
  input: CreateBoardReleaseArchiveOversightBoardDistributionDigestInput,
): BoardReleaseArchiveOversightBoardDistributionDigestReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.qualityMonitor.workspaceId;
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
  const fileBase = `${slug(workspaceId)}-board-release-archive-oversight-board-distribution-digest-${dateStamp(generatedAt)}`;

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
