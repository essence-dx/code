import type { ExportFormat } from "@/lib/editor/types";
import type { ExportReviewPackage } from "@/lib/projects/collaboration-store";

export type PublishTargetId = "youtube" | "tiktok" | "instagram" | "linkedin" | "cloud-drive";

export type PublishPrepStatus = "ready" | "needs-changes" | "needs-credentials";

export interface PublishPrepTarget {
  id: PublishTargetId;
  label: string;
  destination: string;
  credentialMode: "user-owned";
  acceptedFormats: ExportFormat[];
  recommendedPresets: string[];
}

export interface PublishPrepChecklistItem {
  id: string;
  label: string;
  complete: boolean;
  detail: string;
}

export interface PublishPrepPlan {
  target: PublishPrepTarget;
  status: PublishPrepStatus;
  suggestedFilename: string;
  checklist: PublishPrepChecklistItem[];
}

export const publishPrepTargets: PublishPrepTarget[] = [
  {
    id: "youtube",
    label: "YouTube",
    destination: "Channel upload",
    credentialMode: "user-owned",
    acceptedFormats: ["mp4", "webm", "mov", "avi", "mpeg"],
    recommendedPresets: ["mp4-1080p", "webm-1080p", "mov-1080p", "mp4-vertical-1080"],
  },
  {
    id: "tiktok",
    label: "TikTok",
    destination: "Vertical post",
    credentialMode: "user-owned",
    acceptedFormats: ["mp4", "webm", "mov"],
    recommendedPresets: ["mp4-vertical-1080", "mov-1080p"],
  },
  {
    id: "instagram",
    label: "Instagram",
    destination: "Reel, feed, or story",
    credentialMode: "user-owned",
    acceptedFormats: ["mp4", "mov", "png", "jpg"],
    recommendedPresets: ["mp4-vertical-1080", "png-current-frame", "jpg-current-frame"],
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    destination: "Feed, page, or banner",
    credentialMode: "user-owned",
    acceptedFormats: ["mp4", "mov", "png", "jpg", "webp"],
    recommendedPresets: ["mp4-1080p", "mp4-vertical-1080", "png-current-frame", "webp-current-frame"],
  },
  {
    id: "cloud-drive",
    label: "Cloud Drive",
    destination: "User-owned drive folder",
    credentialMode: "user-owned",
    acceptedFormats: ["mp4", "webm", "mov", "avi", "mpeg", "gif", "png", "jpg", "webp", "wav", "mp3", "m4a", "json"],
    recommendedPresets: ["project-bundle", "mp4-1080p", "mov-1080p", "png-current-frame", "webp-current-frame", "wav-audio", "mp3-audio"],
  },
];

export function findPublishPrepTarget(id: PublishTargetId) {
  return publishPrepTargets.find((target) => target.id === id) ?? publishPrepTargets[0];
}

export function createPublishPrepPlan(review: ExportReviewPackage, targetId: PublishTargetId): PublishPrepPlan {
  const target = findPublishPrepTarget(targetId);
  const formatAccepted = target.acceptedFormats.includes(review.format);
  const hasRenderedFile = Boolean(review.renderedFile);
  const approved = review.reviewStatus === "approved";
  const credentialReady = false;
  const checklist: PublishPrepChecklistItem[] = [
    {
      id: "rendered-file",
      label: "Rendered file available",
      complete: hasRenderedFile,
      detail: hasRenderedFile ? review.renderedFile?.filename ?? review.outputName : "Export the project before publishing.",
    },
    {
      id: "approval",
      label: "Export approved",
      complete: approved,
      detail: approved ? "The review package is approved." : "Approve the export or resolve requested changes before publishing.",
    },
    {
      id: "format",
      label: "Format accepted",
      complete: formatAccepted,
      detail: formatAccepted ? `${review.format.toUpperCase()} can be prepared for ${target.label}.` : `Use one of: ${target.acceptedFormats.map((format) => format.toUpperCase()).join(", ")}.`,
    },
    {
      id: "credentials",
      label: "User-owned credentials",
      complete: credentialReady,
      detail: "Connect the creator's own account credentials before any real publish action runs.",
    },
  ];

  return {
    target,
    status: publishPrepStatus(checklist),
    suggestedFilename: cleanPublishFilename(review.renderedFile?.filename ?? review.outputName),
    checklist,
  };
}

function publishPrepStatus(checklist: PublishPrepChecklistItem[]): PublishPrepStatus {
  const nonCredentialBlocker = checklist.some((item) => item.id !== "credentials" && !item.complete);
  if (nonCredentialBlocker) return "needs-changes";
  return "needs-credentials";
}

function cleanPublishFilename(value: string) {
  return value.trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-").replace(/\s+/g, "-").slice(0, 160) || "export";
}
