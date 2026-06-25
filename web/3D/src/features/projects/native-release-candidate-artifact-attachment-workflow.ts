import { createHash } from "node:crypto";
import type { NativeArtifactStorageHandoffPlatform } from "@/features/projects/native-artifact-storage-handoff-evidence";

export type NativeReleaseCandidateArtifactAttachmentWorkflowStatus = "blocked" | "ready" | "review";
export type NativeReleaseCandidateArtifactAttachmentWorkflowFileFormat = "csv" | "json";

export interface NativeReleaseCandidateArtifactAttachmentInput {
  artifactSha256: string;
  artifactUrl: string;
  attachedAt: string;
  attachmentOwner: string;
  intakeHash: string;
  manifestArtifactSha256: string;
  manifestUpdatedAt: string;
  manifestUrl: string;
  platform: NativeArtifactStorageHandoffPlatform;
  releaseApprovalBlocked: boolean;
  updaterChannel: string;
}

export interface NativeReleaseCandidateArtifactAttachmentWorkflowRow {
  artifactSha256: string;
  artifactUrl: string;
  attachedAt: string;
  attachmentOwner: string;
  attachmentReady: boolean;
  channelReady: boolean;
  intakeHash: string;
  intakeLinked: boolean;
  manifestArtifactSha256: string;
  manifestReady: boolean;
  manifestUpdatedAt: string;
  manifestUrl: string;
  nextAction: string;
  platform: NativeArtifactStorageHandoffPlatform;
  releaseApprovalBlocked: boolean;
  releaseApprovalReady: boolean;
  status: NativeReleaseCandidateArtifactAttachmentWorkflowStatus;
  updaterChannel: string;
  workflowHash: string;
}

export interface NativeReleaseCandidateArtifactAttachmentWorkflowFile {
  download: string;
  format: NativeReleaseCandidateArtifactAttachmentWorkflowFileFormat;
  href: string;
  label: string;
}

export interface NativeReleaseCandidateArtifactAttachmentWorkflowReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  files: NativeReleaseCandidateArtifactAttachmentWorkflowFile[];
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  releaseCandidateId: string;
  requiredUpdaterChannel: string;
  rows: NativeReleaseCandidateArtifactAttachmentWorkflowRow[];
  summary: {
    approvalUnblockedCount: number;
    attachmentReadyCount: number;
    blockedCount: number;
    manifestReadyCount: number;
    nextAction: string;
    readyCount: number;
    reviewCount: number;
    rowCount: number;
    status: NativeReleaseCandidateArtifactAttachmentWorkflowStatus;
    workflowHash: string;
    workflowScore: number;
  };
  workspaceId: string;
}

export interface CreateNativeReleaseCandidateArtifactAttachmentWorkflowInput {
  attachments: NativeReleaseCandidateArtifactAttachmentInput[];
  generatedAt?: string;
  releaseCandidateId: string;
  requiredPlatforms?: NativeArtifactStorageHandoffPlatform[];
  requiredUpdaterChannel: string;
  workspaceId?: string;
}

const defaultRequiredPlatforms: NativeArtifactStorageHandoffPlatform[] = ["windows", "macos", "linux"];
const platformRank: Record<NativeArtifactStorageHandoffPlatform, number> = {
  windows: 0,
  macos: 1,
  linux: 2,
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

function csvCell(value: boolean | number | string) {
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

function hasSha256(value: string) {
  return value.trim().startsWith("sha256:");
}

function validDate(value: string) {
  const date = new Date(value.trim());

  return value.trim().length > 0 && !Number.isNaN(date.getTime());
}

function urlReady(value: string) {
  return value.trim().startsWith("https://");
}

function sameHash(left: string, right: string) {
  return left.trim().toLowerCase() === right.trim().toLowerCase() && hasSha256(left) && hasSha256(right);
}

function missingAttachment(platform: NativeArtifactStorageHandoffPlatform): NativeReleaseCandidateArtifactAttachmentInput {
  return {
    artifactSha256: "",
    artifactUrl: "",
    attachedAt: "",
    attachmentOwner: "",
    intakeHash: "",
    manifestArtifactSha256: "",
    manifestUpdatedAt: "",
    manifestUrl: "",
    platform,
    releaseApprovalBlocked: true,
    updaterChannel: "missing",
  };
}

function statusFor(input: {
  attachmentReady: boolean;
  channelReady: boolean;
  intakeLinked: boolean;
  manifestReady: boolean;
  releaseApprovalReady: boolean;
}): NativeReleaseCandidateArtifactAttachmentWorkflowStatus {
  if (!input.attachmentReady || !input.manifestReady || !input.releaseApprovalReady) {
    return "blocked";
  }

  if (!input.channelReady || !input.intakeLinked) {
    return "review";
  }

  return "ready";
}

function nextActionFor(
  row: Pick<
    NativeReleaseCandidateArtifactAttachmentWorkflowRow,
    "attachmentReady" | "channelReady" | "intakeLinked" | "manifestReady" | "platform" | "releaseApprovalReady" | "status"
  >,
) {
  if (row.status === "blocked") {
    return `Resolve blocked native release candidate artifact attachment workflow for ${row.platform}.`;
  }

  if (!row.attachmentReady) {
    return `Attach signed native artifact and owner evidence for ${row.platform}.`;
  }

  if (!row.manifestReady) {
    return `Update updater manifest to reference the attached artifact checksum for ${row.platform}.`;
  }

  if (!row.releaseApprovalReady) {
    return `Keep release approval blocked until ${row.platform} artifact attachment is complete.`;
  }

  if (!row.channelReady) {
    return `Move ${row.platform} updater manifest to the required release channel.`;
  }

  if (!row.intakeLinked) {
    return `Link ${row.platform} attachment back to signed artifact intake evidence.`;
  }

  return `Native release candidate artifact attachment is ready for ${row.platform}.`;
}

function createRow(input: NativeReleaseCandidateArtifactAttachmentInput, requiredUpdaterChannel: string): NativeReleaseCandidateArtifactAttachmentWorkflowRow {
  const artifactSha256 = input.artifactSha256.trim() || "missing";
  const artifactUrl = input.artifactUrl.trim();
  const attachedAt = input.attachedAt.trim();
  const attachmentOwner = input.attachmentOwner.trim();
  const intakeHash = input.intakeHash.trim() || "missing";
  const manifestArtifactSha256 = input.manifestArtifactSha256.trim() || "missing";
  const manifestUpdatedAt = input.manifestUpdatedAt.trim();
  const manifestUrl = input.manifestUrl.trim();
  const updaterChannel = input.updaterChannel.trim() || "missing";
  const attachmentReady = hasSha256(artifactSha256) && urlReady(artifactUrl) && validDate(attachedAt) && attachmentOwner.length > 0;
  const manifestReady = sameHash(artifactSha256, manifestArtifactSha256) && urlReady(manifestUrl) && validDate(manifestUpdatedAt);
  const channelReady = updaterChannel === requiredUpdaterChannel;
  const intakeLinked = hasSha256(intakeHash);
  const releaseApprovalReady = !input.releaseApprovalBlocked && attachmentReady && manifestReady && channelReady;
  const status = statusFor({
    attachmentReady,
    channelReady,
    intakeLinked,
    manifestReady,
    releaseApprovalReady,
  });
  const rowWithoutHash = {
    artifactSha256,
    artifactUrl,
    attachedAt,
    attachmentOwner,
    attachmentReady,
    channelReady,
    intakeHash,
    intakeLinked,
    manifestArtifactSha256,
    manifestReady,
    manifestUpdatedAt,
    manifestUrl,
    nextAction: "",
    platform: input.platform,
    releaseApprovalBlocked: input.releaseApprovalBlocked,
    releaseApprovalReady,
    status,
    updaterChannel,
  } satisfies Omit<NativeReleaseCandidateArtifactAttachmentWorkflowRow, "workflowHash">;
  const row = {
    ...rowWithoutHash,
    nextAction: nextActionFor(rowWithoutHash),
  };

  return {
    ...row,
    workflowHash: sha256(row),
  };
}

function createRows(input: CreateNativeReleaseCandidateArtifactAttachmentWorkflowInput) {
  const attachmentByPlatform = new Map(input.attachments.map((attachment) => [attachment.platform, attachment]));
  const requiredPlatforms = input.requiredPlatforms ?? defaultRequiredPlatforms;

  return requiredPlatforms
    .map((platform) => createRow(attachmentByPlatform.get(platform) ?? missingAttachment(platform), input.requiredUpdaterChannel))
    .sort((first, second) => platformRank[first.platform] - platformRank[second.platform]);
}

function summarize(rows: NativeReleaseCandidateArtifactAttachmentWorkflowRow[]): NativeReleaseCandidateArtifactAttachmentWorkflowReport["summary"] {
  const approvalUnblockedCount = rows.filter((row) => row.releaseApprovalReady).length;
  const attachmentReadyCount = rows.filter((row) => row.attachmentReady).length;
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const manifestReadyCount = rows.filter((row) => row.manifestReady).length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const status: NativeReleaseCandidateArtifactAttachmentWorkflowStatus = blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready";

  return {
    approvalUnblockedCount,
    attachmentReadyCount,
    blockedCount,
    manifestReadyCount,
    nextAction:
      status === "blocked"
        ? "Resolve blocked native release candidate artifact attachment workflow before fulfillment release."
        : status === "review"
          ? "Review native release candidate artifact attachment workflow before fulfillment release."
          : "Native release candidate artifact attachment workflow is ready for fulfillment release.",
    readyCount,
    reviewCount,
    rowCount: rows.length,
    status,
    workflowHash: sha256(rows.map((row) => row.workflowHash)),
    workflowScore: Math.max(0, Math.min(100, Math.round((readyCount / Math.max(1, rows.length)) * 100 + reviewCount * 20 - blockedCount * 18))),
  };
}

function createCsv(rows: NativeReleaseCandidateArtifactAttachmentWorkflowRow[]) {
  const header = ["platform", "status", "artifact_attached", "manifest_ready", "channel_ready", "release_approval_ready", "workflow_hash", "next_action"];
  const body = rows.map((row) =>
    [row.platform, row.status, row.attachmentReady, row.manifestReady, row.channelReady, row.releaseApprovalReady, row.workflowHash, row.nextAction].map(csvCell).join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function filesFor(input: {
  csvDataUri: string;
  csvFileName: string;
  jsonDataUri: string;
  jsonFileName: string;
}): NativeReleaseCandidateArtifactAttachmentWorkflowFile[] {
  return [
    {
      download: input.csvFileName,
      format: "csv",
      href: input.csvDataUri,
      label: "CSV workflow",
    },
    {
      download: input.jsonFileName,
      format: "json",
      href: input.jsonDataUri,
      label: "JSON workflow",
    },
  ];
}

export function createNativeReleaseCandidateArtifactAttachmentWorkflow(
  input: CreateNativeReleaseCandidateArtifactAttachmentWorkflowInput,
): NativeReleaseCandidateArtifactAttachmentWorkflowReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? "workspace";
  const rows = createRows(input);
  const summary = summarize(rows);
  const csvContent = createCsv(rows);
  const jsonContent = JSON.stringify(
    {
      generatedAt,
      releaseCandidateId: input.releaseCandidateId,
      requiredUpdaterChannel: input.requiredUpdaterChannel,
      rows,
      summary,
      workspaceId,
    },
    null,
    2,
  );
  const fileBase = `${slug(workspaceId)}-native-release-candidate-artifact-attachment-workflow-${slug(input.releaseCandidateId)}-${dateStamp(generatedAt)}`;
  const csvFileName = `${fileBase}.csv`;
  const jsonFileName = `${fileBase}.json`;
  const csvDataUri = encodeDataUri("text/csv", csvContent);
  const jsonDataUri = encodeDataUri("application/json", jsonContent);

  return {
    csvContent,
    csvDataUri,
    csvFileName,
    files: filesFor({ csvDataUri, csvFileName, jsonDataUri, jsonFileName }),
    generatedAt,
    jsonContent,
    jsonDataUri,
    jsonFileName,
    releaseCandidateId: input.releaseCandidateId,
    requiredUpdaterChannel: input.requiredUpdaterChannel,
    rows,
    summary,
    workspaceId,
  };
}
