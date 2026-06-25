"use client";

import { useCallback, useState } from "react";

import type { SharePermission } from "@/features/editor/types";

export type ShareState = "idle" | "saving" | "copied" | "error";

type UseEditorSharingInput = {
  projectId: string;
  initialPublicShareId: string | null;
  initialEditShareId: string | null;
  initialEditSharePermission: SharePermission;
  saveProject: () => Promise<boolean>;
};

export function useEditorSharing({
  projectId,
  initialPublicShareId,
  initialEditShareId,
  initialEditSharePermission,
  saveProject,
}: UseEditorSharingInput) {
  const [publicShareId, setPublicShareId] = useState(initialPublicShareId);
  const [editShareId, setEditShareId] = useState(initialEditShareId);
  const [editSharePermission, setEditSharePermission] = useState(
    initialEditSharePermission,
  );
  const [shareState, setShareState] = useState<ShareState>("idle");

  const getPublicShareUrl = useCallback(
    (shareId = publicShareId) => {
      if (!shareId || typeof window === "undefined") return "";

      return `${window.location.origin}/view/${shareId}`;
    },
    [publicShareId],
  );

  const copyPublicShareLink = useCallback(
    async (shareId = publicShareId) => {
      const shareUrl = getPublicShareUrl(shareId);

      if (!shareUrl) return;

      try {
        await navigator.clipboard.writeText(shareUrl);
        setShareState("copied");
        window.setTimeout(() => setShareState("idle"), 1600);
      } catch {
        setShareState("error");
      }
    },
    [getPublicShareUrl, publicShareId],
  );

  const openPublicShareLink = useCallback(() => {
    const shareUrl = getPublicShareUrl();

    if (shareUrl) {
      window.open(shareUrl, "_blank", "noopener");
    }
  }, [getPublicShareUrl]);

  const getEditShareUrl = useCallback(
    (shareId = editShareId) => {
      if (!shareId || typeof window === "undefined") return "";

      return `${window.location.origin}/edit/${shareId}`;
    },
    [editShareId],
  );

  const copyEditShareLink = useCallback(
    async (shareId = editShareId) => {
      const shareUrl = getEditShareUrl(shareId);

      if (!shareUrl) return;

      try {
        await navigator.clipboard.writeText(shareUrl);
        setShareState("copied");
        window.setTimeout(() => setShareState("idle"), 1600);
      } catch {
        setShareState("error");
      }
    },
    [editShareId, getEditShareUrl],
  );

  const openEditShareLink = useCallback(() => {
    const shareUrl = getEditShareUrl();

    if (shareUrl) {
      window.open(shareUrl, "_blank", "noopener");
    }
  }, [getEditShareUrl]);

  const togglePublicShare = useCallback(
    async (enabled: boolean) => {
      setShareState("saving");

      if (enabled) {
        const saved = await saveProject();

        if (!saved) {
          setShareState("error");
          return;
        }
      }

      const response = await fetch(`/api/projects/${projectId}/share`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ enabled }),
      });

      if (!response.ok) {
        setShareState("error");
        return;
      }

      const body = (await response.json()) as {
        publicShareId: string | null;
      };

      setPublicShareId(body.publicShareId);

      if (body.publicShareId) {
        await copyPublicShareLink(body.publicShareId);
      } else {
        setShareState("idle");
      }
    },
    [copyPublicShareLink, projectId, saveProject],
  );

  const toggleEditShare = useCallback(
    async (enabled: boolean, permission = editSharePermission) => {
      const hadExistingLink = Boolean(editShareId);

      setShareState("saving");

      if (enabled) {
        const saved = await saveProject();

        if (!saved) {
          setShareState("error");
          return;
        }
      }

      const response = await fetch(`/api/projects/${projectId}/edit-share`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ enabled, permission }),
      });

      if (!response.ok) {
        setShareState("error");
        return;
      }

      const body = (await response.json()) as {
        editShareId: string | null;
        editSharePermission: SharePermission;
      };

      setEditShareId(body.editShareId);
      setEditSharePermission(body.editSharePermission);

      if (body.editShareId && !hadExistingLink) {
        await copyEditShareLink(body.editShareId);
      } else {
        setShareState("idle");
      }
    },
    [
      copyEditShareLink,
      editShareId,
      editSharePermission,
      projectId,
      saveProject,
    ],
  );

  return {
    publicShareId,
    editShareId,
    editSharePermission,
    shareState,
    copyPublicShareLink,
    openPublicShareLink,
    togglePublicShare,
    copyEditShareLink,
    openEditShareLink,
    toggleEditShare,
  };
}
