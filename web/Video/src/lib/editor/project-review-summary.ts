import type { EditorProject, LayerReviewStatus, TimelineLayer } from "@/lib/editor/types";

export type ProjectReviewSummaryStatus = "clean" | "notes" | "needs-review" | "changes-requested" | "approved";

export interface ProjectReviewSummary {
  status: ProjectReviewSummaryStatus;
  needsReview: number;
  changesRequested: number;
  approved: number;
  withNotes: number;
}

export const projectReviewStatusLabels: Record<ProjectReviewSummaryStatus, string> = {
  clean: "Clean",
  notes: "Notes",
  "needs-review": "Review",
  "changes-requested": "Changes",
  approved: "Approved",
};

export function createProjectReviewSummary(project: EditorProject): ProjectReviewSummary {
  const counts = project.layers.reduce(
    (summary, layer) => ({
      needsReview: summary.needsReview + countStatus(layer, "needs-review"),
      changesRequested: summary.changesRequested + countStatus(layer, "changes-requested"),
      approved: summary.approved + countStatus(layer, "approved"),
      withNotes: summary.withNotes + (layer.notes?.trim() ? 1 : 0),
    }),
    { needsReview: 0, changesRequested: 0, approved: 0, withNotes: 0 },
  );

  return {
    ...counts,
    status: reviewStatusFromCounts(counts),
  };
}

function countStatus(layer: TimelineLayer, status: LayerReviewStatus) {
  return layer.reviewStatus === status ? 1 : 0;
}

function reviewStatusFromCounts(counts: Omit<ProjectReviewSummary, "status">): ProjectReviewSummaryStatus {
  if (counts.changesRequested > 0) return "changes-requested";
  if (counts.needsReview > 0) return "needs-review";
  if (counts.withNotes > 0) return "notes";
  if (counts.approved > 0) return "approved";
  return "clean";
}
