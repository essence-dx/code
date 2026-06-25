import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type {
  DesignTemplateSummary,
  ProjectSummary,
  ProjectVersionSummary,
} from "@/features/editor/types";
import {
  templateMarketplaceStatusLabels,
  type TemplateMarketplaceStatus,
} from "@/features/templates/template-marketplace";
import type {
  MarketplaceCreatorModerationPriority,
  MarketplaceCreatorOperationStatus,
  MarketplaceCreatorOperationsInput,
  MarketplaceCreatorSubmission,
  MarketplaceCreatorSubmissionStage,
  MarketplaceCreatorVersionEvent,
} from "@/features/templates/marketplace-creator-operations-types";

export function createSubmissionStage(
  template: DesignTemplateSummary,
): MarketplaceCreatorSubmissionStage {
  if (template.approvalStatus === "changes-requested")
    return "changes-requested";
  if (template.marketplaceStatus === "published") return "published";
  if (
    template.marketplaceStatus === "review" ||
    template.approvalStatus === "in-review"
  ) {
    return "review";
  }
  if (template.approvalStatus === "approved") return "approved";

  return "draft";
}

export function createFallbackVersion(input: {
  template: DesignTemplateSummary;
  projectVersions: ProjectVersionSummary[];
}) {
  const major =
    input.template.marketplaceStatus === "published" ||
    input.template.approvalStatus === "approved"
      ? 1
      : 0;
  const minor =
    Date.parse(input.template.updatedAt) >
    Date.parse(input.template.createdAt) + 60_000
      ? 1
      : 0;
  const patch = Math.min(
    99,
    input.projectVersions.filter(
      (version) => version.projectId === input.template.id,
    ).length,
  );

  return `${major}.${minor}.${patch}`;
}

export function findRelatedProjects(
  template: DesignTemplateSummary,
  projects: ProjectSummary[],
) {
  return projects.filter((project) => {
    if (project.sourceProjectId === template.id) return true;
    if (namesMatch(template.name, project.name)) return true;

    return false;
  });
}

export function auditLogMatchesTemplate(
  log: WorkspaceAuditLogSummary,
  template: DesignTemplateSummary,
) {
  return (
    log.targetId === template.id ||
    namesMatch(template.name, log.summary) ||
    namesMatch(template.id, log.summary)
  );
}

export function createCreatorDetail(template: DesignTemplateSummary) {
  if (template.creatorName && template.creatorEmail) {
    return `${template.creatorName} (${template.creatorEmail})`;
  }
  if (template.creatorName) return template.creatorName;
  if (template.creatorEmail) return template.creatorEmail;

  return "Unassigned creator";
}

export function stageScore(template: DesignTemplateSummary) {
  if (template.marketplaceStatus === "published") return 100;
  if (template.approvalStatus === "approved") return 82;
  if (
    template.marketplaceStatus === "review" ||
    template.approvalStatus === "in-review"
  ) {
    return 62;
  }
  if (template.approvalStatus === "changes-requested") return 20;

  return 38;
}

export function statusScore(status: MarketplaceCreatorOperationStatus) {
  if (status === "ready") return 100;
  if (status === "review") return 65;

  return 20;
}

export function scoreToStatus(
  score: number,
  hasBlocked: boolean,
): MarketplaceCreatorOperationStatus {
  if (hasBlocked || score < 50) return "blocked";
  if (score < 85) return "review";

  return "ready";
}

export function average(values: number[], fallback = 0) {
  if (!values.length) return fallback;

  return clampScore(
    Math.round(
      values.reduce((total, value) => total + value, 0) / values.length,
    ),
  );
}

export function conversionRate(template: DesignTemplateSummary) {
  if (!template.marketplaceViewCount) return 0;

  return Math.round(
    (template.marketplaceUseCount / template.marketplaceViewCount) * 100,
  );
}

export function compareSubmissions(
  left: MarketplaceCreatorSubmission,
  right: MarketplaceCreatorSubmission,
) {
  return (
    statusWeight(left.status) - statusWeight(right.status) ||
    priorityWeight(left.moderationRoute.priority) -
      priorityWeight(right.moderationRoute.priority) ||
    left.score - right.score ||
    right.stats.openTasks - left.stats.openTasks ||
    left.templateName.localeCompare(right.templateName)
  );
}

export function namesMatch(left: string, right: string) {
  const normalizedLeft = normalizeLookup(left);
  const normalizedRight = normalizeLookup(right);

  return (
    normalizedLeft.length >= 4 &&
    normalizedRight.length >= 4 &&
    (normalizedLeft.includes(normalizedRight) ||
      normalizedRight.includes(normalizedLeft))
  );
}

export function normalizeLookup(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeDate(value: MarketplaceCreatorOperationsInput["now"]) {
  if (!value) return new Date();
  if (value instanceof Date) return value;

  return new Date(value);
}

export function slugify(value: string) {
  return (
    normalizeLookup(value)
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "marketplace-submission"
  );
}

export function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function uniqueEvents(events: MarketplaceCreatorVersionEvent[]) {
  const seen = new Set<string>();

  return events.filter((event) => {
    const key = `${event.id}:${event.createdAt}:${event.detail}`;
    if (seen.has(key)) return false;
    seen.add(key);

    return true;
  });
}

export function getMarketplaceCreatorStatusLabel(
  status: MarketplaceCreatorOperationStatus,
) {
  if (status === "ready") return "Ready";
  if (status === "review") return "Review";

  return "Blocked";
}

export function getMarketplaceCreatorMarketplaceLabel(
  status: TemplateMarketplaceStatus,
) {
  return templateMarketplaceStatusLabels[status];
}

function statusWeight(status: MarketplaceCreatorOperationStatus) {
  if (status === "blocked") return 0;
  if (status === "review") return 1;

  return 2;
}

function priorityWeight(priority: MarketplaceCreatorModerationPriority) {
  if (priority === "high") return 0;
  if (priority === "medium") return 1;

  return 2;
}
