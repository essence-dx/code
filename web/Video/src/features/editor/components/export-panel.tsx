"use client";

import { AlertTriangle, Download, ExternalLink, Loader2, Monitor, RotateCcw, Trash2, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BatchExportReadinessDialog } from "@/features/editor/components/batch-export-readiness-dialog";
import { DeliveryQaChecklist } from "@/features/editor/components/delivery-qa-checklist";
import { useEditorStore } from "@/features/editor/state/editor-store";
import { createBatchExportReadinessReport } from "@/lib/editor/batch-export-readiness";
import { createExportQaSnapshot } from "@/lib/editor/export-qa-summary";
import { createMediaAttributionSummary } from "@/lib/editor/media-attribution";
import { exportPresets, type ExportPreset } from "@/lib/editor/presets";
import { socialDeliveryPresets } from "@/lib/editor/social-format-presets";
import {
  DEFAULT_EXPORT_CONVERSION_SETTINGS,
  createRenderPlan,
  supportsTransparentBackgroundPreset,
  targetSizeVideoBitrateKbps,
  type CanvasBackgroundMode,
  type CaptionExportMode,
  type ExportConversionSettings,
} from "@/lib/render/export-planner";
import { cancelBrowserRender, exportProjectBundle, renderWithBrowserFfmpeg } from "@/lib/render/browser-renderer";
import { getLoadPhase, subscribe } from "@/lib/render/ffmpeg-loader";
import type { FfmpegLoadPhase, FfmpegLoadProgress } from "@/lib/render/ffmpeg-loader";
import { renderCompositeWithCanvas, renderCurrentFrameImage } from "@/lib/render/composite-renderer";
import { ExportSaveCancelledError } from "@/lib/render/export-output";
import { isStillImageExportFormat } from "@/lib/render/export-formats";
import { renderFailureMessage, RenderUnsupportedError } from "@/lib/render/render-errors";
import { preflightRenderPlan } from "@/lib/render/render-preflight";
import { createExportQualityPreview, type ExportQualityPreview } from "@/lib/render/export-quality-preview";
import { createRenderHandoffPlan, type RenderHandoffReport } from "@/lib/render/render-handoff";
import {
  canUseNativeRenderAdapter,
  createNativeRenderRequest,
  NativeRenderCancelledError,
  renderWithNativeDesktopAdapter,
} from "@/lib/render/native-render-adapter";
import { downloadTextFile, formatSrt } from "@/lib/subtitles/srt-vtt";
import { normalizeSubtitleCues } from "@/lib/subtitles/cue-operations";
import type { EditorProject, ExportJob, RenderedExportFile, SubtitleCue } from "@/lib/editor/types";
import { createExportReviewPackage } from "@/lib/projects/collaboration-store";
import { useIsDesktopRuntime } from "@/lib/runtime/client-api";

export function ExportPanel() {
  const project = useEditorStore((state) => state.project);
  const assets = useEditorStore((state) => state.mediaAssets);
  const currentTime = useEditorStore((state) => state.currentTime);
  const exportJobs = useEditorStore((state) => state.exportJobs);
  const queueExport = useEditorStore((state) => state.queueExport);
  const updateExportJob = useEditorStore((state) => state.updateExportJob);
  const removeExportJob = useEditorStore((state) => state.removeExportJob);
  const clearFinishedExportJobs = useEditorStore((state) => state.clearFinishedExportJobs);
  const [presetId, setPresetId] = useState("project-bundle");
  const [isRendering, setIsRendering] = useState(false);
  const [isBatchRendering, setIsBatchRendering] = useState(false);
  const [isPreparingExport, setIsPreparingExport] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [preflightMessage, setPreflightMessage] = useState<string | null>(null);
  const [preflightWarningMessage, setPreflightWarningMessage] = useState<string | null>(null);
  const [batchMessage, setBatchMessage] = useState<string | null>(null);
  const [reviewMessage, setReviewMessage] = useState<string | null>(null);
  const [selectedBatchDeliveryIds, setSelectedBatchDeliveryIds] = useState<string[]>(["shorts-mp4", "thumbnail-png"]);
  const [conversionSettings, setConversionSettings] = useState<ExportConversionSettings>(DEFAULT_EXPORT_CONVERSION_SETTINGS);
  const isDesktopRuntime = useIsDesktopRuntime();
  const controllerRef = useRef<AbortController | null>(null);
  const batchCancelledRef = useRef(false);
  const [ffmpegLoadPhase, setFfmpegLoadPhase] = useState<FfmpegLoadPhase>(getLoadPhase());
  const [ffmpegLoadProgress, setFfmpegLoadProgress] = useState<FfmpegLoadProgress | null>(null);

  useEffect(() => {
    const unsub = subscribe((p) => {
      setFfmpegLoadPhase(p.phase);
      setFfmpegLoadProgress(p);
    });
    return unsub;
  }, []);
  const preset = exportPresets.find((item) => item.id === presetId) ?? exportPresets[0];
  const selectedBatchDeliveries = socialDeliveryPresets.filter((item) => selectedBatchDeliveryIds.includes(item.id));
  const isExportBusy = isPreparingExport || isRendering || isBatchRendering;
  const renderPlanPreview = createRenderPlan(project, assets, preset.id, preset.format, { conversion: conversionSettings });
  const renderHandoff = createRenderHandoffPlan({ project, assets, plan: renderPlanPreview, isDesktopRuntime });
  const batchReadinessReport = createBatchExportReadinessReport({
    project,
    mediaAssets: assets,
    deliveries: selectedBatchDeliveries,
    conversionSettings,
    isDesktopRuntime,
  });

  function handlePresetChange(nextPresetId: string) {
    const nextPreset = exportPresets.find((item) => item.id === nextPresetId);
    setPresetId(nextPresetId);
    setConversionSettings((current) => ({
      ...current,
      backgroundMode: supportsTransparentBackgroundPreset(nextPreset) ? "transparent" : "project",
    }));
  }

  async function render(selectedPreset: ExportPreset = preset, options: { ignoreBusy?: boolean; conversionOverride?: Partial<ExportConversionSettings>; qaProject?: EditorProject } = {}) {
    if (!options.ignoreBusy && isExportBusy) return false;

    const qaProject = options.qaProject ?? project;
    const plan = createRenderPlan(project, assets, selectedPreset.id, selectedPreset.format, { conversion: options.conversionOverride ?? conversionSettings });
    const handoff = createRenderHandoffPlan({ project: qaProject, assets, plan, isDesktopRuntime });
    setPreflightMessage(null);
    setPreflightWarningMessage(null);
    setIsPreparingExport(true);

    try {
      if (!handoff.canAttemptInBrowser) {
        setPreflightMessage(handoff.detail);
        return false;
      }

      const preflight = await preflightRenderPlan(plan, project, assets);
      if (!preflight.ok) {
        setPreflightMessage(summaryFromPreflight(preflight.errors));
        return false;
      }
      const warnings = handoff.status === "desktop-recommended" ? [handoff.detail, ...preflight.warnings] : preflight.warnings;
      if (warnings.length > 0) {
        setPreflightWarningMessage(summaryFromPreflight(warnings));
      }
    } catch {
      setPreflightMessage("Export could not prepare. Check your media and try again.");
      return false;
    } finally {
      setIsPreparingExport(false);
    }

    const job = queueExport(selectedPreset.format, selectedPreset.id, {
      exportQaSnapshot: createExportQaSnapshot({ project: qaProject, mediaAssets: assets, plan, handoff }),
      mediaAttributionSummary: createMediaAttributionSummary({ project: qaProject, mediaAssets: assets }),
    });
    const controller = new AbortController();
    controllerRef.current = controller;
    setActiveJobId(job.id);
    setIsRendering(true);
    updateExportJob(job.id, { status: "rendering", progress: 10 });

    try {
      let renderedFile: RenderedExportFile | undefined;
      if (canUseNativeRenderAdapter(handoff)) {
        renderedFile = await renderWithNativeDesktopAdapter(createNativeRenderRequest({ job, project, plan, assets }), {
          signal: controller.signal,
          onProgress: (status) => {
            updateExportJob(job.id, {
              progress: Math.min(status.progress, 99),
              error: status.status === "failed" ? status.error ?? status.detail : undefined,
            });
          },
        });
      } else if (plan.mode === "project-bundle") {
        renderedFile = await exportProjectBundle(project, assets);
      } else if (isStillImageExportFormat(selectedPreset.format)) {
        renderedFile = await renderCurrentFrameImage(plan, project, assets, currentTime, {
          signal: controller.signal,
          onProgress: (progress) => updateExportJob(job.id, { progress: Math.min(progress, 95) }),
        });
      } else if (plan.mode === "composite") {
        renderedFile = await renderCompositeWithCanvas(plan, project, assets, {
          signal: controller.signal,
          onProgress: (progress) => updateExportJob(job.id, { progress }),
        });
      } else {
        if (!plan.supported) {
          throw new RenderUnsupportedError(plan.reason);
        }
        renderedFile = await renderWithBrowserFfmpeg(plan, {
          signal: controller.signal,
          onProgress: (progress) => updateExportJob(job.id, { progress }),
        });
      }
      exportCaptionSidecarIfNeeded(plan.conversionOptions?.captionMode ?? "burn-in");
      updateExportJob(job.id, { status: "complete", progress: 100, renderedFile });
      return true;
    } catch (error) {
      if (controller.signal.aborted || error instanceof ExportSaveCancelledError || error instanceof NativeRenderCancelledError) {
        updateExportJob(job.id, { status: "cancelled", progress: 100 });
        return false;
      }
      updateExportJob(job.id, {
        status: "failed",
        progress: 100,
        error: renderFailureMessage(error, plan.reason),
      });
      return false;
    } finally {
      setIsRendering(false);
      setActiveJobId(null);
      controllerRef.current = null;
    }
  }

  async function renderBatch() {
    if (isExportBusy || selectedBatchDeliveries.length === 0) return;
    if (!batchReadinessReport.canStart) {
      setBatchMessage(
        batchReadinessReport.blockedCount > 0
          ? `${batchReadinessReport.blockedCount} selected delivery ${batchReadinessReport.blockedCount === 1 ? "is" : "are"} blocked. Open Batch QA before rendering.`
          : "Select at least one delivery before starting a batch render.",
      );
      return;
    }

    setIsBatchRendering(true);
    setBatchMessage(batchReadinessReport.reviewCount > 0 ? `${batchReadinessReport.reviewCount} delivery ${batchReadinessReport.reviewCount === 1 ? "has" : "have"} review items visible in Batch QA.` : null);
    batchCancelledRef.current = false;

    let completed = 0;
    try {
      for (const item of batchReadinessReport.items) {
        if (batchCancelledRef.current) break;
        if (!item.preset) continue;
        const ok = await render(item.preset, { ignoreBusy: true, conversionOverride: item.conversionSettings, qaProject: item.deliveryProject });
        if (ok) completed += 1;
      }
    } finally {
      const total = batchReadinessReport.items.length;
      setBatchMessage(batchCancelledRef.current ? `${completed}/${total} delivery export${total === 1 ? "" : "s"} completed before cancellation.` : `${completed}/${total} delivery export${total === 1 ? "" : "s"} completed.`);
      setIsBatchRendering(false);
    }
  }

  function toggleBatchDelivery(deliveryId: string) {
    setSelectedBatchDeliveryIds((current) => (current.includes(deliveryId) ? current.filter((id) => id !== deliveryId) : [...current, deliveryId]));
  }

  function cancelExport() {
    if (isBatchRendering) {
      batchCancelledRef.current = true;
    }
    controllerRef.current?.abort();
    cancelBrowserRender();
    if (activeJobId) {
      updateExportJob(activeJobId, { status: "cancelled", progress: 100 });
    }
    setIsRendering(false);
  }

  function clearFinishedJobs() {
    const cleared = clearFinishedExportJobs();
    if (cleared > 0) {
      setBatchMessage(`${cleared} finished export ${cleared === 1 ? "job" : "jobs"} cleared.`);
    }
  }

  function retryExport(job: ExportJob) {
    if (isExportBusy) return;

    const retryPreset = exportPresets.find((item) => item.id === job.preset);
    if (!retryPreset) return;
    void render(retryPreset);
  }

  async function openExportReview(job: ExportJob) {
    if (job.status !== "complete") return;

    try {
      const review = await createExportReviewPackage({ job, origin: window.location.origin });
      window.open(review.url, "_blank", "noopener,noreferrer");
      setReviewMessage("Local review page opened.");
    } catch {
      setReviewMessage("Local review page could not be created.");
    }
  }

  function exportCaptionSidecarIfNeeded(captionMode: CaptionExportMode) {
    if (captionMode !== "sidecar") return;

    const cues = projectSubtitleSidecarCues(project.layers);
    if (cues.length === 0) return;
    downloadTextFile(`${project.title || "project"}-captions.srt`, formatSrt(cues), "application/x-subrip");
  }

  return (
    <footer
      className="flex h-32 flex-col gap-2 border-t border-border bg-card px-3 py-2"
      data-editor-region="export-workspace"
      tabIndex={-1}
    >
      <div className="flex min-w-0 items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-2">
        <Select value={presetId} onValueChange={handlePresetChange}>
          <SelectTrigger className="w-[220px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {exportPresets.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                <span className="flex flex-col">
                  <span>{item.label}</span>
                  <span className="text-xs text-muted-foreground">{item.description}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => void render()} disabled={isExportBusy}>
          {isExportBusy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
          {isPreparingExport ? "Preparing" : "Export"}
        </Button>
        <ScrollArea className="max-w-[420px]">
          <div className="flex items-center gap-1 pb-2">
            {socialDeliveryPresets.map((delivery) => (
              <Button
                key={delivery.id}
                size="sm"
                variant={selectedBatchDeliveryIds.includes(delivery.id) ? "secondary" : "outline"}
                className="h-8 shrink-0 px-2 text-xs"
                onClick={() => toggleBatchDelivery(delivery.id)}
                title={delivery.description}
                disabled={isExportBusy}
              >
                {delivery.label}
              </Button>
            ))}
            <Button size="sm" variant="outline" className="h-8 shrink-0" onClick={() => void renderBatch()} disabled={isExportBusy || !batchReadinessReport.canStart}>
              Batch
            </Button>
            <BatchExportReadinessDialog report={batchReadinessReport} />
          </div>
        </ScrollArea>
        <DeliveryQaChecklist project={project} mediaAssets={assets} plan={renderPlanPreview} handoff={renderHandoff} />
        <RenderRouteBadge report={renderHandoff} />
        {isRendering ? (
          <Button variant="outline" onClick={cancelExport}>
            <XCircle className="size-4" />
            Cancel
          </Button>
        ) : null}
        {preflightMessage ? (
          <div className="flex max-w-[360px] items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            <span>{preflightMessage}</span>
          </div>
        ) : null}
        {preflightWarningMessage ? (
          <div className="flex max-w-[360px] items-start gap-2 rounded-md border border-border bg-muted px-3 py-2 text-xs text-muted-foreground">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            <span>{preflightWarningMessage}</span>
          </div>
        ) : null}
        {batchMessage ? <div className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground">{batchMessage}</div> : null}
        {reviewMessage ? <div className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground">{reviewMessage}</div> : null}
        {ffmpegLoadPhase !== "ready" && ffmpegLoadPhase !== "error" && ffmpegLoadPhase !== "idle" ? (
          <div className="flex items-center gap-2 rounded-md border border-border bg-muted/50 px-2 py-1 text-xs text-muted-foreground">
            <Loader2 className="size-3 animate-spin" />
            <span>
              {ffmpegLoadPhase === "prefetching-core"
                ? `Loading FFmpeg (${formatFfmpegBytes(ffmpegLoadProgress)})`
                : ffmpegLoadPhase === "prefetching-wasm"
                  ? `Loading FFmpeg engine (${formatFfmpegBytes(ffmpegLoadProgress)})`
                  : "Preparing FFmpeg..."}
            </span>
          </div>
        ) : null}
        </div>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
        {exportJobs.some((job) => job.status !== "queued" && job.status !== "rendering") ? (
          <Button size="sm" variant="outline" onClick={clearFinishedJobs} disabled={isExportBusy}>
            Clear done
          </Button>
        ) : null}
        {exportJobs.slice(0, 3).map((job) => (
          <div key={job.id} className="w-64">
            <div className="mb-1 flex justify-between gap-2 text-xs text-muted-foreground">
              <span className="truncate" title={job.error ?? job.outputName}>
                {job.outputName}
                {job.error ? ` - ${job.error}` : ""}
              </span>
              <div className="flex items-center gap-1">
                {job.exportQaSnapshot ? <Badge variant={exportQaBadgeVariant(job.exportQaSnapshot.status)}>Export QA {job.exportQaSnapshot.status}</Badge> : null}
                {job.mediaAttributionSummary ? <Badge variant={job.mediaAttributionSummary.status === "review" ? "secondary" : "outline"}>{job.mediaAttributionSummary.itemCount} media rights</Badge> : null}
                {job.reviewSnapshot ? <Badge variant={job.reviewSnapshot.status === "blocked" ? "destructive" : "outline"}>{job.reviewSnapshot.status}</Badge> : null}
                <span>{job.status}</span>
              </div>
            </div>
            <div className="mb-1 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
              <span className="truncate">{exportJobPresetLabel(job)}</span>
              <span>{job.renderedFile ? formatBytes(job.renderedFile.size) : job.format.toUpperCase()}</span>
            </div>
            {job.sourceSnapshot ? (
              <div className="mb-1 truncate text-[10px] text-muted-foreground">
                v{formatExportVersion(job.sourceSnapshot.capturedAt)} · {job.sourceSnapshot.layerCount} layers · {job.sourceSnapshot.width}x{job.sourceSnapshot.height}
              </div>
            ) : null}
            <div className="flex items-center gap-2">
              <Progress value={job.progress} />
              {job.status === "failed" || job.status === "cancelled" ? (
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7"
                  onClick={() => retryExport(job)}
                  disabled={isExportBusy}
                  aria-label={`Retry ${job.outputName}`}
                >
                  <RotateCcw className="size-4" />
                </Button>
              ) : null}
              {job.status === "complete" ? (
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7"
                  onClick={() => void openExportReview(job)}
                  disabled={isExportBusy}
                  aria-label={`Open review page for ${job.outputName}`}
                >
                  <ExternalLink className="size-4" />
                </Button>
              ) : null}
              <Button
                size="icon"
                variant="ghost"
                className="size-7"
                onClick={() => removeExportJob(job.id)}
                disabled={isExportBusy && job.status === "rendering"}
                aria-label={`Remove ${job.outputName}`}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        ))}
        </div>
      </div>
      <ConverterCompressorControls
        settings={conversionSettings}
        duration={project.duration}
        preset={preset}
        projectWidth={project.width}
        projectHeight={project.height}
        projectFps={project.fps}
        disabled={isExportBusy}
        onChange={(patch) => setConversionSettings((current) => ({ ...current, ...patch }))}
      />
    </footer>
  );
}

function RenderRouteBadge({ report }: { report: RenderHandoffReport }) {
  const variant = report.status === "unsupported" || report.status === "desktop-required" ? "destructive" : report.status === "browser-ready" || report.status === "desktop-ready" ? "default" : "secondary";
  const routeHint =
    report.status === "desktop-required" ? "Desktop required" : report.status === "unsupported" ? "Not ready" : report.target === "desktop" ? "Desktop safer" : "Browser ready";

  return (
    <div className="flex max-w-[260px] shrink-0 items-center gap-2 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground" title={report.detail}>
      <Monitor className="size-3.5 shrink-0" />
      <Badge variant={variant}>{report.label}</Badge>
      <span className="truncate">{routeHint}</span>
    </div>
  );
}

function ConverterCompressorControls({
  settings,
  duration,
  preset,
  projectWidth,
  projectHeight,
  projectFps,
  disabled,
  onChange,
}: {
  settings: ExportConversionSettings;
  duration: number;
  preset: ExportPreset;
  projectWidth: number;
  projectHeight: number;
  projectFps: number;
  disabled: boolean;
  onChange: (patch: Partial<ExportConversionSettings>) => void;
}) {
  const targetBitrate = targetSizeVideoBitrateKbps(settings, duration);
  const qualityPreview = createExportQualityPreview({ settings, duration, preset, projectWidth, projectHeight, projectFps });

  return (
    <ScrollArea className="rounded-md border border-border bg-background/70">
      <div className="flex min-w-0 items-center gap-2 px-2 py-1.5 pb-3">
      <span className="shrink-0 text-xs font-medium text-muted-foreground">Convert</span>
      <CompactNumber label="Target MB" value={settings.targetSizeMb} min={0} max={5000} disabled={disabled} onChange={(targetSizeMb) => onChange({ targetSizeMb })} />
      <CompactNumber
        label="Bitrate"
        value={targetBitrate || settings.videoBitrateKbps}
        min={0}
        max={50000}
        disabled={disabled || settings.targetSizeMb > 0}
        onChange={(videoBitrateKbps) => onChange({ videoBitrateKbps })}
      />
      <CompactNumber label="Width" value={settings.width} min={0} max={7680} disabled={disabled} onChange={(width) => onChange({ width })} />
      <CompactNumber label="Height" value={settings.height} min={0} max={7680} disabled={disabled} onChange={(height) => onChange({ height })} />
      <CompactNumber label="FPS" value={settings.fps} min={0} max={120} disabled={disabled} onChange={(fps) => onChange({ fps })} />
      <Select value={settings.captionMode} disabled={disabled} onValueChange={(captionMode) => onChange({ captionMode: captionMode as CaptionExportMode })}>
        <SelectTrigger className="h-8 w-[132px] text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="burn-in">Burn captions</SelectItem>
          <SelectItem value="sidecar">SRT sidecar</SelectItem>
          <SelectItem value="none">No captions</SelectItem>
        </SelectContent>
      </Select>
      <Select
        value={settings.backgroundMode}
        disabled={disabled || !supportsTransparentBackgroundPreset(preset)}
        onValueChange={(backgroundMode) => onChange({ backgroundMode: backgroundMode as CanvasBackgroundMode })}
      >
        <SelectTrigger className="h-8 w-[142px] text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="project">Project bg</SelectItem>
          <SelectItem value="transparent">Transparent</SelectItem>
        </SelectContent>
      </Select>
      <span className="shrink-0 text-[11px] text-muted-foreground">{settings.targetSizeMb > 0 ? `${targetBitrate} kbps target` : "0 keeps preset"}</span>
      <ExportQualityPreviewBadge preview={qualityPreview} />
      </div>
    </ScrollArea>
  );
}

function ExportQualityPreviewBadge({ preview }: { preview: ExportQualityPreview }) {
  if (!preview.applies) {
    return <span className="shrink-0 text-[11px] text-muted-foreground">{preview.detail}</span>;
  }

  return (
    <div className="flex min-w-0 shrink-0 items-center gap-2 rounded-sm border border-border px-2 py-1 text-[11px] text-muted-foreground">
      <Badge variant={preview.label === "Risky compression" ? "destructive" : "outline"}>{preview.label}</Badge>
      <span>{formatQualityPreviewSize(preview.estimatedSizeMb)}</span>
      <span>{preview.detail}</span>
      {preview.warnings[0] ? <span className="text-destructive">{preview.warnings[0]}</span> : null}
    </div>
  );
}

function CompactNumber({
  label,
  value,
  min,
  max,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  function handleChange(rawValue: string) {
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed)) return;
    onChange(Math.min(max, Math.max(min, Math.round(parsed))));
  }

  return (
    <label className="flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
      {label}
      <Input className="h-8 w-20 font-mono text-xs" type="number" min={min} max={max} value={value} disabled={disabled} onChange={(event) => handleChange(event.target.value)} />
    </label>
  );
}

function projectSubtitleSidecarCues(layers: Array<{ kind: string; start: number; cues?: SubtitleCue[] }>) {
  return normalizeSubtitleCues(
    layers.flatMap((layer) =>
      layer.kind === "subtitle"
        ? (layer.cues ?? []).map((cue) => ({
            ...cue,
            start: cue.start + layer.start,
            end: cue.end + layer.start,
          }))
        : [],
    ),
  );
}

function exportJobPresetLabel(job: ExportJob) {
  return exportPresets.find((preset) => preset.id === job.preset)?.label ?? job.preset;
}

function exportQaBadgeVariant(status: NonNullable<ExportJob["exportQaSnapshot"]>["status"]) {
  if (status === "blocked") return "destructive";
  if (status === "review") return "secondary";
  return "outline";
}

function summaryFromPreflight(errors: string[]) {
  if (errors.length <= 1) return errors[0] ?? "Export is not ready yet.";
  return `${errors[0]} Fix ${errors.length - 1} more issue${errors.length === 2 ? "" : "s"} before exporting.`;
}

function formatFfmpegBytes(progress: FfmpegLoadProgress | null) {
  if (!progress || progress.bytesTotal <= 0) return "";
  const pct = Math.round((progress.bytesLoaded / progress.bytesTotal) * 100);
  const loaded = (progress.bytesLoaded / 1024 / 1024).toFixed(1);
  const total = (progress.bytesTotal / 1024 / 1024).toFixed(1);
  return `${pct}% (${loaded}/${total} MB)`;
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatQualityPreviewSize(sizeMb: number) {
  if (!Number.isFinite(sizeMb) || sizeMb <= 0) return "size pending";
  if (sizeMb < 1) return `${Math.max(1, Math.round(sizeMb * 1024))} KB est.`;
  return `${sizeMb.toFixed(1)} MB est.`;
}

function formatExportVersion(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "export";
  return `${date.getHours().toString().padStart(2, "0")}${date.getMinutes().toString().padStart(2, "0")}`;
}
