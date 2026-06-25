import { createHash } from "node:crypto";
import type { CadConversionWorkerAdapterId } from "@/features/projects/cad-conversion-worker";
import type { NativeCadKernelFormat } from "@/features/projects/native-cad-kernel-capability-matrix";

export type CadConversionFixtureCorpusStatus = "blocked" | "ready" | "review";
export type CadConversionFixtureCorpusFormat = Extract<NativeCadKernelFormat, "IGES" | "SAT" | "STEP">;

export interface CadConversionFixtureCorpusInput {
  adapterId: CadConversionWorkerAdapterId;
  actualBoundsMm: [number, number, number];
  actualTriangleCount: number;
  expectedBoundsMm: [number, number, number];
  expectedTriangleCount: number;
  fixtureName: string;
  format: CadConversionFixtureCorpusFormat;
  sourceSha256: string | null;
}

export interface CadConversionFixtureCorpusRow {
  adapterId: CadConversionWorkerAdapterId;
  actualBoundsMm: string;
  actualTriangleCount: number;
  boundsDeltaMm: number;
  expectedBoundsMm: string;
  expectedTriangleCount: number;
  fixtureHash: string;
  fixtureId: string;
  fixtureName: string;
  format: CadConversionFixtureCorpusFormat;
  nextAction: string;
  sourceSha256: string;
  status: CadConversionFixtureCorpusStatus;
  triangleDelta: number;
}

export interface CadConversionFixtureCorpusReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  rows: CadConversionFixtureCorpusRow[];
  summary: {
    blockedCount: number;
    corpusHash: string;
    corpusScore: number;
    nextAction: string;
    readyCount: number;
    reviewCount: number;
    rowCount: number;
    status: CadConversionFixtureCorpusStatus;
  };
  workspaceId: string;
}

export interface CreateCadConversionFixtureCorpusReportInput {
  fixtures?: CadConversionFixtureCorpusInput[];
  generatedAt?: string;
  workspaceId?: string;
}

const formatRank: Record<CadConversionFixtureCorpusFormat, number> = {
  STEP: 0,
  IGES: 1,
  SAT: 2,
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

function csvCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function encodeCsvDataUri(csvContent: string) {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`;
}

function encodeJsonDataUri(jsonContent: string) {
  return `data:application/json;charset=utf-8,${encodeURIComponent(jsonContent)}`;
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

function formatBounds(bounds: [number, number, number]) {
  return bounds.map((value) => Number(value.toFixed(3))).join(" x ");
}

function boundsDelta(input: Pick<CadConversionFixtureCorpusInput, "actualBoundsMm" | "expectedBoundsMm">) {
  return Number(
    input.actualBoundsMm
      .reduce((total, value, index) => total + Math.abs(value - input.expectedBoundsMm[index]), 0)
      .toFixed(3),
  );
}

function triangleDelta(input: Pick<CadConversionFixtureCorpusInput, "actualTriangleCount" | "expectedTriangleCount">) {
  return input.actualTriangleCount - input.expectedTriangleCount;
}

function statusForFixture(input: CadConversionFixtureCorpusInput) {
  const triangleDriftRatio = Math.abs(triangleDelta(input)) / Math.max(1, input.expectedTriangleCount);
  const boundsDrift = boundsDelta(input);

  if (!input.sourceSha256 || triangleDriftRatio > 0.25 || boundsDrift > 5) {
    return "blocked" satisfies CadConversionFixtureCorpusStatus;
  }

  if (triangleDriftRatio > 0.05 || boundsDrift > 0.5) {
    return "review" satisfies CadConversionFixtureCorpusStatus;
  }

  return "ready" satisfies CadConversionFixtureCorpusStatus;
}

function nextActionFor(input: { format: CadConversionFixtureCorpusFormat; status: CadConversionFixtureCorpusStatus }) {
  if (input.status === "blocked") {
    return `Fix blocked CAD conversion fixture regressions for ${input.format}.`;
  }

  if (input.status === "review") {
    return `Review CAD conversion fixture drift for ${input.format}.`;
  }

  return `Keep deterministic CAD conversion fixture evidence current for ${input.format}.`;
}

function createMissingRow(workspaceId: string): CadConversionFixtureCorpusRow {
  return createRow(
    {
      adapterId: "freecad",
      actualBoundsMm: [0, 0, 0],
      actualTriangleCount: 0,
      expectedBoundsMm: [1, 1, 1],
      expectedTriangleCount: 1,
      fixtureName: "missing-step-fixture.step",
      format: "STEP",
      sourceSha256: null,
    },
    workspaceId,
  );
}

function createRow(input: CadConversionFixtureCorpusInput, workspaceId: string): CadConversionFixtureCorpusRow {
  const status = statusForFixture(input);
  const nextAction = nextActionFor({
    format: input.format,
    status,
  });
  const row = {
    adapterId: input.adapterId,
    actualBoundsMm: formatBounds(input.actualBoundsMm),
    actualTriangleCount: input.actualTriangleCount,
    boundsDeltaMm: boundsDelta(input),
    expectedBoundsMm: formatBounds(input.expectedBoundsMm),
    expectedTriangleCount: input.expectedTriangleCount,
    fixtureId: `cad-conversion-fixture-corpus:${slug(workspaceId)}:${input.format.toLowerCase()}:${slug(input.fixtureName)}`,
    fixtureName: input.fixtureName,
    format: input.format,
    nextAction,
    sourceSha256: input.sourceSha256 ?? "missing",
    status,
    triangleDelta: triangleDelta(input),
  } satisfies Omit<CadConversionFixtureCorpusRow, "fixtureHash">;

  return {
    ...row,
    fixtureHash: sha256({
      ...row,
      workspaceId,
    }),
  };
}

function summarize(rows: CadConversionFixtureCorpusRow[]): CadConversionFixtureCorpusReport["summary"] {
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const status: CadConversionFixtureCorpusStatus = blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready";
  const corpusScore = Math.max(0, Math.round((readyCount / Math.max(1, rows.length)) * 100 + reviewCount * 35 - blockedCount * 20));

  return {
    blockedCount,
    corpusHash: sha256(rows.map((row) => row.fixtureHash)),
    corpusScore,
    nextAction:
      status === "blocked"
        ? "Fix blocked CAD conversion fixture regressions before accepting native CAD runtime parity."
        : status === "review"
          ? "Review CAD conversion fixture drift before release promotion."
          : "CAD conversion fixture corpus is ready.",
    readyCount,
    reviewCount,
    rowCount: rows.length,
    status,
  };
}

function createCsv(rows: CadConversionFixtureCorpusRow[]) {
  const header = ["fixture_id", "format", "adapter_id", "status", "triangle_delta", "bounds_delta_mm", "source_sha256", "fixture_hash", "next_action"];
  const body = rows.map((row) =>
    [row.fixtureId, row.format, row.adapterId, row.status, row.triangleDelta, row.boundsDeltaMm, row.sourceSha256, row.fixtureHash, row.nextAction].map(csvCell).join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function createJson(input: {
  generatedAt: string;
  rows: CadConversionFixtureCorpusRow[];
  summary: CadConversionFixtureCorpusReport["summary"];
  workspaceId: string;
}) {
  return JSON.stringify(input, null, 2);
}

export function createCadConversionFixtureCorpusReport(input: CreateCadConversionFixtureCorpusReportInput = {}): CadConversionFixtureCorpusReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? "workspace";
  const fixtures = input.fixtures ?? [];
  const rows = (fixtures.length > 0 ? fixtures.map((fixture) => createRow(fixture, workspaceId)) : [createMissingRow(workspaceId)]).sort(
    (first, second) => formatRank[first.format] - formatRank[second.format] || first.fixtureName.localeCompare(second.fixtureName),
  );
  const summary = summarize(rows);
  const csvContent = createCsv(rows);
  const jsonContent = createJson({
    generatedAt,
    rows,
    summary,
    workspaceId,
  });
  const fileBase = `${slug(workspaceId)}-cad-conversion-fixture-corpus-${dateStamp(generatedAt)}`;

  return {
    csvContent,
    csvDataUri: encodeCsvDataUri(csvContent),
    csvFileName: `${fileBase}.csv`,
    generatedAt,
    jsonContent,
    jsonDataUri: encodeJsonDataUri(jsonContent),
    jsonFileName: `${fileBase}.json`,
    rows,
    summary,
    workspaceId,
  };
}
