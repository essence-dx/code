"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  assertOnlineAction,
  useOnlineActionGuard,
} from "@/features/system/online-action-guard";
import { syncCloudHookPost } from "./cloud-hooks";
import {
  addLocalHookComment,
  deleteLocalHookPost,
  listLocalHookPosts,
  saveLocalHookPost,
  updateLocalHookPost,
  type HookPostInput,
  type HookVisibility,
  type LocalHookPost,
} from "./local-hook-feed";

export function useHookFeed() {
  const onlineGuard = useOnlineActionGuard();
  const [hooks, setHooks] = useState<LocalHookPost[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setHooks(await listLocalHookPosts());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh().catch((error) => {
      console.error(error);
      toast.error("Could not load hook feed.");
      setLoading(false);
    });
  }, [refresh]);

  const saveHook = useCallback(async (input: HookPostInput) => {
    const hook = await saveLocalHookPost(input);
    setHooks((current) => [hook, ...current]);
    toast.success(input.visibility === "public" ? "Hook published." : "Hook saved.");
    return hook;
  }, []);

  const toggleLike = useCallback(async (hook: LocalHookPost) => {
    const liked = !hook.liked;
    const updated = await updateLocalHookPost(hook.id, {
      liked,
      likeCount: Math.max(0, hook.likeCount + (liked ? 1 : -1)),
    });

    setHooks((current) =>
      current.map((item) => (item.id === hook.id ? updated : item)),
    );
  }, []);

  const setVisibility = useCallback(
    async (hook: LocalHookPost, visibility: HookVisibility) => {
      const updated = await updateLocalHookPost(hook.id, { visibility });

      setHooks((current) =>
        current.map((item) => (item.id === hook.id ? updated : item)),
      );
      toast.success(visibility === "public" ? "Hook is public." : "Hook is private.");
    },
    [],
  );

  const addComment = useCallback(async (hook: LocalHookPost, body: string) => {
    const updated = await addLocalHookComment(hook.id, { body });

    setHooks((current) =>
      current.map((item) => (item.id === hook.id ? updated : item)),
    );
    toast.success("Comment added.");
  }, []);

  const reportHook = useCallback(async (hook: LocalHookPost) => {
    const updated = await updateLocalHookPost(hook.id, {
      moderationStatus: "pending-review",
      reportCount: hook.reportCount + 1,
    });

    setHooks((current) =>
      current.map((item) => (item.id === hook.id ? updated : item)),
    );
    toast.success("Hook report saved locally.");
  }, []);

  const syncHook = useCallback(async (hook: LocalHookPost) => {
    assertOnlineAction(onlineGuard, "Hook sync");
    const result = await syncCloudHookPost(hook);
    const updated = await updateLocalHookPost(hook.id, {
      cloudShareUrl: result.shareUrl ?? undefined,
      cloudSyncedAt: Date.now(),
      cloudVideoStorageKey: result.hook.videoStorageKey ?? undefined,
    });

    setHooks((current) =>
      current.map((item) => (item.id === hook.id ? updated : item)),
    );
    toast.success(
      result.videoSkippedReason
        ? `Hook metadata synced. ${result.videoSkippedReason}`
        : result.shareUrl
          ? "Hook synced and public link is ready."
          : "Hook synced.",
    );
    return updated;
  }, [onlineGuard]);

  const removeHook = useCallback(async (hook: LocalHookPost) => {
    await deleteLocalHookPost(hook.id);
    setHooks((current) => current.filter((item) => item.id !== hook.id));
    toast.success("Hook removed.");
  }, []);

  return {
    addComment,
    hooks,
    loading,
    refresh,
    removeHook,
    reportHook,
    saveHook,
    setVisibility,
    syncHook,
    toggleLike,
  };
}
