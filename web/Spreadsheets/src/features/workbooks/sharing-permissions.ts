import type { WorkbookRole } from "@/features/workbooks/types";

export const workbookRoles = ["owner", "editor", "commenter", "viewer"] as const;
export const workbookCollaboratorRoles = ["editor", "commenter", "viewer"] as const;

type CollaboratorRole = Exclude<WorkbookRole, "owner">;

const roleWeights: Record<WorkbookRole, number> = {
  owner: 4,
  editor: 3,
  commenter: 2,
  viewer: 1,
};

export function normalizeWorkbookRole(value: unknown): WorkbookRole {
  return workbookRoles.includes(value as WorkbookRole)
    ? (value as WorkbookRole)
    : "viewer";
}

export function normalizeWorkbookCollaboratorRole(
  value: unknown,
): CollaboratorRole {
  const role = normalizeWorkbookRole(value);

  return role === "owner" ? "viewer" : role;
}

export function canEditWorkbook(role: WorkbookRole) {
  return role === "owner" || role === "editor";
}

export function canManageWorkbookSharing(role: WorkbookRole) {
  return role === "owner";
}

export function canCommentWorkbook(role: WorkbookRole) {
  return canEditWorkbook(role) || role === "commenter";
}

export function pickStrongerWorkbookRole(
  currentRole: CollaboratorRole | null | undefined,
  incomingRole: CollaboratorRole,
): CollaboratorRole {
  if (!currentRole) {
    return incomingRole;
  }

  return roleWeights[currentRole] >= roleWeights[incomingRole]
    ? currentRole
    : incomingRole;
}
