import { createHash } from "node:crypto";
import type {
  BoardReleaseCloseoutArchiveManifest,
  BoardReleaseCloseoutArchiveManifestReport,
} from "@/features/projects/board-release-closeout-archive-manifests";
import type {
  BoardReleaseCloseoutOwnerAcknowledgement,
  BoardReleaseCloseoutOwnerAcknowledgementReport,
} from "@/features/projects/board-release-closeout-owner-acknowledgements";
import type { WorkspaceMemberRow, WorkspaceRole } from "@/features/workspaces/types";

export type BoardReleaseCloseoutVarianceRemediationSeverity = "critical" | "high" | "medium";
export type BoardReleaseCloseoutVarianceRemediationSource = "acknowledgement" | "manifest";
export type BoardReleaseCloseoutVarianceRemediationStatus = "blocked" | "completed" | "open";

export interface BoardReleaseCloseoutVarianceRemediationPlan {
  completionEvidenceHash: string | null;
  dueAt: string;
  nextAction: string;
  ownerEmail: string | null;
  ownerName: string;
  ownerRole: WorkspaceRole;
  ownerUserId: string | null;
  planHash: string;
  planId: string;
  severity: BoardReleaseCloseoutVarianceRemediationSeverity;
  sourceHash: string;
  sourceId: string;
  sourceKind: string;
  sourceStatus: string;
  sourceType: BoardReleaseCloseoutVarianceRemediationSource;
  status: BoardReleaseCloseoutVarianceRemediationStatus;
  workspaceId: string;
}

export interface BoardReleaseCloseoutVarianceRemediationReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  plans: BoardReleaseCloseoutVarianceRemediationPlan[];
  summary: {
    blockedCount: number;
    completedCount: number;
    criticalCount: number;
    nextAction: string;
    openCount: number;
    overdueCount: number;
    planCount: number;
    remediationHash: string;
    status: "blocked" | "ready" | "watch";
  };
  workspaceId: string;
}

export interface CreateBoardReleaseCloseoutVarianceRemediationReportInput {
  archiveManifests: BoardReleaseCloseoutArchiveManifestReport;
  generatedAt?: string;
  members: WorkspaceMemberRow[];
  ownerAcknowledgements: BoardReleaseCloseoutOwnerAcknowledgementReport;
  workspaceId?: string;
}

const statusRank: Record<BoardReleaseCloseoutVarianceRemediationStatus, number> = {
  blocked: 0,
  open: 1,
  completed: 2,
};

const severityRank: Record<BoardReleaseCloseoutVarianceRemediationSeverity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
};

const manifestRoleMap: Record<BoardReleaseCloseoutArchiveManifest["manifestKind"], WorkspaceRole> = {
  distribution: "admin",
  evidence: "admin",
  observability: "owner",
  operations: "owner",
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

function addHours(value: string, hours: number) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  date.setUTCHours(date.getUTCHours() + hours);

  return date.toISOString();
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

function ownerName(member: WorkspaceMemberRow | null) {
  return member?.name?.trim() || member?.email?.trim() || "Unassigned owner";
}

function findOwner(members: WorkspaceMemberRow[], role: WorkspaceRole) {
  return (
    members.find((member) => member.role === role) ??
    members.find((member) => member.role === "owner") ??
    members.find((member) => member.role === "admin") ??
    members[0] ??
    null
  );
}

function severityFromStatus(status: string): BoardReleaseCloseoutVarianceRemediationSeverity {
  if (status === "blocked") {
    return "critical";
  }

  return status === "watch" || status === "due" ? "high" : "medium";
}

function planStatus(status: string): BoardReleaseCloseoutVarianceRemediationStatus {
  if (status === "blocked") {
    return "blocked";
  }

  return status === "watch" || status === "due" ? "open" : "completed";
}

function dueAt(generatedAt: string, severity: BoardReleaseCloseoutVarianceRemediationSeverity) {
  if (severity === "critical") {
    return addHours(generatedAt, 24);
  }

  return severity === "high" ? addHours(generatedAt, 72) : generatedAt;
}

function planId(input: {
  generatedAt: string;
  sourceId: string;
  sourceType: BoardReleaseCloseoutVarianceRemediationSource;
  workspaceId: string;
}) {
  return `board-release-closeout-remediation:${slug(input.workspaceId)}:${input.sourceType}:${slug(input.sourceId)}:${dateStamp(input.generatedAt)}`;
}

function createPlan(input: {
  generatedAt: string;
  nextAction: string;
  owner: WorkspaceMemberRow | null;
  ownerRole: WorkspaceRole;
  sourceHash: string;
  sourceId: string;
  sourceKind: string;
  sourceStatus: string;
  sourceType: BoardReleaseCloseoutVarianceRemediationSource;
  workspaceId: string;
}): BoardReleaseCloseoutVarianceRemediationPlan {
  const severity = severityFromStatus(input.sourceStatus);
  const status = planStatus(input.sourceStatus);
  const id = planId({
    generatedAt: input.generatedAt,
    sourceId: input.sourceId,
    sourceType: input.sourceType,
    workspaceId: input.workspaceId,
  });
  const due = dueAt(input.generatedAt, severity);
  const completionEvidenceHash =
    status === "completed"
      ? sha256({
          sourceHash: input.sourceHash,
          sourceId: input.sourceId,
          sourceStatus: input.sourceStatus,
        })
      : null;
  const planHash = sha256({
    completionEvidenceHash,
    due,
    id,
    ownerRole: input.ownerRole,
    ownerUserId: input.owner?.userId ?? null,
    severity,
    sourceHash: input.sourceHash,
    status,
  });

  return {
    completionEvidenceHash,
    dueAt: due,
    nextAction: status === "completed" ? "Completion evidence is attached for this closeout source." : input.nextAction,
    ownerEmail: input.owner?.email ?? null,
    ownerName: ownerName(input.owner),
    ownerRole: input.ownerRole,
    ownerUserId: input.owner?.userId ?? null,
    planHash,
    planId: id,
    severity,
    sourceHash: input.sourceHash,
    sourceId: input.sourceId,
    sourceKind: input.sourceKind,
    sourceStatus: input.sourceStatus,
    sourceType: input.sourceType,
    status,
    workspaceId: input.workspaceId,
  };
}

function manifestPlans(input: {
  archiveManifests: BoardReleaseCloseoutArchiveManifestReport;
  generatedAt: string;
  members: WorkspaceMemberRow[];
  workspaceId: string;
}) {
  return input.archiveManifests.manifests.map((manifest) => {
    const ownerRole = manifestRoleMap[manifest.manifestKind];

    return createPlan({
      generatedAt: input.generatedAt,
      nextAction: manifest.nextAction,
      owner: findOwner(input.members, ownerRole),
      ownerRole,
      sourceHash: manifest.manifestHash,
      sourceId: manifest.manifestId,
      sourceKind: manifest.manifestKind,
      sourceStatus: manifest.status,
      sourceType: "manifest",
      workspaceId: input.workspaceId,
    });
  });
}

function acknowledgementPlans(input: {
  generatedAt: string;
  ownerAcknowledgements: BoardReleaseCloseoutOwnerAcknowledgementReport;
  workspaceId: string;
}) {
  return input.ownerAcknowledgements.acknowledgements.map((acknowledgement) =>
    createPlan({
      generatedAt: input.generatedAt,
      nextAction: acknowledgement.nextAction,
      owner: acknowledgement.signerUserId
        ? {
            email: acknowledgement.signerEmail ?? "",
            id: acknowledgement.signerUserId,
            joinedAt: input.generatedAt,
            name: acknowledgement.signerName ?? acknowledgement.signerEmail ?? "Assigned signer",
            role: acknowledgement.requiredRole,
            userId: acknowledgement.signerUserId,
          }
        : null,
      ownerRole: acknowledgement.requiredRole,
      sourceHash: acknowledgement.acknowledgementHash,
      sourceId: acknowledgement.acknowledgementId,
      sourceKind: acknowledgement.gateKind,
      sourceStatus: acknowledgement.status,
      sourceType: "acknowledgement",
      workspaceId: input.workspaceId,
    }),
  );
}

function createPlans(input: {
  archiveManifests: BoardReleaseCloseoutArchiveManifestReport;
  generatedAt: string;
  members: WorkspaceMemberRow[];
  ownerAcknowledgements: BoardReleaseCloseoutOwnerAcknowledgementReport;
  workspaceId: string;
}) {
  return [
    ...manifestPlans(input),
    ...acknowledgementPlans({
      generatedAt: input.generatedAt,
      ownerAcknowledgements: input.ownerAcknowledgements,
      workspaceId: input.workspaceId,
    }),
  ].sort(
    (first, second) =>
      statusRank[first.status] - statusRank[second.status] ||
      severityRank[first.severity] - severityRank[second.severity] ||
      first.sourceType.localeCompare(second.sourceType) ||
      first.sourceKind.localeCompare(second.sourceKind),
  );
}

function summarize(
  plans: BoardReleaseCloseoutVarianceRemediationPlan[],
): BoardReleaseCloseoutVarianceRemediationReport["summary"] {
  const blockedCount = plans.filter((plan) => plan.status === "blocked").length;
  const openCount = plans.filter((plan) => plan.status === "open").length;
  const firstAttention = plans.find((plan) => plan.status === "blocked" || plan.status === "open") ?? null;
  const remediationHash = sha256(plans.map((plan) => plan.planHash));

  return {
    blockedCount,
    completedCount: plans.filter((plan) => plan.status === "completed").length,
    criticalCount: plans.filter((plan) => plan.severity === "critical").length,
    nextAction: firstAttention?.nextAction ?? "All closeout variance remediation plans have completion evidence attached.",
    openCount,
    overdueCount: 0,
    planCount: plans.length,
    remediationHash,
    status: blockedCount > 0 ? "blocked" : openCount > 0 ? "watch" : "ready",
  };
}

function createCsv(plans: BoardReleaseCloseoutVarianceRemediationPlan[]) {
  const header = [
    "plan_id",
    "source_type",
    "source_kind",
    "source_status",
    "severity",
    "status",
    "owner_name",
    "owner_email",
    "owner_role",
    "due_at",
    "source_hash",
    "completion_evidence_hash",
    "plan_hash",
    "next_action",
  ];
  const body = plans.map((plan) =>
    [
      plan.planId,
      plan.sourceType,
      plan.sourceKind,
      plan.sourceStatus,
      plan.severity,
      plan.status,
      plan.ownerName,
      plan.ownerEmail,
      plan.ownerRole,
      plan.dueAt,
      plan.sourceHash,
      plan.completionEvidenceHash,
      plan.planHash,
      plan.nextAction,
    ]
      .map(csvCell)
      .join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function createJson(input: {
  generatedAt: string;
  plans: BoardReleaseCloseoutVarianceRemediationPlan[];
  summary: BoardReleaseCloseoutVarianceRemediationReport["summary"];
  workspaceId: string;
}) {
  return JSON.stringify(
    {
      generatedAt: input.generatedAt,
      plans: input.plans,
      summary: input.summary,
      workspaceId: input.workspaceId,
    },
    null,
    2,
  );
}

export function createBoardReleaseCloseoutVarianceRemediationReport(
  input: CreateBoardReleaseCloseoutVarianceRemediationReportInput,
): BoardReleaseCloseoutVarianceRemediationReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.archiveManifests.workspaceId;
  const plans = createPlans({
    archiveManifests: input.archiveManifests,
    generatedAt,
    members: input.members,
    ownerAcknowledgements: input.ownerAcknowledgements,
    workspaceId,
  });
  const summary = summarize(plans);
  const csvContent = createCsv(plans);
  const jsonContent = createJson({
    generatedAt,
    plans,
    summary,
    workspaceId,
  });
  const fileBase = `${slug(workspaceId)}-board-release-closeout-variance-remediation-${dateStamp(generatedAt)}`;

  return {
    csvContent,
    csvDataUri: encodeCsvDataUri(csvContent),
    csvFileName: `${fileBase}.csv`,
    generatedAt,
    jsonContent,
    jsonDataUri: encodeJsonDataUri(jsonContent),
    jsonFileName: `${fileBase}.json`,
    plans,
    summary,
    workspaceId,
  };
}
