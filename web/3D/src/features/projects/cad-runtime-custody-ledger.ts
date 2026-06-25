import { createHash } from "node:crypto";

import type { CadConversionWorkerAdapterId } from "@/features/projects/cad-conversion-worker";

export type CadRuntimeCustodyLedgerStatus = "blocked" | "ready" | "review";
export type CadRuntimeCustodyLedgerFileFormat = "csv" | "json";

export interface CadRuntimeCustodyInput {
  readonly adapterId: CadConversionWorkerAdapterId;
  readonly bundleOwner?: string;
  readonly bundlePath?: string;
  readonly bundleSha256?: string;
  readonly fallbackApprovalCustodyOwner?: string;
  readonly fallbackApprovalEvidenceUrl?: string;
  readonly fixtureCorpusRetentionExpiresAt?: string;
  readonly fixtureCorpusSha256?: string;
  readonly outputEvidenceRenewalAt?: string;
  readonly outputEvidenceRenewalHash?: string;
}

export interface CadRuntimeCustodyLedgerInput {
  readonly generatedAt?: string;
  readonly releaseCandidateId: string;
  readonly requiredAdapters?: readonly CadConversionWorkerAdapterId[];
  readonly runtimes: readonly CadRuntimeCustodyInput[];
  readonly workspaceId?: string;
}

export interface CadRuntimeCustodyLedgerRow
  extends Required<CadRuntimeCustodyInput> {
  readonly bundleOwnerReady: boolean;
  readonly fallbackCustodyReady: boolean;
  readonly fixtureRetentionReady: boolean;
  readonly ledgerHash: string;
  readonly nextAction: string;
  readonly outputRenewalReady: boolean;
  readonly status: CadRuntimeCustodyLedgerStatus;
}

export interface CadRuntimeCustodyLedgerFile {
  readonly download: string;
  readonly format: CadRuntimeCustodyLedgerFileFormat;
  readonly href: string;
  readonly label: string;
}

export interface CadRuntimeCustodyLedger {
  readonly csvContent: string;
  readonly csvDataUri: string;
  readonly csvFileName: string;
  readonly files: CadRuntimeCustodyLedgerFile[];
  readonly generatedAt: string;
  readonly jsonContent: string;
  readonly jsonDataUri: string;
  readonly jsonFileName: string;
  readonly releaseCandidateId: string;
  readonly rows: CadRuntimeCustodyLedgerRow[];
  readonly summary: {
    readonly blockedCount: number;
    readonly bundleOwnerReadyCount: number;
    readonly custodyScore: number;
    readonly fallbackCustodyReadyCount: number;
    readonly fixtureRetentionReadyCount: number;
    readonly ledgerHash: string;
    readonly nextAction: string;
    readonly outputRenewalReadyCount: number;
    readonly readyCount: number;
    readonly reviewCount: number;
    readonly rowCount: number;
    readonly status: CadRuntimeCustodyLedgerStatus;
  };
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

export function createCadRuntimeCustodyLedger(
  input: CadRuntimeCustodyLedgerInput,
): CadRuntimeCustodyLedger {
  const generatedAt = input.generatedAt ?? new Date(0).toISOString();
  const workspaceId = input.workspaceId ?? "Essence Runtime";
  const runtimesByAdapter = new Map(
    input.runtimes.map((runtime) => [runtime.adapterId, runtime]),
  );
  const rows = [...(input.requiredAdapters ?? defaultRequiredAdapters)]
    .sort((first, second) => adapterRank[first] - adapterRank[second])
    .map((adapterId) =>
      createRow(runtimesByAdapter.get(adapterId) ?? missingRuntime(adapterId)),
    );
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
  const baseFileName = `${slug(workspaceId)}-cad-runtime-custody-ledger-${slug(
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
        label: "CAD runtime custody ledger CSV",
      },
      {
        download: jsonFileName,
        format: "json",
        href: jsonDataUri,
        label: "CAD runtime custody ledger JSON",
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

function missingRuntime(
  adapterId: CadConversionWorkerAdapterId,
): Required<CadRuntimeCustodyInput> {
  return {
    adapterId,
    bundleOwner: "",
    bundlePath: "",
    bundleSha256: "",
    fallbackApprovalCustodyOwner: "",
    fallbackApprovalEvidenceUrl: "",
    fixtureCorpusRetentionExpiresAt: "",
    fixtureCorpusSha256: "",
    outputEvidenceRenewalAt: "",
    outputEvidenceRenewalHash: "",
  };
}

function createRow(input: CadRuntimeCustodyInput): CadRuntimeCustodyLedgerRow {
  const rowInput: Required<CadRuntimeCustodyInput> = {
    adapterId: input.adapterId,
    bundleOwner: input.bundleOwner?.trim() ?? "",
    bundlePath: input.bundlePath?.trim() ?? "",
    bundleSha256: input.bundleSha256?.trim() ?? "",
    fallbackApprovalCustodyOwner:
      input.fallbackApprovalCustodyOwner?.trim() ?? "",
    fallbackApprovalEvidenceUrl:
      input.fallbackApprovalEvidenceUrl?.trim() ?? "",
    fixtureCorpusRetentionExpiresAt:
      input.fixtureCorpusRetentionExpiresAt?.trim() ?? "",
    fixtureCorpusSha256: input.fixtureCorpusSha256?.trim() ?? "",
    outputEvidenceRenewalAt: input.outputEvidenceRenewalAt?.trim() ?? "",
    outputEvidenceRenewalHash: input.outputEvidenceRenewalHash?.trim() ?? "",
  };
  const bundleOwnerReady =
    rowInput.bundleOwner.length > 0 &&
    rowInput.bundlePath.length > 0 &&
    hasSha256(rowInput.bundleSha256);
  const fixtureRetentionReady =
    hasSha256(rowInput.fixtureCorpusSha256) &&
    Number.isFinite(Date.parse(rowInput.fixtureCorpusRetentionExpiresAt)) &&
    new Date(rowInput.fixtureCorpusRetentionExpiresAt).getTime() > Date.now();
  const outputRenewalReady =
    hasSha256(rowInput.outputEvidenceRenewalHash) &&
    Number.isFinite(Date.parse(rowInput.outputEvidenceRenewalAt));
  const fallbackCustodyReady =
    rowInput.fallbackApprovalCustodyOwner.length > 0 &&
    rowInput.fallbackApprovalEvidenceUrl.startsWith("https://");
  const status: CadRuntimeCustodyLedgerStatus =
    bundleOwnerReady &&
    fixtureRetentionReady &&
    outputRenewalReady &&
    fallbackCustodyReady
      ? "ready"
      : "blocked";
  const rowWithoutHash = {
    ...rowInput,
    bundleOwnerReady,
    fallbackCustodyReady,
    fixtureRetentionReady,
    nextAction:
      status === "ready"
        ? `CAD runtime custody is ready for ${rowInput.adapterId}.`
        : `Resolve blocked CAD runtime custody ledger for ${rowInput.adapterId}.`,
    outputRenewalReady,
    status,
  };

  return {
    ...rowWithoutHash,
    ledgerHash: sha256(rowWithoutHash),
  };
}

function summarize(
  rows: readonly CadRuntimeCustodyLedgerRow[],
): CadRuntimeCustodyLedger["summary"] {
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const bundleOwnerReadyCount = rows.filter(
    (row) => row.bundleOwnerReady,
  ).length;
  const fixtureRetentionReadyCount = rows.filter(
    (row) => row.fixtureRetentionReady,
  ).length;
  const outputRenewalReadyCount = rows.filter(
    (row) => row.outputRenewalReady,
  ).length;
  const fallbackCustodyReadyCount = rows.filter(
    (row) => row.fallbackCustodyReady,
  ).length;
  const readySignals =
    bundleOwnerReadyCount +
    fixtureRetentionReadyCount +
    outputRenewalReadyCount +
    fallbackCustodyReadyCount;
  const status: CadRuntimeCustodyLedgerStatus =
    blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready";

  return {
    blockedCount,
    bundleOwnerReadyCount,
    custodyScore: Math.round((readySignals / (rows.length * 4)) * 100),
    fallbackCustodyReadyCount,
    fixtureRetentionReadyCount,
    ledgerHash: sha256(rows.map((row) => row.ledgerHash)),
    nextAction:
      status === "ready"
        ? "CAD runtime custody ledger is ready for release evidence continuity."
        : "Resolve blocked CAD runtime custody ledger before release evidence continuity approval.",
    outputRenewalReadyCount,
    readyCount,
    reviewCount,
    rowCount: rows.length,
    status,
  };
}

function createCsv(rows: readonly CadRuntimeCustodyLedgerRow[]) {
  const header = [
    "adapter_id",
    "status",
    "bundle_owner_ready",
    "fixture_retention_ready",
    "output_renewal_ready",
    "fallback_custody_ready",
    "ledger_hash",
    "next_action",
  ];
  const records = rows.map((row) => [
    row.adapterId,
    row.status,
    String(row.bundleOwnerReady),
    String(row.fixtureRetentionReady),
    String(row.outputRenewalReady),
    String(row.fallbackCustodyReady),
    row.ledgerHash,
    row.nextAction,
  ]);

  return [header, ...records].map(csvRow).join("\n");
}

function csvRow(values: readonly string[]) {
  return values
    .map((value) => {
      const escaped = value.replaceAll('"', '""');

      return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
    })
    .join(",");
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
