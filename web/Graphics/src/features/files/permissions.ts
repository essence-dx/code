import { z } from "zod";

export const collaboratorRoles = ["viewer", "commenter", "editor"] as const;
export const fileAccessRoles = ["owner", ...collaboratorRoles] as const;
export const sharePermissionPresets = [
  "handoff",
  "prototype",
  "review",
] as const;

export type CollaboratorRole = (typeof collaboratorRoles)[number];
export type FileAccessRole = (typeof fileAccessRoles)[number];
export type SharePermissionPreset = (typeof sharePermissionPresets)[number];

export type FileAccessMember = {
  userId: string;
  name: string;
  email: string;
  role: FileAccessRole;
  roleLabel: string;
  createdAt: string;
};

export type ShareCapability = {
  label: string;
  description: string;
  accessLevel: "inspect" | "prototype" | "review";
  allowComments: boolean;
  allowDownload: boolean;
};

export const collaboratorRoleLabels: Record<CollaboratorRole, string> = {
  viewer: "Can view",
  commenter: "Can comment",
  editor: "Can edit",
};

export const collaboratorRoleDescriptions: Record<CollaboratorRole, string> = {
  viewer: "Inspect the file without changing design content.",
  commenter: "Review the file and participate in comment workflows.",
  editor: "Change design content, save updates, and collaborate live.",
};

export const collaboratorRoleCapabilities: Record<CollaboratorRole, string[]> = {
  viewer: ["Open file", "Inspect canvas", "View prototype"],
  commenter: ["Open file", "Add and resolve comments", "Join review"],
  editor: ["Edit layers", "Save versions", "Manage inspect links"],
};

export const sharePresetConfig: Record<
  SharePermissionPreset,
  ShareCapability
> = {
  handoff: {
    label: "Inspect",
    description: "Inspect layout, download SVG/JSON, and open prototype.",
    accessLevel: "inspect",
    allowComments: false,
    allowDownload: true,
  },
  prototype: {
    label: "Prototype",
    description: "Open the clickable prototype without file downloads.",
    accessLevel: "prototype",
    allowComments: false,
    allowDownload: false,
  },
  review: {
    label: "Review",
    description: "Review comments and open prototype without downloads.",
    accessLevel: "review",
    allowComments: true,
    allowDownload: false,
  },
};

export const collaboratorRoleSchema = z.enum(collaboratorRoles);
export const sharePermissionPresetSchema = z.enum(sharePermissionPresets);

export function canEditFile(role: FileAccessRole) {
  return role === "owner" || role === "editor";
}

export function canManageFileAccess(role: FileAccessRole) {
  return role === "owner";
}

export function normalizeCollaboratorRole(value: string): CollaboratorRole {
  return collaboratorRoleSchema.catch("viewer").parse(value);
}

export function normalizeSharePermissionPreset(
  value: string,
): SharePermissionPreset {
  return sharePermissionPresetSchema.catch("handoff").parse(value);
}
