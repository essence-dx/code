"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Cloud, CloudOff, Copy, FolderOpen, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { IconButton } from "@/features/editor/components/icon-button";
import {
  applySceneCollaborationOperations,
  createSceneCollaborationOperations,
  evaluateSceneCollaborationOperationConflicts,
  normalizeSceneCollaborationOperations,
  summarizeSceneCollaborationOperations,
} from "@/features/editor/scene/scene-collaboration-operations";
import type { SceneCollaborationOperation } from "@/features/editor/scene/scene-collaboration-operations";
import { mergeSceneDocumentsByObject, summarizeSceneDocumentMergeConflicts } from "@/features/editor/scene/scene-document-merge";
import { summarizeCloudProjectSyncStatus, summarizeSceneSaveStatus } from "@/features/editor/scene/scene-save-status";
import { useEditorStore } from "@/features/editor/store/editor-store";
import { publishProjectCollaborationBroadcast } from "../collaboration-broadcast";
import { createCollaborationClientBatchId } from "../collaboration-batch-id";
import { sortProjectCollaborationOperationBatchesForConvergence } from "../collaboration-batch-convergence";
import {
  createCollaborationCausalId,
  reserveNextCollaborationClientSequence,
  synchronizeCollaborationClientSequence,
} from "../collaboration-causal-clock";
import {
  archiveProject,
  createProject,
  duplicateProject,
  getProject,
  getProjectCollaborationClientSequenceRecovery,
  getProjectConflictPayload,
  listProjects,
  updateProject,
} from "../project-api";
import { publishProjectCollaborationOperationBatch } from "../collaboration-operation-publisher";
import { getProjectCollaborationSceneId, resolveProjectCollaborationSceneBaseline } from "../collaboration-scene-scope";
import { ProjectCollaborationActivity } from "./project-collaboration-activity";
import { ProjectCommentPanel } from "./project-comment-panel";
import { ProjectVersionHistory } from "./project-version-history";
import type { ProjectCollaborationOperationBatchSummary } from "../collaboration-types";
import type { ProjectSummary } from "../types";
import {
  type ProjectCollaborationOperationPublisher,
  useLiveCollaborationPublish,
} from "../use-live-collaboration-publish";

type LoadState = "idle" | "loading" | "ready" | "unauthorized" | "error";
const collaborationClientStorageKey = "essence-spline-collaboration-client-id";

function formatSavedAt(value: string | null) {
  if (!value) {
    return "Not saved";
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function createClientId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `client-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function resolveCollaborationClientId() {
  if (typeof window === "undefined") {
    return createClientId();
  }

  const existing = window.localStorage.getItem(collaborationClientStorageKey);

  if (existing) {
    return existing;
  }

  const next = createClientId();
  window.localStorage.setItem(collaborationClientStorageKey, next);

  return next;
}

export function ProjectCloudPanel() {
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState("");
  const [appliedRemoteOperations, setAppliedRemoteOperations] = useState<SceneCollaborationOperation[]>([]);
  const document = useEditorStore((state) => state.document);
  const activeProjectId = useEditorStore((state) => state.activeProjectId);
  const lastSavedAt = useEditorStore((state) => state.lastSavedAt);
  const lastSavedDocument = useEditorStore((state) => state.lastSavedDocument);
  const loadProject = useEditorStore((state) => state.loadProject);
  const markProjectSaved = useEditorStore((state) => state.markProjectSaved);
  const detachProject = useEditorStore((state) => state.detachProject);
  const replaceDocument = useEditorStore((state) => state.replaceDocument);
  const collaborationClientId = useMemo(resolveCollaborationClientId, []);
  const collaborationSceneId = getProjectCollaborationSceneId(document);

  const activeProject = useMemo(() => projects.find((project) => project.id === activeProjectId) ?? null, [activeProjectId, projects]);
  const saveStatus = useMemo(() => summarizeSceneSaveStatus(document, lastSavedDocument), [document, lastSavedDocument]);
  const cloudSyncStatus = useMemo(() => summarizeCloudProjectSyncStatus(lastSavedAt, activeProject?.updatedAt), [activeProject?.updatedAt, lastSavedAt]);
  const remoteCollaborationBaselineDocument = useMemo(
    () => {
      const sceneBaseline = resolveProjectCollaborationSceneBaseline(lastSavedDocument, document);

      return sceneBaseline ? applySceneCollaborationOperations(sceneBaseline, appliedRemoteOperations) : null;
    },
    [appliedRemoteOperations, document, lastSavedDocument],
  );

  async function refreshProjects() {
    setLoadState("loading");

    try {
      const response = await listProjects();
      setProjects(response.projects);
      setLoadState("ready");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load projects";

      if (message === "Unauthorized") {
        setLoadState("unauthorized");
      } else {
        setLoadState("error");
        toast.error(message);
      }
    }
  }

  useEffect(() => {
    if (open) {
      void refreshProjects();
    }
  }, [open]);

  useEffect(() => {
    setAppliedRemoteOperations([]);
  }, [activeProjectId, collaborationSceneId, lastSavedAt]);

  const publishCollaborationOperationBatch = useCallback<ProjectCollaborationOperationPublisher>(async (
    projectId: string,
    operations: SceneCollaborationOperation[],
    baseUpdatedAt: string | null,
    purpose,
  ) => {
    if (operations.length === 0) {
      return { ok: true };
    }

    let recoveredClientClock = false;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const clientSequence = reserveNextCollaborationClientSequence(projectId, collaborationClientId);
        const causalId = createCollaborationCausalId({
          clientId: collaborationClientId,
          clientSequence,
          projectId,
        });
        const batchId = await createCollaborationClientBatchId({
          baseUpdatedAt,
          causalId,
          clientId: collaborationClientId,
          clientSequence,
          operations,
          projectId,
        });

        const publishResult = await publishProjectCollaborationOperationBatch(projectId, {
          baseUpdatedAt,
          batchId,
          causalId,
          clientId: collaborationClientId,
          clientSequence,
          operations,
        });
        publishProjectCollaborationBroadcast({
          batchCount: 1,
          clientId: collaborationClientId,
          createdAt: new Date().toISOString(),
          kind: "operation-batches-created",
          operationCount: operations.length,
          projectId,
        });

        if (recoveredClientClock) {
          toast.info("Collaboration sync recovered", {
            description:
              purpose === "live"
                ? "The local causal clock was realigned before publishing live edits."
                : "The local causal clock was realigned before publishing this save.",
          });
        }

        return {
          fallbackReason: publishResult.fallbackReason,
          ok: true,
          transport: publishResult.transport,
        };
      } catch (error) {
        const sequenceRecovery = getProjectCollaborationClientSequenceRecovery(error);

        if (!sequenceRecovery || sequenceRecovery.clientId !== collaborationClientId || attempt > 0) {
          const message = error instanceof Error ? error.message : purpose === "live" ? "Edits remain local until retry or save." : "The scene is saved; collaborators may need to refresh.";

          toast.error(purpose === "live" ? "Live collaboration sync failed" : "Project saved, but collaboration sync log failed", {
            description: message,
            duration: 7000,
          });

          return { errorMessage: message, ok: false };
        }

        synchronizeCollaborationClientSequence(projectId, collaborationClientId, sequenceRecovery.latestSequence);
        recoveredClientClock = true;
      }
    }

    return { errorMessage: "Collaboration sync did not complete.", ok: false };
  }, [collaborationClientId]);

  const {
    baselineDocument: collaborationBaselineDocument,
    operations: collaborationOperations,
    prepareSavePublish,
    summary: livePublishSummary,
  } = useLiveCollaborationPublish({
    baseDocument: remoteCollaborationBaselineDocument,
    baseUpdatedAt: lastSavedAt,
    currentDocument: document,
    pause: pendingAction === "save",
    projectId: activeProjectId,
    publishOperations: publishCollaborationOperationBatch,
    scopeId: collaborationSceneId,
  });
  const collaborationSummary = useMemo(() => summarizeSceneCollaborationOperations(collaborationOperations), [collaborationOperations]);

  function handleApplyRemoteBatches(batches: ProjectCollaborationOperationBatchSummary[], plannedOperations: SceneCollaborationOperation[]) {
    if (batches.length === 0) {
      return false;
    }

    const operations = normalizeSceneCollaborationOperations(
      plannedOperations.length ? plannedOperations : sortProjectCollaborationOperationBatchesForConvergence(batches).flatMap((batch) => batch.operations),
    );

    if (operations.length === 0) {
      return false;
    }

    try {
      const conflicts = evaluateSceneCollaborationOperationConflicts(document, operations);

      replaceDocument(applySceneCollaborationOperations(document, operations));
      if (conflicts.length > 0) {
        toast.warning(`Applied with ${conflicts.length} review ${conflicts.length === 1 ? "item" : "items"}`, {
          description: "Remote operations touched scene data that changed locally. Review before saving.",
          duration: 8000,
        });
      } else {
        toast.success(`Applied ${operations.length} remote sync ${operations.length === 1 ? "operation" : "operations"}`, {
          description: "Review the scene, then save to confirm the merged cloud state.",
        });
      }

      setAppliedRemoteOperations((current) => [...current, ...operations]);

      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Remote collaboration activity could not be applied");
      return false;
    }
  }

  async function handleSaveCurrent() {
    setPendingAction("save");

    let saveCollaborationBaselineDocument = collaborationBaselineDocument;
    let saveCollaborationOperations = collaborationOperations;

    try {
      const baseUpdatedAtForSave = lastSavedAt;
      const preparedSave = await prepareSavePublish();

      saveCollaborationBaselineDocument = preparedSave.baselineDocument;
      saveCollaborationOperations = preparedSave.operations;

      const response = activeProjectId
        ? await updateProject(activeProjectId, { name: document.name, description: activeProject?.description ?? "", expectedUpdatedAt: lastSavedAt, sceneData: document })
        : await createProject({ name: newProjectName.trim() || document.name, sceneData: document });

      if (activeProjectId) {
        await publishCollaborationOperationBatch(activeProjectId, saveCollaborationOperations, baseUpdatedAtForSave, "save");
      }
      markProjectSaved(response.project.id, response.project.updatedAt, response.project.sceneData);
      setNewProjectName("");
      toast.success(activeProjectId ? "Project saved" : "Project created");
      await refreshProjects();
    } catch (error) {
      const conflict = getProjectConflictPayload(error);

      if (activeProjectId && conflict) {
        try {
          const latestProject = conflict.project ?? (await getProject(activeProjectId)).project;
          const baseDocument = saveCollaborationBaselineDocument ?? lastSavedDocument ?? (activeProject?.updatedAt === lastSavedAt ? activeProject.sceneData : null);

          if (!baseDocument) {
            throw new Error("Project changed before a merge baseline was available. Open the latest project, then save again.");
          }

          const mergeResult = mergeSceneDocumentsByObject(baseDocument, document, latestProject.sceneData);
          const mergeOperations = createSceneCollaborationOperations(baseDocument, mergeResult.document);
          const response = await updateProject(activeProjectId, {
            name: mergeResult.document.name,
            description: latestProject.description,
            expectedUpdatedAt: latestProject.updatedAt,
            sceneData: mergeResult.document,
          });

          await publishCollaborationOperationBatch(activeProjectId, mergeOperations, lastSavedAt, "save");
          loadProject(response.project.id, response.project.sceneData, response.project.updatedAt);
          const conflictDescription = summarizeSceneDocumentMergeConflicts(mergeResult.conflicts);
          toast.success(
            mergeResult.conflicts.length > 0
              ? `Saved with ${mergeResult.conflicts.length} object merge ${mergeResult.conflicts.length === 1 ? "conflict" : "conflicts"} resolved`
              : "Saved merged project changes",
            {
              description: conflictDescription ?? `${mergeResult.mergedObjectCount} objects reconciled`,
              duration: mergeResult.conflicts.length > 0 ? 9000 : 4000,
            },
          );
          await refreshProjects();
          return;
        } catch (mergeError) {
          toast.error(mergeError instanceof Error ? mergeError.message : "Project merge failed", {
            duration: 8000,
          });
          return;
        }
      }

      const message = error instanceof Error ? error.message : "Save failed";
      toast.error(message === "Unauthorized" ? "Sign in to save projects" : message, {
        duration: message.includes("changed since you opened it") ? 8000 : 4000,
      });
      if (message === "Unauthorized") {
        setLoadState("unauthorized");
      }
    } finally {
      setPendingAction(null);
    }
  }

  async function handleCreateCopy() {
    setPendingAction("create");

    try {
      const response = await createProject({ name: newProjectName.trim() || document.name, sceneData: document });

      markProjectSaved(response.project.id, response.project.updatedAt, response.project.sceneData);
      setNewProjectName("");
      toast.success("Project copy created");
      await refreshProjects();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Project creation failed";
      toast.error(message === "Unauthorized" ? "Sign in to create projects" : message);
      if (message === "Unauthorized") {
        setLoadState("unauthorized");
      }
    } finally {
      setPendingAction(null);
    }
  }

  function handleOpenProject(project: ProjectSummary) {
    try {
      loadProject(project.id, project.sceneData, project.updatedAt);
      setOpen(false);
      toast.success(`${project.name} opened`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Project could not be opened");
    }
  }

  async function handleArchiveProject(project: ProjectSummary) {
    setPendingAction(`archive:${project.id}`);

    try {
      await archiveProject(project.id);
      if (project.id === activeProjectId) {
        detachProject();
      }
      setProjects((current) => current.filter((entry) => entry.id !== project.id));
      toast.success(`${project.name} moved to trash`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Archive failed");
    } finally {
      setPendingAction(null);
    }
  }

  async function handleDuplicateProject(project: ProjectSummary) {
    setPendingAction(`duplicate:${project.id}`);

    try {
      const response = await duplicateProject(project.id);
      setProjects((current) => [response.project, ...current]);
      toast.success(`${response.project.name} created`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Duplicate failed");
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <>
      <IconButton label="Cloud projects" onClick={() => setOpen(true)} variant={activeProjectId ? "secondary" : "ghost"}>
        {activeProjectId ? <Cloud className="size-4" /> : <CloudOff className="size-4" />}
      </IconButton>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Cloud Projects</SheetTitle>
            <SheetDescription>{activeProjectId ? `Current project saved ${formatSavedAt(lastSavedAt)}` : "Save this scene to your workspace."}</SheetDescription>
          </SheetHeader>

          <div className="space-y-4 px-4">
            <div className="space-y-1 rounded-md border border-border p-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium">Save state</span>
                <Badge className="rounded-md text-[11px]" variant={saveStatus.status === "unsaved" ? "secondary" : saveStatus.status === "saved" ? "default" : "outline"}>
                  {saveStatus.label}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{saveStatus.detail}</p>
              {activeProjectId ? (
                <div className="flex items-start justify-between gap-3 border-t border-border pt-2">
                  <p className="text-xs text-muted-foreground">{cloudSyncStatus.detail}</p>
                  <Badge
                    className="shrink-0 rounded-md text-[11px]"
                    variant={cloudSyncStatus.status === "remote-changed" ? "destructive" : cloudSyncStatus.status === "synced" ? "default" : "outline"}
                  >
                    {cloudSyncStatus.label}
                  </Badge>
                </div>
              ) : null}
              {activeProjectId ? (
                <div className="flex items-start justify-between gap-3 border-t border-border pt-2">
                  <p className="text-xs text-muted-foreground">{collaborationSummary.detail}</p>
                  <Badge className="shrink-0 rounded-md text-[11px]" variant={collaborationSummary.status === "ready" ? "secondary" : "outline"}>
                    {collaborationSummary.label}
                  </Badge>
                </div>
              ) : null}
              {activeProjectId ? (
                <div className="flex items-start justify-between gap-3 border-t border-border pt-2">
                  <p className="text-xs text-muted-foreground">{livePublishSummary.detail}</p>
                  <Badge
                    className="shrink-0 rounded-md text-[11px]"
                    variant={
                      livePublishSummary.status === "error"
                        ? "destructive"
                        : livePublishSummary.status === "pending"
                          ? "secondary"
                          : livePublishSummary.status === "live"
                            ? "default"
                            : "outline"
                    }
                  >
                    {livePublishSummary.label}
                  </Badge>
                </div>
              ) : null}
            </div>

            <ProjectCollaborationActivity
              clientId={collaborationClientId}
              currentDocument={document}
              projectId={activeProjectId}
              sceneId={collaborationSceneId}
              since={lastSavedAt}
              onApplyRemoteBatches={handleApplyRemoteBatches}
            />

            <div className="space-y-2">
              <Label htmlFor="new-project-name">Project name</Label>
              <div className="flex gap-2">
                <Input id="new-project-name" value={newProjectName} placeholder={document.name} onChange={(event) => setNewProjectName(event.target.value)} />
                <Button className="gap-2" disabled={pendingAction === "create"} onClick={() => void handleCreateCopy()}>
                  {pendingAction === "create" ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                  New
                </Button>
              </div>
            </div>

            <Button className="w-full gap-2" disabled={pendingAction === "save"} onClick={() => void handleSaveCurrent()}>
              {pendingAction === "save" ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              {activeProjectId ? "Save current project" : "Save scene as project"}
            </Button>

            <ProjectVersionHistory projectId={activeProjectId} refreshKey={lastSavedAt} />
            <ProjectCommentPanel projectId={activeProjectId} />
          </div>

          <Separator />

          <ScrollArea className="min-h-0 flex-1 px-4">
            {loadState === "loading" ? (
              <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                <Loader2 className="mr-2 size-4 animate-spin" />
                Loading projects
              </div>
            ) : null}

            {loadState === "unauthorized" ? (
              <div className="space-y-3 rounded-md border border-border p-4 text-sm">
                <p className="text-muted-foreground">Sign in with email and password to use cloud projects.</p>
                <Link className={buttonVariants({ className: "w-full" })} href="/sign-in">
                  Sign in
                </Link>
              </div>
            ) : null}

            {loadState === "error" ? (
              <div className="space-y-3 rounded-md border border-border p-4 text-sm">
                <p className="text-muted-foreground">Project loading failed.</p>
                <Button className="w-full" variant="secondary" onClick={() => void refreshProjects()}>
                  Retry
                </Button>
              </div>
            ) : null}

            {loadState === "ready" && projects.length === 0 ? <div className="rounded-md border border-border p-4 text-sm text-muted-foreground">No cloud projects yet.</div> : null}

            {loadState === "ready" && projects.length > 0 ? (
              <div className="space-y-2 pb-4">
                {projects.map((project) => {
                  const active = project.id === activeProjectId;
                  const archiving = pendingAction === `archive:${project.id}`;
                  const duplicating = pendingAction === `duplicate:${project.id}`;

                  return (
                    <div key={project.id} className="rounded-md border border-border bg-card p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="truncate text-sm font-medium">{project.name}</h3>
                            {active ? <Badge className="rounded-md text-[11px]">Open</Badge> : null}
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">{project.sceneData.objects.length} objects - Saved {formatSavedAt(project.updatedAt)}</p>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <Button aria-label={`Open ${project.name}`} className="size-8" size="icon" variant="secondary" onClick={() => handleOpenProject(project)}>
                            <FolderOpen className="size-4" />
                          </Button>
                          <Button aria-label={`Duplicate ${project.name}`} className="size-8" disabled={duplicating} size="icon" variant="ghost" onClick={() => void handleDuplicateProject(project)}>
                            {duplicating ? <Loader2 className="size-4 animate-spin" /> : <Copy className="size-4" />}
                          </Button>
                          <Button aria-label={`Move ${project.name} to trash`} className="size-8" disabled={archiving} size="icon" variant="ghost" onClick={() => void handleArchiveProject(project)}>
                            {archiving ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </ScrollArea>

          <SheetFooter>
            <Button variant="secondary" onClick={() => void refreshProjects()}>
              Refresh
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
