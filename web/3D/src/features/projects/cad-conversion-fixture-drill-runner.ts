import { createHash } from "node:crypto";
import type { CadConversionWorkerAdapterId } from "@/features/projects/cad-conversion-worker";
import type { CadConversionFixtureCorpusFormat } from "@/features/projects/cad-conversion-fixture-corpus";

export type CadConversionFixtureDrillStatus = "blocked" | "ready" | "review";
export type CadConversionFixtureDrillFileFormat = "csv" | "json";

export interface CadConversionFixtureDrillCorpusItem {
  fixtureName: string;
  format: CadConversionFixtureCorpusFormat;
  sourceSha256: string;
}

export interface CadConversionFixtureDrillInput {
  adapterId: CadConversionWorkerAdapterId;
  commandPlan: string[];
  expectedOutputHash: string;
  failureTranscript: string;
  fixtureCorpus: CadConversionFixtureDrillCorpusItem[];
  outputHash: string;
  owner: string;
}

export interface CadConversionFixtureDrillRow {
  adapterId: CadConversionWorkerAdapterId;
  commandPlan: string[];
  commandPlanReady: boolean;
  coveredFormats: string;
  drillHash: string;
  expectedOutputHash: string;
  failureTranscript: string;
  failureTranscriptHash: string;
  failureTranscriptReady: boolean;
  fixtureCorpus: CadConversionFixtureDrillCorpusItem[];
  fixtureCoverageReady: boolean;
  nextAction: string;
  outputHash: string;
  outputHashMatched: boolean;
  outputHashReady: boolean;
  owner: string;
  ownerReady: boolean;
  status: CadConversionFixtureDrillStatus;
}

export interface CadConversionFixtureDrillFile {
  download: string;
  format: CadConversionFixtureDrillFileFormat;
  href: string;
  label: string;
}

export interface CadConversionFixtureDrillRunnerReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  files: CadConversionFixtureDrillFile[];
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  releaseCandidateId: string;
  rows: CadConversionFixtureDrillRow[];
  summary: {
    blockedCount: number;
    commandPlanReadyCount: number;
    drillHash: string;
    drillScore: number;
    failureTranscriptReadyCount: number;
    fixtureCoverageReadyCount: number;
    nextAction: string;
    outputHashReadyCount: number;
    readyCount: number;
    reviewCount: number;
    rowCount: number;
    status: CadConversionFixtureDrillStatus;
  };
  workspaceId: string;
}

export interface CreateCadConversionFixtureDrillRunnerInput {
  drills: CadConversionFixtureDrillInput[];
  generatedAt?: string;
  releaseCandidateId: string;
  requiredAdapters?: CadConversionWorkerAdapterId[];
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

function missingDrill(adapterId: CadConversionWorkerAdapterId): CadConversionFixtureDrillInput {
  return {
    adapterId,
    commandPlan: [],
    expectedOutputHash: "",
    failureTranscript: "",
    fixtureCorpus: [],
    outputHash: "",
    owner: "",
  };
}

function normalizeCorpus(corpus: CadConversionFixtureDrillCorpusItem[]) {
  return corpus
    .map((fixture) => ({
      fixtureName: fixture.fixtureName.trim(),
      format: fixture.format,
      sourceSha256: fixture.sourceSha256.trim(),
    }))
    .filter((fixture) => fixture.fixtureName.length > 0 || fixture.sourceSha256.length > 0)
    .sort((first, second) => first.format.localeCompare(second.format) || first.fixtureName.localeCompare(second.fixtureName));
}

function coveredFormats(corpus: CadConversionFixtureDrillCorpusItem[]) {
  return [...new Set(corpus.map((fixture) => fixture.format))].join(", ") || "missing";
}

function statusFor(input: {
  commandPlanReady: boolean;
  failureTranscriptReady: boolean;
  fixtureCoverageReady: boolean;
  outputHashMatched: boolean;
  outputHashReady: boolean;
  ownerReady: boolean;
}): CadConversionFixtureDrillStatus {
  if (!input.commandPlanReady || !input.fixtureCoverageReady || !input.outputHashReady || !input.ownerReady) {
    return "blocked";
  }

  if (!input.outputHashMatched || !input.failureTranscriptReady) {
    return "review";
  }

  return "ready";
}

function nextActionFor(
  row: Pick<
    CadConversionFixtureDrillRow,
    "adapterId" | "commandPlanReady" | "failureTranscriptReady" | "fixtureCoverageReady" | "outputHashMatched" | "outputHashReady" | "ownerReady" | "status"
  >,
) {
  if (row.status === "blocked") {
    return `Resolve blocked CAD conversion fixture drills for ${row.adapterId}.`;
  }

  if (!row.fixtureCoverageReady) {
    return `Attach CAD fixture corpus coverage for ${row.adapterId}.`;
  }

  if (!row.commandPlanReady) {
    return `Record FreeCAD/OCCT command plans for ${row.adapterId}.`;
  }

  if (!row.outputHashReady) {
    return `Attach CAD conversion fixture output hash for ${row.adapterId}.`;
  }

  if (!row.outputHashMatched) {
    return `Review CAD conversion fixture output hash drift for ${row.adapterId}.`;
  }

  if (!row.failureTranscriptReady) {
    return `Attach CAD conversion fixture failure transcript for ${row.adapterId}.`;
  }

  if (!row.ownerReady) {
    return `Assign a CAD conversion fixture drill owner for ${row.adapterId}.`;
  }

  return `CAD conversion fixture drill is ready for ${row.adapterId}.`;
}

function createRow(input: CadConversionFixtureDrillInput): CadConversionFixtureDrillRow {
  const commandPlan = input.commandPlan.map((step) => step.trim()).filter(Boolean);
  const fixtureCorpus = normalizeCorpus(input.fixtureCorpus);
  const expectedOutputHash = input.expectedOutputHash.trim();
  const outputHash = input.outputHash.trim();
  const failureTranscript = input.failureTranscript.trim();
  const owner = input.owner.trim();
  const commandPlanReady = commandPlan.length > 0;
  const fixtureCoverageReady = fixtureCorpus.length > 0 && fixtureCorpus.every((fixture) => fixture.fixtureName.length > 0 && hasSha256(fixture.sourceSha256));
  const outputHashReady = hasSha256(outputHash) && hasSha256(expectedOutputHash);
  const outputHashMatched = outputHashReady && outputHash === expectedOutputHash;
  const failureTranscriptReady = failureTranscript.length > 0 || outputHashMatched;
  const ownerReady = owner.length > 0;
  const status = statusFor({
    commandPlanReady,
    failureTranscriptReady,
    fixtureCoverageReady,
    outputHashMatched,
    outputHashReady,
    ownerReady,
  });
  const rowWithoutAction = {
    adapterId: input.adapterId,
    commandPlan,
    commandPlanReady,
    coveredFormats: coveredFormats(fixtureCorpus),
    expectedOutputHash,
    failureTranscript,
    failureTranscriptHash: failureTranscriptReady ? sha256(failureTranscript || "no-failure-transcript-required") : "",
    failureTranscriptReady,
    fixtureCorpus,
    fixtureCoverageReady,
    nextAction: "",
    outputHash,
    outputHashMatched,
    outputHashReady,
    owner,
    ownerReady,
    status,
  } satisfies Omit<CadConversionFixtureDrillRow, "drillHash">;
  const row = {
    ...rowWithoutAction,
    nextAction: nextActionFor(rowWithoutAction),
  };

  return {
    ...row,
    drillHash: sha256({
      adapterId: row.adapterId,
      commandPlan: row.commandPlan,
      expectedOutputHash: row.expectedOutputHash,
      failureTranscriptHash: row.failureTranscriptHash,
      fixtureCorpus: row.fixtureCorpus,
      outputHash: row.outputHash,
      status: row.status,
    }),
  };
}

function createRows(input: CreateCadConversionFixtureDrillRunnerInput) {
  const drillByAdapter = new Map(input.drills.map((drill) => [drill.adapterId, drill]));
  const requiredAdapters = input.requiredAdapters ?? defaultRequiredAdapters;

  return requiredAdapters
    .map((adapterId) => createRow(drillByAdapter.get(adapterId) ?? missingDrill(adapterId)))
    .sort((first, second) => adapterRank[first.adapterId] - adapterRank[second.adapterId]);
}

function summarize(rows: CadConversionFixtureDrillRow[]): CadConversionFixtureDrillRunnerReport["summary"] {
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const commandPlanReadyCount = rows.filter((row) => row.commandPlanReady).length;
  const fixtureCoverageReadyCount = rows.filter((row) => row.fixtureCoverageReady).length;
  const outputHashReadyCount = rows.filter((row) => row.outputHashReady).length;
  const failureTranscriptReadyCount = rows.filter((row) => row.failureTranscriptReady).length;
  const status: CadConversionFixtureDrillStatus = blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready";
  const drillScore =
    rows.length === 0
      ? 0
      : Math.max(
          0,
          Math.min(
            100,
            Math.round(
              ((commandPlanReadyCount + fixtureCoverageReadyCount + outputHashReadyCount + failureTranscriptReadyCount + readyCount) / (rows.length * 5)) * 100 -
                blockedCount * 12,
            ),
          ),
        );

  return {
    blockedCount,
    commandPlanReadyCount,
    drillHash: sha256(rows.map((row) => row.drillHash)),
    drillScore,
    failureTranscriptReadyCount,
    fixtureCoverageReadyCount,
    nextAction:
      status === "blocked"
        ? "Resolve blocked CAD conversion fixture drills before release evidence drill comparison."
        : status === "review"
          ? "Review CAD conversion fixture drills before release evidence drill comparison."
          : "CAD conversion fixture drills are ready for release evidence drill comparison.",
    outputHashReadyCount,
    readyCount,
    reviewCount,
    rowCount: rows.length,
    status,
  };
}

function createCsv(rows: CadConversionFixtureDrillRow[]) {
  const header = [
    "adapter_id",
    "status",
    "covered_formats",
    "command_plan_ready",
    "fixture_coverage_ready",
    "output_hash_ready",
    "failure_transcript_ready",
    "drill_hash",
    "next_action",
  ];
  const body = rows.map((row) =>
    [
      row.adapterId,
      row.status,
      row.coveredFormats,
      row.commandPlanReady,
      row.fixtureCoverageReady,
      row.outputHashReady,
      row.failureTranscriptReady,
      row.drillHash,
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
}): CadConversionFixtureDrillFile[] {
  return [
    {
      download: input.csvFileName,
      format: "csv",
      href: input.csvDataUri,
      label: "CSV drill",
    },
    {
      download: input.jsonFileName,
      format: "json",
      href: input.jsonDataUri,
      label: "JSON drill",
    },
  ];
}

export function createCadConversionFixtureDrillRunner(input: CreateCadConversionFixtureDrillRunnerInput): CadConversionFixtureDrillRunnerReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? "workspace";
  const rows = createRows(input);
  const summary = summarize(rows);
  const csvContent = createCsv(rows);
  const jsonContent = `${JSON.stringify(
    {
      generatedAt,
      releaseCandidateId: input.releaseCandidateId,
      rows,
      summary,
      workspaceId,
    },
    null,
    2,
  )}\n`;
  const fileBase = `${slug(workspaceId)}-cad-conversion-fixture-drill-runner-${slug(input.releaseCandidateId)}-${dateStamp(generatedAt)}`;
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
