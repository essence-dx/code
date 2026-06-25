import { createHash } from "node:crypto";
import type { BoardReleaseArchiveAssuranceDistributionMatrixReport, BoardReleaseArchiveAssuranceDistributionRecipient } from "@/features/projects/board-release-archive-assurance-distribution-matrix";
import type { BoardReleaseArchiveEvidenceExceptionRenewalRow, BoardReleaseArchiveEvidenceExceptionRenewalSchedulerReport } from "@/features/projects/board-release-archive-evidence-exception-renewal-scheduler";

export type BoardReleaseArchiveAssurancePostReleaseAuditKind = "acknowledgement-completion" | "renewal-closure";
export type BoardReleaseArchiveAssurancePostReleaseAuditStatus = "blocked" | "closed" | "pending";

export interface BoardReleaseArchiveAssurancePostReleaseAuditItem {
  dueAt: string;
  id: string;
  kind: BoardReleaseArchiveAssurancePostReleaseAuditKind;
  nextAction: string;
  owner: string;
  proofHash: string;
  sourceHash: string;
  status: BoardReleaseArchiveAssurancePostReleaseAuditStatus;
  title: string;
}

export interface BoardReleaseArchiveAssurancePostReleaseAuditChecklistReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  rows: BoardReleaseArchiveAssurancePostReleaseAuditItem[];
  summary: {
    acknowledgementClosedCount: number;
    auditHash: string;
    blockedCount: number;
    checklistScore: number;
    closedCount: number;
    nextAction: string;
    pendingCount: number;
    renewalClosedCount: number;
    rowCount: number;
    status: BoardReleaseArchiveAssurancePostReleaseAuditStatus;
  };
  workspaceId: string;
}

export interface CreateBoardReleaseArchiveAssurancePostReleaseAuditChecklistInput {
  distributionMatrix: BoardReleaseArchiveAssuranceDistributionMatrixReport;
  exceptionRenewals: BoardReleaseArchiveEvidenceExceptionRenewalSchedulerReport;
  generatedAt?: string;
  workspaceId?: string;
}

const kindRank: Record<BoardReleaseArchiveAssurancePostReleaseAuditKind, number> = {
  "acknowledgement-completion": 0,
  "renewal-closure": 1,
};

const statusRank: Record<BoardReleaseArchiveAssurancePostReleaseAuditStatus, number> = {
  blocked: 0,
  pending: 1,
  closed: 2,
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

function csvCell(value: string | number | null) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
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

function acknowledgementStatus(recipient: BoardReleaseArchiveAssuranceDistributionRecipient): BoardReleaseArchiveAssurancePostReleaseAuditStatus {
  if (recipient.status === "blocked") {
    return "blocked";
  }

  return recipient.status === "covered" ? "closed" : "pending";
}

function renewalStatus(row: BoardReleaseArchiveEvidenceExceptionRenewalRow): BoardReleaseArchiveAssurancePostReleaseAuditStatus {
  if (row.status === "blocked" || row.status === "overdue") {
    return "blocked";
  }

  return row.status === "scheduled" ? "closed" : "pending";
}

function acknowledgementNextAction(input: {
  recipient: BoardReleaseArchiveAssuranceDistributionRecipient;
  status: BoardReleaseArchiveAssurancePostReleaseAuditStatus;
}) {
  if (input.status === "blocked") {
    return `Resolve distribution blockers before closing acknowledgement proof for ${input.recipient.title}.`;
  }

  if (input.status === "pending") {
    return `Collect and retain acknowledgement proof for ${input.recipient.title} before ${input.recipient.acknowledgementDeadline}.`;
  }

  return `Keep acknowledgement proof sealed for ${input.recipient.title}.`;
}

function renewalNextAction(input: {
  renewal: BoardReleaseArchiveEvidenceExceptionRenewalRow;
  status: BoardReleaseArchiveAssurancePostReleaseAuditStatus;
}) {
  if (input.status === "blocked") {
    return `Close renewal blocker for ${input.renewal.title} before final certificate generation.`;
  }

  if (input.status === "pending") {
    return `Attach closure proof for ${input.renewal.title} before ${input.renewal.dueAt}.`;
  }

  return `Keep renewal closure proof sealed for ${input.renewal.title}.`;
}

function acknowledgementItem(input: {
  generatedAt: string;
  recipient: BoardReleaseArchiveAssuranceDistributionRecipient;
  workspaceId: string;
}) {
  const status = acknowledgementStatus(input.recipient);
  const proofHash = sha256({
    acknowledgementDeadline: input.recipient.acknowledgementDeadline,
    coverageHash: input.recipient.coverageHash,
    kind: "acknowledgement-completion",
    status,
  });

  return {
    dueAt: input.recipient.acknowledgementDeadline,
    id: `archive-assurance-post-release-audit:${slug(input.workspaceId)}:acknowledgement:${input.recipient.audience}:${dateStamp(input.generatedAt)}`,
    kind: "acknowledgement-completion",
    nextAction: acknowledgementNextAction({
      recipient: input.recipient,
      status,
    }),
    owner: input.recipient.recipient,
    proofHash,
    sourceHash: input.recipient.coverageHash,
    status,
    title: `${input.recipient.title} acknowledgement completion`,
  } satisfies BoardReleaseArchiveAssurancePostReleaseAuditItem;
}

function renewalItem(input: {
  generatedAt: string;
  renewal: BoardReleaseArchiveEvidenceExceptionRenewalRow;
  workspaceId: string;
}) {
  const status = renewalStatus(input.renewal);
  const proofHash = sha256({
    dueAt: input.renewal.dueAt,
    kind: "renewal-closure",
    renewalHash: input.renewal.renewalHash,
    status,
  });

  return {
    dueAt: input.renewal.dueAt,
    id: `archive-assurance-post-release-audit:${slug(input.workspaceId)}:renewal:${slug(input.renewal.id)}:${dateStamp(input.generatedAt)}`,
    kind: "renewal-closure",
    nextAction: renewalNextAction({
      renewal: input.renewal,
      status,
    }),
    owner: input.renewal.ownerEmail,
    proofHash,
    sourceHash: input.renewal.renewalHash,
    status,
    title: `${input.renewal.title} closure proof`,
  } satisfies BoardReleaseArchiveAssurancePostReleaseAuditItem;
}

function createRows(input: CreateBoardReleaseArchiveAssurancePostReleaseAuditChecklistInput & { generatedAt: string; workspaceId: string }) {
  return [
    ...input.distributionMatrix.recipients.map((recipient) =>
      acknowledgementItem({
        generatedAt: input.generatedAt,
        recipient,
        workspaceId: input.workspaceId,
      }),
    ),
    ...input.exceptionRenewals.rows.map((renewal) =>
      renewalItem({
        generatedAt: input.generatedAt,
        renewal,
        workspaceId: input.workspaceId,
      }),
    ),
  ].sort(
    (first, second) =>
      statusRank[first.status] - statusRank[second.status] ||
      kindRank[first.kind] - kindRank[second.kind] ||
      first.dueAt.localeCompare(second.dueAt) ||
      first.title.localeCompare(second.title),
  );
}

function createCsv(rows: BoardReleaseArchiveAssurancePostReleaseAuditItem[]) {
  const header = ["audit_id", "kind", "title", "status", "owner", "due_at", "source_hash", "proof_hash", "next_action"];
  const body = rows.map((row) => [row.id, row.kind, row.title, row.status, row.owner, row.dueAt, row.sourceHash, row.proofHash, row.nextAction].map(csvCell).join(","));

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function summarize(rows: BoardReleaseArchiveAssurancePostReleaseAuditItem[]): BoardReleaseArchiveAssurancePostReleaseAuditChecklistReport["summary"] {
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const pendingCount = rows.filter((row) => row.status === "pending").length;
  const closedCount = rows.filter((row) => row.status === "closed").length;
  const status = rows.reduce<BoardReleaseArchiveAssurancePostReleaseAuditStatus>(
    (worst, row) => (statusRank[row.status] < statusRank[worst] ? row.status : worst),
    "closed",
  );
  const nextRow = rows.find((row) => row.status !== "closed") ?? rows[0] ?? null;

  return {
    acknowledgementClosedCount: rows.filter((row) => row.kind === "acknowledgement-completion" && row.status === "closed").length,
    auditHash: sha256(rows.map((row) => row.proofHash)),
    blockedCount,
    checklistScore: rows.length > 0 ? Math.max(0, Math.round((closedCount / rows.length) * 100 - blockedCount * 16 - pendingCount * 4)) : 100,
    closedCount,
    nextAction: status === "closed" ? "Archive assurance post-release audit checklist is closed." : (nextRow?.nextAction ?? "Create archive assurance post-release audit checklist."),
    pendingCount,
    renewalClosedCount: rows.filter((row) => row.kind === "renewal-closure" && row.status === "closed").length,
    rowCount: rows.length,
    status,
  };
}

function createJson(input: {
  generatedAt: string;
  rows: BoardReleaseArchiveAssurancePostReleaseAuditItem[];
  summary: BoardReleaseArchiveAssurancePostReleaseAuditChecklistReport["summary"];
  workspaceId: string;
}) {
  return JSON.stringify(input, null, 2);
}

export function createBoardReleaseArchiveAssurancePostReleaseAuditChecklist(
  input: CreateBoardReleaseArchiveAssurancePostReleaseAuditChecklistInput,
): BoardReleaseArchiveAssurancePostReleaseAuditChecklistReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.distributionMatrix.workspaceId;
  const rows = createRows({
    ...input,
    generatedAt,
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
  const fileBase = `${slug(workspaceId)}-board-release-archive-assurance-post-release-audit-checklist-${dateStamp(generatedAt)}`;

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
