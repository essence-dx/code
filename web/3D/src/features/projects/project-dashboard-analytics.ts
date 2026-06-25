import { createExportManifest, type ExportReadinessFormat } from "@/features/editor/utils/export-manifest";
import { sceneDocumentSchema } from "@/features/editor/types";
import { getProjectReviewGate } from "./project-review-gates";
import { projectReviewSurfaceKeys, projectReviewSurfaceLabels, type ShareSettings } from "./share-settings";

type DateLike = Date | string | null | undefined;

export interface ProjectDashboardAnalyticsProject {
  archivedAt: DateLike;
  createdAt: DateLike;
  id: string;
  name: string;
  publishedAt: DateLike;
  sceneData: unknown;
  shareSettings: ShareSettings | null;
  updatedAt: DateLike;
}

export interface ProjectDashboardAnalyticsComment {
  createdAt: DateLike;
  projectId: string;
  resolvedAt: DateLike;
  updatedAt: DateLike;
}

export interface ProjectHealthSummary {
  blockerCount: number;
  commentCount: number;
  exportIssueCount: number;
  id: string;
  name: string;
  openCommentCount: number;
  score: number;
  status: "blocked" | "healthy" | "review";
  updatedAt: string | null;
}

export interface ProjectDashboardAnalytics {
  activity: {
    activeProjectCount: number;
    archivedProjectCount: number;
    averageHealthScore: number;
    createdLast30Days: number;
    publishedProjectCount: number;
    updatedLast7Days: number;
  };
  comments: {
    closureRate: number;
    openCommentCount: number;
    projectCountWithOpenComments: number;
    resolvedCommentCount: number;
    totalCommentCount: number;
  };
  exports: {
    formatReadiness: Array<{
      format: ExportReadinessFormat;
      partialCount: number;
      readyCount: number;
      reviewCount: number;
      totalCount: number;
    }>;
    invalidSceneCount: number;
    projectCountWithExportIssues: number;
  };
  health: {
    blockedCount: number;
    healthyCount: number;
    projectsNeedingAttention: ProjectHealthSummary[];
    reviewCount: number;
  };
  release: {
    blockerCount: number;
    readyProjectCount: number;
    surfaceBlockers: Array<{
      count: number;
      surface: string;
    }>;
  };
}

const exportFormats: ExportReadinessFormat[] = ["web", "glb", "stl", "usdz"];

function toTime(value: DateLike) {
  if (!value) {
    return 0;
  }

  const time = value instanceof Date ? value.getTime() : new Date(value).getTime();

  return Number.isNaN(time) ? 0 : time;
}

function toIso(value: DateLike) {
  const time = toTime(value);

  return time > 0 ? new Date(time).toISOString() : null;
}

function withinDays(value: DateLike, now: Date, days: number) {
  const time = toTime(value);

  if (time === 0) {
    return false;
  }

  return now.getTime() - time <= days * 24 * 60 * 60 * 1000;
}

function percent(value: number, total: number, fallback = 100) {
  if (total <= 0) {
    return fallback;
  }

  return Math.round((value / total) * 100);
}

function groupComments(comments: ProjectDashboardAnalyticsComment[]) {
  const byProjectId = new Map<string, ProjectDashboardAnalyticsComment[]>();

  for (const comment of comments) {
    const entries = byProjectId.get(comment.projectId) ?? [];

    entries.push(comment);
    byProjectId.set(comment.projectId, entries);
  }

  return byProjectId;
}

function countProjectBlockers(project: ProjectDashboardAnalyticsProject) {
  return projectReviewSurfaceKeys.filter((surface) => !getProjectReviewGate(project.shareSettings, surface).allowed).length;
}

function getProjectHealth(input: {
  comments: ProjectDashboardAnalyticsComment[];
  exportIssueCount: number;
  invalidScene: boolean;
  now: Date;
  project: ProjectDashboardAnalyticsProject;
}) {
  const resolvedCommentCount = input.comments.filter((comment) => comment.resolvedAt).length;
  const closureScore = Math.round((percent(resolvedCommentCount, input.comments.length) / 100) * 20);
  const blockerCount = countProjectBlockers(input.project);
  const reviewScore = Math.round(((projectReviewSurfaceKeys.length - blockerCount) / projectReviewSurfaceKeys.length) * 15);
  const sceneScore = input.invalidScene ? 0 : 30;
  const exportScore = input.exportIssueCount === 0 ? 25 : input.exportIssueCount < exportFormats.length ? 14 : 4;
  const freshnessScore = withinDays(input.project.updatedAt, input.now, 30) ? 10 : 3;
  const score = Math.min(100, sceneScore + exportScore + closureScore + reviewScore + freshnessScore);
  const openCommentCount = input.comments.length - resolvedCommentCount;

  return {
    blockerCount,
    commentCount: input.comments.length,
    exportIssueCount: input.exportIssueCount + (input.invalidScene ? 1 : 0),
    id: input.project.id,
    name: input.project.name,
    openCommentCount,
    score,
    status: score >= 80 ? "healthy" : score >= 55 ? "review" : "blocked",
    updatedAt: toIso(input.project.updatedAt),
  } satisfies ProjectHealthSummary;
}

export function createProjectDashboardAnalytics(input: {
  comments: ProjectDashboardAnalyticsComment[];
  now?: Date;
  projects: ProjectDashboardAnalyticsProject[];
}): ProjectDashboardAnalytics {
  const now = input.now ?? new Date();
  const activeProjects = input.projects.filter((project) => !project.archivedAt);
  const commentsByProjectId = groupComments(input.comments);
  const formatCounters = new Map(
    exportFormats.map((format) => [
      format,
      {
        format,
        partialCount: 0,
        readyCount: 0,
        reviewCount: 0,
        totalCount: 0,
      },
    ]),
  );
  const surfaceBlockers = new Map(projectReviewSurfaceKeys.map((surface) => [surface, 0]));
  const projectHealth: ProjectHealthSummary[] = [];
  let invalidSceneCount = 0;
  let projectCountWithExportIssues = 0;
  let readyProjectCount = 0;

  for (const project of activeProjects) {
    const parsedScene = sceneDocumentSchema.safeParse(project.sceneData);
    let exportIssueCount = 0;

    if (!parsedScene.success) {
      invalidSceneCount += 1;
      exportIssueCount += exportFormats.length;
    } else {
      const manifest = createExportManifest(parsedScene.data);

      for (const format of exportFormats) {
        const readiness = manifest.readiness[format];
        const counter = formatCounters.get(format);

        if (!counter) {
          continue;
        }

        counter.totalCount += 1;

        if (readiness.status === "ready") {
          counter.readyCount += 1;
        } else if (readiness.status === "partial") {
          counter.partialCount += 1;
          exportIssueCount += 1;
        } else {
          counter.reviewCount += 1;
          exportIssueCount += 1;
        }
      }
    }

    for (const surface of projectReviewSurfaceKeys) {
      const gate = getProjectReviewGate(project.shareSettings, surface);

      if (!gate.allowed) {
        surfaceBlockers.set(surface, (surfaceBlockers.get(surface) ?? 0) + 1);
      }
    }

    if (getProjectReviewGate(project.shareSettings, "desktopRelease").allowed && getProjectReviewGate(project.shareSettings, "appPackage").allowed) {
      readyProjectCount += 1;
    }

    if (exportIssueCount > 0) {
      projectCountWithExportIssues += 1;
    }

    projectHealth.push(
      getProjectHealth({
        comments: commentsByProjectId.get(project.id) ?? [],
        exportIssueCount,
        invalidScene: !parsedScene.success,
        now,
        project,
      }),
    );
  }

  const resolvedCommentCount = input.comments.filter((comment) => comment.resolvedAt).length;
  const openCommentCount = input.comments.length - resolvedCommentCount;
  const averageHealthScore = projectHealth.length ? Math.round(projectHealth.reduce((sum, project) => sum + project.score, 0) / projectHealth.length) : 100;

  return {
    activity: {
      activeProjectCount: activeProjects.length,
      archivedProjectCount: input.projects.length - activeProjects.length,
      averageHealthScore,
      createdLast30Days: activeProjects.filter((project) => withinDays(project.createdAt, now, 30)).length,
      publishedProjectCount: activeProjects.filter((project) => project.publishedAt).length,
      updatedLast7Days: activeProjects.filter((project) => withinDays(project.updatedAt, now, 7)).length,
    },
    comments: {
      closureRate: percent(resolvedCommentCount, input.comments.length, 100),
      openCommentCount,
      projectCountWithOpenComments: [...commentsByProjectId.values()].filter((comments) => comments.some((comment) => !comment.resolvedAt)).length,
      resolvedCommentCount,
      totalCommentCount: input.comments.length,
    },
    exports: {
      formatReadiness: exportFormats.map((format) => formatCounters.get(format) ?? { format, partialCount: 0, readyCount: 0, reviewCount: 0, totalCount: 0 }),
      invalidSceneCount,
      projectCountWithExportIssues,
    },
    health: {
      blockedCount: projectHealth.filter((project) => project.status === "blocked").length,
      healthyCount: projectHealth.filter((project) => project.status === "healthy").length,
      projectsNeedingAttention: projectHealth
        .filter((project) => project.status !== "healthy" || project.openCommentCount > 0 || project.blockerCount > 0 || project.exportIssueCount > 0)
        .sort((first, second) => first.score - second.score || second.openCommentCount - first.openCommentCount)
        .slice(0, 5),
      reviewCount: projectHealth.filter((project) => project.status === "review").length,
    },
    release: {
      blockerCount: [...surfaceBlockers.values()].reduce((sum, count) => sum + count, 0),
      readyProjectCount,
      surfaceBlockers: projectReviewSurfaceKeys
        .map((surface) => ({
          count: surfaceBlockers.get(surface) ?? 0,
          surface: projectReviewSurfaceLabels[surface],
        }))
        .filter((entry) => entry.count > 0)
        .sort((first, second) => second.count - first.count),
    },
  };
}
