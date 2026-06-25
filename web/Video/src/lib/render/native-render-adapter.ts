"use client";

import type { EditorProject, ExportFormat, ExportJob, MediaAsset, RenderedExportFile } from "@/lib/editor/types";
import { isAudioExportFormat, isStillImageExportFormat } from "@/lib/render/export-formats";
import type { RenderPlan } from "@/lib/render/export-planner";
import { createNativeRenderGraph, type NativeRenderGraph } from "@/lib/render/native-render-graph";
import type { RenderHandoffReport } from "@/lib/render/render-handoff";
import { isDesktopRuntime } from "@/lib/runtime/client-api";

export type NativeRenderJobStatus = "rendering" | "complete" | "failed" | "cancelled";

export interface NativeRenderRequest {
  jobId: string;
  projectTitle: string;
  format: ExportFormat;
  preset: string;
  duration: number;
  width: number;
  height: number;
  fps: number;
  layerCount: number;
  outputName: string;
  estimatedOutputBytes: number;
  renderGraph: NativeRenderGraph;
}

export interface NativeRenderStatus {
  jobId: string;
  status: NativeRenderJobStatus;
  progress: number;
  detail: string;
  output: NativeRenderOutput | null;
  error: string | null;
  updatedAt: number;
}

export interface NativeRenderOutput {
  filename: string;
  format: ExportFormat;
  mimeType: string;
  size: number;
  path: string;
  savedAt: number;
  artifactKind: "render-manifest" | "media-file";
  requestedFormat: ExportFormat;
  manifestPath?: string;
}

export interface NativeRenderRunOptions {
  signal?: AbortSignal;
  onProgress?: (status: NativeRenderStatus) => void;
}

const terminalStatuses = new Set<NativeRenderJobStatus>(["complete", "failed", "cancelled"]);

export function canUseNativeRenderAdapter(report: RenderHandoffReport) {
  return isDesktopRuntime() && report.target === "desktop" && report.status === "desktop-ready";
}

export function createNativeRenderRequest({
  job,
  project,
  plan,
  assets,
}: {
  job: ExportJob;
  project: EditorProject;
  plan: RenderPlan;
  assets: MediaAsset[];
}): NativeRenderRequest {
  const width = plan.conversionOptions?.width || plan.presetOptions?.width || project.width;
  const height = plan.conversionOptions?.height || plan.presetOptions?.height || project.height;
  const fps = plan.conversionOptions?.fps || plan.presetOptions?.fps || project.fps || 30;
  const renderGraph = createNativeRenderGraph(project, assets, plan);

  return {
    jobId: job.id,
    projectTitle: project.title,
    format: job.format,
    preset: job.preset,
    duration: Math.max(0.1, plan.duration || project.duration || 0.1),
    width,
    height,
    fps,
    layerCount: project.layers.filter((layer) => !layer.hidden).length,
    outputName: job.outputName,
    estimatedOutputBytes: estimateNativeOutputBytes({ width, height, fps, duration: plan.duration || project.duration, format: job.format }),
    renderGraph,
  };
}

export async function renderWithNativeDesktopAdapter(
  request: NativeRenderRequest,
  options: NativeRenderRunOptions = {},
): Promise<RenderedExportFile> {
  assertNativeRenderRuntime();
  let status = await startNativeRender(request);
  options.onProgress?.(status);

  while (!terminalStatuses.has(status.status)) {
    await wait(250);
    if (options.signal?.aborted) {
      status = await cancelNativeRender(request.jobId);
      options.onProgress?.(status);
      throw new NativeRenderCancelledError();
    }
    status = await getNativeRenderStatus(request.jobId);
    options.onProgress?.(status);
  }

  if (status.status === "cancelled") {
    throw new NativeRenderCancelledError();
  }

  if (status.status === "failed" || !status.output) {
    throw new Error(status.error ?? "Native render job failed.");
  }

  return {
    filename: status.output.filename,
    format: status.output.format,
    mimeType: status.output.mimeType,
    size: status.output.size,
    path: status.output.path,
    savedAt: new Date(status.output.savedAt).toISOString(),
  };
}

export async function startNativeRender(request: NativeRenderRequest) {
  return invokeNativeRender<NativeRenderStatus>("start_native_render", { request });
}

export async function getNativeRenderStatus(jobId: string) {
  return invokeNativeRender<NativeRenderStatus>("get_native_render_status", { jobId });
}

export async function cancelNativeRender(jobId: string) {
  return invokeNativeRender<NativeRenderStatus>("cancel_native_render", { jobId });
}

export class NativeRenderCancelledError extends Error {
  constructor() {
    super("Native render job was cancelled.");
    this.name = "NativeRenderCancelledError";
  }
}

function assertNativeRenderRuntime() {
  if (!isDesktopRuntime()) {
    throw new Error("Native render adapter is only available in the desktop app.");
  }
}

async function invokeNativeRender<T>(command: string, args: Record<string, unknown>) {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<T>(command, args);
}

function estimateNativeOutputBytes({
  width,
  height,
  fps,
  duration,
  format,
}: {
  width: number;
  height: number;
  fps: number;
  duration: number;
  format: ExportFormat;
}) {
  if (isStillImageExportFormat(format)) return Math.max(180_000, Math.round(width * height * (format === "png" ? 0.8 : 0.35)));
  if (format === "json") return 32_000;
  if (isAudioExportFormat(format)) return Math.max(128_000, Math.round(duration * (format === "wav" ? 176_400 : 24_000)));

  const seconds = Math.max(1, duration);
  const frames = seconds * Math.max(1, fps);
  const pixelFactor = Math.max(1, (width * height) / (1280 * 720));
  const formatFactor = format === "gif" ? 0.28 : format === "avi" || format === "mpeg" ? 0.2 : 0.12;
  return Math.round(frames * pixelFactor * 28_000 * formatFactor);
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
