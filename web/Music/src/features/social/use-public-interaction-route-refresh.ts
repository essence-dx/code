"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import {
  hasSyncedPublicCommentsForScope,
  subscribePublicInteractionReplay,
  type PublicInteractionReplayScope,
} from "./public-interaction-queue";

export function usePublicInteractionRouteRefresh(
  scope: PublicInteractionReplayScope,
) {
  const router = useRouter();
  const refreshTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const unsubscribe = subscribePublicInteractionReplay((summary) => {
      if (!hasSyncedPublicCommentsForScope(summary, scope)) {
        return;
      }

      if (refreshTimeoutRef.current) {
        window.clearTimeout(refreshTimeoutRef.current);
      }

      refreshTimeoutRef.current = window.setTimeout(() => {
        router.refresh();
        refreshTimeoutRef.current = null;
      }, 250);
    });

    return () => {
      unsubscribe();

      if (refreshTimeoutRef.current) {
        window.clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [router, scope]);
}
