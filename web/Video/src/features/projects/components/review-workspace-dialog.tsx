"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Circle, Copy, Folder, History, Link2, MessageSquare, ShieldCheck, Trash2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useEditorStore } from "@/features/editor/state/editor-store";
import { CloudWorkspaceAccessPanel } from "@/features/projects/components/cloud-workspace-access-panel";
import { HostedReviewLinksPanel } from "@/features/projects/components/hosted-review-links-panel";
import { WorkspaceAccessPanel } from "@/features/projects/components/workspace-access-panel";
import { formatTime } from "@/lib/editor/factory";
import { projectCommentAnchorLabel } from "@/lib/projects/comment-anchors";
import {
  addProjectComment,
  addWorkspaceMember,
  assignProjectFolder,
  createProjectFolder,
  getOrCreateShareLink,
  getProjectFolderAssignment,
  listProjectComments,
  listProjectFolders,
  listWorkspaceMembers,
  removeWorkspaceMember,
  setProjectCommentResolved,
  updateProjectFolderVisibility,
  type ProjectComment,
  type ProjectFolder,
  type ProjectFolderAssignment,
  type ProjectFolderAssignmentAccess,
  type ProjectFolderVisibility,
  type ProjectShareLink,
  type WorkspaceMember,
} from "@/lib/projects/collaboration-store";
import {
  createWorkspacePermissionSet,
  workspaceRoleDescriptions,
  workspaceRoleLabels,
  type WorkspaceRole,
} from "@/lib/projects/workspace-permissions";

type ReviewWorkspaceMessage = {
  tone: "default" | "destructive";
  text: string;
};

type CommentAnchorMode = "time" | "range" | "canvas";

export function ReviewWorkspaceDialog() {
  const project = useEditorStore((state) => state.project);
  const currentTime = useEditorStore((state) => state.currentTime);
  const selectedLayerId = useEditorStore((state) => state.selectedLayerId);
  const exportJobs = useEditorStore((state) => state.exportJobs);
  const projectExports = useMemo(() => exportJobs.filter((job) => job.projectId === project.id), [exportJobs, project.id]);
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<ProjectComment[]>([]);
  const [folders, setFolders] = useState<ProjectFolder[]>([]);
  const [folderAssignment, setFolderAssignment] = useState<ProjectFolderAssignment | null>(null);
  const [shareLink, setShareLink] = useState<ProjectShareLink | null>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [commentBody, setCommentBody] = useState("");
  const [commentAnchorMode, setCommentAnchorMode] = useState<CommentAnchorMode>("time");
  const [commentRangeSeconds, setCommentRangeSeconds] = useState(3);
  const [commentCanvasX, setCommentCanvasX] = useState(50);
  const [commentCanvasY, setCommentCanvasY] = useState(50);
  const [folderName, setFolderName] = useState("");
  const [folderVisibility, setFolderVisibility] = useState<ProjectFolderVisibility>("workspace");
  const [folderAccess, setFolderAccess] = useState<ProjectFolderAssignmentAccess>("inherited");
  const [memberName, setMemberName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState<WorkspaceMember["role"]>("editor");
  const [activeRole, setActiveRole] = useState<WorkspaceRole>("owner");
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [reviewMessage, setReviewMessage] = useState<ReviewWorkspaceMessage | null>(null);
  const [isReviewActionPending, setIsReviewActionPending] = useState(false);
  const permissions = useMemo(() => createWorkspacePermissionSet(activeRole), [activeRole]);

  async function refresh() {
    const [nextComments, nextFolders, nextAssignment, nextMembers] = await Promise.all([
      listProjectComments(project.id),
      listProjectFolders(),
      getProjectFolderAssignment(project.id),
      listWorkspaceMembers(),
    ]);
    setComments(nextComments);
    setFolders(nextFolders);
    setFolderAssignment(nextAssignment ?? null);
    setFolderAccess(nextAssignment?.access ?? "inherited");
    setMembers(nextMembers);
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      void refresh().catch(() => {
        setReviewMessage({ tone: "destructive", text: "Review workspace could not be loaded." });
      });
    }
  }

  async function submitComment() {
    await runReviewAction(async () => {
      await addProjectComment({
        projectId: project.id,
        body: commentBody,
        time: currentTime,
        timeEnd: commentAnchorMode === "range" ? currentTime + commentRangeSeconds : undefined,
        layerId: selectedLayerId ?? undefined,
        canvasX: commentAnchorMode === "canvas" ? commentCanvasX : undefined,
        canvasY: commentAnchorMode === "canvas" ? commentCanvasY : undefined,
        actorRole: activeRole,
      });
      setCommentBody("");
      setComments(await listProjectComments(project.id));
    }, "Comment could not be saved.");
  }

  async function toggleResolved(comment: ProjectComment) {
    await runReviewAction(async () => {
      await setProjectCommentResolved(comment.id, !comment.resolvedAt, activeRole);
      setComments(await listProjectComments(project.id));
    }, "Comment status could not be updated.");
  }

  async function submitFolder() {
    await runReviewAction(async () => {
      const folder = await createProjectFolder(folderName, activeRole, { visibility: folderVisibility });
      setFolderName("");
      if (folder) {
        await assignProjectFolder(project.id, folder.id, activeRole, { access: folderAccess });
      }
      await refresh();
    }, "Folder could not be created.");
  }

  async function updateFolder(folderId: string) {
    await runReviewAction(async () => {
      await assignProjectFolder(project.id, folderId === "none" ? null : folderId, activeRole, { access: folderAccess });
      await refresh();
    }, "Project folder could not be updated.");
  }

  async function updateFolderAccess(access: ProjectFolderAssignmentAccess) {
    setFolderAccess(access);
    if (!folderAssignment) return;
    await runReviewAction(async () => {
      await assignProjectFolder(project.id, folderAssignment.folderId, activeRole, { access });
      await refresh();
    }, "Project folder access could not be updated.");
  }

  async function updateFolderVisibility(folderId: string, visibility: ProjectFolderVisibility) {
    await runReviewAction(async () => {
      await updateProjectFolderVisibility(folderId, visibility, activeRole);
      await refresh();
    }, "Folder privacy could not be updated.");
  }

  async function copyShareLink() {
    await runReviewAction(async () => {
      const link = await getOrCreateShareLink(project.id, window.location.origin, activeRole);
      setShareLink(link);

      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(link.url);
          setShareMessage("Review link copied.");
          return;
        }
      } catch {
        setShareMessage("Review link created. Copy it from the field above.");
        return;
      }

      setShareMessage("Review link created. Copy it from the field above.");
    }, "Review link could not be created.");
  }

  async function submitMember() {
    await runReviewAction(async () => {
      const member = await addWorkspaceMember({ name: memberName, email: memberEmail, role: memberRole, actorRole: activeRole });
      if (!member) {
        setReviewMessage({ tone: "destructive", text: "Enter a valid workspace member name and email." });
        return;
      }

      setMemberName("");
      setMemberEmail("");
      setMembers(await listWorkspaceMembers());
    }, "Workspace member could not be added.");
  }

  async function removeMember(memberId: string) {
    await runReviewAction(async () => {
      await removeWorkspaceMember(memberId, activeRole);
      setMembers(await listWorkspaceMembers());
    }, "Workspace member could not be removed.");
  }

  async function runReviewAction(action: () => Promise<void>, failureMessage: string) {
    setIsReviewActionPending(true);
    setReviewMessage(null);

    try {
      await action();
    } catch {
      setReviewMessage({ tone: "destructive", text: failureMessage });
    } finally {
      setIsReviewActionPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="icon" variant="outline" aria-label="Review workspace">
          <Users className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Review workspace</DialogTitle>
          <DialogDescription>{project.title}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 rounded-md border border-border p-3 sm:grid-cols-[1fr_180px] sm:items-center">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-medium">
              <ShieldCheck className="size-4" />
              Active access
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{workspaceRoleDescriptions[activeRole]}</p>
          </div>
          <Select value={activeRole} onValueChange={(value) => setActiveRole(value as WorkspaceRole)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(["owner", "editor", "viewer"] as WorkspaceRole[]).map((role) => (
                <SelectItem key={role} value={role}>
                  {workspaceRoleLabels[role]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {reviewMessage ? (
          <div
            className={`rounded-md border p-2 text-sm ${
              reviewMessage.tone === "destructive"
                ? "border-destructive/40 text-destructive"
                : "border-border text-muted-foreground"
            }`}
          >
            {reviewMessage.text}
          </div>
        ) : null}
        <Tabs defaultValue="comments">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="comments">
              <MessageSquare className="size-3.5" />
            </TabsTrigger>
            <TabsTrigger value="folder">
              <Folder className="size-3.5" />
            </TabsTrigger>
            <TabsTrigger value="share">
              <Link2 className="size-3.5" />
            </TabsTrigger>
            <TabsTrigger value="activity">
              <History className="size-3.5" />
            </TabsTrigger>
          </TabsList>

          <TabsContent value="comments" className="mt-3 space-y-3">
            <Textarea
              className="min-h-20 resize-none"
              value={commentBody}
              onChange={(event) => setCommentBody(event.target.value)}
              placeholder="Leave a timestamped review note"
            />
            <div className="grid gap-2 rounded-md border border-border p-2 sm:grid-cols-[150px_1fr_auto] sm:items-end">
              <label className="space-y-1 text-xs text-muted-foreground">
                Anchor
                <Select value={commentAnchorMode} onValueChange={(value) => setCommentAnchorMode(value as CommentAnchorMode)}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="time">Playhead</SelectItem>
                    <SelectItem value="range">Time range</SelectItem>
                    <SelectItem value="canvas">Canvas point</SelectItem>
                  </SelectContent>
                </Select>
              </label>
              <CommentAnchorControls
                mode={commentAnchorMode}
                currentTime={currentTime}
                rangeSeconds={commentRangeSeconds}
                canvasX={commentCanvasX}
                canvasY={commentCanvasY}
                onRangeSecondsChange={setCommentRangeSeconds}
                onCanvasXChange={setCommentCanvasX}
                onCanvasYChange={setCommentCanvasY}
              />
              <Button size="sm" onClick={submitComment} disabled={!commentBody.trim() || !permissions.canCreateComment || isReviewActionPending}>
                Add comment
              </Button>
            </div>
            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {comments.length ? (
                comments.map((comment) => (
                  <div key={comment.id} className="rounded-md border border-border p-3 text-sm">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={comment.resolvedAt ? "secondary" : "default"}>
                          {comment.resolvedAt ? "Resolved" : "Open"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{projectCommentAnchorLabel(comment)}</span>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7"
                        onClick={() => toggleResolved(comment)}
                        disabled={!permissions.canResolveComment || isReviewActionPending}
                      >
                        {comment.resolvedAt ? <CheckCircle2 className="size-4" /> : <Circle className="size-4" />}
                      </Button>
                    </div>
                    <p className="whitespace-pre-wrap">{comment.body}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">No comments yet.</div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="folder" className="mt-3 space-y-3">
            <div className="grid gap-2 sm:grid-cols-[1fr_150px_auto]">
              <Input value={folderName} onChange={(event) => setFolderName(event.target.value)} placeholder="New folder name" disabled={!permissions.canManageFolders} />
              <Select
                value={folderVisibility}
                onValueChange={(value) => setFolderVisibility(value as ProjectFolderVisibility)}
                disabled={!permissions.canManageFolders || isReviewActionPending}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="workspace">Workspace</SelectItem>
                  <SelectItem value="private" disabled={!permissions.canManagePrivateFolders}>
                    Private
                  </SelectItem>
                </SelectContent>
              </Select>
              <Button
                size="sm"
                onClick={submitFolder}
                disabled={
                  !folderName.trim() ||
                  !permissions.canManageFolders ||
                  (folderVisibility === "private" && !permissions.canManagePrivateFolders) ||
                  isReviewActionPending
                }
              >
                Create
              </Button>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Project folder</Label>
              <Select value={folderAssignment?.folderId ?? "none"} onValueChange={updateFolder} disabled={!permissions.canManageFolders || isReviewActionPending}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No folder</SelectItem>
                  {folders.map((folder) => (
                    <SelectItem key={folder.id} value={folder.id}>
                      {folder.name} {folder.visibility === "private" ? "(private)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Project folder access</Label>
              <Select
                value={folderAccess}
                onValueChange={(value) => updateFolderAccess(value as ProjectFolderAssignmentAccess)}
                disabled={!folderAssignment || !permissions.canManageProjectPermissions || isReviewActionPending}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inherited">Inherit workspace role</SelectItem>
                  <SelectItem value="shared">Shared with reviewers</SelectItem>
                  <SelectItem value="private">Private project folder</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Folder privacy</Label>
              {folders.length ? (
                <div className="max-h-44 space-y-1 overflow-y-auto pr-1">
                  {folders.map((folder) => (
                    <div key={folder.id} className="flex items-center justify-between gap-2 rounded-md border border-border px-2 py-1.5 text-sm">
                      <div className="min-w-0">
                        <div className="truncate font-medium">{folder.name}</div>
                        <div className="text-xs text-muted-foreground">{folder.visibility === "private" ? "Private folder" : "Workspace folder"}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={folder.visibility === "private" ? "default" : "outline"}>{folder.visibility}</Badge>
                        <Select
                          value={folder.visibility}
                          onValueChange={(value) => updateFolderVisibility(folder.id, value as ProjectFolderVisibility)}
                          disabled={!permissions.canManageFolders || isReviewActionPending}
                        >
                          <SelectTrigger className="h-8 w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="workspace">Workspace</SelectItem>
                            <SelectItem value="private" disabled={!permissions.canManagePrivateFolders}>
                              Private
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">No folders yet.</div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="share" className="mt-3 space-y-3">
            <div className="rounded-md border border-border p-3 text-sm">
              <div className="mb-2 font-medium">Local review link</div>
              <p className="break-all text-muted-foreground">{shareLink?.url ?? "Create a link for this browser profile."}</p>
            </div>
            <Button size="sm" onClick={copyShareLink} disabled={!permissions.canManageShareLinks || isReviewActionPending}>
              <Copy className="size-4" />
              Copy review link
            </Button>
            {shareMessage ? <div className="text-sm text-muted-foreground">{shareMessage}</div> : null}
            <HostedReviewLinksPanel
              projectId={project.id}
              exportName={latestCompletedExportName(projectExports)}
              canManage={permissions.canManageShareLinks}
              disabled={isReviewActionPending}
            />
          </TabsContent>

          <TabsContent value="activity" className="mt-3 space-y-4">
            <section className="space-y-2">
              <div className="font-medium">Workspace members</div>
              <div className="grid grid-cols-[1fr_1fr_110px_auto] gap-2">
                <Input value={memberName} onChange={(event) => setMemberName(event.target.value)} placeholder="Name" disabled={!permissions.canManageMembers} />
                <Input value={memberEmail} onChange={(event) => setMemberEmail(event.target.value)} placeholder="Email" disabled={!permissions.canManageMembers} />
                <Select value={memberRole} onValueChange={(value) => setMemberRole(value as WorkspaceMember["role"])} disabled={!permissions.canManageMembers}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owner">Owner</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  onClick={submitMember}
                  disabled={!memberName.trim() || !memberEmail.trim() || !permissions.canManageMembers || isReviewActionPending}
                >
                  Add
                </Button>
              </div>
              <div className="space-y-1">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between gap-2 rounded-md border border-border px-2 py-1.5 text-sm">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{member.name}</div>
                      <div className="truncate text-xs text-muted-foreground">{member.email}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline">{member.role}</Badge>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7"
                        onClick={() => removeMember(member.id)}
                        disabled={!permissions.canManageMembers || isReviewActionPending}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
            <Separator />
            <WorkspaceAccessPanel projectId={project.id} activeRole={activeRole} permissions={permissions} />
            <Separator />
            <CloudWorkspaceAccessPanel projectId={project.id} disabled={isReviewActionPending} />
            <Separator />
            <section className="space-y-2">
              <div className="font-medium">Export history</div>
              {!permissions.canViewExportHistory ? (
                <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">Export history is hidden for this access level.</div>
              ) : projectExports.length ? (
                <div className="max-h-40 space-y-1 overflow-y-auto pr-1">
                  {projectExports.map((job) => (
                    <div key={job.id} className="flex items-center justify-between gap-3 rounded-md border border-border px-2 py-1.5 text-sm">
                      <span className="truncate">{job.outputName}</span>
                      <div className="flex shrink-0 items-center gap-2">
                        {job.exportQaSnapshot ? (
                          <Badge variant={job.exportQaSnapshot.status === "blocked" ? "destructive" : job.exportQaSnapshot.status === "review" ? "secondary" : "outline"}>
                            Export QA {job.exportQaSnapshot.status}
                          </Badge>
                        ) : null}
                        {job.reviewSnapshot ? (
                          <Badge variant={job.reviewSnapshot.status === "blocked" ? "destructive" : "outline"}>
                            QA {job.reviewSnapshot.status}
                          </Badge>
                        ) : null}
                        {job.mediaAttributionSummary ? (
                          <Badge variant={job.mediaAttributionSummary.status === "review" ? "secondary" : "outline"}>{job.mediaAttributionSummary.itemCount} media rights</Badge>
                        ) : null}
                        <Badge variant={job.status === "complete" ? "default" : "secondary"}>{job.status}</Badge>
                        <span className="text-xs text-muted-foreground">{job.progress}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">No exports queued yet.</div>
              )}
            </section>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function CommentAnchorControls({
  mode,
  currentTime,
  rangeSeconds,
  canvasX,
  canvasY,
  onRangeSecondsChange,
  onCanvasXChange,
  onCanvasYChange,
}: {
  mode: CommentAnchorMode;
  currentTime: number;
  rangeSeconds: number;
  canvasX: number;
  canvasY: number;
  onRangeSecondsChange: (value: number) => void;
  onCanvasXChange: (value: number) => void;
  onCanvasYChange: (value: number) => void;
}) {
  if (mode === "range") {
    return (
      <div className="grid grid-cols-[1fr_92px] items-end gap-2">
        <div className="text-xs text-muted-foreground">
          {formatTime(currentTime)} - {formatTime(currentTime + rangeSeconds)}
        </div>
        <NumberField label="Seconds" value={rangeSeconds} min={0.25} max={60} step={0.25} onChange={onRangeSecondsChange} />
      </div>
    );
  }

  if (mode === "canvas") {
    return (
      <div className="grid grid-cols-2 gap-2">
        <NumberField label="Canvas X %" value={canvasX} min={0} max={100} step={1} onChange={onCanvasXChange} />
        <NumberField label="Canvas Y %" value={canvasY} min={0} max={100} step={1} onChange={onCanvasYChange} />
      </div>
    );
  }

  return <div className="text-xs text-muted-foreground">Anchored at {formatTime(currentTime)} on the selected layer when one is active.</div>;
}

function NumberField({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  function handleChange(rawValue: string) {
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed)) return;
    onChange(Math.min(max, Math.max(min, parsed)));
  }

  return (
    <label className="space-y-1 text-xs text-muted-foreground">
      {label}
      <Input className="h-8 font-mono text-xs" type="number" min={min} max={max} step={step} value={value} onChange={(event) => handleChange(event.target.value)} />
    </label>
  );
}

function latestCompletedExportName(projectExports: Array<{ status: string; outputName: string; updatedAt: string }>) {
  return [...projectExports]
    .filter((job) => job.status === "complete")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]?.outputName;
}
