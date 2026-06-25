"use client";

import { type ReactNode, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Copy,
  FileText,
  FolderKanban,
  GitPullRequestArrow,
  Bookmark,
  MessageSquare,
  MoreHorizontal,
  Download,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Star,
  Trash2,
  Users,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  createDesignFile,
  deleteDesignFile,
  duplicateDesignFile,
  renameDesignFile,
  restoreDesignFile,
  toggleFavoriteDesignFile,
  type DesignFileSummary,
} from "@/features/files/actions";
import { FileAccessDialog } from "@/features/editor/components/file-access-dialog";
import { FileGovernanceReviewPanel } from "@/features/editor/components/file-governance-review-panel";
import { FileOrganizationDialog } from "@/features/editor/components/file-organization-dialog";
import { WorkspaceFileBrowserParityPanel } from "@/features/editor/components/workspace-file-browser-parity-panel";
import {
  collaborationQueueFilters,
  fileFilters,
  fileSortOptions,
  fileWorkspacePresets,
  getFileBrowserGroups,
  getFileQueueStats,
  getFileWorkspaceInventoryCsv,
  getFileWorkspaceSummaries,
  getVisibleFiles,
  type CollaborationQueueFilter,
  type FileFilter,
  type FileSort,
  type FileWorkspaceSummary,
} from "@/features/editor/file-browser-model";
import { getWorkspaceFileBrowserParityReport } from "@/features/editor/workspace-file-browser-parity";
import { cn } from "@/lib/utils";

type FileBrowserPanelProps = {
  activeFileId: string;
  files: DesignFileSummary[];
  onRecordActivity?: (label: string, detail?: string) => void;
};

export function FileBrowserPanel({
  activeFileId,
  files,
  onRecordActivity,
}: FileBrowserPanelProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FileFilter>("recent");
  const [sort, setSort] = useState<FileSort>("updated");
  const [collaborationQueue, setCollaborationQueue] =
    useState<CollaborationQueueFilter>("all");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<DesignFileSummary | null>(
    null,
  );
  const [organizationTarget, setOrganizationTarget] =
    useState<DesignFileSummary | null>(null);
  const [accessTarget, setAccessTarget] = useState<DesignFileSummary | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();

  const visibleFiles = useMemo(
    () => getVisibleFiles(files, filter, query, collaborationQueue, sort),
    [collaborationQueue, files, filter, query, sort],
  );
  const groupedFiles = useMemo(
    () => getFileBrowserGroups(visibleFiles),
    [visibleFiles],
  );
  const queueStats = useMemo(() => getFileQueueStats(files), [files]);
  const workspaceSummaries = useMemo(
    () => getFileWorkspaceSummaries(files),
    [files],
  );
  const workspaceParityReport = useMemo(
    () =>
      getWorkspaceFileBrowserParityReport({
        files,
        handoffCapabilities: {
          accessDialogEnabled: true,
          creationEnabled: true,
          importHandoffEnabled: true,
          inventoryExportEnabled: true,
          organizationDialogEnabled: true,
        },
      }),
    [files],
  );

  function createFile() {
    startTransition(async () => {
      const file = await createDesignFile();
      router.push(`/?file=${file.id}`);
      router.refresh();
    });
  }

  function duplicateFile(fileId: string) {
    startTransition(async () => {
      const file = await duplicateDesignFile({ fileId });
      router.push(`/?file=${file.id}`);
      router.refresh();
    });
  }

  function commitRename(fileId: string) {
    const name = draftName.trim();
    setRenamingId(null);

    if (!name) {
      return;
    }

    startTransition(async () => {
      await renameDesignFile({ fileId, name });
      router.refresh();
    });
  }

  function moveToTrash(fileId: string) {
    startTransition(async () => {
      const result = await deleteDesignFile({ fileId });
      setDeleteTarget(null);
      router.push(result.nextFileId ? `/?file=${result.nextFileId}` : "/");
      router.refresh();
    });
  }

  function restoreFile(fileId: string) {
    startTransition(async () => {
      const file = await restoreDesignFile({ fileId });
      router.push(`/?file=${file.id}`);
      router.refresh();
    });
  }

  function toggleFavorite(fileId: string) {
    startTransition(async () => {
      await toggleFavoriteDesignFile({ fileId });
      router.refresh();
    });
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="space-y-2 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Files
          </span>
          <div className="flex shrink-0 gap-1">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-7"
              onClick={() => exportWorkspaceInventory(files)}
              aria-label="Export workspace inventory"
            >
              <Download className="size-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="size-7"
              onClick={createFile}
              disabled={isPending}
              aria-label="New file"
            >
              <Plus className="size-4" />
            </Button>
          </div>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-8 pl-7"
            placeholder="Search"
          />
        </div>
        <div className="grid grid-cols-2 gap-1 rounded-md border border-border bg-background p-1">
          {fileFilters.map((item) => (
            <Button
              key={item.id}
              type="button"
              size="sm"
              variant={filter === item.id ? "secondary" : "ghost"}
              className="h-7 rounded-sm px-2 text-xs"
              onClick={() => setFilter(item.id)}
            >
              {item.label}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1 rounded-md border border-border bg-background p-1">
          {fileSortOptions.map((item) => (
            <Button
              key={item.id}
              type="button"
              size="sm"
              variant={sort === item.id ? "secondary" : "ghost"}
              className="h-7 rounded-sm px-2 text-xs"
              onClick={() => setSort(item.id)}
            >
              {item.label}
            </Button>
          ))}
        </div>
        {filter === "collaboration" ? (
          <div className="flex flex-wrap gap-1 rounded-md border border-border bg-background p-1">
            {collaborationQueueFilters.map((item) => (
              <Button
                key={item.id}
                type="button"
                size="sm"
                variant={
                  collaborationQueue === item.id ? "secondary" : "ghost"
                }
                className="h-7 rounded-sm px-2 text-xs"
                onClick={() => setCollaborationQueue(item.id)}
              >
                {item.label}
              </Button>
            ))}
          </div>
        ) : null}
        <div className="grid grid-cols-2 gap-1">
          <FileQueueBadge
            icon={<FileText className="size-3.5" />}
            label="Drafts"
            value={queueStats.drafts}
          />
          <FileQueueBadge
            icon={<GitPullRequestArrow className="size-3.5" />}
            label="Inspect"
            value={queueStats.handoff}
          />
          <FileQueueBadge
            icon={<Users className="size-3.5" />}
            label="Shared"
            value={queueStats.collaboration}
          />
          <FileQueueBadge
            icon={<MessageSquare className="size-3.5" />}
            label="Open"
            value={queueStats.openComments}
          />
        </div>
        <FileGovernanceReviewPanel
          files={files}
          onRecordActivity={onRecordActivity}
        />
        <WorkspaceFileBrowserParityPanel
          report={workspaceParityReport}
          onRecordActivity={onRecordActivity}
        />
        <div className="space-y-1 rounded-md border border-border bg-background p-1">
          <div className="flex items-center gap-1 px-1 py-0.5 text-[11px] font-medium text-muted-foreground">
            <Bookmark className="size-3.5" />
            Presets
          </div>
          <div className="grid grid-cols-2 gap-1">
            {fileWorkspacePresets.map((preset) => (
              <Button
                key={preset.id}
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 justify-start rounded-sm px-2 text-xs"
                onClick={() => {
                  setFilter(preset.filter);
                  setSort(preset.sort);
                  setCollaborationQueue(preset.collaborationQueue);
                  setQuery("");
                }}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </div>
        <FileWorkspaceOverview
          summaries={workspaceSummaries}
          onHandoff={(summary) =>
            applyWorkspaceScope(summary, "handoff", "handoff", "all")
          }
          onReview={(summary) =>
            applyWorkspaceScope(summary, "recent", "comments", "all")
          }
          onSelect={(summary) =>
            applyWorkspaceScope(summary, "recent", "updated", "all")
          }
        />
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-1 p-2 pt-0">
          {groupedFiles.map((group) => (
            <div key={group.id} className="space-y-1">
              <div className="flex items-center justify-between gap-2 px-2 pt-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                <span className="truncate">{group.label}</span>
                <span className="truncate normal-case tracking-normal">
                  {group.detail}
                </span>
              </div>
              {group.files.map((file) => (
                <div
                  key={file.id}
                  className={cn(
                    "group flex items-center gap-2 rounded-md px-2 py-2",
                    activeFileId === file.id
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-2 text-left"
                onClick={() => {
                  if (!file.trashedAt) {
                    router.push(`/?file=${file.id}`);
                  }
                }}
              >
                <FileThumbnail file={file} />
                {renamingId === file.id ? (
                  <Input
                    value={draftName}
                    autoFocus
                    className="h-7"
                    onClick={(event) => event.stopPropagation()}
                    onChange={(event) => setDraftName(event.target.value)}
                    onBlur={() => commitRename(file.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        commitRename(file.id);
                      }
                      if (event.key === "Escape") {
                        setRenamingId(null);
                      }
                    }}
                  />
                ) : (
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {file.favorite ? "* " : ""}
                      {file.name}
                    </span>
                    <span className="block truncate text-xs">
                      {file.pageCount} pages / {file.layerCount} layers /{" "}
                      {formatDate(
                        file.trashedAt ?? file.lastOpenedAt ?? file.updatedAt,
                      )}
                    </span>
                    <span className="mt-1 flex min-w-0 flex-wrap items-center gap-1">
                      <span className="truncate text-[11px] text-muted-foreground">
                        {file.teamName} / {file.projectName}
                      </span>
                      {file.accessRole !== "owner" ? (
                        <Badge variant="outline" className="h-4 px-1 text-[10px]">
                          {file.accessRole}
                        </Badge>
                      ) : null}
                      {file.readyForDevCount > 0 ? (
                        <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                          {file.readyForDevCount} dev
                        </Badge>
                      ) : null}
                      {file.prototypeHotspotCount > 0 ? (
                        <Badge variant="outline" className="h-4 px-1 text-[10px]">
                          {file.prototypeHotspotCount} flow
                        </Badge>
                      ) : null}
                      {file.openCommentCount > 0 ? (
                        <Badge variant="outline" className="h-4 px-1 text-[10px]">
                          {file.openCommentCount} open
                        </Badge>
                      ) : null}
                    </span>
                  </span>
                )}
              </button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-7 opacity-70"
                    aria-label="File actions"
                  >
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  {file.trashedAt ? (
                    <DropdownMenuItem
                      disabled={file.accessRole !== "owner"}
                      onClick={() => restoreFile(file.id)}
                    >
                      <RotateCcw className="size-4" />
                      Restore
                    </DropdownMenuItem>
                  ) : (
                    <>
                      {file.accessRole === "owner" ? (
                        <>
                          <DropdownMenuItem
                            onClick={() => toggleFavorite(file.id)}
                          >
                            <Star className="size-4" />
                            {file.favorite ? "Unfavorite" : "Favorite"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setRenamingId(file.id);
                              setDraftName(file.name);
                            }}
                          >
                            <Pencil className="size-4" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setOrganizationTarget(file)}
                          >
                            <FolderKanban className="size-4" />
                            Organize
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={(event) => {
                              event.preventDefault();
                              setAccessTarget(file);
                            }}
                          >
                            <Users className="size-4" />
                            Manage access
                          </DropdownMenuItem>
                        </>
                      ) : null}
                      <DropdownMenuItem onClick={() => duplicateFile(file.id)}>
                        <Copy className="size-4" />
                        Duplicate
                      </DropdownMenuItem>
                      {file.accessRole === "owner" ? (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setDeleteTarget(file)}
                          >
                            <Trash2 className="size-4" />
                            Move to trash
                          </DropdownMenuItem>
                        </>
                      ) : null}
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
                </div>
              ))}
            </div>
          ))}
          {visibleFiles.length === 0 ? (
            <div className="rounded-md border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
              No files match this view.
            </div>
          ) : null}
        </div>
      </ScrollArea>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move file to trash</AlertDialogTitle>
            <AlertDialogDescription>
              This moves {deleteTarget?.name} to trash. You can restore it from
              the Trash filter.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTarget) {
                  moveToTrash(deleteTarget.id);
                }
              }}
            >
              Move to trash
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <FileOrganizationDialog
        file={organizationTarget}
        open={organizationTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setOrganizationTarget(null);
          }
        }}
        onSaved={() => router.refresh()}
      />
      {accessTarget ? (
        <FileAccessDialog
          fileId={accessTarget.id}
          onAccessChanged={() => router.refresh()}
          onRecordActivity={onRecordActivity}
          open={accessTarget !== null}
          onOpenChange={(open) => {
            if (!open) {
              setAccessTarget(null);
            }
          }}
        />
      ) : null}
    </div>
  );

  function applyWorkspaceScope(
    summary: FileWorkspaceSummary,
    nextFilter: FileFilter,
    nextSort: FileSort,
    nextCollaborationQueue: CollaborationQueueFilter,
  ) {
    setFilter(nextFilter);
    setSort(nextSort);
    setCollaborationQueue(nextCollaborationQueue);
    setQuery(`${summary.teamName} ${summary.projectName}`);
  }
}

function FileWorkspaceOverview({
  onHandoff,
  onReview,
  summaries,
  onSelect,
}: {
  onHandoff: (summary: FileWorkspaceSummary) => void;
  onReview: (summary: FileWorkspaceSummary) => void;
  summaries: FileWorkspaceSummary[];
  onSelect: (summary: FileWorkspaceSummary) => void;
}) {
  if (summaries.length === 0) {
    return null;
  }

  return (
    <div className="space-y-1 rounded-md border border-border bg-background p-1">
      <div className="flex items-center gap-1 px-1 py-0.5 text-[11px] font-medium text-muted-foreground">
        <FolderKanban className="size-3.5" />
        Workspace
      </div>
      {summaries.slice(0, 4).map((summary) => (
        <div
          key={summary.id}
          className="flex items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-[11px] text-muted-foreground hover:bg-muted"
        >
          <button
            type="button"
            className="min-w-0 flex-1 text-left"
            onClick={() => onSelect(summary)}
          >
            <span className="block truncate font-medium text-foreground">
              {summary.projectName}
            </span>
            <span className="block truncate">{summary.teamName}</span>
          </button>
          <span className="flex shrink-0 items-center gap-1">
            <Badge variant="secondary" className="h-4 px-1 text-[10px]">
              {summary.fileCount}
            </Badge>
            {summary.openCommentCount > 0 ? (
              <Badge variant="outline" className="h-4 px-1 text-[10px]">
                {summary.openCommentCount} open
              </Badge>
            ) : null}
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-6"
              disabled={summary.openCommentCount === 0}
              onClick={() => onReview(summary)}
              aria-label={`Review ${summary.projectName}`}
            >
              <MessageSquare className="size-3.5" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-6"
              disabled={summary.handoffCount === 0}
              onClick={() => onHandoff(summary)}
              aria-label={`Open inspect queue for ${summary.projectName}`}
            >
              <GitPullRequestArrow className="size-3.5" />
            </Button>
          </span>
        </div>
      ))}
    </div>
  );
}

function FileThumbnail({ file }: { file: DesignFileSummary }) {
  return (
    <div className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-sm border border-border bg-background">
      {file.thumbnailSvg ? (
        <div
          className="max-h-full max-w-full [&_svg]:h-10 [&_svg]:w-10"
          dangerouslySetInnerHTML={{ __html: file.thumbnailSvg }}
        />
      ) : (
        <FileText className="size-4" />
      )}
    </div>
  );
}

function FileQueueBadge({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-2 rounded-md border border-border bg-background px-2 py-1 text-[11px]">
      <span className="flex min-w-0 items-center gap-1 text-muted-foreground">
        {icon}
        <span className="truncate">{label}</span>
      </span>
      <span className="font-mono text-foreground">{value}</span>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function exportWorkspaceInventory(files: DesignFileSummary[]) {
  const blob = new Blob([getFileWorkspaceInventoryCsv(files)], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = "essence-workspace-inventory.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}
