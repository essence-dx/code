import { createHash } from "node:crypto";
import type { CadConversionExecutionQueueReport } from "@/features/projects/cad-conversion-execution-queue";
import type { NativeCadKernelCapabilityMatrixReport } from "@/features/projects/native-cad-kernel-capability-matrix";

export type CadRuntimeAcceptanceKind = "capability-matrix" | "conversion-execution" | "export-readiness-recommendation" | "runtime-diagnostics";
export type CadRuntimeAcceptanceStatus = "blocked" | "ready" | "review";

export interface CadRuntimeAcceptanceRow {
  evidence: string;
  evidenceHash: string;
  id: string;
  kind: CadRuntimeAcceptanceKind;
  nextAction: string;
  status: CadRuntimeAcceptanceStatus;
  title: string;
}

export interface CadRuntimeAcceptancePacketReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  rows: CadRuntimeAcceptanceRow[];
  summary: {
    acceptanceHash: string;
    acceptanceScore: number;
    blockedCount: number;
    nextAction: string;
    readyCount: number;
    reviewCount: number;
    rowCount: number;
    status: CadRuntimeAcceptanceStatus;
  };
  workspaceId: string;
}

export interface CreateCadRuntimeAcceptancePacketInput {
  capabilityMatrix: NativeCadKernelCapabilityMatrixReport;
  executionQueue: CadConversionExecutionQueueReport;
  exportReadinessStatus?: CadRuntimeAcceptanceStatus;
  generatedAt?: string;
  workspaceId?: string;
}

const kindRank: Record<CadRuntimeAcceptanceKind, number> = {
  "capability-matrix": 0,
  "conversion-execution": 1,
  "runtime-diagnostics": 2,
  "export-readiness-recommendation": 3,
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

function nextActionFor(input: { kind: CadRuntimeAcceptanceKind; status: CadRuntimeAcceptanceStatus }) {
  if (input.status === "blocked") {
    return `Resolve CAD runtime acceptance blockers for ${input.kind}.`;
  }

  if (input.status === "review") {
    return `Review CAD runtime acceptance evidence for ${input.kind}.`;
  }

  return `Keep CAD runtime acceptance evidence current for ${input.kind}.`;
}

function createRow(input: {
  evidence: string;
  id: string;
  kind: CadRuntimeAcceptanceKind;
  status: CadRuntimeAcceptanceStatus;
  title: string;
}) {
  const nextAction = nextActionFor({
    kind: input.kind,
    status: input.status,
  });
  const evidenceHash = sha256({
    evidence: input.evidence,
    id: input.id,
    kind: input.kind,
    nextAction,
    status: input.status,
    title: input.title,
  });

  return {
    ...input,
    evidenceHash,
    nextAction,
  } satisfies CadRuntimeAcceptanceRow;
}

function runtimeDiagnosticsStatus(input: {
  capabilityMatrix: NativeCadKernelCapabilityMatrixReport;
  executionQueue: CadConversionExecutionQueueReport;
}): CadRuntimeAcceptanceStatus {
  if (input.executionQueue.summary.blockedCount > 0) {
    return "blocked";
  }

  if (
    input.capabilityMatrix.summary.status === "review" ||
    input.executionQueue.summary.retryableCount > 0 ||
    input.executionQueue.summary.runningCount > 0 ||
    input.executionQueue.summary.status === "review"
  ) {
    return "review";
  }

  return "ready";
}

function createRows(input: Required<Pick<CreateCadRuntimeAcceptancePacketInput, "exportReadinessStatus">> & {
  capabilityMatrix: NativeCadKernelCapabilityMatrixReport;
  executionQueue: CadConversionExecutionQueueReport;
  workspaceId: string;
}) {
  const diagnosticsStatus = runtimeDiagnosticsStatus({
    capabilityMatrix: input.capabilityMatrix,
    executionQueue: input.executionQueue,
  });

  return [
    createRow({
      evidence: `${input.capabilityMatrix.summary.capabilityScore}/100 capability, ${input.capabilityMatrix.summary.capabilityHash}`,
      id: `cad-runtime-acceptance:${slug(input.workspaceId)}:capability-matrix`,
      kind: "capability-matrix",
      status: input.capabilityMatrix.summary.status,
      title: "Capability matrix",
    }),
    createRow({
      evidence: `${input.executionQueue.summary.executionScore}/100 execution, ${input.executionQueue.summary.executionHash}`,
      id: `cad-runtime-acceptance:${slug(input.workspaceId)}:conversion-execution`,
      kind: "conversion-execution",
      status: input.executionQueue.summary.status,
      title: "Conversion execution",
    }),
    createRow({
      evidence: `${input.executionQueue.summary.blockedCount} blocked, ${input.executionQueue.summary.retryableCount} retryable, ${input.executionQueue.summary.runningCount} running, ${input.capabilityMatrix.summary.reviewCount} capability reviews.`,
      id: `cad-runtime-acceptance:${slug(input.workspaceId)}:runtime-diagnostics`,
      kind: "runtime-diagnostics",
      status: diagnosticsStatus,
      title: "Runtime diagnostics",
    }),
    createRow({
      evidence: "Export readiness recommendation joins CAD capability coverage, conversion execution state, runtime diagnostics, and operator release acceptance.",
      id: `cad-runtime-acceptance:${slug(input.workspaceId)}:export-readiness-recommendation`,
      kind: "export-readiness-recommendation",
      status: input.exportReadinessStatus,
      title: "Export readiness recommendation",
    }),
  ].sort((first, second) => kindRank[first.kind] - kindRank[second.kind]);
}

function summarize(rows: CadRuntimeAcceptanceRow[]): CadRuntimeAcceptancePacketReport["summary"] {
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const status: CadRuntimeAcceptanceStatus = blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready";
  const acceptanceScore = Math.max(0, Math.round((readyCount / Math.max(1, rows.length)) * 100 + reviewCount * 12 - blockedCount * 18));

  return {
    acceptanceHash: sha256(rows.map((row) => row.evidenceHash)),
    acceptanceScore,
    blockedCount,
    nextAction:
      status === "blocked"
        ? "Resolve CAD runtime acceptance blockers before release promotion."
        : status === "review"
          ? "Review CAD runtime acceptance evidence before release promotion."
          : "CAD runtime acceptance packet is ready.",
    readyCount,
    reviewCount,
    rowCount: rows.length,
    status,
  };
}

function createCsv(rows: CadRuntimeAcceptanceRow[]) {
  const header = ["section_id", "kind", "title", "status", "evidence_hash", "next_action"];
  const body = rows.map((row) => [row.id, row.kind, row.title, row.status, row.evidenceHash, row.nextAction].map(csvCell).join(","));

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function createJson(input: {
  generatedAt: string;
  rows: CadRuntimeAcceptanceRow[];
  summary: CadRuntimeAcceptancePacketReport["summary"];
  workspaceId: string;
}) {
  return JSON.stringify(input, null, 2);
}

export function createCadRuntimeAcceptancePacket(input: CreateCadRuntimeAcceptancePacketInput): CadRuntimeAcceptancePacketReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.capabilityMatrix.workspaceId ?? input.executionQueue.workspaceId ?? "workspace";
  const rows = createRows({
    capabilityMatrix: input.capabilityMatrix,
    executionQueue: input.executionQueue,
    exportReadinessStatus: input.exportReadinessStatus ?? "ready",
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
  const fileBase = `${slug(workspaceId)}-cad-runtime-acceptance-packet-${dateStamp(generatedAt)}`;

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
