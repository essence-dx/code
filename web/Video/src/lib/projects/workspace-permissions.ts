export type WorkspaceRole = "owner" | "editor" | "viewer";

export type WorkspacePermission =
  | "comment:create"
  | "comment:resolve"
  | "folder:manage"
  | "private-folder:manage"
  | "share:manage"
  | "member:manage"
  | "invite:manage"
  | "project-permission:manage"
  | "audit:view"
  | "export-history:view";

export const workspaceRoleLabels: Record<WorkspaceRole, string> = {
  owner: "Owner",
  editor: "Editor",
  viewer: "Viewer",
};

export const workspaceRoleDescriptions: Record<WorkspaceRole, string> = {
  owner: "Can manage access, private folders, review links, comments, audit history, and export history.",
  editor: "Can manage folders, review links, comments, and export history.",
  viewer: "Can comment and view export history without changing workspace setup.",
};

const rolePermissions: Record<WorkspaceRole, WorkspacePermission[]> = {
  owner: [
    "comment:create",
    "comment:resolve",
    "folder:manage",
    "private-folder:manage",
    "share:manage",
    "member:manage",
    "invite:manage",
    "project-permission:manage",
    "audit:view",
    "export-history:view",
  ],
  editor: ["comment:create", "comment:resolve", "folder:manage", "share:manage", "audit:view", "export-history:view"],
  viewer: ["comment:create", "export-history:view"],
};

export function canWorkspaceRole(role: WorkspaceRole, permission: WorkspacePermission) {
  return rolePermissions[role].includes(permission);
}

export function createWorkspacePermissionSet(role: WorkspaceRole) {
  return {
    canCreateComment: canWorkspaceRole(role, "comment:create"),
    canResolveComment: canWorkspaceRole(role, "comment:resolve"),
    canManageFolders: canWorkspaceRole(role, "folder:manage"),
    canManagePrivateFolders: canWorkspaceRole(role, "private-folder:manage"),
    canManageShareLinks: canWorkspaceRole(role, "share:manage"),
    canManageMembers: canWorkspaceRole(role, "member:manage"),
    canManageInvites: canWorkspaceRole(role, "invite:manage"),
    canManageProjectPermissions: canWorkspaceRole(role, "project-permission:manage"),
    canViewAuditHistory: canWorkspaceRole(role, "audit:view"),
    canViewExportHistory: canWorkspaceRole(role, "export-history:view"),
  };
}

export function assertWorkspacePermission(role: WorkspaceRole, permission: WorkspacePermission) {
  if (!canWorkspaceRole(role, permission)) {
    throw new WorkspacePermissionError(permission);
  }
}

export class WorkspacePermissionError extends Error {
  constructor(permission: WorkspacePermission) {
    super(`Workspace role does not allow ${permission}.`);
    this.name = "WorkspacePermissionError";
  }
}
