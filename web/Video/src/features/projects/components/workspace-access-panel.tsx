"use client";

import { useEffect, useMemo, useState } from "react";
import { KeyRound, RotateCcw, ShieldCheck, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  createWorkspaceInvitation,
  listProjectPermissionOverrides,
  listWorkspaceAuditEvents,
  listWorkspaceInvitations,
  removeProjectPermissionOverride,
  revokeWorkspaceInvitation,
  setProjectPermissionOverride,
  type ProjectPermissionOverride,
  type WorkspaceAuditEvent,
  type WorkspaceInvitation,
} from "@/lib/projects/collaboration-store";
import { createWorkspacePermissionSet, workspaceRoleLabels, type WorkspaceRole } from "@/lib/projects/workspace-permissions";

type WorkspacePermissionSet = ReturnType<typeof createWorkspacePermissionSet>;

type WorkspaceAccessPanelProps = {
  projectId: string;
  activeRole: WorkspaceRole;
  permissions: WorkspacePermissionSet;
};

const workspaceRoles: WorkspaceRole[] = ["owner", "editor", "viewer"];

export function WorkspaceAccessPanel({ projectId, activeRole, permissions }: WorkspaceAccessPanelProps) {
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([]);
  const [permissionOverrides, setPermissionOverrides] = useState<ProjectPermissionOverride[]>([]);
  const [auditEvents, setAuditEvents] = useState<WorkspaceAuditEvent[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>("editor");
  const [permissionEmail, setPermissionEmail] = useState("");
  const [permissionRole, setPermissionRole] = useState<WorkspaceRole>("viewer");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const canSeeAccessControls = permissions.canManageInvites || permissions.canManageProjectPermissions;
  const pendingInvitations = useMemo(() => invitations.filter((invitation) => invitation.status === "pending"), [invitations]);

  async function refresh() {
    const [nextInvitations, nextOverrides, nextAuditEvents] = await Promise.all([
      permissions.canManageInvites ? listWorkspaceInvitations() : Promise.resolve([]),
      permissions.canManageProjectPermissions ? listProjectPermissionOverrides(projectId) : Promise.resolve([]),
      permissions.canViewAuditHistory ? listWorkspaceAuditEvents(24, activeRole) : Promise.resolve([]),
    ]);
    setInvitations(nextInvitations);
    setPermissionOverrides(nextOverrides);
    setAuditEvents(nextAuditEvents);
  }

  useEffect(() => {
    void refresh().catch(() => setMessage("Workspace access history could not be loaded."));
  }, [projectId, activeRole, permissions.canManageInvites, permissions.canManageProjectPermissions, permissions.canViewAuditHistory]);

  async function runAction(action: () => Promise<void>, failureMessage: string) {
    setIsPending(true);
    setMessage(null);
    try {
      await action();
      await refresh();
    } catch {
      setMessage(failureMessage);
    } finally {
      setIsPending(false);
    }
  }

  async function inviteMember() {
    await runAction(async () => {
      const invitation = await createWorkspaceInvitation({ email: inviteEmail, role: inviteRole, actorRole: activeRole });
      if (!invitation) {
        setMessage("Enter a valid invitation email.");
        return;
      }
      setInviteEmail("");
    }, "Invitation could not be created.");
  }

  async function revokeInvitation(invitationId: string) {
    await runAction(async () => {
      await revokeWorkspaceInvitation(invitationId, activeRole);
    }, "Invitation could not be revoked.");
  }

  async function setProjectAccess() {
    await runAction(async () => {
      const override = await setProjectPermissionOverride({ projectId, memberEmail: permissionEmail, role: permissionRole, actorRole: activeRole });
      if (!override) {
        setMessage("Enter a valid member email for project access.");
        return;
      }
      setPermissionEmail("");
    }, "Project access could not be updated.");
  }

  async function removeProjectAccess(overrideId: string) {
    await runAction(async () => {
      await removeProjectPermissionOverride(overrideId, activeRole);
    }, "Project access could not be removed.");
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-medium">Access controls</div>
          <p className="text-xs text-muted-foreground">Invite reviewers, scope this project, and keep a local audit trail.</p>
        </div>
        <Badge variant={permissions.canManageProjectPermissions ? "default" : "secondary"}>
          {workspaceRoleLabels[activeRole]}
        </Badge>
      </div>

      {message ? <div className="rounded-md border border-destructive/30 p-2 text-sm text-destructive">{message}</div> : null}

      {!canSeeAccessControls ? (
        <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
          Access management is hidden for this role.
        </div>
      ) : null}

      {permissions.canManageInvites ? (
        <div className="space-y-2 rounded-md border border-border p-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <UserPlus className="size-4" />
            Pending invites
          </div>
          <div className="grid gap-2 sm:grid-cols-[1fr_120px_auto]">
            <Input value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="teammate@example.com" disabled={isPending} />
            <RoleSelect value={inviteRole} onChange={setInviteRole} disabled={isPending} />
            <Button size="sm" onClick={inviteMember} disabled={!inviteEmail.trim() || isPending}>
              Invite
            </Button>
          </div>
          <AccessRows
            empty="No pending invites."
            rows={pendingInvitations.map((invitation) => ({
              id: invitation.id,
              title: invitation.email,
              meta: `${workspaceRoleLabels[invitation.role]} invite`,
              actionLabel: "Revoke",
              onAction: () => revokeInvitation(invitation.id),
            }))}
            disabled={isPending}
          />
        </div>
      ) : null}

      {permissions.canManageProjectPermissions ? (
        <div className="space-y-2 rounded-md border border-border p-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <KeyRound className="size-4" />
            Project access overrides
          </div>
          <div className="grid gap-2 sm:grid-cols-[1fr_120px_auto]">
            <Input value={permissionEmail} onChange={(event) => setPermissionEmail(event.target.value)} placeholder="member@example.com" disabled={isPending} />
            <RoleSelect value={permissionRole} onChange={setPermissionRole} disabled={isPending} />
            <Button size="sm" onClick={setProjectAccess} disabled={!permissionEmail.trim() || isPending}>
              Set access
            </Button>
          </div>
          <AccessRows
            empty="No project-specific overrides."
            rows={permissionOverrides.map((override) => ({
              id: override.id,
              title: override.memberEmail,
              meta: workspaceRoleLabels[override.role],
              actionLabel: "Remove",
              onAction: () => removeProjectAccess(override.id),
            }))}
            disabled={isPending}
          />
        </div>
      ) : null}

      {permissions.canViewAuditHistory ? (
        <div className="space-y-2 rounded-md border border-border p-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <ShieldCheck className="size-4" />
            Audit history
          </div>
          {auditEvents.length ? (
            <div className="max-h-44 space-y-1 overflow-y-auto pr-1">
              {auditEvents.map((event) => (
                <div key={event.id} className="grid gap-1 rounded-md border border-border px-2 py-1.5 text-sm sm:grid-cols-[1fr_auto] sm:items-center">
                  <div className="min-w-0">
                    <div className="truncate font-medium">
                      {event.targetType} {event.action}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">{event.detail}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">{new Date(event.createdAt).toLocaleString()}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">No access events yet.</div>
          )}
        </div>
      ) : null}
    </section>
  );
}

function RoleSelect({ value, onChange, disabled }: { value: WorkspaceRole; onChange: (value: WorkspaceRole) => void; disabled?: boolean }) {
  return (
    <Select value={value} onValueChange={(nextValue) => onChange(nextValue as WorkspaceRole)} disabled={disabled}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {workspaceRoles.map((role) => (
          <SelectItem key={role} value={role}>
            {workspaceRoleLabels[role]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function AccessRows({
  rows,
  empty,
  disabled,
}: {
  rows: Array<{ id: string; title: string; meta: string; actionLabel: string; onAction: () => void }>;
  empty: string;
  disabled?: boolean;
}) {
  if (!rows.length) {
    return <div className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">{empty}</div>;
  }

  return (
    <div className="space-y-1">
      {rows.map((row) => (
        <div key={row.id} className="flex items-center justify-between gap-2 rounded-md border border-border px-2 py-1.5 text-sm">
          <div className="min-w-0">
            <div className="truncate font-medium">{row.title}</div>
            <div className="truncate text-xs text-muted-foreground">{row.meta}</div>
          </div>
          <Button size="sm" variant="ghost" onClick={row.onAction} disabled={disabled}>
            <RotateCcw className="size-3.5" />
            {row.actionLabel}
          </Button>
        </div>
      ))}
    </div>
  );
}
