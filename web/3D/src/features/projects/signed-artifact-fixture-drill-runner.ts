import { createHash } from "node:crypto";
import type { NativeArtifactStorageHandoffPlatform } from "@/features/projects/native-artifact-storage-handoff-evidence";

export type SignedArtifactFixtureDrillStatus = "blocked" | "ready" | "review";
export type SignedArtifactFixtureDrillFileFormat = "csv" | "json";

export interface SignedArtifactFixtureDrillInput {
  artifactFileName: string;
  artifactSha256: string;
  dryRunTranscript: string[];
  expectedCertificateFingerprint: string;
  owner: string;
  platform: NativeArtifactStorageHandoffPlatform;
  verificationCommand: string;
}

export interface SignedArtifactFixtureDrillRow {
  artifactFileName: string;
  artifactSha256: string;
  commandPlan: string[];
  commandReady: boolean;
  drillHash: string;
  dryRunTranscript: string[];
  expectedCertificateFingerprint: string;
  fixtureReady: boolean;
  nextAction: string;
  owner: string;
  ownerReady: boolean;
  platform: NativeArtifactStorageHandoffPlatform;
  status: SignedArtifactFixtureDrillStatus;
  transcriptHash: string;
  transcriptReady: boolean;
  verificationCommand: string;
}

export interface SignedArtifactFixtureDrillFile {
  download: string;
  format: SignedArtifactFixtureDrillFileFormat;
  href: string;
  label: string;
}

export interface SignedArtifactFixtureDrillRunnerReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  files: SignedArtifactFixtureDrillFile[];
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  releaseCandidateId: string;
  rows: SignedArtifactFixtureDrillRow[];
  summary: {
    blockedCount: number;
    commandReadyCount: number;
    drillHash: string;
    drillScore: number;
    nextAction: string;
    readyCount: number;
    reviewCount: number;
    rowCount: number;
    status: SignedArtifactFixtureDrillStatus;
    transcriptReadyCount: number;
  };
  workspaceId: string;
}

export interface CreateSignedArtifactFixtureDrillRunnerInput {
  fixtures: SignedArtifactFixtureDrillInput[];
  generatedAt?: string;
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

const commandPlanByPlatform: Record<NativeArtifactStorageHandoffPlatform, string[]> = {
  windows: [
    "Open Windows SDK Developer Command Prompt or CI image with signtool available.",
    "Verify Authenticode trust, timestamp, and publisher chain against the fixture artifact.",
    "Persist the dry-run transcript hash beside the release evidence packet.",
  ],
  macos: [
    "Run codesign verification on the app bundle or mounted DMG fixture.",
    "Run Gatekeeper assessment and notarization stapling checks.",
    "Persist the dry-run transcript hash beside the release evidence packet.",
  ],
  linux: [
    "Run Sigstore or GPG verification against the Linux fixture artifact.",
    "Confirm transparency log or detached signature evidence matches the fixture checksum.",
    "Persist the dry-run transcript hash beside the release evidence packet.",
  ],
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

function missingFixture(platform: NativeArtifactStorageHandoffPlatform): SignedArtifactFixtureDrillInput {
  return {
    artifactFileName: "",
    artifactSha256: "",
    dryRunTranscript: [],
    expectedCertificateFingerprint: "",
    owner: "",
    platform,
    verificationCommand: "",
  };
}

function statusFor(input: {
  commandReady: boolean;
  fixtureReady: boolean;
  ownerReady: boolean;
  transcriptReady: boolean;
}): SignedArtifactFixtureDrillStatus {
  if (!input.commandReady || !input.fixtureReady || !input.ownerReady || !input.transcriptReady) {
    return "blocked";
  }

  return "ready";
}

function nextActionFor(row: Pick<SignedArtifactFixtureDrillRow, "commandReady" | "fixtureReady" | "ownerReady" | "platform" | "status" | "transcriptReady">) {
  if (row.status === "blocked") {
    return `Resolve blocked signed artifact fixture drills for ${row.platform}.`;
  }

  if (!row.fixtureReady) {
    return `Attach signed artifact fixture checksum and expected certificate fingerprint for ${row.platform}.`;
  }

  if (!row.commandReady) {
    return `Record the platform verification command plan for ${row.platform}.`;
  }

  if (!row.transcriptReady) {
    return `Attach the signed artifact fixture drill dry-run transcript for ${row.platform}.`;
  }

  if (!row.ownerReady) {
    return `Assign an owner for the signed artifact fixture drill on ${row.platform}.`;
  }

  return `Signed artifact fixture drill is ready for ${row.platform}.`;
}

function createRow(input: SignedArtifactFixtureDrillInput): SignedArtifactFixtureDrillRow {
  const artifactSha256 = input.artifactSha256.trim();
  const expectedCertificateFingerprint = input.expectedCertificateFingerprint.trim();
  const verificationCommand = input.verificationCommand.trim();
  const dryRunTranscript = input.dryRunTranscript.map((line) => line.trim()).filter(Boolean);
  const owner = input.owner.trim();
  const fixtureReady = input.artifactFileName.trim().length > 0 && hasSha256(artifactSha256) && hasSha256(expectedCertificateFingerprint);
  const commandReady = verificationCommand.length > 0;
  const transcriptReady = dryRunTranscript.length > 0;
  const ownerReady = owner.length > 0;
  const status = statusFor({ commandReady, fixtureReady, ownerReady, transcriptReady });
  const transcriptHash = transcriptReady ? sha256(dryRunTranscript) : "";
  const drillHash = sha256({
    artifactFileName: input.artifactFileName.trim(),
    artifactSha256,
    expectedCertificateFingerprint,
    platform: input.platform,
    transcriptHash,
    verificationCommand,
  });
  const row: SignedArtifactFixtureDrillRow = {
    artifactFileName: input.artifactFileName.trim(),
    artifactSha256,
    commandPlan: commandPlanByPlatform[input.platform],
    commandReady,
    drillHash,
    dryRunTranscript,
    expectedCertificateFingerprint,
    fixtureReady,
    nextAction: "",
    owner,
    ownerReady,
    platform: input.platform,
    status,
    transcriptHash,
    transcriptReady,
    verificationCommand,
  };

  row.nextAction = nextActionFor(row);

  return row;
}

function createCsv(rows: SignedArtifactFixtureDrillRow[]) {
  const header = [
    "platform",
    "status",
    "artifact_file",
    "command_ready",
    "transcript_ready",
    "fixture_ready",
    "transcript_hash",
    "drill_hash",
    "next_action",
  ];
  const body = rows.map((row) =>
    [
      row.platform,
      row.status,
      row.artifactFileName,
      row.commandReady,
      row.transcriptReady,
      row.fixtureReady,
      row.transcriptHash,
      row.drillHash,
      row.nextAction,
    ]
      .map(csvCell)
      .join(","),
  );

  return [header.join(","), ...body].join("\n");
}

function summarize(rows: SignedArtifactFixtureDrillRow[]): SignedArtifactFixtureDrillRunnerReport["summary"] {
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const commandReadyCount = rows.filter((row) => row.commandReady).length;
  const transcriptReadyCount = rows.filter((row) => row.transcriptReady).length;
  const fixtureReadyCount = rows.filter((row) => row.fixtureReady).length;
  const drillScore =
    rows.length === 0
      ? 0
      : Math.max(
          0,
          Math.min(
            100,
            Math.round(((commandReadyCount + transcriptReadyCount + fixtureReadyCount + readyCount) / (rows.length * 4)) * 100 - blockedCount * 12),
          ),
        );
  const status: SignedArtifactFixtureDrillStatus = blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready";

  return {
    blockedCount,
    commandReadyCount,
    drillHash: sha256(rows.map((row) => row.drillHash)),
    drillScore,
    nextAction:
      status === "blocked"
        ? "Resolve blocked signed artifact fixture drills before release evidence drill comparison."
        : status === "review"
          ? "Review signed artifact fixture drills before release evidence drill comparison."
          : "Signed artifact fixture drills are ready for release evidence drill comparison.",
    readyCount,
    reviewCount,
    rowCount: rows.length,
    status,
    transcriptReadyCount,
  };
}

export function createSignedArtifactFixtureDrillRunner(input: CreateSignedArtifactFixtureDrillRunnerInput): SignedArtifactFixtureDrillRunnerReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? "workspace";
  const requiredPlatforms = input.requiredPlatforms ?? defaultRequiredPlatforms;
  const fixtureByPlatform = new Map(input.fixtures.map((fixture) => [fixture.platform, fixture]));
  const rows = requiredPlatforms
    .map((platform) => createRow(fixtureByPlatform.get(platform) ?? missingFixture(platform)))
    .sort((first, second) => platformRank[first.platform] - platformRank[second.platform]);
  const summary = summarize(rows);
  const csvContent = createCsv(rows);
  const jsonContent = `${JSON.stringify(
    {
      generatedAt,
      releaseCandidateId: input.releaseCandidateId,
      rows,
      summary,
      workspaceId,
    },
    null,
    2,
  )}\n`;
  const fileBase = `${slug(workspaceId)}-signed-artifact-fixture-drill-runner-${slug(input.releaseCandidateId)}-${dateStamp(generatedAt)}`;
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
        label: "CSV drill",
      },
      {
        download: jsonFileName,
        format: "json",
        href: jsonDataUri,
        label: "JSON drill",
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
