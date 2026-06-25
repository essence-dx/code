"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { Copy, Loader2, ShieldCheck, Trash2, UserPlus, Users2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { WorkspaceMemberImportExportPanel } from "@/features/workspaces/components/workspace-member-import-export-panel";
import type { WorkspaceDashboard, WorkspaceInviteRole } from "@/features/workspaces/types";

const inviteRoles: WorkspaceInviteRole[] = ["editor", "viewer", "admin"];

async function parseJson<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message = typeof payload?.error === "string" ? payload.error : "Workspace request failed";
    throw new Error(message);
  }

  return payload as T;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
  }).format(new Date(value));
}

export function WorkspaceManagementPanel({ workspace }: { workspace: WorkspaceDashboard }) {
  const router = useRouter();
  const [pending, setPending] = useState<"invite" | string | null>(null);
  const [inviteRole, setInviteRole] = useState<WorkspaceInviteRole>("editor");
  const canManage = workspace.role === "owner" || workspace.role === "admin";
  const inviteBaseUrl = useMemo(() => (typeof window === "undefined" ? "" : `${window.location.origin}/invites/`), []);

  async function handleInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");

    setPending("invite");

    try {
      await parseJson<{ invite: unknown }>(
        await fetch(`/api/workspaces/${workspace.id}/invites`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, role: inviteRole }),
        }),
      );
      toast.success("Invite created");
      event.currentTarget.reset();
      setInviteRole("editor");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Invite failed");
    } finally {
      setPending(null);
    }
  }

  async function handleRevoke(inviteId: string) {
    setPending(inviteId);

    try {
      await parseJson<{ revokedInviteId: string }>(
        await fetch(`/api/workspaces/${workspace.id}/invites/${inviteId}`, {
          method: "DELETE",
          credentials: "include",
        }),
      );
      toast.success("Invite revoked");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Revoke failed");
    } finally {
      setPending(null);
    }
  }

  async function handleCopy(token: string) {
    const link = `${inviteBaseUrl}${token}`;

    try {
      await navigator.clipboard.writeText(link);
      toast.success("Invite link copied");
    } catch {
      toast.error("Could not copy invite link");
    }
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users2 className="size-4 text-muted-foreground" />
            <CardTitle>{workspace.name}</CardTitle>
          </div>
          <CardDescription>Members, roles, and pending workspace invites.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workspace.members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="font-medium">{member.name}</div>
                    <div className="text-xs text-muted-foreground">{member.email}</div>
                  </TableCell>
                  <TableCell>
                    <Badge className="rounded-md" variant={member.role === "owner" ? "default" : "secondary"}>
                      {member.role}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(member.joinedAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <UserPlus className="size-4 text-muted-foreground" />
              <CardTitle>Invite member</CardTitle>
            </div>
            <CardDescription>{canManage ? "Create a 14-day invite link." : "Only owners and admins can invite members."}</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={handleInvite}>
              <div className="space-y-2">
                <Label htmlFor="workspace-invite-email">Email</Label>
                <Input disabled={!canManage || pending === "invite"} id="workspace-invite-email" name="email" type="email" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="workspace-invite-role">Role</Label>
                <Select value={inviteRole} onValueChange={(value) => setInviteRole(value as WorkspaceInviteRole)} disabled={!canManage || pending === "invite"}>
                  <SelectTrigger id="workspace-invite-role" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="start">
                  {inviteRoles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full gap-2" disabled={!canManage || pending === "invite"} type="submit">
                {pending === "invite" ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
                Create invite
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-muted-foreground" />
              <CardTitle>Pending invites</CardTitle>
            </div>
            <CardDescription>{workspace.invites.length} active invite{workspace.invites.length === 1 ? "" : "s"}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {workspace.invites.length === 0 ? <p className="text-sm text-muted-foreground">No pending invites.</p> : null}
            {workspace.invites.map((invite) => (
              <div key={invite.id} className="rounded-md border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{invite.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {invite.role} · expires {formatDate(invite.expiresAt)}
                    </p>
                  </div>
                  <Badge className="rounded-md" variant="secondary">
                    {invite.role}
                  </Badge>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button className="flex-1 gap-2" size="sm" type="button" variant="secondary" onClick={() => void handleCopy(invite.token)}>
                    <Copy className="size-4" />
                    Copy link
                  </Button>
                  <Button disabled={!canManage || pending === invite.id} size="icon-sm" type="button" variant="ghost" onClick={() => void handleRevoke(invite.id)} aria-label={`Revoke invite for ${invite.email}`}>
                    {pending === invite.id ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        </div>
      </div>

      <WorkspaceMemberImportExportPanel workspace={workspace} />
    </div>
  );
}
