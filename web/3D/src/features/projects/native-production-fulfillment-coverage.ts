import { createHash } from "node:crypto";

export type NativeProductionFulfillmentCoverageArea =
  | "artifact-storage-handoff-readiness"
  | "cad-transcript-ingestion"
  | "fulfillment-ledger-scoring"
  | "promotion-rehearsal-gating";
export type NativeProductionFulfillmentCoverageStatus = "blocked" | "ready" | "review";
export type NativeProductionFulfillmentCoverageFileFormat = "csv" | "json";

export interface NativeProductionFulfillmentCoverageCheckInput {
  area: NativeProductionFulfillmentCoverageArea;
  blockedScenarioHash: string;
  readyScenarioHash: string;
  reportHash: string;
  status: NativeProductionFulfillmentCoverageStatus;
}

export interface NativeProductionFulfillmentCoverageRow {
  area: NativeProductionFulfillmentCoverageArea;
  blockedScenarioCovered: boolean;
  blockedScenarioHash: string;
  coverageHash: string;
  nextAction: string;
  readyScenarioCovered: boolean;
  readyScenarioHash: string;
  reportHash: string;
  reportHashAttached: boolean;
  status: NativeProductionFulfillmentCoverageStatus;
}

export interface NativeProductionFulfillmentCoverageFile {
  download: string;
  format: NativeProductionFulfillmentCoverageFileFormat;
  href: string;
  label: string;
}

export interface NativeProductionFulfillmentCoverageReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  files: NativeProductionFulfillmentCoverageFile[];
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  releaseCandidateId: string;
  rows: NativeProductionFulfillmentCoverageRow[];
  summary: {
    blockedCount: number;
    coverageHash: string;
    coverageScore: number;
    missingCoverageCount: number;
    nextAction: string;
    readyCount: number;
    reviewCount: number;
    rowCount: number;
    status: NativeProductionFulfillmentCoverageStatus;
  };
  workspaceId: string;
}

export interface CreateNativeProductionFulfillmentCoverageInput {
  checks: NativeProductionFulfillmentCoverageCheckInput[];
  generatedAt?: string;
  releaseCandidateId: string;
  requiredAreas?: NativeProductionFulfillmentCoverageArea[];
  workspaceId?: string;
}

const requiredAreas: NativeProductionFulfillmentCoverageArea[] = [
  "fulfillment-ledger-scoring",
  "artifact-storage-handoff-readiness",
  "cad-transcript-ingestion",
  "promotion-rehearsal-gating",
];

const areaRank: Record<NativeProductionFulfillmentCoverageArea, number> = {
  "fulfillment-ledger-scoring": 0,
  "artifact-storage-handoff-readiness": 1,
  "cad-transcript-ingestion": 2,
  "promotion-rehearsal-gating": 3,
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

function hasHash(value: string) {
  return value.trim().startsWith("sha256:");
}

function missingCheck(area: NativeProductionFulfillmentCoverageArea): NativeProductionFulfillmentCoverageCheckInput {
  return {
    area,
    blockedScenarioHash: "",
    readyScenarioHash: "",
    reportHash: "",
    status: "blocked",
  };
}

function statusFor(input: {
  blockedScenarioCovered: boolean;
  inputStatus: NativeProductionFulfillmentCoverageStatus;
  readyScenarioCovered: boolean;
  reportHashAttached: boolean;
}) {
  if (!input.blockedScenarioCovered || !input.readyScenarioCovered || !input.reportHashAttached || input.inputStatus === "blocked") {
    return "blocked";
  }

  if (input.inputStatus === "review") {
    return "review";
  }

  return "ready";
}

function nextActionFor(row: Pick<NativeProductionFulfillmentCoverageRow, "area" | "blockedScenarioCovered" | "readyScenarioCovered" | "reportHashAttached" | "status">) {
  if (row.status === "blocked") {
    return `Resolve blocked native production fulfillment coverage for ${row.area}.`;
  }

  if (!row.readyScenarioCovered) {
    return `Attach ready-path coverage for ${row.area}.`;
  }

  if (!row.blockedScenarioCovered) {
    return `Attach blocked-path coverage for ${row.area}.`;
  }

  if (!row.reportHashAttached) {
    return `Attach report hash evidence for ${row.area}.`;
  }

  if (row.status === "review") {
    return `Review native production fulfillment coverage for ${row.area}.`;
  }

  return `Keep native production fulfillment coverage current for ${row.area}.`;
}

function createRow(input: NativeProductionFulfillmentCoverageCheckInput): NativeProductionFulfillmentCoverageRow {
  const readyScenarioHash = input.readyScenarioHash.trim() || "missing";
  const blockedScenarioHash = input.blockedScenarioHash.trim() || "missing";
  const reportHash = input.reportHash.trim() || "missing";
  const readyScenarioCovered = hasHash(readyScenarioHash);
  const blockedScenarioCovered = hasHash(blockedScenarioHash);
  const reportHashAttached = hasHash(reportHash);
  const status = statusFor({
    blockedScenarioCovered,
    inputStatus: input.status,
    readyScenarioCovered,
    reportHashAttached,
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
    status,
  } satisfies Omit<NativeProductionFulfillmentCoverageRow, "coverageHash">;
  const row = {
    ...rowWithoutHash,
    nextAction: nextActionFor(rowWithoutHash),
  };

  return {
    ...row,
    coverageHash: sha256(row),
  };
}

function createRows(input: CreateNativeProductionFulfillmentCoverageInput) {
  const checkByArea = new Map(input.checks.map((check) => [check.area, check]));
  const requiredCoverageAreas = input.requiredAreas ?? requiredAreas;

  return requiredCoverageAreas
    .map((area) => createRow(checkByArea.get(area) ?? missingCheck(area)))
    .sort((first, second) => areaRank[first.area] - areaRank[second.area]);
}

function summarize(rows: NativeProductionFulfillmentCoverageRow[]): NativeProductionFulfillmentCoverageReport["summary"] {
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const missingCoverageCount = rows.filter((row) => !row.readyScenarioCovered || !row.blockedScenarioCovered || !row.reportHashAttached).length;
  const status: NativeProductionFulfillmentCoverageStatus = blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready";

  return {
    blockedCount,
    coverageHash: sha256(rows.map((row) => row.coverageHash)),
    coverageScore: Math.max(0, Math.min(100, Math.round((readyCount / Math.max(1, rows.length)) * 100 + reviewCount * 20 - blockedCount * 18 - missingCoverageCount * 12))),
    missingCoverageCount,
    nextAction:
      status === "blocked"
        ? "Resolve blocked native production fulfillment coverage before closing the fulfillment set."
        : status === "review"
          ? "Review native production fulfillment coverage before closing the fulfillment set."
          : "Native production fulfillment coverage is ready to close the current set.",
    readyCount,
    reviewCount,
    rowCount: rows.length,
    status,
  };
}

function createCsv(rows: NativeProductionFulfillmentCoverageRow[]) {
  const header = ["area", "status", "ready_scenario_covered", "blocked_scenario_covered", "report_hash_attached", "coverage_hash", "next_action"];
  const body = rows.map((row) =>
    [row.area, row.status, row.readyScenarioCovered, row.blockedScenarioCovered, row.reportHashAttached, row.coverageHash, row.nextAction].map(csvCell).join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function filesFor(input: {
  csvDataUri: string;
  csvFileName: string;
  jsonDataUri: string;
  jsonFileName: string;
}): NativeProductionFulfillmentCoverageFile[] {
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

export function createNativeProductionFulfillmentCoverage(input: CreateNativeProductionFulfillmentCoverageInput): NativeProductionFulfillmentCoverageReport {
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
  const fileBase = `${slug(workspaceId)}-native-production-fulfillment-coverage-${slug(input.releaseCandidateId)}-${dateStamp(generatedAt)}`;
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
