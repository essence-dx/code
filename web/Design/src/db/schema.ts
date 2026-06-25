import { relations } from "drizzle-orm";

import {
  account,
  authEmail,
  session,
  user,
  userTwoFactor,
} from "./schema/auth";
import { workspaceAuditLog } from "./schema/audit";
import { userAsset } from "./schema/assets";
import { brandColor, brandFont, brandLogo } from "./schema/brand";
import { campaignBoard, campaignDeliverable } from "./schema/campaigns";
import { contentScheduleItem } from "./schema/content";
import { serverExportJob } from "./schema/export-jobs";
import { userNotification } from "./schema/notifications";
import {
  presentationRemoteCommand,
  presentationRemoteSession,
  presentationResponse,
} from "./schema/presentation";
import {
  designTemplate,
  project,
  projectComment,
  projectCommentReaction,
  projectFolder,
  projectPresence,
  projectVersion,
} from "./schema/projects";
import {
  teamWorkspace,
  teamWorkspaceInvite,
  teamWorkspaceMember,
} from "./schema/team";
import {
  websiteAnalyticsEvent,
  websiteCustomDomain,
  websiteFormSubmission,
  websitePublish,
} from "./schema/website";

export {
  account,
  authEmail,
  session,
  user,
  userTwoFactor,
  verification,
} from "./schema/auth";
export { workspaceAuditLog } from "./schema/audit";
export { userAsset } from "./schema/assets";
export { brandColor, brandFont, brandLogo } from "./schema/brand";
export { campaignBoard, campaignDeliverable } from "./schema/campaigns";
export { contentScheduleItem } from "./schema/content";
export { serverExportJob } from "./schema/export-jobs";
export { userNotification } from "./schema/notifications";
export {
  presentationRemoteCommand,
  presentationRemoteSession,
  presentationResponse,
} from "./schema/presentation";
export {
  designTemplate,
  project,
  projectComment,
  projectCommentReaction,
  projectFolder,
  projectPresence,
  projectVersion,
} from "./schema/projects";
export {
  teamWorkspace,
  teamWorkspaceInvite,
  teamWorkspaceMember,
} from "./schema/team";
export {
  websiteAnalyticsEvent,
  websiteCustomDomain,
  websiteFormSubmission,
  websitePublish,
} from "./schema/website";

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  brandColors: many(brandColor),
  brandFonts: many(brandFont),
  brandLogos: many(brandLogo),
  folders: many(projectFolder),
  projects: many(project),
  templates: many(designTemplate),
  projectVersions: many(projectVersion),
  projectComments: many(projectComment),
  projectCommentReactions: many(projectCommentReaction),
  projectPresence: many(projectPresence),
  assets: many(userAsset),
  campaignBoards: many(campaignBoard),
  campaignDeliverables: many(campaignDeliverable),
  ownedTeamWorkspaces: many(teamWorkspace),
  teamWorkspaceMemberships: many(teamWorkspaceMember),
  sentTeamWorkspaceInvites: many(teamWorkspaceInvite, {
    relationName: "sentTeamWorkspaceInvites",
  }),
  acceptedTeamWorkspaceInvites: many(teamWorkspaceInvite, {
    relationName: "acceptedTeamWorkspaceInvites",
  }),
  notifications: many(userNotification, {
    relationName: "userNotifications",
  }),
  authEmails: many(authEmail),
  actorNotifications: many(userNotification, {
    relationName: "actorNotifications",
  }),
  twoFactor: many(userTwoFactor),
  contentScheduleItems: many(contentScheduleItem),
  serverExportJobs: many(serverExportJob),
  websitePublishes: many(websitePublish),
  websiteFormSubmissions: many(websiteFormSubmission),
  websiteAnalyticsEvents: many(websiteAnalyticsEvent),
  websiteCustomDomains: many(websiteCustomDomain),
  presentationRemoteSessions: many(presentationRemoteSession),
  workspaceAuditLogs: many(workspaceAuditLog, {
    relationName: "workspaceAuditLogs",
  }),
  actorAuditLogs: many(workspaceAuditLog, {
    relationName: "actorAuditLogs",
  }),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const authEmailRelations = relations(authEmail, ({ one }) => ({
  user: one(user, {
    fields: [authEmail.userId],
    references: [user.id],
  }),
}));

export const teamWorkspaceRelations = relations(
  teamWorkspace,
  ({ one, many }) => ({
    owner: one(user, {
      fields: [teamWorkspace.ownerId],
      references: [user.id],
    }),
    members: many(teamWorkspaceMember),
    invites: many(teamWorkspaceInvite),
  }),
);

export const teamWorkspaceMemberRelations = relations(
  teamWorkspaceMember,
  ({ one }) => ({
    workspace: one(teamWorkspace, {
      fields: [teamWorkspaceMember.workspaceId],
      references: [teamWorkspace.id],
    }),
    user: one(user, {
      fields: [teamWorkspaceMember.userId],
      references: [user.id],
    }),
  }),
);

export const teamWorkspaceInviteRelations = relations(
  teamWorkspaceInvite,
  ({ one }) => ({
    workspace: one(teamWorkspace, {
      fields: [teamWorkspaceInvite.workspaceId],
      references: [teamWorkspace.id],
    }),
    invitedBy: one(user, {
      fields: [teamWorkspaceInvite.invitedByUserId],
      references: [user.id],
      relationName: "sentTeamWorkspaceInvites",
    }),
    acceptedBy: one(user, {
      fields: [teamWorkspaceInvite.acceptedByUserId],
      references: [user.id],
      relationName: "acceptedTeamWorkspaceInvites",
    }),
  }),
);

export const userNotificationRelations = relations(
  userNotification,
  ({ one }) => ({
    user: one(user, {
      fields: [userNotification.userId],
      references: [user.id],
      relationName: "userNotifications",
    }),
    actor: one(user, {
      fields: [userNotification.actorUserId],
      references: [user.id],
      relationName: "actorNotifications",
    }),
  }),
);

export const userTwoFactorRelations = relations(userTwoFactor, ({ one }) => ({
  user: one(user, {
    fields: [userTwoFactor.userId],
    references: [user.id],
  }),
}));

export const workspaceAuditLogRelations = relations(
  workspaceAuditLog,
  ({ one }) => ({
    user: one(user, {
      fields: [workspaceAuditLog.userId],
      references: [user.id],
      relationName: "workspaceAuditLogs",
    }),
    actor: one(user, {
      fields: [workspaceAuditLog.actorUserId],
      references: [user.id],
      relationName: "actorAuditLogs",
    }),
  }),
);

export const contentScheduleItemRelations = relations(
  contentScheduleItem,
  ({ one }) => ({
    user: one(user, {
      fields: [contentScheduleItem.userId],
      references: [user.id],
    }),
    project: one(project, {
      fields: [contentScheduleItem.projectId],
      references: [project.id],
    }),
  }),
);

export const websitePublishRelations = relations(
  websitePublish,
  ({ one, many }) => ({
    user: one(user, {
      fields: [websitePublish.userId],
      references: [user.id],
    }),
    project: one(project, {
      fields: [websitePublish.projectId],
      references: [project.id],
    }),
    submissions: many(websiteFormSubmission),
    analyticsEvents: many(websiteAnalyticsEvent),
    customDomains: many(websiteCustomDomain),
  }),
);

export const websiteFormSubmissionRelations = relations(
  websiteFormSubmission,
  ({ one }) => ({
    publish: one(websitePublish, {
      fields: [websiteFormSubmission.publishId],
      references: [websitePublish.id],
    }),
    user: one(user, {
      fields: [websiteFormSubmission.userId],
      references: [user.id],
    }),
    project: one(project, {
      fields: [websiteFormSubmission.projectId],
      references: [project.id],
    }),
  }),
);

export const websiteAnalyticsEventRelations = relations(
  websiteAnalyticsEvent,
  ({ one }) => ({
    publish: one(websitePublish, {
      fields: [websiteAnalyticsEvent.publishId],
      references: [websitePublish.id],
    }),
    user: one(user, {
      fields: [websiteAnalyticsEvent.userId],
      references: [user.id],
    }),
    project: one(project, {
      fields: [websiteAnalyticsEvent.projectId],
      references: [project.id],
    }),
  }),
);

export const websiteCustomDomainRelations = relations(
  websiteCustomDomain,
  ({ one }) => ({
    publish: one(websitePublish, {
      fields: [websiteCustomDomain.publishId],
      references: [websitePublish.id],
    }),
    user: one(user, {
      fields: [websiteCustomDomain.userId],
      references: [user.id],
    }),
    project: one(project, {
      fields: [websiteCustomDomain.projectId],
      references: [project.id],
    }),
  }),
);

export const projectRelations = relations(project, ({ one, many }) => ({
  user: one(user, {
    fields: [project.userId],
    references: [user.id],
  }),
  folder: one(projectFolder, {
    fields: [project.folderId],
    references: [projectFolder.id],
  }),
  contentScheduleItems: many(contentScheduleItem),
  websitePublishes: many(websitePublish),
  websiteFormSubmissions: many(websiteFormSubmission),
  websiteAnalyticsEvents: many(websiteAnalyticsEvent),
  websiteCustomDomains: many(websiteCustomDomain),
  presentationResponses: many(presentationResponse),
  presentationRemoteSessions: many(presentationRemoteSession),
  serverExportJobs: many(serverExportJob),
}));

export const serverExportJobRelations = relations(serverExportJob, ({ one }) => ({
  user: one(user, {
    fields: [serverExportJob.userId],
    references: [user.id],
  }),
  project: one(project, {
    fields: [serverExportJob.projectId],
    references: [project.id],
  }),
}));

export const projectCommentRelations = relations(
  projectComment,
  ({ one, many }) => ({
    project: one(project, {
      fields: [projectComment.projectId],
      references: [project.id],
    }),
    user: one(user, {
      fields: [projectComment.userId],
      references: [user.id],
    }),
    reactions: many(projectCommentReaction),
  }),
);

export const projectCommentReactionRelations = relations(
  projectCommentReaction,
  ({ one }) => ({
    project: one(project, {
      fields: [projectCommentReaction.projectId],
      references: [project.id],
    }),
    comment: one(projectComment, {
      fields: [projectCommentReaction.commentId],
      references: [projectComment.id],
    }),
    user: one(user, {
      fields: [projectCommentReaction.userId],
      references: [user.id],
    }),
  }),
);

export const projectPresenceRelations = relations(
  projectPresence,
  ({ one }) => ({
    project: one(project, {
      fields: [projectPresence.projectId],
      references: [project.id],
    }),
    user: one(user, {
      fields: [projectPresence.userId],
      references: [user.id],
    }),
  }),
);

export const presentationResponseRelations = relations(
  presentationResponse,
  ({ one }) => ({
    project: one(project, {
      fields: [presentationResponse.projectId],
      references: [project.id],
    }),
  }),
);

export const presentationRemoteSessionRelations = relations(
  presentationRemoteSession,
  ({ one, many }) => ({
    project: one(project, {
      fields: [presentationRemoteSession.projectId],
      references: [project.id],
    }),
    user: one(user, {
      fields: [presentationRemoteSession.userId],
      references: [user.id],
    }),
    commands: many(presentationRemoteCommand),
  }),
);

export const presentationRemoteCommandRelations = relations(
  presentationRemoteCommand,
  ({ one }) => ({
    session: one(presentationRemoteSession, {
      fields: [presentationRemoteCommand.sessionId],
      references: [presentationRemoteSession.id],
    }),
  }),
);

export const designTemplateRelations = relations(designTemplate, ({ one }) => ({
  user: one(user, {
    fields: [designTemplate.userId],
    references: [user.id],
  }),
}));

export const campaignBoardRelations = relations(
  campaignBoard,
  ({ one, many }) => ({
    user: one(user, {
      fields: [campaignBoard.userId],
      references: [user.id],
    }),
    deliverables: many(campaignDeliverable),
  }),
);

export const campaignDeliverableRelations = relations(
  campaignDeliverable,
  ({ one }) => ({
    campaign: one(campaignBoard, {
      fields: [campaignDeliverable.campaignId],
      references: [campaignBoard.id],
    }),
    user: one(user, {
      fields: [campaignDeliverable.userId],
      references: [user.id],
    }),
    project: one(project, {
      fields: [campaignDeliverable.projectId],
      references: [project.id],
    }),
  }),
);

export const brandColorRelations = relations(brandColor, ({ one }) => ({
  user: one(user, {
    fields: [brandColor.userId],
    references: [user.id],
  }),
}));

export const brandLogoRelations = relations(brandLogo, ({ one }) => ({
  user: one(user, {
    fields: [brandLogo.userId],
    references: [user.id],
  }),
}));

export const brandFontRelations = relations(brandFont, ({ one }) => ({
  user: one(user, {
    fields: [brandFont.userId],
    references: [user.id],
  }),
}));

export const projectFolderRelations = relations(
  projectFolder,
  ({ one, many }) => ({
    user: one(user, {
      fields: [projectFolder.userId],
      references: [user.id],
    }),
    projects: many(project),
  }),
);

export const projectVersionRelations = relations(projectVersion, ({ one }) => ({
  project: one(project, {
    fields: [projectVersion.projectId],
    references: [project.id],
  }),
  user: one(user, {
    fields: [projectVersion.userId],
    references: [user.id],
  }),
}));

export const userAssetRelations = relations(userAsset, ({ one }) => ({
  user: one(user, {
    fields: [userAsset.userId],
    references: [user.id],
  }),
}));

export type ProjectRow = typeof project.$inferSelect;
export type BrandColorRow = typeof brandColor.$inferSelect;
export type BrandFontRow = typeof brandFont.$inferSelect;
export type BrandLogoRow = typeof brandLogo.$inferSelect;
export type DesignTemplateRow = typeof designTemplate.$inferSelect;
export type CampaignBoardRow = typeof campaignBoard.$inferSelect;
export type CampaignDeliverableRow = typeof campaignDeliverable.$inferSelect;
export type ProjectFolderRow = typeof projectFolder.$inferSelect;
export type ProjectVersionRow = typeof projectVersion.$inferSelect;
export type ProjectCommentRow = typeof projectComment.$inferSelect;
export type ProjectCommentReactionRow =
  typeof projectCommentReaction.$inferSelect;
export type ProjectPresenceRow = typeof projectPresence.$inferSelect;
export type PresentationResponseRow = typeof presentationResponse.$inferSelect;
export type PresentationRemoteSessionRow =
  typeof presentationRemoteSession.$inferSelect;
export type PresentationRemoteCommandRow =
  typeof presentationRemoteCommand.$inferSelect;
export type UserAssetRow = typeof userAsset.$inferSelect;
export type TeamWorkspaceRow = typeof teamWorkspace.$inferSelect;
export type TeamWorkspaceMemberRow = typeof teamWorkspaceMember.$inferSelect;
export type TeamWorkspaceInviteRow = typeof teamWorkspaceInvite.$inferSelect;
export type UserNotificationRow = typeof userNotification.$inferSelect;
export type ContentScheduleItemRow = typeof contentScheduleItem.$inferSelect;
export type ServerExportJobRow = typeof serverExportJob.$inferSelect;
export type UserTwoFactorRow = typeof userTwoFactor.$inferSelect;
export type WebsitePublishRow = typeof websitePublish.$inferSelect;
export type WebsiteFormSubmissionRow =
  typeof websiteFormSubmission.$inferSelect;
export type WebsiteAnalyticsEventRow =
  typeof websiteAnalyticsEvent.$inferSelect;
export type WebsiteCustomDomainRow = typeof websiteCustomDomain.$inferSelect;
export type AuthEmailRow = typeof authEmail.$inferSelect;
export type WorkspaceAuditLogRow = typeof workspaceAuditLog.$inferSelect;
