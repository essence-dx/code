import { createHash } from "node:crypto";
import type { NativeArtifactStorageHandoffPlatform } from "@/features/projects/native-artifact-storage-handoff-evidence";

export type NativeArtifactRuntimeReleaseBlockerMatrixStatus = "blocked" | "go" | "review";
export type NativeArtifactRuntimeReleaseBlockerMatrixFileFormat = "csv" | "json";

export interface NativeArtifactRuntimeReleaseBlockerInput {
  blockerId: string;
  cadRuntimeReady: boolean;
  dueAt: string;
  evidenceHash: string;
  evidenceUrl: string;
  owner: string;
  platform: NativeArtifactStorageHandoffPlatform;
  releaseApprovalReady: boolean;
  signedArtifactReady: boolean;
  updaterDistributionReady: boolean;
}

export interface NativeArtifactRuntimeReleaseBlockerRow {
  blockerId: string;
  cadRuntimeReady: boolean;
  dueAt: string;
  evidenceHash: string;
  evidenceLinked: boolean;
  evidenceUrl: string;
  goNoGo: NativeArtifactRuntimeReleaseBlockerMatrixStatus;
  matrixHash: string;
  nextAction: string;
  owner: string;
  ownerReady: boolean;
  platform: NativeArtifactStorageHandoffPlatform;
  releaseApprovalReady: boolean;
  signedArtifactReady: boolean;
  updaterDistributionReady: boolean;
}

export interface NativeArtifactRuntimeReleaseBlockerMatrixFile {
  download: string;
  format: NativeArtifactRuntimeReleaseBlockerMatrixFileFormat;
  href: string;
  label: string;
}

export interface NativeArtifactRuntimeReleaseBlockerMatrixReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  files: NativeArtifactRuntimeReleaseBlockerMatrixFile[];
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  releaseCandidateId: string;
  rows: NativeArtifactRuntimeReleaseBlockerRow[];
  summary: {
    blockedCount: number;
    cadRuntimeReadyCount: number;
    goCount: number;
    matrixHash: string;
    matrixScore: number;
    nextAction: string;
    releaseApprovalReadyCount: number;
    reviewCount: number;
    rowCount: number;
    signedArtifactReadyCount: number;
    status: NativeArtifactRuntimeReleaseBlockerMatrixStatus;
    updaterDistributionReadyCount: number;
  };
  workspaceId: string;
}

export interface CreateNativeArtifactRuntimeReleaseBlockerMatrixInput {
  blockers: NativeArtifactRuntimeReleaseBlockerInput[];
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

function urlReady(value: string) {
  return value.trim().startsWith("https://");
}

function missingBlocker(platform: NativeArtifactStorageHandoffPlatform): NativeArtifactRuntimeReleaseBlockerInput {
  return {
    blockerId: `${platform}-artifact-runtime-closeout-missing`,
    cadRuntimeReady: false,
    dueAt: "",
    evidenceHash: "",
    evidenceUrl: "",
    owner: "",
    platform,
    releaseApprovalReady: false,
    signedArtifactReady: false,
    updaterDistributionReady: false,
  };
}

function statusFor(input: {
  cadRuntimeReady: boolean;
  evidenceLinked: boolean;
  ownerReady: boolean;
  releaseApprovalReady: boolean;
  signedArtifactReady: boolean;
  updaterDistributionReady: boolean;
}): NativeArtifactRuntimeReleaseBlockerMatrixStatus {
  if (!input.signedArtifactReady || !input.updaterDistributionReady || !input.cadRuntimeReady || !input.releaseApprovalReady) {
    return "blocked";
  }

  if (!input.evidenceLinked || !input.ownerReady) {
    return "review";
  }

  return "go";
}

function nextActionFor(
  row: Pick<
    NativeArtifactRuntimeReleaseBlockerRow,
    | "cadRuntimeReady"
    | "evidenceLinked"
    | "goNoGo"
    | "ownerReady"
    | "platform"
    | "releaseApprovalReady"
    | "signedArtifactReady"
    | "updaterDistributionReady"
  >,
) {
  if (row.goNoGo === "blocked") {
    return `Resolve blocked native artifact runtime release blocker matrix for ${row.platform}.`;
  }

  if (!row.signedArtifactReady) {
    return `Attach signed native artifact closeout before release go for ${row.platform}.`;
  }

  if (!row.updaterDistributionReady) {
    return `Attach updater distribution proof before release go for ${row.platform}.`;
  }

  if (!row.cadRuntimeReady) {
    return `Attach CAD runtime closeout before release go for ${row.platform}.`;
  }

  if (!row.releaseApprovalReady) {
    return `Attach release approval before release go for ${row.platform}.`;
  }

  if (!row.evidenceLinked) {
    return `Link artifact runtime release blocker evidence for ${row.platform}.`;
  }

  if (!row.ownerReady) {
    return `Assign artifact runtime release blocker owner for ${row.platform}.`;
  }

  return `Keep artifact runtime release blocker matrix current for ${row.platform}.`;
}

function createRow(input: NativeArtifactRuntimeReleaseBlockerInput): NativeArtifactRuntimeReleaseBlockerRow {
  const blockerId = input.blockerId.trim() || `${input.platform}-release-blocker`;
  const dueAt = input.dueAt.trim();
  const evidenceHash = input.evidenceHash.trim() || "missing";
  const evidenceUrl = input.evidenceUrl.trim();
  const owner = input.owner.trim();
  const evidenceLinked = hasSha256(evidenceHash) && urlReady(evidenceUrl);
  const ownerReady = owner.length > 0 && dueAt.length > 0;
  const goNoGo = statusFor({
    cadRuntimeReady: input.cadRuntimeReady,
    evidenceLinked,
    ownerReady,
    releaseApprovalReady: input.releaseApprovalReady,
    signedArtifactReady: input.signedArtifactReady,
    updaterDistributionReady: input.updaterDistributionReady,
  });
  const rowWithoutHash = {
    blockerId,
    cadRuntimeReady: input.cadRuntimeReady,
    dueAt,
    evidenceHash,
    evidenceLinked,
    evidenceUrl,
    goNoGo,
    nextAction: "",
    owner,
    ownerReady,
    platform: input.platform,
    releaseApprovalReady: input.releaseApprovalReady,
    signedArtifactReady: input.signedArtifactReady,
    updaterDistributionReady: input.updaterDistributionReady,
  } satisfies Omit<NativeArtifactRuntimeReleaseBlockerRow, "matrixHash">;
  const row = {
    ...rowWithoutHash,
    nextAction: nextActionFor(rowWithoutHash),
  };

  return {
    ...row,
    matrixHash: sha256(row),
  };
}

function createRows(input: CreateNativeArtifactRuntimeReleaseBlockerMatrixInput) {
  const blockerByPlatform = new Map(input.blockers.map((blocker) => [blocker.platform, blocker]));
  const requiredPlatforms = input.requiredPlatforms ?? defaultRequiredPlatforms;

  return requiredPlatforms
    .map((platform) => createRow(blockerByPlatform.get(platform) ?? missingBlocker(platform)))
    .sort((first, second) => platformRank[first.platform] - platformRank[second.platform]);
}

function summarize(rows: NativeArtifactRuntimeReleaseBlockerRow[]): NativeArtifactRuntimeReleaseBlockerMatrixReport["summary"] {
  const blockedCount = rows.filter((row) => row.goNoGo === "blocked").length;
  const cadRuntimeReadyCount = rows.filter((row) => row.cadRuntimeReady).length;
  const goCount = rows.filter((row) => row.goNoGo === "go").length;
  const releaseApprovalReadyCount = rows.filter((row) => row.releaseApprovalReady).length;
  const reviewCount = rows.filter((row) => row.goNoGo === "review").length;
  const signedArtifactReadyCount = rows.filter((row) => row.signedArtifactReady).length;
  const updaterDistributionReadyCount = rows.filter((row) => row.updaterDistributionReady).length;
  const status: NativeArtifactRuntimeReleaseBlockerMatrixStatus = blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "go";

  return {
    blockedCount,
    cadRuntimeReadyCount,
    goCount,
    matrixHash: sha256(rows.map((row) => row.matrixHash)),
    matrixScore: Math.max(0, Math.min(100, Math.round((goCount / Math.max(1, rows.length)) * 100 + reviewCount * 20 - blockedCount * 18))),
    nextAction:
      status === "blocked"
        ? "Resolve blocked native artifact runtime release blocker matrix before closeout release."
        : status === "review"
          ? "Review native artifact runtime release blocker matrix before closeout release."
          : "Native artifact runtime release blocker matrix is go for closeout release.",
    releaseApprovalReadyCount,
    reviewCount,
    rowCount: rows.length,
    signedArtifactReadyCount,
    status,
    updaterDistributionReadyCount,
  };
}

function createCsv(rows: NativeArtifactRuntimeReleaseBlockerRow[]) {
  const header = [
    "platform",
    "go_no_go",
    "signed_artifact_ready",
    "updater_distribution_ready",
    "cad_runtime_ready",
    "release_approval_ready",
    "evidence_linked",
    "matrix_hash",
    "next_action",
  ];
  const body = rows.map((row) =>
    [
      row.platform,
      row.goNoGo,
      row.signedArtifactReady,
      row.updaterDistributionReady,
      row.cadRuntimeReady,
      row.releaseApprovalReady,
      row.evidenceLinked,
      row.matrixHash,
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
}): NativeArtifactRuntimeReleaseBlockerMatrixFile[] {
  return [
    {
      download: input.csvFileName,
      format: "csv",
      href: input.csvDataUri,
      label: "CSV matrix",
    },
    {
      download: input.jsonFileName,
      format: "json",
      href: input.jsonDataUri,
      label: "JSON matrix",
    },
  ];
}

export function createNativeArtifactRuntimeReleaseBlockerMatrix(
  input: CreateNativeArtifactRuntimeReleaseBlockerMatrixInput,
): NativeArtifactRuntimeReleaseBlockerMatrixReport {
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
  const fileBase = `${slug(workspaceId)}-native-artifact-runtime-release-blocker-matrix-${slug(input.releaseCandidateId)}-${dateStamp(generatedAt)}`;
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
