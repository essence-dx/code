import type { ReviewTaskSummary } from "@/db/project-comments";
import type { DesignTemplateSummary } from "@/features/editor/types";
import type {
  MarketplaceCreatorLicenseEvidence,
  MarketplaceCreatorModerationPriority,
  MarketplaceCreatorModerationQueue,
  MarketplaceCreatorModerationRoute,
  MarketplaceCreatorOperationStatus,
  MarketplaceCreatorRollbackPlan,
  MarketplaceCreatorSubmission,
  MarketplaceCreatorTrustScore,
} from "@/features/templates/marketplace-creator-operations-types";
import { compareSubmissions } from "@/features/templates/marketplace-creator-operations-utils";

export function createModerationRoute(input: {
  template: DesignTemplateSummary;
  status: MarketplaceCreatorOperationStatus;
  trustScore: MarketplaceCreatorTrustScore;
  licenseEvidence: MarketplaceCreatorLicenseEvidence;
  rollbackPlan: MarketplaceCreatorRollbackPlan;
  openTasks: ReviewTaskSummary[];
}): MarketplaceCreatorModerationRoute {
  if (input.licenseEvidence.status === "blocked") {
    return createRoute({
      template: input.template,
      queue: "license-review",
      status: input.status,
      priority: "high",
      owner: "creator",
      reason: input.licenseEvidence.gaps[0] ?? input.licenseEvidence.summary,
      tasks: input.openTasks,
    });
  }

  if (input.trustScore.status === "blocked") {
    return createRoute({
      template: input.template,
      queue: "trust-safety",
      status: input.status,
      priority: "high",
      owner: "curator",
      reason: input.trustScore.signals.at(-1) ?? input.trustScore.summary,
      tasks: input.openTasks,
    });
  }

  if (input.rollbackPlan.status === "blocked") {
    return createRoute({
      template: input.template,
      queue: "rollback-readiness",
      status: input.status,
      priority: "medium",
      owner: "ops",
      reason: input.rollbackPlan.summary,
      tasks: input.openTasks,
    });
  }

  if (input.openTasks.length || input.template.marketplaceStatus === "review") {
    return createRoute({
      template: input.template,
      queue: "curator-review",
      status: input.status,
      priority: input.openTasks.length ? "medium" : "low",
      owner: "curator",
      reason:
        input.openTasks[0]?.body ??
        "Curator review is still open for this marketplace submission.",
      tasks: input.openTasks,
    });
  }

  if (input.status === "review") {
    return createRoute({
      template: input.template,
      queue: "creator-support",
      status: input.status,
      priority: "low",
      owner: "creator",
      reason: "Creator operations need one more review pass before release.",
      tasks: input.openTasks,
    });
  }

  return createRoute({
    template: input.template,
    queue: "release-ready",
    status: input.status,
    priority: "low",
    owner: "ops",
    reason: "Submission has trust, license, rollback, and version evidence.",
    tasks: input.openTasks,
  });
}

export function createCenterNextActions(
  submissions: MarketplaceCreatorSubmission[],
) {
  if (!submissions.length) {
    return [
      "Create a marketplace template submission with creator, license, and rollback evidence.",
    ];
  }

  return submissions
    .filter((submission) => submission.status !== "ready")
    .sort(compareSubmissions)
    .map(
      (submission) =>
        `${submission.templateName}: ${submission.moderationRoute.reason}`,
    )
    .slice(0, 5);
}

function createRoute(input: {
  template: DesignTemplateSummary;
  queue: MarketplaceCreatorModerationQueue;
  status: MarketplaceCreatorOperationStatus;
  priority: MarketplaceCreatorModerationPriority;
  owner: MarketplaceCreatorModerationRoute["owner"];
  reason: string;
  tasks: ReviewTaskSummary[];
}): MarketplaceCreatorModerationRoute {
  return {
    id: `${input.template.id}-${input.queue}`,
    templateId: input.template.id,
    templateName: input.template.name,
    queue: input.queue,
    queueLabel: moderationQueueLabels[input.queue],
    priority: input.priority,
    status: input.status,
    owner: input.owner,
    reason: input.reason,
    relatedTaskIds: input.tasks.map((task) => task.id),
    dueAt:
      input.tasks
        .map((task) => task.taskDueAt)
        .filter((value): value is string => Boolean(value))
        .sort((left, right) => Date.parse(left) - Date.parse(right))[0] ?? null,
  };
}

const moderationQueueLabels: Record<MarketplaceCreatorModerationQueue, string> =
  {
    "release-ready": "Release ready",
    "license-review": "License review",
    "trust-safety": "Trust and safety",
    "rollback-readiness": "Rollback readiness",
    "curator-review": "Curator review",
    "creator-support": "Creator support",
  };
