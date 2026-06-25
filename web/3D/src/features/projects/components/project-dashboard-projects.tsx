import Link from "next/link";
import { Archive, Clock, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProjectRecord } from "@/db/schema";
import { sceneDocumentSchema } from "@/features/editor/types";
import { ProjectFileActions } from "@/features/projects/components/project-file-actions";
import { ProjectAccessMenu } from "@/features/projects/components/project-access-menu";
import { ProjectAuditLog } from "@/features/projects/components/project-audit-log";
import { ProjectComplianceExport } from "@/features/projects/components/project-compliance-export";
import { ProjectDataRetentionControls } from "@/features/projects/components/project-data-retention-controls";
import { ProjectFolderMenu } from "@/features/projects/components/project-folder-menu";
import { ProjectFolderPanel } from "@/features/projects/components/project-folder-panel";
import { ProjectReviewWorkflow } from "@/features/projects/components/project-review-workflow";
import { ProjectShareActions } from "@/features/projects/components/project-share-actions";
import { ProjectTemplateLauncher } from "@/features/projects/components/project-template-launcher";
import type { ProjectFolderSummary } from "@/features/projects/types";
import type { WorkspaceMemberRow } from "@/features/workspaces/types";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(value);
}

function countSceneObjects(sceneData: unknown) {
  const parsed = sceneDocumentSchema.safeParse(sceneData);

  return parsed.success ? parsed.data.objects.length : 0;
}

export function ProjectDashboardProjects({
  folderCounts,
  folders,
  projects,
  selectedFolderId,
  showingTrash,
  unfiledCount,
  view,
  workspaceId,
  workspaceMembers,
}: {
  folderCounts: Record<string, number>;
  folders: ProjectFolderSummary[];
  projects: ProjectRecord[];
  selectedFolderId: string | null;
  showingTrash: boolean;
  unfiledCount: number;
  view: "active" | "trash";
  workspaceId: string;
  workspaceMembers: WorkspaceMemberRow[];
}) {
  return (
    <div className={showingTrash ? "grid gap-4" : "grid gap-4 lg:grid-cols-[280px_1fr]"}>
      <aside className={showingTrash ? "hidden" : ""}>
        <ProjectFolderPanel
          folders={folders}
          folderCounts={folderCounts}
          selectedFolderId={selectedFolderId}
          unfiledCount={unfiledCount}
          workspaceId={workspaceId}
          workspaceMembers={workspaceMembers}
        />
      </aside>

      {projects.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{showingTrash ? "Trash is empty" : "No projects here yet"}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 text-sm text-muted-foreground">
            <p>{showingTrash ? "Archived scenes will appear here until you restore them." : "Create a scene in the editor, or move an existing scene into this folder."}</p>
            {showingTrash ? null : (
              <Link className={buttonVariants({ className: "w-fit gap-2" })} href="/">
                <Plus className="size-4" />
                Open editor
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((entry) => (
            <Card key={entry.id} className="overflow-hidden">
              <CardHeader className="gap-3">
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="truncate text-base">{entry.name}</CardTitle>
                  <Badge className="rounded-md">{countSceneObjects(entry.sceneData)} objects</Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="size-3.5" />
                  {showingTrash && entry.archivedAt ? "Archived" : "Saved"} {formatDate((showingTrash && entry.archivedAt) || entry.updatedAt)}
                </div>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-3">
                <div className="min-w-0 space-y-2">
                  <p className="line-clamp-2 min-h-9 text-sm text-muted-foreground">{entry.description || "No description"}</p>
                  {showingTrash ? null : (
                    <>
                      <ProjectFolderMenu folders={folders} projectFolderId={entry.folderId} projectId={entry.id} />
                      <ProjectAccessMenu members={workspaceMembers} projectId={entry.id} />
                      <ProjectReviewWorkflow projectId={entry.id} shareSettings={entry.shareSettings} />
                      <ProjectAuditLog projectId={entry.id} projectName={entry.name} />
                      <ProjectDataRetentionControls projectId={entry.id} projectName={entry.name} />
                      <ProjectComplianceExport projectId={entry.id} />
                      <ProjectShareActions projectId={entry.id} publishedAt={entry.publishedAt?.toISOString() ?? null} shareId={entry.shareId} shareSettings={entry.shareSettings} />
                    </>
                  )}
                </div>
                <ProjectFileActions projectId={entry.id} projectName={entry.name} view={view} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function getProjectsPath(options: { view?: "active" | "trash"; workspaceId: string }) {
  const params = new URLSearchParams({ workspaceId: options.workspaceId });

  if (options.view === "trash") {
    params.set("view", "trash");
  }

  return `/projects?${params.toString()}`;
}

export function ProjectDashboardActions({ showingTrash, workspaceId }: { showingTrash: boolean; workspaceId: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link className={buttonVariants({ className: "gap-2", variant: showingTrash ? "ghost" : "secondary" })} href={getProjectsPath({ workspaceId })}>
        <Archive className="size-4" />
        Active
      </Link>
      <Link className={buttonVariants({ className: "gap-2", variant: showingTrash ? "secondary" : "ghost" })} href={getProjectsPath({ view: "trash", workspaceId })}>
        <Trash2 className="size-4" />
        Trash
      </Link>
      <Link className={buttonVariants({ className: "gap-2" })} href="/">
        <Plus className="size-4" />
        New scene
      </Link>
      <ProjectTemplateLauncher workspaceId={workspaceId} />
    </div>
  );
}
