"use client";

import { useEffect, useState } from "react";
import { History, Loader2, MessageSquare, RotateCcw, Users } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useEditorStore } from "@/features/editor/store/editor-store";
import { listProjectVersions, restoreProjectVersion } from "../project-api";
import type { ProjectVersionSummary } from "../types";

interface ProjectVersionHistoryProps {
  projectId: string | null;
  refreshKey: string | null;
}

function formatVersionDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function formatActor(version: ProjectVersionSummary) {
  const activity = version.activityData;

  if (!activity) {
    return null;
  }

  return activity.actorName?.trim() || activity.actorEmail || null;
}

export function ProjectVersionHistory({ projectId, refreshKey }: ProjectVersionHistoryProps) {
  const [versions, setVersions] = useState<ProjectVersionSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [pendingVersionId, setPendingVersionId] = useState<string | null>(null);
  const loadProject = useEditorStore((state) => state.loadProject);

  useEffect(() => {
    if (!projectId) {
      setVersions([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    listProjectVersions(projectId)
      .then((response) => {
        if (!cancelled) {
          setVersions(response.versions);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : "Version history failed");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [projectId, refreshKey]);

  async function handleRestore(version: ProjectVersionSummary) {
    if (!projectId) {
      return;
    }

    setPendingVersionId(version.id);

    try {
      const response = await restoreProjectVersion(projectId, version.id);
      loadProject(response.project.id, response.project.sceneData, response.project.updatedAt);
      toast.success(`${version.name} restored`);
      const history = await listProjectVersions(projectId);
      setVersions(history.versions);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Restore failed");
    } finally {
      setPendingVersionId(null);
    }
  }

  if (!projectId) {
    return null;
  }

  return (
    <section className="space-y-2 rounded-md border border-border bg-card p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <History className="size-4" />
          Version history
        </div>
        {loading ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : null}
      </div>

      {versions.length === 0 && !loading ? <p className="text-xs text-muted-foreground">Saved versions will appear after the next cloud save.</p> : null}

      {versions.length > 0 ? (
        <div className="space-y-1">
          {versions.map((version) => {
            const restoring = pendingVersionId === version.id;

            return (
              <div key={version.id} className="flex items-center justify-between gap-2 rounded-md border border-border p-2">
                <div className="min-w-0">
                  <div className="truncate text-xs font-medium">{version.name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {version.sceneData.objects.length} objects - {formatVersionDate(version.createdAt)}
                  </div>
                  {version.activityData ? (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {formatActor(version) ? (
                        <Badge className="max-w-full truncate rounded-md text-[10px]" variant="secondary">
                          {formatActor(version)}
                        </Badge>
                      ) : null}
                      <Badge className="gap-1 rounded-md text-[10px]" variant="secondary">
                        <MessageSquare className="size-3" />
                        {version.activityData.openCommentCount}/{version.activityData.totalCommentCount}
                      </Badge>
                      <Badge className="gap-1 rounded-md text-[10px]" variant="secondary">
                        <Users className="size-3" />
                        {version.activityData.activeCollaboratorCount}
                      </Badge>
                    </div>
                  ) : null}
                </div>
                <Button aria-label={`Restore ${version.name}`} className="size-8 shrink-0" disabled={restoring} size="icon" variant="ghost" onClick={() => void handleRestore(version)}>
                  {restoring ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
                </Button>
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
