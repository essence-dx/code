"use client";

import {
  addExportReviewComment,
  getExportReviewPackage,
  listExportReviewComments,
  listExportReviewDownloads,
  recordExportReviewDownload,
  setExportReviewCommentResolved,
  setExportReviewStatus,
} from "@/lib/projects/collaboration-store";
import type { ExportReviewRuntimeSmokeStore } from "@/lib/projects/export-review-runtime-smoke";

export function createCollaborationExportReviewRuntimeStore(): ExportReviewRuntimeSmokeStore {
  return {
    async getReview(reviewId) {
      return (await getExportReviewPackage(reviewId)) ?? null;
    },
    setStatus: setExportReviewStatus,
    listComments: listExportReviewComments,
    addComment: addExportReviewComment,
    setCommentResolved: setExportReviewCommentResolved,
    listDownloads: listExportReviewDownloads,
    recordDownload: recordExportReviewDownload,
  };
}
