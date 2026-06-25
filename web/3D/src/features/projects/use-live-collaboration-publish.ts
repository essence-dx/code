"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  applySceneCollaborationOperations,
  createSceneCollaborationOperations,
  normalizeSceneCollaborationOperations,
  type SceneCollaborationOperation,
} from "@/features/editor/scene/scene-collaboration-operations";
import type { SceneDocument } from "@/features/editor/types";
import {
  createProjectCollaborationLivePublishSignature,
  summarizeProjectCollaborationLivePublishStatus,
  type ProjectCollaborationLivePublishState,
  type ProjectCollaborationLivePublishTransport,
} from "./collaboration-live-publish";

export type ProjectCollaborationPublishPurpose = "live" | "save";

export interface ProjectCollaborationPublishResult {
  errorMessage?: string;
  fallbackReason?: string;
  ok: boolean;
  transport?: ProjectCollaborationLivePublishTransport;
}

export type ProjectCollaborationOperationPublisher = (
  projectId: string,
  operations: SceneCollaborationOperation[],
  baseUpdatedAt: string | null,
  purpose: ProjectCollaborationPublishPurpose,
) => Promise<ProjectCollaborationPublishResult>;

interface UseLiveCollaborationPublishInput {
  baseDocument: SceneDocument | null;
  baseUpdatedAt: string | null;
  currentDocument: SceneDocument;
  pause: boolean;
  projectId: string | null;
  publishOperations: ProjectCollaborationOperationPublisher;
  scopeId?: string | null;
}

interface PreparedCollaborationSave {
  baselineDocument: SceneDocument | null;
  operations: SceneCollaborationOperation[];
}

const liveCollaborationPublishDebounceMs = 1_200;

export function useLiveCollaborationPublish({
  baseDocument,
  baseUpdatedAt,
  currentDocument,
  pause,
  projectId,
  publishOperations,
  scopeId,
}: UseLiveCollaborationPublishInput) {
  const [livePublishedOperations, setLivePublishedOperations] = useState<SceneCollaborationOperation[]>([]);
  const [livePublishError, setLivePublishError] = useState<string | null>(null);
  const [livePublishState, setLivePublishState] = useState<ProjectCollaborationLivePublishState>("idle");
  const [livePublishTransport, setLivePublishTransport] = useState<ProjectCollaborationLivePublishTransport | null>(null);
  const livePublishGenerationRef = useRef(0);
  const livePublishInFlightRef = useRef(false);
  const livePublishOperationsRef = useRef<SceneCollaborationOperation[]>([]);
  const livePublishPromiseRef = useRef<Promise<ProjectCollaborationPublishResult> | null>(null);
  const livePublishSignatureRef = useRef<string | null>(null);
  const livePublishTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const collaborationBaselineDocument = useMemo(
    () => (baseDocument ? applySceneCollaborationOperations(baseDocument, livePublishedOperations) : null),
    [baseDocument, livePublishedOperations],
  );
  const collaborationOperations = useMemo(
    () => (collaborationBaselineDocument ? createSceneCollaborationOperations(collaborationBaselineDocument, currentDocument) : []),
    [collaborationBaselineDocument, currentDocument],
  );
  const livePublishSignature = useMemo(
    () =>
      createProjectCollaborationLivePublishSignature({
        baseUpdatedAt,
        operations: collaborationOperations,
        projectId,
        scopeId,
      }),
    [baseUpdatedAt, collaborationOperations, projectId, scopeId],
  );
  const livePublishSummary = useMemo(
    () =>
      summarizeProjectCollaborationLivePublishStatus({
        errorMessage: livePublishError,
        pendingOperationCount: collaborationOperations.length,
        publishedOperationCount: livePublishedOperations.length,
        state: livePublishState,
        transport: livePublishTransport,
      }),
    [collaborationOperations.length, livePublishedOperations.length, livePublishError, livePublishState, livePublishTransport],
  );

  const cancelQueuedLivePublish = useCallback(() => {
    if (livePublishTimerRef.current) {
      clearTimeout(livePublishTimerRef.current);
      livePublishTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    setLivePublishedOperations([]);
    setLivePublishError(null);
    setLivePublishState("idle");
    setLivePublishTransport(null);
    livePublishGenerationRef.current += 1;
    livePublishInFlightRef.current = false;
    livePublishOperationsRef.current = [];
    livePublishPromiseRef.current = null;
    livePublishSignatureRef.current = null;
    cancelQueuedLivePublish();
  }, [baseUpdatedAt, cancelQueuedLivePublish, projectId, scopeId]);

  useEffect(() => {
    cancelQueuedLivePublish();

    if (!projectId || !baseUpdatedAt || !baseDocument || !livePublishSignature || collaborationOperations.length === 0 || pause) {
      if (collaborationOperations.length === 0) {
        setLivePublishState((current) => (current === "scheduled" ? (livePublishedOperations.length > 0 ? "synced" : "idle") : current));
      }

      return;
    }

    if (livePublishInFlightRef.current || livePublishSignatureRef.current === livePublishSignature) {
      return;
    }

    const generation = livePublishGenerationRef.current;
    const operationsToPublish = collaborationOperations;
    const signatureToPublish = livePublishSignature;

    setLivePublishError(null);
    setLivePublishTransport(null);
    setLivePublishState("scheduled");
    livePublishTimerRef.current = setTimeout(() => {
      livePublishTimerRef.current = null;
      livePublishInFlightRef.current = true;
      setLivePublishState("publishing");

      const publishPromise = publishOperations(projectId, operationsToPublish, baseUpdatedAt, "live");

      livePublishOperationsRef.current = operationsToPublish;
      livePublishPromiseRef.current = publishPromise;

      void publishPromise
        .then((result) => {
          if (livePublishGenerationRef.current !== generation) {
            return;
          }

          if (!result.ok) {
            setLivePublishError(result.errorMessage ?? "Edits remain local until retry or save.");
            setLivePublishTransport(null);
            setLivePublishState("error");
            return;
          }

          livePublishSignatureRef.current = signatureToPublish;
          setLivePublishedOperations((current) => normalizeSceneCollaborationOperations([...current, ...operationsToPublish]));
          setLivePublishError(null);
          setLivePublishTransport(result.transport ?? "api");
          setLivePublishState("synced");
        })
        .finally(() => {
          if (livePublishGenerationRef.current === generation) {
            livePublishInFlightRef.current = false;
            livePublishOperationsRef.current = [];
            livePublishPromiseRef.current = null;
          }
        });
    }, liveCollaborationPublishDebounceMs);

    return cancelQueuedLivePublish;
  }, [
    baseDocument,
    baseUpdatedAt,
    cancelQueuedLivePublish,
    collaborationOperations,
    livePublishedOperations.length,
    livePublishSignature,
    pause,
    projectId,
    publishOperations,
  ]);

  const prepareSavePublish = useCallback(async (): Promise<PreparedCollaborationSave> => {
    cancelQueuedLivePublish();

    const inFlightLivePublish = livePublishPromiseRef.current;
    const inFlightLiveOperations = livePublishOperationsRef.current;

    if (projectId && inFlightLivePublish && collaborationBaselineDocument && inFlightLiveOperations.length > 0) {
      const livePublishResult = await inFlightLivePublish;

      if (livePublishResult.ok) {
        const baselineDocument = applySceneCollaborationOperations(collaborationBaselineDocument, inFlightLiveOperations);

        return {
          baselineDocument,
          operations: createSceneCollaborationOperations(baselineDocument, currentDocument),
        };
      }
    }

    return {
      baselineDocument: collaborationBaselineDocument,
      operations: collaborationOperations,
    };
  }, [cancelQueuedLivePublish, collaborationBaselineDocument, collaborationOperations, currentDocument, projectId]);

  return {
    baselineDocument: collaborationBaselineDocument,
    cancelQueuedLivePublish,
    operations: collaborationOperations,
    prepareSavePublish,
    summary: livePublishSummary,
  };
}
