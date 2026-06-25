import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";

import type { NativeArtifactStorageHandoffPlatform } from "@/features/projects/native-artifact-storage-handoff-evidence";

export type SignedPackageFilesystemVerificationStatus =
  | "blocked"
  | "ready"
  | "review";

export type SignedPackageFilesystemVerificationFileFormat = "csv" | "json";

export interface SignedPackageFilesystemVerificationArtifactInput {
  readonly artifactName: string;
  readonly expectedSha256: string;
  readonly localOutputPath: string;
  readonly ownerAcknowledgedAt: string;
  readonly ownerAcknowledgementHash: string;
  readonly platform: NativeArtifactStorageHandoffPlatform;
  readonly signatureCommand: string;
  readonly signatureExitCode: number;
  readonly signatureFinishedAt: string;
  readonly signatureStartedAt: string;
  readonly signatureStderr: string;
  readonly signatureStdout: string;
  readonly uploadDestinationUrl: string;
  readonly verifierOwner: string;
}

export interface SignedPackageFilesystemVerificationUploadProbeRequest {
  readonly artifact: SignedPackageFilesystemVerificationArtifactInput;
  readonly uploadDestinationUrl: string;
}

export interface SignedPackageFilesystemVerificationUploadProbeResult {
  readonly checkedAt: string;
  readonly reachable: boolean;
  readonly statusCode: number;
}

export type SignedPackageFilesystemVerificationUploadProbe = (
  request: SignedPackageFilesystemVerificationUploadProbeRequest,
) => Promise<SignedPackageFilesystemVerificationUploadProbeResult>;

export interface SignedPackageFilesystemVerificationRow {
  readonly actualSha256: string;
  readonly artifactName: string;
  readonly blockerReason: string;
  readonly byteSize: number;
  readonly expectedSha256: string;
  readonly fileExists: boolean;
  readonly localOutputPath: string;
  readonly nextAction: string;
  readonly ownerAcknowledged: boolean;
  readonly ownerAcknowledgedAt: string;
  readonly ownerAcknowledgementHash: string;
  readonly platform: NativeArtifactStorageHandoffPlatform;
  readonly sha256Matches: boolean;
  readonly signatureCommand: string;
  readonly signatureCommandReady: boolean;
  readonly signatureExitCode: number;
  readonly signatureFinishedAt: string;
  readonly signatureStartedAt: string;
  readonly signatureStderr: string;
  readonly signatureStderrHash: string;
  readonly signatureStdout: string;
  readonly signatureStdoutHash: string;
  readonly signatureTranscriptHash: string;
  readonly signatureTranscriptReady: boolean;
  readonly status: SignedPackageFilesystemVerificationStatus;
  readonly uploadCheckedAt: string;
  readonly uploadDestinationUrl: string;
  readonly uploadReachable: boolean;
  readonly uploadStatusCode: number;
  readonly verificationHash: string;
  readonly verifierOwner: string;
}

export interface SignedPackageFilesystemVerificationFile {
  readonly download: string;
  readonly format: SignedPackageFilesystemVerificationFileFormat;
  readonly href: string;
  readonly label: string;
}

export interface SignedPackageFilesystemVerificationRunPacket {
  readonly csvContent: string;
  readonly csvDataUri: string;
  readonly csvFileName: string;
  readonly files: readonly SignedPackageFilesystemVerificationFile[];
  readonly generatedAt: string;
  readonly jsonContent: string;
  readonly jsonDataUri: string;
  readonly jsonFileName: string;
  readonly releaseCandidateId: string;
  readonly rows: readonly SignedPackageFilesystemVerificationRow[];
  readonly summary: {
    readonly blockedCount: number;
    readonly localOutputReadyCount: number;
    readonly nextAction: string;
    readonly ownerAcknowledgedCount: number;
    readonly readyCount: number;
    readonly releaseBlocked: boolean;
    readonly reviewCount: number;
    readonly rowCount: number;
    readonly sha256MatchCount: number;
    readonly signatureTranscriptReadyCount: number;
    readonly status: SignedPackageFilesystemVerificationStatus;
    readonly uploadReachableCount: number;
    readonly verificationHash: string;
    readonly verificationScore: number;
  };
  readonly workspaceId: string;
}

export interface RunSignedPackageFilesystemVerificationRunPacketInput {
  readonly artifacts: readonly SignedPackageFilesystemVerificationArtifactInput[];
  readonly generatedAt?: string;
  readonly releaseCandidateId: string;
  readonly requiredPlatforms?: readonly NativeArtifactStorageHandoffPlatform[];
  readonly uploadProbe?: SignedPackageFilesystemVerificationUploadProbe;
  readonly workspaceId?: string;
}

const defaultRequiredPlatforms: readonly NativeArtifactStorageHandoffPlatform[] =
  ["windows", "macos", "linux"];

const platformRank: Record<NativeArtifactStorageHandoffPlatform, number> = {
  windows: 0,
  macos: 1,
  linux: 2,
};

export async function runSignedPackageFilesystemVerificationRunPacket(
  input: RunSignedPackageFilesystemVerificationRunPacketInput,
): Promise<SignedPackageFilesystemVerificationRunPacket> {
  const generatedAt = input.generatedAt ?? new Date(0).toISOString();
  const workspaceId = input.workspaceId ?? "Essence Runtime";
  const artifactByPlatform = new Map(
    input.artifacts.map((artifact) => [artifact.platform, artifact]),
  );
  const requiredPlatforms = input.requiredPlatforms ?? defaultRequiredPlatforms;
  const rows = await Promise.all(
    requiredPlatforms.map((platform) =>
      createRow({
        artifact: artifactByPlatform.get(platform) ?? missingArtifact(platform),
        uploadProbe: input.uploadProbe ?? defaultUploadProbe,
      }),
    ),
  );
  const sortedRows = rows.sort(
    (first, second) => platformRank[first.platform] - platformRank[second.platform],
  );
  const summary = summarize(sortedRows);
  const csvContent = createCsv(sortedRows);
  const jsonContent = JSON.stringify(
    {
      generatedAt,
      releaseCandidateId: input.releaseCandidateId,
      rows: sortedRows,
      summary,
      workspaceId,
    },
    null,
    2,
  );
  const fileBase = `${slug(workspaceId)}-signed-package-filesystem-verification-run-packet-${slug(
    input.releaseCandidateId,
  )}-${dateStamp(generatedAt)}`;
  const csvFileName = `${fileBase}.csv`;
  const jsonFileName = `${fileBase}.json`;
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
        label: "Signed package filesystem verification run packet CSV",
      },
      {
        download: jsonFileName,
        format: "json",
        href: jsonDataUri,
        label: "Signed package filesystem verification run packet JSON",
      },
    ],
    generatedAt,
    jsonContent,
    jsonDataUri,
    jsonFileName,
    releaseCandidateId: input.releaseCandidateId,
    rows: sortedRows,
    summary,
    workspaceId,
  };
}

function missingArtifact(
  platform: NativeArtifactStorageHandoffPlatform,
): SignedPackageFilesystemVerificationArtifactInput {
  return {
    artifactName: `${platform}-artifact-missing`,
    expectedSha256: "",
    localOutputPath: "",
    ownerAcknowledgedAt: "",
    ownerAcknowledgementHash: "",
    platform,
    signatureCommand: "",
    signatureExitCode: 1,
    signatureFinishedAt: "",
    signatureStartedAt: "",
    signatureStderr: "",
    signatureStdout: "",
    uploadDestinationUrl: "",
    verifierOwner: "",
  };
}

async function createRow(input: {
  readonly artifact: SignedPackageFilesystemVerificationArtifactInput;
  readonly uploadProbe: SignedPackageFilesystemVerificationUploadProbe;
}): Promise<SignedPackageFilesystemVerificationRow> {
  const artifact = normalizeArtifact(input.artifact);
  const fileEvidence = await readFileEvidence(artifact.localOutputPath);
  const uploadEvidence = await probeUpload(input.uploadProbe, artifact);
  const expectedSha256 = artifact.expectedSha256 || "missing";
  const actualSha256 = fileEvidence.actualSha256 || "missing";
  const sha256Matches =
    fileEvidence.fileExists &&
    hasSha256(expectedSha256) &&
    actualSha256 === expectedSha256;
  const signatureStdoutHash = sha256(artifact.signatureStdout);
  const signatureStderrHash = sha256(artifact.signatureStderr);
  const signatureTranscriptHash = sha256({
    command: artifact.signatureCommand,
    exitCode: artifact.signatureExitCode,
    finishedAt: artifact.signatureFinishedAt,
    startedAt: artifact.signatureStartedAt,
    stderr: artifact.signatureStderr,
    stdout: artifact.signatureStdout,
  });
  const signatureCommandReady =
    artifact.signatureCommand.length > 0 &&
    artifact.signatureCommand.includes(artifact.artifactName);
  const signatureTranscriptReady =
    signatureCommandReady &&
    artifact.signatureExitCode === 0 &&
    validDate(artifact.signatureStartedAt) &&
    validDate(artifact.signatureFinishedAt) &&
    dateOrderReady(artifact.signatureStartedAt, artifact.signatureFinishedAt) &&
    (artifact.signatureStdout.length > 0 || artifact.signatureStderr.length > 0);
  const ownerAcknowledged =
    artifact.verifierOwner.length > 0 &&
    validDate(artifact.ownerAcknowledgedAt) &&
    hasSha256(artifact.ownerAcknowledgementHash);
  const status = statusFor({
    fileExists: fileEvidence.fileExists,
    ownerAcknowledged,
    sha256Matches,
    signatureTranscriptReady,
    uploadReachable: uploadEvidence.reachable,
  });
  const blockerReason = blockerReasonFor({
    fileExists: fileEvidence.fileExists,
    ownerAcknowledged,
    platform: artifact.platform,
    sha256Matches,
    signatureTranscriptReady,
    uploadReachable: uploadEvidence.reachable,
  });
  const rowWithoutHash = {
    actualSha256,
    artifactName: artifact.artifactName,
    blockerReason,
    byteSize: fileEvidence.byteSize,
    expectedSha256,
    fileExists: fileEvidence.fileExists,
    localOutputPath: artifact.localOutputPath,
    nextAction: "",
    ownerAcknowledged,
    ownerAcknowledgedAt: artifact.ownerAcknowledgedAt,
    ownerAcknowledgementHash: artifact.ownerAcknowledgementHash || "missing",
    platform: artifact.platform,
    sha256Matches,
    signatureCommand: artifact.signatureCommand,
    signatureCommandReady,
    signatureExitCode: artifact.signatureExitCode,
    signatureFinishedAt: artifact.signatureFinishedAt,
    signatureStartedAt: artifact.signatureStartedAt,
    signatureStderr: artifact.signatureStderr,
    signatureStderrHash,
    signatureStdout: artifact.signatureStdout,
    signatureStdoutHash,
    signatureTranscriptHash,
    signatureTranscriptReady,
    status,
    uploadCheckedAt: uploadEvidence.checkedAt,
    uploadDestinationUrl: artifact.uploadDestinationUrl,
    uploadReachable: uploadEvidence.reachable,
    uploadStatusCode: uploadEvidence.statusCode,
    verifierOwner: artifact.verifierOwner,
  } satisfies Omit<SignedPackageFilesystemVerificationRow, "verificationHash">;
  const row = {
    ...rowWithoutHash,
    nextAction: nextActionFor(rowWithoutHash),
  };

  return {
    ...row,
    verificationHash: sha256(row),
  };
}

function normalizeArtifact(
  artifact: SignedPackageFilesystemVerificationArtifactInput,
): SignedPackageFilesystemVerificationArtifactInput {
  return {
    artifactName: artifact.artifactName.trim(),
    expectedSha256: artifact.expectedSha256.trim(),
    localOutputPath: artifact.localOutputPath.trim(),
    ownerAcknowledgedAt: artifact.ownerAcknowledgedAt.trim(),
    ownerAcknowledgementHash: artifact.ownerAcknowledgementHash.trim(),
    platform: artifact.platform,
    signatureCommand: artifact.signatureCommand.trim(),
    signatureExitCode: artifact.signatureExitCode,
    signatureFinishedAt: artifact.signatureFinishedAt.trim(),
    signatureStartedAt: artifact.signatureStartedAt.trim(),
    signatureStderr: artifact.signatureStderr.trim(),
    signatureStdout: artifact.signatureStdout.trim(),
    uploadDestinationUrl: artifact.uploadDestinationUrl.trim(),
    verifierOwner: artifact.verifierOwner.trim(),
  };
}

async function readFileEvidence(localOutputPath: string) {
  if (!localOutputPath) {
    return {
      actualSha256: "",
      byteSize: 0,
      fileExists: false,
    };
  }

  try {
    const fileStat = await stat(localOutputPath);
    if (!fileStat.isFile()) {
      return {
        actualSha256: "",
        byteSize: 0,
        fileExists: false,
      };
    }

    const bytes = await readFile(localOutputPath);

    return {
      actualSha256: `sha256:${createHash("sha256").update(bytes).digest("hex")}`,
      byteSize: bytes.byteLength,
      fileExists: true,
    };
  } catch {
    return {
      actualSha256: "",
      byteSize: 0,
      fileExists: false,
    };
  }
}

async function probeUpload(
  uploadProbe: SignedPackageFilesystemVerificationUploadProbe,
  artifact: SignedPackageFilesystemVerificationArtifactInput,
) {
  if (!urlReady(artifact.uploadDestinationUrl)) {
    return {
      checkedAt: "",
      reachable: false,
      statusCode: 0,
    };
  }

  try {
    return await uploadProbe({
      artifact,
      uploadDestinationUrl: artifact.uploadDestinationUrl,
    });
  } catch {
    return {
      checkedAt: "",
      reachable: false,
      statusCode: 0,
    };
  }
}

async function defaultUploadProbe({
  uploadDestinationUrl,
}: SignedPackageFilesystemVerificationUploadProbeRequest): Promise<SignedPackageFilesystemVerificationUploadProbeResult> {
  const response = await fetch(uploadDestinationUrl, { method: "HEAD" });

  return {
    checkedAt: new Date().toISOString(),
    reachable: response.ok,
    statusCode: response.status,
  };
}

function statusFor(input: {
  readonly fileExists: boolean;
  readonly ownerAcknowledged: boolean;
  readonly sha256Matches: boolean;
  readonly signatureTranscriptReady: boolean;
  readonly uploadReachable: boolean;
}): SignedPackageFilesystemVerificationStatus {
  if (!input.fileExists || !input.sha256Matches || !input.signatureTranscriptReady) {
    return "blocked";
  }

  if (!input.uploadReachable || !input.ownerAcknowledged) {
    return "review";
  }

  return "ready";
}

function blockerReasonFor(input: {
  readonly fileExists: boolean;
  readonly ownerAcknowledged: boolean;
  readonly platform: NativeArtifactStorageHandoffPlatform;
  readonly sha256Matches: boolean;
  readonly signatureTranscriptReady: boolean;
  readonly uploadReachable: boolean;
}) {
  const blockers = [
    !input.fileExists ? `${input.platform} local output path is missing` : "",
    !input.sha256Matches ? `${input.platform} package SHA256 does not match bytes` : "",
    !input.signatureTranscriptReady
      ? `${input.platform} signature command transcript is incomplete`
      : "",
    !input.uploadReachable ? `${input.platform} upload destination is not reachable` : "",
    !input.ownerAcknowledged ? `${input.platform} owner acknowledgement is missing` : "",
  ].filter(Boolean);

  return blockers.join("; ");
}

function nextActionFor(
  row: Pick<
    SignedPackageFilesystemVerificationRow,
    | "blockerReason"
    | "fileExists"
    | "ownerAcknowledged"
    | "platform"
    | "sha256Matches"
    | "signatureTranscriptReady"
    | "status"
    | "uploadReachable"
  >,
) {
  if (row.status === "ready") {
    return `Signed package filesystem verification is ready for ${row.platform}.`;
  }

  if (row.status === "review") {
    return `Review signed package filesystem verification for ${row.platform}: ${row.blockerReason}.`;
  }

  return `Resolve blocked signed package filesystem verification run packet for ${row.platform}: ${row.blockerReason}.`;
}

function summarize(
  rows: readonly SignedPackageFilesystemVerificationRow[],
): SignedPackageFilesystemVerificationRunPacket["summary"] {
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const status: SignedPackageFilesystemVerificationStatus =
    blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready";
  const releaseBlocked = status === "blocked";
  const localOutputReadyCount = rows.filter((row) => row.fileExists).length;
  const sha256MatchCount = rows.filter((row) => row.sha256Matches).length;
  const signatureTranscriptReadyCount = rows.filter(
    (row) => row.signatureTranscriptReady,
  ).length;
  const uploadReachableCount = rows.filter((row) => row.uploadReachable).length;
  const ownerAcknowledgedCount = rows.filter((row) => row.ownerAcknowledged).length;
  const verificationScore =
    rows.length === 0
      ? 0
      : Math.max(
          0,
          Math.min(
            100,
            Math.round(
              ((localOutputReadyCount +
                sha256MatchCount +
                signatureTranscriptReadyCount +
                uploadReachableCount +
                ownerAcknowledgedCount) /
                (rows.length * 5)) *
                100,
            ),
          ),
        );
  const blockers = rows
    .filter((row) => row.status !== "ready")
    .map((row) => row.blockerReason)
    .filter(Boolean);

  return {
    blockedCount,
    localOutputReadyCount,
    nextAction:
      status === "ready"
        ? "Signed package filesystem verification run packet is ready."
        : `Resolve blocked signed package filesystem verification run packet: ${blockers.join(
            "; ",
          )}`,
    ownerAcknowledgedCount,
    readyCount,
    releaseBlocked,
    reviewCount,
    rowCount: rows.length,
    sha256MatchCount,
    signatureTranscriptReadyCount,
    status,
    uploadReachableCount,
    verificationHash: sha256(rows.map((row) => row.verificationHash)),
    verificationScore,
  };
}

function createCsv(rows: readonly SignedPackageFilesystemVerificationRow[]) {
  const headers = [
    "platform",
    "status",
    "artifact_name",
    "local_output_path",
    "file_exists",
    "sha256_matches",
    "signature_transcript_ready",
    "upload_reachable",
    "owner_acknowledged",
    "verification_hash",
    "next_action",
  ];
  const lines = rows.map((row) =>
    [
      row.platform,
      row.status,
      row.artifactName,
      row.localOutputPath,
      String(row.fileExists),
      String(row.sha256Matches),
      String(row.signatureTranscriptReady),
      String(row.uploadReachable),
      String(row.ownerAcknowledged),
      row.verificationHash,
      row.nextAction,
    ]
      .map(csvEscape)
      .join(","),
  );

  return [headers.join(","), ...lines].join("\n");
}

function csvEscape(value: string) {
  if (!/[",\n]/.test(value)) {
    return value;
  }

  return `"${value.replaceAll('"', '""')}"`;
}

function hasSha256(value: string) {
  return value.trim().startsWith("sha256:") && value.trim().length > "sha256:".length;
}

function validDate(value: string) {
  const timestamp = Date.parse(value);

  return Number.isFinite(timestamp);
}

function dateOrderReady(startedAt: string, finishedAt: string) {
  return Date.parse(startedAt) <= Date.parse(finishedAt);
}

function urlReady(value: string) {
  return value.startsWith("https://");
}

function encodeDataUri(mimeType: string, content: string) {
  return `data:${mimeType};charset=utf-8,${encodeURIComponent(content)}`;
}

function sha256(value: unknown) {
  return `sha256:${createHash("sha256")
    .update(typeof value === "string" ? value : JSON.stringify(value))
    .digest("hex")}`;
}

function slug(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "workspace"
  );
}

function dateStamp(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "current"
    : date.toISOString().slice(0, 10).replaceAll("-", "");
}
