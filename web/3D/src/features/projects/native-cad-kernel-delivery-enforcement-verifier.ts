import { createHash } from "node:crypto";

import type { CadConversionWorkerAdapterId } from "@/features/projects/cad-conversion-worker";

export type NativeCadKernelDeliveryEnforcementStatus =
  | "blocked"
  | "ready"
  | "review";
export type NativeCadKernelDeliveryEnforcementFileFormat = "csv" | "json";

export interface NativeCadKernelDeliveryRuntimeInput {
  adapterId: CadConversionWorkerAdapterId;
  bundledRuntimePath: string;
  fallbackMessage: string;
  fallbackRoute: string;
  fixtureCommand: string;
  fixtureDurationMs: number;
  fixtureExitCode: number;
  fixtureInputHash: string;
  fixtureOutputHash: string;
  runtimeAvailable: boolean;
  runtimeVersion: string;
  sandboxMemoryMb: number;
  sandboxPolicy: string;
  sandboxProfileHash: string;
  sandboxTimeoutSeconds: number;
  supportRunbookUrl: string;
  verifierOwner: string;
}

export interface NativeCadKernelDeliveryEnforcementRow {
  adapterId: CadConversionWorkerAdapterId;
  bundledRuntimePath: string;
  deliveryBlockingReason: string;
  enforcementHash: string;
  fallbackMessage: string;
  fallbackRoute: string;
  fallbackRouteReady: boolean;
  fixtureCommand: string;
  fixtureDurationMs: number;
  fixtureExecutionReady: boolean;
  fixtureExitCode: number;
  fixtureInputHash: string;
  fixtureOutputHash: string;
  nextAction: string;
  ownerReady: boolean;
  runtimeAvailabilityReady: boolean;
  runtimeAvailable: boolean;
  runtimeVersion: string;
  sandboxLimits: string;
  sandboxLimitsReady: boolean;
  sandboxMemoryMb: number;
  sandboxPolicy: string;
  sandboxProfileHash: string;
  sandboxTimeoutSeconds: number;
  status: NativeCadKernelDeliveryEnforcementStatus;
  supportRunbookUrl: string;
  verifierOwner: string;
}

export interface NativeCadKernelDeliveryEnforcementFile {
  download: string;
  format: NativeCadKernelDeliveryEnforcementFileFormat;
  href: string;
  label: string;
}

export interface NativeCadKernelDeliveryEnforcementVerifier {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  files: NativeCadKernelDeliveryEnforcementFile[];
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  releaseCandidateId: string;
  rows: NativeCadKernelDeliveryEnforcementRow[];
  summary: {
    blockedCount: number;
    deliveryBlocked: boolean;
    enforcementHash: string;
    enforcementScore: number;
    fallbackRouteReadyCount: number;
    fixtureExecutionReadyCount: number;
    nextAction: string;
    readyCount: number;
    reviewCount: number;
    rowCount: number;
    runtimeAvailableCount: number;
    sandboxLimitsReadyCount: number;
    status: NativeCadKernelDeliveryEnforcementStatus;
  };
  workspaceId: string;
}

export interface CreateNativeCadKernelDeliveryEnforcementVerifierInput {
  generatedAt?: string;
  releaseCandidateId: string;
  requiredAdapters?: CadConversionWorkerAdapterId[];
  runtimes: NativeCadKernelDeliveryRuntimeInput[];
  workspaceId?: string;
}

const defaultRequiredAdapters: CadConversionWorkerAdapterId[] = [
  "freecad",
  "occt",
];

const adapterRank: Record<CadConversionWorkerAdapterId, number> = {
  freecad: 0,
  occt: 1,
};

export function createNativeCadKernelDeliveryEnforcementVerifier(
  input: CreateNativeCadKernelDeliveryEnforcementVerifierInput,
): NativeCadKernelDeliveryEnforcementVerifier {
  const generatedAt = input.generatedAt ?? new Date(0).toISOString();
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
  const fileBase = `${slug(workspaceId)}-native-cad-kernel-delivery-enforcement-verifier-${slug(
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
        label: "Native CAD kernel delivery enforcement verifier CSV",
      },
      {
        download: jsonFileName,
        format: "json",
        href: jsonDataUri,
        label: "Native CAD kernel delivery enforcement verifier JSON",
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

function createRows(
  input: CreateNativeCadKernelDeliveryEnforcementVerifierInput,
) {
  const runtimesByAdapter = new Map(
    input.runtimes.map((runtime) => [runtime.adapterId, runtime]),
  );
  const requiredAdapters = input.requiredAdapters ?? defaultRequiredAdapters;

  return requiredAdapters
    .map((adapterId) =>
      createRow(runtimesByAdapter.get(adapterId) ?? missingRuntime(adapterId)),
    )
    .sort((first, second) => adapterRank[first.adapterId] - adapterRank[second.adapterId]);
}

function createRow(
  input: NativeCadKernelDeliveryRuntimeInput,
): NativeCadKernelDeliveryEnforcementRow {
  const bundledRuntimePath = input.bundledRuntimePath.trim();
  const fallbackMessage = input.fallbackMessage.trim();
  const fallbackRoute = input.fallbackRoute.trim();
  const fixtureCommand = input.fixtureCommand.trim();
  const fixtureInputHash = input.fixtureInputHash.trim();
  const fixtureOutputHash = input.fixtureOutputHash.trim();
  const runtimeVersion = input.runtimeVersion.trim();
  const sandboxPolicy = input.sandboxPolicy.trim();
  const sandboxProfileHash = input.sandboxProfileHash.trim();
  const supportRunbookUrl = input.supportRunbookUrl.trim();
  const verifierOwner = input.verifierOwner.trim();
  const runtimeAvailabilityReady =
    input.runtimeAvailable &&
    bundledRuntimePath.length > 0 &&
    runtimeVersion.length > 0;
  const fixtureExecutionReady =
    fixtureCommand.startsWith(bundledRuntimePath) &&
    input.fixtureExitCode === 0 &&
    input.fixtureDurationMs > 0 &&
    hasSha256(fixtureInputHash) &&
    hasSha256(fixtureOutputHash);
  const sandboxLimitsReady =
    input.sandboxMemoryMb >= 1024 &&
    input.sandboxTimeoutSeconds >= 60 &&
    sandboxPolicy.length >= 20 &&
    hasSha256(sandboxProfileHash);
  const fallbackRouteReady =
    (fallbackRoute.startsWith("/") || fallbackRoute.startsWith("https://")) &&
    fallbackMessage.length >= 40 &&
    supportRunbookUrl.startsWith("https://");
  const ownerReady = verifierOwner.length > 0;
  const status = statusFor({
    fallbackRouteReady,
    fixtureExecutionReady,
    ownerReady,
    runtimeAvailabilityReady,
    sandboxLimitsReady,
  });
  const deliveryBlockingReason = deliveryBlockingReasonFor({
    fallbackRouteReady,
    fixtureExecutionReady,
    ownerReady,
    runtimeAvailabilityReady,
    sandboxLimitsReady,
  });
  const rowWithoutHash = {
    adapterId: input.adapterId,
    bundledRuntimePath,
    deliveryBlockingReason,
    fallbackMessage,
    fallbackRoute,
    fallbackRouteReady,
    fixtureCommand,
    fixtureDurationMs: Math.max(0, Math.round(input.fixtureDurationMs)),
    fixtureExecutionReady,
    fixtureExitCode: input.fixtureExitCode,
    fixtureInputHash: fixtureInputHash || "missing",
    fixtureOutputHash: fixtureOutputHash || "missing",
    nextAction: "",
    ownerReady,
    runtimeAvailabilityReady,
    runtimeAvailable: input.runtimeAvailable,
    runtimeVersion,
    sandboxLimits: `${input.sandboxMemoryMb}MB memory / ${input.sandboxTimeoutSeconds}s timeout`,
    sandboxLimitsReady,
    sandboxMemoryMb: Math.max(0, Math.round(input.sandboxMemoryMb)),
    sandboxPolicy,
    sandboxProfileHash: sandboxProfileHash || "missing",
    sandboxTimeoutSeconds: Math.max(
      0,
      Math.round(input.sandboxTimeoutSeconds),
    ),
    status,
    supportRunbookUrl,
    verifierOwner,
  } satisfies Omit<NativeCadKernelDeliveryEnforcementRow, "enforcementHash">;
  const row = {
    ...rowWithoutHash,
    nextAction: nextActionFor(rowWithoutHash),
  };

  return {
    ...row,
    enforcementHash: sha256(row),
  };
}

function statusFor(input: {
  fallbackRouteReady: boolean;
  fixtureExecutionReady: boolean;
  ownerReady: boolean;
  runtimeAvailabilityReady: boolean;
  sandboxLimitsReady: boolean;
}): NativeCadKernelDeliveryEnforcementStatus {
  if (
    !input.fallbackRouteReady ||
    !input.fixtureExecutionReady ||
    !input.runtimeAvailabilityReady ||
    !input.sandboxLimitsReady
  ) {
    return "blocked";
  }

  if (!input.ownerReady) {
    return "review";
  }

  return "ready";
}

function deliveryBlockingReasonFor(input: {
  fallbackRouteReady: boolean;
  fixtureExecutionReady: boolean;
  ownerReady: boolean;
  runtimeAvailabilityReady: boolean;
  sandboxLimitsReady: boolean;
}) {
  if (!input.runtimeAvailabilityReady) {
    return "Missing bundled CAD conversion runtime availability proof.";
  }

  if (!input.fixtureExecutionReady) {
    return "Missing successful CAD fixture execution proof.";
  }

  if (!input.sandboxLimitsReady) {
    return "Missing sandbox memory, timeout, or profile proof.";
  }

  if (!input.fallbackRouteReady) {
    return "Missing user-visible CAD fallback route proof.";
  }

  if (!input.ownerReady) {
    return "Missing CAD delivery enforcement owner.";
  }

  return "Ready for native CAD kernel delivery enforcement.";
}

function nextActionFor(
  row: Omit<NativeCadKernelDeliveryEnforcementRow, "enforcementHash">,
) {
  if (row.status === "blocked") {
    return `Resolve blocked native CAD kernel delivery enforcement verifier for ${row.adapterId}.`;
  }

  if (row.status === "review") {
    return `Assign native CAD kernel delivery enforcement owner for ${row.adapterId}.`;
  }

  return `Native CAD kernel delivery enforcement is ready for ${row.adapterId}.`;
}

function summarize(
  rows: NativeCadKernelDeliveryEnforcementRow[],
): NativeCadKernelDeliveryEnforcementVerifier["summary"] {
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const fallbackRouteReadyCount = rows.filter(
    (row) => row.fallbackRouteReady,
  ).length;
  const fixtureExecutionReadyCount = rows.filter(
    (row) => row.fixtureExecutionReady,
  ).length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const runtimeAvailableCount = rows.filter(
    (row) => row.runtimeAvailabilityReady,
  ).length;
  const sandboxLimitsReadyCount = rows.filter(
    (row) => row.sandboxLimitsReady,
  ).length;
  const readySignals = rows.reduce(
    (total, row) =>
      total +
      [
        row.fallbackRouteReady,
        row.fixtureExecutionReady,
        row.ownerReady,
        row.runtimeAvailabilityReady,
        row.sandboxLimitsReady,
      ].filter(Boolean).length,
    0,
  );
  const totalSignals = Math.max(rows.length * 5, 1);
  const status: NativeCadKernelDeliveryEnforcementStatus =
    blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready";
  const deliveryBlocked = status !== "ready";
  const nextRow = rows.find((row) => row.status !== "ready");
  const summaryWithoutHash = {
    blockedCount,
    deliveryBlocked,
    enforcementScore: Math.round((readySignals / totalSignals) * 100),
    fallbackRouteReadyCount,
    fixtureExecutionReadyCount,
    nextAction:
      nextRow?.nextAction ??
      "Native CAD kernel delivery enforcement verifier is ready for release.",
    readyCount,
    reviewCount,
    rowCount: rows.length,
    runtimeAvailableCount,
    sandboxLimitsReadyCount,
    status,
  };

  return {
    ...summaryWithoutHash,
    enforcementHash: sha256({
      rows: rows.map((row) => row.enforcementHash),
      summary: summaryWithoutHash,
    }),
  };
}

function createCsv(rows: NativeCadKernelDeliveryEnforcementRow[]) {
  const header = [
    "adapter_id",
    "status",
    "bundled_runtime_path",
    "runtime_availability_ready",
    "fixture_execution_ready",
    "sandbox_limits_ready",
    "fallback_route_ready",
    "owner_ready",
    "enforcement_hash",
    "next_action",
  ];
  const lines = rows.map((row) =>
    [
      row.adapterId,
      row.status,
      row.bundledRuntimePath,
      row.runtimeAvailabilityReady,
      row.fixtureExecutionReady,
      row.sandboxLimitsReady,
      row.fallbackRouteReady,
      row.ownerReady,
      row.enforcementHash,
      row.nextAction,
    ]
      .map(csvCell)
      .join(","),
  );

  return [header.join(","), ...lines].join("\n");
}

function missingRuntime(
  adapterId: CadConversionWorkerAdapterId,
): NativeCadKernelDeliveryRuntimeInput {
  return {
    adapterId,
    bundledRuntimePath: "",
    fallbackMessage: "",
    fallbackRoute: "",
    fixtureCommand: "",
    fixtureDurationMs: 0,
    fixtureExitCode: 1,
    fixtureInputHash: "",
    fixtureOutputHash: "",
    runtimeAvailable: false,
    runtimeVersion: "",
    sandboxMemoryMb: 0,
    sandboxPolicy: "",
    sandboxProfileHash: "",
    sandboxTimeoutSeconds: 0,
    supportRunbookUrl: "",
    verifierOwner: "",
  };
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

  return Number.isNaN(date.getTime())
    ? "current"
    : date.toISOString().slice(0, 10).replaceAll("-", "");
}

function hasSha256(value: string) {
  return value.trim().startsWith("sha256:");
}
