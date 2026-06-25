"use client";

import { useState } from "react";
import { Cloud, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { saveCloudProject } from "@/lib/projects/project-sync-client";
import { ProjectSyncConflictError } from "@/lib/projects/project-sync-conflicts";
import type { EditorProject, MediaAsset } from "@/lib/editor/types";
import { isClientApiUnavailableError, useHasClientApiRuntime } from "@/lib/runtime/client-api";

export function CloudSyncButton({
  project,
  mediaAssets,
  className,
}: {
  project: EditorProject;
  mediaAssets: MediaAsset[];
  className?: string;
}) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [lastCloudUpdatedAt, setLastCloudUpdatedAt] = useState<string | undefined>();
  const [forceNextSync, setForceNextSync] = useState(false);
  const canSync = useHasClientApiRuntime();

  async function sync() {
    if (!canSync) {
      setMessage("Unavailable in this desktop build");
      return;
    }

    setIsSyncing(true);
    setMessage(null);

    try {
      const cloudProject = await saveCloudProject(project, mediaAssets, {
        baseUpdatedAt: lastCloudUpdatedAt,
        mode: forceNextSync ? "force" : "reject-stale",
      });
      setLastCloudUpdatedAt(cloudProject.updatedAt);
      setForceNextSync(false);
      setMessage(forceNextSync ? "Synced with overwrite" : "Synced");
    } catch (error) {
      if (error instanceof ProjectSyncConflictError) {
        setLastCloudUpdatedAt(error.conflict.remoteUpdatedAt);
        setForceNextSync(true);
        setMessage("Cloud copy changed. Click Sync again to overwrite after reviewing.");
      } else {
        setMessage(isClientApiUnavailableError(error) ? "Unavailable in this desktop build" : "Sync failed");
      }
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <div className={className}>
      <Button size="sm" variant="outline" onClick={sync} disabled={isSyncing || !canSync}>
        {isSyncing ? <Loader2 className="size-4 animate-spin" /> : <Cloud className="size-4" />}
        Sync
      </Button>
      {message ? <span className="ml-2 text-xs text-muted-foreground">{message}</span> : null}
    </div>
  );
}
