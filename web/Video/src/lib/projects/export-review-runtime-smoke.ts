import type {
  ExportReviewComment,
  ExportReviewDownload,
  ExportReviewPackage,
  ExportReviewStatus,
} from "@/lib/projects/collaboration-store";
import type { DesktopLaunchProofSummary } from "@/lib/desktop/desktop-launch-proof";
import type { ReleaseEvidenceSummary } from "@/lib/product/release-evidence";
import { createExportProofBundle } from "@/lib/projects/export-proof-bundle";
import { importExportProofBundle } from "@/lib/projects/export-proof-bundle-history";
import { parseDownloadedExportProofBundle, serializeExportProofBundle } from "@/lib/projects/export-proof-bundle-download";
import { createReleaseReviewHandoffComparison } from "@/lib/projects/release-review-handoff";

export type ExportReviewRuntimeSmokeStatus = "ready" | "blocked";

export interface ExportReviewRuntimeSmokeStore {
  getReview: (reviewId: string) => Promise<ExportReviewPackage | null>;
  setStatus: (reviewId: string, status: ExportReviewStatus) => Promise<void>;
  listComments: (reviewId: string) => Promise<ExportReviewComment[]>;
  addComment: (input: { reviewId: string; body: string }) => Promise<ExportReviewComment | null>;
  setCommentResolved: (commentId: string, resolved: boolean) => Promise<void>;
  listDownloads: (reviewId: string) => Promise<ExportReviewDownload[]>;
  recordDownload: (review: ExportReviewPackage) => Promise<ExportReviewDownload>;
}

export interface ExportReviewRuntimeSmokeInput {
  reviewId: string;
  store: ExportReviewRuntimeSmokeStore;
  releaseEvidenceSummary: ReleaseEvidenceSummary;
  releaseEvidenceUpdatedAt: string | number | null;
  desktopProofSummary: DesktopLaunchProofSummary;
  desktopEvidenceCheckedAt: number | null;
}

export interface ExportReviewRuntimeSmokeCheck {
  id: string;
  label: string;
  status: ExportReviewRuntimeSmokeStatus;
  detail: string;
}

export interface ExportReviewRuntimeSmokeReport {
  status: ExportReviewRuntimeSmokeStatus;
  readyCount: number;
  blockedCount: number;
  checks: ExportReviewRuntimeSmokeCheck[];
}

export async function runExportReviewRuntimeSmoke(input: ExportReviewRuntimeSmokeInput): Promise<ExportReviewRuntimeSmokeReport> {
  const initialReview = await input.store.getReview(input.reviewId);
  const checks: ExportReviewRuntimeSmokeCheck[] = [];

  if (!initialReview) {
    return createSmokeReport([
      {
        id: "review-load",
        label: "Review load",
        status: "blocked",
        detail: `Review ${input.reviewId} could not be loaded.`,
      },
    ]);
  }

  checks.push({ id: "review-load", label: "Review load", status: "ready", detail: `${initialReview.outputName} loaded.` });

  await input.store.setStatus(input.reviewId, "changes-requested");
  const statusReview = await input.store.getReview(input.reviewId);
  checks.push({
    id: "status-update",
    label: "Status update",
    status: statusReview?.reviewStatus === "changes-requested" ? "ready" : "blocked",
    detail:
      statusReview?.reviewStatus === "changes-requested"
        ? "Review status changed to changes requested."
        : "Review status did not persist.",
  });

  const comment = await input.store.addComment({ reviewId: input.reviewId, body: "Runtime smoke comment" });
  checks.push({
    id: "comment-add",
    label: "Comment add",
    status: comment?.body === "Runtime smoke comment" ? "ready" : "blocked",
    detail: comment ? "Comment was saved." : "Comment was not saved.",
  });

  if (comment) {
    await input.store.setCommentResolved(comment.id, true);
  }
  const comments = await input.store.listComments(input.reviewId);
  checks.push({
    id: "comment-resolve",
    label: "Comment resolve",
    status: comments.some((item) => item.id === comment?.id && Boolean(item.resolvedAt)) ? "ready" : "blocked",
    detail: "Resolved comment state was read back from the review store.",
  });

  const latestReview = (await input.store.getReview(input.reviewId)) ?? initialReview;
  const download = await input.store.recordDownload(latestReview);
  const downloads = await input.store.listDownloads(input.reviewId);
  checks.push({
    id: "download-record",
    label: "Download record",
    status: downloads.some((item) => item.id === download.id) ? "ready" : "blocked",
    detail: `${downloads.length} download ${downloads.length === 1 ? "record" : "records"} available.`,
  });

  const proofBundle = createExportProofBundle({
    review: latestReview,
    downloads,
    releaseEvidenceSummary: input.releaseEvidenceSummary,
    desktopProofSummary: input.desktopProofSummary,
  });
  const parsedBundle = parseDownloadedExportProofBundle(serializeExportProofBundle(proofBundle));
  checks.push({
    id: "proof-export",
    label: "Proof export",
    status: parsedBundle?.id === proofBundle.id ? "ready" : "blocked",
    detail: parsedBundle ? "Proof bundle serialized and parsed successfully." : "Proof bundle JSON could not be parsed.",
  });

  const importedProof = parsedBundle ? importExportProofBundle(parsedBundle) : null;
  checks.push({
    id: "proof-import",
    label: "Proof import",
    status: importedProof?.bundle.reviewId === input.reviewId ? "ready" : "blocked",
    detail: importedProof ? "Proof bundle import returned a restorable review entry." : "Proof bundle import failed.",
  });

  const handoff = createReleaseReviewHandoffComparison({
    bundle: proofBundle,
    releaseEvidenceSummary: input.releaseEvidenceSummary,
    releaseEvidenceUpdatedAt: input.releaseEvidenceUpdatedAt,
    desktopProofSummary: input.desktopProofSummary,
    desktopEvidenceCheckedAt: input.desktopEvidenceCheckedAt,
  });
  checks.push({
    id: "release-handoff",
    label: "Release handoff comparison",
    status: handoff.status === "mismatch" ? "blocked" : "ready",
    detail: `${handoff.matchCount} match, ${handoff.attentionCount} review, and ${handoff.mismatchCount} mismatch checks.`,
  });

  return createSmokeReport(checks);
}

export function createInMemoryExportReviewRuntimeStore(review: ExportReviewPackage): ExportReviewRuntimeSmokeStore {
  const reviews = new Map<string, ExportReviewPackage>([[review.id, review]]);
  const comments = new Map<string, ExportReviewComment>();
  const downloads = new Map<string, ExportReviewDownload>();

  return {
    async getReview(reviewId) {
      return reviews.get(reviewId) ?? null;
    },
    async setStatus(reviewId, status) {
      const stored = reviews.get(reviewId);
      if (!stored) return;
      reviews.set(reviewId, { ...stored, reviewStatus: status, updatedAt: new Date().toISOString() });
    },
    async listComments(reviewId) {
      return [...comments.values()].filter((comment) => comment.reviewId === reviewId).sort((first, second) => second.createdAt.localeCompare(first.createdAt));
    },
    async addComment(input) {
      const body = input.body.trim().slice(0, 1000);
      if (!body) return null;
      const comment: ExportReviewComment = {
        id: `comment_${comments.size + 1}`,
        reviewId: input.reviewId,
        body,
        createdAt: new Date().toISOString(),
      };
      comments.set(comment.id, comment);
      return comment;
    },
    async setCommentResolved(commentId, resolved) {
      const comment = comments.get(commentId);
      if (!comment) return;
      comments.set(commentId, { ...comment, resolvedAt: resolved ? new Date().toISOString() : undefined });
    },
    async listDownloads(reviewId) {
      return [...downloads.values()].filter((download) => download.reviewId === reviewId).sort((first, second) => second.createdAt.localeCompare(first.createdAt));
    },
    async recordDownload(storedReview) {
      const download: ExportReviewDownload = {
        id: `download_${downloads.size + 1}`,
        reviewId: storedReview.id,
        filename: storedReview.renderedFile?.filename ?? storedReview.outputName,
        size: storedReview.renderedFile?.size ?? 0,
        createdAt: new Date().toISOString(),
      };
      downloads.set(download.id, download);
      return download;
    },
  };
}

function createSmokeReport(checks: ExportReviewRuntimeSmokeCheck[]): ExportReviewRuntimeSmokeReport {
  const readyCount = checks.filter((check) => check.status === "ready").length;
  const blockedCount = checks.filter((check) => check.status === "blocked").length;

  return {
    status: blockedCount > 0 ? "blocked" : "ready",
    readyCount,
    blockedCount,
    checks,
  };
}
