import { createHash } from "node:crypto";

export type ExternalArtifactVerificationPlatform =
  | "android"
  | "ios"
  | "linux"
  | "macos"
  | "windows";

export type ExternalArtifactVerificationKind =
  | "apksigner"
  | "authenticode"
  | "codesign"
  | "gpg"
  | "ios-codesign"
  | "sigstore";

export type ExternalArtifactVerificationCommandStatus =
  | "blocked"
  | "ready"
  | "review";

export type ExternalArtifactVerificationFileFormat = "csv" | "json";

export interface ExternalArtifactVerificationCommandInput {
  readonly artifactPath: string;
  readonly artifactSha256: string;
  readonly exitCode: number;
  readonly finishedAt: string;
  readonly platform: ExternalArtifactVerificationPlatform;
  readonly stderrHash: string;
  readonly stdoutHash: string;
  readonly startedAt: string;
  readonly transcriptHash: string;
  readonly verificationCommand: string;
  readonly verificationKind: ExternalArtifactVerificationKind;
  readonly verifierOwner: string;
  readonly workingDirectory: string;
}

export interface ExternalArtifactVerificationCommandRow {
  readonly artifactChecksumReady: boolean;
  readonly artifactPath: string;
  readonly artifactPathReady: boolean;
  readonly artifactSha256: string;
  readonly commandReady: boolean;
  readonly exitCode: number;
  readonly exitCodeReady: boolean;
  readonly finishedAt: string;
  readonly nextAction: string;
  readonly ownerReady: boolean;
  readonly platform: ExternalArtifactVerificationPlatform;
  readonly status: ExternalArtifactVerificationCommandStatus;
  readonly stderrHash: string;
  readonly stdoutHash: string;
  readonly startedAt: string;
  readonly transcriptHash: string;
  readonly transcriptReady: boolean;
  readonly verificationCommand: string;
  readonly verificationHash: string;
  readonly verificationKind: ExternalArtifactVerificationKind;
  readonly verifierOwner: string;
  readonly workingDirectory: string;
}

export interface ExternalArtifactVerificationFile {
  readonly download: string;
  readonly format: ExternalArtifactVerificationFileFormat;
  readonly href: string;
  readonly label: string;
}

export interface ExternalArtifactVerificationCommandRunnerReport {
  readonly csvContent: string;
  readonly csvDataUri: string;
  readonly csvFileName: string;
  readonly files: ExternalArtifactVerificationFile[];
  readonly generatedAt: string;
  readonly jsonContent: string;
  readonly jsonDataUri: string;
  readonly jsonFileName: string;
  readonly releaseCandidateId: string;
  readonly rows: ExternalArtifactVerificationCommandRow[];
  readonly summary: {
    readonly artifactPathReadyCount: number;
    readonly blockedCount: number;
    readonly commandReadyCount: number;
    readonly exitCodeReadyCount: number;
    readonly nextAction: string;
    readonly readyCount: number;
    readonly releaseBlocked: boolean;
    readonly reviewCount: number;
    readonly rowCount: number;
    readonly status: ExternalArtifactVerificationCommandStatus;
    readonly transcriptReadyCount: number;
    readonly verificationHash: string;
    readonly verificationScore: number;
  };
  readonly workspaceId: string;
}

export interface CreateExternalArtifactVerificationCommandRunnerInput {
  readonly commands: readonly ExternalArtifactVerificationCommandInput[];
  readonly generatedAt?: string;
  readonly releaseCandidateId: string;
  readonly requiredPlatforms?: readonly ExternalArtifactVerificationPlatform[];
  readonly workspaceId?: string;
}

const defaultRequiredPlatforms: readonly ExternalArtifactVerificationPlatform[] =
  ["windows", "macos", "linux", "android", "ios"];

const platformRank: Record<ExternalArtifactVerificationPlatform, number> = {
  windows: 0,
  macos: 1,
  linux: 2,
  android: 3,
  ios: 4,
};

const defaultVerificationKind: Record<
  ExternalArtifactVerificationPlatform,
  ExternalArtifactVerificationKind
> = {
  windows: "authenticode",
  macos: "codesign",
  linux: "sigstore",
  android: "apksigner",
  ios: "ios-codesign",
};

export function createExternalArtifactVerificationCommandRunner(
  input: CreateExternalArtifactVerificationCommandRunnerInput,
): ExternalArtifactVerificationCommandRunnerReport {
  const generatedAt = input.generatedAt ?? new Date(0).toISOString();
  const workspaceId = input.workspaceId ?? "Essence Runtime";
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
  const baseFileName = `${slug(workspaceId)}-external-artifact-verification-command-runner-${slug(
    input.releaseCandidateId,
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
        label: "External artifact verification command runner CSV",
      },
      {
        download: jsonFileName,
        format: "json",
        href: jsonDataUri,
        label: "External artifact verification command runner JSON",
      },
    ],
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

function createRows(input: CreateExternalArtifactVerificationCommandRunnerInput) {
  const commandByPlatform = new Map(
    input.commands.map((command) => [command.platform, command]),
  );
  const requiredPlatforms =
    input.requiredPlatforms ?? defaultRequiredPlatforms;

  return requiredPlatforms
    .map((platform) =>
      createRow(commandByPlatform.get(platform) ?? missingCommand(platform)),
    )
    .sort(
      (first, second) => platformRank[first.platform] - platformRank[second.platform],
    );
}

function missingCommand(
  platform: ExternalArtifactVerificationPlatform,
): ExternalArtifactVerificationCommandInput {
  return {
    artifactPath: "",
    artifactSha256: "",
    exitCode: 1,
    finishedAt: "",
    platform,
    stderrHash: "",
    stdoutHash: "",
    startedAt: "",
    transcriptHash: "",
    verificationCommand: "",
    verificationKind: defaultVerificationKind[platform],
    verifierOwner: "",
    workingDirectory: "",
  };
}

function createRow(
  input: ExternalArtifactVerificationCommandInput,
): ExternalArtifactVerificationCommandRow {
  const artifactPath = input.artifactPath.trim();
  const artifactSha256 = input.artifactSha256.trim() || "missing";
  const finishedAt = input.finishedAt.trim();
  const stderrHash = input.stderrHash.trim() || "missing";
  const stdoutHash = input.stdoutHash.trim() || "missing";
  const startedAt = input.startedAt.trim();
  const transcriptHash = input.transcriptHash.trim() || "missing";
  const verificationCommand = input.verificationCommand.trim();
  const verifierOwner = input.verifierOwner.trim();
  const workingDirectory = input.workingDirectory.trim();
  const artifactPathReady = localArtifactPathReady(artifactPath);
  const artifactChecksumReady = hasSha256(artifactSha256);
  const commandReady =
    verificationCommand.length > 0 &&
    workingDirectory.length > 0 &&
    commandReferencesArtifact(verificationCommand, artifactPath);
  const exitCodeReady = input.exitCode === 0;
  const ownerReady = verifierOwner.length > 0;
  const transcriptReady =
    hasSha256(stdoutHash) &&
    hasSha256(stderrHash) &&
    hasSha256(transcriptHash) &&
    validDate(startedAt) &&
    validDate(finishedAt) &&
    dateOrderReady(startedAt, finishedAt);
  const status = statusFor({
    artifactChecksumReady,
    artifactPathReady,
    commandReady,
    exitCodeReady,
    ownerReady,
    transcriptReady,
  });
  const rowWithoutHash = {
    artifactChecksumReady,
    artifactPath,
    artifactPathReady,
    artifactSha256,
    commandReady,
    exitCode: input.exitCode,
    exitCodeReady,
    finishedAt,
    nextAction: "",
    ownerReady,
    platform: input.platform,
    status,
    stderrHash,
    stdoutHash,
    startedAt,
    transcriptHash,
    transcriptReady,
    verificationCommand,
    verificationKind: input.verificationKind,
    verifierOwner,
    workingDirectory,
  } satisfies Omit<ExternalArtifactVerificationCommandRow, "verificationHash">;
  const row = {
    ...rowWithoutHash,
    nextAction: nextActionFor(rowWithoutHash),
  };

  return {
    ...row,
    verificationHash: sha256(row),
  };
}

function statusFor(input: {
  readonly artifactChecksumReady: boolean;
  readonly artifactPathReady: boolean;
  readonly commandReady: boolean;
  readonly exitCodeReady: boolean;
  readonly ownerReady: boolean;
  readonly transcriptReady: boolean;
}): ExternalArtifactVerificationCommandStatus {
  if (
    !input.artifactChecksumReady ||
    !input.artifactPathReady ||
    !input.commandReady ||
    !input.exitCodeReady ||
    !input.transcriptReady
  ) {
    return "blocked";
  }

  if (!input.ownerReady) {
    return "review";
  }

  return "ready";
}

function nextActionFor(
  row: Pick<
    ExternalArtifactVerificationCommandRow,
    | "artifactChecksumReady"
    | "artifactPathReady"
    | "commandReady"
    | "exitCodeReady"
    | "ownerReady"
    | "platform"
    | "status"
    | "transcriptReady"
  >,
) {
  if (row.status === "blocked") {
    return `Resolve blocked external artifact verification command runner for ${row.platform}.`;
  }

  if (!row.artifactPathReady) {
    return `Attach a real local package artifact path for ${row.platform}.`;
  }

  if (!row.artifactChecksumReady) {
    return `Attach sha256 package checksum for ${row.platform}.`;
  }

  if (!row.commandReady) {
    return `Record the artifact verification command and working directory for ${row.platform}.`;
  }

  if (!row.exitCodeReady) {
    return `Resolve non-zero artifact verification command exit code for ${row.platform}.`;
  }

  if (!row.transcriptReady) {
    return `Attach stdout, stderr, and command transcript hashes for ${row.platform}.`;
  }

  if (!row.ownerReady) {
    return `Assign verification command owner for ${row.platform}.`;
  }

  return `External artifact verification command runner is ready for ${row.platform}.`;
}

function summarize(
  rows: readonly ExternalArtifactVerificationCommandRow[],
): ExternalArtifactVerificationCommandRunnerReport["summary"] {
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const readySignals = rows.reduce(
    (total, row) =>
      total +
      [
        row.artifactPathReady,
        row.artifactChecksumReady,
        row.commandReady,
        row.exitCodeReady,
        row.transcriptReady,
        row.ownerReady,
      ].filter(Boolean).length,
    0,
  );
  const status: ExternalArtifactVerificationCommandStatus =
    blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready";

  return {
    artifactPathReadyCount: rows.filter((row) => row.artifactPathReady).length,
    blockedCount,
    commandReadyCount: rows.filter((row) => row.commandReady).length,
    exitCodeReadyCount: rows.filter((row) => row.exitCodeReady).length,
    nextAction:
      status === "ready"
        ? "External artifact verification commands are ready for runtime execution proof."
        : "Resolve blocked external artifact verification command runner before runtime execution proof.",
    readyCount,
    releaseBlocked: blockedCount > 0,
    reviewCount,
    rowCount: rows.length,
    status,
    transcriptReadyCount: rows.filter((row) => row.transcriptReady).length,
    verificationHash: sha256(rows.map((row) => row.verificationHash)),
    verificationScore: Math.round((readySignals / (rows.length * 6)) * 100),
  };
}

function createCsv(rows: readonly ExternalArtifactVerificationCommandRow[]) {
  const header = [
    "platform",
    "status",
    "artifact_path",
    "verification_kind",
    "artifact_path_ready",
    "command_ready",
    "exit_code_ready",
    "transcript_ready",
    "verification_hash",
    "next_action",
  ];
  const body = rows.map((row) =>
    [
      row.platform,
      row.status,
      row.artifactPath,
      row.verificationKind,
      row.artifactPathReady,
      row.commandReady,
      row.exitCodeReady,
      row.transcriptReady,
      row.verificationHash,
      row.nextAction,
    ]
      .map(csvCell)
      .join(","),
  );

  return [header.join(","), ...body].join("\n");
}

function commandReferencesArtifact(command: string, artifactPath: string) {
  if (!artifactPath) {
    return false;
  }

  const artifactFileName = artifactPath.split(/[\\/]/).at(-1) ?? artifactPath;

  return command.includes(artifactPath) || command.includes(artifactFileName);
}

function localArtifactPathReady(value: string) {
  if (!value || value.startsWith("http://") || value.startsWith("https://")) {
    return false;
  }

  return /[\\/]|^[a-zA-Z]:[\\/]/.test(value) && /\.[a-z0-9]{2,8}$/i.test(value);
}

function validDate(value: string) {
  const date = new Date(value.trim());

  return value.trim().length > 0 && !Number.isNaN(date.getTime());
}

function dateOrderReady(startedAt: string, finishedAt: string) {
  return new Date(finishedAt).getTime() >= new Date(startedAt).getTime();
}

function hasSha256(value: string) {
  return value.startsWith("sha256:");
}

function csvCell(value: boolean | number | string) {
  return `"${String(value).replaceAll('"', '""')}"`;
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
