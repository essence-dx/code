import { createHash } from "node:crypto";
import type { BoardReleaseArchiveEvidenceDiffSnapshotReport } from "@/features/projects/board-release-archive-evidence-diff-snapshots";
import type { BoardReleaseArchiveEvidenceRetentionVaultManifest, BoardReleaseArchiveEvidenceRetentionVaultReport } from "@/features/projects/board-release-archive-evidence-retention-vault";
import type { WorkspaceMemberRow, WorkspaceRole } from "@/features/workspaces/types";

export type BoardReleaseArchiveEvidenceReviewerAudience = "client" | "internal-board" | "investor" | "partner";
export type BoardReleaseArchiveEvidenceReviewerPacketStatus = "blocked" | "ready" | "watch";
export type BoardReleaseArchiveEvidenceReviewerVisibility = "external-redacted" | "internal-full";

export interface BoardReleaseArchiveEvidenceReviewerPacket {
  acknowledgementRequired: boolean;
  acknowledgementWindowHours: number;
  audience: BoardReleaseArchiveEvidenceReviewerAudience;
  evidenceHash: string;
  id: string;
  nextAction: string;
  packetHash: string;
  redactedSummary: string;
  redactionCount: number;
  removedFields: string[];
  requiredRole: WorkspaceRole | "external";
  reviewerEmail: string | null;
  reviewerName: string;
  sourceHashes: string[];
  status: BoardReleaseArchiveEvidenceReviewerPacketStatus;
  title: string;
  visibility: BoardReleaseArchiveEvidenceReviewerVisibility;
}

export interface BoardReleaseArchiveEvidenceReviewerPacketReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  packets: BoardReleaseArchiveEvidenceReviewerPacket[];
  summary: {
    acknowledgementRequiredCount: number;
    blockedCount: number;
    externalPacketCount: number;
    nextAction: string;
    packetCount: number;
    readyCount: number;
    reviewerPacketHash: string;
    reviewerScore: number;
    status: BoardReleaseArchiveEvidenceReviewerPacketStatus;
    totalRedactionCount: number;
    watchCount: number;
  };
  workspaceId: string;
}

export interface CreateBoardReleaseArchiveEvidenceReviewerPacketReportInput {
  diffSnapshots: BoardReleaseArchiveEvidenceDiffSnapshotReport;
  generatedAt?: string;
  members: WorkspaceMemberRow[];
  retentionVault: BoardReleaseArchiveEvidenceRetentionVaultReport;
  workspaceId?: string;
}

interface AudienceConfig {
  acknowledgementWindowHours: number;
  audience: BoardReleaseArchiveEvidenceReviewerAudience;
  keepDiffHash: boolean;
  keepFileNames: boolean;
  keepRawHashes: boolean;
  label: string;
  removedFields: string[];
  requiredRole: WorkspaceRole | "external";
  reviewerName: string;
  visibility: BoardReleaseArchiveEvidenceReviewerVisibility;
}

const audienceConfigs: AudienceConfig[] = [
  {
    acknowledgementWindowHours: 24,
    audience: "internal-board",
    keepDiffHash: true,
    keepFileNames: true,
    keepRawHashes: true,
    label: "Internal board archive evidence",
    removedFields: [],
    requiredRole: "owner",
    reviewerName: "Internal board reviewer",
    visibility: "internal-full",
  },
  {
    acknowledgementWindowHours: 72,
    audience: "investor",
    keepDiffHash: false,
    keepFileNames: false,
    keepRawHashes: false,
    label: "Investor archive evidence",
    removedFields: ["raw vault hashes", "file names", "operator status detail", "internal command-center labels"],
    requiredRole: "external",
    reviewerName: "Investor reviewer",
    visibility: "external-redacted",
  },
  {
    acknowledgementWindowHours: 48,
    audience: "client",
    keepDiffHash: false,
    keepFileNames: false,
    keepRawHashes: false,
    label: "Client archive evidence",
    removedFields: ["raw vault hashes", "file names", "internal operator labels"],
    requiredRole: "external",
    reviewerName: "Client reviewer",
    visibility: "external-redacted",
  },
  {
    acknowledgementWindowHours: 48,
    audience: "partner",
    keepDiffHash: true,
    keepFileNames: false,
    keepRawHashes: false,
    label: "Partner archive evidence",
    removedFields: ["raw vault hashes", "file names", "personal reviewer routing"],
    requiredRole: "external",
    reviewerName: "Partner reviewer",
    visibility: "external-redacted",
  },
];

const statusRank: Record<BoardReleaseArchiveEvidenceReviewerPacketStatus, number> = {
  blocked: 0,
  watch: 1,
  ready: 2,
};

const audienceRank: Record<BoardReleaseArchiveEvidenceReviewerAudience, number> = {
  "internal-board": 0,
  investor: 1,
  client: 2,
  partner: 3,
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

function csvCell(value: string | number | null | boolean) {
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

function findInternalReviewer(members: WorkspaceMemberRow[]) {
  return members.find((member) => member.role === "owner") ?? members.find((member) => member.role === "admin") ?? null;
}

function sourceHashesFor(input: {
  config: AudienceConfig;
  diffSnapshots: BoardReleaseArchiveEvidenceDiffSnapshotReport;
  retentionVault: BoardReleaseArchiveEvidenceRetentionVaultReport;
}) {
  const vaultHashes = input.config.keepRawHashes ? input.retentionVault.manifests.map((manifest) => manifest.vaultHash) : input.retentionVault.manifests.map(redactedSourceHash);
  const diffHash = input.config.keepDiffHash ? input.diffSnapshots.summary.snapshotHash : redactedSourceHash({ kind: "diff", vaultHash: input.diffSnapshots.summary.snapshotHash });

  return [input.retentionVault.summary.vaultHash, diffHash, ...vaultHashes];
}

function redactedSourceHash(source: Pick<BoardReleaseArchiveEvidenceRetentionVaultManifest, "kind" | "vaultHash"> | { kind: string; vaultHash: string }) {
  return sha256({
    kind: source.kind,
    redacted: true,
    sourceHash: source.vaultHash,
  });
}

function summaryText(input: {
  config: AudienceConfig;
  diffSnapshots: BoardReleaseArchiveEvidenceDiffSnapshotReport;
  retentionVault: BoardReleaseArchiveEvidenceRetentionVaultReport;
}) {
  const changed = input.diffSnapshots.summary.changedCount + input.diffSnapshots.summary.addedCount + input.diffSnapshots.summary.missingCount;
  const fileNames = input.config.keepFileNames
    ? ` Included files: ${input.retentionVault.manifests.map((manifest) => manifest.fileName).join(", ")}.`
    : " Internal file names are withheld from this packet.";

  return `${input.config.label}: ${input.retentionVault.summary.sealedCount}/${input.retentionVault.summary.manifestCount} vault bundles sealed, ${changed} diff rows need reviewer awareness.${fileNames}`;
}

function packetStatus(input: {
  config: AudienceConfig;
  diffSnapshots: BoardReleaseArchiveEvidenceDiffSnapshotReport;
  reviewer: WorkspaceMemberRow | null;
  retentionVault: BoardReleaseArchiveEvidenceRetentionVaultReport;
}) {
  if (input.retentionVault.summary.status === "blocked" || input.diffSnapshots.summary.status === "blocked") {
    return "blocked";
  }

  if (input.config.requiredRole !== "external" && !input.reviewer) {
    return "blocked";
  }

  if (input.retentionVault.summary.status === "watch" || input.diffSnapshots.summary.status === "watch") {
    return "watch";
  }

  return "ready";
}

function nextActionFor(input: {
  config: AudienceConfig;
  status: BoardReleaseArchiveEvidenceReviewerPacketStatus;
}) {
  if (input.status === "blocked") {
    return `Resolve source evidence blockers before issuing the ${input.config.label} packet.`;
  }

  if (input.status === "watch") {
    return `Review diff drift and collect acknowledgement for the ${input.config.label} packet within ${input.config.acknowledgementWindowHours} hours.`;
  }

  return `Issue the ${input.config.label} packet and retain acknowledgement evidence.`;
}

function createPacket(input: {
  config: AudienceConfig;
  diffSnapshots: BoardReleaseArchiveEvidenceDiffSnapshotReport;
  generatedAt: string;
  internalReviewer: WorkspaceMemberRow | null;
  retentionVault: BoardReleaseArchiveEvidenceRetentionVaultReport;
  workspaceId: string;
}) {
  const reviewer = input.config.requiredRole === "external" ? null : input.internalReviewer;
  const status = packetStatus({
    config: input.config,
    diffSnapshots: input.diffSnapshots,
    retentionVault: input.retentionVault,
    reviewer,
  });
  const sourceHashes = sourceHashesFor({
    config: input.config,
    diffSnapshots: input.diffSnapshots,
    retentionVault: input.retentionVault,
  });
  const redactedSummary = summaryText({
    config: input.config,
    diffSnapshots: input.diffSnapshots,
    retentionVault: input.retentionVault,
  });
  const evidenceHash = sha256({
    audience: input.config.audience,
    redactedSummary,
    sourceHashes,
  });
  const packetHash = sha256({
    acknowledgementWindowHours: input.config.acknowledgementWindowHours,
    audience: input.config.audience,
    evidenceHash,
    removedFields: input.config.removedFields,
    status,
    visibility: input.config.visibility,
  });

  return {
    acknowledgementRequired: true,
    acknowledgementWindowHours: input.config.acknowledgementWindowHours,
    audience: input.config.audience,
    evidenceHash,
    id: `archive-evidence-reviewer:${slug(input.workspaceId)}:${input.config.audience}:${dateStamp(input.generatedAt)}`,
    nextAction: nextActionFor({ config: input.config, status }),
    packetHash,
    redactedSummary,
    redactionCount: input.config.removedFields.length + (input.config.keepRawHashes ? 0 : input.retentionVault.manifests.length),
    removedFields: input.config.removedFields,
    requiredRole: input.config.requiredRole,
    reviewerEmail: reviewer?.email ?? null,
    reviewerName: reviewer?.name ?? input.config.reviewerName,
    sourceHashes,
    status,
    title: input.config.label,
    visibility: input.config.visibility,
  } satisfies BoardReleaseArchiveEvidenceReviewerPacket;
}

function createCsv(packets: BoardReleaseArchiveEvidenceReviewerPacket[]) {
  const header = [
    "packet_id",
    "audience",
    "title",
    "status",
    "visibility",
    "reviewer",
    "reviewer_email",
    "acknowledgement_required",
    "acknowledgement_window_hours",
    "redaction_count",
    "source_hash_count",
    "packet_hash",
    "next_action",
  ];
  const body = packets.map((packet) =>
    [
      packet.id,
      packet.audience,
      packet.title,
      packet.status,
      packet.visibility,
      packet.reviewerName,
      packet.reviewerEmail,
      packet.acknowledgementRequired,
      packet.acknowledgementWindowHours,
      packet.redactionCount,
      packet.sourceHashes.length,
      packet.packetHash,
      packet.nextAction,
    ]
      .map(csvCell)
      .join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function summarize(packets: BoardReleaseArchiveEvidenceReviewerPacket[]): BoardReleaseArchiveEvidenceReviewerPacketReport["summary"] {
  const blockedCount = packets.filter((packet) => packet.status === "blocked").length;
  const watchCount = packets.filter((packet) => packet.status === "watch").length;
  const readyCount = packets.filter((packet) => packet.status === "ready").length;
  const status = packets.reduce<BoardReleaseArchiveEvidenceReviewerPacketStatus>(
    (worst, packet) => (statusRank[packet.status] < statusRank[worst] ? packet.status : worst),
    "ready",
  );
  const nextPacket = packets.find((packet) => packet.status !== "ready") ?? packets[0] ?? null;

  return {
    acknowledgementRequiredCount: packets.filter((packet) => packet.acknowledgementRequired).length,
    blockedCount,
    externalPacketCount: packets.filter((packet) => packet.visibility === "external-redacted").length,
    nextAction: status === "ready" ? "Reviewer packets are ready to issue with acknowledgement tracking." : (nextPacket?.nextAction ?? "Create reviewer packets."),
    packetCount: packets.length,
    readyCount,
    reviewerPacketHash: sha256(packets.map((packet) => packet.packetHash)),
    reviewerScore: Math.max(0, Math.round((readyCount / Math.max(packets.length, 1)) * 100 - blockedCount * 12 - watchCount * 4)),
    status,
    totalRedactionCount: packets.reduce((sum, packet) => sum + packet.redactionCount, 0),
    watchCount,
  };
}

function createJson(input: {
  generatedAt: string;
  packets: BoardReleaseArchiveEvidenceReviewerPacket[];
  summary: BoardReleaseArchiveEvidenceReviewerPacketReport["summary"];
  workspaceId: string;
}) {
  return JSON.stringify(input, null, 2);
}

export function createBoardReleaseArchiveEvidenceReviewerPacketReport(
  input: CreateBoardReleaseArchiveEvidenceReviewerPacketReportInput,
): BoardReleaseArchiveEvidenceReviewerPacketReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.retentionVault.workspaceId;
  const internalReviewer = findInternalReviewer(input.members);
  const packets = audienceConfigs
    .map((config) =>
      createPacket({
        config,
        diffSnapshots: input.diffSnapshots,
        generatedAt,
        internalReviewer,
        retentionVault: input.retentionVault,
        workspaceId,
      }),
    )
    .sort((first, second) => statusRank[first.status] - statusRank[second.status] || audienceRank[first.audience] - audienceRank[second.audience]);
  const summary = summarize(packets);
  const csvContent = createCsv(packets);
  const jsonContent = createJson({
    generatedAt,
    packets,
    summary,
    workspaceId,
  });
  const fileBase = `${slug(workspaceId)}-board-release-archive-evidence-reviewer-packets-${dateStamp(generatedAt)}`;

  return {
    csvContent,
    csvDataUri: encodeCsvDataUri(csvContent),
    csvFileName: `${fileBase}.csv`,
    generatedAt,
    jsonContent,
    jsonDataUri: encodeJsonDataUri(jsonContent),
    jsonFileName: `${fileBase}.json`,
    packets,
    summary,
    workspaceId,
  };
}
