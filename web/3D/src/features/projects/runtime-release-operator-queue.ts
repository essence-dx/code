import { createHash } from "node:crypto";
import type { RuntimeReleaseApprovalChecklist } from "@/features/projects/runtime-release-approval-checklist";
import type { RuntimeReleaseGate, RuntimeReleaseGateId, RuntimeReleaseGatesReport } from "@/features/projects/runtime-release-gates";

export type RuntimeReleaseOperatorQueueStatus = "blocked" | "overdue" | "ready" | "unassigned";
export type RuntimeReleaseOperatorQueueDownloadId = "approval-checklist-csv" | "approval-checklist-json" | "runtime-gates-csv" | "runtime-gates-json";

export interface RuntimeReleaseOperatorAssignment {
  dueAt?: string | null;
  ownerEmail?: string | null;
  ownerName?: string | null;
}

export interface RuntimeReleaseOperatorQueueDownload {
  download: string;
  href: string;
  id: RuntimeReleaseOperatorQueueDownloadId;
  label: string;
}

export interface RuntimeReleaseOperatorQueueRow {
  blockerCount: number;
  downloadCount: number;
  downloads: RuntimeReleaseOperatorQueueDownload[];
  dueAt: string | null;
  evidenceHash: string;
  gateId: RuntimeReleaseGateId;
  gateLabel: string;
  nextAction: string;
  ownerEmail: string | null;
  ownerName: string;
  queueRowHash: string;
  status: RuntimeReleaseOperatorQueueStatus;
}

export interface RuntimeReleaseOperatorQueue {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  releaseCandidateId: string;
  rows: RuntimeReleaseOperatorQueueRow[];
  summary: {
    assignedCount: number;
    blockedCount: number;
    nextAction: string;
    overdueCount: number;
    queueHash: string;
    queueScore: number;
    readyCount: number;
    rowCount: number;
    status: RuntimeReleaseOperatorQueueStatus;
    unassignedCount: number;
  };
  workspaceId: string;
}

export interface CreateRuntimeReleaseOperatorQueueInput {
  approvalChecklist: RuntimeReleaseApprovalChecklist;
  assignments?: Partial<Record<RuntimeReleaseGateId, RuntimeReleaseOperatorAssignment>>;
  generatedAt?: string;
  releaseCandidateId?: string;
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

function downloadsFor(input: {
  approvalChecklist: RuntimeReleaseApprovalChecklist;
  runtimeReleaseGates: RuntimeReleaseGatesReport;
}): RuntimeReleaseOperatorQueueDownload[] {
  return [
    {
      download: input.runtimeReleaseGates.csvFileName,
      href: input.runtimeReleaseGates.csvDataUri,
      id: "runtime-gates-csv",
      label: "Gate CSV",
    },
    {
      download: input.runtimeReleaseGates.jsonFileName,
      href: input.runtimeReleaseGates.jsonDataUri,
      id: "runtime-gates-json",
      label: "Gate JSON",
    },
    {
      download: input.approvalChecklist.csvFileName,
      href: input.approvalChecklist.csvDataUri,
      id: "approval-checklist-csv",
      label: "Approval CSV",
    },
    {
      download: input.approvalChecklist.jsonFileName,
      href: input.approvalChecklist.jsonDataUri,
      id: "approval-checklist-json",
      label: "Approval JSON",
    },
  ];
}

function isOverdue(dueAt: string | null, generatedAt: string) {
  if (!dueAt) {
    return false;
  }

  const due = new Date(dueAt).getTime();
  const generated = new Date(generatedAt).getTime();

  return Number.isFinite(due) && Number.isFinite(generated) && due <= generated;
}

function statusFor(input: {
  dueAt: string | null;
  gate: RuntimeReleaseGate;
  generatedAt: string;
  ownerName: string;
}): RuntimeReleaseOperatorQueueStatus {
  if (input.gate.status === "blocked" && isOverdue(input.dueAt, input.generatedAt)) {
    return "overdue";
  }

  if (input.gate.status === "blocked") {
    return input.ownerName === "Unassigned" ? "unassigned" : "blocked";
  }

  return "ready";
}

function nextActionFor(input: {
  assignment?: RuntimeReleaseOperatorAssignment;
  gate: RuntimeReleaseGate;
  status: RuntimeReleaseOperatorQueueStatus;
}) {
  if (input.status === "overdue") {
    return `Escalate ${input.gate.label} to ${input.assignment?.ownerName ?? "an operator"} and attach fresh evidence.`;
  }

  if (input.status === "unassigned") {
    return `Assign an owner and due date for ${input.gate.label}.`;
  }

  if (input.status === "blocked") {
    return input.gate.nextAction;
  }

  return `${input.gate.label} is ready; keep evidence packets attached for approval.`;
}

function createRow(input: {
  assignment?: RuntimeReleaseOperatorAssignment;
  downloads: RuntimeReleaseOperatorQueueDownload[];
  gate: RuntimeReleaseGate;
  generatedAt: string;
}): RuntimeReleaseOperatorQueueRow {
  const ownerName = input.assignment?.ownerName?.trim() || "Unassigned";
  const ownerEmail = input.assignment?.ownerEmail?.trim() || null;
  const dueAt = input.assignment?.dueAt?.trim() || null;
  const status = statusFor({
    dueAt,
    gate: input.gate,
    generatedAt: input.generatedAt,
    ownerName,
  });
  const base = {
    blockerCount: input.gate.blockerCount,
    dueAt,
    evidenceHash: input.gate.evidenceHash,
    gateId: input.gate.id,
    gateLabel: input.gate.label,
    nextAction: nextActionFor({
      assignment: input.assignment,
      gate: input.gate,
      status,
    }),
    ownerEmail,
    ownerName,
    status,
  };

  return {
    ...base,
    downloadCount: input.downloads.length,
    downloads: input.downloads,
    queueRowHash: sha256(base),
  };
}

const statusRank: Record<RuntimeReleaseOperatorQueueStatus, number> = {
  overdue: 0,
  unassigned: 1,
  blocked: 2,
  ready: 3,
};

function summarize(rows: RuntimeReleaseOperatorQueueRow[]): RuntimeReleaseOperatorQueue["summary"] {
  const overdueCount = rows.filter((row) => row.status === "overdue").length;
  const unassignedCount = rows.filter((row) => row.status === "unassigned" || row.ownerName === "Unassigned").length;
  const blockedCount = rows.filter((row) => row.status === "blocked" || row.status === "overdue" || row.status === "unassigned").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const assignedCount = rows.length - unassignedCount;
  const status: RuntimeReleaseOperatorQueueStatus = overdueCount > 0 ? "overdue" : blockedCount > 0 ? "blocked" : "ready";

  return {
    assignedCount,
    blockedCount,
    nextAction:
      status === "ready"
        ? "Runtime release operator queue is clear."
        : "Resolve overdue, unassigned, or blocked runtime release gates before approval.",
    overdueCount,
    queueHash: sha256(rows.map((row) => row.queueRowHash)),
    queueScore: Math.max(0, Math.min(100, Math.round((readyCount / Math.max(1, rows.length)) * 100))),
    readyCount,
    rowCount: rows.length,
    status,
    unassignedCount,
  };
}

function createCsv(rows: RuntimeReleaseOperatorQueueRow[]) {
  const header = ["gate", "status", "owner", "owner_email", "due_at", "blockers", "evidence_hash", "next_action"];
  const body = rows.map((row) =>
    [row.gateId, row.status, row.ownerName, row.ownerEmail, row.dueAt, row.blockerCount, row.evidenceHash, row.nextAction].map(csvCell).join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

export function createRuntimeReleaseOperatorQueue(input: CreateRuntimeReleaseOperatorQueueInput): RuntimeReleaseOperatorQueue {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? "workspace";
  const releaseCandidateId = input.releaseCandidateId ?? input.approvalChecklist.releaseCandidateId;
  const downloads = downloadsFor({
    approvalChecklist: input.approvalChecklist,
    runtimeReleaseGates: input.runtimeReleaseGates,
  });
  const rows = input.runtimeReleaseGates.gates
    .map((gate) =>
      createRow({
        assignment: input.assignments?.[gate.id],
        downloads,
        gate,
        generatedAt,
      }),
    )
    .sort((first, second) => statusRank[first.status] - statusRank[second.status] || first.gateLabel.localeCompare(second.gateLabel));
  const summary = summarize(rows);
  const csvContent = createCsv(rows);
  const jsonContent = JSON.stringify(
    {
      generatedAt,
      releaseCandidateId,
      rows,
      summary,
      workspaceId,
    },
    null,
    2,
  );
  const fileBase = `${slug(workspaceId)}-runtime-release-operator-queue-${dateStamp(generatedAt)}`;

  return {
    csvContent,
    csvDataUri: encodeDataUri("text/csv", csvContent),
    csvFileName: `${fileBase}.csv`,
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
