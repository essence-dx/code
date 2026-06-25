import { getWorkspaceNotificationTopicForHealthKind, getWorkspaceNotificationTopicForInboxKind } from "@/features/projects/project-notification-delivery";
import type { BoardApprovalSlaReminderNotification, BoardApprovalSlaReminderReport } from "@/features/projects/board-approval-sla-reminders";
import type { ProjectCollaborationInbox, ProjectCollaborationInboxNotification } from "@/features/projects/project-collaboration-inbox";
import type { ProjectHealthNotification, ProjectHealthNotificationCenter } from "@/features/projects/project-health-notifications";
import { isWorkspaceNotificationTopicEnabled, normalizeWorkspaceNotificationDeliveryPreferences } from "@/features/workspaces/notification-delivery-preferences";
import type {
  WorkspaceNotificationDeliveryPreference,
  WorkspaceNotificationEmailDeliverySource,
  WorkspaceNotificationEmailDeliveryStatus,
  WorkspaceNotificationTopic,
  WorkspaceRole,
} from "@/features/workspaces/types";

export interface WorkspaceNotificationEmailMember {
  email: string;
  name: string | null;
  role: WorkspaceRole;
  userId: string;
}

export interface WorkspaceNotificationEmailJobDraft {
  dedupeKey: string;
  htmlContent: string;
  notificationId: string;
  previewText: string;
  projectId: string | null;
  projectName: string;
  recipientEmail: string;
  recipientName: string | null;
  recipientRole: WorkspaceRole;
  source: WorkspaceNotificationEmailDeliverySource;
  subject: string;
  textContent: string;
  topic: WorkspaceNotificationTopic;
  userId: string;
  workspaceId: string;
}

export interface WorkspaceNotificationEmailDeliverySummary {
  failedCount: number;
  pendingCount: number;
  sentCount: number;
  skippedCount: number;
  totalCount: number;
}

export interface WorkspaceNotificationEmailDeliveryRow {
  attempts: number;
  createdAt: string;
  id: string;
  lastError: string | null;
  nextAttemptAt: string | null;
  notificationId: string;
  projectId: string | null;
  recipientEmail: string;
  recipientName: string | null;
  recipientRole: WorkspaceRole;
  sentAt: string | null;
  source: WorkspaceNotificationEmailDeliverySource;
  status: WorkspaceNotificationEmailDeliveryStatus;
  subject: string;
  topic: WorkspaceNotificationTopic;
  updatedAt: string;
}

export interface WorkspaceNotificationEmailDeliveryAttemptRow {
  attemptNumber: number;
  attemptedAt: string;
  deliveryId: string;
  error: string | null;
  id: string;
  providerMessageId: string | null;
  status: Extract<WorkspaceNotificationEmailDeliveryStatus, "failed" | "sent">;
}

export interface WorkspaceNotificationEmailDeliveryReport {
  attempts: WorkspaceNotificationEmailDeliveryAttemptRow[];
  generatedAt: string;
  jobs: WorkspaceNotificationEmailDeliveryRow[];
  summary: WorkspaceNotificationEmailDeliverySummary;
}

export interface WorkspaceNotificationEmailPlan {
  jobs: WorkspaceNotificationEmailJobDraft[];
  summary: {
    candidateCount: number;
    eligibleCount: number;
    suppressedByPreferenceCount: number;
    suppressedByRoleCount: number;
  };
}

interface NotificationCandidate {
  actionLabel: string;
  id: string;
  message: string;
  projectId: string | null;
  projectName: string;
  source: WorkspaceNotificationEmailDeliverySource;
  title: string;
  topic: WorkspaceNotificationTopic;
}

const roleTopicAccess: Record<WorkspaceRole, WorkspaceNotificationTopic[]> = {
  admin: ["inbox", "health", "review", "release"],
  editor: ["inbox", "health", "review"],
  owner: ["inbox", "health", "review", "release"],
  viewer: ["inbox"],
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    const replacements: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return replacements[char] ?? char;
  });
}

export function canWorkspaceRoleReceiveNotificationTopic(role: WorkspaceRole, topic: WorkspaceNotificationTopic) {
  return roleTopicAccess[role].includes(topic);
}

function getRecipientLabel(member: WorkspaceNotificationEmailMember) {
  return member.name?.trim() || member.email;
}

function getSubject(candidate: NotificationCandidate) {
  return `${candidate.projectName}: ${candidate.title}`;
}

function renderTextContent(candidate: NotificationCandidate, member: WorkspaceNotificationEmailMember) {
  return [
    `Hi ${getRecipientLabel(member)},`,
    "",
    candidate.title,
    candidate.projectName,
    candidate.message,
    "",
    `Action: ${candidate.actionLabel}`,
    "Open Essence Spline to review this workspace notification.",
  ].join("\n");
}

function renderHtmlContent(candidate: NotificationCandidate, member: WorkspaceNotificationEmailMember) {
  return `
    <div style="font-family: Inter, Arial, sans-serif; color: #18181b; line-height: 1.55;">
      <p>Hi ${escapeHtml(getRecipientLabel(member))},</p>
      <h2 style="font-size: 18px; margin: 16px 0 4px;">${escapeHtml(candidate.title)}</h2>
      <p style="margin: 0 0 12px; color: #52525b;">${escapeHtml(candidate.projectName)}</p>
      <p>${escapeHtml(candidate.message)}</p>
      <p><strong>Action:</strong> ${escapeHtml(candidate.actionLabel)}</p>
    </div>
  `;
}

function inboxCandidate(notification: ProjectCollaborationInboxNotification): NotificationCandidate {
  return {
    actionLabel: notification.actionLabel,
    id: notification.id,
    message: notification.message,
    projectId: notification.projectId,
    projectName: notification.projectName,
    source: "collaboration-inbox",
    title: notification.title,
    topic: getWorkspaceNotificationTopicForInboxKind(notification.kind),
  };
}

function healthCandidate(notification: ProjectHealthNotification): NotificationCandidate {
  return {
    actionLabel: notification.actionLabel,
    id: notification.id,
    message: notification.message,
    projectId: notification.projectId,
    projectName: notification.projectName,
    source: "project-health",
    title: notification.title,
    topic: getWorkspaceNotificationTopicForHealthKind(notification.kind),
  };
}

function boardSlaCandidate(notification: BoardApprovalSlaReminderNotification): NotificationCandidate {
  return {
    actionLabel: notification.actionLabel,
    id: notification.id,
    message: notification.message,
    projectId: null,
    projectName: "Board approval",
    source: "board-approval-sla",
    title: notification.title,
    topic: notification.topic,
  };
}

function createCandidateJobs(input: {
  candidate: NotificationCandidate;
  members: WorkspaceNotificationEmailMember[];
  preferencesByUserId: Map<string, WorkspaceNotificationDeliveryPreference[]>;
  workspaceId: string;
}) {
  const jobs: WorkspaceNotificationEmailJobDraft[] = [];
  let suppressedByPreferenceCount = 0;
  let suppressedByRoleCount = 0;

  for (const member of input.members) {
    if (!canWorkspaceRoleReceiveNotificationTopic(member.role, input.candidate.topic)) {
      suppressedByRoleCount += 1;
      continue;
    }

    const preferences = normalizeWorkspaceNotificationDeliveryPreferences(input.preferencesByUserId.get(member.userId) ?? []);

    if (!isWorkspaceNotificationTopicEnabled(preferences, input.candidate.topic, "email")) {
      suppressedByPreferenceCount += 1;
      continue;
    }

    jobs.push({
      dedupeKey: `${input.workspaceId}:${member.userId}:${input.candidate.source}:${input.candidate.id}`,
      htmlContent: renderHtmlContent(input.candidate, member),
      notificationId: input.candidate.id,
      previewText: input.candidate.message,
      projectId: input.candidate.projectId,
      projectName: input.candidate.projectName,
      recipientEmail: member.email,
      recipientName: member.name,
      recipientRole: member.role,
      source: input.candidate.source,
      subject: getSubject(input.candidate),
      textContent: renderTextContent(input.candidate, member),
      topic: input.candidate.topic,
      userId: member.userId,
      workspaceId: input.workspaceId,
    });
  }

  return {
    jobs,
    suppressedByPreferenceCount,
    suppressedByRoleCount,
  };
}

export function createWorkspaceNotificationEmailPlan(input: {
  boardApprovalSlaReminders?: BoardApprovalSlaReminderReport | null;
  healthCenter: ProjectHealthNotificationCenter;
  inbox: ProjectCollaborationInbox;
  members: WorkspaceNotificationEmailMember[];
  preferencesByUserId: Map<string, WorkspaceNotificationDeliveryPreference[]>;
  workspaceId: string;
}): WorkspaceNotificationEmailPlan {
  const candidates = [
    ...(input.boardApprovalSlaReminders?.notifications.map(boardSlaCandidate) ?? []),
    ...input.inbox.notifications.map(inboxCandidate),
    ...input.healthCenter.notifications.map(healthCandidate),
  ];
  const jobs: WorkspaceNotificationEmailJobDraft[] = [];
  let suppressedByPreferenceCount = 0;
  let suppressedByRoleCount = 0;

  for (const candidate of candidates) {
    const planned = createCandidateJobs({
      candidate,
      members: input.members,
      preferencesByUserId: input.preferencesByUserId,
      workspaceId: input.workspaceId,
    });

    jobs.push(...planned.jobs);
    suppressedByPreferenceCount += planned.suppressedByPreferenceCount;
    suppressedByRoleCount += planned.suppressedByRoleCount;
  }

  return {
    jobs,
    summary: {
      candidateCount: candidates.length,
      eligibleCount: jobs.length,
      suppressedByPreferenceCount,
      suppressedByRoleCount,
    },
  };
}

export function summarizeWorkspaceNotificationEmailDeliveries(jobs: WorkspaceNotificationEmailDeliveryRow[]): WorkspaceNotificationEmailDeliverySummary {
  return {
    failedCount: jobs.filter((job) => job.status === "failed").length,
    pendingCount: jobs.filter((job) => job.status === "pending").length,
    sentCount: jobs.filter((job) => job.status === "sent").length,
    skippedCount: jobs.filter((job) => job.status === "skipped").length,
    totalCount: jobs.length,
  };
}

export function createWorkspaceNotificationEmailDeliveryReport(input: {
  attempts: WorkspaceNotificationEmailDeliveryAttemptRow[];
  jobs: WorkspaceNotificationEmailDeliveryRow[];
  now?: Date;
}): WorkspaceNotificationEmailDeliveryReport {
  const jobs = [...input.jobs].sort((first, second) => new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime() || first.subject.localeCompare(second.subject));

  return {
    attempts: [...input.attempts].sort((first, second) => new Date(second.attemptedAt).getTime() - new Date(first.attemptedAt).getTime()),
    generatedAt: (input.now ?? new Date()).toISOString(),
    jobs,
    summary: summarizeWorkspaceNotificationEmailDeliveries(jobs),
  };
}
