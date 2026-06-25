"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Check, Link2, Trash2, UserPlus, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  createWorkbookShareLinkAction,
  disableWorkbookShareLinkAction,
  inviteWorkbookCollaboratorAction,
  removeWorkbookCollaboratorAction,
} from "@/features/workbooks/actions";
import { workbookCollaboratorRoles } from "@/features/workbooks/sharing-permissions";
import type { WorkbookSummary } from "@/features/workbooks/types";

export function WorkbookSharingDialog({
  workbook,
  children,
}: {
  workbook: WorkbookSummary;
  children: ReactNode;
}) {
  const [origin, setOrigin] = useState("");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const sharing = workbook.sharing ?? {
    collaborators: [],
    links: [],
  };
  const hasSharing = sharing.collaborators.length > 0 || sharing.links.length > 0;

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  async function copyShareLink(token: string) {
    const shareUrl = `${origin}/share/${token}`;

    await navigator.clipboard?.writeText(shareUrl);
    setCopiedToken(token);
    window.setTimeout(() => setCopiedToken(null), 1400);
  }

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Share workbook</DialogTitle>
          <DialogDescription>
            Invite people or create a controlled access link for this workbook.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 lg:grid-cols-2">
          <form action={inviteWorkbookCollaboratorAction} className="space-y-3">
            <input type="hidden" name="workbookId" value={workbook.id} />
            <div className="flex items-center gap-2">
              <UserPlus className="size-4 text-primary" />
              <h3 className="text-sm font-semibold">Invite collaborator</h3>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`share-email-${workbook.id}`}>Email</Label>
              <Input
                id={`share-email-${workbook.id}`}
                name="email"
                type="email"
                placeholder="person@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`share-role-${workbook.id}`}>Role</Label>
              <select
                id={`share-role-${workbook.id}`}
                name="role"
                defaultValue="editor"
                className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {workbookCollaboratorRoles.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" className="w-full">
              <UserPlus />
              Invite
            </Button>
          </form>

          <form action={createWorkbookShareLinkAction} className="space-y-3">
            <input type="hidden" name="workbookId" value={workbook.id} />
            <div className="flex items-center gap-2">
              <Link2 className="size-4 text-primary" />
              <h3 className="text-sm font-semibold">Create share link</h3>
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
              <div className="space-y-2">
                <Label htmlFor={`link-role-${workbook.id}`}>Role</Label>
                <select
                  id={`link-role-${workbook.id}`}
                  name="role"
                  defaultValue="viewer"
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {workbookCollaboratorRoles.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`link-expiry-${workbook.id}`}>Days</Label>
                <Input
                  id={`link-expiry-${workbook.id}`}
                  name="expiresInDays"
                  type="number"
                  min={1}
                  max={365}
                  placeholder="No limit"
                />
              </div>
            </div>
            <Button type="submit" variant="outline" className="w-full">
              <Link2 />
              Create link
            </Button>
          </form>
        </div>

        <Separator />

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Users className="size-4 text-primary" />
              <h3 className="text-sm font-semibold">Current access</h3>
            </div>
            <Badge variant="secondary" className="font-mono">
              {sharing.collaborators.length} people
            </Badge>
          </div>

          {!hasSharing ? (
            <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              Only the workbook owner can open this workbook right now.
            </p>
          ) : null}

          {sharing.collaborators.length > 0 ? (
            <div className="space-y-2">
              {sharing.collaborators.map((collaborator) => (
                <div
                  key={collaborator.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {collaborator.name ?? collaborator.email}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {collaborator.email}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{collaborator.role}</Badge>
                    <Badge
                      variant={
                        collaborator.status === "accepted"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {collaborator.status}
                    </Badge>
                    <form action={removeWorkbookCollaboratorAction}>
                      <input type="hidden" name="workbookId" value={workbook.id} />
                      <input
                        type="hidden"
                        name="collaboratorId"
                        value={collaborator.id}
                      />
                      <Button
                        type="submit"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Remove ${collaborator.email}`}
                      >
                        <Trash2 />
                      </Button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {sharing.links.length > 0 ? (
            <div className="space-y-2">
              {sharing.links.map((link) => {
                const shareUrl = origin
                  ? `${origin}/share/${link.token}`
                  : `/share/${link.token}`;

                return (
                  <div
                    key={link.id}
                    className="grid gap-2 rounded-md border p-3 md:grid-cols-[1fr_auto]"
                  >
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{link.role}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {link.expiresAt
                            ? `Expires ${link.expiresAt.toLocaleDateString()}`
                            : "No expiry"}
                        </span>
                      </div>
                      <Input value={shareUrl} readOnly className="font-mono text-xs" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => copyShareLink(link.token)}
                      >
                        {copiedToken === link.token ? <Check /> : <Link2 />}
                        {copiedToken === link.token ? "Copied" : "Copy"}
                      </Button>
                      <form action={disableWorkbookShareLinkAction}>
                        <input type="hidden" name="workbookId" value={workbook.id} />
                        <input type="hidden" name="linkId" value={link.id} />
                        <Button type="submit" variant="ghost" size="sm">
                          Disable
                        </Button>
                      </form>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
