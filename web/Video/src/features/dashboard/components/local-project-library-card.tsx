"use client";

import type { RefObject } from "react";
import { Copy, DownloadCloud, Search, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DeletedProjectList } from "@/features/dashboard/components/deleted-project-list";
import { ProjectBulkActionsBar } from "@/features/dashboard/components/project-bulk-actions-bar";
import { ProjectFolderDialog } from "@/features/dashboard/components/project-folder-dialog";
import { ProjectFolderManagerDialog } from "@/features/dashboard/components/project-folder-manager-dialog";
import { ProjectHealthBadge, ProjectLibraryHealthSummary, healthFilterLabels, type HealthFilter } from "@/features/dashboard/components/project-health-dashboard";
import { ProjectFolderBadge, ProjectReviewBadge, SnapshotCountBadge } from "@/features/dashboard/components/project-library-badges";
import { ProjectSnapshotDialog } from "@/features/dashboard/components/project-snapshot-dialog";
import { DashboardMessageView } from "@/features/dashboard/components/dashboard-message-view";
import {
  reviewFilterLabels,
  type DashboardLocalLibrary,
  type FolderFilter,
  type ReviewFilter,
  type SortMode,
} from "@/features/dashboard/hooks/use-dashboard-local-library";
import { createProjectReviewSummary } from "@/lib/editor/project-review-summary";
import { createProjectHealthSummary } from "@/lib/projects/project-health";

type LocalProjectLibraryCardProps = {
  library: DashboardLocalLibrary;
  bundleInputRef: RefObject<HTMLInputElement | null>;
};

export function LocalProjectLibraryCard({ library, bundleInputRef }: LocalProjectLibraryCardProps) {
  const {
    allVisibleProjectsSelected,
    assignProjectToFolder,
    bulkAssignSelectedProjects,
    bulkDuplicateSelectedProjects,
    bulkExportSelectedProjectBundles,
    bulkMoveSelectedProjectsToTrash,
    clearSelectedProjects,
    createAndAssignProjectFolder,
    createLibraryFolder,
    deleteLibraryFolder,
    deleteProject,
    deleteSnapshot,
    deselectVisibleProjects,
    duplicateProject,
    exportProjectBundleFromLibrary,
    filteredProjectIds,
    filteredProjects,
    folderAssignments,
    folderById,
    folderCounts,
    folderFilter,
    folders,
    healthByProjectId,
    healthFilter,
    importBundle,
    isLibraryActionPending,
    libraryHealth,
    libraryMessage,
    openProject,
    permanentlyDeleteTrashProject,
    permanentlyDeleteTrashProjects,
    query,
    renameLibraryFolder,
    restoreSnapshot,
    restoreTrashProject,
    restoreTrashProjects,
    reviewFilter,
    selectedProjectIds,
    selectedProjectIdSet,
    selectVisibleProjects,
    setFolderFilter,
    setHealthFilter,
    setQuery,
    setReviewFilter,
    setSortMode,
    snapshotCounts,
    sortMode,
    toggleProjectSelection,
    trashProjects,
  } = library;

  return (
    <Card className="shadow-none">
      <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-lg">Local library</CardTitle>
        <div className="flex flex-wrap gap-2">
          <input ref={bundleInputRef} hidden type="file" accept="application/json,.json" onChange={importBundle} />
          <ProjectFolderManagerDialog
            folders={folders}
            folderCounts={folderCounts}
            isPending={isLibraryActionPending}
            onCreateFolder={createLibraryFolder}
            onRenameFolder={renameLibraryFolder}
            onDeleteFolder={deleteLibraryFolder}
          />
          <Button size="sm" variant="outline" onClick={() => bundleInputRef.current?.click()} disabled={isLibraryActionPending}>
            <Upload className="size-4" />
            Import bundle
          </Button>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-2.5 size-4 text-muted-foreground" />
            <Input className="w-64 pl-8" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search projects" />
          </div>
          <Select value={sortMode} onValueChange={(value) => setSortMode(value as SortMode)}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="updated">Updated</SelectItem>
              <SelectItem value="title">Title</SelectItem>
              <SelectItem value="duration">Duration</SelectItem>
            </SelectContent>
          </Select>
          <Select value={folderFilter} onValueChange={(value) => setFolderFilter(value as FolderFilter)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All folders</SelectItem>
              <SelectItem value="none">No folder</SelectItem>
              {folders.map((folder) => (
                <SelectItem key={folder.id} value={folder.id}>
                  {folder.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={reviewFilter} onValueChange={(value) => setReviewFilter(value as ReviewFilter)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(reviewFilterLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={healthFilter} onValueChange={(value) => setHealthFilter(value as HealthFilter)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(healthFilterLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {libraryMessage ? <DashboardMessageView message={libraryMessage} className="mb-3" /> : null}
        <ProjectLibraryHealthSummary report={libraryHealth} className="mb-3" />
        <ProjectBulkActionsBar
          selectedCount={selectedProjectIds.length}
          visibleCount={filteredProjectIds.length}
          allVisibleSelected={allVisibleProjectsSelected}
          folders={folders}
          isPending={isLibraryActionPending}
          onSelectAllVisible={selectVisibleProjects}
          onClearSelection={clearSelectedProjects}
          onAssignFolder={bulkAssignSelectedProjects}
          onDuplicate={bulkDuplicateSelectedProjects}
          onExportBundles={bulkExportSelectedProjectBundles}
          onMoveToTrash={bulkMoveSelectedProjectsToTrash}
        />
        {filteredProjects.length === 0 ? (
          <div className="rounded-md border border-dashed border-border p-6 text-sm text-muted-foreground">
            No saved local projects yet. Open the editor and it will autosave here.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    className="size-4 rounded border-border"
                    checked={allVisibleProjectsSelected}
                    onChange={(event) => {
                      if (event.target.checked) {
                        selectVisibleProjects();
                        return;
                      }
                      deselectVisibleProjects();
                    }}
                    disabled={isLibraryActionPending || filteredProjectIds.length === 0}
                    aria-label="Select visible projects"
                  />
                </TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Folder</TableHead>
                <TableHead>Ratio</TableHead>
                <TableHead>Layers</TableHead>
                <TableHead>Media</TableHead>
                <TableHead>Checkpoints</TableHead>
                <TableHead>Review</TableHead>
                <TableHead>Health</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="w-[260px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProjects.map((item) => {
                const health = healthByProjectId.get(item.id) ?? createProjectHealthSummary(item);
                const assignedFolder = folderById.get(folderAssignments[item.id]?.folderId);

                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        className="size-4 rounded border-border"
                        checked={selectedProjectIdSet.has(item.id)}
                        onChange={(event) => toggleProjectSelection(item.id, event.target.checked)}
                        disabled={isLibraryActionPending}
                        aria-label={`Select ${item.title}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="min-w-0 space-y-1">
                        <button className="font-medium hover:text-primary" onClick={() => openProject(item.id)} disabled={isLibraryActionPending}>
                          {item.title}
                        </button>
                        {health.details.length ? (
                          <div className="max-w-72 truncate text-xs text-muted-foreground">{health.details.slice(0, 2).join(" / ")}</div>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <ProjectFolderBadge folder={assignedFolder} />
                    </TableCell>
                    <TableCell>{item.aspectRatio}</TableCell>
                    <TableCell>{item.layerCount}</TableCell>
                    <TableCell>{item.mediaCount}</TableCell>
                    <TableCell>
                      <SnapshotCountBadge count={snapshotCounts[item.id] ?? 0} />
                    </TableCell>
                    <TableCell>
                      <ProjectReviewBadge summary={createProjectReviewSummary(item.project)} />
                    </TableCell>
                    <TableCell>
                      <ProjectHealthBadge summary={health} />
                    </TableCell>
                    <TableCell>{new Date(item.updatedAt).toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" onClick={() => openProject(item.id)} disabled={isLibraryActionPending}>
                          Open
                        </Button>
                        <ProjectSnapshotDialog
                          projectId={item.id}
                          projectTitle={item.title}
                          snapshotCount={snapshotCounts[item.id] ?? 0}
                          isPending={isLibraryActionPending}
                          onRestoreSnapshot={restoreSnapshot}
                          onDeleteSnapshot={deleteSnapshot}
                        />
                        <ProjectFolderDialog
                          projectTitle={item.title}
                          folders={folders}
                          assignedFolderId={folderAssignments[item.id]?.folderId ?? null}
                          isPending={isLibraryActionPending}
                          onAssignFolder={(folderId) => assignProjectToFolder(item.id, folderId)}
                          onCreateFolder={(name) => createAndAssignProjectFolder(item.id, name)}
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => exportProjectBundleFromLibrary(item.id)}
                          disabled={isLibraryActionPending}
                          aria-label={`Export ${item.title} bundle`}
                        >
                          <DownloadCloud className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => duplicateProject(item.id)}
                          disabled={isLibraryActionPending}
                          aria-label={`Duplicate ${item.title}`}
                        >
                          <Copy className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteProject(item.id)}
                          disabled={isLibraryActionPending}
                          aria-label={`Delete ${item.title}`}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
        <DeletedProjectList
          projects={trashProjects}
          isPending={isLibraryActionPending}
          onRestore={restoreTrashProject}
          onDelete={permanentlyDeleteTrashProject}
          onRestoreMany={restoreTrashProjects}
          onDeleteMany={permanentlyDeleteTrashProjects}
        />
      </CardContent>
    </Card>
  );
}
