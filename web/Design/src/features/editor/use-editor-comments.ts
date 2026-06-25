"use client";

import { useCallback, useMemo, useState } from "react";

import type {
  CommentReactionKind,
  ProjectCommentSummary,
} from "@/features/editor/types";

export type CommentState = "idle" | "saving" | "error";

type CreateCommentInput = {
  body: string;
  pageId: string;
  elementId: string | null;
  taskStatus?: ProjectCommentSummary["taskStatus"];
  taskAssigneeName?: string | null;
  taskDueAt?: string | null;
};

type UseEditorCommentsInput = {
  projectId: string;
  initialComments: ProjectCommentSummary[];
  sharedEditShareId: string | null;
};

export function useEditorComments({
  projectId,
  initialComments,
  sharedEditShareId,
}: UseEditorCommentsInput) {
  const [comments, setComments] = useState(initialComments);
  const [commentState, setCommentState] = useState<CommentState>("idle");
  const openCommentCount = useMemo(
    () => comments.filter((comment) => !comment.resolved).length,
    [comments],
  );

  const createComment = useCallback(
    async (input: CreateCommentInput) => {
      setCommentState("saving");

      const response = await fetch(`/api/projects/${projectId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...input,
          ...(sharedEditShareId ? { editShareId: sharedEditShareId } : {}),
        }),
      });

      if (!response.ok) {
        setCommentState("error");
        return false;
      }

      const body = (await response.json()) as {
        comment: ProjectCommentSummary;
      };

      setComments((current) => [body.comment, ...current]);
      setCommentState("idle");
      return true;
    },
    [projectId, sharedEditShareId],
  );

  const resolveComment = useCallback(
    async (commentId: string) => {
      const response = await fetch(
        `/api/projects/${projectId}/comments/${commentId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            resolved: true,
            ...(sharedEditShareId ? { editShareId: sharedEditShareId } : {}),
          }),
        },
      );

      if (!response.ok) {
        setCommentState("error");
        return;
      }

      const body = (await response.json()) as {
        comment: ProjectCommentSummary;
      };

      setComments((current) =>
        current.map((comment) =>
          comment.id === body.comment.id ? body.comment : comment,
        ),
      );
      setCommentState("idle");
    },
    [projectId, sharedEditShareId],
  );

  const toggleCommentReaction = useCallback(
    async (commentId: string, reaction: CommentReactionKind) => {
      const response = await fetch(
        `/api/projects/${projectId}/comments/${commentId}/reactions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reaction,
            ...(sharedEditShareId ? { editShareId: sharedEditShareId } : {}),
          }),
        },
      );

      if (!response.ok) {
        setCommentState("error");
        return;
      }

      const body = (await response.json()) as {
        comments: ProjectCommentSummary[];
      };

      setComments(body.comments);
      setCommentState("idle");
    },
    [projectId, sharedEditShareId],
  );

  return {
    comments,
    commentState,
    openCommentCount,
    createComment,
    resolveComment,
    toggleCommentReaction,
  };
}
