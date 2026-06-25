"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Cloud, Copy, FolderLock, KeyRound, Mail, RefreshCw, RotateCcw, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getCloudWorkspaceAccess, mutateCloudWorkspaceAccess, type ServerWorkspaceAccessSummary } from "@/lib/projects/workspace-access-client";
import type { ServerFolderVisibility, ServerProjectFolderAccess, ServerWorkspaceRole } from "@/lib/projects/workspace-access-contracts";
import { createWorkspaceInvitationEmailDraft } from "@/lib/projects/workspace-invitation-email";
import { createWorkspacePermissionSet, workspaceRoleLabels } from "@/lib/projects/workspace-permissions";

type CloudWorkspaceAccessPanelProps = {
  projectId: string;
  disabled?: boolean;
};

const roles: ServerWorkspaceRole[] = ["owner", "editor", "viewer"];

export function CloudWorkspaceAccessPanel({ projectId, disabled }: CloudWorkspaceAccessPanelProps) {
  const [access, setAccess] = useState<ServerWorkspaceAccessSummary | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<ServerWorkspaceRole>("editor");
  const [permissionEmail, setPermissionEmail] = useState("");
  const [permissionRole, setPermissionRole] = useState<ServerWorkspaceRole>("viewer");
  const [folderName, setFolderName] = useState("");
  const [folderVisibility, setFolderVisibilityChoice] = useState<ServerFolderVisibility>("workspace");

  const permissions = useMemo(() => createWorkspacePermissionSet(access?.activeRole ?? "viewer"), [access?.activeRole]);
  const pendingInvitations = useMemo(() => access?.invitations.filter((invitation) => invitation.status === "pending") ?? [], [access?.invitations]);

  const refresh = useCallback(async () => {
    const nextAccess = await getCloudWorkspaceAccess(projectId);
    setAccess(nextAccess);
    setMessage(null);
  }, [projectId]);

  useEffect(() => {
    setIsLoading(true);
    void refresh()
      .catch(() => {
        setAccess(null);
        setMessage("Signed-in workspace access appears after this project is synced.");
      })
      .finally(() => setIsLoading(false));
  }, [refresh]);

  async function runAccessAction(label: string, action: () => Promise<ServerWorkspaceAccessSummary>) {
    setPendingAction(label);
    setMessage(null);

    try {
      setAccess(await action());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Workspace access action failed.");
    } finally {
      setPendingAction(null);
    }
  }

  async function createInvitation() {
    await runAccessAction("invite", async () => {
      const nextAccess = await mutateCloudWorkspaceAccess(projectId, { action: "create-invitation", email: inviteEmail, role: inviteRole });
      setInviteEmail("");
      return nextAccess;
    });
  }

  async function revokeInvitation(invitationId: string) {
    await runAccessAction(`revoke-${invitationId}`, () => mutateCloudWorkspaceAccess(projectId, { action: "revoke-invitation", invitationId }));
  }

  async function copyInvitationLink(acceptPath: string) {
    const url = invitationAcceptUrl(acceptPath);
    try {
      await navigator.clipboard.writeText(url);
      setMessage("Invitation link copied.");
    } catch {
      setMessage(url);
    }
  }

  function emailInvitation(invitation: ServerWorkspaceAccessSummary["invitations"][number]) {
    const draft = createWorkspaceInvitationEmailDraft({
      email: invitation.email,
      role: invitation.role,
      acceptUrl: invitationAcceptUrl(invitation.acceptPath),
    });
    window.location.href = draft.mailtoUrl;
    setMessage("Email draft opened with the invitation link.");
  }

  async function setProjectPermission() {
    await runAccessAction("permission", async () => {
      const nextAccess = await mutateCloudWorkspaceAccess(projectId, { action: "set-project-permission", memberEmail: permissionEmail, role: permissionRole });
      setPermissionEmail("");
      return nextAccess;
    });
  }

  async function removeProjectPermission(permissionId: string) {
    await runAccessAction(`remove-${permissionId}`, () => mutateCloudWorkspaceAccess(projectId, { action: "remove-project-permission", permissionId }));
  }

  async function createFolder() {
    await runAccessAction("folder", async () => {
      const nextAccess = await mutateCloudWorkspaceAccess(projectId, {
        action: "create-folder",
        name: folderName,
        visibility: folderVisibility,
        assignProject: true,
        folderAccess: "inherited",
      });
      setFolderName("");
      return nextAccess;
    });
  }

  async function setFolderAccess(folderId: string | null, folderAccess: ServerProjectFolderAccess) {
    await runAccessAction("folder-access", () => mutateCloudWorkspaceAccess(projectId, { action: "set-project-folder-access", folderId, folderAccess }));
  }

  async function updateFolderVisibility(folderId: string, visibility: ServerFolderVisibility) {
    await runAccessAction(`visibility-${folderId}`, () => mutateCloudWorkspaceAccess(projectId, { action: "set-folder-visibility", folderId, visibility }));
  }

  const canAct = Boolean(access) && !disabled && !pendingAction;

  return (
    <div className="space-y-3 rounded-md border border-border p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 font-medium">
            <Cloud className="size-4" />
            Signed-in workspace access
          </div>
          <p className="text-xs text-muted-foreground">Server-enforced access for synced projects.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={access ? "default" : "secondary"}>{access ? workspaceRoleLabels[access.activeRole] : "Offline"}</Badge>
          <Button size="sm" variant="ghost" onClick={() => void refresh()} disabled={disabled || isLoading || Boolean(pendingAction)}>
            <RefreshCw className="size-4" />
            Refresh
          </Button>
        </div>
      </div>

      {message ? <div className="rounded-md border border-border p-2 text-xs text-muted-foreground">{message}</div> : null}

      {isLoading ? (
        <div className="rounded-md border border-dashed border-border p-4 text-muted-foreground">Loading signed-in access.</div>
      ) : access ? (
        <div className="grid gap-3 lg:grid-cols-2">
          <section className="space-y-2 rounded-md border border-border p-3">
            <div className="flex items-center gap-2 font-medium">
              <UserPlus className="size-4" />
              Invitations
            </div>
            <div className="grid gap-2 sm:grid-cols-[1fr_120px_auto]">
              <Input value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="reviewer@example.com" disabled={!canAct || !permissions.canManageInvites} />
              <RoleSelect value={inviteRole} onChange={setInviteRole} disabled={!canAct || !permissions.canManageInvites} />
              <Button size="sm" onClick={createInvitation} disabled={!inviteEmail.trim() || !canAct || !permissions.canManageInvites}>
                Invite
              </Button>
            </div>
            <AccessList
              empty="No pending signed-in invites."
              rows={pendingInvitations.map((invitation) => ({
                id: invitation.id,
                title: invitation.email,
                meta: workspaceRoleLabels[invitation.role],
                actions: [
                  {
                    label: "Email",
                    icon: <Mail className="size-3.5" />,
                    onAction: () => emailInvitation(invitation),
                  },
                  {
                    label: "Copy link",
                    icon: <Copy className="size-3.5" />,
                    onAction: () => void copyInvitationLink(invitation.acceptPath),
                  },
                  {
                    label: "Revoke",
                    icon: <RotateCcw className="size-3.5" />,
                    onAction: () => revokeInvitation(invitation.id),
                  },
                ],
              }))}
              disabled={!canAct || !permissions.canManageInvites}
            />
          </section>

          <section className="space-y-2 rounded-md border border-border p-3">
            <div className="flex items-center gap-2 font-medium">
              <KeyRound className="size-4" />
              Project permissions
            </div>
            <div className="grid gap-2 sm:grid-cols-[1fr_120px_auto]">
              <Input value={permissionEmail} onChange={(event) => setPermissionEmail(event.target.value)} placeholder="member@example.com" disabled={!canAct || !permissions.canManageProjectPermissions} />
              <RoleSelect value={permissionRole} onChange={setPermissionRole} disabled={!canAct || !permissions.canManageProjectPermissions} />
              <Button size="sm" onClick={setProjectPermission} disabled={!permissionEmail.trim() || !canAct || !permissions.canManageProjectPermissions}>
                Set
              </Button>
            </div>
            <AccessList
              empty="No signed-in project overrides."
              rows={access.projectPermissions.map((permission) => ({
                id: permission.id,
                title: permission.memberEmail,
                meta: workspaceRoleLabels[permission.role],
                actions: [
                  {
                    label: "Remove",
                    onAction: () => removeProjectPermission(permission.id),
                  },
                ],
              }))}
              disabled={!canAct || !permissions.canManageProjectPermissions}
            />
          </section>

          <section className="space-y-2 rounded-md border border-border p-3 lg:col-span-2">
            <div className="flex items-center gap-2 font-medium">
              <FolderLock className="size-4" />
              Server folders
            </div>
            <div className="grid gap-2 sm:grid-cols-[1fr_140px_auto]">
              <Input value={folderName} onChange={(event) => setFolderName(event.target.value)} placeholder="Private cut reviews" disabled={!canAct || !permissions.canManageFolders} />
              <Select value={folderVisibility} onValueChange={(value) => setFolderVisibilityChoice(value as ServerFolderVisibility)} disabled={!canAct || !permissions.canManageFolders}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="workspace">Workspace</SelectItem>
                  <SelectItem value="private" disabled={!permissions.canManagePrivateFolders}>Private</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" onClick={createFolder} disabled={!folderName.trim() || !canAct || !permissions.canManageFolders}>
                Create
              </Button>
            </div>
            <div className="grid gap-2 md:grid-cols-[1fr_180px]">
              <Select value={access.folderId ?? "none"} onValueChange={(value) => setFolderAccess(value === "none" ? null : value, access.folderAccess)} disabled={!canAct || !permissions.canManageFolders}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No server folder</SelectItem>
                  {access.folders.map((folder) => (
                    <SelectItem key={folder.id} value={folder.id}>
                      {folder.name} {folder.visibility === "private" ? "(private)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={access.folderAccess} onValueChange={(value) => setFolderAccess(access.folderId, value as ServerProjectFolderAccess)} disabled={!access.folderId || !canAct || !permissions.canManageProjectPermissions}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inherited">Inherited</SelectItem>
                  <SelectItem value="shared">Shared</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="max-h-48 space-y-1 overflow-y-auto pr-1">
              {access.folders.map((folder) => (
                <div key={folder.id} className="flex items-center justify-between gap-2 rounded-md border border-border px-2 py-1.5">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{folder.name}</div>
                    <div className="text-xs text-muted-foreground">Updated {formatDate(folder.updatedAt)}</div>
                  </div>
                  <Select value={folder.visibility} onValueChange={(value) => updateFolderVisibility(folder.id, value as ServerFolderVisibility)} disabled={!canAct || !permissions.canManageFolders}>
                    <SelectTrigger className="h-8 w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="workspace">Workspace</SelectItem>
                      <SelectItem value="private" disabled={!permissions.canManagePrivateFolders}>Private</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function RoleSelect({ value, onChange, disabled }: { value: ServerWorkspaceRole; onChange: (value: ServerWorkspaceRole) => void; disabled?: boolean }) {
  return (
    <Select value={value} onValueChange={(nextValue) => onChange(nextValue as ServerWorkspaceRole)} disabled={disabled}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {roles.map((role) => (
          <SelectItem key={role} value={role}>
            {workspaceRoleLabels[role]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function AccessList({
  rows,
  empty,
  disabled,
}: {
  rows: Array<{ id: string; title: string; meta: string; actions: Array<{ label: string; icon?: ReactNode; onAction: () => void }> }>;
  empty: string;
  disabled?: boolean;
}) {
  if (!rows.length) {
    return <div className="rounded-md border border-dashed border-border p-3 text-muted-foreground">{empty}</div>;
  }

  return (
    <div className="space-y-1">
      {rows.map((row) => (
        <div key={row.id} className="flex items-center justify-between gap-2 rounded-md border border-border px-2 py-1.5">
          <div className="min-w-0">
            <div className="truncate font-medium">{row.title}</div>
            <div className="text-xs text-muted-foreground">{row.meta}</div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-1">
            {row.actions.map((action) => (
              <Button key={action.label} size="sm" variant="ghost" onClick={action.onAction} disabled={disabled}>
                {action.icon}
                {action.label}
              </Button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(date);
}

function invitationAcceptUrl(acceptPath: string) {
  return new URL(acceptPath, window.location.origin).toString();
}
