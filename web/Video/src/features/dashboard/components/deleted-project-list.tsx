import { RotateCcw, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProjectTrashManagerDialog } from "@/features/dashboard/components/project-trash-manager-dialog";
import type { LocalProjectTrashRecord } from "@/lib/projects/local-project-record";

interface DeletedProjectListProps {
  projects: LocalProjectTrashRecord[];
  isPending: boolean;
  onRestore: (id: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onRestoreMany: (ids: string[]) => Promise<boolean>;
  onDeleteMany: (ids: string[]) => Promise<boolean>;
}

export function DeletedProjectList({
  projects,
  isPending,
  onRestore,
  onDelete,
  onRestoreMany,
  onDeleteMany,
}: DeletedProjectListProps) {
  if (projects.length === 0) return null;

  return (
    <div className="mt-4 rounded-md border border-border p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-medium">Recently deleted</div>
          <div className="text-xs text-muted-foreground">Restore projects before permanently removing them.</div>
        </div>
        <div className="flex items-center gap-2">
          <ProjectTrashManagerDialog
            projects={projects}
            isPending={isPending}
            onRestoreProjects={onRestoreMany}
            onDeleteProjects={onDeleteMany}
          />
          <Badge variant="secondary">{projects.length}</Badge>
        </div>
      </div>
      <div className="mt-3 space-y-2">
        {projects.slice(0, 5).map((item) => (
          <div key={item.id} className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-md border border-border px-3 py-2">
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{item.title}</div>
              <div className="text-xs text-muted-foreground">
                {item.layerCount} layers / {item.mediaCount} media / deleted {new Date(item.deletedAt).toLocaleString()}
              </div>
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" onClick={() => void onRestore(item.id)} disabled={isPending}>
                <RotateCcw className="size-4" />
                Restore
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => void onDelete(item.id)}
                disabled={isPending}
                aria-label={`Permanently delete ${item.title}`}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
