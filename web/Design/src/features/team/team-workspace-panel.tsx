"use client";

import { MailPlus, ShieldCheck, UserPlus, UsersRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  TeamWorkspaceInviteSummary,
  TeamWorkspaceRole,
  TeamWorkspaceSummary,
} from "@/db/team-workspaces";
import type {
  TeamWorkspaceManagementSummary,
} from "@/db/team-workspace-management";
import type { EditorLocale } from "@/features/editor/editor-localization";
import { canManageTeamInvites } from "@/features/team/team-workspace-management";
import { TeamWorkspaceManagementBlock } from "@/features/team/team-workspace-management-panel";
import {
  getTeamWorkspaceCopy,
  type TeamWorkspaceCopy,
} from "@/features/team/team-workspace-localization";

type ServerAction = (formData: FormData) => Promise<void> | void;

type TeamWorkspacePanelProps = {
  locale: EditorLocale;
  workspaces: TeamWorkspaceSummary[];
  pendingInvites: TeamWorkspaceInviteSummary[];
  workspaceManagement: TeamWorkspaceManagementSummary[];
  createWorkspaceAction: ServerAction;
  inviteMemberAction: ServerAction;
  acceptInviteAction: ServerAction;
  revokeInviteAction: ServerAction;
  updateMemberRoleAction: ServerAction;
  transferOwnershipAction: ServerAction;
};

export function TeamWorkspacePanel({
  locale,
  workspaces,
  pendingInvites,
  workspaceManagement,
  createWorkspaceAction,
  inviteMemberAction,
  acceptInviteAction,
  revokeInviteAction,
  updateMemberRoleAction,
  transferOwnershipAction,
}: TeamWorkspacePanelProps) {
  const copy = getTeamWorkspaceCopy(locale);
  const managementByWorkspace = new Map(
    workspaceManagement.map((workspace) => [workspace.id, workspace]),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UsersRound className="h-5 w-5" />
          {copy.title}
        </CardTitle>
        <CardDescription>{copy.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form action={createWorkspaceAction} className="space-y-2">
          <Label htmlFor="team-workspace-name">{copy.workspaceName}</Label>
          <div className="flex gap-2">
            <Input
              id="team-workspace-name"
              name="name"
              placeholder={copy.workspacePlaceholder}
              maxLength={80}
              required
            />
            <Button type="submit" size="icon" aria-label={copy.createWorkspace}>
              <UserPlus className="h-4 w-4" />
            </Button>
          </div>
        </form>

        {pendingInvites.length ? (
          <div className="space-y-2 rounded-md border border-border p-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium">{copy.invitesForYou}</h3>
            </div>
            <div className="space-y-2">
              {pendingInvites.map((invite) => (
                <form
                  key={invite.id}
                  action={acceptInviteAction}
                  className="flex items-center justify-between gap-3 rounded-md bg-muted/40 p-2"
                >
                  <input type="hidden" name="inviteId" value={invite.id} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {invite.workspaceName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {copy.roleAccess(invite.role)}
                    </p>
                  </div>
                  <Button type="submit" size="sm">
                    {copy.accept}
                  </Button>
                </form>
              ))}
            </div>
          </div>
        ) : null}

        <div className="space-y-3">
          {workspaces.length ? (
            workspaces.map((workspace) => (
              <div
                key={workspace.id}
                className="space-y-3 rounded-md border border-border p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-medium">
                      {workspace.name}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {copy.pendingInvites(workspace.pendingInviteCount)}
                    </p>
                  </div>
                  <Badge
                    variant={
                      workspace.role === "member" ? "outline" : "secondary"
                    }
                  >
                    {roleLabel(workspace.role, copy)}
                  </Badge>
                </div>

                {canManageTeamInvites(workspace.role) ? (
                  <form action={inviteMemberAction} className="space-y-2">
                    <input
                      type="hidden"
                      name="workspaceId"
                      value={workspace.id}
                    />
                    <Label htmlFor={`${workspace.id}-invite-email`}>
                      {copy.inviteByEmail}
                    </Label>
                    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_104px_36px]">
                      <Input
                        id={`${workspace.id}-invite-email`}
                        name="email"
                        type="email"
                        placeholder={copy.teammateEmailPlaceholder}
                        required
                      />
                      <Select name="role" defaultValue="member">
                        <SelectTrigger
                          className="w-full"
                          aria-label={copy.inviteRole}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">
                            {copy.roleLabels.member}
                          </SelectItem>
                          <SelectItem value="admin">
                            {copy.roleLabels.admin}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        type="submit"
                        size="icon"
                        aria-label={copy.inviteTeammate(workspace.name)}
                      >
                        <MailPlus className="h-4 w-4" />
                      </Button>
                    </div>
                  </form>
                ) : null}

                <TeamWorkspaceManagementBlock
                  workspace={managementByWorkspace.get(workspace.id)}
                  copy={copy}
                  revokeInviteAction={revokeInviteAction}
                  updateMemberRoleAction={updateMemberRoleAction}
                  transferOwnershipAction={transferOwnershipAction}
                />
              </div>
            ))
          ) : (
            <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
              {copy.empty}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function roleLabel(role: TeamWorkspaceRole, copy: TeamWorkspaceCopy) {
  return copy.roleLabels[role];
}
