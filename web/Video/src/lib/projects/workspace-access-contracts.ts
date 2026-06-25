import { z } from "zod";

export const serverWorkspaceRoleSchema = z.enum(["owner", "editor", "viewer"]);
export const serverFolderVisibilitySchema = z.enum(["workspace", "private"]);
export const serverProjectFolderAccessSchema = z.enum(["inherited", "private", "shared"]);
export const serverWorkspaceInvitationStatusSchema = z.enum(["pending", "accepted", "revoked"]);

export const serverWorkspaceFolderSchema = z.object({
  id: z.string(),
  name: z.string(),
  visibility: serverFolderVisibilitySchema,
  ownerId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const serverWorkspaceInvitationSchema = z.object({
  id: z.string(),
  email: z.string(),
  role: serverWorkspaceRoleSchema,
  status: serverWorkspaceInvitationStatusSchema,
  acceptPath: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const serverProjectPermissionOverrideSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  memberEmail: z.string(),
  role: serverWorkspaceRoleSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const serverWorkspaceAuditEventSchema = z.object({
  id: z.string(),
  action: z.string(),
  targetType: z.enum(["comment", "folder", "share", "member", "invite", "project-permission", "export-review", "project"]),
  targetId: z.string().nullable(),
  detail: z.string(),
  createdAt: z.string(),
});

export const serverWorkspaceAccessSummarySchema = z.object({
  projectId: z.string(),
  workspaceId: z.string(),
  activeRole: serverWorkspaceRoleSchema,
  folderId: z.string().nullable(),
  folderAccess: serverProjectFolderAccessSchema,
  folders: z.array(serverWorkspaceFolderSchema),
  invitations: z.array(serverWorkspaceInvitationSchema),
  projectPermissions: z.array(serverProjectPermissionOverrideSchema),
  auditEvents: z.array(serverWorkspaceAuditEventSchema),
});

export const createServerWorkspaceInvitationInputSchema = z.object({
  action: z.literal("create-invitation"),
  email: z.string().trim().email().max(160).transform((value) => value.toLowerCase()),
  role: serverWorkspaceRoleSchema.default("viewer"),
});

export const revokeServerWorkspaceInvitationInputSchema = z.object({
  action: z.literal("revoke-invitation"),
  invitationId: z.string().trim().min(1).max(180),
});

export const setServerProjectPermissionInputSchema = z.object({
  action: z.literal("set-project-permission"),
  memberEmail: z.string().trim().email().max(160).transform((value) => value.toLowerCase()),
  role: serverWorkspaceRoleSchema.default("viewer"),
});

export const removeServerProjectPermissionInputSchema = z.object({
  action: z.literal("remove-project-permission"),
  permissionId: z.string().trim().min(1).max(180),
});

export const createServerWorkspaceFolderInputSchema = z.object({
  action: z.literal("create-folder"),
  name: z.string().trim().min(1).max(64),
  visibility: serverFolderVisibilitySchema.default("workspace"),
  assignProject: z.boolean().default(true),
  folderAccess: serverProjectFolderAccessSchema.default("inherited"),
});

export const setServerProjectFolderAccessInputSchema = z.object({
  action: z.literal("set-project-folder-access"),
  folderId: z.string().trim().min(1).max(180).nullable(),
  folderAccess: serverProjectFolderAccessSchema.default("inherited"),
});

export const setServerFolderVisibilityInputSchema = z.object({
  action: z.literal("set-folder-visibility"),
  folderId: z.string().trim().min(1).max(180),
  visibility: serverFolderVisibilitySchema,
});

export const serverWorkspaceAccessMutationSchema = z.discriminatedUnion("action", [
  createServerWorkspaceInvitationInputSchema,
  revokeServerWorkspaceInvitationInputSchema,
  setServerProjectPermissionInputSchema,
  removeServerProjectPermissionInputSchema,
  createServerWorkspaceFolderInputSchema,
  setServerProjectFolderAccessInputSchema,
  setServerFolderVisibilityInputSchema,
]);

export const serverWorkspaceInvitationAcceptanceSchema = z.object({
  workspaceId: z.string(),
  email: z.string(),
  role: serverWorkspaceRoleSchema,
  status: z.literal("accepted"),
  acceptedAt: z.string(),
});

export function workspaceInvitationAcceptPath(token: string) {
  return `/invite/${encodeURIComponent(token)}`;
}

export type ServerWorkspaceRole = z.infer<typeof serverWorkspaceRoleSchema>;
export type ServerFolderVisibility = z.infer<typeof serverFolderVisibilitySchema>;
export type ServerProjectFolderAccess = z.infer<typeof serverProjectFolderAccessSchema>;
export type ServerWorkspaceAccessSummary = z.infer<typeof serverWorkspaceAccessSummarySchema>;
export type ServerWorkspaceAccessMutation = z.infer<typeof serverWorkspaceAccessMutationSchema>;
export type ServerWorkspaceInvitationAcceptance = z.infer<typeof serverWorkspaceInvitationAcceptanceSchema>;
