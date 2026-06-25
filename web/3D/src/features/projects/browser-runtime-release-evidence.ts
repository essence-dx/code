import { createHash } from "node:crypto";

export type BrowserRuntimeReleaseSurface = "app-package" | "editor" | "embed" | "public-viewer";
export type BrowserRuntimeReleaseEvidenceStatus = "blocked" | "ready";
export type BrowserRuntimeConsoleLevel = "debug" | "error" | "info" | "log" | "warn" | "warning";

export interface BrowserRuntimeConsoleEntry {
  level: BrowserRuntimeConsoleLevel;
  message: string;
  timestamp: string;
  url?: string;
}

export interface BrowserRuntimeScreenshotEvidence {
  byteSize: number;
  height: number;
  path: string;
  screenshotHash: string;
  width: number;
}

export interface BrowserRuntimeCaptureEvidence {
  capturedAt: string;
  consoleEntries: BrowserRuntimeConsoleEntry[];
  routePath: string;
  sceneVersionHash: string;
  screenshot: BrowserRuntimeScreenshotEvidence | null;
  surface: BrowserRuntimeReleaseSurface;
  targetUrl: string;
}

export interface BrowserRuntimeReleaseEvidenceRow {
  capturedAt: string;
  consoleErrorCount: number;
  consoleWarningCount: number;
  evidenceHash: string;
  nextAction: string;
  routePath: string;
  sceneVersionHash: string;
  sceneVersionMatches: boolean;
  screenshotHash: string | null;
  screenshotHeight: number | null;
  screenshotPath: string | null;
  screenshotWidth: number | null;
  status: BrowserRuntimeReleaseEvidenceStatus;
  surface: BrowserRuntimeReleaseSurface;
  targetUrl: string;
}

export interface BrowserRuntimeReleaseEvidenceReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  rows: BrowserRuntimeReleaseEvidenceRow[];
  summary: {
    blockedCount: number;
    captureCount: number;
    consoleErrorCount: number;
    missingScreenshotCount: number;
    nextAction: string;
    readyCount: number;
    releaseEvidenceHash: string;
    releaseEvidenceScore: number;
    sceneVersionDriftCount: number;
    sceneVersionHash: string | null;
    status: BrowserRuntimeReleaseEvidenceStatus;
  };
  workspaceId: string;
}

export interface CreateBrowserRuntimeReleaseEvidenceRowsInput {
  captures: BrowserRuntimeCaptureEvidence[];
  expectedSceneVersionHash: string;
}

export interface CreateBrowserRuntimeReleaseEvidenceReportInput {
  generatedAt?: string;
  rows: BrowserRuntimeReleaseEvidenceRow[];
  workspaceId?: string;
}

const surfaceOrder = ["editor", "public-viewer", "embed", "app-package"] as const satisfies readonly BrowserRuntimeReleaseSurface[];

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

function csvCell(value: string | number | boolean | null) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function encodeCsvDataUri(csvContent: string) {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`;
}

function encodeJsonDataUri(jsonContent: string) {
  return `data:application/json;charset=utf-8,${encodeURIComponent(jsonContent)}`;
}

function isConsoleError(entry: BrowserRuntimeConsoleEntry) {
  return entry.level === "error";
}

function isConsoleWarning(entry: BrowserRuntimeConsoleEntry) {
  return entry.level === "warn" || entry.level === "warning";
}

function nextActionFor(input: {
  consoleErrorCount: number;
  sceneVersionMatches: boolean;
  screenshotHash: string | null;
  surface: BrowserRuntimeReleaseSurface;
}) {
  if (!input.screenshotHash) {
    return `Capture ${input.surface} screenshot evidence before accepting runtime release proof.`;
  }

  if (!input.sceneVersionMatches) {
    return `Fix ${input.surface} scene/version hash drift before accepting runtime release proof.`;
  }

  if (input.consoleErrorCount > 0) {
    return `Resolve ${input.surface} console errors before accepting runtime release proof.`;
  }

  return `${input.surface} browser runtime evidence is linked to the expected scene/version hash.`;
}

function createRow(capture: BrowserRuntimeCaptureEvidence, expectedSceneVersionHash: string): BrowserRuntimeReleaseEvidenceRow {
  const consoleErrorCount = capture.consoleEntries.filter(isConsoleError).length;
  const consoleWarningCount = capture.consoleEntries.filter(isConsoleWarning).length;
  const sceneVersionMatches = capture.sceneVersionHash === expectedSceneVersionHash;
  const screenshotHash = capture.screenshot?.screenshotHash ?? null;
  const status: BrowserRuntimeReleaseEvidenceStatus = screenshotHash && sceneVersionMatches && consoleErrorCount === 0 ? "ready" : "blocked";
  const base = {
    capturedAt: capture.capturedAt,
    consoleErrorCount,
    consoleWarningCount,
    nextAction: nextActionFor({
      consoleErrorCount,
      sceneVersionMatches,
      screenshotHash,
      surface: capture.surface,
    }),
    routePath: capture.routePath,
    sceneVersionHash: capture.sceneVersionHash,
    sceneVersionMatches,
    screenshotHash,
    screenshotHeight: capture.screenshot?.height ?? null,
    screenshotPath: capture.screenshot?.path ?? null,
    screenshotWidth: capture.screenshot?.width ?? null,
    status,
    surface: capture.surface,
    targetUrl: capture.targetUrl,
  };

  return {
    ...base,
    evidenceHash: sha256(base),
  };
}

export function createBrowserRuntimeReleaseEvidenceRows(input: CreateBrowserRuntimeReleaseEvidenceRowsInput): BrowserRuntimeReleaseEvidenceRow[] {
  return [...input.captures]
    .map((capture) => createRow(capture, input.expectedSceneVersionHash))
    .sort((first, second) => surfaceOrder.indexOf(first.surface) - surfaceOrder.indexOf(second.surface));
}

function summarize(rows: BrowserRuntimeReleaseEvidenceRow[]): BrowserRuntimeReleaseEvidenceReport["summary"] {
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const status: BrowserRuntimeReleaseEvidenceStatus = blockedCount > 0 ? "blocked" : "ready";
  const sceneVersionHashes = [...new Set(rows.map((row) => row.sceneVersionHash))];
  const sceneVersionHash = sceneVersionHashes.length === 1 ? (sceneVersionHashes[0] ?? null) : null;
  const consoleErrorCount = rows.reduce((total, row) => total + row.consoleErrorCount, 0);
  const missingScreenshotCount = rows.filter((row) => !row.screenshotHash).length;
  const sceneVersionDriftCount = rows.filter((row) => !row.sceneVersionMatches).length;

  return {
    blockedCount,
    captureCount: rows.length,
    consoleErrorCount,
    missingScreenshotCount,
    nextAction:
      status === "ready"
        ? "Browser runtime release evidence is ready across editor, public viewer, embed, and app package routes."
        : "Resolve browser runtime release evidence blockers before increasing runtime release evidence.",
    readyCount,
    releaseEvidenceHash: sha256(rows.map((row) => row.evidenceHash)),
    releaseEvidenceScore: Math.max(0, Math.min(100, Math.round((readyCount / Math.max(1, rows.length)) * 100))),
    sceneVersionDriftCount,
    sceneVersionHash,
    status,
  };
}

function createCsv(rows: BrowserRuntimeReleaseEvidenceRow[]) {
  const header = ["surface", "status", "scene_version_hash", "scene_version_matches", "screenshot_hash", "console_errors", "evidence_hash", "next_action"];
  const body = rows.map((row) =>
    [
      row.surface,
      row.status,
      row.sceneVersionHash,
      row.sceneVersionMatches,
      row.screenshotHash,
      row.consoleErrorCount,
      row.evidenceHash,
      row.nextAction,
    ]
      .map(csvCell)
      .join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

export function createBrowserRuntimeReleaseEvidenceReport(input: CreateBrowserRuntimeReleaseEvidenceReportInput): BrowserRuntimeReleaseEvidenceReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? "workspace";
  const rows = [...input.rows].sort((first, second) => surfaceOrder.indexOf(first.surface) - surfaceOrder.indexOf(second.surface));
  const summary = summarize(rows);
  const csvContent = createCsv(rows);
  const jsonContent = JSON.stringify(
    {
      generatedAt,
      rows,
      summary,
      workspaceId,
    },
    null,
    2,
  );
  const fileBase = `${slug(workspaceId)}-browser-runtime-release-evidence-${dateStamp(generatedAt)}`;

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
