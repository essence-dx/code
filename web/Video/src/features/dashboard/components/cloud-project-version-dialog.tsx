"use client";

import { useState } from "react";
import { History, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import type { DashboardMessage } from "@/features/dashboard/dashboard-types";
import {
  listCloudProjectVersions,
  restoreCloudProjectVersion,
  type SyncedProjectAuditEvent,
  type SyncedProjectSummary,
  type SyncedProjectVersionSummary,
} from "@/lib/projects/project-sync-client";

type CloudProjectVersionDialogProps = {
  project: SyncedProjectSummary;
  disabled: boolean;
  onMessage: (message: DashboardMessage | null) => void;
  onRestored: () => Promise<void>;
};

export function CloudProjectVersionDialog({ project, disabled, onMessage, onRestored }: CloudProjectVersionDialogProps) {
  const [open, setOpen] = useState(false);
  const [versions, setVersions] = useState<SyncedProjectVersionSummary[]>([]);
  const [auditEvents, setAuditEvents] = useState<SyncedProjectAuditEvent[]>([]);
  const [isPending, setIsPending] = useState(false);

  async function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      await refresh();
    }
  }

  async function refresh() {
    setIsPending(true);
    onMessage(null);

    try {
      const history = await listCloudProjectVersions(project.id);
      setVersions(history.versions);
      setAuditEvents(history.auditEvents);
    } catch {
      onMessage({ tone: "destructive", text: "Cloud version history could not be loaded." });
    } finally {
      setIsPending(false);
    }
  }

  async function restore(version: SyncedProjectVersionSummary) {
    setIsPending(true);
    onMessage(null);

    try {
      await restoreCloudProjectVersion(project.id, version.id);
      await refresh();
      await onRestored();
      onMessage({ tone: "default", text: "Cloud project version restored. Open it again to load the restored timeline." });
    } catch {
      onMessage({ tone: "destructive", text: "Cloud project version could not be restored." });
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => void handleOpenChange(nextOpen)}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" disabled={disabled} aria-label={`View version history for ${project.title}`}>
          <History className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Cloud version history</DialogTitle>
          <DialogDescription>{project.title}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <section className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-medium">Restore points</h3>
              <Button size="sm" variant="outline" onClick={() => void refresh()} disabled={isPending}>
                Refresh
              </Button>
            </div>
            <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
              {versions.length ? (
                versions.map((version) => (
                  <div key={version.id} className="rounded-md border border-border p-3 text-sm">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={version.action === "restore" ? "secondary" : "outline"}>{version.action}</Badge>
                          <span className="font-medium">{version.label}</span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatDate(version.createdAt)} / {version.layerCount} layers / {version.mediaCount} media / {Math.round(version.duration)}s
                        </p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => void restore(version)} disabled={isPending}>
                        <RotateCcw className="size-4" />
                        Restore
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
                  No cloud restore points yet. Sync this project to create one.
                </div>
              )}
            </div>
          </section>

          <Separator />

          <section className="space-y-2">
            <h3 className="text-sm font-medium">Audit history</h3>
            <div className="max-h-40 space-y-2 overflow-y-auto pr-1">
              {auditEvents.length ? (
                auditEvents.map((event) => (
                  <div key={event.id} className="rounded-md border border-border p-2 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{event.action}</Badge>
                      <span className="text-xs text-muted-foreground">{formatDate(event.createdAt)}</span>
                    </div>
                    <p className="mt-1 text-muted-foreground">{event.detail}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
                  No cloud audit events yet.
                </div>
              )}
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString();
}
