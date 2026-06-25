import type { ContentScheduleSummary } from "@/db/content-planner";
import type { ReviewTaskSummary } from "@/db/project-comments";
import type { AssetLibraryAudit } from "@/features/assets/asset-library-audit";
import { formatAssetBytes } from "@/features/assets/asset-library-audit";
import type { ServerExportJobSummary } from "@/features/editor/server-export-job-model";
import type {
  DesignTemplateSummary,
  ProjectSummary,
} from "@/features/editor/types";
import { approvalStatusLabels } from "@/features/review/approval-status";
import { templateMarketplaceStatusLabels } from "@/features/templates/template-marketplace";

export type WorkspaceCommandKind =
  | "project"
  | "asset"
  | "template"
  | "comment"
  | "task"
  | "export"
  | "planner"
  | "filter";

export type WorkspaceCommandStatus = "ready" | "review" | "blocked";

export type WorkspaceCommandItem = {
  id: string;
  kind: WorkspaceCommandKind;
  kindLabel: string;
  title: string;
  detail: string;
  href: string | null;
  status: WorkspaceCommandStatus;
  badge: string;
  updatedAt: string;
  commandLabel: string;
  searchText: string;
};

export type WorkspaceSavedFilter = WorkspaceCommandItem & {
  kind: "filter";
  query: string;
  resultCount: number;
};

export type WorkspaceCommandCenter = {
  status: WorkspaceCommandStatus;
  score: number;
  items: WorkspaceCommandItem[];
  savedFilters: WorkspaceSavedFilter[];
  recommendedCommands: WorkspaceCommandItem[];
  totals: {
    projects: number;
    assets: number;
    templates: number;
    comments: number;
    tasks: number;
    exports: number;
    savedFilters: number;
    searchableItems: number;
  };
};

export function createWorkspaceCommandCenter(input: {
  projects: ProjectSummary[];
  assetAudit: AssetLibraryAudit;
  templates: DesignTemplateSummary[];
  reviewTasks: ReviewTaskSummary[];
  serverExportJobs: ServerExportJobSummary[];
  contentScheduleItems: ContentScheduleSummary[];
}): WorkspaceCommandCenter {
  const activeProjects = input.projects.filter((project) => !project.deletedAt);
  const baseItems = [
    ...activeProjects.map(createProjectItem),
    ...input.assetAudit.records.map(createAssetItem),
    ...input.templates.map(createTemplateItem),
    ...input.reviewTasks.map(createCommentOrTaskItem),
    ...input.serverExportJobs.map(createExportItem),
    ...input.contentScheduleItems.map(createPlannerItem),
  ].sort(compareItems);
  const savedFilters = createSavedFilters(baseItems);
  const items = [...baseItems, ...savedFilters].sort(compareItems);
  const categoryCoverage = new Set(baseItems.map((item) => item.kind)).size;
  const blockedItems = baseItems.filter((item) => item.status === "blocked");
  const reviewItems = baseItems.filter((item) => item.status === "review");
  const score = clampScore(
    Math.round((categoryCoverage / 6) * 70) +
      Math.min(20, savedFilters.length * 4) +
      (baseItems.length ? 10 : 0) -
      Math.min(35, blockedItems.length * 5) -
      Math.min(20, reviewItems.length * 2),
  );

  return {
    status: scoreToStatus(score, blockedItems.length > 0),
    score,
    items,
    savedFilters,
    recommendedCommands: createRecommendedCommands(baseItems),
    totals: {
      projects: activeProjects.length,
      assets: input.assetAudit.records.length,
      templates: input.templates.length,
      comments: input.reviewTasks.filter((task) => task.taskStatus === "none")
        .length,
      tasks: input.reviewTasks.filter((task) => task.taskStatus !== "none")
        .length,
      exports: input.serverExportJobs.length,
      savedFilters: savedFilters.length,
      searchableItems: items.length,
    },
  };
}

export function filterWorkspaceCommandItems(
  items: WorkspaceCommandItem[],
  query: string,
) {
  const tokens = tokenize(query);

  if (!tokens.length) return items.slice(0, 14);

  return items
    .map((item) => ({
      item,
      score: createSearchScore(item, tokens),
    }))
    .filter((candidate) => candidate.score > 0)
    .sort(
      (left, right) =>
        right.score - left.score ||
        statusWeight(left.item.status) - statusWeight(right.item.status) ||
        Date.parse(right.item.updatedAt) - Date.parse(left.item.updatedAt) ||
        left.item.title.localeCompare(right.item.title),
    )
    .map((candidate) => candidate.item)
    .slice(0, 20);
}

function createProjectItem(project: ProjectSummary): WorkspaceCommandItem {
  return createItem({
    id: `project-${project.id}`,
    kind: "project",
    kindLabel: "Project",
    title: project.name,
    detail: `${project.width} x ${project.height} design with ${approvalStatusLabels[project.approvalStatus]} approval.`,
    href: `/editor/${project.id}`,
    status: createApprovalStatus(project.approvalStatus),
    badge: approvalStatusLabels[project.approvalStatus],
    updatedAt: project.updatedAt,
    commandLabel: "Open project",
    extraSearch: [
      project.variantName,
      project.variantProfileId,
      project.publicShareId ? "public share" : "",
      project.editShareId ? "edit share" : "",
    ],
  });
}

function createAssetItem(
  asset: AssetLibraryAudit["records"][number],
): WorkspaceCommandItem {
  const blocked =
    asset.skippedReferenceCount !== null && asset.skippedReferenceCount > 0;

  return createItem({
    id: `asset-${asset.scope}-${asset.id}`,
    kind: "asset",
    kindLabel: "Asset",
    title: asset.name,
    detail: `${asset.scopeLabel} asset, ${formatAssetBytes(asset.sizeBytes)}, ${asset.mimeType}.`,
    href: asset.href,
    status: blocked ? "blocked" : asset.duplicateKey ? "review" : "ready",
    badge: blocked
      ? "Missing references"
      : asset.duplicateKey
        ? "Duplicate check"
        : asset.scopeLabel,
    updatedAt: asset.updatedAt,
    commandLabel: asset.href ? "Open asset source" : "Review asset",
    extraSearch: [
      asset.scope,
      asset.mimeType,
      asset.sourceProvider,
      asset.licenseName,
      asset.authorName,
    ],
  });
}

function createTemplateItem(
  template: DesignTemplateSummary,
): WorkspaceCommandItem {
  return createItem({
    id: `template-${template.id}`,
    kind: "template",
    kindLabel: "Template",
    title: template.name,
    detail: `${template.width} x ${template.height} ${templateMarketplaceStatusLabels[template.marketplaceStatus]} template.`,
    href: `/templates/${template.id}`,
    status:
      template.marketplaceStatus === "published" ||
      template.approvalStatus === "approved"
        ? "ready"
        : template.approvalStatus === "changes-requested"
          ? "blocked"
          : "review",
    badge: templateMarketplaceStatusLabels[template.marketplaceStatus],
    updatedAt: template.updatedAt,
    commandLabel: "Open template",
    extraSearch: [
      template.creatorName,
      template.creatorEmail,
      template.marketplaceCollection,
      template.marketplaceSeason,
      template.isBrandTemplate ? "brand template" : "",
      template.isTeamTemplate ? "team template" : "",
    ],
  });
}

function createCommentOrTaskItem(task: ReviewTaskSummary): WorkspaceCommandItem {
  const isTask = task.taskStatus !== "none";
  const blocked =
    isTask &&
    task.taskDueAt !== null &&
    task.taskStatus !== "done" &&
    Date.parse(task.taskDueAt) < Date.now();

  return createItem({
    id: `${isTask ? "task" : "comment"}-${task.id}`,
    kind: isTask ? "task" : "comment",
    kindLabel: isTask ? "Task" : "Comment",
    title: isTask
      ? `${task.projectName}: ${task.taskStatus}`
      : `${task.projectName}: comment`,
    detail: task.body,
    href: `/editor/${task.projectId}`,
    status: blocked
      ? "blocked"
      : task.resolved || task.taskStatus === "done"
        ? "ready"
        : "review",
    badge: blocked ? "Overdue" : isTask ? task.taskStatus : "Comment",
    updatedAt: task.updatedAt,
    commandLabel: isTask ? "Open task" : "Open comment",
    extraSearch: [
      task.projectName,
      task.authorName,
      task.taskAssigneeName,
      task.taskDueAt,
      task.resolved ? "resolved" : "open",
    ],
  });
}

function createExportItem(job: ServerExportJobSummary): WorkspaceCommandItem {
  return createItem({
    id: `export-${job.id}`,
    kind: "export",
    kindLabel: "Export",
    title: `${job.projectName} ${job.formatLabel}`,
    detail:
      job.status === "failed"
        ? job.failureMessage ?? "Export failed."
        : `${job.fileName} is ${job.status} at ${job.progress}%.`,
    href: `/editor/${job.projectId}`,
    status:
      job.status === "completed"
        ? "ready"
        : job.status === "failed"
          ? "blocked"
          : "review",
    badge: job.status,
    updatedAt: job.updatedAt,
    commandLabel: job.status === "completed" ? "Open export source" : "Review export",
    extraSearch: [job.format, job.formatLabel, job.fileName, job.artifactName],
  });
}

function createPlannerItem(item: ContentScheduleSummary): WorkspaceCommandItem {
  return createItem({
    id: `planner-${item.id}`,
    kind: "planner",
    kindLabel: "Planner",
    title: item.title,
    detail: `${item.channel} item scheduled for ${formatDate(item.scheduledAt)}.`,
    href: item.projectId ? `/editor/${item.projectId}` : null,
    status:
      item.status === "published"
        ? "ready"
        : item.status === "cancelled"
          ? "blocked"
          : "review",
    badge: item.status,
    updatedAt: item.updatedAt,
    commandLabel: "Open scheduled item",
    extraSearch: [item.projectName, item.channel, item.caption, "planner"],
  });
}

function createSavedFilters(items: WorkspaceCommandItem[]): WorkspaceSavedFilter[] {
  const filterDefinitions = [
    {
      id: "review-work",
      title: "Needs review",
      query: "review open in-review changes requested",
      detail: "Open comments, in-review projects, and draft package work.",
      match: (item: WorkspaceCommandItem) => item.status === "review",
    },
    {
      id: "blocked-work",
      title: "Blocked work",
      query: "blocked failed overdue missing",
      detail: "Failed exports, overdue tasks, and blocked assets.",
      match: (item: WorkspaceCommandItem) => item.status === "blocked",
    },
    {
      id: "published-templates",
      title: "Published templates",
      query: "published template marketplace",
      detail: "Published templates and marketplace-ready starter packages.",
      match: (item: WorkspaceCommandItem) =>
        item.kind === "template" && item.searchText.includes("published"),
    },
    {
      id: "completed-exports",
      title: "Completed exports",
      query: "completed export artifact download",
      detail: "Completed export jobs ready for reuse or handoff.",
      match: (item: WorkspaceCommandItem) =>
        item.kind === "export" && item.status === "ready",
    },
    {
      id: "asset-review",
      title: "Asset review",
      query: "asset duplicate license missing references",
      detail: "Asset records that need cleanup or provenance review.",
      match: (item: WorkspaceCommandItem) =>
        item.kind === "asset" && item.status !== "ready",
    },
  ];

  return filterDefinitions.map((filter) => {
    const resultCount = items.filter(filter.match).length;

    return createItem({
      id: `filter-${filter.id}`,
      kind: "filter",
      kindLabel: "Saved filter",
      title: filter.title,
      detail: `${filter.detail} ${resultCount} matching item${resultCount === 1 ? "" : "s"}.`,
      href: null,
      status: resultCount ? "review" : "ready",
      badge: `${resultCount} results`,
      updatedAt: new Date(0).toISOString(),
      commandLabel: "Apply filter",
      extraSearch: [filter.query, "saved filter"],
    }) as WorkspaceSavedFilter;
  }).map((item, index) => ({
    ...item,
    query: filterDefinitions[index]?.query ?? "",
    resultCount: Number.parseInt(item.badge, 10) || 0,
  }));
}

function createRecommendedCommands(items: WorkspaceCommandItem[]) {
  return items
    .filter((item) => item.status !== "ready")
    .sort(
      (left, right) =>
        statusWeight(left.status) - statusWeight(right.status) ||
        Date.parse(right.updatedAt) - Date.parse(left.updatedAt) ||
        left.title.localeCompare(right.title),
    )
    .slice(0, 6);
}

function createItem(input: {
  id: string;
  kind: WorkspaceCommandKind;
  kindLabel: string;
  title: string;
  detail: string;
  href: string | null;
  status: WorkspaceCommandStatus;
  badge: string;
  updatedAt: string;
  commandLabel: string;
  extraSearch?: Array<string | null | undefined>;
}): WorkspaceCommandItem {
  const searchParts = [
    input.kind,
    input.kindLabel,
    input.title,
    input.detail,
    input.status,
    input.badge,
    input.commandLabel,
    ...(input.extraSearch ?? []),
  ];

  return {
    id: input.id,
    kind: input.kind,
    kindLabel: input.kindLabel,
    title: input.title,
    detail: input.detail,
    href: input.href,
    status: input.status,
    badge: input.badge,
    updatedAt: input.updatedAt,
    commandLabel: input.commandLabel,
    searchText: normalizeSearchText(searchParts.filter(Boolean).join(" ")),
  };
}

function createSearchScore(item: WorkspaceCommandItem, tokens: string[]) {
  return tokens.reduce((score, token) => {
    if (normalizeSearchText(item.title).includes(token)) return score + 8;
    if (item.searchText.includes(token)) return score + 3;

    return score;
  }, 0);
}

function tokenize(query: string) {
  return normalizeSearchText(query).split(" ").filter(Boolean);
}

function normalizeSearchText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function createApprovalStatus(
  status: ProjectSummary["approvalStatus"],
): WorkspaceCommandStatus {
  if (status === "approved") return "ready";
  if (status === "changes-requested") return "blocked";

  return "review";
}

function compareItems(left: WorkspaceCommandItem, right: WorkspaceCommandItem) {
  return (
    statusWeight(left.status) - statusWeight(right.status) ||
    Date.parse(right.updatedAt) - Date.parse(left.updatedAt) ||
    left.kind.localeCompare(right.kind) ||
    left.title.localeCompare(right.title)
  );
}

function scoreToStatus(
  score: number,
  hasBlocked: boolean,
): WorkspaceCommandStatus {
  if (hasBlocked || score < 50) return "blocked";
  if (score < 85) return "review";

  return "ready";
}

function statusWeight(status: WorkspaceCommandStatus) {
  if (status === "blocked") return 0;
  if (status === "review") return 1;

  return 2;
}

function clampScore(score: number) {
  return Math.max(0, Math.min(100, score));
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
  });
}
