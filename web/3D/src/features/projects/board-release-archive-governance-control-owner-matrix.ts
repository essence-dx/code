import { createHash } from "node:crypto";
import type {
  BoardReleaseArchiveGovernancePolicyCharterKind,
  BoardReleaseArchiveGovernancePolicyCharterReport,
  BoardReleaseArchiveGovernancePolicyCharterRow,
} from "@/features/projects/board-release-archive-governance-policy-charter";

export type BoardReleaseArchiveGovernanceControlOwnerMatrixStatus = "blocked" | "ready" | "watch";

export interface BoardReleaseArchiveGovernanceControlOwnerMatrixOverride {
  accountableOwner: string;
  escalationPath: string;
  evidenceObligation: string;
  kind: BoardReleaseArchiveGovernancePolicyCharterKind;
  reviewCadenceDays: number;
}

export interface BoardReleaseArchiveGovernanceControlOwnerMatrixRow {
  accountableOwner: string;
  charterHash: string;
  escalationPath: string;
  evidenceObligation: string;
  id: string;
  kind: BoardReleaseArchiveGovernancePolicyCharterKind;
  matrixScore: number;
  nextAction: string;
  ownerHash: string;
  reviewCadenceDays: number;
  status: BoardReleaseArchiveGovernanceControlOwnerMatrixStatus;
  title: string;
}

export interface BoardReleaseArchiveGovernanceControlOwnerMatrixReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  rows: BoardReleaseArchiveGovernanceControlOwnerMatrixRow[];
  summary: {
    blockedCount: number;
    matrixHash: string;
    matrixScore: number;
    nextAction: string;
    readyCount: number;
    rowCount: number;
    status: BoardReleaseArchiveGovernanceControlOwnerMatrixStatus;
    watchCount: number;
  };
  workspaceId: string;
}

export interface CreateBoardReleaseArchiveGovernanceControlOwnerMatrixInput {
  generatedAt?: string;
  ownerOverrides?: BoardReleaseArchiveGovernanceControlOwnerMatrixOverride[];
  policyCharter: BoardReleaseArchiveGovernancePolicyCharterReport;
  workspaceId?: string;
}

const kindRank: Record<BoardReleaseArchiveGovernancePolicyCharterKind, number> = {
  "decision-rights": 0,
  "approval-policy": 1,
  "risk-acceptance": 2,
  "release-authority": 3,
};

const statusRank: Record<BoardReleaseArchiveGovernanceControlOwnerMatrixStatus, number> = {
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

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function defaultOwner(input: { row: BoardReleaseArchiveGovernancePolicyCharterRow }) {
  if (input.row.kind === "decision-rights") {
    return {
      accountableOwner: "Board chair",
      escalationPath: "Archive governance committee",
      evidenceObligation: "Signed decision-rights attestation",
      reviewCadenceDays: 14,
    };
  }

  if (input.row.kind === "approval-policy") {
    return {
      accountableOwner: "Governance secretary",
      escalationPath: "Board chair",
      evidenceObligation: "Approval policy acknowledgement log",
      reviewCadenceDays: 14,
    };
  }

  if (input.row.kind === "risk-acceptance") {
    return {
      accountableOwner: "Risk owner",
      escalationPath: "Board risk committee",
      evidenceObligation: "Risk acceptance decision record",
      reviewCadenceDays: 7,
    };
  }

  return {
    accountableOwner: "Executive sponsor",
    escalationPath: "Board chair",
    evidenceObligation: "Release authority sign-off",
    reviewCadenceDays: 14,
  };
}

function statusFor(input: {
  accountableOwner: string;
  charterStatus: BoardReleaseArchiveGovernancePolicyCharterRow["status"];
  escalationPath: string;
  evidenceObligation: string;
  reviewCadenceDays: number;
}) {
  if (
    input.charterStatus === "blocked" ||
    input.accountableOwner.trim().length === 0 ||
    input.escalationPath.trim().length === 0 ||
    input.evidenceObligation.trim().length === 0 ||
    input.reviewCadenceDays > 30
  ) {
    return "blocked" satisfies BoardReleaseArchiveGovernanceControlOwnerMatrixStatus;
  }

  if (input.charterStatus === "watch" || input.reviewCadenceDays > 14) {
    return "watch" satisfies BoardReleaseArchiveGovernanceControlOwnerMatrixStatus;
  }

  return "ready" satisfies BoardReleaseArchiveGovernanceControlOwnerMatrixStatus;
}

function scoreFor(input: {
  accountableOwner: string;
  escalationPath: string;
  evidenceObligation: string;
  reviewCadenceDays: number;
  status: BoardReleaseArchiveGovernanceControlOwnerMatrixStatus;
}) {
  if (input.status === "ready") {
    return 100;
  }

  const ownerPenalty = input.accountableOwner.trim().length === 0 ? 25 : 0;
  const escalationPenalty = input.escalationPath.trim().length === 0 ? 20 : 0;
  const evidencePenalty = input.evidenceObligation.trim().length === 0 ? 20 : 0;
  const cadencePenalty = Math.max(0, input.reviewCadenceDays - 14) * 1.5;

  return clamp(100 - ownerPenalty - escalationPenalty - evidencePenalty - cadencePenalty);
}

function nextActionFor(input: {
  status: BoardReleaseArchiveGovernanceControlOwnerMatrixStatus;
  title: string;
}) {
  if (input.status === "blocked") {
    return `Repair blocked archive governance control owner matrix for ${input.title}.`;
  }

  if (input.status === "watch") {
    return `Tighten archive governance owner review cadence for ${input.title}.`;
  }

  return `Keep archive governance control ownership ready for ${input.title}.`;
}

function createRows(input: CreateBoardReleaseArchiveGovernanceControlOwnerMatrixInput & { workspaceId: string }) {
  const overrides = new Map((input.ownerOverrides ?? []).map((entry) => [entry.kind, entry]));

  return input.policyCharter.rows
    .map((entry) => {
      const defaults = defaultOwner({ row: entry });
      const override = overrides.get(entry.kind);
      const accountableOwner = override?.accountableOwner ?? defaults.accountableOwner;
      const escalationPath = override?.escalationPath ?? defaults.escalationPath;
      const evidenceObligation = override?.evidenceObligation ?? defaults.evidenceObligation;
      const reviewCadenceDays = Math.max(0, Math.round(override?.reviewCadenceDays ?? defaults.reviewCadenceDays));
      const status = statusFor({
        accountableOwner,
        charterStatus: entry.status,
        escalationPath,
        evidenceObligation,
        reviewCadenceDays,
      });
      const matrixScore = scoreFor({
        accountableOwner,
        escalationPath,
        evidenceObligation,
        reviewCadenceDays,
        status,
      });
      const ownerHash = sha256({
        accountableOwner,
        charterHash: entry.policyHash,
        escalationPath,
        evidenceObligation,
        kind: entry.kind,
        matrixScore,
        reviewCadenceDays,
        status,
      });

      return {
        accountableOwner,
        charterHash: entry.policyHash,
        escalationPath,
        evidenceObligation,
        id: `archive-governance-control-owner:${slug(input.workspaceId)}:${entry.kind}`,
        kind: entry.kind,
        matrixScore,
        nextAction: nextActionFor({
          status,
          title: entry.title,
        }),
        ownerHash,
        reviewCadenceDays,
        status,
        title: entry.title,
      } satisfies BoardReleaseArchiveGovernanceControlOwnerMatrixRow;
    })
    .sort((first, second) => statusRank[first.status] - statusRank[second.status] || kindRank[first.kind] - kindRank[second.kind] || first.title.localeCompare(second.title));
}

function createCsv(rows: BoardReleaseArchiveGovernanceControlOwnerMatrixRow[]) {
  const header = [
    "owner_id",
    "kind",
    "title",
    "status",
    "accountable_owner",
    "escalation_path",
    "review_cadence",
    "evidence_obligation",
    "matrix_score",
    "owner_hash",
    "next_action",
  ];
  const body = rows.map((entry) =>
    [
      entry.id,
      entry.kind,
      entry.title,
      entry.status,
      entry.accountableOwner,
      entry.escalationPath,
      entry.reviewCadenceDays,
      entry.evidenceObligation,
      entry.matrixScore,
      entry.ownerHash,
      entry.nextAction,
    ]
      .map(csvCell)
      .join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function summarize(rows: BoardReleaseArchiveGovernanceControlOwnerMatrixRow[]): BoardReleaseArchiveGovernanceControlOwnerMatrixReport["summary"] {
  const blockedCount = rows.filter((entry) => entry.status === "blocked").length;
  const readyCount = rows.filter((entry) => entry.status === "ready").length;
  const watchCount = rows.filter((entry) => entry.status === "watch").length;
  const status: BoardReleaseArchiveGovernanceControlOwnerMatrixStatus = blockedCount > 0 ? "blocked" : watchCount > 0 ? "watch" : "ready";
  const nextRow = rows.find((entry) => entry.status === "blocked") ?? rows.find((entry) => entry.status === "watch") ?? rows[0] ?? null;

  return {
    blockedCount,
    matrixHash: sha256(rows.map((entry) => entry.ownerHash)),
    matrixScore: rows.length > 0 ? Math.round(rows.reduce((total, entry) => total + entry.matrixScore, 0) / rows.length) : 100,
    nextAction: status === "ready" ? "Archive governance control owner matrix is ready." : (nextRow?.nextAction ?? "Review archive governance control owner matrix."),
    readyCount,
    rowCount: rows.length,
    status,
    watchCount,
  };
}

function createJson(input: {
  generatedAt: string;
  rows: BoardReleaseArchiveGovernanceControlOwnerMatrixRow[];
  summary: BoardReleaseArchiveGovernanceControlOwnerMatrixReport["summary"];
  workspaceId: string;
}) {
  return JSON.stringify(input, null, 2);
}

export function createBoardReleaseArchiveGovernanceControlOwnerMatrix(
  input: CreateBoardReleaseArchiveGovernanceControlOwnerMatrixInput,
): BoardReleaseArchiveGovernanceControlOwnerMatrixReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.policyCharter.workspaceId;
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
  const fileBase = `${slug(workspaceId)}-board-release-archive-governance-control-owner-matrix-${dateStamp(generatedAt)}`;

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
