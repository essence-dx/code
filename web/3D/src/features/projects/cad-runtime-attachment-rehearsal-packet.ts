import { createHash } from "node:crypto";

import type { CadConversionWorkerAdapterId } from "@/features/projects/cad-conversion-worker";

export type CadRuntimeAttachmentRehearsalPacketStatus =
  | "blocked"
  | "ready"
  | "review";

export type CadRuntimeAttachmentRehearsalFileFormat = "csv" | "json";

export interface CadRuntimeAttachmentInput {
  readonly adapterId: CadConversionWorkerAdapterId;
  readonly bundlePath?: string;
  readonly fallbackApprovalOwner?: string;
  readonly fallbackApprovalUrl?: string;
  readonly fixtureCorpusArtifactPath?: string;
  readonly fixtureCorpusArtifactSha256?: string;
  readonly outputEvidenceSha256?: string;
  readonly outputEvidenceUrl?: string;
  readonly packagedBundleSha256?: string;
}

export interface CadRuntimeAttachmentRehearsalPacketInput {
  readonly attachments: readonly CadRuntimeAttachmentInput[];
  readonly generatedAt?: string;
  readonly releaseCandidateId: string;
  readonly requiredAdapters?: readonly CadConversionWorkerAdapterId[];
  readonly workspaceId?: string;
}

export interface CadRuntimeAttachmentRehearsalRow
  extends Required<CadRuntimeAttachmentInput> {
  readonly bundlePathReady: boolean;
  readonly fallbackOwnerReady: boolean;
  readonly fixtureCorpusReady: boolean;
  readonly nextAction: string;
  readonly outputEvidenceReady: boolean;
  readonly rehearsalHash: string;
  readonly status: CadRuntimeAttachmentRehearsalPacketStatus;
}

export interface CadRuntimeAttachmentRehearsalSummary {
  readonly blockedCount: number;
  readonly bundlePathReadyCount: number;
  readonly fallbackOwnerReadyCount: number;
  readonly fixtureCorpusReadyCount: number;
  readonly nextAction: string;
  readonly outputEvidenceReadyCount: number;
  readonly readyCount: number;
  readonly rehearsalHash: string;
  readonly rehearsalScore: number;
  readonly reviewCount: number;
  readonly rowCount: number;
  readonly status: CadRuntimeAttachmentRehearsalPacketStatus;
}

export interface CadRuntimeAttachmentRehearsalFile {
  readonly download: string;
  readonly format: CadRuntimeAttachmentRehearsalFileFormat;
  readonly href: string;
  readonly label: string;
}

export interface CadRuntimeAttachmentRehearsalPacket {
  readonly csvContent: string;
  readonly csvDataUri: string;
  readonly csvFileName: string;
  readonly files: CadRuntimeAttachmentRehearsalFile[];
  readonly generatedAt: string;
  readonly jsonContent: string;
  readonly jsonDataUri: string;
  readonly jsonFileName: string;
  readonly releaseCandidateId: string;
  readonly rows: CadRuntimeAttachmentRehearsalRow[];
  readonly summary: CadRuntimeAttachmentRehearsalSummary;
  readonly workspaceId: string;
}

const defaultRequiredAdapters: readonly CadConversionWorkerAdapterId[] = [
  "freecad",
  "occt",
];

const adapterRank: Record<CadConversionWorkerAdapterId, number> = {
  freecad: 0,
  occt: 1,
};

export function createCadRuntimeAttachmentRehearsalPacket(
  input: CadRuntimeAttachmentRehearsalPacketInput,
): CadRuntimeAttachmentRehearsalPacket {
  const generatedAt = input.generatedAt ?? new Date(0).toISOString();
  const releaseCandidateId = input.releaseCandidateId;
  const workspaceId = input.workspaceId ?? "Essence Runtime";
  const attachmentsByAdapter = new Map(
    input.attachments.map((attachment) => [attachment.adapterId, attachment]),
  );
  const requiredAdapters = [
    ...(input.requiredAdapters ?? defaultRequiredAdapters),
  ].sort((first, second) => adapterRank[first] - adapterRank[second]);
  const rows = requiredAdapters.map((adapterId) =>
    createRow(attachmentsByAdapter.get(adapterId) ?? missingAttachment(adapterId)),
  );
  const summary = createSummary(rows);
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
  const baseFileName = `${slug(workspaceId)}-cad-runtime-attachment-rehearsal-packet-${slug(
    releaseCandidateId,
  )}-${dateStamp(generatedAt)}`;
  const csvFileName = `${baseFileName}.csv`;
  const jsonFileName = `${baseFileName}.json`;
  const csvDataUri = encodeDataUri("text/csv", csvContent);
  const jsonDataUri = encodeDataUri("application/json", jsonContent);

  return {
    csvContent,
    csvDataUri,
    csvFileName,
    files: [
      {
        download: csvFileName,
        format: "csv",
        href: csvDataUri,
        label: "CAD runtime attachment rehearsal CSV",
      },
      {
        download: jsonFileName,
        format: "json",
        href: jsonDataUri,
        label: "CAD runtime attachment rehearsal JSON",
      },
    ],
    generatedAt,
    jsonContent,
    jsonDataUri,
    jsonFileName,
    releaseCandidateId,
    rows,
    summary,
    workspaceId,
  };
}

function missingAttachment(
  adapterId: CadConversionWorkerAdapterId,
): Required<CadRuntimeAttachmentInput> {
  return {
    adapterId,
    bundlePath: "",
    fallbackApprovalOwner: "",
    fallbackApprovalUrl: "",
    fixtureCorpusArtifactPath: "",
    fixtureCorpusArtifactSha256: "",
    outputEvidenceSha256: "",
    outputEvidenceUrl: "",
    packagedBundleSha256: "",
  };
}

function createRow(
  input: CadRuntimeAttachmentInput,
): CadRuntimeAttachmentRehearsalRow {
  const rowInput: Required<CadRuntimeAttachmentInput> = {
    adapterId: input.adapterId,
    bundlePath: input.bundlePath?.trim() ?? "",
    fallbackApprovalOwner: input.fallbackApprovalOwner?.trim() ?? "",
    fallbackApprovalUrl: input.fallbackApprovalUrl?.trim() ?? "",
    fixtureCorpusArtifactPath: input.fixtureCorpusArtifactPath?.trim() ?? "",
    fixtureCorpusArtifactSha256:
      input.fixtureCorpusArtifactSha256?.trim() ?? "",
    outputEvidenceSha256: input.outputEvidenceSha256?.trim() ?? "",
    outputEvidenceUrl: input.outputEvidenceUrl?.trim() ?? "",
    packagedBundleSha256: input.packagedBundleSha256?.trim() ?? "",
  };
  const bundlePathReady =
    rowInput.bundlePath.length > 0 &&
    hasSha256(rowInput.packagedBundleSha256);
  const fixtureCorpusReady =
    rowInput.fixtureCorpusArtifactPath.length > 0 &&
    hasSha256(rowInput.fixtureCorpusArtifactSha256);
  const outputEvidenceReady =
    rowInput.outputEvidenceUrl.startsWith("https://") &&
    hasSha256(rowInput.outputEvidenceSha256);
  const fallbackOwnerReady =
    rowInput.fallbackApprovalOwner.length > 0 &&
    rowInput.fallbackApprovalUrl.startsWith("https://");
  const status: CadRuntimeAttachmentRehearsalPacketStatus =
    bundlePathReady &&
    fixtureCorpusReady &&
    outputEvidenceReady &&
    fallbackOwnerReady
      ? "ready"
      : "blocked";
  const nextAction =
    status === "ready"
      ? `Attach CAD runtime evidence for ${rowInput.adapterId}.`
      : `Resolve blocked CAD runtime attachment evidence for ${rowInput.adapterId}.`;

  return {
    ...rowInput,
    bundlePathReady,
    fallbackOwnerReady,
    fixtureCorpusReady,
    nextAction,
    outputEvidenceReady,
    rehearsalHash: sha256(rowInput),
    status,
  };
}

function createSummary(
  rows: readonly CadRuntimeAttachmentRehearsalRow[],
): CadRuntimeAttachmentRehearsalSummary {
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const bundlePathReadyCount = rows.filter(
    (row) => row.bundlePathReady,
  ).length;
  const fixtureCorpusReadyCount = rows.filter(
    (row) => row.fixtureCorpusReady,
  ).length;
  const outputEvidenceReadyCount = rows.filter(
    (row) => row.outputEvidenceReady,
  ).length;
  const fallbackOwnerReadyCount = rows.filter(
    (row) => row.fallbackOwnerReady,
  ).length;
  const status: CadRuntimeAttachmentRehearsalPacketStatus =
    blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready";
  const readySignals =
    bundlePathReadyCount +
    fixtureCorpusReadyCount +
    outputEvidenceReadyCount +
    fallbackOwnerReadyCount;

  return {
    blockedCount,
    bundlePathReadyCount,
    fallbackOwnerReadyCount,
    fixtureCorpusReadyCount,
    nextAction:
      status === "ready"
        ? "CAD runtime attachment rehearsals are ready for native release approval."
        : "Resolve blocked CAD runtime attachment rehearsal packet before native release attachment approval.",
    outputEvidenceReadyCount,
    readyCount,
    rehearsalHash: sha256(rows),
    rehearsalScore: Math.round((readySignals / (rows.length * 4)) * 100),
    reviewCount,
    rowCount: rows.length,
    status,
  };
}

function createCsv(rows: readonly CadRuntimeAttachmentRehearsalRow[]) {
  const header = [
    "adapter_id",
    "status",
    "bundle_path_ready",
    "fixture_corpus_ready",
    "output_evidence_ready",
    "fallback_owner_ready",
    "rehearsal_hash",
    "next_action",
  ];
  const records = rows.map((row) => [
    row.adapterId,
    row.status,
    String(row.bundlePathReady),
    String(row.fixtureCorpusReady),
    String(row.outputEvidenceReady),
    String(row.fallbackOwnerReady),
    row.rehearsalHash,
    row.nextAction,
  ]);

  return [header, ...records].map((row) => row.map(csvCell).join(",")).join("\n");
}

function hasSha256(value: string) {
  return value.startsWith("sha256:");
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
  return `sha256:${createHash("sha256")
    .update(typeof value === "string" ? value : stableJson(value))
    .digest("hex")}`;
}

function csvCell(value: string) {
  const escaped = value.replaceAll('"', '""');

  return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
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

  return Number.isNaN(date.getTime())
    ? "current"
    : date.toISOString().slice(0, 10).replaceAll("-", "");
}
