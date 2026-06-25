"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { downloadTextFile } from "@/features/editor/download-text-file";
import {
  createTextExportArtifact,
  type ClientExportArtifact,
} from "@/features/editor/export-artifacts";
import {
  createExportJob,
  getExportFailureMessage,
  loadExportJobs,
  prependExportJob,
  saveExportJobs,
  updateExportJob,
  type ExportJobSummary,
} from "@/features/editor/export-job-history";
import {
  createNodeThumbnail,
  exportNodesAsGif,
  exportNodesAsMp4,
  exportNodesAsPdf,
  exportNodesAsWebsite,
  exportNodeAsImage,
  type ExportFrameContext,
  type ExportFormat,
  type ExportQuality,
  type ExportScale,
} from "@/features/editor/export-design";
import { createMediaSequenceExport } from "@/features/editor/media-sequence-export";
import { getMediaTimelineExportDurationMs } from "@/features/editor/media-timeline";
import { exportDocumentAsDocx } from "@/features/editor/office-docx-export";
import { exportDocumentAsXlsx } from "@/features/editor/office-xlsx-export";
import {
  createServerExportJob,
  updateServerExportJob,
} from "@/features/editor/server-export-job-sync";
import type { DesignDocument, DesignPage } from "@/features/editor/types";

type UseEditorExportInput = {
  projectId: string;
  document: DesignDocument;
  projectName: string;
};

export function useEditorExport({
  projectId,
  document,
  projectName,
}: UseEditorExportInput) {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const exportPageRefs = useRef(new Map<string, HTMLDivElement>());
  const printExportPageRefs = useRef(new Map<string, HTMLDivElement>());
  const [exportQuality, setExportQuality] = useState<ExportQuality>(0.92);
  const [exportScale, setExportScale] = useState<ExportScale>(2);
  const [isRenderingOutput, setIsRenderingOutput] = useState(false);
  const [exportPlaybackTimeSeconds, setExportPlaybackTimeSeconds] = useState<
    number | null
  >(null);
  const [exportJobs, setExportJobs] = useState<ExportJobSummary[]>([]);
  const exportJobsLoadedRef = useRef(false);

  useEffect(() => {
    setExportJobs(loadExportJobs(projectId));
    exportJobsLoadedRef.current = true;
  }, [projectId]);

  useEffect(() => {
    if (!exportJobsLoadedRef.current) return;

    saveExportJobs(projectId, exportJobs);
  }, [exportJobs, projectId]);

  const setExportPageNode = useCallback(
    (pageId: string, node: HTMLDivElement | null) => {
      if (node) {
        exportPageRefs.current.set(pageId, node);
        return;
      }

      exportPageRefs.current.delete(pageId);
    },
    [],
  );

  const setPrintExportPageNode = useCallback(
    (pageId: string, node: HTMLDivElement | null) => {
      if (node) {
        printExportPageRefs.current.set(pageId, node);
        return;
      }

      printExportPageRefs.current.delete(pageId);
    },
    [],
  );

  const captureCanvasOutput = useCallback(async <T,>(task: () => Promise<T>) => {
    setIsRenderingOutput(true);
    await waitForPaint();

    try {
      return await task();
    } finally {
      setIsRenderingOutput(false);
    }
  }, []);

  const captureCurrentThumbnail = useCallback(() => {
    return captureCanvasOutput(() => generateThumbnail(canvasRef.current));
  }, [captureCanvasOutput]);

  const prepareAnimatedExportFrame = useCallback(
    async ({ node, timeSeconds }: ExportFrameContext) => {
      setExportPlaybackTimeSeconds(timeSeconds);
      await waitForPaint();
      await waitForExportMediaFrame(node);
      await waitForPaint();
    },
    [],
  );

  const getExportPageNodes = useCallback(
    (refs: Map<string, HTMLDivElement>) => {
      return getExportPages(document.pages, refs).map((page) => page.node);
    },
    [document.pages],
  );

  const setExportJobProgress = useCallback(
    (
      jobId: string,
      patch: Partial<Omit<ExportJobSummary, "id" | "createdAt">>,
    ) => {
      setExportJobs((current) => updateExportJob(current, jobId, patch));
    },
    [],
  );

  const exportImage = useCallback(
    async (format: ExportFormat) => {
      const job = createExportJob({ format, projectName });
      let capturedArtifact: ClientExportArtifact | null = null;
      const rememberArtifact = (artifact: ClientExportArtifact) => {
        capturedArtifact = artifact;
      };
      setExportJobs((current) => prependExportJob(current, job));
      void createServerExportJob({ projectId, projectName, job });
      const updateProgress = (progress: number) => {
        setExportJobProgress(job.id, {
          status: "running",
          progress,
        });
        void updateServerExportJob({
          jobId: job.id,
          status: "running",
          progress,
        });
      };
      const completeJob = (artifact: ClientExportArtifact | null = null) => {
        setExportJobProgress(job.id, {
          status: "completed",
          progress: 100,
          completedAt: new Date().toISOString(),
          artifactName: artifact?.fileName ?? job.fileName,
        });
        void updateServerExportJob({
          jobId: job.id,
          status: "completed",
          progress: 100,
          artifact: artifact ?? undefined,
        });
      };

      try {
        updateProgress(12);

        if (format === "media-sequence") {
          const text = createMediaSequenceExport({ document, projectName });
          const artifact = createTextExportArtifact({
            fileName: job.fileName,
            mimeType: "application/json;charset=utf-8",
            text,
          });

          updateProgress(60);
          downloadTextFile({
            fileName: job.fileName,
            text,
            type: "application/json;charset=utf-8",
          });
          completeJob(artifact);
          return;
        }

        if (format === "docx") {
          updateProgress(35);
          await exportDocumentAsDocx({
            document,
            onArtifact: rememberArtifact,
            projectName,
          });
          completeJob(capturedArtifact);
          return;
        }

        if (format === "xlsx") {
          updateProgress(35);
          await exportDocumentAsXlsx({
            document,
            onArtifact: rememberArtifact,
            projectName,
          });
          completeJob(capturedArtifact);
          return;
        }

        if (format === "mp4") {
          const exportPages = getExportPages(
            document.pages,
            exportPageRefs.current,
          );

          updateProgress(30);
          await captureCanvasOutput(() =>
            exportNodesAsMp4(
              exportPages.map((page) => page.node),
              projectName,
              {
                frameDurationsMs: getExportPageFrameDurationsMs(exportPages),
                onArtifact: rememberArtifact,
                onBeforeFrame: prepareAnimatedExportFrame,
                scale: exportScale,
                shouldCompositeFrames: (pageIndex) =>
                  shouldCompositeTimelinePage(exportPages[pageIndex]?.page),
                timelineFrameStepMs: 200,
              },
            ),
          );
          setExportPlaybackTimeSeconds(null);
          completeJob(capturedArtifact);
          return;
        }

        if (format === "gif") {
          const exportPages = getExportPages(
            document.pages,
            exportPageRefs.current,
          );

          updateProgress(30);
          await captureCanvasOutput(() =>
            exportNodesAsGif(
              exportPages.map((page) => page.node),
              projectName,
              {
                frameDurationsMs: getExportPageFrameDurationsMs(exportPages),
                onArtifact: rememberArtifact,
                onBeforeFrame: prepareAnimatedExportFrame,
                scale: exportScale,
                shouldCompositeFrames: (pageIndex) =>
                  shouldCompositeTimelinePage(exportPages[pageIndex]?.page),
                timelineFrameStepMs: 250,
              },
            ),
          );
          setExportPlaybackTimeSeconds(null);
          completeJob(capturedArtifact);
          return;
        }

        if (format === "html") {
          const pageNodes = getExportPageNodes(exportPageRefs.current);

          updateProgress(30);
          await captureCanvasOutput(() =>
            exportNodesAsWebsite(pageNodes, projectName, {
              onArtifact: rememberArtifact,
              scale: exportScale,
            }),
          );
          completeJob(capturedArtifact);
          return;
        }

        if (format === "multipage-pdf" || format === "print-pdf") {
          const pageRefs =
            format === "print-pdf"
              ? printExportPageRefs.current
              : exportPageRefs.current;
          const pageNodes = getExportPageNodes(pageRefs);

          updateProgress(30);
          await captureCanvasOutput(() =>
            exportNodesAsPdf(
              pageNodes,
              format === "print-pdf"
                ? `${projectName} print-ready`
                : projectName,
              {
                onArtifact: rememberArtifact,
                scale: exportScale,
              },
            ),
          );
          completeJob(capturedArtifact);
          return;
        }

        if (!canvasRef.current) {
          throw new Error("The active canvas is not ready for export.");
        }

        updateProgress(30);
        await captureCanvasOutput(() =>
          exportNodeAsImage(
            canvasRef.current as HTMLElement,
            projectName,
            format,
            {
              onArtifact: rememberArtifact,
              quality: exportQuality,
              scale: exportScale,
            },
          ),
        );
        completeJob(capturedArtifact);
      } catch (error) {
        setExportPlaybackTimeSeconds(null);
        const failureMessage = getExportFailureMessage(error);
        setExportJobProgress(job.id, {
          status: "failed",
          progress: 100,
          failureMessage,
        });
        void updateServerExportJob({
          jobId: job.id,
          status: "failed",
          progress: 100,
          failureMessage,
        });
      }
    },
    [
      captureCanvasOutput,
      document,
      exportQuality,
      exportScale,
      getExportPageNodes,
      prepareAnimatedExportFrame,
      projectId,
      projectName,
      setExportJobProgress,
    ],
  );

  const retryExportJob = useCallback(
    (jobId: string) => {
      const job = exportJobs.find((item) => item.id === jobId);

      if (!job || job.status === "running" || job.status === "queued") return;

      void exportImage(job.format);
    },
    [exportImage, exportJobs],
  );

  const clearExportJobs = useCallback(() => {
    setExportJobs([]);
  }, []);

  const activeExportJob =
    exportJobs.find(
      (job) => job.status === "queued" || job.status === "running",
    ) ?? null;
  const failedExportJobCount = exportJobs.filter(
    (job) => job.status === "failed",
  ).length;

  return {
    canvasRef,
    activeExportJob,
    exportJobs,
    failedExportJobCount,
    exportQuality,
    exportPlaybackTimeSeconds,
    exportScale,
    isRenderingOutput,
    setExportQuality,
    setExportScale,
    setExportPageNode,
    setPrintExportPageNode,
    captureCurrentThumbnail,
    exportImage,
    retryExportJob,
    clearExportJobs,
  };
}

async function generateThumbnail(node: HTMLElement | null) {
  if (!node) return undefined;

  try {
    return await createNodeThumbnail(node);
  } catch {
    return undefined;
  }
}

async function waitForPaint() {
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

async function waitForExportMediaFrame(node: HTMLElement) {
  const videos = Array.from(
    node.querySelectorAll<HTMLVideoElement>(
      'video[data-essence-export-video="true"]',
    ),
  );

  await Promise.all(videos.map(waitForVideoFrame));
}

async function waitForVideoFrame(video: HTMLVideoElement) {
  if (video.readyState === 0) {
    video.load();
  }

  if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && !video.seeking) {
    return;
  }

  await new Promise<void>((resolve) => {
    let resolved = false;
    const timeoutId = window.setTimeout(done, 900);

    function done() {
      if (resolved) return;

      resolved = true;
      window.clearTimeout(timeoutId);
      video.removeEventListener("canplay", done);
      video.removeEventListener("error", done);
      video.removeEventListener("loadeddata", done);
      video.removeEventListener("seeked", done);
      resolve();
    }

    video.addEventListener("canplay", done, { once: true });
    video.addEventListener("error", done, { once: true });
    video.addEventListener("loadeddata", done, { once: true });
    video.addEventListener("seeked", done, { once: true });
  });
}

function getExportPages(
  pages: DesignPage[],
  refs: Map<string, HTMLDivElement>,
) {
  return pages.flatMap((page) => {
    const node = refs.get(page.id);

    return node ? [{ page, node }] : [];
  });
}

function getExportPageFrameDurationsMs(pages: Array<{ page: DesignPage }>) {
  return pages.map(({ page }) =>
    getMediaTimelineExportDurationMs(page.elements),
  );
}

function shouldCompositeTimelinePage(page: DesignPage | undefined) {
  if (!page) return false;

  return page.elements.some(
    (element) =>
      element.type === "video" ||
      (element.motionPreset !== undefined && element.motionPreset !== "none") ||
      (element.motionKeyframes?.length ?? 0) > 0,
  );
}
