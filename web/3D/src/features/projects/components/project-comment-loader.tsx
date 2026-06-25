"use client";

import { useEffect } from "react";
import { useEditorStore } from "@/features/editor/store/editor-store";
import { useProjectCommentStore } from "../comment-store";
import { listProjectComments } from "../project-api";

export function ProjectCommentLoader() {
  const activeProjectId = useEditorStore((state) => state.activeProjectId);
  const clearComments = useProjectCommentStore((state) => state.clearComments);
  const setComments = useProjectCommentStore((state) => state.setComments);

  useEffect(() => {
    if (!activeProjectId) {
      clearComments();
      return;
    }

    let cancelled = false;
    const projectId = activeProjectId;

    function refreshComments() {
      listProjectComments(projectId)
        .then((response) => {
          if (!cancelled) {
            setComments(response.comments);
          }
        })
        .catch(() => {
          if (!cancelled) {
            clearComments();
          }
        });
    }

    refreshComments();
    const interval = window.setInterval(refreshComments, 8000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [activeProjectId, clearComments, setComments]);

  return null;
}
