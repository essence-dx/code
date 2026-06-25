"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Folder, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { createProjectFolder, deleteProjectFolder } from "../project-api";
import { FolderAccessMenu } from "./folder-access-menu";
import type { ProjectFolderSummary } from "../types";
import type { WorkspaceMemberRow } from "@/features/workspaces/types";

interface ProjectFolderPanelProps {
  folders: ProjectFolderSummary[];
  folderCounts: Record<string, number>;
  selectedFolderId: string | null;
  unfiledCount: number;
  workspaceId: string;
  workspaceMembers: WorkspaceMemberRow[];
}

function getFolderHref(workspaceId: string, folderId?: string | null) {
  const params = new URLSearchParams({ workspaceId });

  if (folderId) {
    params.set("folderId", folderId);
  }

  return `/projects?${params.toString()}`;
}

export function ProjectFolderPanel({ folders, folderCounts, selectedFolderId, unfiledCount, workspaceId, workspaceMembers }: ProjectFolderPanelProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  async function handleCreateFolder() {
    const trimmedName = name.trim();

    if (!trimmedName) {
      return;
    }

    setPendingAction("create");

    try {
      await createProjectFolder({ name: trimmedName, workspaceId });
      setName("");
      toast.success("Folder created");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Folder creation failed");
    } finally {
      setPendingAction(null);
    }
  }

  async function handleDeleteFolder(folder: ProjectFolderSummary) {
    setPendingAction(`delete:${folder.id}`);

    try {
      await deleteProjectFolder(folder.id);
      toast.success(`${folder.name} deleted`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Folder deletion failed");
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Folder className="size-4" />
          Folders
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input
            aria-label="Folder name"
            value={name}
            placeholder="New folder"
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                void handleCreateFolder();
              }
            }}
          />
          <Button aria-label="Create folder" className="size-9" disabled={pendingAction === "create" || !name.trim()} size="icon" onClick={() => void handleCreateFolder()}>
            {pendingAction === "create" ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          </Button>
        </div>

        <div className="space-y-1">
          <Link className={cn(buttonVariants({ variant: selectedFolderId === null ? "secondary" : "ghost" }), "w-full justify-between")} href={getFolderHref(workspaceId)}>
            <span>All active</span>
          </Link>
          <Link
            className={cn(buttonVariants({ variant: selectedFolderId === "unfiled" ? "secondary" : "ghost" }), "w-full justify-between")}
            href={getFolderHref(workspaceId, "unfiled")}
          >
            <span>Unfiled</span>
            <span className="text-xs text-muted-foreground">{unfiledCount}</span>
          </Link>
          {folders.map((folder) => {
            const deleting = pendingAction === `delete:${folder.id}`;

            return (
              <div key={folder.id} className="flex items-center gap-1">
                <Link
                  className={cn(buttonVariants({ variant: selectedFolderId === folder.id ? "secondary" : "ghost" }), "min-w-0 flex-1 justify-between")}
                  href={getFolderHref(workspaceId, folder.id)}
                >
                  <span className="truncate">{folder.name}</span>
                  <span className="text-xs text-muted-foreground">{folderCounts[folder.id] ?? 0}</span>
                </Link>
                <Button
                  aria-label={`Delete ${folder.name}`}
                  className="size-9 shrink-0"
                  disabled={deleting}
                  size="icon"
                  variant="ghost"
                  onClick={() => void handleDeleteFolder(folder)}
                >
                  {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                </Button>
                <FolderAccessMenu folderId={folder.id} folderName={folder.name} members={workspaceMembers} />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
