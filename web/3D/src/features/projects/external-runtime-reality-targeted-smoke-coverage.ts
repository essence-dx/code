import { createHash } from "node:crypto";

export type ExternalRuntimeRealityTargetedSmokeCoverageArea =
  | "cad-process-evidence-collection"
  | "certificate-backed-artifact-reality"
  | "external-evidence-freshness"
  | "external-runtime-reality-packet";
export type ExternalRuntimeRealityTargetedSmokeCoverageStatus = "blocked" | "ready" | "review";
export type ExternalRuntimeRealityTargetedSmokeCoverageFileFormat = "csv" | "json";

export interface ExternalRuntimeRealityTargetedSmokeCoverageCheckInput {
  area: ExternalRuntimeRealityTargetedSmokeCoverageArea;
  blockedScenarioHash: string;
  readyScenarioHash: string;
  reportHash: string;
  scriptName: string;
  status: ExternalRuntimeRealityTargetedSmokeCoverageStatus;
}

export interface ExternalRuntimeRealityTargetedSmokeCoverageRow {
  area: ExternalRuntimeRealityTargetedSmokeCoverageArea;
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
  status: ExternalRuntimeRealityTargetedSmokeCoverageStatus;
}

export interface ExternalRuntimeRealityTargetedSmokeCoverageFile {
  download: string;
  format: ExternalRuntimeRealityTargetedSmokeCoverageFileFormat;
  href: string;
  label: string;
}

export interface ExternalRuntimeRealityTargetedSmokeCoverageReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  files: ExternalRuntimeRealityTargetedSmokeCoverageFile[];
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  releaseCandidateId: string;
  rows: ExternalRuntimeRealityTargetedSmokeCoverageRow[];
  summary: {
    blockedCount: number;
    coverageHash: string;
    coverageScore: number;
    missingCoverageCount: number;
    nextAction: string;
    readyCount: number;
    reviewCount: number;
    rowCount: number;
    status: ExternalRuntimeRealityTargetedSmokeCoverageStatus;
  };
  workspaceId: string;
}

export interface CreateExternalRuntimeRealityTargetedSmokeCoverageInput {
  checks: ExternalRuntimeRealityTargetedSmokeCoverageCheckInput[];
  generatedAt?: string;
  releaseCandidateId: string;
  requiredAreas?: ExternalRuntimeRealityTargetedSmokeCoverageArea[];
  workspaceId?: string;
}

const defaultRequiredAreas: ExternalRuntimeRealityTargetedSmokeCoverageArea[] = [
  "certificate-backed-artifact-reality",
  "cad-process-evidence-collection",
  "external-evidence-freshness",
  "external-runtime-reality-packet",
];

const areaRank: Record<ExternalRuntimeRealityTargetedSmokeCoverageArea, number> = {
  "certificate-backed-artifact-reality": 0,
  "cad-process-evidence-collection": 1,
  "external-evidence-freshness": 2,
  "external-runtime-reality-packet": 3,
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

function missingCheck(area: ExternalRuntimeRealityTargetedSmokeCoverageArea): ExternalRuntimeRealityTargetedSmokeCoverageCheckInput {
  return {
    area,
    blockedScenarioHash: "",
    readyScenarioHash: "",
    reportHash: "",
    scriptName: "",
    status: "blocked",
  };
}

function expectedScriptName(area: ExternalRuntimeRealityTargetedSmokeCoverageArea) {
  return `${area === "certificate-backed-artifact-reality" ? "certificate-backed-package-artifact-reality-verifier" : area === "cad-process-evidence-collection" ? "native-cad-runtime-process-evidence-collector" : area === "external-evidence-freshness" ? "external-artifact-evidence-freshness-monitor" : "external-runtime-reality-packet"}-smoke.ts`;
}

function statusFor(input: {
  blockedScenarioCovered: boolean;
  inputStatus: ExternalRuntimeRealityTargetedSmokeCoverageStatus;
  readyScenarioCovered: boolean;
  reportHashAttached: boolean;
  scriptLinked: boolean;
}): ExternalRuntimeRealityTargetedSmokeCoverageStatus {
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
    ExternalRuntimeRealityTargetedSmokeCoverageRow,
    "area" | "blockedScenarioCovered" | "readyScenarioCovered" | "reportHashAttached" | "scriptLinked" | "status"
  >,
) {
  if (row.status === "blocked") {
    return `Resolve blocked external runtime reality targeted smoke coverage for ${row.area}.`;
  }

  if (!row.scriptLinked) {
    return `Link the external runtime reality smoke script for ${row.area}.`;
  }

  if (!row.readyScenarioCovered) {
    return `Add ready-path external runtime reality smoke evidence for ${row.area}.`;
  }

  if (!row.blockedScenarioCovered) {
    return `Add blocked-path external runtime reality smoke evidence for ${row.area}.`;
  }

  if (!row.reportHashAttached) {
    return `Attach external runtime reality smoke report hash for ${row.area}.`;
  }

  return `External runtime reality targeted smoke coverage is ready for ${row.area}.`;
}

function createRow(input: ExternalRuntimeRealityTargetedSmokeCoverageCheckInput): ExternalRuntimeRealityTargetedSmokeCoverageRow {
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
  } satisfies Omit<ExternalRuntimeRealityTargetedSmokeCoverageRow, "coverageHash">;
  const row = {
    ...rowWithoutHash,
    nextAction: nextActionFor(rowWithoutHash),
  };

  return {
    ...row,
    coverageHash: sha256(row),
  };
}

function createRows(input: CreateExternalRuntimeRealityTargetedSmokeCoverageInput) {
  const checkByArea = new Map(input.checks.map((check) => [check.area, check]));
  const requiredAreas = input.requiredAreas ?? defaultRequiredAreas;

  return requiredAreas
    .map((area) => createRow(checkByArea.get(area) ?? missingCheck(area)))
    .sort((first, second) => areaRank[first.area] - areaRank[second.area]);
}

function summarize(rows: ExternalRuntimeRealityTargetedSmokeCoverageRow[]): ExternalRuntimeRealityTargetedSmokeCoverageReport["summary"] {
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const missingCoverageCount = rows.filter((row) => !row.readyScenarioCovered || !row.blockedScenarioCovered || !row.reportHashAttached || !row.scriptLinked).length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const status: ExternalRuntimeRealityTargetedSmokeCoverageStatus = blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready";

  return {
    blockedCount,
    coverageHash: sha256(rows.map((row) => row.coverageHash)),
    coverageScore: Math.max(0, Math.min(100, Math.round((readyCount / Math.max(1, rows.length)) * 100 + reviewCount * 20 - blockedCount * 18 - missingCoverageCount * 10))),
    missingCoverageCount,
    nextAction:
      status === "blocked"
        ? "Resolve blocked external runtime reality targeted smoke coverage before closing the external runtime reality set."
        : status === "review"
          ? "Review external runtime reality targeted smoke coverage before closing the external runtime reality set."
          : "External runtime reality targeted smoke coverage is ready to close the external runtime reality set.",
    readyCount,
    reviewCount,
    rowCount: rows.length,
    status,
  };
}

function createCsv(rows: ExternalRuntimeRealityTargetedSmokeCoverageRow[]) {
  const header = ["area", "status", "script_linked", "ready_scenario_covered", "blocked_scenario_covered", "report_hash_attached", "coverage_hash", "next_action"];
  const body = rows.map((row) =>
    [row.area, row.status, row.scriptLinked, row.readyScenarioCovered, row.blockedScenarioCovered, row.reportHashAttached, row.coverageHash, row.nextAction].map(csvCell).join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function filesFor(input: { csvDataUri: string; csvFileName: string; jsonDataUri: string; jsonFileName: string }): ExternalRuntimeRealityTargetedSmokeCoverageFile[] {
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

export function createExternalRuntimeRealityTargetedSmokeCoverage(
  input: CreateExternalRuntimeRealityTargetedSmokeCoverageInput,
): ExternalRuntimeRealityTargetedSmokeCoverageReport {
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
  const fileBase = `${slug(workspaceId)}-external-runtime-reality-targeted-smoke-coverage-${slug(input.releaseCandidateId)}-${dateStamp(generatedAt)}`;
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
