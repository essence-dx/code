"use client";

import { createContext, useCallback, useContext, useMemo, useRef, type ReactNode } from "react";
import type { MediaAction, MediaActionOperation } from "../types";

type MediaTargetControls = Record<MediaActionOperation, () => void>;

interface MediaActionRegistry {
  registerMediaTarget: (objectId: string, controls: MediaTargetControls) => () => void;
  runMediaAction: (action?: MediaAction | null) => void;
}

const MediaActionContext = createContext<MediaActionRegistry | null>(null);
const noopRegistry = {
  registerMediaTarget: () => () => undefined,
  runMediaAction: () => undefined,
} satisfies MediaActionRegistry;

export function MediaActionProvider({ children }: { children: ReactNode }) {
  const targetsRef = useRef(new Map<string, MediaTargetControls>());

  const registerMediaTarget = useCallback((objectId: string, controls: MediaTargetControls) => {
    targetsRef.current.set(objectId, controls);

    return () => {
      if (targetsRef.current.get(objectId) === controls) {
        targetsRef.current.delete(objectId);
      }
    };
  }, []);

  const runMediaAction = useCallback((action?: MediaAction | null) => {
    if (!action?.targetObjectId) {
      return;
    }

    targetsRef.current.get(action.targetObjectId)?.[action.operation ?? "toggle"]();
  }, []);

  const value = useMemo(() => ({ registerMediaTarget, runMediaAction }), [registerMediaTarget, runMediaAction]);

  return <MediaActionContext.Provider value={value}>{children}</MediaActionContext.Provider>;
}

export function useMediaActionRegistry() {
  const registry = useContext(MediaActionContext);

  if (!registry) {
    return noopRegistry;
  }

  return registry;
}
