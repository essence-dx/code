import { createHash } from "node:crypto";
import type { DesktopPackageInstallRehearsalPacket } from "@/features/projects/desktop-package-install-rehearsal-packet";
import type { NativeArtifactExecutionReceiptValidatorReport } from "@/features/projects/native-artifact-execution-receipt-validator";
import type { NativeRuntimeExceptionRoutingReport } from "@/features/projects/native-runtime-exception-routing";

export type NativeReleaseFulfillmentKind = "approval-renewal" | "exception-routes" | "install-rehearsals" | "signed-artifacts";
export type NativeReleaseFulfillmentStatus = "blocked" | "ready" | "review";
export type NativeReleaseFulfillmentDecision = "block" | "promote" | "review";
export type NativeReleaseFulfillmentFileFormat = "csv" | "json";

export interface NativeReleaseApprovalRenewalEvidence {
  approvalHash: string | null;
  approvedBy: string | null;
  expiresAt: string;
  renewedAt: string | null;
  status: NativeReleaseFulfillmentStatus;
}

export interface NativeReleaseFulfillmentLedgerRow {
  decision: NativeReleaseFulfillmentDecision;
  detail: string;
  fulfillmentId: string;
  kind: NativeReleaseFulfillmentKind;
  ledgerHash: string;
  nextAction: string;
  score: number;
  sourceHash: string;
  status: NativeReleaseFulfillmentStatus;
  title: string;
}

export interface NativeReleaseFulfillmentLedgerFile {
  download: string;
  format: NativeReleaseFulfillmentFileFormat;
  href: string;
  label: string;
}

export interface NativeReleaseFulfillmentLedger {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  files: NativeReleaseFulfillmentLedgerFile[];
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  releaseCandidateId: string;
  rows: NativeReleaseFulfillmentLedgerRow[];
  summary: {
    blockedCount: number;
    decision: NativeReleaseFulfillmentDecision;
    fulfillmentScore: number;
    ledgerHash: string;
    nextAction: string;
    readyCount: number;
    reviewCount: number;
    rowCount: number;
    status: NativeReleaseFulfillmentStatus;
  };
  workspaceId: string;
}

export interface CreateNativeReleaseFulfillmentLedgerInput {
  approvalRenewal: NativeReleaseApprovalRenewalEvidence;
  artifactValidation: NativeArtifactExecutionReceiptValidatorReport;
  exceptionRouting: NativeRuntimeExceptionRoutingReport;
  generatedAt?: string;
  installRehearsal: DesktopPackageInstallRehearsalPacket;
  releaseCandidateId: string;
  workspaceId?: string;
}

const kindRank: Record<NativeReleaseFulfillmentKind, number> = {
  "signed-artifacts": 0,
  "install-rehearsals": 1,
  "exception-routes": 2,
  "approval-renewal": 3,
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

function csvCell(value: number | string) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function encodeDataUri(mimeType: string, content: string) {
  return `data:${mimeType};charset=utf-8,${encodeURIComponent(content)}`;
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

function decisionFor(status: NativeReleaseFulfillmentStatus): NativeReleaseFulfillmentDecision {
  return status === "blocked" ? "block" : status === "review" ? "review" : "promote";
}

function nextActionFor(input: { kind: NativeReleaseFulfillmentKind; status: NativeReleaseFulfillmentStatus }) {
  if (input.status === "blocked") {
    return `Resolve blocked native release fulfillment ledger rows for ${input.kind}.`;
  }

  if (input.status === "review") {
    return `Review native release fulfillment ledger evidence for ${input.kind}.`;
  }

  return `Keep native release fulfillment evidence current for ${input.kind}.`;
}

function createRow(input: {
  detail: string;
  kind: NativeReleaseFulfillmentKind;
  score: number;
  sourceHash: string;
  status: NativeReleaseFulfillmentStatus;
  title: string;
  workspaceId: string;
}) {
  const decision = decisionFor(input.status);
  const rowWithoutHash = {
    decision,
    detail: input.detail,
    fulfillmentId: `native-release-fulfillment:${slug(input.workspaceId)}:${input.kind}`,
    kind: input.kind,
    nextAction: nextActionFor({
      kind: input.kind,
      status: input.status,
    }),
    score: input.score,
    sourceHash: input.sourceHash,
    status: input.status,
    title: input.title,
  } satisfies Omit<NativeReleaseFulfillmentLedgerRow, "ledgerHash">;

  return {
    ...rowWithoutHash,
    ledgerHash: sha256(rowWithoutHash),
  };
}

function createRows(input: CreateNativeReleaseFulfillmentLedgerInput & { workspaceId: string }) {
  return [
    createRow({
      detail: `${input.artifactValidation.summary.readyCount}/${input.artifactValidation.summary.rowCount} signed artifact receipts ready.`,
      kind: "signed-artifacts",
      score: input.artifactValidation.summary.validationScore,
      sourceHash: input.artifactValidation.summary.validationHash,
      status: input.artifactValidation.summary.status,
      title: "Signed artifacts",
      workspaceId: input.workspaceId,
    }),
    createRow({
      detail: `${input.installRehearsal.summary.readyCount}/${input.installRehearsal.summary.rowCount} install rehearsals ready for ${input.installRehearsal.releaseVersion}.`,
      kind: "install-rehearsals",
      score: input.installRehearsal.summary.rehearsalScore,
      sourceHash: input.installRehearsal.summary.packetHash,
      status: input.installRehearsal.summary.status,
      title: "Install rehearsals",
      workspaceId: input.workspaceId,
    }),
    createRow({
      detail: `${input.exceptionRouting.summary.routedCount} exception routes eligible and ${input.exceptionRouting.summary.escalationCount} escalations open.`,
      kind: "exception-routes",
      score: input.exceptionRouting.summary.routingScore,
      sourceHash: input.exceptionRouting.summary.routingHash,
      status: input.exceptionRouting.summary.status,
      title: "Exception routes",
      workspaceId: input.workspaceId,
    }),
    createRow({
      detail: `${input.approvalRenewal.approvedBy ?? "No approver"} renewed at ${input.approvalRenewal.renewedAt ?? "missing"} and expires at ${input.approvalRenewal.expiresAt}.`,
      kind: "approval-renewal",
      score: input.approvalRenewal.status === "ready" ? 100 : input.approvalRenewal.status === "review" ? 60 : 0,
      sourceHash: input.approvalRenewal.approvalHash ?? "missing",
      status: input.approvalRenewal.status,
      title: "Approval renewal",
      workspaceId: input.workspaceId,
    }),
  ].sort((first, second) => kindRank[first.kind] - kindRank[second.kind]);
}

function summarize(rows: NativeReleaseFulfillmentLedgerRow[]): NativeReleaseFulfillmentLedger["summary"] {
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const status: NativeReleaseFulfillmentStatus = blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready";
  const decision = decisionFor(status);

  return {
    blockedCount,
    decision,
    fulfillmentScore: Math.max(0, Math.min(100, Math.round(rows.reduce((total, row) => total + row.score, 0) / Math.max(1, rows.length) - blockedCount * 8))),
    ledgerHash: sha256(rows.map((row) => row.ledgerHash)),
    nextAction:
      status === "blocked"
        ? "Resolve blocked native release fulfillment ledger rows before release-candidate promotion."
        : status === "review"
          ? "Review native release fulfillment ledger rows before release-candidate promotion."
          : "Native release fulfillment ledger is ready for promotion.",
    readyCount,
    reviewCount,
    rowCount: rows.length,
    status,
  };
}

function createCsv(rows: NativeReleaseFulfillmentLedgerRow[]) {
  const header = ["fulfillment_id", "kind", "status", "decision", "score", "source_hash", "ledger_hash", "next_action"];
  const body = rows.map((row) => [row.fulfillmentId, row.kind, row.status, row.decision, row.score, row.sourceHash, row.ledgerHash, row.nextAction].map(csvCell).join(","));

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function filesFor(input: {
  csvDataUri: string;
  csvFileName: string;
  jsonDataUri: string;
  jsonFileName: string;
}): NativeReleaseFulfillmentLedgerFile[] {
  return [
    {
      download: input.csvFileName,
      format: "csv",
      href: input.csvDataUri,
      label: "CSV ledger",
    },
    {
      download: input.jsonFileName,
      format: "json",
      href: input.jsonDataUri,
      label: "JSON ledger",
    },
  ];
}

export function createNativeReleaseFulfillmentLedger(input: CreateNativeReleaseFulfillmentLedgerInput): NativeReleaseFulfillmentLedger {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.artifactValidation.workspaceId ?? "workspace";
  const rows = createRows({
    ...input,
    workspaceId,
  });
  const summary = summarize(rows);
  const csvContent = createCsv(rows);
  const jsonContent = JSON.stringify(
    {
      generatedAt,
      releaseCandidateId: input.releaseCandidateId,
      rows,
      summary,
      workspaceId,
    },
    null,
    2,
  );
  const fileBase = `${slug(workspaceId)}-native-release-fulfillment-ledger-${slug(input.releaseCandidateId)}-${dateStamp(generatedAt)}`;
  const csvFileName = `${fileBase}.csv`;
  const jsonFileName = `${fileBase}.json`;
  const csvDataUri = encodeDataUri("text/csv", csvContent);
  const jsonDataUri = encodeDataUri("application/json", jsonContent);

  return {
    csvContent,
    csvDataUri,
    csvFileName,
    files: filesFor({
      csvDataUri,
      csvFileName,
      jsonDataUri,
      jsonFileName,
    }),
    generatedAt,
    jsonContent,
    jsonDataUri,
    jsonFileName,
    releaseCandidateId: input.releaseCandidateId,
    rows,
    summary,
    workspaceId,
  };
}
