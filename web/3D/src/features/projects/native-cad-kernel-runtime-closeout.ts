import { createHash } from "node:crypto";
import type { CadConversionWorkerAdapterId } from "@/features/projects/cad-conversion-worker";

export type NativeCadKernelRuntimeCloseoutStatus = "blocked" | "ready" | "review";
export type NativeCadKernelRuntimeCloseoutFileFormat = "csv" | "json";

export interface NativeCadKernelRuntimeCloseoutInput {
  adapterId: CadConversionWorkerAdapterId;
  bundledRuntimePath: string;
  conversionFixtureCount: number;
  customerFallbackMessage: string;
  fixtureDiagnosticsHash: string;
  installedVersion: string;
  outputArtifactHash: string;
  runtimePathVerified: boolean;
  sandboxMemoryMb: number;
  sandboxTimeoutSeconds: number;
  sandboxedExecutionVerified: boolean;
}

export interface NativeCadKernelRuntimeCloseoutRow {
  adapterId: CadConversionWorkerAdapterId;
  bundledRuntimePath: string;
  closeoutHash: string;
  conversionFixtureCount: number;
  customerFallbackMessage: string;
  customerFallbackReady: boolean;
  fixtureCoverageReady: boolean;
  fixtureDiagnosticsHash: string;
  installedVersion: string;
  nextAction: string;
  outputArtifactHash: string;
  runtimePathReady: boolean;
  sandboxLimits: string;
  sandboxReady: boolean;
  sandboxedExecutionVerified: boolean;
  status: NativeCadKernelRuntimeCloseoutStatus;
}

export interface NativeCadKernelRuntimeCloseoutFile {
  download: string;
  format: NativeCadKernelRuntimeCloseoutFileFormat;
  href: string;
  label: string;
}

export interface NativeCadKernelRuntimeCloseoutReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  files: NativeCadKernelRuntimeCloseoutFile[];
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  releaseCandidateId: string;
  rows: NativeCadKernelRuntimeCloseoutRow[];
  summary: {
    blockedCount: number;
    closeoutHash: string;
    closeoutScore: number;
    fallbackMessageCount: number;
    fixtureCoverageCount: number;
    nextAction: string;
    readyCount: number;
    reviewCount: number;
    rowCount: number;
    status: NativeCadKernelRuntimeCloseoutStatus;
  };
  workspaceId: string;
}

export interface CreateNativeCadKernelRuntimeCloseoutInput {
  generatedAt?: string;
  releaseCandidateId: string;
  requiredAdapters?: CadConversionWorkerAdapterId[];
  runtimes: NativeCadKernelRuntimeCloseoutInput[];
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

function sandboxLimits(input: Pick<NativeCadKernelRuntimeCloseoutInput, "sandboxMemoryMb" | "sandboxTimeoutSeconds">) {
  return `${input.sandboxMemoryMb}MB memory / ${input.sandboxTimeoutSeconds}s timeout`;
}

function sandboxReady(input: Pick<NativeCadKernelRuntimeCloseoutInput, "sandboxMemoryMb" | "sandboxTimeoutSeconds" | "sandboxedExecutionVerified">) {
  return input.sandboxedExecutionVerified && input.sandboxMemoryMb >= 1024 && input.sandboxTimeoutSeconds >= 60;
}

function missingRuntime(adapterId: CadConversionWorkerAdapterId): NativeCadKernelRuntimeCloseoutInput {
  return {
    adapterId,
    bundledRuntimePath: "",
    conversionFixtureCount: 0,
    customerFallbackMessage: "",
    fixtureDiagnosticsHash: "",
    installedVersion: "",
    outputArtifactHash: "",
    runtimePathVerified: false,
    sandboxMemoryMb: 0,
    sandboxTimeoutSeconds: 0,
    sandboxedExecutionVerified: false,
  };
}

function statusFor(input: {
  customerFallbackReady: boolean;
  fixtureCoverageReady: boolean;
  runtimePathReady: boolean;
  sandboxReady: boolean;
  versionReady: boolean;
}): NativeCadKernelRuntimeCloseoutStatus {
  if (!input.runtimePathReady || !input.fixtureCoverageReady || !input.customerFallbackReady) {
    return "blocked";
  }

  if (!input.sandboxReady || !input.versionReady) {
    return "review";
  }

  return "ready";
}

function nextActionFor(
  row: Pick<
    NativeCadKernelRuntimeCloseoutRow,
    "adapterId" | "customerFallbackReady" | "fixtureCoverageReady" | "installedVersion" | "runtimePathReady" | "sandboxReady" | "status"
  >,
) {
  if (row.status === "blocked") {
    return `Resolve blocked native CAD kernel runtime closeout for ${row.adapterId}.`;
  }

  if (!row.runtimePathReady) {
    return `Attach bundled native CAD runtime path evidence for ${row.adapterId}.`;
  }

  if (!row.fixtureCoverageReady) {
    return `Attach conversion fixture diagnostics and output artifacts for ${row.adapterId}.`;
  }

  if (!row.customerFallbackReady) {
    return `Attach customer-visible CAD fallback messaging for ${row.adapterId}.`;
  }

  if (!row.sandboxReady) {
    return `Review sandbox limits and execution verification for ${row.adapterId}.`;
  }

  if (!row.installedVersion) {
    return `Attach installed native CAD runtime version for ${row.adapterId}.`;
  }

  return `Keep native CAD kernel runtime closeout current for ${row.adapterId}.`;
}

function createRow(input: NativeCadKernelRuntimeCloseoutInput): NativeCadKernelRuntimeCloseoutRow {
  const bundledRuntimePath = input.bundledRuntimePath.trim();
  const customerFallbackMessage = input.customerFallbackMessage.trim();
  const fixtureDiagnosticsHash = input.fixtureDiagnosticsHash.trim() || "missing";
  const installedVersion = input.installedVersion.trim();
  const outputArtifactHash = input.outputArtifactHash.trim() || "missing";
  const runtimePathReady = input.runtimePathVerified && bundledRuntimePath.length > 0;
  const fixtureCoverageReady = input.conversionFixtureCount > 0 && hasSha256(fixtureDiagnosticsHash) && hasSha256(outputArtifactHash);
  const customerFallbackReady = customerFallbackMessage.length >= 40;
  const rowSandboxReady = sandboxReady(input);
  const status = statusFor({
    customerFallbackReady,
    fixtureCoverageReady,
    runtimePathReady,
    sandboxReady: rowSandboxReady,
    versionReady: installedVersion.length > 0,
  });
  const rowWithoutHash = {
    adapterId: input.adapterId,
    bundledRuntimePath,
    conversionFixtureCount: input.conversionFixtureCount,
    customerFallbackMessage,
    customerFallbackReady,
    fixtureCoverageReady,
    fixtureDiagnosticsHash,
    installedVersion,
    nextAction: "",
    outputArtifactHash,
    runtimePathReady,
    sandboxLimits: sandboxLimits(input),
    sandboxReady: rowSandboxReady,
    sandboxedExecutionVerified: input.sandboxedExecutionVerified,
    status,
  } satisfies Omit<NativeCadKernelRuntimeCloseoutRow, "closeoutHash">;
  const row = {
    ...rowWithoutHash,
    nextAction: nextActionFor(rowWithoutHash),
  };

  return {
    ...row,
    closeoutHash: sha256(row),
  };
}

function createRows(input: CreateNativeCadKernelRuntimeCloseoutInput) {
  const runtimeByAdapter = new Map(input.runtimes.map((runtime) => [runtime.adapterId, runtime]));
  const requiredAdapters = input.requiredAdapters ?? defaultRequiredAdapters;

  return requiredAdapters
    .map((adapterId) => createRow(runtimeByAdapter.get(adapterId) ?? missingRuntime(adapterId)))
    .sort((first, second) => adapterRank[first.adapterId] - adapterRank[second.adapterId]);
}

function summarize(rows: NativeCadKernelRuntimeCloseoutRow[]): NativeCadKernelRuntimeCloseoutReport["summary"] {
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const fallbackMessageCount = rows.filter((row) => row.customerFallbackReady).length;
  const fixtureCoverageCount = rows.reduce((sum, row) => sum + row.conversionFixtureCount, 0);
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const status: NativeCadKernelRuntimeCloseoutStatus = blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready";

  return {
    blockedCount,
    closeoutHash: sha256(rows.map((row) => row.closeoutHash)),
    closeoutScore: Math.max(0, Math.min(100, Math.round((readyCount / Math.max(1, rows.length)) * 100 + reviewCount * 20 - blockedCount * 18))),
    fallbackMessageCount,
    fixtureCoverageCount,
    nextAction:
      status === "blocked"
        ? "Resolve blocked native CAD kernel runtime closeout before artifact runtime closeout."
        : status === "review"
          ? "Review native CAD kernel runtime closeout before artifact runtime closeout."
          : "Native CAD kernel runtime closeout is ready for artifact runtime closeout.",
    readyCount,
    reviewCount,
    rowCount: rows.length,
    status,
  };
}

function createCsv(rows: NativeCadKernelRuntimeCloseoutRow[]) {
  const header = [
    "adapter_id",
    "status",
    "bundled_runtime_path",
    "runtime_path_ready",
    "fixture_coverage_ready",
    "sandbox_ready",
    "customer_fallback_ready",
    "closeout_hash",
    "next_action",
  ];
  const body = rows.map((row) =>
    [
      row.adapterId,
      row.status,
      row.bundledRuntimePath,
      row.runtimePathReady,
      row.fixtureCoverageReady,
      row.sandboxReady,
      row.customerFallbackReady,
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
}): NativeCadKernelRuntimeCloseoutFile[] {
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

export function createNativeCadKernelRuntimeCloseout(input: CreateNativeCadKernelRuntimeCloseoutInput): NativeCadKernelRuntimeCloseoutReport {
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
  const fileBase = `${slug(workspaceId)}-native-cad-kernel-runtime-closeout-${slug(input.releaseCandidateId)}-${dateStamp(generatedAt)}`;
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
