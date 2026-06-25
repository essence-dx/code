"use client";

import { useState, type FormEvent } from "react";
import { FolderLock, Loader2, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ProjectAccessRole } from "@/features/projects/access-types";
import { listFolderAccessGrants, revokeFolderAccessGrant, upsertFolderAccessGrant } from "@/features/projects/project-api";
import type { ProjectFolderAccessGrantSummary } from "@/features/projects/types";
import type { WorkspaceMemberRow } from "@/features/workspaces/types";

const roles: ProjectAccessRole[] = ["editor", "viewer", "admin"];

export function FolderAccessMenu({
  folderId,
  folderName,
  members,
}: {
  folderId: string;
  folderName: string;
  members: WorkspaceMemberRow[];
}) {
  const [open, setOpen] = useState(false);
  const [grants, setGrants] = useState<ProjectFolderAccessGrantSummary[]>([]);
  const [pending, setPending] = useState<"load" | "save" | string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState<ProjectAccessRole>("viewer");
  const eligibleMembers = members.filter((member) => member.role !== "owner");

  async function loadGrants() {
    setPending("load");

    try {
      const response = await listFolderAccessGrants(folderId);
      setGrants(response.grants);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load folder access");
    } finally {
      setPending(null);
    }
  }

  async function handleOpenChange(value: boolean) {
    setOpen(value);

    if (value) {
      await loadGrants();
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setPending("save");

    try {
      await upsertFolderAccessGrant(folderId, { userId: selectedUserId, role: selectedRole });
      toast.success("Folder access updated");
      setSelectedUserId("");
      setSelectedRole("viewer");
      await loadGrants();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update folder access");
    } finally {
      setPending(null);
    }
  }

  async function handleRevoke(grantId: string) {
    setPending(grantId);

    try {
      await revokeFolderAccessGrant(folderId, grantId);
      toast.success("Folder access revoked");
      await loadGrants();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not revoke folder access");
    } finally {
      setPending(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(value) => void handleOpenChange(value)}>
      <DialogTrigger
        render={
          <Button aria-label={`Manage access for ${folderName}`} className="size-9 shrink-0" size="icon" variant="ghost">
            <FolderLock className="size-4" />
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{folderName} access</DialogTitle>
          <DialogDescription>Folder grants apply to scenes inside this folder unless a direct project grant is stronger.</DialogDescription>
        </DialogHeader>

        <form className="grid gap-3 sm:grid-cols-[1fr_120px_auto]" onSubmit={handleSubmit}>
          <Select value={selectedUserId} onValueChange={(value) => setSelectedUserId(value ?? "")} disabled={pending === "save" || eligibleMembers.length === 0}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select member" />
            </SelectTrigger>
            <SelectContent align="start">
              {eligibleMembers.map((member) => (
                <SelectItem key={member.userId} value={member.userId}>
                  {member.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as ProjectAccessRole)} disabled={pending === "save" || eligibleMembers.length === 0}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="start">
              {roles.map((role) => (
                <SelectItem key={role} value={role}>
                  {role}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button className="gap-2" disabled={pending === "save" || eligibleMembers.length === 0 || !selectedUserId} type="submit">
            {pending === "save" ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
            Save
          </Button>
        </form>

        <div className="space-y-2">
          {pending === "load" ? <p className="text-sm text-muted-foreground">Loading access grants...</p> : null}
          {grants.length === 0 && pending !== "load" ? <p className="text-sm text-muted-foreground">No folder grants yet.</p> : null}
          {grants.map((grant) => (
            <div key={grant.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{grant.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {grant.email} · {grant.role}
                </p>
              </div>
              <Button disabled={pending === grant.id} size="icon-sm" type="button" variant="ghost" onClick={() => void handleRevoke(grant.id)} aria-label={`Revoke folder access for ${grant.email}`}>
                {pending === grant.id ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
