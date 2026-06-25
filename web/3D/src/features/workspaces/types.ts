import { z } from "zod";

export const workspaceRoles = ["owner", "admin", "editor", "viewer"] as const;
export const workspaceInviteRoles = ["admin", "editor", "viewer"] as const;
export const workspaceNotificationTopics = ["inbox", "health", "review", "release"] as const;
export const workspaceNotificationEmailDeliverySources = ["board-approval-sla", "collaboration-inbox", "project-health"] as const;
export const workspaceNotificationEmailDeliveryStatuses = ["failed", "pending", "sent", "skipped"] as const;
export const workspaceReleaseCalendarMilestoneKinds = ["app-package", "desktop-channel", "post-deploy", "review-gate"] as const;
export const workspaceReleaseCalendarMilestoneSources = ["app-package-export", "desktop-release-channel", "post-deploy-smoke", "review-workflow"] as const;
export const workspaceReleaseCalendarMilestoneStatuses = ["blocked", "done", "due", "scheduled"] as const;

export const workspaceRoleSchema = z.enum(workspaceRoles);
export const workspaceInviteRoleSchema = z.enum(workspaceInviteRoles);
export const workspaceNotificationTopicSchema = z.enum(workspaceNotificationTopics);

export type WorkspaceRole = (typeof workspaceRoles)[number];
export type WorkspaceInviteRole = (typeof workspaceInviteRoles)[number];
export type WorkspaceNotificationTopic = (typeof workspaceNotificationTopics)[number];
export type WorkspaceNotificationEmailDeliverySource = (typeof workspaceNotificationEmailDeliverySources)[number];
export type WorkspaceNotificationEmailDeliveryStatus = (typeof workspaceNotificationEmailDeliveryStatuses)[number];
export type WorkspaceReleaseCalendarMilestoneKind = (typeof workspaceReleaseCalendarMilestoneKinds)[number];
export type WorkspaceReleaseCalendarMilestoneSource = (typeof workspaceReleaseCalendarMilestoneSources)[number];
export type WorkspaceReleaseCalendarMilestoneStatus = (typeof workspaceReleaseCalendarMilestoneStatuses)[number];

export interface WorkspaceMemberRow {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: WorkspaceRole;
  joinedAt: string;
}

export interface WorkspaceInviteRow {
  id: string;
  email: string;
  role: WorkspaceInviteRole;
  invitedBy: string;
  token: string;
  expiresAt: string;
  createdAt: string;
}

export interface WorkspaceSummary {
  id: string;
  name: string;
  role: WorkspaceRole;
  memberCount: number;
  createdAt: string;
}

export interface WorkspaceDashboard {
  id: string;
  name: string;
  role: WorkspaceRole;
  workspaces: WorkspaceSummary[];
  members: WorkspaceMemberRow[];
  invites: WorkspaceInviteRow[];
}

export interface WorkspaceNotificationDeliveryPreference {
  emailEnabled: boolean;
  inAppEnabled: boolean;
  topic: WorkspaceNotificationTopic;
}
