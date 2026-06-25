"use client";

import { useEffect, useState } from "react";
import { Folder, FolderPlus } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ProjectFolder } from "@/lib/projects/collaboration-store";

type ProjectFolderDialogProps = {
  projectTitle: string;
  folders: ProjectFolder[];
  assignedFolderId: string | null;
  isPending: boolean;
  onAssignFolder: (folderId: string | null) => Promise<boolean>;
  onCreateFolder: (name: string) => Promise<boolean>;
};

export function ProjectFolderDialog({
  projectTitle,
  folders,
  assignedFolderId,
  isPending,
  onAssignFolder,
  onCreateFolder,
}: ProjectFolderDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState(assignedFolderId ?? "none");
  const [folderName, setFolderName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isFolderActionPending, setIsFolderActionPending] = useState(false);

  useEffect(() => {
    if (open) setSelectedFolderId(assignedFolderId ?? "none");
  }, [assignedFolderId, open]);

  async function handleFolderChange(value: string) {
    setSelectedFolderId(value);
    setMessage(null);
    setIsFolderActionPending(true);

    try {
      const wasAssigned = await onAssignFolder(value === "none" ? null : value);
      if (wasAssigned) setOpen(false);
    } catch {
      setMessage("Project folder could not be updated.");
    } finally {
      setIsFolderActionPending(false);
    }
  }

  async function handleCreateFolder() {
    setMessage(null);
    setIsFolderActionPending(true);

    try {
      const wasCreated = await onCreateFolder(folderName);
      if (wasCreated) {
        setFolderName("");
        setOpen(false);
      }
    } catch {
      setMessage("Folder could not be created.");
    } finally {
      setIsFolderActionPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" disabled={isPending} aria-label={`Organize ${projectTitle}`}>
          <Folder className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Project folder</DialogTitle>
          <DialogDescription>{projectTitle}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {message ? <div className="rounded-md border border-destructive/40 p-3 text-sm text-destructive">{message}</div> : null}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Move to</Label>
            <Select value={selectedFolderId} onValueChange={(value) => void handleFolderChange(value)} disabled={isPending || isFolderActionPending}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No folder</SelectItem>
                {folders.map((folder) => (
                  <SelectItem key={folder.id} value={folder.id}>
                    {folder.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <Input value={folderName} onChange={(event) => setFolderName(event.target.value)} placeholder="New folder name" />
            <Button size="sm" onClick={handleCreateFolder} disabled={!folderName.trim() || isPending || isFolderActionPending}>
              <FolderPlus className="size-4" />
              Create
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
