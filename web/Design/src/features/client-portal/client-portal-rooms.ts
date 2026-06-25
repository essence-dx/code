import type { ReviewTaskSummary } from "@/db/project-comments";
import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type { ProjectSummary } from "@/features/editor/types";
import {
  projectPermissionPresetLabels,
  sharePermissionLabels,
} from "@/features/projects/project-permissions";
import type { ProjectHandoffPacket } from "@/features/projects/project-handoff-packet";
import { approvalStatusLabels } from "@/features/review/approval-status";
import { isReviewTaskOverdue } from "@/features/review/review-tasks";

export type ClientPortalStatus = "ready" | "review" | "blocked";

export type ClientPortalViewMode =
  | "review-room"
  | "public-view"
  | "private-draft"
  | "editable-risk";

export type ClientPortalRoom = {
  id: string;
  projectId: string;
  projectName: string;
  status: ClientPortalStatus;
  score: number;
  viewMode: ClientPortalViewMode;
  viewLabel: string;
  href: string | null;
  canComment: boolean;
  approvalSafe: boolean;
  approvalLabel: string;
  nextAction: string;
  handoffDownload: {
    fileName: string;
    dataUrl: string;
    ready: boolean;
  };
  scopedComments: ClientPortalComment[];
  activity: ClientPortalActivity[];
  metrics: {
    openComments: number;
    openTasks: number;
    overdueTasks: number;
    handoffScore: number;
  };
};

export type ClientPortalComment = {
  id: string;
  projectId: string;
  body: string;
  authorName: string;
  status: ReviewTaskSummary["taskStatus"];
  assigneeName: string | null;
  dueAt: string | null;
  overdue: boolean;
  resolved: boolean;
  href: string;
};

export type ClientPortalActivity = {
  id: string;
  summary: string;
  actorEmail: string | null;
  createdAt: string;
};

export type ClientPortalCenter = {
  status: ClientPortalStatus;
  score: number;
  rooms: ClientPortalRoom[];
  scopedCommentQueue: ClientPortalComment[];
  reviewerActivity: ClientPortalActivity[];
  nextActions: string[];
  totals: {
    rooms: number;
    approvalSafeRooms: number;
    commentEnabledRooms: number;
    handoffDownloads: number;
    openComments: number;
    reviewerEvents: number;
  };
};

export function createClientPortalCenter(input: {
  projects: ProjectSummary[];
  reviewTasks: ReviewTaskSummary[];
  projectHandoffPackets: ProjectHandoffPacket[];
  auditLogs: WorkspaceAuditLogSummary[];
  now?: Date;
}): ClientPortalCenter {
  const now = input.now ?? new Date();
  const activeProjects = input.projects.filter((project) => !project.deletedAt);
  const packets = new Map(
    input.projectHandoffPackets.map((packet) => [packet.projectId, packet]),
  );
  const rooms = activeProjects
    .map((project) =>
      createClientPortalRoom({
        project,
        comments: input.reviewTasks.filter((task) => task.projectId === project.id),
        packet: packets.get(project.id) ?? null,
    activity: input.auditLogs.filter(
          (log) => log.targetId === project.id || log.summary.includes(project.name),
        ),
        now,
      }),
    )
    .sort(compareRooms);
  const score = rooms.length
    ? Math.round(rooms.reduce((total, room) => total + room.score, 0) / rooms.length)
    : 0;
  const scopedCommentQueue = rooms
    .flatMap((room) => room.scopedComments)
    .filter((comment) => !comment.resolved || comment.status !== "done")
    .sort(compareComments)
    .slice(0, 8);
  const reviewerActivity = rooms
    .flatMap((room) => room.activity)
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
    .slice(0, 8);

  return {
    status: scoreToStatus(score, rooms.some((room) => room.status === "blocked")),
    score,
    rooms,
    scopedCommentQueue,
    reviewerActivity,
    nextActions: createNextActions(rooms),
    totals: {
      rooms: rooms.length,
      approvalSafeRooms: rooms.filter((room) => room.approvalSafe).length,
      commentEnabledRooms: rooms.filter((room) => room.canComment).length,
      handoffDownloads: rooms.filter((room) => room.handoffDownload.ready).length,
      openComments: scopedCommentQueue.length,
      reviewerEvents: reviewerActivity.length,
    },
  };
}

function createClientPortalRoom(input: {
  project: ProjectSummary;
  comments: ReviewTaskSummary[];
  packet: ProjectHandoffPacket | null;
  activity: WorkspaceAuditLogSummary[];
  now: Date;
}): ClientPortalRoom {
  const view = createViewMode(input.project);
  const scopedComments = input.comments.map((comment) =>
    createPortalComment(comment, input.now),
  );
  const openComments = scopedComments.filter(
    (comment) => !comment.resolved || comment.status !== "done",
  );
  const openTasks = scopedComments.filter(
    (comment) => comment.status !== "none" && comment.status !== "done",
  );
  const overdueTasks = openTasks.filter((comment) => comment.overdue);
  const handoffScore = input.packet?.packetScore ?? 0;
  const score = createRoomScore({
    viewScore: view.score,
    approvalScore: approvalScore(input.project.approvalStatus),
    handoffScore,
    commentScore: Math.max(0, 100 - openTasks.length * 8 - overdueTasks.length * 22),
    activityScore: input.activity.length ? 100 : 55,
  });
  const hasBlocked =
    view.mode === "editable-risk" ||
    input.project.approvalStatus === "changes-requested" ||
    input.packet?.status === "blocked" ||
    overdueTasks.length > 0;
  const status = scoreToStatus(score, hasBlocked);

  return {
    id: `portal-${input.project.id}`,
    projectId: input.project.id,
    projectName: input.project.name,
    status,
    score,
    viewMode: view.mode,
    viewLabel: view.label,
    href: view.href,
    canComment: view.canComment,
    approvalSafe: view.approvalSafe,
    approvalLabel: approvalStatusLabels[input.project.approvalStatus],
    nextAction: createRoomNextAction({
      status,
      view,
      project: input.project,
      packet: input.packet,
      overdueTasks: overdueTasks.length,
      openTasks: openTasks.length,
    }),
    handoffDownload: createHandoffDownload(input.project, input.packet, input.now),
    scopedComments,
    activity: input.activity.slice(0, 4).map((log) => ({
      id: log.id,
      summary: log.summary,
      actorEmail: log.actorEmail,
      createdAt: log.createdAt,
    })),
    metrics: {
      openComments: openComments.length,
      openTasks: openTasks.length,
      overdueTasks: overdueTasks.length,
      handoffScore,
    },
  };
}

function createViewMode(project: ProjectSummary) {
  if (project.editShareId && project.editSharePermission === "edit") {
    return {
      mode: "editable-risk" as const,
      label: `${sharePermissionLabels[project.editSharePermission]} link risk`,
      href: `/edit/${project.editShareId}`,
      canComment: true,
      approvalSafe: false,
      score: 15,
    };
  }

  if (
    project.editShareId &&
    (project.editSharePermission === "view" ||
      project.editSharePermission === "comment")
  ) {
    return {
      mode: "review-room" as const,
      label:
        project.editSharePermission === "comment"
          ? projectPermissionPresetLabels.commenter
          : projectPermissionPresetLabels.viewer,
      href: `/edit/${project.editShareId}`,
      canComment: project.editSharePermission === "comment",
      approvalSafe: true,
      score: project.editSharePermission === "comment" ? 100 : 92,
    };
  }

  if (project.publicShareId) {
    return {
      mode: "public-view" as const,
      label: "Public view",
      href: `/view/${project.publicShareId}`,
      canComment: false,
      approvalSafe: true,
      score: 78,
    };
  }

  return {
    mode: "private-draft" as const,
    label: "Private draft",
    href: `/editor/${project.id}`,
    canComment: false,
    approvalSafe: project.approvalStatus !== "changes-requested",
    score: 42,
  };
}

function createPortalComment(
  task: ReviewTaskSummary,
  now: Date,
): ClientPortalComment {
  return {
    id: task.id,
    projectId: task.projectId,
    body: task.body,
    authorName: task.authorName,
    status: task.taskStatus,
    assigneeName: task.taskAssigneeName,
    dueAt: task.taskDueAt,
    overdue: isReviewTaskOverdue({ ...task, now }),
    resolved: task.resolved,
    href: `/editor/${task.projectId}`,
  };
}

function createRoomScore(input: {
  viewScore: number;
  approvalScore: number;
  handoffScore: number;
  commentScore: number;
  activityScore: number;
}) {
  return Math.round(
    input.viewScore * 0.25 +
      input.approvalScore * 0.25 +
      input.handoffScore * 0.25 +
      input.commentScore * 0.15 +
      input.activityScore * 0.1,
  );
}

function approvalScore(status: ProjectSummary["approvalStatus"]) {
  if (status === "approved") return 100;
  if (status === "in-review") return 82;
  if (status === "draft") return 55;

  return 20;
}

function createRoomNextAction(input: {
  status: ClientPortalStatus;
  view: ReturnType<typeof createViewMode>;
  project: ProjectSummary;
  packet: ProjectHandoffPacket | null;
  overdueTasks: number;
  openTasks: number;
}) {
  if (input.view.mode === "editable-risk") {
    return "Switch the reviewer link from edit access to view or comment access.";
  }
  if (input.project.approvalStatus === "changes-requested") {
    return "Resolve requested changes before opening the client room.";
  }
  if (!input.packet) return "Prepare a project handoff packet for download.";
  if (input.packet.status !== "ready") return input.packet.nextAction;
  if (input.overdueTasks) return "Resolve overdue reviewer tasks.";
  if (input.openTasks) return "Close open scoped comments before final approval.";
  if (input.status === "ready") return "Client room is ready for review.";

  return "Review portal room readiness before sharing.";
}

function createHandoffDownload(
  project: ProjectSummary,
  packet: ProjectHandoffPacket | null,
  now: Date,
) {
  const payload = packet
    ? {
        kind: "essence-studio.client-portal-handoff",
        version: 1,
        projectId: packet.projectId,
        projectName: packet.projectName,
        exportedAt: now.toISOString(),
        packet,
      }
    : {
        kind: "essence-studio.client-portal-handoff",
        version: 1,
        projectId: project.id,
        projectName: project.name,
        exportedAt: now.toISOString(),
        packet: null,
      };

  return {
    fileName: `${slugify(project.name)}-client-handoff.json`,
    dataUrl: `data:application/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(payload, null, 2),
    )}`,
    ready: packet?.status === "ready",
  };
}

function createNextActions(rooms: ClientPortalRoom[]) {
  return rooms
    .filter((room) => room.status !== "ready")
    .sort(compareRooms)
    .map((room) => `${room.projectName}: ${room.nextAction}`)
    .slice(0, 4);
}

function compareRooms(left: ClientPortalRoom, right: ClientPortalRoom) {
  return (
    statusWeight(left.status) - statusWeight(right.status) ||
    left.score - right.score ||
    Date.parse(right.activity[0]?.createdAt ?? "0") -
      Date.parse(left.activity[0]?.createdAt ?? "0") ||
    left.projectName.localeCompare(right.projectName)
  );
}

function compareComments(left: ClientPortalComment, right: ClientPortalComment) {
  return (
    Number(right.overdue) - Number(left.overdue) ||
    statusWeight(commentStatus(left)) - statusWeight(commentStatus(right)) ||
    (Date.parse(left.dueAt ?? "9999-12-31") -
      Date.parse(right.dueAt ?? "9999-12-31"))
  );
}

function commentStatus(comment: ClientPortalComment): ClientPortalStatus {
  if (comment.overdue) return "blocked";
  if (comment.status === "done" && comment.resolved) return "ready";

  return "review";
}

function scoreToStatus(score: number, hasBlocked: boolean): ClientPortalStatus {
  if (hasBlocked || score < 50) return "blocked";
  if (score < 85) return "review";

  return "ready";
}

function statusWeight(status: ClientPortalStatus) {
  if (status === "blocked") return 0;
  if (status === "review") return 1;

  return 2;
}

function slugify(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "project"
  );
}
