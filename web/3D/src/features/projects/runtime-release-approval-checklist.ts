import { createHash } from "node:crypto";
import type { RuntimeReleaseGate, RuntimeReleaseGateId, RuntimeReleaseGatesReport } from "@/features/projects/runtime-release-gates";

export type RuntimeReleaseApprovalChecklistStatus = "approved" | "blocked" | "expired" | "pending";
export type RuntimeReleaseApprovalExpirationStatus = "active" | "expired" | "missing";

export interface RuntimeReleaseApprovalReviewer {
  email?: string | null;
  name?: string | null;
  role?: string | null;
  userId?: string | null;
}

export interface RuntimeReleaseApprovalChecklistRow {
  approvalNote: string;
  evidenceHash: string;
  gateId: RuntimeReleaseGateId;
  gateLabel: string;
  gateStatus: RuntimeReleaseGate["status"];
  reviewerEmail: string | null;
  reviewerName: string;
  status: RuntimeReleaseApprovalChecklistStatus;
}

export interface RuntimeReleaseApprovalChecklist {
  approvalNotes: string | null;
  approvedAt: string | null;
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  expiresAt: string | null;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  releaseCandidateId: string;
  rows: RuntimeReleaseApprovalChecklistRow[];
  summary: {
    approvalHash: string;
    approvalScore: number;
    blockedGateCount: number;
    expirationStatus: RuntimeReleaseApprovalExpirationStatus;
    nextAction: string;
    releaseGateHash: string;
    reviewerEmail: string | null;
    reviewerName: string;
    status: RuntimeReleaseApprovalChecklistStatus;
  };
  workspaceId: string;
}

export interface CreateRuntimeReleaseApprovalChecklistInput {
  approvalNotes?: string | null;
  approvedAt?: string | null;
  expiresAt?: string | null;
  generatedAt?: string;
  releaseCandidateId?: string;
  reviewer?: RuntimeReleaseApprovalReviewer | null;
  runtimeReleaseGates: RuntimeReleaseGatesReport;
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

function normalizedReviewer(reviewer?: RuntimeReleaseApprovalReviewer | null) {
  const name = reviewer?.name?.trim() || "Unassigned";

  return {
    email: reviewer?.email?.trim() || null,
    name,
    role: reviewer?.role?.trim() || null,
    userId: reviewer?.userId?.trim() || null,
  };
}

function expirationStatus(expiresAt: string | null, generatedAt: string): RuntimeReleaseApprovalExpirationStatus {
  if (!expiresAt) {
    return "missing";
  }

  const expires = new Date(expiresAt).getTime();
  const generated = new Date(generatedAt).getTime();

  if (Number.isNaN(expires) || Number.isNaN(generated)) {
    return "missing";
  }

  return expires <= generated ? "expired" : "active";
}

function hasApprovalIntent(input: {
  approvalNotes: string | null;
  approvedAt: string | null;
  expiration: RuntimeReleaseApprovalExpirationStatus;
  reviewerName: string;
}) {
  return Boolean(input.approvedAt && input.approvalNotes?.trim() && input.expiration === "active" && input.reviewerName !== "Unassigned");
}

function checklistStatus(input: {
  approvalNotes: string | null;
  approvedAt: string | null;
  blockedGateCount: number;
  expiration: RuntimeReleaseApprovalExpirationStatus;
  reviewerName: string;
}): RuntimeReleaseApprovalChecklistStatus {
  if (input.expiration === "expired") {
    return "expired";
  }

  if (input.blockedGateCount > 0) {
    return "blocked";
  }

  return hasApprovalIntent(input) ? "approved" : "pending";
}

function nextActionFor(status: RuntimeReleaseApprovalChecklistStatus) {
  if (status === "approved") {
    return "Runtime release approval is active and linked to the current gate evidence.";
  }

  if (status === "expired") {
    return "Renew runtime release approval before production handoff.";
  }

  if (status === "blocked") {
    return "Resolve blocked runtime gates before approving this release candidate.";
  }

  return "Assign a reviewer, capture approval notes, and set an active expiry window.";
}

function rowStatus(gateStatus: RuntimeReleaseGate["status"], summaryStatus: RuntimeReleaseApprovalChecklistStatus): RuntimeReleaseApprovalChecklistStatus {
  if (summaryStatus === "expired") {
    return "expired";
  }

  if (gateStatus === "blocked") {
    return "blocked";
  }

  return summaryStatus === "approved" ? "approved" : "pending";
}

function createRows(input: {
  approvalNote: string;
  gates: RuntimeReleaseGate[];
  reviewerEmail: string | null;
  reviewerName: string;
  summaryStatus: RuntimeReleaseApprovalChecklistStatus;
}) {
  return input.gates.map((gate): RuntimeReleaseApprovalChecklistRow => ({
    approvalNote: input.approvalNote,
    evidenceHash: gate.evidenceHash,
    gateId: gate.id,
    gateLabel: gate.label,
    gateStatus: gate.status,
    reviewerEmail: input.reviewerEmail,
    reviewerName: input.reviewerName,
    status: rowStatus(gate.status, input.summaryStatus),
  }));
}

function createCsv(rows: RuntimeReleaseApprovalChecklistRow[]) {
  const header = ["gate", "gate_status", "approval_status", "reviewer", "reviewer_email", "evidence_hash", "approval_note"];
  const body = rows.map((row) =>
    [row.gateId, row.gateStatus, row.status, row.reviewerName, row.reviewerEmail, row.evidenceHash, row.approvalNote].map(csvCell).join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function scoreFor(status: RuntimeReleaseApprovalChecklistStatus, gateScore: number) {
  if (status === "approved") {
    return 100;
  }

  if (status === "pending") {
    return Math.max(0, Math.min(75, Math.round(gateScore * 0.75)));
  }

  if (status === "expired") {
    return Math.max(0, Math.min(65, Math.round(gateScore * 0.65)));
  }

  return Math.max(0, Math.min(60, Math.round(gateScore)));
}

export function createRuntimeReleaseApprovalChecklist(input: CreateRuntimeReleaseApprovalChecklistInput): RuntimeReleaseApprovalChecklist {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? "workspace";
  const releaseCandidateId = input.releaseCandidateId ?? `runtime-release:${dateStamp(generatedAt)}`;
  const approvalNotes = input.approvalNotes?.trim() || null;
  const approvedAt = input.approvedAt ?? null;
  const expiresAt = input.expiresAt ?? null;
  const reviewer = normalizedReviewer(input.reviewer);
  const expiration = expirationStatus(expiresAt, generatedAt);
  const blockedGateCount = input.runtimeReleaseGates.gates.filter((gate) => gate.status === "blocked").length;
  const status = checklistStatus({
    approvalNotes,
    approvedAt,
    blockedGateCount,
    expiration,
    reviewerName: reviewer.name,
  });
  const rows = createRows({
    approvalNote: approvalNotes ?? "",
    gates: input.runtimeReleaseGates.gates,
    reviewerEmail: reviewer.email,
    reviewerName: reviewer.name,
    summaryStatus: status,
  });
  const approvalHash = sha256({
    approvalNotes,
    approvedAt,
    expiresAt,
    releaseCandidateId,
    releaseGateHash: input.runtimeReleaseGates.summary.releaseGateHash,
    reviewer,
    status,
  });
  const summary = {
    approvalHash,
    approvalScore: scoreFor(status, input.runtimeReleaseGates.summary.releaseGateScore),
    blockedGateCount,
    expirationStatus: expiration,
    nextAction: nextActionFor(status),
    releaseGateHash: input.runtimeReleaseGates.summary.releaseGateHash,
    reviewerEmail: reviewer.email,
    reviewerName: reviewer.name,
    status,
  };
  const csvContent = createCsv(rows);
  const jsonContent = JSON.stringify(
    {
      approvalNotes,
      approvedAt,
      expiresAt,
      generatedAt,
      releaseCandidateId,
      rows,
      summary,
      workspaceId,
    },
    null,
    2,
  );
  const fileBase = `${slug(workspaceId)}-runtime-release-approval-checklist-${dateStamp(generatedAt)}`;

  return {
    approvalNotes,
    approvedAt,
    csvContent,
    csvDataUri: encodeDataUri("text/csv", csvContent),
    csvFileName: `${fileBase}.csv`,
    expiresAt,
    generatedAt,
    jsonContent,
    jsonDataUri: encodeDataUri("application/json", jsonContent),
    jsonFileName: `${fileBase}.json`,
    releaseCandidateId,
    rows,
    summary,
    workspaceId,
  };
}
