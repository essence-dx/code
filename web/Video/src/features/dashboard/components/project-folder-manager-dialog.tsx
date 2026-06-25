"use client";

import { useEffect, useState } from "react";
import { FolderCog, Pencil, Trash2 } from "lucide-react";
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
import type { ProjectFolder } from "@/lib/projects/collaboration-store";

type ProjectFolderManagerDialogProps = {
  folders: ProjectFolder[];
  folderCounts: Record<string, number>;
  isPending: boolean;
  onCreateFolder: (name: string) => Promise<boolean>;
  onRenameFolder: (folderId: string, name: string) => Promise<boolean>;
  onDeleteFolder: (folderId: string) => Promise<boolean>;
};

export function ProjectFolderManagerDialog({
  folders,
  folderCounts,
  isPending,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
}: ProjectFolderManagerDialogProps) {
  const [open, setOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [folderNamesById, setFolderNamesById] = useState<Record<string, string>>({});
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    setFolderNamesById(
      folders.reduce<Record<string, string>>((nextNames, folder) => {
        nextNames[folder.id] = folder.name;
        return nextNames;
      }, {}),
    );
  }, [folders, open]);

  async function handleCreateFolder() {
    setMessage(null);
    setActiveFolderId("new");
    try {
      const wasCreated = await onCreateFolder(folderName);
      if (wasCreated) setFolderName("");
    } catch {
      setMessage("Folder could not be created.");
    } finally {
      setActiveFolderId(null);
    }
  }

  async function handleRenameFolder(folder: ProjectFolder) {
    setMessage(null);
    setActiveFolderId(folder.id);
    try {
      const wasRenamed = await onRenameFolder(folder.id, folderNamesById[folder.id] ?? folder.name);
      if (!wasRenamed) setMessage("Folder could not be renamed.");
    } catch {
      setMessage("Folder could not be renamed.");
    } finally {
      setActiveFolderId(null);
    }
  }

  async function handleDeleteFolder(folderId: string) {
    setMessage(null);
    setActiveFolderId(folderId);
    try {
      const wasDeleted = await onDeleteFolder(folderId);
      if (!wasDeleted) setMessage("Folder could not be removed.");
    } catch {
      setMessage("Folder could not be removed.");
    } finally {
      setActiveFolderId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" disabled={isPending}>
          <FolderCog className="size-4" />
          Folders
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage folders</DialogTitle>
          <DialogDescription>Organize saved local projects without leaving the dashboard.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {message ? <div className="rounded-md border border-destructive/40 p-3 text-sm text-destructive">{message}</div> : null}
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <Input value={folderName} onChange={(event) => setFolderName(event.target.value)} placeholder="New folder name" />
            <Button size="sm" onClick={handleCreateFolder} disabled={!folderName.trim() || isPending || activeFolderId !== null}>
              Create
            </Button>
          </div>
          <div className="space-y-2">
            {folders.length === 0 ? (
              <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">No folders yet.</div>
            ) : (
              folders.map((folder) => (
                <div key={folder.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded-md border border-border p-2">
                  <Input
                    value={folderNamesById[folder.id] ?? folder.name}
                    onChange={(event) => setFolderNamesById((current) => ({ ...current, [folder.id]: event.target.value }))}
                    disabled={isPending || activeFolderId !== null}
                    aria-label={`Rename ${folder.name}`}
                  />
                  <div className="text-xs text-muted-foreground">{folderCounts[folder.id] ?? 0} projects</div>
                  <div className="flex gap-1">
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => handleRenameFolder(folder)}
                      disabled={isPending || activeFolderId !== null || !(folderNamesById[folder.id] ?? folder.name).trim()}
                      aria-label={`Save ${folder.name}`}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => handleDeleteFolder(folder.id)}
                      disabled={isPending || activeFolderId !== null}
                      aria-label={`Remove ${folder.name}`}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
