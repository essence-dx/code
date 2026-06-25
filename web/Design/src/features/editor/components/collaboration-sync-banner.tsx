"use client";

import { AlertTriangle, Cloud, Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { CollaborationSyncStatus } from "@/features/editor/use-project-collaboration-sync";

type CollaborationSyncBannerProps = {
  status: CollaborationSyncStatus;
  pendingProjectName?: string | null;
  pendingUpdatedAt?: string | null;
  onApplyRemote: () => void;
};

export function CollaborationSyncBanner({
  status,
  pendingProjectName,
  pendingUpdatedAt,
  onApplyRemote,
}: CollaborationSyncBannerProps) {
  if (status === "idle") {
    return null;
  }

  if (status === "syncing") {
    return (
      <div className="flex items-center justify-center gap-2 border-b border-border bg-secondary/40 px-4 py-2 text-xs text-muted-foreground">
        <Cloud className="h-4 w-4" />
        Live sync saving changes
      </div>
    );
  }

  if (status === "pending") {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs">
        <div className="flex min-w-0 items-center gap-2 text-amber-100">
          <Download className="h-4 w-4 shrink-0" />
          <span className="truncate">
            New edits are available
            {pendingProjectName ? ` in ${pendingProjectName}` : ""}
            {pendingUpdatedAt
              ? ` from ${new Date(pendingUpdatedAt).toLocaleTimeString()}`
              : ""}
          </span>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onApplyRemote}
        >
          Load latest
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-2 border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-xs text-destructive">
      <AlertTriangle className="h-4 w-4" />
      Live sync needs attention
    </div>
  );
}
