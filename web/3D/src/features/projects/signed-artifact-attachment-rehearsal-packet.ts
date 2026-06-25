import { createHash } from "node:crypto";

import type { NativeArtifactStorageHandoffPlatform } from "@/features/projects/native-artifact-storage-handoff-evidence";

export type SignedArtifactAttachmentRehearsalPacketStatus =
  | "blocked"
  | "ready"
  | "review";

export type SignedArtifactAttachmentRehearsalFileFormat = "csv" | "json";

export interface SignedArtifactAttachmentRehearsalInput {
  readonly artifactSha256?: string;
  readonly artifactUrl?: string;
  readonly certificateEvidenceOwner?: string;
  readonly certificateEvidenceUrl?: string;
  readonly checksumConfirmedAt?: string;
  readonly checksumConfirmationHash?: string;
  readonly localFixturePath?: string;
  readonly platform: NativeArtifactStorageHandoffPlatform;
}

export interface SignedArtifactAttachmentRehearsalPacketInput {
  readonly generatedAt?: string;
  readonly releaseCandidateId: string;
  readonly rehearsals: readonly SignedArtifactAttachmentRehearsalInput[];
  readonly workspaceId: string;
}

export interface SignedArtifactAttachmentRehearsalRow
  extends Required<SignedArtifactAttachmentRehearsalInput> {
  readonly artifactUrlReady: boolean;
  readonly certificateOwnerReady: boolean;
  readonly checksumConfirmed: boolean;
  readonly localFixtureReady: boolean;
  readonly nextAction: string;
  readonly rehearsalHash: string;
  readonly status: SignedArtifactAttachmentRehearsalPacketStatus;
}

export interface SignedArtifactAttachmentRehearsalSummary {
  readonly artifactUrlReadyCount: number;
  readonly blockedCount: number;
  readonly certificateOwnerReadyCount: number;
  readonly checksumConfirmedCount: number;
  readonly localFixtureReadyCount: number;
  readonly nextAction: string;
  readonly readyCount: number;
  readonly rehearsalHash: string;
  readonly rehearsalScore: number;
  readonly reviewCount: number;
  readonly status: SignedArtifactAttachmentRehearsalPacketStatus;
  readonly totalCount: number;
}

export interface SignedArtifactAttachmentRehearsalFile {
  readonly content: string;
  readonly dataUri: string;
  readonly fileName: string;
  readonly format: SignedArtifactAttachmentRehearsalFileFormat;
}

export interface SignedArtifactAttachmentRehearsalPacket {
  readonly csv: string;
  readonly csvContent: string;
  readonly csvFileName: string;
  readonly files: readonly SignedArtifactAttachmentRehearsalFile[];
  readonly generatedAt: string;
  readonly json: string;
  readonly jsonContent: string;
  readonly jsonFileName: string;
  readonly releaseCandidateId: string;
  readonly rows: readonly SignedArtifactAttachmentRehearsalRow[];
  readonly summary: SignedArtifactAttachmentRehearsalSummary;
  readonly workspaceId: string;
}

const REQUIRED_PLATFORMS: readonly NativeArtifactStorageHandoffPlatform[] = [
  "windows",
  "macos",
  "linux",
];

export function createSignedArtifactAttachmentRehearsalPacket(
  input: SignedArtifactAttachmentRehearsalPacketInput,
): SignedArtifactAttachmentRehearsalPacket {
  const generatedAt = input.generatedAt ?? new Date(0).toISOString();
  const rehearsalsByPlatform = new Map(
    input.rehearsals.map((rehearsal) => [rehearsal.platform, rehearsal]),
  );

  const rows = REQUIRED_PLATFORMS.map((platform) =>
    createRehearsalRow(platform, rehearsalsByPlatform.get(platform)),
  );
  const summary = createSummary(rows);
  const csv = createCsv(rows);
  const json = JSON.stringify(
    {
      generatedAt,
      releaseCandidateId: input.releaseCandidateId,
      rows,
      summary,
      workspaceId: input.workspaceId,
    },
    null,
    2,
  );
  const baseFileName = [
    slugify(input.workspaceId),
    "signed-artifact-attachment-rehearsal-packet",
    slugify(input.releaseCandidateId),
    dateStamp(generatedAt),
  ].join("-");
  const csvFileName = `${baseFileName}.csv`;
  const jsonFileName = `${baseFileName}.json`;

  return {
    csv,
    csvContent: csv,
    csvFileName,
    files: [
      createFile(csvFileName, "csv", csv),
      createFile(jsonFileName, "json", json),
    ],
    generatedAt,
    json,
    jsonContent: json,
    jsonFileName,
    releaseCandidateId: input.releaseCandidateId,
    rows,
    summary,
    workspaceId: input.workspaceId,
  };
}

function createRehearsalRow(
  platform: NativeArtifactStorageHandoffPlatform,
  rehearsal?: SignedArtifactAttachmentRehearsalInput,
): SignedArtifactAttachmentRehearsalRow {
  const rowInput: Required<SignedArtifactAttachmentRehearsalInput> = {
    artifactSha256: rehearsal?.artifactSha256?.trim() ?? "",
    artifactUrl: rehearsal?.artifactUrl?.trim() ?? "",
    certificateEvidenceOwner:
      rehearsal?.certificateEvidenceOwner?.trim() ?? "",
    certificateEvidenceUrl: rehearsal?.certificateEvidenceUrl?.trim() ?? "",
    checksumConfirmedAt: rehearsal?.checksumConfirmedAt?.trim() ?? "",
    checksumConfirmationHash:
      rehearsal?.checksumConfirmationHash?.trim() ?? "",
    localFixturePath: rehearsal?.localFixturePath?.trim() ?? "",
    platform,
  };
  const artifactUrlReady =
    rowInput.artifactSha256.startsWith("sha256:") &&
    rowInput.artifactUrl.startsWith("https://");
  const localFixtureReady = rowInput.localFixturePath.length > 0;
  const checksumConfirmed =
    rowInput.checksumConfirmationHash.startsWith("sha256:") &&
    Number.isFinite(Date.parse(rowInput.checksumConfirmedAt));
  const certificateOwnerReady =
    rowInput.certificateEvidenceOwner.length > 0 &&
    rowInput.certificateEvidenceUrl.startsWith("https://");
  const status: SignedArtifactAttachmentRehearsalPacketStatus =
    artifactUrlReady &&
    localFixtureReady &&
    checksumConfirmed &&
    certificateOwnerReady
      ? "ready"
      : "blocked";
  const nextAction =
    status === "ready"
      ? "Attach signed artifact evidence to the native release approval packet."
      : "Resolve missing signed artifact URL, fixture, checksum, or certificate owner evidence.";
  const rehearsalHash = hashJson({
    artifactSha256: rowInput.artifactSha256,
    artifactUrl: rowInput.artifactUrl,
    certificateEvidenceOwner: rowInput.certificateEvidenceOwner,
    certificateEvidenceUrl: rowInput.certificateEvidenceUrl,
    checksumConfirmedAt: rowInput.checksumConfirmedAt,
    checksumConfirmationHash: rowInput.checksumConfirmationHash,
    localFixturePath: rowInput.localFixturePath,
    platform,
  });

  return {
    ...rowInput,
    artifactUrlReady,
    certificateOwnerReady,
    checksumConfirmed,
    localFixtureReady,
    nextAction,
    rehearsalHash,
    status,
  };
}

function createSummary(
  rows: readonly SignedArtifactAttachmentRehearsalRow[],
): SignedArtifactAttachmentRehearsalSummary {
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const status: SignedArtifactAttachmentRehearsalPacketStatus =
    blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready";
  const artifactUrlReadyCount = rows.filter(
    (row) => row.artifactUrlReady,
  ).length;
  const localFixtureReadyCount = rows.filter(
    (row) => row.localFixtureReady,
  ).length;
  const checksumConfirmedCount = rows.filter(
    (row) => row.checksumConfirmed,
  ).length;
  const certificateOwnerReadyCount = rows.filter(
    (row) => row.certificateOwnerReady,
  ).length;
  const readinessSignals =
    artifactUrlReadyCount +
    localFixtureReadyCount +
    checksumConfirmedCount +
    certificateOwnerReadyCount;
  const rehearsalScore = Math.round((readinessSignals / (rows.length * 4)) * 100);

  return {
    artifactUrlReadyCount,
    blockedCount,
    certificateOwnerReadyCount,
    checksumConfirmedCount,
    localFixtureReadyCount,
    nextAction:
      status === "ready"
        ? "Signed artifact attachment rehearsals are ready for native release approval."
        : "Resolve blocked signed artifact attachment rehearsal packet before native release attachment approval.",
    readyCount,
    rehearsalHash: hashJson(rows),
    rehearsalScore,
    reviewCount,
    status,
    totalCount: rows.length,
  };
}

function createCsv(
  rows: readonly SignedArtifactAttachmentRehearsalRow[],
): string {
  const header = [
    "platform",
    "status",
    "artifact_url_ready",
    "local_fixture_ready",
    "checksum_confirmed",
    "certificate_owner_ready",
    "rehearsal_hash",
    "next_action",
  ];
  const records = rows.map((row) => [
    row.platform,
    row.status,
    String(row.artifactUrlReady),
    String(row.localFixtureReady),
    String(row.checksumConfirmed),
    String(row.certificateOwnerReady),
    row.rehearsalHash,
    row.nextAction,
  ]);

  return [header, ...records].map(csvRow).join("\n");
}

function createFile(
  fileName: string,
  format: SignedArtifactAttachmentRehearsalFileFormat,
  content: string,
): SignedArtifactAttachmentRehearsalFile {
  const mediaType = format === "csv" ? "text/csv" : "application/json";

  return {
    content,
    dataUri: `data:${mediaType};base64,${Buffer.from(content).toString("base64")}`,
    fileName,
    format,
  };
}

function csvRow(values: readonly string[]): string {
  return values
    .map((value) => {
      const escaped = value.replaceAll('"', '""');

      return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
    })
    .join(",");
}

function hashJson(value: unknown): string {
  return `sha256:${createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex")}`;
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function dateStamp(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "undated";
  }

  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("");
}
