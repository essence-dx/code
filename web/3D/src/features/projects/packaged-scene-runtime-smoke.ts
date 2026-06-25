import { createHash } from "node:crypto";
import type { DeterministicRuntimeReplayExpectedState, DeterministicRuntimeReplayResult } from "@/features/editor/runtime/deterministic-runtime-replay";
import { validateDeterministicRuntimeReplay } from "@/features/editor/runtime/deterministic-runtime-replay";
import type { ViewportInteractionTrace } from "@/features/editor/runtime/viewport-interaction-trace";
import type { AppPackagePresetId } from "@/features/projects/app-package-export";
import type { ShareSettings } from "@/features/projects/share-settings";
import { getAbsoluteUrl, getAppPackagePath, getEmbedPath, getSharePath } from "@/features/projects/share-links";

export type PackagedSceneRuntimeSurface = "app-package" | "embed" | "public-viewer";
export type PackagedSceneRuntimeSmokeStatus = "blocked" | "ready";

export interface PackagedSceneRuntimeFrameTiming {
  averageFrameMs: number;
  frameBudgetMs: number;
  maxFrameMs: number;
  minFrameMs: number;
  overBudgetFrameCount: number;
  sampleCount: number;
}

export interface PackagedSceneRuntimeSmokeRow {
  frameTiming: PackagedSceneRuntimeFrameTiming;
  nextAction: string;
  replay: DeterministicRuntimeReplayResult;
  routePath: string;
  runtimeSmokeHash: string;
  sceneName: string;
  status: PackagedSceneRuntimeSmokeStatus;
  surface: PackagedSceneRuntimeSurface;
  targetUrl: string;
}

export interface PackagedSceneRuntimeSmokeReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  rows: PackagedSceneRuntimeSmokeRow[];
  summary: {
    blockedCount: number;
    nextAction: string;
    readyCount: number;
    runtimeSmokeHash: string;
    runtimeSmokeScore: number;
    status: PackagedSceneRuntimeSmokeStatus;
    surfaceCount: number;
  };
  workspaceId: string;
}

export interface CreatePackagedSceneRuntimeSmokeRowsInput {
  activeSceneId?: string | null;
  expected: DeterministicRuntimeReplayExpectedState;
  frameBudgetMs?: number;
  frameSamples: Record<PackagedSceneRuntimeSurface, number[]>;
  origin: string;
  presetId: AppPackagePresetId;
  sceneName: string;
  shareId: string;
  shareSettings: ShareSettings;
  trace: ViewportInteractionTrace;
}

export interface CreatePackagedSceneRuntimeSmokeReportInput {
  generatedAt?: string;
  rows: PackagedSceneRuntimeSmokeRow[];
  workspaceId?: string;
}

const surfaces = ["public-viewer", "embed", "app-package"] as const satisfies readonly PackagedSceneRuntimeSurface[];

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

function roundFrame(value: number) {
  return Math.round(value * 100) / 100;
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

function routePathFor(surface: PackagedSceneRuntimeSurface, input: CreatePackagedSceneRuntimeSmokeRowsInput) {
  if (surface === "public-viewer") {
    return getSharePath(input.shareId, input.activeSceneId);
  }

  if (surface === "embed") {
    return getEmbedPath(input.shareId, input.activeSceneId);
  }

  return getAppPackagePath(input.shareId, input.presetId, input.activeSceneId);
}

function frameTiming(samples: number[], frameBudgetMs: number): PackagedSceneRuntimeFrameTiming {
  const normalizedSamples = samples.filter((sample) => Number.isFinite(sample) && sample >= 0);
  const sampleCount = normalizedSamples.length;
  const totalFrameMs = normalizedSamples.reduce((total, sample) => total + sample, 0);

  return {
    averageFrameMs: roundFrame(sampleCount ? totalFrameMs / sampleCount : 0),
    frameBudgetMs: roundFrame(frameBudgetMs),
    maxFrameMs: roundFrame(sampleCount ? Math.max(...normalizedSamples) : 0),
    minFrameMs: roundFrame(sampleCount ? Math.min(...normalizedSamples) : 0),
    overBudgetFrameCount: normalizedSamples.filter((sample) => sample > frameBudgetMs).length,
    sampleCount,
  };
}

function nextActionFor(input: {
  frameTiming: PackagedSceneRuntimeFrameTiming;
  replay: DeterministicRuntimeReplayResult;
  surface: PackagedSceneRuntimeSurface;
}) {
  if (input.replay.summary.status === "blocked") {
    return `Fix ${input.surface} interaction replay mismatches before accepting packaged-scene runtime playback.`;
  }

  if (!input.frameTiming.sampleCount) {
    return `Capture ${input.surface} frame timing samples before accepting packaged-scene runtime playback.`;
  }

  if (input.frameTiming.overBudgetFrameCount > 0) {
    return `Reduce ${input.surface} over-budget runtime frames before accepting packaged-scene playback.`;
  }

  return `${input.surface} route playback is ready with frame timing and interaction-result evidence.`;
}

function statusFor(input: {
  frameTiming: PackagedSceneRuntimeFrameTiming;
  replay: DeterministicRuntimeReplayResult;
}): PackagedSceneRuntimeSmokeStatus {
  if (input.replay.summary.status === "blocked" || !input.frameTiming.sampleCount || input.frameTiming.overBudgetFrameCount > 0) {
    return "blocked";
  }

  return "ready";
}

export function createPackagedSceneRuntimeSmokeRows(input: CreatePackagedSceneRuntimeSmokeRowsInput): PackagedSceneRuntimeSmokeRow[] {
  const frameBudgetMs = Math.max(1, input.frameBudgetMs ?? 16.7);

  return surfaces.map((surface) => {
    const routePath = routePathFor(surface, input);
    const targetUrl = getAbsoluteUrl(input.origin.replace(/\/$/, ""), routePath);
    const timing = frameTiming(input.frameSamples[surface] ?? [], frameBudgetMs);
    const replay = validateDeterministicRuntimeReplay({
      expected: input.expected,
      id: `packaged-runtime:${surface}:${input.shareId}:${input.activeSceneId ?? "default"}`,
      trace: input.trace,
    });
    const status = statusFor({ frameTiming: timing, replay });
    const nextAction = nextActionFor({ frameTiming: timing, replay, surface });
    const base = {
      frameTiming: timing,
      nextAction,
      replay,
      routePath,
      sceneName: input.sceneName,
      status,
      surface,
      targetUrl,
    };

    return {
      ...base,
      runtimeSmokeHash: sha256(base),
    };
  });
}

function summarize(rows: PackagedSceneRuntimeSmokeRow[]): PackagedSceneRuntimeSmokeReport["summary"] {
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const status: PackagedSceneRuntimeSmokeStatus = blockedCount > 0 ? "blocked" : "ready";

  return {
    blockedCount,
    nextAction:
      status === "ready"
        ? "Packaged-scene runtime playback evidence is ready across public viewer, embed, and app package routes."
        : "Fix blocked packaged-scene runtime playback rows before increasing editor runtime fidelity.",
    readyCount,
    runtimeSmokeHash: sha256(rows.map((row) => row.runtimeSmokeHash)),
    runtimeSmokeScore: Math.max(0, Math.min(100, Math.round((readyCount / Math.max(1, rows.length)) * 100))),
    status,
    surfaceCount: rows.length,
  };
}

function createCsv(rows: PackagedSceneRuntimeSmokeRow[]) {
  const header = ["surface", "route", "status", "average_frame_ms", "over_budget_frames", "replay_status", "runtime_smoke_hash", "next_action"];
  const body = rows.map((row) =>
    [
      row.surface,
      row.routePath,
      row.status,
      row.frameTiming.averageFrameMs,
      row.frameTiming.overBudgetFrameCount,
      row.replay.summary.status,
      row.runtimeSmokeHash,
      row.nextAction,
    ]
      .map(csvCell)
      .join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

export function createPackagedSceneRuntimeSmokeReport(input: CreatePackagedSceneRuntimeSmokeReportInput): PackagedSceneRuntimeSmokeReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? "workspace";
  const rows = [...input.rows].sort((first, second) => surfaces.indexOf(first.surface) - surfaces.indexOf(second.surface));
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
  const fileBase = `${slug(workspaceId)}-packaged-scene-runtime-smoke-${dateStamp(generatedAt)}`;

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
