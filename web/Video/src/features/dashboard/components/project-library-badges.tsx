import { Folder, History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  projectReviewStatusLabels,
  type ProjectReviewSummary,
  type ProjectReviewSummaryStatus,
} from "@/lib/editor/project-review-summary";
import type { ProjectFolder } from "@/lib/projects/collaboration-store";

export function ProjectReviewBadge({ summary }: { summary: ProjectReviewSummary }) {
  return (
    <Badge variant={reviewBadgeVariant(summary.status)}>
      {projectReviewStatusLabels[summary.status]}
      {summary.status === "clean" ? "" : ` ${reviewBadgeCount(summary)}`}
    </Badge>
  );
}

export function ProjectFolderBadge({ folder }: { folder?: ProjectFolder }) {
  return (
    <Badge variant={folder ? "outline" : "secondary"}>
      <Folder className="mr-1 size-3" />
      {folder?.name ?? "None"}
    </Badge>
  );
}

export function SnapshotCountBadge({ count }: { count: number }) {
  return (
    <Badge variant={count > 0 ? "outline" : "secondary"}>
      <History className="mr-1 size-3" />
      {count}
    </Badge>
  );
}

function reviewBadgeVariant(status: ProjectReviewSummaryStatus) {
  if (status === "changes-requested") return "destructive";
  if (status === "needs-review" || status === "approved") return "default";
  return "outline";
}

function reviewBadgeCount(summary: ProjectReviewSummary) {
  if (summary.status === "changes-requested") return summary.changesRequested;
  if (summary.status === "needs-review") return summary.needsReview;
  if (summary.status === "notes") return summary.withNotes;
  if (summary.status === "approved") return summary.approved;
  return 0;
}
