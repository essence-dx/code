import { z } from "zod";

export const projectAccessRoles = ["admin", "editor", "viewer"] as const;
export const projectResolvedRoles = ["owner", ...projectAccessRoles] as const;

export const projectAccessRoleSchema = z.enum(projectAccessRoles);

export type ProjectAccessRole = (typeof projectAccessRoles)[number];
export type ProjectResolvedRole = (typeof projectResolvedRoles)[number];

export const projectRoleRank: Record<ProjectResolvedRole, number> = {
  owner: 4,
  admin: 3,
  editor: 2,
  viewer: 1,
};

export function hasProjectRole(role: ProjectResolvedRole | null, minimum: ProjectResolvedRole) {
  return role ? projectRoleRank[role] >= projectRoleRank[minimum] : false;
}
