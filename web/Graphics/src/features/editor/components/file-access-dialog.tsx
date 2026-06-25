"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Check, UserPlus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { FileAccessReviewPanel } from "@/features/editor/components/file-access-review-panel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  grantFileAccess,
  listFileAccess,
  removeFileAccess,
  updateFileAccessRole,
} from "@/features/files/access-actions";
import {
  collaboratorRoleCapabilities,
  collaboratorRoleDescriptions,
  collaboratorRoleLabels,
  collaboratorRoles,
  type CollaboratorRole,
  type FileAccessMember,
} from "@/features/files/permissions";

type FileAccessDialogProps = {
  fileId: string;
  onAccessChanged?: () => void;
  onRecordActivity?: (label: string, detail?: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function FileAccessDialog({
  fileId,
  onAccessChanged,
  onRecordActivity,
  open,
  onOpenChange,
}: FileAccessDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [members, setMembers] = useState<FileAccessMember[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<CollaboratorRole>("viewer");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshAccessList = useCallback(() => {
    setError(null);
    startTransition(async () => {
      try {
        setMembers(await listFileAccess({ fileId }));
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load access.",
        );
      }
    });
  }, [fileId]);

  useEffect(() => {
    if (open) {
      refreshAccessList();
    }
  }, [open, refreshAccessList]);

  function inviteMember() {
    const email = inviteEmail.trim();

    if (!email) {
      return;
    }

    setMessage(null);
    setError(null);
    startTransition(async () => {
      try {
        const result = await grantFileAccess({ fileId, email, role: inviteRole });
        setInviteEmail("");
        setMessage(
          result.approvalPending
            ? `${email} is queued for ${collaboratorRoleLabels[inviteRole]} approval.`
            : `${email} now has ${collaboratorRoleLabels[inviteRole]}.`,
        );
        if (!result.approvalPending) {
          onAccessChanged?.();
        }
        onRecordActivity?.(
          result.approvalPending
            ? "Requested collaborator access"
            : "Invited collaborator",
          `${email} / ${collaboratorRoleLabels[inviteRole]}`,
        );
        setMembers(await listFileAccess({ fileId }));
      } catch (inviteError) {
        setError(
          inviteError instanceof Error
            ? inviteError.message
            : "Could not update access.",
        );
      }
    });
  }

  function updateRole(userId: string, role: CollaboratorRole) {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      try {
        const result = await updateFileAccessRole({ fileId, userId, role });
        setMessage(
          result.approvalPending
            ? "Role change queued for admin approval."
            : "Access updated.",
        );
        if (!result.approvalPending) {
          onAccessChanged?.();
        }
        onRecordActivity?.(
          result.approvalPending
            ? "Requested collaborator role"
            : "Updated collaborator role",
          collaboratorRoleLabels[role],
        );
        setMembers(await listFileAccess({ fileId }));
      } catch (updateError) {
        setError(
          updateError instanceof Error
            ? updateError.message
            : "Could not update access.",
        );
      }
    });
  }

  function removeMember(userId: string) {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      try {
        await removeFileAccess({ fileId, userId });
        setMessage("Access removed.");
        onAccessChanged?.();
        onRecordActivity?.("Removed collaborator", userId);
        setMembers(await listFileAccess({ fileId }));
      } catch (removeError) {
        setError(
          removeError instanceof Error
            ? removeError.message
            : "Could not remove access.",
        );
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>People access</DialogTitle>
          <DialogDescription>
            Invite existing users and choose what they can do in this file.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_150px_auto]">
            <Input
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              placeholder="teammate@example.com"
              disabled={isPending}
            />
            <Select
              value={inviteRole}
              onValueChange={(value) => setInviteRole(value as CollaboratorRole)}
              disabled={isPending}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {collaboratorRoles.map((role) => (
                  <SelectItem key={role} value={role}>
                    {collaboratorRoleLabels[role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" onClick={inviteMember} disabled={isPending}>
              <UserPlus className="size-4" />
              Invite
            </Button>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {collaboratorRoles.map((role) => {
              const active = inviteRole === role;

              return (
                <button
                  key={role}
                  type="button"
                  className="rounded-md border border-border bg-background p-3 text-left transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60 data-[active=true]:border-primary data-[active=true]:bg-primary/10"
                  data-active={active}
                  disabled={isPending}
                  onClick={() => setInviteRole(role)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">
                      {collaboratorRoleLabels[role]}
                    </span>
                    {active ? <Check className="size-4 text-primary" /> : null}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {collaboratorRoleDescriptions[role]}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {collaboratorRoleCapabilities[role].map((capability) => (
                      <Badge
                        key={capability}
                        variant="outline"
                        className="px-1.5 text-[10px]"
                      >
                        {capability}
                      </Badge>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>

          {message ? (
            <div className="rounded-md border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
              {message}
            </div>
          ) : null}
          {error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          ) : null}

          <FileAccessReviewPanel
            members={members}
            onRecordActivity={onRecordActivity}
          />

          <div className="max-h-72 overflow-auto rounded-md border border-border">
            {members.length > 0 ? (
              members.map((member) => (
                <div
                  key={member.userId}
                  className="grid gap-2 border-b border-border p-3 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_150px_auto]"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">
                      {member.name}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {member.email}
                    </div>
                  </div>
                  {member.role === "owner" ? (
                    <Badge variant="secondary" className="w-fit">
                      Owner
                    </Badge>
                  ) : (
                    <Select
                      value={member.role}
                      onValueChange={(value) =>
                        updateRole(member.userId, value as CollaboratorRole)
                      }
                      disabled={isPending}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {collaboratorRoles.map((role) => (
                          <SelectItem key={role} value={role}>
                            {collaboratorRoleLabels[role]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    disabled={isPending || member.role === "owner"}
                    onClick={() => removeMember(member.userId)}
                    aria-label={`Remove ${member.email}`}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ))
            ) : (
              <div className="p-4 text-sm text-muted-foreground">
                No access rows loaded yet.
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
