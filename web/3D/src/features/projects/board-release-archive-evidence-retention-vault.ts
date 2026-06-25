import { createHash } from "node:crypto";
import type { BoardReleaseArchiveIntelligenceApprovalWorkflowReport } from "@/features/projects/board-release-archive-intelligence-approval-workflow";
import type { BoardReleaseArchiveIntelligenceAutomationDigestReport } from "@/features/projects/board-release-archive-intelligence-automation-digest";
import type { BoardReleaseArchiveIntelligenceCommandCenterReport } from "@/features/projects/board-release-archive-intelligence-command-center";
import type { BoardReleaseArchiveIntelligenceNotificationRoutingReport } from "@/features/projects/board-release-archive-intelligence-notification-routing";
import type { BoardReleaseArchiveIntelligencePacketReport } from "@/features/projects/board-release-archive-intelligence-packet";

export type BoardReleaseArchiveEvidenceRetentionVaultKind = "approval" | "command-center" | "digest" | "notification" | "packet";
export type BoardReleaseArchiveEvidenceRetentionVaultStatus = "blocked" | "sealed" | "watch";
export type BoardReleaseArchiveEvidenceRetentionVaultRetentionClass = "audit" | "board" | "operational";

export interface BoardReleaseArchiveEvidenceRetentionVaultManifest {
  byteSize: number;
  evidenceHash: string;
  fileName: string;
  id: string;
  kind: BoardReleaseArchiveEvidenceRetentionVaultKind;
  nextAction: string;
  recordCount: number;
  retentionClass: BoardReleaseArchiveEvidenceRetentionVaultRetentionClass;
  sourceStatus: string;
  status: BoardReleaseArchiveEvidenceRetentionVaultStatus;
  title: string;
  vaultHash: string;
}

export interface BoardReleaseArchiveEvidenceRetentionVaultReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  manifests: BoardReleaseArchiveEvidenceRetentionVaultManifest[];
  summary: {
    blockedCount: number;
    manifestCount: number;
    nextAction: string;
    packetHash: string;
    sealedCount: number;
    status: BoardReleaseArchiveEvidenceRetentionVaultStatus;
    totalByteSize: number;
    vaultHash: string;
    vaultScore: number;
    watchCount: number;
  };
  workspaceId: string;
}

export interface CreateBoardReleaseArchiveEvidenceRetentionVaultInput {
  approvalWorkflow: BoardReleaseArchiveIntelligenceApprovalWorkflowReport | null;
  automationDigest: BoardReleaseArchiveIntelligenceAutomationDigestReport | null;
  commandCenter: BoardReleaseArchiveIntelligenceCommandCenterReport | null;
  generatedAt?: string;
  notificationRouting: BoardReleaseArchiveIntelligenceNotificationRoutingReport | null;
  packet: BoardReleaseArchiveIntelligencePacketReport;
  workspaceId?: string;
}

const kindRank: Record<BoardReleaseArchiveEvidenceRetentionVaultKind, number> = {
  packet: 0,
  digest: 1,
  approval: 2,
  notification: 3,
  "command-center": 4,
};

const statusRank: Record<BoardReleaseArchiveEvidenceRetentionVaultStatus, number> = {
  blocked: 0,
  watch: 1,
  sealed: 2,
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

function byteSize(value: string) {
  return new TextEncoder().encode(value).byteLength;
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

function statusFrom(sourceStatus: string | undefined, required: boolean): BoardReleaseArchiveEvidenceRetentionVaultStatus {
  if (!required) {
    return "blocked";
  }

  if (sourceStatus === "ready" || sourceStatus === "sealed" || sourceStatus === "approved" || sourceStatus === "info") {
    return "sealed";
  }

  return sourceStatus === "watch" || sourceStatus === "pending" ? "watch" : "blocked";
}

function createManifest(input: {
  content: string;
  fileName: string;
  generatedAt: string;
  kind: BoardReleaseArchiveEvidenceRetentionVaultKind;
  nextAction: string;
  recordCount: number;
  required?: boolean;
  retentionClass: BoardReleaseArchiveEvidenceRetentionVaultRetentionClass;
  sourceStatus?: string;
  title: string;
  workspaceId: string;
}) {
  const evidenceHash = sha256(input.content);
  const id = `archive-evidence-vault:${slug(input.workspaceId)}:${input.kind}:${dateStamp(input.generatedAt)}`;
  const status = statusFrom(input.sourceStatus, input.required ?? true);
  const vaultHash = sha256({
    evidenceHash,
    fileName: input.fileName,
    id,
    kind: input.kind,
    recordCount: input.recordCount,
    retentionClass: input.retentionClass,
    sourceStatus: input.sourceStatus ?? "missing",
  });

  return {
    byteSize: byteSize(input.content),
    evidenceHash,
    fileName: input.fileName,
    id,
    kind: input.kind,
    nextAction: status === "sealed" ? "Keep this immutable evidence bundle in the archive retention vault." : input.nextAction,
    recordCount: input.recordCount,
    retentionClass: input.retentionClass,
    sourceStatus: input.sourceStatus ?? "missing",
    status,
    title: input.title,
    vaultHash,
  };
}

function createManifests(input: CreateBoardReleaseArchiveEvidenceRetentionVaultInput & { generatedAt: string; workspaceId: string }) {
  return [
    createManifest({
      content: input.packet.jsonContent,
      fileName: input.packet.jsonFileName,
      generatedAt: input.generatedAt,
      kind: "packet",
      nextAction: input.packet.summary.nextAction,
      recordCount: input.packet.summary.sectionCount + input.packet.summary.recommendationCount,
      retentionClass: "board",
      sourceStatus: input.packet.summary.status,
      title: "Archive intelligence packet",
      workspaceId: input.workspaceId,
    }),
    createManifest({
      content: input.automationDigest?.jsonContent ?? "{}",
      fileName: input.automationDigest?.jsonFileName ?? "missing-archive-intelligence-automation-digest.json",
      generatedAt: input.generatedAt,
      kind: "digest",
      nextAction: input.automationDigest?.summary.nextAction ?? "Create archive intelligence automation digest before sealing the vault.",
      recordCount: input.automationDigest?.summary.rowCount ?? 0,
      retentionClass: "board",
      required: !!input.automationDigest,
      sourceStatus: input.automationDigest?.summary.status,
      title: "Automation digest",
      workspaceId: input.workspaceId,
    }),
    createManifest({
      content: input.approvalWorkflow?.csvContent ?? "",
      fileName: input.approvalWorkflow?.csvFileName ?? "missing-archive-intelligence-approval-workflow.csv",
      generatedAt: input.generatedAt,
      kind: "approval",
      nextAction: input.approvalWorkflow?.summary.nextAction ?? "Create archive intelligence approval workflow before sealing the vault.",
      recordCount: input.approvalWorkflow?.summary.totalCount ?? 0,
      retentionClass: "audit",
      required: !!input.approvalWorkflow,
      sourceStatus: input.approvalWorkflow?.summary.status,
      title: "Approval workflow",
      workspaceId: input.workspaceId,
    }),
    createManifest({
      content: input.notificationRouting?.csvContent ?? "",
      fileName: input.notificationRouting?.csvFileName ?? "missing-archive-intelligence-notification-routing.csv",
      generatedAt: input.generatedAt,
      kind: "notification",
      nextAction: input.notificationRouting?.summary.nextAction ?? "Create archive intelligence notification routing before sealing the vault.",
      recordCount: input.notificationRouting?.summary.routeCount ?? 0,
      retentionClass: "operational",
      required: !!input.notificationRouting,
      sourceStatus: input.notificationRouting?.summary.status,
      title: "Notification routing",
      workspaceId: input.workspaceId,
    }),
    createManifest({
      content: input.commandCenter?.csvContent ?? "",
      fileName: input.commandCenter?.csvFileName ?? "missing-archive-intelligence-command-center.csv",
      generatedAt: input.generatedAt,
      kind: "command-center",
      nextAction: input.commandCenter?.summary.nextAction ?? "Create archive intelligence command center before sealing the vault.",
      recordCount: input.commandCenter?.summary.rowCount ?? 0,
      retentionClass: "operational",
      required: !!input.commandCenter,
      sourceStatus: input.commandCenter?.summary.status,
      title: "Command center",
      workspaceId: input.workspaceId,
    }),
  ].sort(
    (first, second) =>
      statusRank[first.status] - statusRank[second.status] ||
      kindRank[first.kind] - kindRank[second.kind] ||
      first.title.localeCompare(second.title),
  );
}

function createCsv(manifests: BoardReleaseArchiveEvidenceRetentionVaultManifest[]) {
  const header = ["manifest_id", "kind", "title", "status", "retention_class", "record_count", "byte_size", "file_name", "evidence_hash", "vault_hash", "next_action"];
  const body = manifests.map((manifest) =>
    [
      manifest.id,
      manifest.kind,
      manifest.title,
      manifest.status,
      manifest.retentionClass,
      manifest.recordCount,
      manifest.byteSize,
      manifest.fileName,
      manifest.evidenceHash,
      manifest.vaultHash,
      manifest.nextAction,
    ]
      .map(csvCell)
      .join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function summarize(
  manifests: BoardReleaseArchiveEvidenceRetentionVaultManifest[],
  packet: BoardReleaseArchiveIntelligencePacketReport,
): BoardReleaseArchiveEvidenceRetentionVaultReport["summary"] {
  const blockedCount = manifests.filter((manifest) => manifest.status === "blocked").length;
  const watchCount = manifests.filter((manifest) => manifest.status === "watch").length;
  const sealedCount = manifests.filter((manifest) => manifest.status === "sealed").length;
  const status: BoardReleaseArchiveEvidenceRetentionVaultStatus = blockedCount > 0 ? "blocked" : watchCount > 0 ? "watch" : "sealed";
  const nextManifest = manifests[0] ?? null;

  return {
    blockedCount,
    manifestCount: manifests.length,
    nextAction: status === "sealed" ? "Archive evidence retention vault is sealed for board release archive evidence." : (nextManifest?.nextAction ?? packet.summary.nextAction),
    packetHash: packet.summary.packetHash,
    sealedCount,
    status,
    totalByteSize: manifests.reduce((sum, manifest) => sum + manifest.byteSize, 0),
    vaultHash: sha256(manifests.map((manifest) => manifest.vaultHash)),
    vaultScore: manifests.length > 0 ? Math.round((sealedCount / manifests.length) * 100 - blockedCount * 10 - watchCount * 4) : 100,
    watchCount,
  };
}

function createJson(input: {
  generatedAt: string;
  manifests: BoardReleaseArchiveEvidenceRetentionVaultManifest[];
  summary: BoardReleaseArchiveEvidenceRetentionVaultReport["summary"];
  workspaceId: string;
}) {
  return JSON.stringify(input, null, 2);
}

export function createBoardReleaseArchiveEvidenceRetentionVaultReport(
  input: CreateBoardReleaseArchiveEvidenceRetentionVaultInput,
): BoardReleaseArchiveEvidenceRetentionVaultReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.packet.workspaceId;
  const manifests = createManifests({
    ...input,
    generatedAt,
    workspaceId,
  });
  const summary = summarize(manifests, input.packet);
  const csvContent = createCsv(manifests);
  const jsonContent = createJson({
    generatedAt,
    manifests,
    summary,
    workspaceId,
  });
  const fileBase = `${slug(workspaceId)}-board-release-archive-evidence-retention-vault-${dateStamp(generatedAt)}`;

  return {
    csvContent,
    csvDataUri: encodeCsvDataUri(csvContent),
    csvFileName: `${fileBase}.csv`,
    generatedAt,
    jsonContent,
    jsonDataUri: encodeJsonDataUri(jsonContent),
    jsonFileName: `${fileBase}.json`,
    manifests,
    summary,
    workspaceId,
  };
}
