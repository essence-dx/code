import type { TeamWorkspaceRole } from "@/db/team-workspaces";

export function canManageTeamInvites(role: TeamWorkspaceRole) {
  return role === "owner" || role === "admin";
}

export function canUpdateTeamMemberRole(input: {
  viewerRole: TeamWorkspaceRole;
  targetRole: TeamWorkspaceRole;
}) {
  return input.viewerRole === "owner" && input.targetRole !== "owner";
}

export function canTransferTeamOwnership(input: {
  viewerRole: TeamWorkspaceRole;
  targetRole: TeamWorkspaceRole;
  isSelf: boolean;
}) {
  return (
    input.viewerRole === "owner" &&
    input.targetRole !== "owner" &&
    !input.isSelf
  );
}
