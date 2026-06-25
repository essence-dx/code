import type { PostDeploySyntheticDashboardSummary } from "@/features/deployment/post-deploy-synthetic-dashboard";
import type { ReleaseDeploymentChecklist } from "@/features/deployment/release-deployment-checklist";
import { APP_PACKAGE_PRESETS } from "@/features/projects/app-package-export";
import { getProjectReviewGate } from "@/features/projects/project-review-gates";
import { projectReviewSurfaceKeys, projectReviewSurfaceLabels, resolveShareSettings, type ProjectReviewSurface, type ShareSettings } from "@/features/projects/share-settings";
import {
  workspaceReleaseCalendarMilestoneKinds,
  type WorkspaceReleaseCalendarMilestoneKind,
  type WorkspaceReleaseCalendarMilestoneSource,
  type WorkspaceReleaseCalendarMilestoneStatus,
} from "@/features/workspaces/types";

type DateLike = Date | string | null | undefined;

export interface WorkspaceReleaseCalendarProject {
  archivedAt: DateLike;
  id: string;
  name: string;
  publishedAt: DateLike;
  shareSettings: ShareSettings | null;
  updatedAt: DateLike;
}

export interface WorkspaceReleaseCalendarMilestone {
  actionLabel: string;
  blockerCount: number;
  completedAt: string | null;
  detail: string;
  dueAt: string;
  id: string;
  kind: WorkspaceReleaseCalendarMilestoneKind;
  projectId: string | null;
  projectName: string | null;
  source: WorkspaceReleaseCalendarMilestoneSource;
  sourceKey: string;
  status: WorkspaceReleaseCalendarMilestoneStatus;
  title: string;
}

export interface WorkspaceReleaseCalendarReport {
  generatedAt: string;
  milestones: WorkspaceReleaseCalendarMilestone[];
  summary: {
    appPackageCount: number;
    blockedCount: number;
    desktopChannelCount: number;
    doneCount: number;
    dueCount: number;
    nextMilestoneAt: string | null;
    postDeployCount: number;
    reviewGateCount: number;
    scheduledCount: number;
    totalCount: number;
  };
}

export interface WorkspaceReleaseCalendarInput {
  now?: Date;
  postDeploySummary?: PostDeploySyntheticDashboardSummary | null;
  projects: WorkspaceReleaseCalendarProject[];
  releaseReadinessChecklist?: ReleaseDeploymentChecklist | null;
  workspaceId: string;
}

const reviewDueOffsetDays: Record<ProjectReviewSurface, number> = {
  appPackage: 2,
  desktopRelease: 2,
  embed: 1,
  publicLink: 1,
};

const desktopChannels = [
  { dueOffsetDays: 5, label: "Stable", sourceKey: "desktop-channel:stable" },
  { dueOffsetDays: 3, label: "Beta", sourceKey: "desktop-channel:beta" },
  { dueOffsetDays: 1, label: "Nightly", sourceKey: "desktop-channel:nightly" },
] as const;

const statusRank: Record<WorkspaceReleaseCalendarMilestoneStatus, number> = {
  blocked: 0,
  due: 1,
  scheduled: 2,
  done: 3,
};

function toDate(value: DateLike) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function toIso(value: DateLike) {
  return toDate(value)?.toISOString() ?? null;
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function milestoneDueAt(base: DateLike, fallback: Date, offsetDays = 0) {
  return addDays(toDate(base) ?? fallback, offsetDays).toISOString();
}

function statusFromReviewGate(status: string, approvedStatus: WorkspaceReleaseCalendarMilestoneStatus = "done"): WorkspaceReleaseCalendarMilestoneStatus {
  if (status === "approved") {
    return approvedStatus;
  }

  if (status === "changesRequested") {
    return "blocked";
  }

  return status === "requested" ? "due" : "scheduled";
}

function createMilestone(input: Omit<WorkspaceReleaseCalendarMilestone, "id">): WorkspaceReleaseCalendarMilestone {
  return {
    ...input,
    id: `${input.source}:${input.sourceKey}`,
  };
}

function createReviewGateMilestones(input: WorkspaceReleaseCalendarInput, now: Date) {
  return input.projects.flatMap((project) => {
    if (project.archivedAt) {
      return [];
    }

    const settings = resolveShareSettings(project.shareSettings);

    return projectReviewSurfaceKeys.map((surface) => {
      const decision = settings.reviewWorkflow[surface];
      const gate = getProjectReviewGate(settings, surface);
      const status = statusFromReviewGate(decision.status);
      const dueAt = status === "scheduled" ? milestoneDueAt(project.updatedAt, now, reviewDueOffsetDays[surface]) : milestoneDueAt(decision.updatedAt ?? project.updatedAt, now);

      return createMilestone({
        actionLabel: gate.allowed ? "Approved" : "Open review workflow",
        blockerCount: status === "blocked" ? 1 : 0,
        completedAt: status === "done" ? (toIso(decision.updatedAt) ?? toIso(project.updatedAt)) : null,
        detail: gate.message,
        dueAt,
        kind: "review-gate",
        projectId: project.id,
        projectName: project.name,
        source: "review-workflow",
        sourceKey: `${project.id}:review-gate:${surface}`,
        status,
        title: `${projectReviewSurfaceLabels[surface]} review`,
      });
    });
  });
}

function createAppPackageMilestones(input: WorkspaceReleaseCalendarInput, now: Date) {
  return input.projects.flatMap((project) => {
    if (project.archivedAt) {
      return [];
    }

    const settings = resolveShareSettings(project.shareSettings);
    const decision = settings.reviewWorkflow.appPackage;
    const gate = getProjectReviewGate(settings, "appPackage");
    const status = statusFromReviewGate(decision.status);

    return [
      createMilestone({
        actionLabel: gate.allowed ? "Export app package" : "Approve package gate",
        blockerCount: status === "blocked" ? 1 : 0,
        completedAt: status === "done" ? (toIso(decision.updatedAt) ?? toIso(project.updatedAt)) : null,
        detail: gate.allowed ? `${APP_PACKAGE_PRESETS.length} package presets are available for this scene.` : gate.message,
        dueAt: status === "scheduled" ? milestoneDueAt(project.updatedAt, now, 2) : milestoneDueAt(decision.updatedAt ?? project.updatedAt, now),
        kind: "app-package",
        projectId: project.id,
        projectName: project.name,
        source: "app-package-export",
        sourceKey: `${project.id}:app-package`,
        status,
        title: "App package export",
      }),
    ];
  });
}

function createDesktopChannelMilestones(input: WorkspaceReleaseCalendarInput, now: Date) {
  const activeProjects = input.projects.filter((project) => !project.archivedAt);
  const blockedDesktopProjects = activeProjects.filter((project) => !getProjectReviewGate(project.shareSettings, "desktopRelease").allowed);
  const checklist = input.releaseReadinessChecklist;
  const readinessBlockers = checklist?.blockerCount ?? 0;
  const readinessWarnings = checklist?.warningCount ?? 0;
  const blockerCount = readinessBlockers + blockedDesktopProjects.length;
  const baseStatus: WorkspaceReleaseCalendarMilestoneStatus =
    blockerCount > 0 ? "blocked" : !checklist || readinessWarnings > 0 ? "due" : "scheduled";
  const checklistDetail = checklist
    ? `${checklist.summary} ${readinessBlockers} deployment blockers and ${readinessWarnings} warnings.`
    : "Run the deployment readiness checklist before promoting desktop channels.";
  const projectDetail =
    blockedDesktopProjects.length > 0
      ? `${blockedDesktopProjects.length} project${blockedDesktopProjects.length === 1 ? "" : "s"} still need desktop release approval.`
      : "Desktop release review gates are clear for active projects.";

  return desktopChannels.map((channel) =>
    createMilestone({
      actionLabel: baseStatus === "blocked" ? "Resolve blockers" : "Prepare channel",
      blockerCount,
      completedAt: null,
      detail: `${checklistDetail} ${projectDetail}`,
      dueAt: milestoneDueAt(checklist?.generatedAt, now, channel.dueOffsetDays),
      kind: "desktop-channel",
      projectId: null,
      projectName: null,
      source: "desktop-release-channel",
      sourceKey: channel.sourceKey,
      status: baseStatus,
      title: `Desktop ${channel.label} channel`,
    }),
  );
}

function createPostDeployMilestones(input: WorkspaceReleaseCalendarInput, now: Date) {
  const summary = input.postDeploySummary;

  if (!summary || summary.status === "missing") {
    return [
      createMilestone({
        actionLabel: "Run deploy smoke",
        blockerCount: 0,
        completedAt: null,
        detail: "No post-deploy synthetic smoke report has been recorded for this workspace.",
        dueAt: now.toISOString(),
        kind: "post-deploy",
        projectId: null,
        projectName: null,
        source: "post-deploy-smoke",
        sourceKey: "post-deploy:synthetic-smoke",
        status: "due",
        title: "Post-deploy synthetic checks",
      }),
    ];
  }

  const failed = summary.status === "fail";
  const occurredAt = summary.generatedAt ?? summary.latestFailedAt ?? summary.latestPassedAt ?? now.toISOString();

  return [
    createMilestone({
      actionLabel: failed ? "Inspect failed checks" : "Smoke passed",
      blockerCount: failed ? Math.max(1, summary.issueRows.length) : 0,
      completedAt: failed ? null : occurredAt,
      detail: failed
        ? `${summary.issueRows.length || summary.failedRunCount} post-deploy route checks need attention.`
        : `Latest deploy smoke passed with ${summary.currentPassStreak} passing run${summary.currentPassStreak === 1 ? "" : "s"} in a row.`,
      dueAt: occurredAt,
      kind: "post-deploy",
      projectId: summary.projectId,
      projectName: null,
      source: "post-deploy-smoke",
      sourceKey: "post-deploy:synthetic-smoke",
      status: failed ? "blocked" : "done",
      title: "Post-deploy synthetic checks",
    }),
  ];
}

function kindCount(milestones: WorkspaceReleaseCalendarMilestone[], kind: WorkspaceReleaseCalendarMilestoneKind) {
  return milestones.filter((milestone) => milestone.kind === kind).length;
}

function compareMilestones(first: WorkspaceReleaseCalendarMilestone, second: WorkspaceReleaseCalendarMilestone) {
  return (
    statusRank[first.status] - statusRank[second.status] ||
    new Date(first.dueAt).getTime() - new Date(second.dueAt).getTime() ||
    first.title.localeCompare(second.title) ||
    first.sourceKey.localeCompare(second.sourceKey)
  );
}

export function summarizeWorkspaceReleaseCalendarMilestones(milestones: WorkspaceReleaseCalendarMilestone[]): WorkspaceReleaseCalendarReport["summary"] {
  const activeMilestones = milestones.filter((milestone) => milestone.status !== "done").sort(compareMilestones);

  return {
    appPackageCount: kindCount(milestones, "app-package"),
    blockedCount: milestones.filter((milestone) => milestone.status === "blocked").length,
    desktopChannelCount: kindCount(milestones, "desktop-channel"),
    doneCount: milestones.filter((milestone) => milestone.status === "done").length,
    dueCount: milestones.filter((milestone) => milestone.status === "due").length,
    nextMilestoneAt: activeMilestones[0]?.dueAt ?? null,
    postDeployCount: kindCount(milestones, "post-deploy"),
    reviewGateCount: kindCount(milestones, "review-gate"),
    scheduledCount: milestones.filter((milestone) => milestone.status === "scheduled").length,
    totalCount: milestones.length,
  };
}

export function createWorkspaceReleaseCalendarReport(input: WorkspaceReleaseCalendarInput): WorkspaceReleaseCalendarReport {
  const now = input.now ?? new Date();
  const milestones = [
    ...createReviewGateMilestones(input, now),
    ...createAppPackageMilestones(input, now),
    ...createDesktopChannelMilestones(input, now),
    ...createPostDeployMilestones(input, now),
  ].sort(compareMilestones);

  return {
    generatedAt: now.toISOString(),
    milestones,
    summary: summarizeWorkspaceReleaseCalendarMilestones(milestones),
  };
}

export function createEmptyWorkspaceReleaseCalendarReport(now = new Date()): WorkspaceReleaseCalendarReport {
  const milestones: WorkspaceReleaseCalendarMilestone[] = [];

  return {
    generatedAt: now.toISOString(),
    milestones,
    summary: {
      appPackageCount: 0,
      blockedCount: 0,
      desktopChannelCount: 0,
      doneCount: 0,
      dueCount: 0,
      nextMilestoneAt: null,
      postDeployCount: 0,
      reviewGateCount: 0,
      scheduledCount: 0,
      totalCount: 0,
    },
  };
}

export function getWorkspaceReleaseCalendarKindLabels() {
  return workspaceReleaseCalendarMilestoneKinds.reduce<Record<WorkspaceReleaseCalendarMilestoneKind, string>>(
    (labels, kind) => ({
      ...labels,
      [kind]:
        kind === "app-package"
          ? "App package"
          : kind === "desktop-channel"
            ? "Desktop channel"
            : kind === "post-deploy"
              ? "Post-deploy"
              : "Review gate",
    }),
    {} as Record<WorkspaceReleaseCalendarMilestoneKind, string>,
  );
}
