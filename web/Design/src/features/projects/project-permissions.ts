import type { SharePermission } from "@/features/editor/types";

export const projectPermissionPresets = [
  "owner",
  "editor",
  "commenter",
  "viewer",
  "audience",
] as const;

export type ProjectPermissionPreset = (typeof projectPermissionPresets)[number];

export const sharePermissions = ["view", "comment", "edit"] as const;

export const sharePermissionLabels: Record<SharePermission, string> = {
  view: "View only",
  comment: "Can comment",
  edit: "Can edit",
};

export const projectPermissionPresetLabels: Record<
  ProjectPermissionPreset,
  string
> = {
  owner: "Owner",
  editor: "Editor",
  commenter: "Commenter",
  viewer: "Viewer",
  audience: "Public audience",
};

export function normalizeSharePermission(value: unknown): SharePermission {
  if (value === "comment" || value === "edit") {
    return value;
  }

  return "view";
}

export function canCommentWithSharePermission(permission: SharePermission) {
  return permission === "comment" || permission === "edit";
}

export function canWriteWithSharePermission(permission: SharePermission) {
  return permission === "edit";
}

export function getProjectPermissionPresetForShare(
  permission: SharePermission,
): Extract<ProjectPermissionPreset, "editor" | "commenter" | "viewer"> {
  if (permission === "edit") return "editor";
  if (permission === "comment") return "commenter";

  return "viewer";
}
