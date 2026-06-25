import { createHash } from "node:crypto";
import type { RuntimeReleaseApprovalChecklist, RuntimeReleaseApprovalChecklistStatus } from "@/features/projects/runtime-release-approval-checklist";
import type { RuntimeReleaseCandidateComparison, RuntimeReleaseCandidateComparisonStatus } from "@/features/projects/runtime-release-candidate-comparison";

export type RuntimeReleaseOperatorWorkflowVerificationStatus = "blocked" | "ready";
export type RuntimeReleaseOperatorWorkflowVerificationKind = "approval-transition" | "candidate-diff-summary" | "stale-approval-invalidation";

export interface RuntimeReleaseOperatorWorkflowVerificationRow {
  evidenceHash: string;
  id: string;
  kind: RuntimeReleaseOperatorWorkflowVerificationKind;
  nextAction: string;
  scenarioCount: number;
  scenarioIds: string[];
  status: RuntimeReleaseOperatorWorkflowVerificationStatus;
  verificationHash: string;
}

export interface RuntimeReleaseOperatorWorkflowVerificationReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  rows: RuntimeReleaseOperatorWorkflowVerificationRow[];
  summary: {
    blockedCoverageCount: number;
    coverageScore: number;
    diffSummaryCount: number;
    nextAction: string;
    staleInvalidationCount: number;
    status: RuntimeReleaseOperatorWorkflowVerificationStatus;
    transitionCoverageCount: number;
    verificationHash: string;
  };
  workspaceId: string;
}

export interface CreateRuntimeReleaseOperatorWorkflowVerificationInput {
  approvalScenarios: RuntimeReleaseApprovalChecklist[];
  comparisonScenarios: RuntimeReleaseCandidateComparison[];
  generatedAt?: string;
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
  return `sha256:${createHash("sha256").update(typeof value === "string" ? value : stableJson(value)).digest("hex")}`;
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

function encodeDataUri(mimeType: string, content: string) {
  return `data:${mimeType};charset=utf-8,${encodeURIComponent(content)}`;
}

function approvalMatches(scenario: RuntimeReleaseApprovalChecklist, status: RuntimeReleaseApprovalChecklistStatus) {
  if (scenario.summary.status !== status) {
    return false;
  }

  if (status === "expired") {
    return scenario.summary.expirationStatus === "expired";
  }

  if (status === "blocked") {
    return scenario.summary.blockedGateCount > 0;
  }

  return true;
}

function comparisonMatches(scenario: RuntimeReleaseCandidateComparison, status: RuntimeReleaseCandidateComparisonStatus) {
  if (scenario.summary.status !== status) {
    return false;
  }

  if (status === "blocked") {
    return scenario.summary.regressionCount > 0;
  }

  if (status === "watch") {
    return scenario.summary.diffCount > 0 && scenario.summary.regressionCount === 0;
  }

  return scenario.summary.diffCount === 0;
}

function evidenceHash(values: string[]) {
  const hashes = values.filter(Boolean).sort();

  return hashes.length === 1 ? hashes[0] ?? "sha256:missing" : sha256(hashes);
}

function row(input: {
  hashes: string[];
  id: string;
  kind: RuntimeReleaseOperatorWorkflowVerificationKind;
  missingAction: string;
  readyAction: string;
  scenarioCount: number;
  scenarioIds: string[];
}): RuntimeReleaseOperatorWorkflowVerificationRow {
  const status: RuntimeReleaseOperatorWorkflowVerificationStatus = input.scenarioCount > 0 ? "ready" : "blocked";
  const base = {
    evidenceHash: evidenceHash(input.hashes),
    id: input.id,
    kind: input.kind,
    nextAction: status === "ready" ? input.readyAction : input.missingAction,
    scenarioCount: input.scenarioCount,
    scenarioIds: input.scenarioIds,
    status,
  };

  return {
    ...base,
    verificationHash: sha256(base),
  };
}

const approvalStatuses = ["blocked", "approved", "expired", "pending"] as const satisfies RuntimeReleaseApprovalChecklistStatus[];
const comparisonStatuses = ["blocked", "watch", "ready"] as const satisfies RuntimeReleaseCandidateComparisonStatus[];

function createRows(input: CreateRuntimeReleaseOperatorWorkflowVerificationInput): RuntimeReleaseOperatorWorkflowVerificationRow[] {
  const approvalRows = approvalStatuses.map((status) => {
    const matches = input.approvalScenarios.filter((scenario) => approvalMatches(scenario, status));

    return row({
      hashes: matches.map((scenario) => scenario.summary.approvalHash),
      id: `approval:${status}`,
      kind: status === "expired" ? "stale-approval-invalidation" : "approval-transition",
      missingAction:
        status === "expired"
          ? "Add missing stale approval invalidation coverage for expired approvals."
          : `Add missing approval transition coverage for ${status} approvals.`,
      readyAction:
        status === "expired"
          ? "Expired approvals invalidate stale runtime release approval state."
          : `${status} approval transition is covered by targeted smoke evidence.`,
      scenarioCount: matches.length,
      scenarioIds: matches.map((scenario) => scenario.releaseCandidateId),
    });
  });
  const comparisonRows = comparisonStatuses.map((status) => {
    const matches = input.comparisonScenarios.filter((scenario) => comparisonMatches(scenario, status));

    return row({
      hashes: matches.map((scenario) => scenario.summary.comparisonHash),
      id: `comparison:${status}`,
      kind: "candidate-diff-summary",
      missingAction: `Add missing release candidate diff summary coverage for ${status} comparisons.`,
      readyAction: `${status} release candidate diff summary is covered by targeted smoke evidence.`,
      scenarioCount: matches.length,
      scenarioIds: matches.map((scenario) => scenario.currentReleaseCandidateId),
    });
  });

  return [...approvalRows, ...comparisonRows];
}

function summarize(rows: RuntimeReleaseOperatorWorkflowVerificationRow[]): RuntimeReleaseOperatorWorkflowVerificationReport["summary"] {
  const blockedCoverageCount = rows.filter((row) => row.status === "blocked").length;
  const readyCount = rows.length - blockedCoverageCount;
  const status: RuntimeReleaseOperatorWorkflowVerificationStatus = blockedCoverageCount > 0 ? "blocked" : "ready";

  return {
    blockedCoverageCount,
    coverageScore: Math.max(0, Math.min(100, Math.round((readyCount / Math.max(1, rows.length)) * 100))),
    diffSummaryCount: rows.filter((row) => row.kind === "candidate-diff-summary" && row.status === "ready").length,
    nextAction:
      status === "ready"
        ? "Runtime release operator workflow smoke coverage is complete."
        : "Add missing targeted smoke scenarios for blocked workflow coverage rows.",
    staleInvalidationCount: rows.filter((row) => row.kind === "stale-approval-invalidation" && row.status === "ready").length,
    status,
    transitionCoverageCount: rows.filter((row) => row.id.startsWith("approval:") && row.status === "ready").length,
    verificationHash: sha256(rows.map((row) => row.verificationHash)),
  };
}

function createCsv(rows: RuntimeReleaseOperatorWorkflowVerificationRow[]) {
  const header = ["verification_id", "kind", "status", "scenario_count", "evidence_hash", "next_action"];
  const body = rows.map((row) => [row.id, row.kind, row.status, row.scenarioCount, row.evidenceHash, row.nextAction].map(csvCell).join(","));

  return `${[header.join(","), ...body].join("\n")}\n`;
}

export function createRuntimeReleaseOperatorWorkflowVerification(
  input: CreateRuntimeReleaseOperatorWorkflowVerificationInput,
): RuntimeReleaseOperatorWorkflowVerificationReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? "workspace";
  const rows = createRows(input);
  const summary = summarize(rows);
  const csvContent = createCsv(rows);
  const jsonContent = JSON.stringify(
    {
      generatedAt,
      rows,
      summary,
      workspaceId,
    },
    null,
    2,
  );
  const fileBase = `${slug(workspaceId)}-runtime-release-operator-workflow-verification-${dateStamp(generatedAt)}`;

  return {
    csvContent,
    csvDataUri: encodeDataUri("text/csv", csvContent),
    csvFileName: `${fileBase}.csv`,
    generatedAt,
    jsonContent,
    jsonDataUri: encodeDataUri("application/json", jsonContent),
    jsonFileName: `${fileBase}.json`,
    rows,
    summary,
    workspaceId,
  };
}
