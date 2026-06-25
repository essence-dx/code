import { createHash } from "node:crypto";
import type { NativeArtifactStorageHandoffPlatform } from "@/features/projects/native-artifact-storage-handoff-evidence";

export type NativeSignedArtifactExternalHandoffCloseoutStatus = "blocked" | "ready" | "review";
export type NativeSignedArtifactExternalHandoffCloseoutFileFormat = "csv" | "json";

export interface NativeSignedArtifactExternalHandoffInput {
  artifactAttachmentLocation: string;
  artifactFileName: string;
  blockingGate: string;
  certificateAuthority: string;
  evidencePacketUrl: string;
  gateBlockedWithoutArtifact: boolean;
  handoffOwner: string;
  ownerAcknowledged: boolean;
  platform: NativeArtifactStorageHandoffPlatform;
  releaseApprovalRequired: boolean;
  signerIdentity: string;
  targetAttachedAt: string;
}

export interface NativeSignedArtifactExternalHandoffRow {
  artifactAttachmentLocation: string;
  artifactFileName: string;
  attachmentLocationReady: boolean;
  blockingGate: string;
  certificateAuthority: string;
  closeoutHash: string;
  evidencePacketLinked: boolean;
  evidencePacketUrl: string;
  gateBlockedWithoutArtifact: boolean;
  handoffOwner: string;
  nextAction: string;
  ownerAcknowledged: boolean;
  ownerReady: boolean;
  platform: NativeArtifactStorageHandoffPlatform;
  releaseApprovalRequired: boolean;
  releaseGateDocumented: boolean;
  signerIdentity: string;
  signerReady: boolean;
  status: NativeSignedArtifactExternalHandoffCloseoutStatus;
  targetAttachedAt: string;
}

export interface NativeSignedArtifactExternalHandoffCloseoutFile {
  download: string;
  format: NativeSignedArtifactExternalHandoffCloseoutFileFormat;
  href: string;
  label: string;
}

export interface NativeSignedArtifactExternalHandoffCloseoutReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  files: NativeSignedArtifactExternalHandoffCloseoutFile[];
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  releaseCandidateId: string;
  rows: NativeSignedArtifactExternalHandoffRow[];
  summary: {
    blockedCount: number;
    blockedReleaseGateCount: number;
    closeoutHash: string;
    closeoutScore: number;
    nextAction: string;
    ownerAcknowledgedCount: number;
    readyCount: number;
    reviewCount: number;
    rowCount: number;
    status: NativeSignedArtifactExternalHandoffCloseoutStatus;
  };
  workspaceId: string;
}

export interface CreateNativeSignedArtifactExternalHandoffCloseoutInput {
  generatedAt?: string;
  handoffs: NativeSignedArtifactExternalHandoffInput[];
  releaseCandidateId: string;
  requiredPlatforms?: NativeArtifactStorageHandoffPlatform[];
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

function urlReady(value: string) {
  return value.trim().startsWith("https://");
}

function missingHandoff(platform: NativeArtifactStorageHandoffPlatform): NativeSignedArtifactExternalHandoffInput {
  return {
    artifactAttachmentLocation: "",
    artifactFileName: `${platform}-signed-artifact-missing`,
    blockingGate: "",
    certificateAuthority: "",
    evidencePacketUrl: "",
    gateBlockedWithoutArtifact: false,
    handoffOwner: "",
    ownerAcknowledged: false,
    platform,
    releaseApprovalRequired: true,
    signerIdentity: "",
    targetAttachedAt: "",
  };
}

function statusFor(input: {
  attachmentLocationReady: boolean;
  evidencePacketLinked: boolean;
  ownerReady: boolean;
  releaseGateDocumented: boolean;
  signerReady: boolean;
  targetAttached: boolean;
}): NativeSignedArtifactExternalHandoffCloseoutStatus {
  if (!input.attachmentLocationReady || !input.ownerReady || !input.releaseGateDocumented || !input.evidencePacketLinked) {
    return "blocked";
  }

  if (!input.signerReady || !input.targetAttached) {
    return "review";
  }

  return "ready";
}

function nextActionFor(
  row: Pick<
    NativeSignedArtifactExternalHandoffRow,
    | "attachmentLocationReady"
    | "evidencePacketLinked"
    | "ownerReady"
    | "platform"
    | "releaseGateDocumented"
    | "signerReady"
    | "status"
    | "targetAttachedAt"
  >,
) {
  if (row.status === "blocked") {
    return `Resolve blocked native signed artifact external handoff closeout for ${row.platform}.`;
  }

  if (!row.attachmentLocationReady) {
    return `Attach external signed artifact location for ${row.platform}.`;
  }

  if (!row.ownerReady) {
    return `Assign and acknowledge native signed artifact handoff owner for ${row.platform}.`;
  }

  if (!row.releaseGateDocumented) {
    return `Document blocked release gate for external signed artifact on ${row.platform}.`;
  }

  if (!row.evidencePacketLinked) {
    return `Link signed artifact evidence packet for ${row.platform}.`;
  }

  if (!row.signerReady) {
    return `Confirm signer identity and certificate authority for ${row.platform}.`;
  }

  if (!row.targetAttachedAt.trim()) {
    return `Schedule external signed artifact attachment for ${row.platform}.`;
  }

  return `Keep native signed artifact external handoff closeout current for ${row.platform}.`;
}

function createRow(input: NativeSignedArtifactExternalHandoffInput): NativeSignedArtifactExternalHandoffRow {
  const artifactAttachmentLocation = input.artifactAttachmentLocation.trim();
  const artifactFileName = input.artifactFileName.trim();
  const blockingGate = input.blockingGate.trim();
  const certificateAuthority = input.certificateAuthority.trim();
  const evidencePacketUrl = input.evidencePacketUrl.trim();
  const handoffOwner = input.handoffOwner.trim();
  const signerIdentity = input.signerIdentity.trim();
  const targetAttachedAt = input.targetAttachedAt.trim();
  const attachmentLocationReady = artifactAttachmentLocation.length > 0 && artifactFileName.length > 0;
  const evidencePacketLinked = urlReady(evidencePacketUrl);
  const ownerReady = handoffOwner.length > 0 && input.ownerAcknowledged;
  const releaseGateDocumented = blockingGate.length > 0 && input.gateBlockedWithoutArtifact && input.releaseApprovalRequired;
  const signerReady = signerIdentity.length > 0 && certificateAuthority.length > 0;
  const status = statusFor({
    attachmentLocationReady,
    evidencePacketLinked,
    ownerReady,
    releaseGateDocumented,
    signerReady,
    targetAttached: targetAttachedAt.length > 0,
  });
  const rowWithoutHash = {
    artifactAttachmentLocation,
    artifactFileName,
    attachmentLocationReady,
    blockingGate,
    certificateAuthority,
    evidencePacketLinked,
    evidencePacketUrl,
    gateBlockedWithoutArtifact: input.gateBlockedWithoutArtifact,
    handoffOwner,
    nextAction: "",
    ownerAcknowledged: input.ownerAcknowledged,
    ownerReady,
    platform: input.platform,
    releaseApprovalRequired: input.releaseApprovalRequired,
    releaseGateDocumented,
    signerIdentity,
    signerReady,
    status,
    targetAttachedAt,
  } satisfies Omit<NativeSignedArtifactExternalHandoffRow, "closeoutHash">;
  const row = {
    ...rowWithoutHash,
    nextAction: nextActionFor(rowWithoutHash),
  };

  return {
    ...row,
    closeoutHash: sha256(row),
  };
}

function createRows(input: CreateNativeSignedArtifactExternalHandoffCloseoutInput) {
  const handoffByPlatform = new Map(input.handoffs.map((handoff) => [handoff.platform, handoff]));
  const requiredPlatforms = input.requiredPlatforms ?? defaultRequiredPlatforms;

  return requiredPlatforms
    .map((platform) => createRow(handoffByPlatform.get(platform) ?? missingHandoff(platform)))
    .sort((first, second) => platformRank[first.platform] - platformRank[second.platform]);
}

function summarize(rows: NativeSignedArtifactExternalHandoffRow[]): NativeSignedArtifactExternalHandoffCloseoutReport["summary"] {
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const blockedReleaseGateCount = rows.filter((row) => row.releaseGateDocumented && row.gateBlockedWithoutArtifact).length;
  const ownerAcknowledgedCount = rows.filter((row) => row.ownerReady).length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const status: NativeSignedArtifactExternalHandoffCloseoutStatus = blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready";

  return {
    blockedCount,
    blockedReleaseGateCount,
    closeoutHash: sha256(rows.map((row) => row.closeoutHash)),
    closeoutScore: Math.max(0, Math.min(100, Math.round((readyCount / Math.max(1, rows.length)) * 100 + reviewCount * 20 - blockedCount * 18))),
    nextAction:
      status === "blocked"
        ? "Resolve blocked native signed artifact external handoff closeout before runtime closeout."
        : status === "review"
          ? "Review native signed artifact external handoff closeout before runtime closeout."
          : "Native signed artifact external handoff closeout is ready for runtime closeout.",
    ownerAcknowledgedCount,
    readyCount,
    reviewCount,
    rowCount: rows.length,
    status,
  };
}

function createCsv(rows: NativeSignedArtifactExternalHandoffRow[]) {
  const header = [
    "platform",
    "status",
    "artifact_file_name",
    "attachment_location_ready",
    "owner_ready",
    "release_gate_documented",
    "gate_blocked_without_artifact",
    "evidence_packet_linked",
    "closeout_hash",
    "next_action",
  ];
  const body = rows.map((row) =>
    [
      row.platform,
      row.status,
      row.artifactFileName,
      row.attachmentLocationReady,
      row.ownerReady,
      row.releaseGateDocumented,
      row.gateBlockedWithoutArtifact,
      row.evidencePacketLinked,
      row.closeoutHash,
      row.nextAction,
    ]
      .map(csvCell)
      .join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function filesFor(input: {
  csvDataUri: string;
  csvFileName: string;
  jsonDataUri: string;
  jsonFileName: string;
}): NativeSignedArtifactExternalHandoffCloseoutFile[] {
  return [
    {
      download: input.csvFileName,
      format: "csv",
      href: input.csvDataUri,
      label: "CSV closeout",
    },
    {
      download: input.jsonFileName,
      format: "json",
      href: input.jsonDataUri,
      label: "JSON closeout",
    },
  ];
}

export function createNativeSignedArtifactExternalHandoffCloseout(
  input: CreateNativeSignedArtifactExternalHandoffCloseoutInput,
): NativeSignedArtifactExternalHandoffCloseoutReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? "workspace";
  const rows = createRows(input);
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
  const fileBase = `${slug(workspaceId)}-native-signed-artifact-external-handoff-closeout-${slug(input.releaseCandidateId)}-${dateStamp(generatedAt)}`;
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
