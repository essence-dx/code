"use client";

import { useEffect, useMemo, useState } from "react";
import { RotateCcw, Trash2 } from "lucide-react";
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
import type { LocalProjectTrashRecord } from "@/lib/projects/local-project-record";

type ProjectTrashManagerDialogProps = {
  projects: LocalProjectTrashRecord[];
  isPending: boolean;
  onRestoreProjects: (ids: string[]) => Promise<boolean>;
  onDeleteProjects: (ids: string[]) => Promise<boolean>;
};

export function ProjectTrashManagerDialog({
  projects,
  isPending,
  onRestoreProjects,
  onDeleteProjects,
}: ProjectTrashManagerDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeAction, setActiveAction] = useState<"restore" | "delete" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const allSelected = projects.length > 0 && projects.every((project) => selectedIdSet.has(project.id));

  useEffect(() => {
    const projectIds = new Set(projects.map((project) => project.id));
    setSelectedIds((current) => current.filter((id) => projectIds.has(id)));
  }, [projects]);

  function toggleProject(projectId: string, isSelected: boolean) {
    setSelectedIds((current) => {
      if (isSelected) return current.includes(projectId) ? current : [...current, projectId];
      return current.filter((id) => id !== projectId);
    });
  }

  async function runTrashAction(action: "restore" | "delete", ids: string[]) {
    if (ids.length === 0) return;

    setMessage(null);
    setActiveAction(action);
    try {
      const succeeded = action === "restore" ? await onRestoreProjects(ids) : await onDeleteProjects(ids);
      if (succeeded) {
        setSelectedIds((current) => current.filter((id) => !ids.includes(id)));
      } else {
        setMessage(action === "restore" ? "Projects could not be restored." : "Projects could not be permanently deleted.");
      }
    } catch {
      setMessage(action === "restore" ? "Projects could not be restored." : "Projects could not be permanently deleted.");
    } finally {
      setActiveAction(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" disabled={isPending || projects.length === 0}>
          <Trash2 className="size-4" />
          Manage trash
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Deleted projects</DialogTitle>
          <DialogDescription>Restore recoverable projects or permanently remove old local records.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {message ? <div className="rounded-md border border-destructive/40 p-3 text-sm text-destructive">{message}</div> : null}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-muted/30 p-2">
            <div className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4 rounded border-border"
                checked={allSelected}
                onChange={(event) => setSelectedIds(event.target.checked ? projects.map((project) => project.id) : [])}
                disabled={isPending || activeAction !== null || projects.length === 0}
                aria-label="Select deleted projects"
              />
              <span>{selectedIds.length} selected</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => runTrashAction("restore", selectedIds)}
                disabled={isPending || activeAction !== null || selectedIds.length === 0}
              >
                <RotateCcw className="size-4" />
                Restore selected
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => runTrashAction("delete", selectedIds)}
                disabled={isPending || activeAction !== null || selectedIds.length === 0}
              >
                <Trash2 className="size-4" />
                Delete selected
              </Button>
            </div>
          </div>
          <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
            {projects.length === 0 ? (
              <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">Trash is empty.</div>
            ) : (
              projects.map((project) => (
                <div key={project.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-md border border-border p-3">
                  <input
                    type="checkbox"
                    className="size-4 rounded border-border"
                    checked={selectedIdSet.has(project.id)}
                    onChange={(event) => toggleProject(project.id, event.target.checked)}
                    disabled={isPending || activeAction !== null}
                    aria-label={`Select ${project.title}`}
                  />
                  <div className="min-w-0 space-y-1">
                    <div className="truncate text-sm font-medium">{project.title}</div>
                    <div className="text-xs text-muted-foreground">Deleted {new Date(project.deletedAt).toLocaleString()}</div>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="secondary">{project.layerCount} layers</Badge>
                      <Badge variant="secondary">{project.mediaCount} media</Badge>
                      <Badge variant="outline">{Math.round(project.duration)}s</Badge>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => runTrashAction("restore", [project.id])}
                      disabled={isPending || activeAction !== null}
                      aria-label={`Restore ${project.title}`}
                    >
                      <RotateCcw className="size-4" />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => runTrashAction("delete", [project.id])}
                      disabled={isPending || activeAction !== null}
                      aria-label={`Permanently delete ${project.title}`}
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
