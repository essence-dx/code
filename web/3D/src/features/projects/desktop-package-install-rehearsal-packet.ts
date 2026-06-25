import { createHash } from "node:crypto";

export type DesktopPackageInstallRehearsalPlatform = "linux" | "macos" | "windows";
export type DesktopPackageInstallRehearsalStatus = "blocked" | "ready" | "review";
export type DesktopPackageInstallRehearsalFileFormat = "csv" | "json";

export interface DesktopPackageInstallRehearsalInput {
  archiveVerified: boolean;
  artifactFileName: string;
  installCommand: string;
  installVerified: boolean;
  platform: DesktopPackageInstallRehearsalPlatform;
  rollbackVerified: boolean;
  smokeCommand: string;
  smokeVerified: boolean;
  updaterManifestUrl: string;
  updaterMetadataHash: string | null;
  verificationNotes: string;
}

export interface DesktopPackageInstallRehearsalRow {
  archiveVerified: boolean;
  artifactFileName: string;
  installCommand: string;
  installVerified: boolean;
  nextAction: string;
  packetHash: string;
  platform: DesktopPackageInstallRehearsalPlatform;
  rehearsalId: string;
  rollbackVerified: boolean;
  smokeCommand: string;
  smokeVerified: boolean;
  status: DesktopPackageInstallRehearsalStatus;
  updaterManifestUrl: string;
  updaterMetadataHash: string;
  updaterMetadataLinked: boolean;
  verificationNotes: string;
}

export interface DesktopPackageInstallRehearsalFile {
  download: string;
  format: DesktopPackageInstallRehearsalFileFormat;
  href: string;
  label: string;
}

export interface DesktopPackageInstallRehearsalPacket {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  files: DesktopPackageInstallRehearsalFile[];
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  releaseVersion: string;
  rows: DesktopPackageInstallRehearsalRow[];
  summary: {
    blockedCount: number;
    nextAction: string;
    packetHash: string;
    readyCount: number;
    rehearsalScore: number;
    reviewCount: number;
    rowCount: number;
    status: DesktopPackageInstallRehearsalStatus;
  };
  workspaceId: string;
}

export interface CreateDesktopPackageInstallRehearsalPacketInput {
  generatedAt?: string;
  rehearsals?: DesktopPackageInstallRehearsalInput[];
  releaseVersion: string;
  requiredPlatforms?: DesktopPackageInstallRehearsalPlatform[];
  workspaceId?: string;
}

const defaultRequiredPlatforms: DesktopPackageInstallRehearsalPlatform[] = ["windows", "macos", "linux"];
const platformRank: Record<DesktopPackageInstallRehearsalPlatform, number> = {
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

function displayValue(value: string | null, fallback = "missing") {
  return value?.trim() || fallback;
}

function hasUpdaterMetadata(input: Pick<DesktopPackageInstallRehearsalInput, "updaterManifestUrl" | "updaterMetadataHash">) {
  return input.updaterManifestUrl.trim().length > 0 && Boolean(input.updaterMetadataHash?.trim());
}

function statusFor(input: {
  archiveVerified: boolean;
  installVerified: boolean;
  rollbackVerified: boolean;
  smokeVerified: boolean;
  updaterMetadataLinked: boolean;
}): DesktopPackageInstallRehearsalStatus {
  if (!input.archiveVerified || !input.installVerified || !input.smokeVerified || !input.updaterMetadataLinked) {
    return "blocked";
  }

  if (!input.rollbackVerified) {
    return "review";
  }

  return "ready";
}

function nextActionFor(status: DesktopPackageInstallRehearsalStatus, platform: DesktopPackageInstallRehearsalPlatform) {
  if (status === "blocked") {
    return `Resolve blocked desktop package install rehearsals for ${platform}: archive, install, smoke, and updater metadata evidence must pass.`;
  }

  if (status === "review") {
    return `Review desktop package rollback rehearsal evidence for ${platform} before release promotion.`;
  }

  return `Keep desktop package install rehearsal evidence current for ${platform}.`;
}

function missingRehearsal(platform: DesktopPackageInstallRehearsalPlatform): DesktopPackageInstallRehearsalInput {
  return {
    archiveVerified: false,
    artifactFileName: `No ${platform} desktop package rehearsal recorded`,
    installCommand: "missing",
    installVerified: false,
    platform,
    rollbackVerified: false,
    smokeCommand: "missing",
    smokeVerified: false,
    updaterManifestUrl: "",
    updaterMetadataHash: null,
    verificationNotes: `No ${platform} install rehearsal packet exists yet.`,
  };
}

function createRow(input: DesktopPackageInstallRehearsalInput, workspaceId: string, releaseVersion: string): DesktopPackageInstallRehearsalRow {
  const updaterMetadataLinked = hasUpdaterMetadata(input);
  const status = statusFor({
    archiveVerified: input.archiveVerified,
    installVerified: input.installVerified,
    rollbackVerified: input.rollbackVerified,
    smokeVerified: input.smokeVerified,
    updaterMetadataLinked,
  });
  const rowWithoutHash = {
    archiveVerified: input.archiveVerified,
    artifactFileName: input.artifactFileName.trim() || `missing-${input.platform}-artifact`,
    installCommand: input.installCommand.trim() || "missing",
    installVerified: input.installVerified,
    nextAction: nextActionFor(status, input.platform),
    platform: input.platform,
    rehearsalId: `desktop-package-install-rehearsal:${slug(workspaceId)}:${slug(releaseVersion)}:${input.platform}`,
    rollbackVerified: input.rollbackVerified,
    smokeCommand: input.smokeCommand.trim() || "missing",
    smokeVerified: input.smokeVerified,
    status,
    updaterManifestUrl: displayValue(input.updaterManifestUrl),
    updaterMetadataHash: displayValue(input.updaterMetadataHash),
    updaterMetadataLinked,
    verificationNotes: input.verificationNotes.trim() || "No verification notes recorded.",
  } satisfies Omit<DesktopPackageInstallRehearsalRow, "packetHash">;

  return {
    ...rowWithoutHash,
    packetHash: sha256({
      ...rowWithoutHash,
      releaseVersion,
      workspaceId,
    }),
  };
}

function createRows(input: {
  rehearsals: DesktopPackageInstallRehearsalInput[];
  releaseVersion: string;
  requiredPlatforms: DesktopPackageInstallRehearsalPlatform[];
  workspaceId: string;
}) {
  const rows = input.requiredPlatforms.map((platform) => {
    const rehearsal = input.rehearsals.find((candidate) => candidate.platform === platform);

    return createRow(rehearsal ?? missingRehearsal(platform), input.workspaceId, input.releaseVersion);
  });
  const extraRows = input.rehearsals
    .filter((rehearsal) => !input.requiredPlatforms.includes(rehearsal.platform))
    .map((rehearsal) => createRow(rehearsal, input.workspaceId, input.releaseVersion));

  return [...rows, ...extraRows].sort((first, second) => platformRank[first.platform] - platformRank[second.platform]);
}

function summarize(rows: DesktopPackageInstallRehearsalRow[]): DesktopPackageInstallRehearsalPacket["summary"] {
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const status: DesktopPackageInstallRehearsalStatus = blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready";

  return {
    blockedCount,
    nextAction:
      status === "blocked"
        ? "Resolve blocked desktop package install rehearsals before release-channel promotion."
        : status === "review"
          ? "Review desktop package install rehearsal rollback evidence before release-channel promotion."
          : "Desktop package install rehearsal packet is ready.",
    packetHash: sha256(rows.map((row) => row.packetHash)),
    readyCount,
    rehearsalScore: Math.max(0, Math.min(100, Math.round((readyCount / Math.max(1, rows.length)) * 100 + reviewCount * 18 - blockedCount * 18))),
    reviewCount,
    rowCount: rows.length,
    status,
  };
}

function createCsv(rows: DesktopPackageInstallRehearsalRow[]) {
  const header = [
    "platform",
    "status",
    "artifact_file_name",
    "archive_verified",
    "install_verified",
    "smoke_verified",
    "rollback_verified",
    "updater_metadata_linked",
    "packet_hash",
    "next_action",
  ];
  const body = rows.map((row) =>
    [
      row.platform,
      row.status,
      row.artifactFileName,
      row.archiveVerified,
      row.installVerified,
      row.smokeVerified,
      row.rollbackVerified,
      row.updaterMetadataLinked,
      row.packetHash,
      row.nextAction,
    ]
      .map(csvCell)
      .join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function createJson(input: {
  generatedAt: string;
  releaseVersion: string;
  rows: DesktopPackageInstallRehearsalRow[];
  summary: DesktopPackageInstallRehearsalPacket["summary"];
  workspaceId: string;
}) {
  return JSON.stringify(input, null, 2);
}

function filesFor(input: {
  csvDataUri: string;
  csvFileName: string;
  jsonDataUri: string;
  jsonFileName: string;
}): DesktopPackageInstallRehearsalFile[] {
  return [
    {
      download: input.csvFileName,
      format: "csv",
      href: input.csvDataUri,
      label: "CSV rehearsals",
    },
    {
      download: input.jsonFileName,
      format: "json",
      href: input.jsonDataUri,
      label: "JSON rehearsals",
    },
  ];
}

export function createDesktopPackageInstallRehearsalPacket(
  input: CreateDesktopPackageInstallRehearsalPacketInput,
): DesktopPackageInstallRehearsalPacket {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? "workspace";
  const rows = createRows({
    rehearsals: input.rehearsals ?? [],
    releaseVersion: input.releaseVersion,
    requiredPlatforms: input.requiredPlatforms ?? defaultRequiredPlatforms,
    workspaceId,
  });
  const summary = summarize(rows);
  const csvContent = createCsv(rows);
  const jsonContent = createJson({
    generatedAt,
    releaseVersion: input.releaseVersion,
    rows,
    summary,
    workspaceId,
  });
  const fileBase = `${slug(workspaceId)}-desktop-package-install-rehearsal-${slug(input.releaseVersion)}-${dateStamp(generatedAt)}`;
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
    releaseVersion: input.releaseVersion,
    rows,
    summary,
    workspaceId,
  };
}
