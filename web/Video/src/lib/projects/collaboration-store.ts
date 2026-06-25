"use client";

import Dexie, { type EntityTable } from "dexie";
import type { ExportJob, ExportQaSnapshot, ExportReviewSnapshot, ExportSourceSnapshot, MediaAttributionSummary, RenderedExportFile } from "@/lib/editor/types";
import { createPublishPrepPlan, type PublishPrepChecklistItem, type PublishPrepStatus, type PublishTargetId } from "@/lib/publishing/publish-prep";
import { normalizeProjectCommentAnchor } from "@/lib/projects/comment-anchors";
import { assertWorkspacePermission, type WorkspaceRole } from "@/lib/projects/workspace-permissions";

export type ProjectFolderVisibility = "workspace" | "private";
export type ProjectFolderAssignmentAccess = "inherited" | "private" | "shared";
export type WorkspaceInvitationStatus = "pending" | "accepted" | "revoked";
export type WorkspaceAuditTargetType = "comment" | "folder" | "share" | "member" | "invite" | "project-permission" | "export-review";

export interface ProjectFolder {
  id: string;
  name: string;
  visibility: ProjectFolderVisibility;
  ownerEmail?: string;
  createdAt: string;
}

export interface ProjectFolderAssignment {
  projectId: string;
  folderId: string;
  access: ProjectFolderAssignmentAccess;
  updatedAt: string;
}

export interface ProjectComment {
  id: string;
  projectId: string;
  body: string;
  time?: number;
  timeEnd?: number;
  layerId?: string;
  canvasX?: number;
  canvasY?: number;
  resolvedAt?: string;
  createdAt: string;
}

export interface ProjectShareLink {
  projectId: string;
  token: string;
  url: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMember {
  id: string;
  name: string;
  email: string;
  role: WorkspaceRole;
  createdAt: string;
}

export interface WorkspaceInvitation {
  id: string;
  email: string;
  role: WorkspaceRole;
  status: WorkspaceInvitationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectPermissionOverride {
  id: string;
  projectId: string;
  memberEmail: string;
  role: WorkspaceRole;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceAuditEvent {
  id: string;
  action: string;
  targetType: WorkspaceAuditTargetType;
  targetId?: string;
  detail: string;
  actorRole: WorkspaceRole;
  createdAt: string;
}

export type ExportReviewStatus = "needs-review" | "changes-requested" | "approved";

export interface ExportReviewPackage {
  id: string;
  projectId: string;
  exportJobId: string;
  outputName: string;
  format: ExportJob["format"];
  preset: string;
  reviewStatus: ExportReviewStatus;
  renderedFile?: RenderedExportFile;
  sourceSnapshot?: ExportSourceSnapshot;
  reviewSnapshot?: ExportReviewSnapshot;
  exportQaSnapshot?: ExportQaSnapshot;
  mediaAttributionSummary?: MediaAttributionSummary;
  createdAt: string;
  updatedAt: string;
}

export interface ExportReviewComment {
  id: string;
  reviewId: string;
  body: string;
  resolvedAt?: string;
  createdAt: string;
}

export interface ExportReviewDownload {
  id: string;
  reviewId: string;
  filename: string;
  size: number;
  createdAt: string;
}

export interface ExportPublishPrep {
  id: string;
  reviewId: string;
  targetId: PublishTargetId;
  targetLabel: string;
  destination: string;
  status: PublishPrepStatus;
  suggestedFilename: string;
  checklist: PublishPrepChecklistItem[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceActivityReport {
  memberCount: number;
  folderCount: number;
  privateFolderCount: number;
  invitationCount: number;
  projectPermissionCount: number;
  auditEventCount: number;
  exportReviewCount: number;
  downloadCount: number;
  downloadBytes: number;
  publishPrepCount: number;
  unresolvedReviewCommentCount: number;
  recentExports: WorkspaceActivityExport[];
}

export interface WorkspaceActivityExport {
  id: string;
  outputName: string;
  format: ExportJob["format"];
  preset: string;
  reviewStatus: ExportReviewStatus;
  createdAt: string;
}

const db = new Dexie("essence-kapwing-collaboration") as Dexie & {
  folders: EntityTable<ProjectFolder, "id">;
  assignments: EntityTable<ProjectFolderAssignment, "projectId">;
  comments: EntityTable<ProjectComment, "id">;
  shares: EntityTable<ProjectShareLink, "projectId">;
  members: EntityTable<WorkspaceMember, "id">;
  invitations: EntityTable<WorkspaceInvitation, "id">;
  projectPermissions: EntityTable<ProjectPermissionOverride, "id">;
  auditEvents: EntityTable<WorkspaceAuditEvent, "id">;
  exportReviews: EntityTable<ExportReviewPackage, "id">;
  exportReviewComments: EntityTable<ExportReviewComment, "id">;
  exportReviewDownloads: EntityTable<ExportReviewDownload, "id">;
  exportPublishPreps: EntityTable<ExportPublishPrep, "id">;
};

db.version(1).stores({
  folders: "id, name, createdAt",
  assignments: "projectId, folderId, updatedAt",
  comments: "id, projectId, createdAt, resolvedAt",
  shares: "projectId, token, enabled, updatedAt",
  members: "id, email, role, createdAt",
});

db.version(2).stores({
  folders: "id, name, createdAt",
  assignments: "projectId, folderId, updatedAt",
  comments: "id, projectId, createdAt, resolvedAt",
  shares: "projectId, token, enabled, updatedAt",
  members: "id, email, role, createdAt",
  exportReviews: "id, projectId, exportJobId, reviewStatus, createdAt",
  exportReviewComments: "id, reviewId, createdAt, resolvedAt",
  exportReviewDownloads: "id, reviewId, createdAt",
});

db.version(3).stores({
  folders: "id, name, createdAt",
  assignments: "projectId, folderId, updatedAt",
  comments: "id, projectId, createdAt, resolvedAt",
  shares: "projectId, token, enabled, updatedAt",
  members: "id, email, role, createdAt",
  exportReviews: "id, projectId, exportJobId, reviewStatus, createdAt",
  exportReviewComments: "id, reviewId, createdAt, resolvedAt",
  exportReviewDownloads: "id, reviewId, createdAt",
  exportPublishPreps: "id, reviewId, targetId, status, updatedAt",
});

db.version(4).stores({
  folders: "id, name, visibility, createdAt",
  assignments: "projectId, folderId, access, updatedAt",
  comments: "id, projectId, createdAt, resolvedAt",
  shares: "projectId, token, enabled, updatedAt",
  members: "id, email, role, createdAt",
  invitations: "id, email, status, role, updatedAt",
  projectPermissions: "id, projectId, memberEmail, role, updatedAt",
  auditEvents: "id, action, targetType, createdAt",
  exportReviews: "id, projectId, exportJobId, reviewStatus, createdAt",
  exportReviewComments: "id, reviewId, createdAt, resolvedAt",
  exportReviewDownloads: "id, reviewId, createdAt",
  exportPublishPreps: "id, reviewId, targetId, status, updatedAt",
});

export async function listProjectFolders() {
  const folders = await db.folders.orderBy("name").toArray();
  return folders.map(normalizeProjectFolder);
}

export async function createProjectFolder(
  name: string,
  actorRole: WorkspaceRole = "owner",
  options: { visibility?: ProjectFolderVisibility; ownerEmail?: string } = {},
) {
  assertWorkspacePermission(actorRole, "folder:manage");
  const visibility = normalizeFolderVisibility(options.visibility);
  if (visibility === "private") {
    assertWorkspacePermission(actorRole, "private-folder:manage");
  }
  const normalized = normalizeProjectFolderName(name);
  if (!normalized) return null;

  const folder: ProjectFolder = {
    id: crypto.randomUUID(),
    name: normalized,
    visibility,
    ownerEmail: normalizeOptionalEmail(options.ownerEmail),
    createdAt: new Date().toISOString(),
  };
  await db.folders.add(folder);
  await recordWorkspaceAuditEvent({
    action: "created",
    targetType: "folder",
    targetId: folder.id,
    detail: `${folder.visibility} folder ${folder.name}`,
    actorRole,
  });
  return folder;
}

export async function renameProjectFolder(folderId: string, name: string, actorRole: WorkspaceRole = "owner") {
  assertWorkspacePermission(actorRole, "folder:manage");
  const normalized = normalizeProjectFolderName(name);
  if (!normalized) return null;

  const folder = await db.folders.get(folderId);
  if (!folder) return null;

  const updatedFolder = { ...normalizeProjectFolder(folder), name: normalized };
  await db.folders.put(updatedFolder);
  await recordWorkspaceAuditEvent({
    action: "renamed",
    targetType: "folder",
    targetId: folderId,
    detail: updatedFolder.name,
    actorRole,
  });
  return updatedFolder;
}

export async function deleteProjectFolder(folderId: string, actorRole: WorkspaceRole = "owner") {
  assertWorkspacePermission(actorRole, "folder:manage");
  await db.transaction("rw", db.folders, db.assignments, async () => {
    await db.folders.delete(folderId);
    await db.assignments.where("folderId").equals(folderId).delete();
  });
  await recordWorkspaceAuditEvent({
    action: "deleted",
    targetType: "folder",
    targetId: folderId,
    detail: "Folder and assignments removed",
    actorRole,
  });
}

export async function getProjectFolderAssignment(projectId: string) {
  const assignment = await db.assignments.get(projectId);
  return assignment ? normalizeFolderAssignment(assignment) : undefined;
}

export async function updateProjectFolderVisibility(folderId: string, visibility: ProjectFolderVisibility, actorRole: WorkspaceRole = "owner") {
  assertWorkspacePermission(actorRole, "folder:manage");
  const nextVisibility = normalizeFolderVisibility(visibility);
  if (nextVisibility === "private") {
    assertWorkspacePermission(actorRole, "private-folder:manage");
  }

  const folder = await db.folders.get(folderId);
  if (!folder) return null;

  const updatedFolder = { ...normalizeProjectFolder(folder), visibility: nextVisibility };
  await db.folders.put(updatedFolder);
  await recordWorkspaceAuditEvent({
    action: "visibility-updated",
    targetType: "folder",
    targetId: folderId,
    detail: `${updatedFolder.name} is ${updatedFolder.visibility}`,
    actorRole,
  });
  return updatedFolder;
}

export async function assignProjectFolder(
  projectId: string,
  folderId: string | null,
  actorRole: WorkspaceRole = "owner",
  options: { access?: ProjectFolderAssignmentAccess } = {},
) {
  assertWorkspacePermission(actorRole, "folder:manage");
  const access = normalizeFolderAssignmentAccess(options.access);
  if (access !== "inherited") {
    assertWorkspacePermission(actorRole, "project-permission:manage");
  }
  if (!folderId) {
    await db.assignments.delete(projectId);
    await recordWorkspaceAuditEvent({
      action: "unassigned",
      targetType: "folder",
      targetId: projectId,
      detail: "Project removed from folder",
      actorRole,
    });
    return null;
  }

  const assignment: ProjectFolderAssignment = {
    projectId,
    folderId,
    access,
    updatedAt: new Date().toISOString(),
  };
  await db.assignments.put(assignment);
  await recordWorkspaceAuditEvent({
    action: "assigned",
    targetType: "folder",
    targetId: folderId,
    detail: `Project access ${assignment.access}`,
    actorRole,
  });
  return assignment;
}

export async function listProjectComments(projectId: string) {
  const comments = await db.comments.where("projectId").equals(projectId).toArray();
  return comments.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function addProjectComment(input: {
  projectId: string;
  body: string;
  time?: number;
  timeEnd?: number;
  layerId?: string;
  canvasX?: number;
  canvasY?: number;
  actorRole?: WorkspaceRole;
}) {
  const actorRole = input.actorRole ?? "owner";
  assertWorkspacePermission(actorRole, "comment:create");
  const body = input.body.trim().slice(0, 1000);
  if (!body) return null;

  const time = normalizeCommentTime(input.time);
  const timeEnd = normalizeCommentTime(input.timeEnd);
  const layerId = normalizeOptionalId(input.layerId);
  const anchor = normalizeProjectCommentAnchor({ ...input, time, timeEnd, layerId });
  const comment: ProjectComment = {
    id: crypto.randomUUID(),
    projectId: input.projectId,
    body,
    time,
    timeEnd: anchor.timeEnd,
    layerId,
    canvasX: anchor.canvasX,
    canvasY: anchor.canvasY,
    createdAt: new Date().toISOString(),
  };
  await db.comments.add(comment);
  await recordWorkspaceAuditEvent({
    action: "created",
    targetType: "comment",
    targetId: comment.id,
    detail: comment.layerId ? "Layer-anchored comment" : "Project comment",
    actorRole,
  });
  return comment;
}

export async function setProjectCommentResolved(commentId: string, resolved: boolean, actorRole: WorkspaceRole = "owner") {
  assertWorkspacePermission(actorRole, "comment:resolve");
  await db.comments.update(commentId, {
    resolvedAt: resolved ? new Date().toISOString() : undefined,
  });
  await recordWorkspaceAuditEvent({
    action: resolved ? "resolved" : "reopened",
    targetType: "comment",
    targetId: commentId,
    detail: "Review comment status changed",
    actorRole,
  });
}

export async function getOrCreateShareLink(projectId: string, origin: string, actorRole: WorkspaceRole = "owner") {
  assertWorkspacePermission(actorRole, "share:manage");
  const existing = await db.shares.get(projectId);
  if (existing?.enabled) return existing;

  const now = new Date().toISOString();
  const token = crypto.randomUUID();
  const link: ProjectShareLink = {
    projectId,
    token,
    url: `${origin}/editor?project=${encodeURIComponent(projectId)}&review=${encodeURIComponent(token)}`,
    enabled: true,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  await db.shares.put(link);
  await recordWorkspaceAuditEvent({
    action: existing ? "re-enabled" : "created",
    targetType: "share",
    targetId: projectId,
    detail: "Local review link",
    actorRole,
  });
  return link;
}

export async function listWorkspaceMembers() {
  return db.members.orderBy("createdAt").toArray();
}

export async function listWorkspaceInvitations() {
  const invitations = await db.invitations.orderBy("updatedAt").reverse().toArray();
  return invitations.map(normalizeWorkspaceInvitation);
}

export async function createWorkspaceInvitation(input: { email: string; role: WorkspaceRole; actorRole?: WorkspaceRole }) {
  const actorRole = input.actorRole ?? "owner";
  assertWorkspacePermission(actorRole, "invite:manage");
  const email = normalizeOptionalEmail(input.email);
  if (!email) return null;

  const existing = (await db.invitations.where("email").equals(email).toArray()).find((invite) => invite.status === "pending");
  const now = new Date().toISOString();
  const invitation: WorkspaceInvitation = {
    id: existing?.id ?? crypto.randomUUID(),
    email,
    role: input.role,
    status: "pending",
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  await db.invitations.put(invitation);
  await recordWorkspaceAuditEvent({
    action: existing ? "resent" : "created",
    targetType: "invite",
    targetId: invitation.id,
    detail: `${invitation.email} as ${invitation.role}`,
    actorRole,
  });
  return invitation;
}

export async function revokeWorkspaceInvitation(invitationId: string, actorRole: WorkspaceRole = "owner") {
  assertWorkspacePermission(actorRole, "invite:manage");
  const invitation = await db.invitations.get(invitationId);
  if (!invitation) return null;

  const revoked: WorkspaceInvitation = { ...normalizeWorkspaceInvitation(invitation), status: "revoked", updatedAt: new Date().toISOString() };
  await db.invitations.put(revoked);
  await recordWorkspaceAuditEvent({
    action: "revoked",
    targetType: "invite",
    targetId: invitationId,
    detail: revoked.email,
    actorRole,
  });
  return revoked;
}

export async function listProjectPermissionOverrides(projectId: string) {
  const overrides = await db.projectPermissions.where("projectId").equals(projectId).toArray();
  return overrides.map(normalizeProjectPermissionOverride).sort((a, b) => a.memberEmail.localeCompare(b.memberEmail));
}

export async function setProjectPermissionOverride(input: { projectId: string; memberEmail: string; role: WorkspaceRole; actorRole?: WorkspaceRole }) {
  const actorRole = input.actorRole ?? "owner";
  assertWorkspacePermission(actorRole, "project-permission:manage");
  const memberEmail = normalizeOptionalEmail(input.memberEmail);
  if (!memberEmail) return null;

  const existing = (await db.projectPermissions.where("projectId").equals(input.projectId).toArray()).find((override) => override.memberEmail === memberEmail);
  const now = new Date().toISOString();
  const override: ProjectPermissionOverride = {
    id: existing?.id ?? crypto.randomUUID(),
    projectId: input.projectId,
    memberEmail,
    role: input.role,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  await db.projectPermissions.put(override);
  await recordWorkspaceAuditEvent({
    action: existing ? "updated" : "created",
    targetType: "project-permission",
    targetId: override.id,
    detail: `${override.memberEmail} as ${override.role}`,
    actorRole,
  });
  return override;
}

export async function removeProjectPermissionOverride(overrideId: string, actorRole: WorkspaceRole = "owner") {
  assertWorkspacePermission(actorRole, "project-permission:manage");
  await db.projectPermissions.delete(overrideId);
  await recordWorkspaceAuditEvent({
    action: "removed",
    targetType: "project-permission",
    targetId: overrideId,
    detail: "Project access override removed",
    actorRole,
  });
}

export async function listWorkspaceAuditEvents(limit = 30, actorRole: WorkspaceRole = "owner") {
  assertWorkspacePermission(actorRole, "audit:view");
  const events = await db.auditEvents.orderBy("createdAt").reverse().limit(Math.max(1, Math.min(100, limit))).toArray();
  return events.map(normalizeWorkspaceAuditEvent);
}

export async function createWorkspaceActivityReport(): Promise<WorkspaceActivityReport> {
  const [members, folders, invitations, projectPermissions, auditEvents, reviews, downloads, publishPreps, reviewComments] = await Promise.all([
    db.members.toArray(),
    db.folders.toArray(),
    db.invitations.toArray(),
    db.projectPermissions.toArray(),
    db.auditEvents.toArray(),
    db.exportReviews.toArray(),
    db.exportReviewDownloads.toArray(),
    db.exportPublishPreps.toArray(),
    db.exportReviewComments.toArray(),
  ]);

  return {
    memberCount: members.length,
    folderCount: folders.length,
    privateFolderCount: folders.map(normalizeProjectFolder).filter((folder) => folder.visibility === "private").length,
    invitationCount: invitations.map(normalizeWorkspaceInvitation).filter((invitation) => invitation.status === "pending").length,
    projectPermissionCount: projectPermissions.length,
    auditEventCount: auditEvents.length,
    exportReviewCount: reviews.length,
    downloadCount: downloads.length,
    downloadBytes: downloads.reduce((total, download) => total + Math.max(0, download.size), 0),
    publishPrepCount: publishPreps.length,
    unresolvedReviewCommentCount: reviewComments.filter((comment) => !comment.resolvedAt).length,
    recentExports: reviews
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 5)
      .map((review) => ({
        id: review.id,
        outputName: review.outputName,
        format: review.format,
        preset: review.preset,
        reviewStatus: review.reviewStatus,
        createdAt: review.createdAt,
      })),
  };
}

export async function addWorkspaceMember(input: { name: string; email: string; role: WorkspaceMember["role"]; actorRole?: WorkspaceRole }) {
  const actorRole = input.actorRole ?? "owner";
  assertWorkspacePermission(actorRole, "member:manage");
  const name = input.name.trim().slice(0, 80);
  const email = input.email.trim().toLowerCase().slice(0, 120);
  if (!name || !isWorkspaceEmail(email)) return null;

  const member: WorkspaceMember = {
    id: crypto.randomUUID(),
    name,
    email,
    role: input.role,
    createdAt: new Date().toISOString(),
  };
  await db.members.add(member);
  await recordWorkspaceAuditEvent({
    action: "added",
    targetType: "member",
    targetId: member.id,
    detail: `${member.email} as ${member.role}`,
    actorRole,
  });
  return member;
}

export async function removeWorkspaceMember(memberId: string, actorRole: WorkspaceRole = "owner") {
  assertWorkspacePermission(actorRole, "member:manage");
  await db.members.delete(memberId);
  await recordWorkspaceAuditEvent({
    action: "removed",
    targetType: "member",
    targetId: memberId,
    detail: "Workspace member removed",
    actorRole,
  });
}

export async function createExportReviewPackage(input: { job: ExportJob; origin: string }) {
  const existing = await db.exportReviews.where("exportJobId").equals(input.job.id).first();
  const now = new Date().toISOString();
  const review: ExportReviewPackage = {
    id: existing?.id ?? crypto.randomUUID(),
    projectId: input.job.projectId,
    exportJobId: input.job.id,
    outputName: input.job.outputName,
    format: input.job.format,
    preset: input.job.preset,
    reviewStatus: existing?.reviewStatus ?? initialExportReviewStatus(input.job),
    renderedFile: input.job.renderedFile,
    sourceSnapshot: input.job.sourceSnapshot,
    reviewSnapshot: input.job.reviewSnapshot,
    exportQaSnapshot: input.job.exportQaSnapshot,
    mediaAttributionSummary: input.job.mediaAttributionSummary,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  await db.exportReviews.put(review);
  await recordWorkspaceAuditEvent({
    action: existing ? "updated" : "created",
    targetType: "export-review",
    targetId: review.id,
    detail: `${review.outputName} ${review.reviewStatus}`,
    actorRole: "owner",
  });
  return {
    review,
    url: `${input.origin}/review/${encodeURIComponent(review.id)}`,
  };
}

export async function getExportReviewPackage(reviewId: string) {
  return db.exportReviews.get(reviewId);
}

export async function listProjectExportReviews(projectId: string) {
  const reviews = await db.exportReviews.where("projectId").equals(projectId).toArray();
  return reviews.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function setExportReviewStatus(reviewId: string, reviewStatus: ExportReviewStatus) {
  await db.exportReviews.update(reviewId, {
    reviewStatus,
    updatedAt: new Date().toISOString(),
  });
  await recordWorkspaceAuditEvent({
    action: "status-updated",
    targetType: "export-review",
    targetId: reviewId,
    detail: reviewStatus,
    actorRole: "owner",
  });
}

export async function listExportReviewComments(reviewId: string) {
  const comments = await db.exportReviewComments.where("reviewId").equals(reviewId).toArray();
  return comments.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function addExportReviewComment(input: { reviewId: string; body: string }) {
  const body = input.body.trim().slice(0, 1000);
  if (!body) return null;

  const comment: ExportReviewComment = {
    id: crypto.randomUUID(),
    reviewId: input.reviewId,
    body,
    createdAt: new Date().toISOString(),
  };
  await db.exportReviewComments.add(comment);
  return comment;
}

export async function setExportReviewCommentResolved(commentId: string, resolved: boolean) {
  await db.exportReviewComments.update(commentId, {
    resolvedAt: resolved ? new Date().toISOString() : undefined,
  });
}

export async function listExportReviewDownloads(reviewId: string) {
  const downloads = await db.exportReviewDownloads.where("reviewId").equals(reviewId).toArray();
  return downloads.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function recordExportReviewDownload(review: ExportReviewPackage) {
  const download: ExportReviewDownload = {
    id: crypto.randomUUID(),
    reviewId: review.id,
    filename: review.renderedFile?.filename ?? review.outputName,
    size: review.renderedFile?.size ?? 0,
    createdAt: new Date().toISOString(),
  };
  await db.exportReviewDownloads.add(download);
  return download;
}

export async function listExportPublishPreps(reviewId: string) {
  const records = await db.exportPublishPreps.where("reviewId").equals(reviewId).toArray();
  return records.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function createExportPublishPrep(review: ExportReviewPackage, targetId: PublishTargetId) {
  const existing = (await db.exportPublishPreps.where("reviewId").equals(review.id).toArray()).find((record) => record.targetId === targetId);
  const now = new Date().toISOString();
  const plan = createPublishPrepPlan(review, targetId);
  const record: ExportPublishPrep = {
    id: existing?.id ?? crypto.randomUUID(),
    reviewId: review.id,
    targetId,
    targetLabel: plan.target.label,
    destination: plan.target.destination,
    status: plan.status,
    suggestedFilename: plan.suggestedFilename,
    checklist: plan.checklist,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  await db.exportPublishPreps.put(record);
  return record;
}

async function recordWorkspaceAuditEvent(input: {
  action: string;
  targetType: WorkspaceAuditTargetType;
  targetId?: string;
  detail: string;
  actorRole: WorkspaceRole;
}) {
  const event: WorkspaceAuditEvent = {
    id: crypto.randomUUID(),
    action: normalizeOptionalId(input.action) ?? "updated",
    targetType: input.targetType,
    targetId: normalizeOptionalId(input.targetId),
    detail: input.detail.trim().slice(0, 180) || "Workspace updated",
    actorRole: input.actorRole,
    createdAt: new Date().toISOString(),
  };
  await db.auditEvents.add(event);
  return event;
}

function initialExportReviewStatus(job: ExportJob): ExportReviewStatus {
  if (job.exportQaSnapshot?.status === "blocked") return "changes-requested";
  if (job.reviewSnapshot?.status === "blocked") return "changes-requested";
  return job.reviewSnapshot?.status === "ready" && job.exportQaSnapshot?.status === "ready" ? "approved" : "needs-review";
}

function normalizeProjectFolder(folder: ProjectFolder): ProjectFolder {
  return {
    ...folder,
    name: normalizeProjectFolderName(folder.name) || "Untitled folder",
    visibility: normalizeFolderVisibility(folder.visibility),
    ownerEmail: normalizeOptionalEmail(folder.ownerEmail),
    createdAt: normalizeIsoDate(folder.createdAt),
  };
}

function normalizeFolderAssignment(assignment: ProjectFolderAssignment): ProjectFolderAssignment {
  return {
    ...assignment,
    access: normalizeFolderAssignmentAccess(assignment.access),
    updatedAt: normalizeIsoDate(assignment.updatedAt),
  };
}

function normalizeWorkspaceInvitation(invitation: WorkspaceInvitation): WorkspaceInvitation {
  return {
    ...invitation,
    email: normalizeOptionalEmail(invitation.email) ?? "unknown@example.com",
    role: normalizeWorkspaceRole(invitation.role),
    status: normalizeInvitationStatus(invitation.status),
    createdAt: normalizeIsoDate(invitation.createdAt),
    updatedAt: normalizeIsoDate(invitation.updatedAt),
  };
}

function normalizeProjectPermissionOverride(override: ProjectPermissionOverride): ProjectPermissionOverride {
  return {
    ...override,
    memberEmail: normalizeOptionalEmail(override.memberEmail) ?? "unknown@example.com",
    role: normalizeWorkspaceRole(override.role),
    createdAt: normalizeIsoDate(override.createdAt),
    updatedAt: normalizeIsoDate(override.updatedAt),
  };
}

function normalizeWorkspaceAuditEvent(event: WorkspaceAuditEvent): WorkspaceAuditEvent {
  return {
    ...event,
    action: normalizeOptionalId(event.action) ?? "updated",
    targetId: normalizeOptionalId(event.targetId),
    detail: event.detail.trim().slice(0, 180) || "Workspace updated",
    actorRole: normalizeWorkspaceRole(event.actorRole),
    createdAt: normalizeIsoDate(event.createdAt),
  };
}

function normalizeProjectFolderName(value: string) {
  return value.trim().slice(0, 64);
}

function normalizeFolderVisibility(value: ProjectFolderVisibility | undefined): ProjectFolderVisibility {
  return value === "private" ? "private" : "workspace";
}

function normalizeFolderAssignmentAccess(value: ProjectFolderAssignmentAccess | undefined): ProjectFolderAssignmentAccess {
  if (value === "private" || value === "shared") return value;
  return "inherited";
}

function normalizeInvitationStatus(value: WorkspaceInvitationStatus | undefined): WorkspaceInvitationStatus {
  if (value === "accepted" || value === "revoked") return value;
  return "pending";
}

function normalizeWorkspaceRole(value: WorkspaceRole | undefined): WorkspaceRole {
  if (value === "owner" || value === "editor" || value === "viewer") return value;
  return "viewer";
}

function normalizeCommentTime(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 7200 ? Math.round(value * 100) / 100 : undefined;
}

function normalizeOptionalId(value: string | undefined) {
  const normalized = value?.trim().slice(0, 160);
  return normalized || undefined;
}

function normalizeOptionalEmail(value: string | undefined) {
  const normalized = value?.trim().toLowerCase().slice(0, 120);
  return normalized && isWorkspaceEmail(normalized) ? normalized : undefined;
}

function normalizeIsoDate(value: string | undefined) {
  const timestamp = value ? Date.parse(value) : NaN;
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : new Date().toISOString();
}

function isWorkspaceEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
