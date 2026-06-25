"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Folder, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { updateProject } from "../project-api";
import type { ProjectFolderSummary } from "../types";

interface ProjectFolderMenuProps {
  folders: ProjectFolderSummary[];
  projectFolderId: string | null;
  projectId: string;
}

export function ProjectFolderMenu({ folders, projectFolderId, projectId }: ProjectFolderMenuProps) {
  const router = useRouter();
  const [pendingFolderId, setPendingFolderId] = useState<string | null>(null);
  const currentFolder = folders.find((folder) => folder.id === projectFolderId) ?? null;

  async function handleMove(folderId: string | null) {
    setPendingFolderId(folderId ?? "unfiled");

    try {
      await updateProject(projectId, { folderId });
      toast.success(folderId ? "Project moved" : "Project unfiled");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Move failed");
    } finally {
      setPendingFolderId(null);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button className="min-w-0 max-w-full justify-start gap-2" size="sm" variant="ghost">
            {pendingFolderId ? <Loader2 className="size-4 animate-spin" /> : <Folder className="size-4" />}
            <span className="truncate">{currentFolder?.name ?? "Unfiled"}</span>
          </Button>
        }
      />
      <DropdownMenuContent className="min-w-48">
        <DropdownMenuLabel>Move to folder</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => void handleMove(null)}>Unfiled</DropdownMenuItem>
        {folders.length > 0 ? <DropdownMenuSeparator /> : null}
        {folders.map((folder) => (
          <DropdownMenuItem key={folder.id} onClick={() => void handleMove(folder.id)}>
            {folder.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
