"use client";

import { Copy, DownloadCloud, Folder, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ProjectFolder } from "@/lib/projects/collaboration-store";

type ProjectBulkActionsBarProps = {
  selectedCount: number;
  visibleCount: number;
  allVisibleSelected: boolean;
  folders: ProjectFolder[];
  isPending: boolean;
  onSelectAllVisible: () => void;
  onClearSelection: () => void;
  onAssignFolder: (folderId: string | null) => Promise<boolean>;
  onDuplicate: () => Promise<boolean>;
  onExportBundles: () => Promise<boolean>;
  onMoveToTrash: () => Promise<boolean>;
};

export function ProjectBulkActionsBar({
  selectedCount,
  visibleCount,
  allVisibleSelected,
  folders,
  isPending,
  onSelectAllVisible,
  onClearSelection,
  onAssignFolder,
  onDuplicate,
  onExportBundles,
  onMoveToTrash,
}: ProjectBulkActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-muted/30 p-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium">{selectedCount} selected</span>
        <Button size="sm" variant="outline" onClick={onSelectAllVisible} disabled={isPending || visibleCount === 0 || allVisibleSelected}>
          Select visible
        </Button>
        <Button size="icon-sm" variant="ghost" onClick={onClearSelection} disabled={isPending} aria-label="Clear selected projects">
          <X className="size-4" />
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Select value="choose" onValueChange={(value) => void onAssignFolder(value === "none" ? null : value)} disabled={isPending}>
          <SelectTrigger className="h-7 w-44">
            <Folder className="size-3.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="choose" disabled>
              Move to folder
            </SelectItem>
            <SelectItem value="none">No folder</SelectItem>
            {folders.map((folder) => (
              <SelectItem key={folder.id} value={folder.id}>
                {folder.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" onClick={() => void onDuplicate()} disabled={isPending}>
          <Copy className="size-4" />
          Duplicate
        </Button>
        <Button size="sm" variant="outline" onClick={() => void onExportBundles()} disabled={isPending}>
          <DownloadCloud className="size-4" />
          Export bundles
        </Button>
        <Button size="sm" variant="destructive" onClick={() => void onMoveToTrash()} disabled={isPending}>
          <Trash2 className="size-4" />
          Move to trash
        </Button>
      </div>
    </div>
  );
}
