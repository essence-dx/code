import { createMediaHealthReport } from "@/lib/media/media-health";
import type { LocalProjectRecord } from "@/lib/projects/local-project-record";
import { createProjectReviewSummary } from "@/lib/editor/project-review-summary";

export type ProjectHealthStatus = "ready" | "attention" | "blocked";

export interface ProjectHealthSummary {
  status: ProjectHealthStatus;
  label: string;
  blockers: number;
  warnings: number;
  recoverableMedia: number;
  reconnectRequiredMedia: number;
  missingLayerCount: number;
  reviewItems: number;
  emptyTimeline: boolean;
  details: string[];
}

export interface ProjectLibraryHealthReport {
  total: number;
  ready: number;
  attention: number;
  blocked: number;
  recoverableMedia: number;
  reconnectRequiredMedia: number;
  reviewItems: number;
}

export function createProjectHealthSummary(record: LocalProjectRecord): ProjectHealthSummary {
  const mediaHealth = createMediaHealthReport(record.project, record.mediaAssets);
  const reviewSummary = createProjectReviewSummary(record.project);
  const reviewItems = reviewSummary.needsReview + reviewSummary.changesRequested;
  const emptyTimeline = record.project.layers.length === 0;
  const reconnectRequiredMedia = mediaHealth.reconnectRequiredAssets;
  const recoverableMedia = mediaHealth.recoverableAssets;
  const blockers = reconnectRequiredMedia;
  const warnings = recoverableMedia + reviewItems + (emptyTimeline ? 1 : 0);
  const status: ProjectHealthStatus = blockers > 0 ? "blocked" : warnings > 0 ? "attention" : "ready";

  return {
    status,
    label: projectHealthLabel(status),
    blockers,
    warnings,
    recoverableMedia,
    reconnectRequiredMedia,
    missingLayerCount: mediaHealth.missingLayerCount,
    reviewItems,
    emptyTimeline,
    details: projectHealthDetails({
      reconnectRequiredMedia,
      recoverableMedia,
      missingLayerCount: mediaHealth.missingLayerCount,
      reviewItems,
      emptyTimeline,
    }),
  };
}

export function createProjectLibraryHealthReport(records: LocalProjectRecord[]): ProjectLibraryHealthReport {
  const summaries = records.map(createProjectHealthSummary);

  return {
    total: summaries.length,
    ready: summaries.filter((summary) => summary.status === "ready").length,
    attention: summaries.filter((summary) => summary.status === "attention").length,
    blocked: summaries.filter((summary) => summary.status === "blocked").length,
    recoverableMedia: summaries.reduce((count, summary) => count + summary.recoverableMedia, 0),
    reconnectRequiredMedia: summaries.reduce((count, summary) => count + summary.reconnectRequiredMedia, 0),
    reviewItems: summaries.reduce((count, summary) => count + summary.reviewItems, 0),
  };
}

export function projectHealthLabel(status: ProjectHealthStatus) {
  if (status === "blocked") return "Blocked";
  if (status === "attention") return "Attention";
  return "Ready";
}

function projectHealthDetails({
  reconnectRequiredMedia,
  recoverableMedia,
  missingLayerCount,
  reviewItems,
  emptyTimeline,
}: {
  reconnectRequiredMedia: number;
  recoverableMedia: number;
  missingLayerCount: number;
  reviewItems: number;
  emptyTimeline: boolean;
}) {
  const details: string[] = [];
  if (reconnectRequiredMedia > 0) details.push(`${reconnectRequiredMedia} ${reconnectRequiredMedia === 1 ? "asset" : "assets"} need reconnecting`);
  if (recoverableMedia > 0) details.push(`${recoverableMedia} ${recoverableMedia === 1 ? "asset" : "assets"} recover on open`);
  if (missingLayerCount > 0) details.push(`${missingLayerCount} ${missingLayerCount === 1 ? "layer" : "layers"} affected`);
  if (reviewItems > 0) details.push(`${reviewItems} ${reviewItems === 1 ? "review item" : "review items"}`);
  if (emptyTimeline) details.push("Empty timeline");
  return details;
}
