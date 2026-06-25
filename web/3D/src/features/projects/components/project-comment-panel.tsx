"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Loader2, MessageSquare, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useEditorStore } from "@/features/editor/store/editor-store";
import { useProjectCommentStore } from "../comment-store";
import { createProjectComment, deleteProjectComment, updateProjectComment } from "../project-api";
import type { ProjectCommentSummary } from "../types";

interface ProjectCommentPanelProps {
  projectId: string | null;
}

function formatCommentDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(new Date(value));
}

export function ProjectCommentPanel({ projectId }: ProjectCommentPanelProps) {
  const [body, setBody] = useState("");
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const comments = useProjectCommentStore((state) => state.comments);
  const selectedCommentId = useProjectCommentStore((state) => state.selectedCommentId);
  const removeComment = useProjectCommentStore((state) => state.removeComment);
  const selectComment = useProjectCommentStore((state) => state.selectComment);
  const upsertComment = useProjectCommentStore((state) => state.upsertComment);
  const selectedObjectId = useEditorStore((state) => state.selectedObjectId);
  const selectedObject = useEditorStore((state) => state.document.objects.find((object) => object.id === selectedObjectId));
  const sortedComments = useMemo(() => [...comments].sort((a, b) => Number(Boolean(a.resolvedAt)) - Number(Boolean(b.resolvedAt))), [comments]);

  async function handleCreateComment() {
    const trimmedBody = body.trim();

    if (!projectId || !trimmedBody) {
      return;
    }

    setPendingAction("create");

    try {
      const response = await createProjectComment(projectId, {
        body: trimmedBody,
        objectId: selectedObject?.id ?? null,
        position: selectedObject?.transform.position ?? [0, 1, 0],
      });
      upsertComment(response.comment);
      selectComment(response.comment.id);
      setBody("");
      toast.success("Comment pinned");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Comment failed");
    } finally {
      setPendingAction(null);
    }
  }

  async function handleToggleResolved(comment: ProjectCommentSummary) {
    if (!projectId) {
      return;
    }

    setPendingAction(`resolve:${comment.id}`);

    try {
      const response = await updateProjectComment(projectId, comment.id, { resolved: !comment.resolvedAt });
      upsertComment(response.comment);
      toast.success(response.comment.resolvedAt ? "Comment resolved" : "Comment reopened");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Comment update failed");
    } finally {
      setPendingAction(null);
    }
  }

  async function handleDeleteComment(comment: ProjectCommentSummary) {
    if (!projectId) {
      return;
    }

    setPendingAction(`delete:${comment.id}`);

    try {
      await deleteProjectComment(projectId, comment.id);
      removeComment(comment.id);
      toast.success("Comment deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Comment delete failed");
    } finally {
      setPendingAction(null);
    }
  }

  if (!projectId) {
    return null;
  }

  return (
    <section className="space-y-3 rounded-md border border-border bg-card p-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <MessageSquare className="size-4" />
        Feedback pins
      </div>
      <div className="space-y-2">
        <Textarea
          value={body}
          placeholder={selectedObject ? `Comment on ${selectedObject.name}` : "Comment on the scene"}
          onChange={(event) => setBody(event.target.value)}
        />
        <Button className="w-full gap-2" disabled={pendingAction === "create" || !body.trim()} size="sm" onClick={() => void handleCreateComment()}>
          {pendingAction === "create" ? <Loader2 className="size-4 animate-spin" /> : <MessageSquare className="size-4" />}
          Add pin
        </Button>
      </div>

      {sortedComments.length === 0 ? <p className="text-xs text-muted-foreground">Comments will appear here and as pins in the viewport.</p> : null}

      {sortedComments.length > 0 ? (
        <div className="space-y-2">
          {sortedComments.map((comment) => {
            const selected = selectedCommentId === comment.id;
            const resolving = pendingAction === `resolve:${comment.id}`;
            const deleting = pendingAction === `delete:${comment.id}`;

            return (
              <div key={comment.id} className={selected ? "rounded-md border border-primary/60 p-2" : "rounded-md border border-border p-2"}>
                <Button className="block h-auto w-full justify-start p-0 text-left" type="button" variant="ghost" onClick={() => selectComment(selected ? null : comment.id)}>
                  <p className={comment.resolvedAt ? "line-clamp-3 text-xs text-muted-foreground line-through" : "line-clamp-3 text-xs text-foreground"}>{comment.body}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{formatCommentDate(comment.createdAt)}</p>
                </Button>
                <div className="mt-2 flex justify-end gap-1">
                  <Button className="size-8" disabled={resolving} size="icon" variant="ghost" onClick={() => void handleToggleResolved(comment)}>
                    {resolving ? <Loader2 className="size-4 animate-spin" /> : comment.resolvedAt ? <RotateCcw className="size-4" /> : <CheckCircle2 className="size-4" />}
                  </Button>
                  <Button className="size-8" disabled={deleting} size="icon" variant="ghost" onClick={() => void handleDeleteComment(comment)}>
                    {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
