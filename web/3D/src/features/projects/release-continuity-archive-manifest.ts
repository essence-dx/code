import { createHash } from "node:crypto";

export type ReleaseContinuityArchiveManifestSource =
  | "release-continuity-dashboard-packet"
  | "release-continuity-evidence-index"
  | "release-continuity-regression-monitor";
export type ReleaseContinuityArchiveManifestStatus =
  | "blocked"
  | "ready"
  | "review";
export type ReleaseContinuityArchiveManifestFileFormat = "csv" | "json";

export interface ReleaseContinuityArchiveManifestEntryInput {
  readonly acceptedPacketHash?: string;
  readonly owner?: string;
  readonly restorationProofHash?: string;
  readonly restorationUrl?: string;
  readonly retentionExpiresAt?: string;
  readonly source: ReleaseContinuityArchiveManifestSource;
  readonly storageUrl?: string;
}

export interface ReleaseContinuityArchiveManifestInput {
  readonly entries: readonly ReleaseContinuityArchiveManifestEntryInput[];
  readonly generatedAt?: string;
  readonly releaseCandidateId: string;
  readonly requiredSources?: readonly ReleaseContinuityArchiveManifestSource[];
  readonly workspaceId?: string;
}

export interface ReleaseContinuityArchiveManifestRow
  extends Required<ReleaseContinuityArchiveManifestEntryInput> {
  readonly acceptedPacketReady: boolean;
  readonly manifestHash: string;
  readonly nextAction: string;
  readonly retentionReady: boolean;
  readonly restorationReady: boolean;
  readonly status: ReleaseContinuityArchiveManifestStatus;
  readonly storageReady: boolean;
}

export interface ReleaseContinuityArchiveManifestFile {
  readonly download: string;
  readonly format: ReleaseContinuityArchiveManifestFileFormat;
  readonly href: string;
  readonly label: string;
}

export interface ReleaseContinuityArchiveManifest {
  readonly csvContent: string;
  readonly csvDataUri: string;
  readonly csvFileName: string;
  readonly files: ReleaseContinuityArchiveManifestFile[];
  readonly generatedAt: string;
  readonly jsonContent: string;
  readonly jsonDataUri: string;
  readonly jsonFileName: string;
  readonly releaseCandidateId: string;
  readonly rows: ReleaseContinuityArchiveManifestRow[];
  readonly summary: {
    readonly archiveScore: number;
    readonly blockedCount: number;
    readonly manifestHash: string;
    readonly nextAction: string;
    readonly readyCount: number;
    readonly restorationReadyCount: number;
    readonly retentionReadyCount: number;
    readonly reviewCount: number;
    readonly rowCount: number;
    readonly status: ReleaseContinuityArchiveManifestStatus;
    readonly storageReadyCount: number;
  };
  readonly workspaceId: string;
}

const defaultRequiredSources: readonly ReleaseContinuityArchiveManifestSource[] =
  [
    "release-continuity-evidence-index",
    "release-continuity-regression-monitor",
    "release-continuity-dashboard-packet",
  ];

const sourceRank: Record<ReleaseContinuityArchiveManifestSource, number> = {
  "release-continuity-evidence-index": 0,
  "release-continuity-regression-monitor": 1,
  "release-continuity-dashboard-packet": 2,
};

export function createReleaseContinuityArchiveManifest(
  input: ReleaseContinuityArchiveManifestInput,
): ReleaseContinuityArchiveManifest {
  const generatedAt = input.generatedAt ?? new Date(0).toISOString();
  const workspaceId = input.workspaceId ?? "Essence Runtime";
  const entriesBySource = new Map(
    input.entries.map((entry) => [entry.source, entry]),
  );
  const rows = [...(input.requiredSources ?? defaultRequiredSources)]
    .map((source) =>
      createRow(entriesBySource.get(source) ?? missingEntry(source)),
    )
    .sort((first, second) => sourceRank[first.source] - sourceRank[second.source]);
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
  const baseFileName = `${slug(workspaceId)}-release-continuity-archive-manifest-${slug(
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
        label: "Release continuity archive manifest CSV",
      },
      {
        download: jsonFileName,
        format: "json",
        href: jsonDataUri,
        label: "Release continuity archive manifest JSON",
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

function missingEntry(
  source: ReleaseContinuityArchiveManifestSource,
): Required<ReleaseContinuityArchiveManifestEntryInput> {
  return {
    acceptedPacketHash: "",
    owner: "",
    restorationProofHash: "",
    restorationUrl: "",
    retentionExpiresAt: "",
    source,
    storageUrl: "",
  };
}

function createRow(
  input: ReleaseContinuityArchiveManifestEntryInput,
): ReleaseContinuityArchiveManifestRow {
  const rowInput: Required<ReleaseContinuityArchiveManifestEntryInput> = {
    acceptedPacketHash: input.acceptedPacketHash?.trim() ?? "",
    owner: input.owner?.trim() ?? "",
    restorationProofHash: input.restorationProofHash?.trim() ?? "",
    restorationUrl: input.restorationUrl?.trim() ?? "",
    retentionExpiresAt: input.retentionExpiresAt?.trim() ?? "",
    source: input.source,
    storageUrl: input.storageUrl?.trim() ?? "",
  };
  const acceptedPacketReady = hasSha256(rowInput.acceptedPacketHash);
  const storageReady =
    rowInput.owner.length > 0 && rowInput.storageUrl.startsWith("https://");
  const retentionReady =
    Number.isFinite(Date.parse(rowInput.retentionExpiresAt)) &&
    new Date(rowInput.retentionExpiresAt).getTime() > Date.now();
  const restorationReady =
    hasSha256(rowInput.restorationProofHash) &&
    rowInput.restorationUrl.startsWith("https://");
  const status: ReleaseContinuityArchiveManifestStatus =
    acceptedPacketReady && storageReady && retentionReady && restorationReady
      ? "ready"
      : "blocked";
  const rowWithoutHash = {
    ...rowInput,
    acceptedPacketReady,
    nextAction:
      status === "ready"
        ? `Release continuity archive manifest is ready for ${rowInput.source}.`
        : `Resolve blocked release continuity archive manifest for ${rowInput.source}.`,
    retentionReady,
    restorationReady,
    status,
    storageReady,
  };

  return {
    ...rowWithoutHash,
    manifestHash: sha256(rowWithoutHash),
  };
}

function summarize(
  rows: readonly ReleaseContinuityArchiveManifestRow[],
): ReleaseContinuityArchiveManifest["summary"] {
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const storageReadyCount = rows.filter((row) => row.storageReady).length;
  const retentionReadyCount = rows.filter((row) => row.retentionReady).length;
  const restorationReadyCount = rows.filter((row) => row.restorationReady).length;
  const acceptedPacketReadyCount = rows.filter(
    (row) => row.acceptedPacketReady,
  ).length;
  const readySignals =
    acceptedPacketReadyCount +
    storageReadyCount +
    retentionReadyCount +
    restorationReadyCount;
  const status: ReleaseContinuityArchiveManifestStatus =
    blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready";

  return {
    archiveScore: Math.round((readySignals / (rows.length * 4)) * 100),
    blockedCount,
    manifestHash: sha256(rows.map((row) => row.manifestHash)),
    nextAction:
      status === "ready"
        ? "Release continuity archive manifest is ready for long-term audit retention."
        : "Resolve blocked release continuity archive manifest before long-term audit retention.",
    readyCount,
    restorationReadyCount,
    retentionReadyCount,
    reviewCount,
    rowCount: rows.length,
    status,
    storageReadyCount,
  };
}

function createCsv(rows: readonly ReleaseContinuityArchiveManifestRow[]) {
  const header = [
    "source",
    "status",
    "accepted_packet_ready",
    "storage_ready",
    "retention_ready",
    "restoration_ready",
    "manifest_hash",
    "next_action",
  ];
  const records = rows.map((row) => [
    row.source,
    row.status,
    String(row.acceptedPacketReady),
    String(row.storageReady),
    String(row.retentionReady),
    String(row.restorationReady),
    row.manifestHash,
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
