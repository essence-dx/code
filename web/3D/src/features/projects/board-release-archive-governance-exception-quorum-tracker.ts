import { createHash } from "node:crypto";
import type {
  BoardReleaseArchiveGovernanceControlOwnerMatrixReport,
  BoardReleaseArchiveGovernanceControlOwnerMatrixRow,
} from "@/features/projects/board-release-archive-governance-control-owner-matrix";
import type { BoardReleaseArchiveGovernancePolicyCharterKind } from "@/features/projects/board-release-archive-governance-policy-charter";

export type BoardReleaseArchiveGovernanceExceptionQuorumTrackerStatus = "approved" | "blocked" | "watch";

export interface BoardReleaseArchiveGovernanceExceptionQuorumTrackerOverride {
  abstentions: number;
  approvalVotes: number;
  kind: BoardReleaseArchiveGovernancePolicyCharterKind;
  renewalThresholdDays: number;
}

export interface BoardReleaseArchiveGovernanceExceptionQuorumTrackerRow {
  abstentions: number;
  approvalVotes: number;
  id: string;
  kind: BoardReleaseArchiveGovernancePolicyCharterKind;
  matrixHash: string;
  nextAction: string;
  quorumHash: string;
  quorumScore: number;
  renewalThresholdDays: number;
  status: BoardReleaseArchiveGovernanceExceptionQuorumTrackerStatus;
  title: string;
}

export interface BoardReleaseArchiveGovernanceExceptionQuorumTrackerReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  rows: BoardReleaseArchiveGovernanceExceptionQuorumTrackerRow[];
  summary: {
    approvedCount: number;
    blockedCount: number;
    nextAction: string;
    quorumHash: string;
    quorumScore: number;
    rowCount: number;
    status: BoardReleaseArchiveGovernanceExceptionQuorumTrackerStatus;
    watchCount: number;
  };
  workspaceId: string;
}

export interface CreateBoardReleaseArchiveGovernanceExceptionQuorumTrackerInput {
  controlOwnerMatrix: BoardReleaseArchiveGovernanceControlOwnerMatrixReport;
  generatedAt?: string;
  quorumOverrides?: BoardReleaseArchiveGovernanceExceptionQuorumTrackerOverride[];
  workspaceId?: string;
}

const kindRank: Record<BoardReleaseArchiveGovernancePolicyCharterKind, number> = {
  "decision-rights": 0,
  "approval-policy": 1,
  "risk-acceptance": 2,
  "release-authority": 3,
};

const statusRank: Record<BoardReleaseArchiveGovernanceExceptionQuorumTrackerStatus, number> = {
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

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function defaultQuorum(input: { row: BoardReleaseArchiveGovernanceControlOwnerMatrixRow }) {
  if (input.row.kind === "risk-acceptance") {
    return {
      abstentions: input.row.status === "blocked" ? 2 : 0,
      approvalVotes: input.row.status === "blocked" ? 1 : input.row.status === "watch" ? 3 : 4,
      renewalThresholdDays: input.row.status === "watch" ? 7 : 14,
    };
  }

  return {
    abstentions: input.row.status === "blocked" ? 2 : 0,
    approvalVotes: input.row.status === "blocked" ? 1 : input.row.status === "watch" ? 3 : 4,
    renewalThresholdDays: input.row.status === "watch" ? 7 : 21,
  };
}

function statusFor(input: {
  abstentions: number;
  approvalVotes: number;
  matrixStatus: BoardReleaseArchiveGovernanceControlOwnerMatrixRow["status"];
  renewalThresholdDays: number;
}) {
  if (input.matrixStatus === "blocked" || input.approvalVotes < 2 || input.abstentions >= 3 || input.renewalThresholdDays < 3) {
    return "blocked" satisfies BoardReleaseArchiveGovernanceExceptionQuorumTrackerStatus;
  }

  if (input.matrixStatus === "watch" || input.approvalVotes < 4 || input.abstentions > 0 || input.renewalThresholdDays < 10) {
    return "watch" satisfies BoardReleaseArchiveGovernanceExceptionQuorumTrackerStatus;
  }

  return "approved" satisfies BoardReleaseArchiveGovernanceExceptionQuorumTrackerStatus;
}

function scoreFor(input: {
  abstentions: number;
  approvalVotes: number;
  renewalThresholdDays: number;
  status: BoardReleaseArchiveGovernanceExceptionQuorumTrackerStatus;
}) {
  if (input.status === "approved") {
    return 100;
  }

  const votePenalty = Math.max(0, 4 - input.approvalVotes) * 18;
  const abstentionPenalty = input.abstentions * 12;
  const renewalPenalty = Math.max(0, 10 - input.renewalThresholdDays) * 5;

  return clamp(100 - votePenalty - abstentionPenalty - renewalPenalty);
}

function nextActionFor(input: {
  status: BoardReleaseArchiveGovernanceExceptionQuorumTrackerStatus;
  title: string;
}) {
  if (input.status === "blocked") {
    return `Repair blocked archive governance exception quorum for ${input.title}.`;
  }

  if (input.status === "watch") {
    return `Monitor archive governance exception quorum renewal pressure for ${input.title}.`;
  }

  return `Keep archive governance exception quorum approved for ${input.title}.`;
}

function createRows(input: CreateBoardReleaseArchiveGovernanceExceptionQuorumTrackerInput & { workspaceId: string }) {
  const overrides = new Map((input.quorumOverrides ?? []).map((entry) => [entry.kind, entry]));

  return input.controlOwnerMatrix.rows
    .map((entry) => {
      const defaults = defaultQuorum({ row: entry });
      const override = overrides.get(entry.kind);
      const approvalVotes = Math.max(0, Math.round(override?.approvalVotes ?? defaults.approvalVotes));
      const abstentions = Math.max(0, Math.round(override?.abstentions ?? defaults.abstentions));
      const renewalThresholdDays = Math.max(0, Math.round(override?.renewalThresholdDays ?? defaults.renewalThresholdDays));
      const status = statusFor({
        abstentions,
        approvalVotes,
        matrixStatus: entry.status,
        renewalThresholdDays,
      });
      const quorumScore = scoreFor({
        abstentions,
        approvalVotes,
        renewalThresholdDays,
        status,
      });
      const quorumHash = sha256({
        abstentions,
        approvalVotes,
        kind: entry.kind,
        matrixHash: entry.ownerHash,
        quorumScore,
        renewalThresholdDays,
        status,
      });

      return {
        abstentions,
        approvalVotes,
        id: `archive-governance-exception-quorum:${slug(input.workspaceId)}:${entry.kind}`,
        kind: entry.kind,
        matrixHash: entry.ownerHash,
        nextAction: nextActionFor({
          status,
          title: entry.title,
        }),
        quorumHash,
        quorumScore,
        renewalThresholdDays,
        status,
        title: entry.title,
      } satisfies BoardReleaseArchiveGovernanceExceptionQuorumTrackerRow;
    })
    .sort((first, second) => statusRank[first.status] - statusRank[second.status] || kindRank[first.kind] - kindRank[second.kind] || first.title.localeCompare(second.title));
}

function createCsv(rows: BoardReleaseArchiveGovernanceExceptionQuorumTrackerRow[]) {
  const header = [
    "quorum_id",
    "kind",
    "title",
    "status",
    "approval_votes",
    "abstentions",
    "renewal_threshold_days",
    "quorum_score",
    "quorum_hash",
    "next_action",
  ];
  const body = rows.map((entry) =>
    [
      entry.id,
      entry.kind,
      entry.title,
      entry.status,
      entry.approvalVotes,
      entry.abstentions,
      entry.renewalThresholdDays,
      entry.quorumScore,
      entry.quorumHash,
      entry.nextAction,
    ]
      .map(csvCell)
      .join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function summarize(rows: BoardReleaseArchiveGovernanceExceptionQuorumTrackerRow[]): BoardReleaseArchiveGovernanceExceptionQuorumTrackerReport["summary"] {
  const approvedCount = rows.filter((entry) => entry.status === "approved").length;
  const blockedCount = rows.filter((entry) => entry.status === "blocked").length;
  const watchCount = rows.filter((entry) => entry.status === "watch").length;
  const status: BoardReleaseArchiveGovernanceExceptionQuorumTrackerStatus = blockedCount > 0 ? "blocked" : watchCount > 0 ? "watch" : "approved";
  const nextRow = rows.find((entry) => entry.status === "blocked") ?? rows.find((entry) => entry.status === "watch") ?? rows[0] ?? null;

  return {
    approvedCount,
    blockedCount,
    nextAction: status === "approved" ? "Archive governance exception quorum tracker is approved." : (nextRow?.nextAction ?? "Review archive governance exception quorum tracker."),
    quorumHash: sha256(rows.map((entry) => entry.quorumHash)),
    quorumScore: rows.length > 0 ? Math.round(rows.reduce((total, entry) => total + entry.quorumScore, 0) / rows.length) : 100,
    rowCount: rows.length,
    status,
    watchCount,
  };
}

function createJson(input: {
  generatedAt: string;
  rows: BoardReleaseArchiveGovernanceExceptionQuorumTrackerRow[];
  summary: BoardReleaseArchiveGovernanceExceptionQuorumTrackerReport["summary"];
  workspaceId: string;
}) {
  return JSON.stringify(input, null, 2);
}

export function createBoardReleaseArchiveGovernanceExceptionQuorumTracker(
  input: CreateBoardReleaseArchiveGovernanceExceptionQuorumTrackerInput,
): BoardReleaseArchiveGovernanceExceptionQuorumTrackerReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.controlOwnerMatrix.workspaceId;
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
  const fileBase = `${slug(workspaceId)}-board-release-archive-governance-exception-quorum-tracker-${dateStamp(generatedAt)}`;

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
