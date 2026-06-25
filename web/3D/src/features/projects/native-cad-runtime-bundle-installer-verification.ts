import { createHash } from "node:crypto";
import type { CadConversionWorkerAdapterId } from "@/features/projects/cad-conversion-worker";

export type NativeCadRuntimeBundleInstallerVerificationStatus = "blocked" | "ready" | "review";
export type NativeCadRuntimeBundleInstallerVerificationFileFormat = "csv" | "json";

export interface NativeCadRuntimeBundleInput {
  adapterId: CadConversionWorkerAdapterId;
  bundleRoot: string;
  discoveryCommand: string;
  discoveredExecutablePath: string;
  executionExitCode: number;
  executionTranscriptHash: string;
  fixtureCommand: string;
  fixtureOutputHash: string;
  installedVersion: string;
  packagedLayoutHash: string;
  sandboxProfile: string;
}

export interface NativeCadRuntimeBundleInstallerVerificationRow {
  adapterId: CadConversionWorkerAdapterId;
  bundleLayoutReady: boolean;
  bundleRoot: string;
  discoveredExecutablePath: string;
  discoveryCommand: string;
  discoveryReady: boolean;
  executionExitCode: number;
  executionReady: boolean;
  executionTranscriptHash: string;
  fixtureCommand: string;
  fixtureOutputHash: string;
  fixtureReady: boolean;
  installedVersion: string;
  nextAction: string;
  packagedLayoutHash: string;
  sandboxProfile: string;
  sandboxReady: boolean;
  status: NativeCadRuntimeBundleInstallerVerificationStatus;
  verificationHash: string;
  versionReady: boolean;
}

export interface NativeCadRuntimeBundleInstallerVerificationFile {
  download: string;
  format: NativeCadRuntimeBundleInstallerVerificationFileFormat;
  href: string;
  label: string;
}

export interface NativeCadRuntimeBundleInstallerVerificationReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  files: NativeCadRuntimeBundleInstallerVerificationFile[];
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  releaseCandidateId: string;
  rows: NativeCadRuntimeBundleInstallerVerificationRow[];
  summary: {
    blockedCount: number;
    discoveredCount: number;
    executionReadyCount: number;
    fixtureReadyCount: number;
    nextAction: string;
    readyCount: number;
    reviewCount: number;
    rowCount: number;
    status: NativeCadRuntimeBundleInstallerVerificationStatus;
    verificationHash: string;
    verificationScore: number;
  };
  workspaceId: string;
}

export interface CreateNativeCadRuntimeBundleInstallerVerificationInput {
  generatedAt?: string;
  releaseCandidateId: string;
  requiredAdapters?: CadConversionWorkerAdapterId[];
  runtimes: NativeCadRuntimeBundleInput[];
  workspaceId?: string;
}

const defaultRequiredAdapters: CadConversionWorkerAdapterId[] = ["freecad", "occt"];
const adapterRank: Record<CadConversionWorkerAdapterId, number> = {
  freecad: 0,
  occt: 1,
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

function missingRuntime(adapterId: CadConversionWorkerAdapterId): NativeCadRuntimeBundleInput {
  return {
    adapterId,
    bundleRoot: "",
    discoveryCommand: "",
    discoveredExecutablePath: "",
    executionExitCode: 1,
    executionTranscriptHash: "",
    fixtureCommand: "",
    fixtureOutputHash: "",
    installedVersion: "",
    packagedLayoutHash: "",
    sandboxProfile: "",
  };
}

function statusFor(input: {
  bundleLayoutReady: boolean;
  discoveryReady: boolean;
  executionReady: boolean;
  fixtureReady: boolean;
  sandboxReady: boolean;
  versionReady: boolean;
}): NativeCadRuntimeBundleInstallerVerificationStatus {
  if (!input.bundleLayoutReady || !input.discoveryReady || !input.executionReady || !input.fixtureReady) {
    return "blocked";
  }

  if (!input.sandboxReady || !input.versionReady) {
    return "review";
  }

  return "ready";
}

function nextActionFor(
  row: Pick<
    NativeCadRuntimeBundleInstallerVerificationRow,
    "adapterId" | "bundleLayoutReady" | "discoveryReady" | "executionReady" | "fixtureReady" | "sandboxReady" | "status" | "versionReady"
  >,
) {
  if (row.status === "blocked") {
    return `Resolve blocked native CAD runtime bundle installer verification for ${row.adapterId}.`;
  }

  if (!row.bundleLayoutReady) {
    return `Attach packaged desktop CAD runtime layout evidence for ${row.adapterId}.`;
  }

  if (!row.discoveryReady) {
    return `Attach packaged executable discovery proof for ${row.adapterId}.`;
  }

  if (!row.executionReady) {
    return `Attach packaged CAD runtime command execution transcript for ${row.adapterId}.`;
  }

  if (!row.fixtureReady) {
    return `Attach packaged CAD runtime fixture output proof for ${row.adapterId}.`;
  }

  if (!row.sandboxReady) {
    return `Review packaged CAD runtime sandbox profile for ${row.adapterId}.`;
  }

  if (!row.versionReady) {
    return `Attach packaged CAD runtime version proof for ${row.adapterId}.`;
  }

  return `Keep native CAD runtime bundle installer verification current for ${row.adapterId}.`;
}

function createRow(input: NativeCadRuntimeBundleInput): NativeCadRuntimeBundleInstallerVerificationRow {
  const bundleRoot = input.bundleRoot.trim();
  const discoveryCommand = input.discoveryCommand.trim();
  const discoveredExecutablePath = input.discoveredExecutablePath.trim();
  const executionTranscriptHash = input.executionTranscriptHash.trim() || "missing";
  const fixtureCommand = input.fixtureCommand.trim();
  const fixtureOutputHash = input.fixtureOutputHash.trim() || "missing";
  const installedVersion = input.installedVersion.trim();
  const packagedLayoutHash = input.packagedLayoutHash.trim() || "missing";
  const sandboxProfile = input.sandboxProfile.trim();
  const bundleLayoutReady = bundleRoot.length > 0 && hasSha256(packagedLayoutHash);
  const discoveryReady = discoveryCommand.length > 0 && discoveredExecutablePath.startsWith(bundleRoot) && discoveredExecutablePath.length > bundleRoot.length;
  const executionReady = input.executionExitCode === 0 && hasSha256(executionTranscriptHash);
  const fixtureReady = fixtureCommand.length > 0 && hasSha256(fixtureOutputHash);
  const sandboxReady = sandboxProfile.length >= 20;
  const versionReady = installedVersion.length > 0;
  const status = statusFor({
    bundleLayoutReady,
    discoveryReady,
    executionReady,
    fixtureReady,
    sandboxReady,
    versionReady,
  });
  const rowWithoutHash = {
    adapterId: input.adapterId,
    bundleLayoutReady,
    bundleRoot,
    discoveredExecutablePath,
    discoveryCommand,
    discoveryReady,
    executionExitCode: input.executionExitCode,
    executionReady,
    executionTranscriptHash,
    fixtureCommand,
    fixtureOutputHash,
    fixtureReady,
    installedVersion,
    nextAction: "",
    packagedLayoutHash,
    sandboxProfile,
    sandboxReady,
    status,
    versionReady,
  } satisfies Omit<NativeCadRuntimeBundleInstallerVerificationRow, "verificationHash">;
  const row = {
    ...rowWithoutHash,
    nextAction: nextActionFor(rowWithoutHash),
  };

  return {
    ...row,
    verificationHash: sha256(row),
  };
}

function createRows(input: CreateNativeCadRuntimeBundleInstallerVerificationInput) {
  const runtimeByAdapter = new Map(input.runtimes.map((runtime) => [runtime.adapterId, runtime]));
  const requiredAdapters = input.requiredAdapters ?? defaultRequiredAdapters;

  return requiredAdapters
    .map((adapterId) => createRow(runtimeByAdapter.get(adapterId) ?? missingRuntime(adapterId)))
    .sort((first, second) => adapterRank[first.adapterId] - adapterRank[second.adapterId]);
}

function summarize(rows: NativeCadRuntimeBundleInstallerVerificationRow[]): NativeCadRuntimeBundleInstallerVerificationReport["summary"] {
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const discoveredCount = rows.filter((row) => row.discoveryReady).length;
  const executionReadyCount = rows.filter((row) => row.executionReady).length;
  const fixtureReadyCount = rows.filter((row) => row.fixtureReady).length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const status: NativeCadRuntimeBundleInstallerVerificationStatus = blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready";

  return {
    blockedCount,
    discoveredCount,
    executionReadyCount,
    fixtureReadyCount,
    nextAction:
      status === "blocked"
        ? "Resolve blocked native CAD runtime bundle installer verification before fulfillment release."
        : status === "review"
          ? "Review native CAD runtime bundle installer verification before fulfillment release."
          : "Native CAD runtime bundle installer verification is ready for fulfillment release.",
    readyCount,
    reviewCount,
    rowCount: rows.length,
    status,
    verificationHash: sha256(rows.map((row) => row.verificationHash)),
    verificationScore: Math.max(0, Math.min(100, Math.round((readyCount / Math.max(1, rows.length)) * 100 + reviewCount * 20 - blockedCount * 18))),
  };
}

function createCsv(rows: NativeCadRuntimeBundleInstallerVerificationRow[]) {
  const header = ["adapter_id", "status", "bundle_root", "bundle_layout_ready", "discovery_ready", "execution_ready", "fixture_ready", "verification_hash", "next_action"];
  const body = rows.map((row) =>
    [row.adapterId, row.status, row.bundleRoot, row.bundleLayoutReady, row.discoveryReady, row.executionReady, row.fixtureReady, row.verificationHash, row.nextAction]
      .map(csvCell)
      .join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function filesFor(input: { csvDataUri: string; csvFileName: string; jsonDataUri: string; jsonFileName: string }): NativeCadRuntimeBundleInstallerVerificationFile[] {
  return [
    {
      download: input.csvFileName,
      format: "csv",
      href: input.csvDataUri,
      label: "CSV verification",
    },
    {
      download: input.jsonFileName,
      format: "json",
      href: input.jsonDataUri,
      label: "JSON verification",
    },
  ];
}

export function createNativeCadRuntimeBundleInstallerVerification(
  input: CreateNativeCadRuntimeBundleInstallerVerificationInput,
): NativeCadRuntimeBundleInstallerVerificationReport {
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
  const fileBase = `${slug(workspaceId)}-native-cad-runtime-bundle-installer-verification-${slug(input.releaseCandidateId)}-${dateStamp(generatedAt)}`;
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
    rows,
    summary,
    workspaceId,
  };
}
