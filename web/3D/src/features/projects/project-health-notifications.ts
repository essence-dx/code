import { createExportManifest } from "@/features/editor/utils/export-manifest";
import { sceneDocumentSchema, type SceneDocument, type SceneObject } from "@/features/editor/types";
import { getProjectReviewGate } from "@/features/projects/project-review-gates";
import { projectReviewSurfaceKeys, projectReviewSurfaceLabels, type ProjectReviewSurface, type ShareSettings } from "@/features/projects/share-settings";

type DateLike = Date | string | null | undefined;

export type ProjectHealthNotificationKind = "blocked-review" | "failed-export" | "missing-assets" | "release-readiness" | "stale-comments";
export type ProjectHealthNotificationSeverity = "critical" | "info" | "warning";

export interface ProjectHealthNotificationProject {
  archivedAt: DateLike;
  id: string;
  name: string;
  publishedAt: DateLike;
  sceneData: unknown;
  shareSettings: ShareSettings | null;
  updatedAt: DateLike;
}

export interface ProjectHealthNotificationComment {
  createdAt: DateLike;
  projectId: string;
  resolvedAt: DateLike;
  updatedAt: DateLike;
}

export interface ProjectHealthNotification {
  actionLabel: string;
  count: number;
  dismissedAt?: string | null;
  id: string;
  kind: ProjectHealthNotificationKind;
  message: string;
  projectId: string;
  projectName: string;
  readAt?: string | null;
  severity: ProjectHealthNotificationSeverity;
  snoozedUntil?: string | null;
  title: string;
  updatedAt: string | null;
}

export interface ProjectHealthNotificationStateSummary {
  dismissedAt: string | null;
  notificationId: string;
  projectId: string;
  readAt: string | null;
  snoozedUntil: string | null;
}

export interface ProjectHealthNotificationCenter {
  generatedAt: string;
  notifications: ProjectHealthNotification[];
  summary: {
    criticalCount: number;
    failedExportCount: number;
    missingAssetCount: number;
    releaseReadinessCount: number;
    reviewBlockerCount: number;
    staleCommentCount: number;
    totalCount: number;
    warningCount: number;
  };
}

const releaseSurfaces: ProjectReviewSurface[] = ["desktopRelease", "appPackage"];
const severityRank: Record<ProjectHealthNotificationSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

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

function getOpenStaleComments(comments: ProjectHealthNotificationComment[], now: Date, staleAfterDays: number) {
  const threshold = now.getTime() - staleAfterDays * 24 * 60 * 60 * 1000;

  return comments.filter((comment) => !comment.resolvedAt && (toTime(comment.updatedAt) || toTime(comment.createdAt)) < threshold);
}

function getSceneObjects(document: SceneDocument) {
  return document.scenes?.length ? document.scenes.flatMap((scene) => scene.objects) : document.objects;
}

function isMissingObjectAsset(object: SceneObject) {
  switch (object.kind) {
    case "audio":
      return !object.audio?.sourceDataUrl;
    case "figma":
      return !object.figma?.url;
    case "image":
      return !object.image?.sourceDataUrl;
    case "model":
      return !object.model?.sourceDataUrl;
    case "svg":
      return !object.svg?.sourceDataUrl;
    case "video":
      return !object.video?.sourceDataUrl;
    default:
      return false;
  }
}

function countMissingAssets(document: SceneDocument) {
  return getSceneObjects(document).filter(isMissingObjectAsset).length;
}

function createNotification(input: Omit<ProjectHealthNotification, "id">): ProjectHealthNotification {
  return {
    ...input,
    id: `${input.projectId}:${input.kind}`,
  };
}

function groupComments(comments: ProjectHealthNotificationComment[]) {
  const byProject = new Map<string, ProjectHealthNotificationComment[]>();

  for (const comment of comments) {
    const entries = byProject.get(comment.projectId) ?? [];

    entries.push(comment);
    byProject.set(comment.projectId, entries);
  }

  return byProject;
}

export function summarizeProjectHealthNotifications(notifications: ProjectHealthNotification[]): ProjectHealthNotificationCenter["summary"] {
  return {
    criticalCount: notifications.filter((notification) => notification.severity === "critical").length,
    failedExportCount: notifications.filter((notification) => notification.kind === "failed-export").length,
    missingAssetCount: notifications.filter((notification) => notification.kind === "missing-assets").length,
    releaseReadinessCount: notifications.filter((notification) => notification.kind === "release-readiness").length,
    reviewBlockerCount: notifications.filter((notification) => notification.kind === "blocked-review").length,
    staleCommentCount: notifications.filter((notification) => notification.kind === "stale-comments").length,
    totalCount: notifications.length,
    warningCount: notifications.filter((notification) => notification.severity === "warning").length,
  };
}

export function createProjectHealthNotificationCenter(input: {
  comments: ProjectHealthNotificationComment[];
  now?: Date;
  projects: ProjectHealthNotificationProject[];
  staleCommentDays?: number;
}): ProjectHealthNotificationCenter {
  const now = input.now ?? new Date();
  const staleCommentDays = input.staleCommentDays ?? 7;
  const commentsByProject = groupComments(input.comments);
  const notifications: ProjectHealthNotification[] = [];

  for (const project of input.projects.filter((entry) => !entry.archivedAt)) {
    const updatedAt = toIso(project.updatedAt);
    const staleComments = getOpenStaleComments(commentsByProject.get(project.id) ?? [], now, staleCommentDays);
    const blockedSurfaces = projectReviewSurfaceKeys.filter((surface) => !getProjectReviewGate(project.shareSettings, surface).allowed);
    const releaseBlockers = releaseSurfaces.filter((surface) => !getProjectReviewGate(project.shareSettings, surface).allowed);
    const parsedScene = sceneDocumentSchema.safeParse(project.sceneData);

    if (staleComments.length > 0) {
      notifications.push(
        createNotification({
          actionLabel: "Review comments",
          count: staleComments.length,
          kind: "stale-comments",
          message: `${staleComments.length} open comment${staleComments.length === 1 ? "" : "s"} have been waiting for more than ${staleCommentDays} days.`,
          projectId: project.id,
          projectName: project.name,
          severity: staleComments.length > 2 ? "critical" : "warning",
          title: "Stale comments",
          updatedAt,
        }),
      );
    }

    if (blockedSurfaces.length > 0) {
      const labels = blockedSurfaces.map((surface) => projectReviewSurfaceLabels[surface]).join(", ");

      notifications.push(
        createNotification({
          actionLabel: "Open review workflow",
          count: blockedSurfaces.length,
          kind: "blocked-review",
          message: `${labels} ${blockedSurfaces.length === 1 ? "is" : "are"} not approved.`,
          projectId: project.id,
          projectName: project.name,
          severity: project.publishedAt ? "critical" : "warning",
          title: "Blocked review gates",
          updatedAt,
        }),
      );
    }

    if (releaseBlockers.length > 0) {
      const labels = releaseBlockers.map((surface) => projectReviewSurfaceLabels[surface]).join(", ");

      notifications.push(
        createNotification({
          actionLabel: "Prepare release",
          count: releaseBlockers.length,
          kind: "release-readiness",
          message: `${labels} must be approved before release packaging is ready.`,
          projectId: project.id,
          projectName: project.name,
          severity: "warning",
          title: "Release readiness blocked",
          updatedAt,
        }),
      );
    }

    if (!parsedScene.success) {
      notifications.push(
        createNotification({
          actionLabel: "Repair scene",
          count: 1,
          kind: "failed-export",
          message: "Scene data is invalid, so exports and shared viewers need repair before release.",
          projectId: project.id,
          projectName: project.name,
          severity: "critical",
          title: "Export failed",
          updatedAt,
        }),
      );
      continue;
    }

    const manifest = createExportManifest(parsedScene.data);
    const reviewFormats = Object.entries(manifest.readiness).filter(([, readiness]) => readiness.status === "review");
    const partialFormats = Object.entries(manifest.readiness).filter(([, readiness]) => readiness.status === "partial");
    const missingAssetCount = countMissingAssets(parsedScene.data);

    if (reviewFormats.length > 0 || partialFormats.length > 0) {
      const formats = [...reviewFormats, ...partialFormats].map(([format]) => format.toUpperCase()).join(", ");

      notifications.push(
        createNotification({
          actionLabel: "Check export readiness",
          count: reviewFormats.length + partialFormats.length,
          kind: "failed-export",
          message: `${formats} ${reviewFormats.length + partialFormats.length === 1 ? "needs" : "need"} export review before handoff.`,
          projectId: project.id,
          projectName: project.name,
          severity: reviewFormats.length > 0 ? "critical" : "warning",
          title: reviewFormats.length > 0 ? "Export failed" : "Export review needed",
          updatedAt,
        }),
      );
    }

    if (missingAssetCount > 0) {
      notifications.push(
        createNotification({
          actionLabel: "Relink assets",
          count: missingAssetCount,
          kind: "missing-assets",
          message: `${missingAssetCount} media or model object${missingAssetCount === 1 ? "" : "s"} are missing embedded source data.`,
          projectId: project.id,
          projectName: project.name,
          severity: "warning",
          title: "Missing assets",
          updatedAt,
        }),
      );
    }
  }

  notifications.sort((first, second) => severityRank[first.severity] - severityRank[second.severity] || toTime(second.updatedAt) - toTime(first.updatedAt) || first.title.localeCompare(second.title));

  return {
    generatedAt: now.toISOString(),
    notifications,
    summary: summarizeProjectHealthNotifications(notifications),
  };
}

export function applyProjectHealthNotificationStates(
  center: ProjectHealthNotificationCenter,
  states: ProjectHealthNotificationStateSummary[],
  now = new Date(),
): ProjectHealthNotificationCenter {
  const stateByNotificationId = new Map(states.map((state) => [state.notificationId, state]));
  const visibleNotifications = center.notifications.flatMap((notification) => {
    const state = stateByNotificationId.get(notification.id);
    const snoozedUntil = state?.snoozedUntil ? new Date(state.snoozedUntil) : null;
    const hiddenBySnooze = snoozedUntil ? snoozedUntil.getTime() > now.getTime() : false;

    if (state?.dismissedAt || hiddenBySnooze) {
      return [];
    }

    return [
      {
        ...notification,
        dismissedAt: state?.dismissedAt ?? null,
        readAt: state?.readAt ?? null,
        snoozedUntil: state?.snoozedUntil ?? null,
      },
    ];
  });

  return {
    ...center,
    notifications: visibleNotifications,
    summary: summarizeProjectHealthNotifications(visibleNotifications),
  };
}
