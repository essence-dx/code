import type { BoardAssuranceEvidenceBundleFile, BoardAssuranceEvidenceBundleReport, BoardAssuranceEvidenceBundleStatus } from "@/features/projects/board-assurance-evidence-bundle";
import type { BoardAssuranceExceptionWorkflowReport, BoardAssuranceExceptionWorkflowRow } from "@/features/projects/board-assurance-exceptions";
import type { BoardDecisionReplayAuditReport, BoardDecisionReplayAuditRow } from "@/features/projects/board-decision-replay-audit";

export type BoardEvidenceAcceptanceKind = "bundle-file" | "exception-scope" | "replay-blocker";
export type BoardEvidenceAcceptanceStatus = "accepted" | "blocked" | "pending" | "watch";
export type BoardEvidenceAcceptanceAttestationStatus = "accepted" | "blocked" | "missing" | "not-required";

export interface BoardEvidenceAcceptanceAttestation {
  acceptedAt: string | null;
  acceptedBy: string | null;
  note: string;
  scopeId: string;
  status: Extract<BoardEvidenceAcceptanceAttestationStatus, "accepted" | "blocked">;
}

export interface BoardEvidenceAcceptanceRow {
  acceptedAt: string | null;
  acceptedBy: string | null;
  attestationNote: string | null;
  attestationStatus: BoardEvidenceAcceptanceAttestationStatus;
  detail: string;
  evidenceHash: string | null;
  kind: BoardEvidenceAcceptanceKind;
  nextAction: string;
  owner: string;
  scopeId: string;
  sourceStatus: string;
  status: BoardEvidenceAcceptanceStatus;
  title: string;
}

export interface BoardEvidenceAcceptanceCampaignReport {
  campaignId: string;
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  rows: BoardEvidenceAcceptanceRow[];
  summary: {
    acceptanceScore: number;
    acceptedCount: number;
    blockedCount: number;
    pendingCount: number;
    scopeCount: number;
    status: BoardEvidenceAcceptanceStatus;
    watchCount: number;
    nextAction: string;
  };
  workspaceId: string;
}

export interface CreateBoardEvidenceAcceptanceCampaignInput {
  attestations?: BoardEvidenceAcceptanceAttestation[];
  evidenceBundle: BoardAssuranceEvidenceBundleReport;
  exceptionWorkflow?: BoardAssuranceExceptionWorkflowReport | null;
  generatedAt?: string;
  replayAudit: BoardDecisionReplayAuditReport;
  workspaceId?: string;
}

const statusRank: Record<BoardEvidenceAcceptanceStatus, number> = {
  blocked: 0,
  pending: 1,
  watch: 2,
  accepted: 3,
};

const statusScore: Record<BoardEvidenceAcceptanceStatus, number> = {
  accepted: 100,
  blocked: 0,
  pending: 50,
  watch: 70,
};

function csvCell(value: string | number | null) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function encodeCsvDataUri(csvContent: string) {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`;
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

function campaignId(workspaceId: string, generatedAt: string) {
  return `board-evidence-acceptance-${slug(workspaceId)}-${dateStamp(generatedAt)}`;
}

function acceptanceStatusFromEvidence(status: BoardAssuranceEvidenceBundleStatus): BoardEvidenceAcceptanceStatus {
  if (status === "blocked") {
    return "blocked";
  }

  return status === "watch" ? "watch" : "accepted";
}

function statusFromAttestation(input: {
  attestation: BoardEvidenceAcceptanceAttestation | null;
  defaultStatus: BoardEvidenceAcceptanceStatus;
  requiresAttestation: boolean;
}) {
  if (input.attestation?.status === "blocked") {
    return {
      attestationStatus: "blocked" as const,
      status: "blocked" as const,
    };
  }

  if (input.attestation?.status === "accepted") {
    return {
      attestationStatus: "accepted" as const,
      status: "accepted" as const,
    };
  }

  if (input.requiresAttestation && input.defaultStatus === "accepted") {
    return {
      attestationStatus: "missing" as const,
      status: "pending" as const,
    };
  }

  return {
    attestationStatus: input.requiresAttestation ? ("missing" as const) : ("not-required" as const),
    status: input.defaultStatus,
  };
}

function fileScopeId(file: BoardAssuranceEvidenceBundleFile) {
  return `file:${file.kind}:${file.path}`;
}

function replayScopeId(row: BoardDecisionReplayAuditRow) {
  return `replay:${row.id}`;
}

function exceptionScopeId(row: BoardAssuranceExceptionWorkflowRow) {
  return `exception:${row.scopeId}`;
}

function ownerForKind(kind: BoardEvidenceAcceptanceKind) {
  if (kind === "bundle-file") {
    return "Evidence owner";
  }

  return kind === "replay-blocker" ? "Release owner" : "Exception owner";
}

function rowNextAction(input: {
  attestationStatus: BoardEvidenceAcceptanceAttestationStatus;
  defaultAction: string;
  status: BoardEvidenceAcceptanceStatus;
}) {
  if (input.attestationStatus === "missing") {
    return "Collect owner attestation before closing this board evidence scope.";
  }

  if (input.attestationStatus === "blocked") {
    return "Resolve the owner-blocked attestation before board review closeout.";
  }

  if (input.status === "accepted") {
    return "Keep the owner attestation with the board review packet.";
  }

  return input.defaultAction;
}

function fileRows(input: {
  attestationsByScopeId: Map<string, BoardEvidenceAcceptanceAttestation>;
  evidenceBundle: BoardAssuranceEvidenceBundleReport;
}): BoardEvidenceAcceptanceRow[] {
  return input.evidenceBundle.files.map((file) => {
    const scopeId = fileScopeId(file);
    const attestation = input.attestationsByScopeId.get(scopeId) ?? null;
    const defaultStatus = acceptanceStatusFromEvidence(file.status);
    const status = statusFromAttestation({
      attestation,
      defaultStatus,
      requiresAttestation: true,
    });

    return {
      acceptedAt: attestation?.acceptedAt ?? null,
      acceptedBy: attestation?.acceptedBy ?? null,
      attestationNote: attestation?.note ?? null,
      attestationStatus: status.attestationStatus,
      detail: `${file.recordCount} record${file.recordCount === 1 ? "" : "s"} in ${file.path}.`,
      evidenceHash: file.contentHash,
      kind: "bundle-file",
      nextAction: rowNextAction({
        attestationStatus: status.attestationStatus,
        defaultAction: file.nextAction,
        status: status.status,
      }),
      owner: ownerForKind("bundle-file"),
      scopeId,
      sourceStatus: file.status,
      status: status.status,
      title: file.label,
    };
  });
}

function replayRows(input: {
  attestationsByScopeId: Map<string, BoardEvidenceAcceptanceAttestation>;
  replayAudit: BoardDecisionReplayAuditReport;
}): BoardEvidenceAcceptanceRow[] {
  return input.replayAudit.rows
    .filter((row) => row.status !== "ready")
    .map((row) => {
      const scopeId = replayScopeId(row);
      const attestation = input.attestationsByScopeId.get(scopeId) ?? null;
      const defaultStatus = row.status === "blocked" ? "blocked" : "watch";
      const status = statusFromAttestation({
        attestation,
        defaultStatus,
        requiresAttestation: true,
      });

      return {
        acceptedAt: attestation?.acceptedAt ?? null,
        acceptedBy: attestation?.acceptedBy ?? null,
        attestationNote: attestation?.note ?? null,
        attestationStatus: status.attestationStatus,
        detail: row.detail,
        evidenceHash: null,
        kind: "replay-blocker",
        nextAction: rowNextAction({
          attestationStatus: status.attestationStatus,
          defaultAction: row.nextAction,
          status: status.status,
        }),
        owner: ownerForKind("replay-blocker"),
        scopeId,
        sourceStatus: row.status,
        status: status.status,
        title: row.title,
      };
    });
}

function exceptionRows(input: {
  attestationsByScopeId: Map<string, BoardEvidenceAcceptanceAttestation>;
  exceptionWorkflow: BoardAssuranceExceptionWorkflowReport | null | undefined;
}): BoardEvidenceAcceptanceRow[] {
  return (input.exceptionWorkflow?.rows ?? []).map((row) => {
    const scopeId = exceptionScopeId(row);
    const attestation = input.attestationsByScopeId.get(scopeId) ?? null;
    const defaultStatus = row.status === "approved" ? "accepted" : row.status === "pending" || row.status === "request-needed" ? "watch" : "blocked";
    const status = statusFromAttestation({
      attestation,
      defaultStatus,
      requiresAttestation: row.status !== "approved",
    });
    const attestationStatus = row.status === "approved" && !attestation ? "accepted" : status.attestationStatus;

    return {
      acceptedAt: attestation?.acceptedAt ?? row.signedOffAt,
      acceptedBy: attestation?.acceptedBy ?? row.signedOffBy,
      attestationNote: attestation?.note ?? row.approverNote ?? row.ownerNote,
      attestationStatus,
      detail: row.evidence,
      evidenceHash: null,
      kind: "exception-scope",
      nextAction: rowNextAction({
        attestationStatus,
        defaultAction: row.nextAction,
        status: status.status,
      }),
      owner: ownerForKind("exception-scope"),
      scopeId,
      sourceStatus: row.status,
      status: status.status,
      title: row.title,
    };
  });
}

function sortRows(rows: BoardEvidenceAcceptanceRow[]) {
  return [...rows].sort(
    (first, second) =>
      statusRank[first.status] - statusRank[second.status] ||
      first.kind.localeCompare(second.kind) ||
      first.title.localeCompare(second.title) ||
      first.scopeId.localeCompare(second.scopeId),
  );
}

function createSummary(rows: BoardEvidenceAcceptanceRow[]): BoardEvidenceAcceptanceCampaignReport["summary"] {
  const acceptedCount = rows.filter((row) => row.status === "accepted").length;
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const pendingCount = rows.filter((row) => row.status === "pending").length;
  const watchCount = rows.filter((row) => row.status === "watch").length;
  const status: BoardEvidenceAcceptanceStatus = blockedCount > 0 ? "blocked" : pendingCount > 0 ? "pending" : watchCount > 0 ? "watch" : "accepted";
  const nextRow = rows[0] ?? null;

  return {
    acceptanceScore: rows.length > 0 ? Math.round(rows.reduce((sum, row) => sum + statusScore[row.status], 0) / rows.length) : 100,
    acceptedCount,
    blockedCount,
    nextAction:
      status === "accepted"
        ? "Archive accepted board evidence attestations with the review packet."
        : (nextRow?.nextAction ?? "Accept or unblock board evidence before review closeout."),
    pendingCount,
    scopeCount: rows.length,
    status,
    watchCount,
  };
}

function createCsv(rows: BoardEvidenceAcceptanceRow[]) {
  const header = ["scope_id", "kind", "status", "attestation_status", "title", "owner", "next_action"];
  const body = rows.map((row) => [row.scopeId, row.kind, row.status, row.attestationStatus, row.title, row.owner, row.nextAction].map(csvCell).join(","));

  return `${[header.join(","), ...body].join("\n")}\n`;
}

export function createBoardEvidenceAcceptanceCampaign(input: CreateBoardEvidenceAcceptanceCampaignInput): BoardEvidenceAcceptanceCampaignReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.evidenceBundle.workspaceId;
  const attestationsByScopeId = new Map((input.attestations ?? []).map((attestation) => [attestation.scopeId, attestation]));
  const rows = sortRows([
    ...fileRows({
      attestationsByScopeId,
      evidenceBundle: input.evidenceBundle,
    }),
    ...replayRows({
      attestationsByScopeId,
      replayAudit: input.replayAudit,
    }),
    ...exceptionRows({
      attestationsByScopeId,
      exceptionWorkflow: input.exceptionWorkflow,
    }),
  ]);
  const csvContent = createCsv(rows);

  return {
    campaignId: campaignId(workspaceId, generatedAt),
    csvContent,
    csvDataUri: encodeCsvDataUri(csvContent),
    csvFileName: `${slug(workspaceId)}-board-evidence-acceptance-${dateStamp(generatedAt)}.csv`,
    generatedAt,
    rows,
    summary: createSummary(rows),
    workspaceId,
  };
}
