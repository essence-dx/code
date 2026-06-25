"use client";

import { createDeliveryQaReport, type DeliveryQaReport } from "@/lib/editor/delivery-qa";
import type { ExportJob } from "@/lib/editor/types";
import { exportJobOutputName } from "@/lib/render/export-filenames";
import type { EditorState, EditorStoreGet, EditorStoreSet } from "@/features/editor/state/editor-store-types";

type EditorExportSlice = Pick<EditorState, "queueExport" | "updateExportJob" | "removeExportJob" | "clearFinishedExportJobs">;

export function createEditorExportSlice(set: EditorStoreSet, get: EditorStoreGet): EditorExportSlice {
  return {
    queueExport: (format, preset, options = {}) => {
      const now = new Date().toISOString();
      const state = get();
      const job: ExportJob = {
        id: crypto.randomUUID(),
        projectId: state.project.id,
        format,
        preset,
        status: "queued",
        progress: 0,
        outputName: exportJobOutputName(state.project.title, format, preset),
        sourceSnapshot: createExportSourceSnapshot(state.project, state.mediaAssets.length, now),
        reviewSnapshot: createExportReviewSnapshot(createDeliveryQaReport(state.project, state.mediaAssets), now),
        exportQaSnapshot: options.exportQaSnapshot,
        mediaAttributionSummary: options.mediaAttributionSummary,
        createdAt: now,
        updatedAt: now,
      };
      set({ exportJobs: [job, ...get().exportJobs] });
      return job;
    },
    updateExportJob: (jobId, patch) =>
      set({
        exportJobs: get().exportJobs.map((job) =>
          job.id === jobId ? { ...job, ...patch, updatedAt: new Date().toISOString() } : job,
        ),
      }),
    removeExportJob: (jobId) =>
      set({
        exportJobs: get().exportJobs.filter((job) => job.id !== jobId),
      }),
    clearFinishedExportJobs: () => {
      const exportJobs = get().exportJobs;
      const remainingJobs = exportJobs.filter((job) => job.status === "queued" || job.status === "rendering");
      set({ exportJobs: remainingJobs });
      return exportJobs.length - remainingJobs.length;
    },
  };
}

function createExportSourceSnapshot(project: EditorState["project"], mediaAssetCount: number, capturedAt: string) {
  return {
    projectTitle: project.title,
    projectUpdatedAt: project.updatedAt,
    duration: project.duration,
    width: project.width,
    height: project.height,
    fps: project.fps,
    layerCount: project.layers.length,
    mediaAssetCount,
    capturedAt,
  };
}

function createExportReviewSnapshot(report: DeliveryQaReport, capturedAt: string) {
  return {
    status: report.status,
    issueCount: report.issues.length,
    blockers: report.issues.filter((issue) => issue.severity === "blocker").length,
    warnings: report.issues.filter((issue) => issue.severity === "warning").length,
    capturedAt,
  };
}
