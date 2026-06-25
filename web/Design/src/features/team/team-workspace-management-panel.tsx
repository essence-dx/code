"use client";

import {
  Activity,
  Crown,
  MailPlus,
  UserCog,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TeamWorkspaceRole } from "@/db/team-workspaces";
import type {
  TeamWorkspaceManagementSummary,
  TeamWorkspaceMemberSummary,
  TeamWorkspacePendingInviteSummary,
} from "@/db/team-workspace-management";
import {
  canManageTeamInvites,
  canTransferTeamOwnership,
  canUpdateTeamMemberRole,
} from "@/features/team/team-workspace-management";
import type { TeamWorkspaceCopy } from "@/features/team/team-workspace-localization";

type ServerAction = (formData: FormData) => Promise<void> | void;

export function TeamWorkspaceManagementBlock({
  workspace,
  copy,
  revokeInviteAction,
  updateMemberRoleAction,
  transferOwnershipAction,
}: {
  workspace: TeamWorkspaceManagementSummary | undefined;
  copy: TeamWorkspaceCopy;
  revokeInviteAction: ServerAction;
  updateMemberRoleAction: ServerAction;
  transferOwnershipAction: ServerAction;
}) {
  if (!workspace) return null;

  const canManage = canManageTeamInvites(workspace.role);

  return (
    <div className="grid gap-3 xl:grid-cols-3">
      <TeamMembersBlock
        workspace={workspace}
        copy={copy}
        updateMemberRoleAction={updateMemberRoleAction}
        transferOwnershipAction={transferOwnershipAction}
      />
      <PendingInvitesBlock
        workspaceId={workspace.id}
        invites={workspace.pendingInvites}
        copy={copy}
        canManage={canManage}
        revokeInviteAction={revokeInviteAction}
      />
      <MemberActivityBlock workspace={workspace} />
    </div>
  );
}

function TeamMembersBlock({
  workspace,
  copy,
  updateMemberRoleAction,
  transferOwnershipAction,
}: {
  workspace: TeamWorkspaceManagementSummary;
  copy: TeamWorkspaceCopy;
  updateMemberRoleAction: ServerAction;
  transferOwnershipAction: ServerAction;
}) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-medium">
          <UserCog className="h-4 w-4" />
          Members
        </p>
        <Badge variant="outline">{workspace.members.length}</Badge>
      </div>
      <div className="space-y-2">
        {workspace.members.map((member) => (
          <WorkspaceMemberRow
            key={member.id}
            workspace={workspace}
            member={member}
            copy={copy}
            updateMemberRoleAction={updateMemberRoleAction}
            transferOwnershipAction={transferOwnershipAction}
          />
        ))}
      </div>
    </div>
  );
}

function PendingInvitesBlock({
  workspaceId,
  invites,
  copy,
  canManage,
  revokeInviteAction,
}: {
  workspaceId: string;
  invites: TeamWorkspacePendingInviteSummary[];
  copy: TeamWorkspaceCopy;
  canManage: boolean;
  revokeInviteAction: ServerAction;
}) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-medium">
          <MailPlus className="h-4 w-4" />
          Pending invites
        </p>
        <Badge variant="outline">{invites.length}</Badge>
      </div>
      <div className="space-y-2">
        {invites.length ? (
          invites.map((invite) => (
            <WorkspaceInviteRow
              key={invite.id}
              workspaceId={workspaceId}
              invite={invite}
              copy={copy}
              canManage={canManage}
              revokeInviteAction={revokeInviteAction}
            />
          ))
        ) : (
          <p className="text-xs text-muted-foreground">No pending invites.</p>
        )}
      </div>
    </div>
  );
}

function MemberActivityBlock({
  workspace,
}: {
  workspace: TeamWorkspaceManagementSummary;
}) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-medium">
          <Activity className="h-4 w-4" />
          Member activity
        </p>
        <Badge variant="outline">{workspace.recentActivity.length}</Badge>
      </div>
      <div className="space-y-2">
        {workspace.recentActivity.length ? (
          workspace.recentActivity.map((event) => (
            <div
              key={event.id}
              className="rounded-md border border-border bg-background p-2"
            >
              <p className="text-xs font-medium">{event.summary}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {event.actorEmail ?? "Workspace"} -{" "}
                {new Date(event.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))
        ) : (
          <p className="text-xs text-muted-foreground">
            No member activity yet.
          </p>
        )}
      </div>
    </div>
  );
}

function WorkspaceMemberRow({
  workspace,
  member,
  copy,
  updateMemberRoleAction,
  transferOwnershipAction,
}: {
  workspace: TeamWorkspaceManagementSummary;
  member: TeamWorkspaceMemberSummary;
  copy: TeamWorkspaceCopy;
  updateMemberRoleAction: ServerAction;
  transferOwnershipAction: ServerAction;
}) {
  const isOwner = member.role === "owner";
  const canEditRole = canUpdateTeamMemberRole({
    viewerRole: workspace.role,
    targetRole: member.role,
  });
  const canTransfer = canTransferTeamOwnership({
    viewerRole: workspace.role,
    targetRole: member.role,
    isSelf: workspace.ownerId === member.userId,
  });

  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium">{member.email}</p>
          <p className="text-xs text-muted-foreground">
            {roleLabel(member.role, copy)}
          </p>
        </div>
        {isOwner ? (
          <Badge variant="secondary">
            <Crown className="h-3 w-3" />
            Owner
          </Badge>
        ) : null}
      </div>

      {canEditRole ? (
        <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
          <form action={updateMemberRoleAction} className="contents">
            <input type="hidden" name="workspaceId" value={workspace.id} />
            <input type="hidden" name="memberUserId" value={member.userId} />
            <Select name="role" defaultValue={member.role}>
              <SelectTrigger className="w-full" aria-label="Member role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">{copy.roleLabels.member}</SelectItem>
                <SelectItem value="admin">{copy.roleLabels.admin}</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit" size="sm" variant="outline">
              Update
            </Button>
          </form>
          {canTransfer ? (
            <form action={transferOwnershipAction}>
              <input type="hidden" name="workspaceId" value={workspace.id} />
              <input
                type="hidden"
                name="newOwnerUserId"
                value={member.userId}
              />
              <Button type="submit" size="sm" variant="outline">
                Transfer
              </Button>
            </form>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function WorkspaceInviteRow({
  workspaceId,
  invite,
  copy,
  canManage,
  revokeInviteAction,
}: {
  workspaceId: string;
  invite: TeamWorkspacePendingInviteSummary;
  copy: TeamWorkspaceCopy;
  canManage: boolean;
  revokeInviteAction: ServerAction;
}) {
  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium">{invite.email}</p>
          <p className="text-xs text-muted-foreground">
            {roleLabel(invite.role, copy)} -{" "}
            {new Date(invite.expiresAt).toLocaleDateString()}
          </p>
        </div>
        {canManage ? (
          <form action={revokeInviteAction}>
            <input type="hidden" name="workspaceId" value={workspaceId} />
            <input type="hidden" name="inviteId" value={invite.id} />
            <Button
              type="submit"
              size="icon"
              variant="ghost"
              aria-label={`Revoke invite for ${invite.email}`}
            >
              <XCircle className="h-4 w-4" />
            </Button>
          </form>
        ) : null}
      </div>
    </div>
  );
}

function roleLabel(role: TeamWorkspaceRole, copy: TeamWorkspaceCopy) {
  return copy.roleLabels[role];
}
