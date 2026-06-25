"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import {
  ArchiveRestore,
  Clock,
  CopyPlus,
  Folder,
  FolderPlus,
  LayoutGrid,
  LayoutList,
  LayoutTemplate,
  MoreHorizontal,
  Pencil,
  Search,
  Star,
  Trash,
  Trash2,
} from "lucide-react";

import {
  createFolderAction,
  deleteDesignAction,
  moveDesignToFolderAction,
  permanentlyDeleteDesignAction,
  refreshVariantSourceMetadataAction,
  renameDesignAction,
  restoreDesignAction,
  toggleStarDesignAction,
} from "@/app/designs/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { designPresets, type DesignPreset } from "@/features/editor/presets";
import {
  designResizeProfiles,
  type ResizeProfileGroup,
} from "@/features/editor/resize-profiles";
import {
  approvalStatusLabels,
  approvalStatuses,
  getApprovalStatusBadgeVariant,
} from "@/features/review/approval-status";
import type { EditorLocale } from "@/features/editor/editor-localization";
import type {
  ApprovalStatus,
  DesignPresetId,
  ProjectFolderSummary,
  ProjectSummary,
} from "@/features/editor/types";
import {
  getProjectLibraryCopy,
  type ProjectLibraryCopy,
} from "@/features/projects/project-library-localization";
import { ProjectDerivativeBoard } from "@/features/projects/project-derivative-board";
import { cn } from "@/lib/utils";

type ProjectLibraryProps = {
  locale: EditorLocale;
  projects: ProjectSummary[];
  folders: ProjectFolderSummary[];
  duplicateAsSizeAction: ServerAction;
  updateApprovalStatusAction: ServerAction;
};

type ServerAction = (formData: FormData) => Promise<void> | void;
type SortMode = "updated-desc" | "updated-asc" | "name-asc" | "name-desc";
type ViewMode = "grid" | "list";
type ProjectTypeFilter = "all" | DesignPresetId;
type DateFilter = "all" | "today" | "week" | "month";
type FolderFilter = "all" | "unfiled" | `folder:${string}`;

const resizeProfileGroups: { id: ResizeProfileGroup }[] = [
  { id: "social" },
  { id: "presentation" },
  { id: "print" },
  { id: "website" },
  { id: "email" },
];

export function ProjectLibrary({
  locale,
  projects,
  folders,
  duplicateAsSizeAction,
  updateApprovalStatusAction,
}: ProjectLibraryProps) {
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("updated-desc");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [projectType, setProjectType] = useState<ProjectTypeFilter>("all");
  const [folderFilter, setFolderFilter] = useState<FolderFilter>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [showStarredOnly, setShowStarredOnly] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const copy = getProjectLibraryCopy(locale);
  const activeProjects = useMemo(
    () => projects.filter((project) => !project.deletedAt),
    [projects],
  );

  const visibleProjects = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = projects.filter((project) => {
      const preset = getProjectPreset(project, copy);
      const matchesQuery =
        !normalizedQuery ||
        project.name.toLowerCase().includes(normalizedQuery) ||
        preset.name.toLowerCase().includes(normalizedQuery);
      const matchesType = projectType === "all" || preset.id === projectType;
      const matchesFolder = isWithinFolderFilter(
        project.folderId,
        folderFilter,
      );
      const matchesDate =
        dateFilter === "all" ||
        isWithinDateFilter(project.updatedAt, dateFilter);
      const matchesStar = !showStarredOnly || project.starred;
      const matchesTrash = showTrash ? project.deletedAt : !project.deletedAt;

      return (
        matchesQuery &&
        matchesType &&
        matchesFolder &&
        matchesDate &&
        matchesStar &&
        matchesTrash
      );
    });

    return [...filtered].sort((a, b) => {
      if (sortMode === "name-asc") return a.name.localeCompare(b.name);
      if (sortMode === "name-desc") return b.name.localeCompare(a.name);

      const aTime = new Date(a.updatedAt).getTime();
      const bTime = new Date(b.updatedAt).getTime();

      return sortMode === "updated-asc" ? aTime - bTime : bTime - aTime;
    });
  }, [
    dateFilter,
    folderFilter,
    copy,
    projects,
    projectType,
    query,
    showStarredOnly,
    showTrash,
    sortMode,
  ]);

  return (
    <section className="space-y-6">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <h2 className="text-lg font-semibold">
            {showTrash ? copy.trash : copy.recentProjects}
          </h2>
          <p className="text-sm text-muted-foreground">
            {showTrash ? copy.trashDescription : copy.projectsDescription}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <form
            action={createFolderAction}
            className="flex w-full gap-2 sm:w-auto"
          >
            <Input
              name="name"
              placeholder={copy.newFolder}
              className="w-full sm:w-36"
              aria-label={copy.newFolderName}
            />
            <Button
              type="submit"
              variant="outline"
              size="icon"
              aria-label={copy.createFolder}
            >
              <FolderPlus className="h-4 w-4" />
            </Button>
          </form>
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={copy.searchProjects}
              className="pl-9"
            />
          </div>
          <Select
            value={projectType}
            onValueChange={(value) =>
              setProjectType(value as ProjectTypeFilter)
            }
          >
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{copy.allTypes}</SelectItem>
              {designPresets.map((preset) => (
                <SelectItem key={preset.id} value={preset.id}>
                  {preset.name}
                </SelectItem>
              ))}
              <SelectItem value="custom">{copy.customSize}</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={folderFilter}
            onValueChange={(value) => setFolderFilter(value as FolderFilter)}
          >
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{copy.allFolders}</SelectItem>
              <SelectItem value="unfiled">{copy.unfiled}</SelectItem>
              {folders.map((folder) => (
                <SelectItem key={folder.id} value={`folder:${folder.id}`}>
                  {folder.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant={showStarredOnly ? "secondary" : "outline"}
            size="icon"
            onClick={() => setShowStarredOnly((current) => !current)}
            aria-label={copy.showStarredProjects}
            disabled={showTrash}
          >
            <Star
              className={cn(
                "h-4 w-4",
                showStarredOnly && "fill-primary text-primary",
              )}
            />
          </Button>
          <Button
            variant={showTrash ? "secondary" : "outline"}
            onClick={() => {
              setShowStarredOnly(false);
              setShowTrash((current) => !current);
            }}
            aria-label={showTrash ? copy.showActiveProjects : copy.showTrash}
          >
            <Trash className="h-4 w-4" />
            {showTrash ? copy.active : copy.trash}
          </Button>
          <Select
            value={dateFilter}
            onValueChange={(value) => setDateFilter(value as DateFilter)}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{copy.anyTime}</SelectItem>
              <SelectItem value="today">{copy.today}</SelectItem>
              <SelectItem value="week">{copy.thisWeek}</SelectItem>
              <SelectItem value="month">{copy.thisMonth}</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={sortMode}
            onValueChange={(value) => setSortMode(value as SortMode)}
          >
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="updated-desc">{copy.newestFirst}</SelectItem>
              <SelectItem value="updated-asc">{copy.oldestFirst}</SelectItem>
              <SelectItem value="name-asc">{copy.nameAscending}</SelectItem>
              <SelectItem value="name-desc">{copy.nameDescending}</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant={viewMode === "grid" ? "secondary" : "outline"}
            size="icon"
            onClick={() => setViewMode("grid")}
            aria-label={copy.gridView}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "secondary" : "outline"}
            size="icon"
            onClick={() => setViewMode("list")}
            aria-label={copy.listView}
          >
            <LayoutList className="h-4 w-4" />
          </Button>
          <Badge variant="secondary">
            {copy.projectCount(visibleProjects.length, showTrash)}
          </Badge>
        </div>
      </div>

      <ProjectDerivativeBoard
        projects={activeProjects}
        refreshVariantAction={refreshVariantSourceMetadataAction}
      />

      {visibleProjects.length > 0 ? (
        <div
          className={cn(
            "grid gap-4",
            viewMode === "grid"
              ? "md:grid-cols-2 xl:grid-cols-3"
              : "grid-cols-1",
          )}
        >
          {visibleProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              folders={folders}
              compact={viewMode === "list"}
              copy={copy}
              duplicateAsSizeAction={duplicateAsSizeAction}
              updateApprovalStatusAction={updateApprovalStatusAction}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex min-h-80 flex-col items-center justify-center gap-3 text-center">
            <LayoutTemplate className="h-10 w-10 text-muted-foreground" />
            <div>
              <h3 className="font-medium">{copy.noMatchingProjects}</h3>
              <p className="text-sm text-muted-foreground">
                {showTrash ? copy.trashEmpty : copy.tryDifferentSearch}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </section>
  );
}

function ResizeVariantDialog({
  open,
  onOpenChange,
  project,
  copy,
  duplicateAsSizeAction,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: ProjectSummary;
  copy: ProjectLibraryCopy;
  duplicateAsSizeAction: ServerAction;
}) {
  const [profileId, setProfileId] = useState(designResizeProfiles[0].id);
  const profile =
    designResizeProfiles.find((candidate) => candidate.id === profileId) ??
    designResizeProfiles[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{copy.resizeCopy}</DialogTitle>
          <DialogDescription>{copy.resizeCopyDescription}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
          <div className="space-y-2">
            <Label htmlFor={`resize-profile-${project.id}`}>
              {copy.targetSize}
            </Label>
            <Select value={profileId} onValueChange={setProfileId}>
              <SelectTrigger
                id={`resize-profile-${project.id}`}
                className="w-full"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {resizeProfileGroups.map((group, index) => (
                  <SelectGroup key={group.id}>
                    <SelectLabel>{copy.resizeGroups[group.id]}</SelectLabel>
                    {designResizeProfiles
                      .filter((candidate) => candidate.group === group.id)
                      .map((candidate) => (
                        <SelectItem key={candidate.id} value={candidate.id}>
                          {candidate.name}
                        </SelectItem>
                      ))}
                    {index < resizeProfileGroups.length - 1 ? (
                      <SelectSeparator />
                    ) : null}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {profile.description} {profile.width} x {profile.height}px.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <ProjectAspectPreview
              label={copy.current}
              width={project.width}
              height={project.height}
              thumbnail={project.thumbnail}
            />
            <ProjectAspectPreview
              label={copy.variant}
              width={profile.width}
              height={profile.height}
              thumbnail={project.thumbnail}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {copy.cancel}
          </Button>
          <form action={duplicateAsSizeAction}>
            <input type="hidden" name="projectId" value={project.id} />
            <input type="hidden" name="profileId" value={profile.id} />
            <Button type="submit">
              <CopyPlus className="h-4 w-4" />
              {copy.createVariant}
            </Button>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProjectAspectPreview({
  label,
  width,
  height,
  thumbnail,
}: {
  label: string;
  width: number;
  height: number;
  thumbnail: string | null;
}) {
  const box = getPreviewBox(width, height);

  return (
    <div className="rounded-md border border-border bg-muted/40 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-medium">{label}</span>
        <Badge variant="outline">
          {width} x {height}
        </Badge>
      </div>
      <div className="flex h-36 items-center justify-center">
        <div
          className="relative overflow-hidden rounded border border-border bg-background shadow-sm"
          style={{ width: box.width, height: box.height }}
        >
          {thumbnail ? (
            <Image
              src={thumbnail}
              alt=""
              fill
              unoptimized
              sizes="180px"
              className="object-contain"
            />
          ) : (
            <div className="grid h-full w-full place-items-center text-muted-foreground">
              <LayoutTemplate className="h-6 w-6" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getPreviewBox(width: number, height: number) {
  const maxWidth = 180;
  const maxHeight = 122;
  const scale = Math.min(maxWidth / width, maxHeight / height);

  return {
    width: Math.max(24, Math.round(width * scale)),
    height: Math.max(24, Math.round(height * scale)),
  };
}

function ProjectCard({
  project,
  folders,
  compact,
  copy,
  duplicateAsSizeAction,
  updateApprovalStatusAction,
}: {
  project: ProjectSummary;
  folders: ProjectFolderSummary[];
  compact: boolean;
  copy: ProjectLibraryCopy;
  duplicateAsSizeAction: ServerAction;
  updateApprovalStatusAction: ServerAction;
}) {
  const [renameOpen, setRenameOpen] = useState(false);
  const [resizeOpen, setResizeOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const preset = getProjectPreset(project, copy);
  const folder = folders.find((folder) => folder.id === project.folderId);
  const isTrashed = Boolean(project.deletedAt);

  return (
    <Card
      className={cn("overflow-hidden", compact && "grid grid-cols-[180px_1fr]")}
    >
      <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-muted">
        {project.thumbnail ? (
          <Image
            src={project.thumbnail}
            alt={copy.thumbnailAlt(project.name)}
            fill
            unoptimized
            sizes="(max-width: 768px) 100vw, 360px"
            className="object-cover"
          />
        ) : (
          <LayoutTemplate className="h-10 w-10 text-muted-foreground" />
        )}
      </div>
      <div>
        <CardHeader>
          <CardTitle className="truncate text-base">{project.name}</CardTitle>
          <CardDescription>
            {preset.name} - {project.width} x {project.height}
          </CardDescription>
          <CardAction className="flex items-center gap-2">
            {isTrashed ? (
              <form action={restoreDesignAction}>
                <input type="hidden" name="projectId" value={project.id} />
                <Button type="submit" size="sm">
                  <ArchiveRestore className="h-4 w-4" />
                  {copy.restore}
                </Button>
              </form>
            ) : (
              <>
                <form action={toggleStarDesignAction}>
                  <input type="hidden" name="projectId" value={project.id} />
                  <input
                    type="hidden"
                    name="starred"
                    value={String(!project.starred)}
                  />
                  <Button
                    type="submit"
                    variant="outline"
                    size="icon"
                    aria-label={
                      project.starred ? copy.unstarProject : copy.starProject
                    }
                  >
                    <Star
                      className={cn(
                        "h-4 w-4",
                        project.starred && "fill-primary text-primary",
                      )}
                    />
                  </Button>
                </form>
                <Button asChild size="sm">
                  <Link href={`/editor/${project.id}`}>{copy.open}</Link>
                </Button>
              </>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={copy.projectActions}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {!isTrashed ? (
                  <>
                    <DropdownMenuItem onClick={() => setRenameOpen(true)}>
                      <Pencil className="h-4 w-4" />
                      {copy.rename}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setResizeOpen(true)}>
                      <CopyPlus className="h-4 w-4" />
                      {copy.resizeCopy}
                    </DropdownMenuItem>
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        {approvalStatusLabels[project.approvalStatus]}
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="min-w-48">
                        <DropdownMenuLabel>Approval</DropdownMenuLabel>
                        {approvalStatuses.map((status) => (
                          <ApprovalStatusMenuItem
                            key={status}
                            subject="project"
                            fieldName="projectId"
                            subjectId={project.id}
                            status={status}
                            updateApprovalStatusAction={
                              updateApprovalStatusAction
                            }
                          />
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <Folder className="h-4 w-4" />
                        {copy.moveToFolder}
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="min-w-44">
                        <DropdownMenuLabel>{copy.folders}</DropdownMenuLabel>
                        <MoveProjectMenuItem
                          projectId={project.id}
                          folderId="unfiled"
                          label={copy.unfiled}
                        />
                        {folders.map((folder) => (
                          <MoveProjectMenuItem
                            key={folder.id}
                            projectId={project.id}
                            folderId={folder.id}
                            label={folder.name}
                          />
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                    <DropdownMenuSeparator />
                  </>
                ) : null}
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="h-4 w-4" />
                  {isTrashed ? copy.deletePermanently : copy.moveToTrash}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {isTrashed && project.deletedAt
              ? copy.trashedAt(new Date(project.deletedAt).toLocaleString())
              : copy.updatedAt(new Date(project.updatedAt).toLocaleString())}
          </span>
          <Badge variant="outline" className="gap-1">
            <Folder className="h-3 w-3" />
            {folder?.name ?? copy.unfiled}
          </Badge>
          <Badge
            variant={getApprovalStatusBadgeVariant(project.approvalStatus)}
          >
            {approvalStatusLabels[project.approvalStatus]}
          </Badge>
          {project.variantName ? (
            <Badge variant="secondary">
              {copy.variantLabel(project.variantName)}
            </Badge>
          ) : null}
        </CardContent>
      </div>

      <ResizeVariantDialog
        open={resizeOpen}
        onOpenChange={setResizeOpen}
        project={project}
        copy={copy}
        duplicateAsSizeAction={duplicateAsSizeAction}
      />

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{copy.renameDesign}</DialogTitle>
            <DialogDescription>{copy.renameDesignDescription}</DialogDescription>
          </DialogHeader>
          <form action={renameDesignAction} className="space-y-4">
            <input type="hidden" name="projectId" value={project.id} />
            <div className="space-y-2">
              <Label htmlFor={`rename-${project.id}`}>{copy.name}</Label>
              <Input
                id={`rename-${project.id}`}
                name="name"
                defaultValue={project.name}
                required
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setRenameOpen(false)}
              >
                {copy.cancel}
              </Button>
              <Button type="submit">{copy.saveName}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{copy.deleteDesign}</AlertDialogTitle>
            <AlertDialogDescription>
              {isTrashed
                ? copy.deletePermanentDescription
                : copy.moveToTrashDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <form
            action={
              isTrashed ? permanentlyDeleteDesignAction : deleteDesignAction
            }
          >
            <input type="hidden" name="projectId" value={project.id} />
            <AlertDialogFooter>
              <AlertDialogCancel>{copy.cancel}</AlertDialogCancel>
              <AlertDialogAction type="submit">
                {isTrashed ? copy.deletePermanently : copy.moveToTrash}
              </AlertDialogAction>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function ApprovalStatusMenuItem({
  subject,
  fieldName,
  subjectId,
  status,
  updateApprovalStatusAction,
}: {
  subject: string;
  fieldName: string;
  subjectId: string;
  status: ApprovalStatus;
  updateApprovalStatusAction: ServerAction;
}) {
  return (
    <form action={updateApprovalStatusAction}>
      <input type="hidden" name="subject" value={subject} />
      <input type="hidden" name={fieldName} value={subjectId} />
      <input type="hidden" name="approvalStatus" value={status} />
      <DropdownMenuItem asChild>
        <button type="submit" className="w-full">
          {approvalStatusLabels[status]}
        </button>
      </DropdownMenuItem>
    </form>
  );
}

function MoveProjectMenuItem({
  projectId,
  folderId,
  label,
}: {
  projectId: string;
  folderId: string;
  label: string;
}) {
  return (
    <form action={moveDesignToFolderAction}>
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="folderId" value={folderId} />
      <DropdownMenuItem asChild>
        <button type="submit" className="w-full">
          {label}
        </button>
      </DropdownMenuItem>
    </form>
  );
}

function getProjectPreset(
  project: ProjectSummary,
  copy: ProjectLibraryCopy,
): DesignPreset {
  return (
    designPresets.find(
      (preset) =>
        preset.width === project.width && preset.height === project.height,
    ) ?? {
      id: "custom",
      name: copy.customSize,
      description: copy.customSize,
      width: project.width,
      height: project.height,
    }
  );
}

function isWithinDateFilter(date: string, filter: Exclude<DateFilter, "all">) {
  const updatedAt = new Date(date).getTime();
  const now = new Date();

  if (filter === "today") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return updatedAt >= start.getTime();
  }

  const days = filter === "week" ? 7 : 30;
  const threshold = now.getTime() - days * 24 * 60 * 60 * 1000;

  return updatedAt >= threshold;
}

function isWithinFolderFilter(folderId: string | null, filter: FolderFilter) {
  if (filter === "all") return true;
  if (filter === "unfiled") return !folderId;

  return folderId === filter.replace("folder:", "");
}
