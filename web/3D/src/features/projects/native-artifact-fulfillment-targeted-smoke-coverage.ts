import { createHash } from "node:crypto";

export type NativeArtifactFulfillmentTargetedSmokeCoverageArea =
  | "artifact-attachment-workflow"
  | "cad-runtime-bundle-verification"
  | "fulfillment-acceptance-packet"
  | "signed-artifact-intake";
export type NativeArtifactFulfillmentTargetedSmokeCoverageStatus = "blocked" | "ready" | "review";
export type NativeArtifactFulfillmentTargetedSmokeCoverageFileFormat = "csv" | "json";

export interface NativeArtifactFulfillmentTargetedSmokeCoverageCheckInput {
  area: NativeArtifactFulfillmentTargetedSmokeCoverageArea;
  blockedScenarioHash: string;
  readyScenarioHash: string;
  reportHash: string;
  scriptName: string;
  status: NativeArtifactFulfillmentTargetedSmokeCoverageStatus;
}

export interface NativeArtifactFulfillmentTargetedSmokeCoverageRow {
  area: NativeArtifactFulfillmentTargetedSmokeCoverageArea;
  blockedScenarioCovered: boolean;
  blockedScenarioHash: string;
  coverageHash: string;
  nextAction: string;
  readyScenarioCovered: boolean;
  readyScenarioHash: string;
  reportHash: string;
  reportHashAttached: boolean;
  scriptLinked: boolean;
  scriptName: string;
  status: NativeArtifactFulfillmentTargetedSmokeCoverageStatus;
}

export interface NativeArtifactFulfillmentTargetedSmokeCoverageFile {
  download: string;
  format: NativeArtifactFulfillmentTargetedSmokeCoverageFileFormat;
  href: string;
  label: string;
}

export interface NativeArtifactFulfillmentTargetedSmokeCoverageReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  files: NativeArtifactFulfillmentTargetedSmokeCoverageFile[];
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  releaseCandidateId: string;
  rows: NativeArtifactFulfillmentTargetedSmokeCoverageRow[];
  summary: {
    blockedCount: number;
    coverageHash: string;
    coverageScore: number;
    missingCoverageCount: number;
    nextAction: string;
    readyCount: number;
    reviewCount: number;
    rowCount: number;
    status: NativeArtifactFulfillmentTargetedSmokeCoverageStatus;
  };
  workspaceId: string;
}

export interface CreateNativeArtifactFulfillmentTargetedSmokeCoverageInput {
  checks: NativeArtifactFulfillmentTargetedSmokeCoverageCheckInput[];
  generatedAt?: string;
  releaseCandidateId: string;
  requiredAreas?: NativeArtifactFulfillmentTargetedSmokeCoverageArea[];
  workspaceId?: string;
}

const defaultRequiredAreas: NativeArtifactFulfillmentTargetedSmokeCoverageArea[] = [
  "signed-artifact-intake",
  "cad-runtime-bundle-verification",
  "artifact-attachment-workflow",
  "fulfillment-acceptance-packet",
];

const areaRank: Record<NativeArtifactFulfillmentTargetedSmokeCoverageArea, number> = {
  "signed-artifact-intake": 0,
  "cad-runtime-bundle-verification": 1,
  "artifact-attachment-workflow": 2,
  "fulfillment-acceptance-packet": 3,
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

function missingCheck(area: NativeArtifactFulfillmentTargetedSmokeCoverageArea): NativeArtifactFulfillmentTargetedSmokeCoverageCheckInput {
  return {
    area,
    blockedScenarioHash: "",
    readyScenarioHash: "",
    reportHash: "",
    scriptName: "",
    status: "blocked",
  };
}

function expectedScriptName(area: NativeArtifactFulfillmentTargetedSmokeCoverageArea) {
  return `${area === "fulfillment-acceptance-packet" ? "native-external-artifact-acceptance-packet" : area === "artifact-attachment-workflow" ? "native-release-candidate-artifact-attachment-workflow" : area === "cad-runtime-bundle-verification" ? "native-cad-runtime-bundle-installer-verification" : "native-signed-artifact-intake-queue"}-smoke.ts`;
}

function statusFor(input: {
  blockedScenarioCovered: boolean;
  inputStatus: NativeArtifactFulfillmentTargetedSmokeCoverageStatus;
  readyScenarioCovered: boolean;
  reportHashAttached: boolean;
  scriptLinked: boolean;
}): NativeArtifactFulfillmentTargetedSmokeCoverageStatus {
  if (!input.blockedScenarioCovered || !input.readyScenarioCovered || !input.reportHashAttached || !input.scriptLinked || input.inputStatus === "blocked") {
    return "blocked";
  }

  if (input.inputStatus === "review") {
    return "review";
  }

  return "ready";
}

function nextActionFor(
  row: Pick<
    NativeArtifactFulfillmentTargetedSmokeCoverageRow,
    "area" | "blockedScenarioCovered" | "readyScenarioCovered" | "reportHashAttached" | "scriptLinked" | "status"
  >,
) {
  if (row.status === "blocked") {
    return `Resolve blocked native artifact fulfillment targeted smoke coverage for ${row.area}.`;
  }

  if (!row.scriptLinked) {
    return `Link the targeted smoke script for ${row.area}.`;
  }

  if (!row.readyScenarioCovered) {
    return `Add ready-path smoke evidence for ${row.area}.`;
  }

  if (!row.blockedScenarioCovered) {
    return `Add blocked-path smoke evidence for ${row.area}.`;
  }

  if (!row.reportHashAttached) {
    return `Attach targeted smoke report hash for ${row.area}.`;
  }

  return `Native artifact fulfillment targeted smoke coverage is ready for ${row.area}.`;
}

function createRow(input: NativeArtifactFulfillmentTargetedSmokeCoverageCheckInput): NativeArtifactFulfillmentTargetedSmokeCoverageRow {
  const scriptName = input.scriptName.trim();
  const readyScenarioHash = input.readyScenarioHash.trim() || "missing";
  const blockedScenarioHash = input.blockedScenarioHash.trim() || "missing";
  const reportHash = input.reportHash.trim() || "missing";
  const scriptLinked = scriptName === expectedScriptName(input.area);
  const readyScenarioCovered = hasSha256(readyScenarioHash);
  const blockedScenarioCovered = hasSha256(blockedScenarioHash);
  const reportHashAttached = hasSha256(reportHash);
  const status = statusFor({
    blockedScenarioCovered,
    inputStatus: input.status,
    readyScenarioCovered,
    reportHashAttached,
    scriptLinked,
  });
  const rowWithoutHash = {
    area: input.area,
    blockedScenarioCovered,
    blockedScenarioHash,
    nextAction: "",
    readyScenarioCovered,
    readyScenarioHash,
    reportHash,
    reportHashAttached,
    scriptLinked,
    scriptName,
    status,
  } satisfies Omit<NativeArtifactFulfillmentTargetedSmokeCoverageRow, "coverageHash">;
  const row = {
    ...rowWithoutHash,
    nextAction: nextActionFor(rowWithoutHash),
  };

  return {
    ...row,
    coverageHash: sha256(row),
  };
}

function createRows(input: CreateNativeArtifactFulfillmentTargetedSmokeCoverageInput) {
  const checkByArea = new Map(input.checks.map((check) => [check.area, check]));
  const requiredAreas = input.requiredAreas ?? defaultRequiredAreas;

  return requiredAreas
    .map((area) => createRow(checkByArea.get(area) ?? missingCheck(area)))
    .sort((first, second) => areaRank[first.area] - areaRank[second.area]);
}

function summarize(rows: NativeArtifactFulfillmentTargetedSmokeCoverageRow[]): NativeArtifactFulfillmentTargetedSmokeCoverageReport["summary"] {
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const missingCoverageCount = rows.filter((row) => !row.readyScenarioCovered || !row.blockedScenarioCovered || !row.reportHashAttached || !row.scriptLinked).length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const status: NativeArtifactFulfillmentTargetedSmokeCoverageStatus = blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready";

  return {
    blockedCount,
    coverageHash: sha256(rows.map((row) => row.coverageHash)),
    coverageScore: Math.max(0, Math.min(100, Math.round((readyCount / Math.max(1, rows.length)) * 100 + reviewCount * 20 - blockedCount * 18 - missingCoverageCount * 10))),
    missingCoverageCount,
    nextAction:
      status === "blocked"
        ? "Resolve blocked native artifact fulfillment targeted smoke coverage before closing the fulfillment set."
        : status === "review"
          ? "Review native artifact fulfillment targeted smoke coverage before closing the fulfillment set."
          : "Native artifact fulfillment targeted smoke coverage is ready to close the fulfillment set.",
    readyCount,
    reviewCount,
    rowCount: rows.length,
    status,
  };
}

function createCsv(rows: NativeArtifactFulfillmentTargetedSmokeCoverageRow[]) {
  const header = ["area", "status", "script_linked", "ready_scenario_covered", "blocked_scenario_covered", "report_hash_attached", "coverage_hash", "next_action"];
  const body = rows.map((row) =>
    [row.area, row.status, row.scriptLinked, row.readyScenarioCovered, row.blockedScenarioCovered, row.reportHashAttached, row.coverageHash, row.nextAction].map(csvCell).join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function filesFor(input: { csvDataUri: string; csvFileName: string; jsonDataUri: string; jsonFileName: string }): NativeArtifactFulfillmentTargetedSmokeCoverageFile[] {
  return [
    {
      download: input.csvFileName,
      format: "csv",
      href: input.csvDataUri,
      label: "CSV coverage",
    },
    {
      download: input.jsonFileName,
      format: "json",
      href: input.jsonDataUri,
      label: "JSON coverage",
    },
  ];
}

export function createNativeArtifactFulfillmentTargetedSmokeCoverage(
  input: CreateNativeArtifactFulfillmentTargetedSmokeCoverageInput,
): NativeArtifactFulfillmentTargetedSmokeCoverageReport {
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
  const fileBase = `${slug(workspaceId)}-native-artifact-fulfillment-targeted-smoke-coverage-${slug(input.releaseCandidateId)}-${dateStamp(generatedAt)}`;
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
