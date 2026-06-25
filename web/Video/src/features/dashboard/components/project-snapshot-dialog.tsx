"use client";

import { useEffect, useState } from "react";
import { History, RotateCcw, Trash2 } from "lucide-react";
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
import type { LocalProjectSnapshotRecord } from "@/lib/projects/local-project-record";
import { listLocalProjectSnapshots } from "@/lib/projects/local-project-store";

type ProjectSnapshotDialogProps = {
  projectId: string;
  projectTitle: string;
  snapshotCount: number;
  isPending: boolean;
  onRestoreSnapshot: (snapshotId: string) => Promise<boolean>;
  onDeleteSnapshot: (snapshotId: string) => Promise<boolean>;
};

export function ProjectSnapshotDialog({
  projectId,
  projectTitle,
  snapshotCount,
  isPending,
  onRestoreSnapshot,
  onDeleteSnapshot,
}: ProjectSnapshotDialogProps) {
  const [open, setOpen] = useState(false);
  const [snapshots, setSnapshots] = useState<LocalProjectSnapshotRecord[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeSnapshotId, setActiveSnapshotId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    let isCurrent = true;
    setIsLoading(true);
    setMessage(null);

    listLocalProjectSnapshots(projectId)
      .then((records) => {
        if (!isCurrent) return;
        setSnapshots(records);
      })
      .catch(() => {
        if (!isCurrent) return;
        setSnapshots([]);
        setMessage("Checkpoints could not be loaded.");
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [open, projectId]);

  async function handleRestore(snapshotId: string) {
    setActiveSnapshotId(snapshotId);
    setMessage(null);
    try {
      const wasRestored = await onRestoreSnapshot(snapshotId);
      if (wasRestored) setOpen(false);
    } catch {
      setMessage("Checkpoint could not be restored.");
    } finally {
      setActiveSnapshotId(null);
    }
  }

  async function handleDelete(snapshotId: string) {
    setActiveSnapshotId(snapshotId);
    setMessage(null);
    try {
      const wasDeleted = await onDeleteSnapshot(snapshotId);
      if (wasDeleted) setSnapshots((current) => current.filter((snapshot) => snapshot.id !== snapshotId));
    } catch {
      setMessage("Checkpoint could not be removed.");
    } finally {
      setActiveSnapshotId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          disabled={isPending || snapshotCount === 0}
          aria-label={`Open checkpoint history for ${projectTitle}`}
        >
          <History className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Checkpoint history</DialogTitle>
          <DialogDescription>{projectTitle}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {message ? <div className="rounded-md border border-destructive/40 p-3 text-sm text-destructive">{message}</div> : null}
          {isLoading ? <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">Loading checkpoints...</div> : null}
          {!isLoading && snapshots.length === 0 ? (
            <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">No checkpoints yet.</div>
          ) : null}
          {!isLoading && snapshots.length > 0 ? (
            <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
              {snapshots.map((snapshot) => (
                <div key={snapshot.id} className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-md border border-border p-3">
                  <div className="min-w-0 space-y-1">
                    <div className="truncate text-sm font-medium">{snapshot.label ?? "Manual checkpoint"}</div>
                    <div className="text-xs text-muted-foreground">{new Date(snapshot.createdAt).toLocaleString()}</div>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="secondary">{snapshot.layerCount} layers</Badge>
                      <Badge variant="secondary">{snapshot.mediaCount} media</Badge>
                      <Badge variant="outline">{Math.round(snapshot.duration)}s</Badge>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleRestore(snapshot.id)}
                      disabled={isPending || activeSnapshotId !== null}
                      aria-label={`Restore checkpoint from ${new Date(snapshot.createdAt).toLocaleString()}`}
                    >
                      <RotateCcw className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDelete(snapshot.id)}
                      disabled={isPending || activeSnapshotId !== null}
                      aria-label={`Delete checkpoint from ${new Date(snapshot.createdAt).toLocaleString()}`}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
