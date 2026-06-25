import type {
  ExportPublishPrep,
  ExportReviewComment,
  ExportReviewDownload,
  ExportReviewPackage,
} from "@/lib/projects/collaboration-store";
import type { HostedReviewComment } from "@/lib/projects/hosted-review-link-contracts";

export interface ReviewerAuditPacket {
  schemaVersion: 1;
  exportedAt: string;
  review: {
    id: string;
    projectId: string;
    exportJobId: string;
    outputName: string;
    format: string;
    preset: string;
    approvalStatus: ExportReviewPackage["reviewStatus"];
    createdAt: string;
    updatedAt: string;
  };
  reviewerIdentity: {
    hostedReviewerCount: number;
    hostedReviewerEmails: string[];
    localCommentCount: number;
  };
  comments: {
    hosted: HostedReviewComment[];
    local: ExportReviewComment[];
    hostedCount: number;
    localCount: number;
    unresolvedLocalCount: number;
  };
  downloads: {
    count: number;
    totalBytes: number;
    items: ExportReviewDownload[];
  };
  publishPrep: {
    count: number;
    readyCount: number;
    needsCredentialsCount: number;
    needsChangesCount: number;
    records: ExportPublishPrep[];
  };
}

export interface ReviewerAuditPacketInput {
  review: ExportReviewPackage;
  hostedComments: HostedReviewComment[];
  localComments: ExportReviewComment[];
  downloads: ExportReviewDownload[];
  publishPreps: ExportPublishPrep[];
  exportedAt?: string;
}

export function createReviewerAuditPacket(input: ReviewerAuditPacketInput): ReviewerAuditPacket {
  return {
    schemaVersion: 1,
    exportedAt: input.exportedAt ?? new Date().toISOString(),
    review: {
      id: input.review.id,
      projectId: input.review.projectId,
      exportJobId: input.review.exportJobId,
      outputName: input.review.outputName,
      format: input.review.format,
      preset: input.review.preset,
      approvalStatus: input.review.reviewStatus,
      createdAt: input.review.createdAt,
      updatedAt: input.review.updatedAt,
    },
    reviewerIdentity: {
      hostedReviewerCount: countHostedReviewers(input.hostedComments),
      hostedReviewerEmails: listHostedReviewerEmails(input.hostedComments),
      localCommentCount: input.localComments.length,
    },
    comments: {
      hosted: input.hostedComments,
      local: input.localComments,
      hostedCount: input.hostedComments.length,
      localCount: input.localComments.length,
      unresolvedLocalCount: input.localComments.filter((comment) => !comment.resolvedAt).length,
    },
    downloads: {
      count: input.downloads.length,
      totalBytes: input.downloads.reduce((total, download) => total + Math.max(0, download.size), 0),
      items: input.downloads,
    },
    publishPrep: {
      count: input.publishPreps.length,
      readyCount: input.publishPreps.filter((record) => record.status === "ready").length,
      needsCredentialsCount: input.publishPreps.filter((record) => record.status === "needs-credentials").length,
      needsChangesCount: input.publishPreps.filter((record) => record.status === "needs-changes").length,
      records: input.publishPreps,
    },
  };
}

export function downloadReviewerAuditPacket(packet: ReviewerAuditPacket) {
  if (typeof document === "undefined" || typeof Blob === "undefined" || typeof URL === "undefined") return false;

  const blob = new Blob([`${JSON.stringify(packet, null, 2)}\n`], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `essence-reviewer-audit-${safeAuditFilename(packet.review.outputName)}-${packet.exportedAt.replace(/[:.]/g, "-")}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  return true;
}

function countHostedReviewers(comments: HostedReviewComment[]) {
  return new Set(comments.map((comment) => reviewerIdentityKey(comment)).filter(Boolean)).size;
}

function listHostedReviewerEmails(comments: HostedReviewComment[]) {
  return [...new Set(comments.flatMap((comment) => (comment.reviewerEmail ? [comment.reviewerEmail] : [])))].sort();
}

function reviewerIdentityKey(comment: HostedReviewComment) {
  return comment.reviewerEmail || comment.reviewerName || "";
}

function safeAuditFilename(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "review"
  );
}
