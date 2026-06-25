"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, RefreshCw, RadioTower } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { normalizeSceneCollaborationOperations } from "@/features/editor/scene/scene-collaboration-operations";
import type { SceneCollaborationOperation } from "@/features/editor/scene/scene-collaboration-operations";
import type { SceneDocument } from "@/features/editor/types";
import {
  getAppliedCollaborationBatchLedgerKey,
  pruneAppliedCollaborationBatchLedgers,
  readAppliedCollaborationBatchLedger,
  writeAppliedCollaborationBatchLedger,
} from "../applied-collaboration-batch-ledger";
import {
  createAppliedCollaborationOperationSignature,
  createAppliedCollaborationOperationSignatures,
  getAppliedCollaborationOperationLedgerKey,
  hasAcknowledgedAllCollaborationOperations,
  pruneAppliedCollaborationOperationLedgers,
  readAppliedCollaborationOperationLedger,
  summarizeAppliedCollaborationOperationAcknowledgements,
  writeAppliedCollaborationOperationLedger,
} from "../applied-collaboration-operation-ledger";
import {
  createProjectCollaborationAppliedFrontier,
  summarizeProjectCollaborationAppliedFrontier,
  type ProjectCollaborationAppliedFrontier,
} from "../collaboration-applied-frontier";
import {
  createProjectCollaborationCausalRecoveryCursors,
  evaluateProjectCollaborationBatchConvergence,
  partitionProjectCollaborationBatchesByCausalReadiness,
  sortProjectCollaborationOperationBatchesForConvergence,
} from "../collaboration-batch-convergence";
import { createProjectCollaborationBroadcastChannel, isProjectCollaborationBroadcastMessage } from "../collaboration-broadcast";
import {
  createProjectCollaborationClientCursors,
  mergeProjectCollaborationClientCursors,
  summarizeProjectCollaborationClientCursors,
  type ProjectCollaborationClientCursor,
} from "../collaboration-client-cursors";
import {
  createProjectCollaborationCrdtApplyPlan,
  summarizeProjectCollaborationCrdtApplyPlan,
  summarizeProjectCollaborationCrdtMergePlan,
} from "../collaboration-crdt-merge-plan";
import {
  createProjectCollaborationOperationTransport,
  type CollaborationOperationTransport,
  type CollaborationOperationTransportKind,
} from "../collaboration-operation-transport";
import {
  summarizeProjectCollaborationReplayCheckpoint,
  type ProjectCollaborationReplayCheckpoint,
} from "../collaboration-replay-checkpoint";
import { createProjectCollaborationReadyApplySignature } from "../collaboration-live-apply-signature";
import {
  getProjectCollaborationStreamRecoveryKey,
  pruneProjectCollaborationStreamRecoveryStates,
  readProjectCollaborationStreamRecoveryState,
  summarizeProjectCollaborationStreamRecoveryState,
  writeProjectCollaborationStreamRecoveryState,
  type ProjectCollaborationStreamRecoveryState,
} from "../collaboration-stream-recovery-state";
import type { ProjectCollaborationOperationBatchSummary } from "../collaboration-types";
import { listProjectCollaborationOperationBatches } from "../project-api";

type SyncState = "idle" | "loading" | "ready" | "error";
type StreamState = "connecting" | "live" | "paused" | "unsupported";
type CausalRecoveryState = "idle" | "recovering" | "checked" | "blocked";
const liveApplyStorageKey = "essence-spline-live-apply-conflict-free-operations";
const emptyStreamRecoveryState: ProjectCollaborationStreamRecoveryState = { clientCursors: [], streamCursor: null };

interface ProjectCollaborationActivityProps {
  clientId: string;
  currentDocument: SceneDocument;
  projectId: string | null;
  sceneId?: string | null;
  since: string | null;
  onApplyRemoteBatches?: (batches: ProjectCollaborationOperationBatchSummary[], operations: SceneCollaborationOperation[]) => boolean | Promise<boolean>;
}

function formatActivityTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function summarizeBatch(batch: ProjectCollaborationOperationBatchSummary) {
  const objectChanges = batch.operations.filter((operation) => operation.kind.startsWith("object-")).length;
  const documentChanges = batch.operations.length - objectChanges;
  const parts = [
    objectChanges ? `${objectChanges} object ${objectChanges === 1 ? "change" : "changes"}` : null,
    documentChanges ? `${documentChanges} document ${documentChanges === 1 ? "change" : "changes"}` : null,
  ].filter((part): part is string => Boolean(part));

  return parts.join(", ") || `${batch.operationCount} sync ${batch.operationCount === 1 ? "operation" : "operations"}`;
}

function mergeOperationBatches(current: ProjectCollaborationOperationBatchSummary[], incoming: ProjectCollaborationOperationBatchSummary[]) {
  const batches = new Map(current.map((batch) => [batch.id, batch]));

  for (const batch of incoming) {
    batches.set(batch.id, batch);
  }

  return sortProjectCollaborationOperationBatchesForConvergence([...batches.values()]);
}

function getStreamStatusText(streamState: StreamState, checkedAt: string | null, transport: CollaborationOperationTransportKind) {
  const liveLabel = transport === "websocket" ? "WebSocket collaboration" : "Live collaboration stream";

  if (streamState === "live") {
    return checkedAt ? `${liveLabel} active, checked ${formatActivityTime(checkedAt)}.` : `${liveLabel} active.`;
  }

  if (streamState === "connecting") {
    return transport === "websocket" ? "Opening WebSocket collaboration transport." : "Opening live activity stream.";
  }

  if (streamState === "paused") {
    return `${transport === "websocket" ? "WebSocket" : "Live stream"} reconnecting; polling remains active.`;
  }

  return "Polling fallback active.";
}

function getStreamStatusBadgeText(streamState: StreamState, transport: CollaborationOperationTransportKind) {
  if (streamState === "live") {
    return transport === "websocket" ? "WebSocket" : "Live";
  }

  if (streamState === "connecting") {
    return transport === "websocket" ? "Socket opening" : "Opening";
  }

  if (streamState === "paused") {
    return transport === "websocket" ? "Socket retry" : "Retrying";
  }

  return "Polling";
}

function getCausalRecoveryStatusText(state: CausalRecoveryState, checkedAt: string | null) {
  if (state === "recovering") {
    return "Recovering missing remote history.";
  }

  if (state === "checked") {
    return checkedAt ? `Checked missing causal history at ${formatActivityTime(checkedAt)}.` : "Checked missing causal history.";
  }

  if (state === "blocked") {
    return checkedAt ? `Causal history still needs review, checked ${formatActivityTime(checkedAt)}.` : "Causal history still needs review.";
  }

  return null;
}

function readLiveApplyPreference() {
  if (typeof window === "undefined") {
    return true;
  }

  return window.localStorage.getItem(liveApplyStorageKey) !== "disabled";
}

export function ProjectCollaborationActivity({ clientId, currentDocument, onApplyRemoteBatches, projectId, sceneId, since }: ProjectCollaborationActivityProps) {
  const [batches, setBatches] = useState<ProjectCollaborationOperationBatchSummary[]>([]);
  const [appliedBatchIds, setAppliedBatchIds] = useState<Set<string>>(new Set());
  const [appliedOperationSignatures, setAppliedOperationSignatures] = useState<Set<string>>(new Set());
  const [appliedFrontier, setAppliedFrontier] = useState<ProjectCollaborationAppliedFrontier>(() =>
    createProjectCollaborationAppliedFrontier({ appliedBatchIds: [] }),
  );
  const [applying, setApplying] = useState(false);
  const [liveApplyEnabled, setLiveApplyEnabled] = useState(readLiveApplyPreference);
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [streamState, setStreamState] = useState<StreamState>("unsupported");
  const [streamTransport, setStreamTransport] = useState<CollaborationOperationTransportKind>("polling");
  const [streamReconnectToken, setStreamReconnectToken] = useState(0);
  const [lastStreamCheckedAt, setLastStreamCheckedAt] = useState<string | null>(null);
  const [lastReplayCheckpoint, setLastReplayCheckpoint] = useState<ProjectCollaborationReplayCheckpoint | null>(null);
  const [streamRecoveryState, setStreamRecoveryState] = useState<ProjectCollaborationStreamRecoveryState>(emptyStreamRecoveryState);
  const [causalFrontier, setCausalFrontier] = useState<ProjectCollaborationClientCursor[]>([]);
  const [causalRecoveryState, setCausalRecoveryState] = useState<CausalRecoveryState>("idle");
  const [lastCausalRecoveryAt, setLastCausalRecoveryAt] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const appliedBatchIdsRef = useRef<Set<string>>(new Set());
  const appliedOperationSignaturesRef = useRef<Set<string>>(new Set());
  const appliedFrontierRef = useRef<ProjectCollaborationAppliedFrontier>(
    createProjectCollaborationAppliedFrontier({ appliedBatchIds: [] }),
  );
  const autoApplyBlockedSignatureRef = useRef<string | null>(null);
  const cleanApplyAttemptedSignatureRef = useRef<string | null>(null);
  const causalRecoverySignatureRef = useRef<string | null>(null);
  const clientCursorsRef = useRef<ProjectCollaborationClientCursor[]>([]);
  const streamCursorRef = useRef<string | null>(since);
  const collaborationSceneId = sceneId ?? currentDocument.activeSceneId ?? currentDocument.id;
  const streamRecoveryKey = useMemo(() => getProjectCollaborationStreamRecoveryKey(projectId, since, collaborationSceneId), [collaborationSceneId, projectId, since]);

  const persistStreamRecoveryState = useCallback((clientCursors: ProjectCollaborationClientCursor[], streamCursor: string | null) => {
    const nextState = { clientCursors, streamCursor };

    writeProjectCollaborationStreamRecoveryState(streamRecoveryKey, nextState);
    setStreamRecoveryState(nextState);
  }, [streamRecoveryKey]);

  const mergeClientCursors = useCallback((incoming: ProjectCollaborationClientCursor[]) => {
    const nextCursors = mergeProjectCollaborationClientCursors(clientCursorsRef.current, incoming);

    clientCursorsRef.current = nextCursors;
    setCausalFrontier(nextCursors);
    persistStreamRecoveryState(nextCursors, streamCursorRef.current);

    return nextCursors;
  }, [persistStreamRecoveryState]);

  const acknowledgeReplayCheckpoint = useCallback((checkpoint: ProjectCollaborationReplayCheckpoint | undefined) => {
    if (!checkpoint) {
      return null;
    }

    if (checkpoint.streamCursor) {
      streamCursorRef.current = checkpoint.streamCursor;
    }

    const nextCursors = mergeProjectCollaborationClientCursors(clientCursorsRef.current, checkpoint.clientCursors);

    clientCursorsRef.current = nextCursors;
    setCausalFrontier(nextCursors);
    setLastReplayCheckpoint(checkpoint);
    persistStreamRecoveryState(nextCursors, streamCursorRef.current);

    return nextCursors;
  }, [persistStreamRecoveryState]);

  const acknowledgeAppliedFrontier = useCallback((appliedIds: Set<string>, appliedBatches: ProjectCollaborationOperationBatchSummary[]) => {
    const nextFrontier = createProjectCollaborationAppliedFrontier({
      appliedBatchIds: appliedIds,
      appliedBatches,
      previousFrontier: appliedFrontierRef.current,
    });

    appliedFrontierRef.current = nextFrontier;
    setAppliedFrontier(nextFrontier);

    if (nextFrontier.clientCursors.length) {
      mergeClientCursors(nextFrontier.clientCursors);
    }
  }, [mergeClientCursors]);

  const refreshActivity = useCallback(async () => {
    if (!projectId || !since) {
      setBatches([]);
      setSyncState("idle");
      return;
    }

    setSyncState("loading");
    setErrorMessage(null);

    try {
      const response = await listProjectCollaborationOperationBatches(projectId, since, clientCursorsRef.current);
      const latestBatch = response.operationBatches.at(-1);

      if (response.replayCheckpoint) {
        acknowledgeReplayCheckpoint(response.replayCheckpoint);
      } else if (latestBatch) {
        streamCursorRef.current = latestBatch.createdAt;
        mergeClientCursors(response.clientCursors);
      } else {
        mergeClientCursors(response.clientCursors);
      }

      setBatches((current) => mergeOperationBatches(current, response.operationBatches));
      setSyncState("ready");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to load collaboration activity");
      setSyncState("error");
    }
  }, [acknowledgeReplayCheckpoint, collaborationSceneId, mergeClientCursors, projectId, since]);

  useEffect(() => {
    const recoveryState = readProjectCollaborationStreamRecoveryState(streamRecoveryKey);

    clientCursorsRef.current = recoveryState.clientCursors;
    causalRecoverySignatureRef.current = null;
    setCausalFrontier(recoveryState.clientCursors);
    setCausalRecoveryState("idle");
    setLastCausalRecoveryAt(null);
    setLastReplayCheckpoint(null);
    setStreamRecoveryState(recoveryState);
    setBatches([]);
    streamCursorRef.current = recoveryState.streamCursor ?? since;
  }, [projectId, since, streamRecoveryKey]);

  useEffect(() => {
    void refreshActivity();
  }, [refreshActivity]);

  useEffect(() => {
    if (!projectId || !since) {
      return;
    }

    const interval = window.setInterval(() => {
      void refreshActivity();
    }, 12_000);

    return () => window.clearInterval(interval);
  }, [projectId, refreshActivity, since]);

  useEffect(() => {
    if (!projectId || !since || typeof window === "undefined") {
      setStreamState("unsupported");
      setStreamTransport("polling");
      setLastStreamCheckedAt(null);
      return;
    }

    setStreamState("connecting");
    setLastStreamCheckedAt(null);

    const streamAfter = streamCursorRef.current ?? since;
    let reconnectTimer: number | null = null;
    let transport: CollaborationOperationTransport | null = null;
    transport = createProjectCollaborationOperationTransport({
      after: streamAfter,
      clientCursors: clientCursorsRef.current,
      onEvent(event) {
        setStreamTransport(event.transport);

        if (event.transport === "polling") {
          setStreamState("unsupported");
          return;
        }

        if (event.kind === "error") {
          if (reconnectTimer) {
            return;
          }

          setStreamState("paused");
          transport?.close();
          reconnectTimer = window.setTimeout(() => {
            setStreamReconnectToken((token) => token + 1);
          }, 1_500);
          return;
        }

        if (event.kind !== "operation-batches") {
          if (event.replayCheckpoint) {
            acknowledgeReplayCheckpoint(event.replayCheckpoint);
          } else if (event.clientCursors) {
            mergeClientCursors(event.clientCursors);
          }
        }

        if (event.kind === "operation-batches") {
          const latestBatch = event.operationBatches.at(-1);

          if (event.replayCheckpoint) {
            acknowledgeReplayCheckpoint(event.replayCheckpoint);
          } else if (latestBatch) {
            streamCursorRef.current = latestBatch.createdAt;
            mergeClientCursors(event.clientCursors?.length ? event.clientCursors : createProjectCollaborationClientCursors(event.operationBatches));
          } else {
            mergeClientCursors(event.clientCursors?.length ? event.clientCursors : createProjectCollaborationClientCursors(event.operationBatches));
          }

          persistStreamRecoveryState(clientCursorsRef.current, streamCursorRef.current);
          setBatches((current) => mergeOperationBatches(current, event.operationBatches));
          setSyncState("ready");
        }

        setLastStreamCheckedAt(event.checkedAt);
        setStreamState("live");
      },
      projectId,
    });

    setStreamTransport(transport.kind);

    if (transport.kind === "polling") {
      setStreamState("unsupported");
    }

    return () => {
      if (reconnectTimer) {
        window.clearTimeout(reconnectTimer);
      }

      transport?.close();
    };
  }, [acknowledgeReplayCheckpoint, collaborationSceneId, mergeClientCursors, persistStreamRecoveryState, projectId, since, streamReconnectToken]);

  useEffect(() => {
    if (!projectId) {
      return;
    }

    const channel = createProjectCollaborationBroadcastChannel();

    if (!channel) {
      return;
    }

    channel.onmessage = (event) => {
      const message = event.data;

      if (isProjectCollaborationBroadcastMessage(message) && message.projectId === projectId && message.clientId !== clientId) {
        void refreshActivity();
      }
    };

    return () => channel.close();
  }, [clientId, projectId, refreshActivity]);

  const remoteBatches = useMemo(() => sortProjectCollaborationOperationBatchesForConvergence(batches.filter((batch) => batch.clientId !== clientId)), [batches, clientId]);
  const remoteBatchReadiness = useMemo(() => partitionProjectCollaborationBatchesByCausalReadiness(remoteBatches), [remoteBatches]);
  const readyRemoteBatchIds = useMemo(() => new Set(remoteBatchReadiness.readyBatches.map((batch) => batch.id)), [remoteBatchReadiness.readyBatches]);
  const unappliedRemoteBatches = useMemo(
    () => sortProjectCollaborationOperationBatchesForConvergence(remoteBatches.filter((batch) => !appliedBatchIds.has(batch.id))),
    [appliedBatchIds, remoteBatches],
  );
  const causallyReadyRemoteBatches = useMemo(
    () => sortProjectCollaborationOperationBatchesForConvergence(unappliedRemoteBatches.filter((batch) => readyRemoteBatchIds.has(batch.id))),
    [readyRemoteBatchIds, unappliedRemoteBatches],
  );
  const blockedRemoteBatches = useMemo(
    () => sortProjectCollaborationOperationBatchesForConvergence(remoteBatchReadiness.blockedBatches.filter((batch) => !appliedBatchIds.has(batch.id))),
    [appliedBatchIds, remoteBatchReadiness.blockedBatches],
  );
  const convergenceIssues = useMemo(() => evaluateProjectCollaborationBatchConvergence(remoteBatches), [remoteBatches]);
  const causalRecoveryCursors = useMemo(() => createProjectCollaborationCausalRecoveryCursors(convergenceIssues), [convergenceIssues]);
  const causalRecoverySignature = useMemo(
    () => causalRecoveryCursors.map((cursor) => `${cursor.clientId}:${cursor.afterSequence}`).join("|"),
    [causalRecoveryCursors],
  );
  const crdtApplyPlan = useMemo(() => createProjectCollaborationCrdtApplyPlan(currentDocument, causallyReadyRemoteBatches), [causallyReadyRemoteBatches, currentDocument]);
  const crdtMergePlan = crdtApplyPlan.mergePlan;
  const remoteOperations = useMemo(() => normalizeSceneCollaborationOperations(crdtApplyPlan.mergePlan.operations), [crdtApplyPlan.mergePlan.operations]);
  const remoteConflicts = crdtApplyPlan.conflicts;
  const unappliedCleanOperations = useMemo(
    () =>
      crdtApplyPlan.cleanOperations.filter((operation) => {
        return !appliedOperationSignatures.has(createAppliedCollaborationOperationSignature(operation));
      }),
    [appliedOperationSignatures, crdtApplyPlan.cleanOperations],
  );
  const latestRemoteBatch = unappliedRemoteBatches[unappliedRemoteBatches.length - 1] ?? null;
  const remoteOperationCount = remoteOperations.length;
  const visibleConvergenceIssues = convergenceIssues.slice(0, 3);
  const visibleRemoteConflicts = remoteConflicts.slice(0, 3);
  const appliedBatchLedgerKey = useMemo(() => getAppliedCollaborationBatchLedgerKey(projectId, since, collaborationSceneId), [collaborationSceneId, projectId, since]);
  const appliedOperationLedgerKey = useMemo(
    () => getAppliedCollaborationOperationLedgerKey(projectId, since, collaborationSceneId),
    [collaborationSceneId, projectId, since],
  );
  const readyApplySignature = useMemo(
    () => createProjectCollaborationReadyApplySignature({ plannedOperations: remoteOperations, readyBatches: causallyReadyRemoteBatches, remoteConflicts }),
    [causallyReadyRemoteBatches, remoteConflicts, remoteOperations],
  );
  const cleanApplySignature = useMemo(
    () =>
      createProjectCollaborationReadyApplySignature({
        plannedOperations: unappliedCleanOperations,
        readyBatches: causallyReadyRemoteBatches,
        remoteConflicts,
      }),
    [causallyReadyRemoteBatches, remoteConflicts, unappliedCleanOperations],
  );
  const remoteReviewSignature = useMemo(() => {
    const convergenceSignature = convergenceIssues
      .map((issue) => `${issue.kind}:${issue.clientId}:${issue.expectedSequence ?? "none"}:${issue.actualSequence ?? "none"}`)
      .join("|");

    return `${readyApplySignature}|${convergenceSignature}`;
  }, [convergenceIssues, readyApplySignature]);
  const streamStatusText = getStreamStatusText(streamState, lastStreamCheckedAt, streamTransport);
  const replayCheckpointSummary = useMemo(() => summarizeProjectCollaborationReplayCheckpoint(lastReplayCheckpoint), [lastReplayCheckpoint]);
  const streamRecoverySummary = useMemo(() => summarizeProjectCollaborationStreamRecoveryState(streamRecoveryState), [streamRecoveryState]);
  const causalFrontierSummary = useMemo(() => summarizeProjectCollaborationClientCursors(causalFrontier), [causalFrontier]);
  const appliedFrontierSummary = useMemo(() => summarizeProjectCollaborationAppliedFrontier(appliedFrontier), [appliedFrontier]);
  const crdtMergeSummary = useMemo(() => summarizeProjectCollaborationCrdtMergePlan(crdtMergePlan), [crdtMergePlan]);
  const crdtApplySummary = useMemo(() => summarizeProjectCollaborationCrdtApplyPlan(crdtApplyPlan), [crdtApplyPlan]);
  const partialOperationAckSummary = useMemo(
    () => summarizeAppliedCollaborationOperationAcknowledgements(appliedOperationSignatures),
    [appliedOperationSignatures],
  );
  const causalRecoveryStatusText = getCausalRecoveryStatusText(causalRecoveryState, lastCausalRecoveryAt);

  useEffect(() => {
    if (!convergenceIssues.length) {
      causalRecoverySignatureRef.current = null;
      setCausalRecoveryState("idle");
      return;
    }

    if (!projectId || !causalRecoveryCursors.length || !causalRecoverySignature || causalRecoverySignatureRef.current === causalRecoverySignature) {
      return;
    }

    let cancelled = false;
    causalRecoverySignatureRef.current = causalRecoverySignature;
    setCausalRecoveryState("recovering");

    listProjectCollaborationOperationBatches(projectId, null, causalRecoveryCursors)
      .then((response) => {
        if (cancelled) {
          return;
        }

        const latestBatch = response.operationBatches.at(-1);

        if (response.replayCheckpoint) {
          acknowledgeReplayCheckpoint(response.replayCheckpoint);
        } else if (latestBatch) {
          streamCursorRef.current = latestBatch.createdAt;
          mergeClientCursors(response.clientCursors);
        } else {
          mergeClientCursors(response.clientCursors);
        }

        setBatches((current) => mergeOperationBatches(current, response.operationBatches));
        setLastCausalRecoveryAt(new Date().toISOString());
        setCausalRecoveryState(response.operationBatches.length ? "checked" : "blocked");
        setSyncState("ready");
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        setErrorMessage(error instanceof Error ? error.message : "Unable to recover missing collaboration history");
        setLastCausalRecoveryAt(new Date().toISOString());
        setCausalRecoveryState("blocked");
      });

    return () => {
      cancelled = true;
    };
  }, [acknowledgeReplayCheckpoint, causalRecoveryCursors, causalRecoverySignature, convergenceIssues.length, mergeClientCursors, projectId]);

  useEffect(() => {
    pruneAppliedCollaborationBatchLedgers(projectId, appliedBatchLedgerKey, since);
    pruneAppliedCollaborationOperationLedgers(projectId, appliedOperationLedgerKey, since);
    pruneProjectCollaborationStreamRecoveryStates(projectId, streamRecoveryKey, since);
    const persistedAppliedBatchIds = readAppliedCollaborationBatchLedger(appliedBatchLedgerKey);
    const persistedOperationSignatures = readAppliedCollaborationOperationLedger(appliedOperationLedgerKey);
    const nextFrontier = createProjectCollaborationAppliedFrontier({ appliedBatchIds: persistedAppliedBatchIds });

    appliedBatchIdsRef.current = persistedAppliedBatchIds;
    appliedOperationSignaturesRef.current = persistedOperationSignatures;
    appliedFrontierRef.current = nextFrontier;
    setAppliedBatchIds(persistedAppliedBatchIds);
    setAppliedOperationSignatures(persistedOperationSignatures);
    setAppliedFrontier(nextFrontier);
  }, [appliedBatchLedgerKey, appliedOperationLedgerKey, projectId, since, streamRecoveryKey]);

  useEffect(() => {
    cleanApplyAttemptedSignatureRef.current = null;
    setReviewConfirmed(false);
  }, [remoteReviewSignature]);

  function updateLiveApplyPreference(enabled: boolean) {
    setLiveApplyEnabled(enabled);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(liveApplyStorageKey, enabled ? "enabled" : "disabled");
    }
  }

  function handleManualRefresh() {
    causalRecoverySignatureRef.current = null;
    void refreshActivity();
  }

  const markBatchesApplied = useCallback((appliedBatches: ProjectCollaborationOperationBatchSummary[]) => {
    const nextAppliedBatchIds = new Set(appliedBatchIdsRef.current);

    for (const batch of appliedBatches) {
      nextAppliedBatchIds.add(batch.id);
    }

    appliedBatchIdsRef.current = nextAppliedBatchIds;
    writeAppliedCollaborationBatchLedger(appliedBatchLedgerKey, nextAppliedBatchIds);
    writeAppliedCollaborationOperationLedger(appliedOperationLedgerKey, new Set());
    setAppliedBatchIds(nextAppliedBatchIds);
    setAppliedOperationSignatures(new Set());
    appliedOperationSignaturesRef.current = new Set();
    acknowledgeAppliedFrontier(nextAppliedBatchIds, appliedBatches);
    setReviewConfirmed(false);
    autoApplyBlockedSignatureRef.current = null;
    cleanApplyAttemptedSignatureRef.current = null;
  }, [acknowledgeAppliedFrontier, appliedBatchLedgerKey, appliedOperationLedgerKey]);

  const markOperationsApplied = useCallback((operations: SceneCollaborationOperation[]) => {
    if (operations.length === 0) {
      return new Set(appliedOperationSignaturesRef.current);
    }

    const nextOperationSignatures = new Set(appliedOperationSignaturesRef.current);

    for (const signature of createAppliedCollaborationOperationSignatures(operations)) {
      nextOperationSignatures.add(signature);
    }

    appliedOperationSignaturesRef.current = nextOperationSignatures;
    writeAppliedCollaborationOperationLedger(appliedOperationLedgerKey, nextOperationSignatures);
    setAppliedOperationSignatures(nextOperationSignatures);
    return nextOperationSignatures;
  }, [appliedOperationLedgerKey]);

  const applyRemoteBatches = useCallback(async ({ allowConflicts, cleanOnly = false }: { allowConflicts: boolean; cleanOnly?: boolean }) => {
    if (!onApplyRemoteBatches || causallyReadyRemoteBatches.length === 0) {
      return;
    }

    const operationsToApply = cleanOnly ? unappliedCleanOperations : remoteOperations;

    if (operationsToApply.length === 0) {
      return;
    }

    if (!cleanOnly && remoteConflicts.length > 0 && !allowConflicts) {
      setReviewConfirmed(true);
      return;
    }

    setApplying(true);

    try {
      const applied = await onApplyRemoteBatches(causallyReadyRemoteBatches, operationsToApply);

      if (applied !== false && !cleanOnly) {
        markBatchesApplied(causallyReadyRemoteBatches);
      } else if (applied !== false) {
        const nextOperationSignatures = markOperationsApplied(operationsToApply);

        if (hasAcknowledgedAllCollaborationOperations(remoteOperations, nextOperationSignatures)) {
          markBatchesApplied(causallyReadyRemoteBatches);
        } else {
          cleanApplyAttemptedSignatureRef.current = cleanApplySignature;
        }
      } else if (cleanOnly) {
        cleanApplyAttemptedSignatureRef.current = cleanApplySignature;
      } else {
        autoApplyBlockedSignatureRef.current = readyApplySignature;
      }
    } finally {
      setApplying(false);
    }
  }, [causallyReadyRemoteBatches, cleanApplySignature, markBatchesApplied, markOperationsApplied, onApplyRemoteBatches, readyApplySignature, remoteConflicts.length, remoteOperations, unappliedCleanOperations]);

  useEffect(() => {
    if (!liveApplyEnabled || applying || !onApplyRemoteBatches || causallyReadyRemoteBatches.length === 0) {
      return;
    }

    if (remoteConflicts.length > 0) {
      if (unappliedCleanOperations.length === 0 || cleanApplyAttemptedSignatureRef.current === cleanApplySignature) {
        return;
      }

      void applyRemoteBatches({ allowConflicts: false, cleanOnly: true });
      return;
    }

    if (autoApplyBlockedSignatureRef.current === readyApplySignature) {
      return;
    }

    void applyRemoteBatches({ allowConflicts: false });
  }, [applying, applyRemoteBatches, causallyReadyRemoteBatches.length, cleanApplySignature, liveApplyEnabled, onApplyRemoteBatches, readyApplySignature, remoteConflicts.length, unappliedCleanOperations.length]);

  if (!projectId) {
    return null;
  }

  return (
    <div className="space-y-3 rounded-md border border-border p-3 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 font-medium">
            <RadioTower className="size-4 text-muted-foreground" />
            Collaboration activity
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {syncState === "error"
              ? (errorMessage ?? "Collaboration activity failed to load.")
              : convergenceIssues.length
                ? causalRecoveryState === "recovering"
                  ? "Recovering missing remote causal history before applying."
                  : causallyReadyRemoteBatches.length
                    ? `${remoteOperationCount} causally ready remote ${remoteOperationCount === 1 ? "operation" : "operations"} can merge while ${blockedRemoteBatches.length} ${blockedRemoteBatches.length === 1 ? "batch waits" : "batches wait"}.`
                  : `${convergenceIssues.length} remote causal ${convergenceIssues.length === 1 ? "issue needs" : "issues need"} recovery before applying.`
              : remoteConflicts.length
                ? `${remoteConflicts.length} remote sync ${remoteConflicts.length === 1 ? "operation needs" : "operations need"} review before applying.`
                : unappliedRemoteBatches.length
                ? `${remoteOperationCount} remote sync ${remoteOperationCount === 1 ? "operation" : "operations"} since this editor baseline.`
                : remoteBatches.length
                ? "Remote activity is applied locally. Save to confirm the merged cloud state."
                : "No collaborator operation batches since this editor baseline."}
          </p>
        </div>
        <Badge className="shrink-0 rounded-md text-[11px]" variant={remoteConflicts.length || (convergenceIssues.length && !causallyReadyRemoteBatches.length) ? "destructive" : unappliedRemoteBatches.length ? "secondary" : "outline"}>
          {syncState === "loading"
            ? "Checking"
            : convergenceIssues.length
              ? causallyReadyRemoteBatches.length
                ? "Ready prefix"
                : "Causal wait"
              : remoteConflicts.length
                ? "Review needed"
                : unappliedRemoteBatches.length
                  ? "Remote activity"
                  : remoteBatches.length
                    ? "Applied"
                    : "Log synced"}
        </Badge>
      </div>

      {latestRemoteBatch ? (
        <div className="rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
          <div className="truncate font-medium text-foreground">{latestRemoteBatch.userName || latestRemoteBatch.userEmail}</div>
          <div>{summarizeBatch(latestRemoteBatch)}</div>
          <div>{formatActivityTime(latestRemoteBatch.createdAt)}</div>
        </div>
      ) : null}

      {convergenceIssues.length > 0 ? (
        <div className="space-y-1 rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-xs">
          <div className="font-medium text-amber-700 dark:text-amber-300">Waiting for causal remote history</div>
          <ul className="space-y-1 text-muted-foreground">
            {visibleConvergenceIssues.map((issue, index) => (
              <li key={`${issue.kind}-${issue.clientId}-${issue.expectedSequence ?? "none"}-${issue.actualSequence ?? "none"}-${index}`}>{issue.label}</li>
            ))}
          </ul>
          {convergenceIssues.length > visibleConvergenceIssues.length ? (
            <div className="text-muted-foreground">
              {convergenceIssues.length - visibleConvergenceIssues.length} more causal {convergenceIssues.length - visibleConvergenceIssues.length === 1 ? "issue" : "issues"} found.
            </div>
          ) : null}
          {causalRecoveryStatusText ? <div className="text-muted-foreground">{causalRecoveryStatusText}</div> : null}
        </div>
      ) : null}

      {remoteConflicts.length > 0 ? (
        <div className="space-y-1 rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs">
          <div className="font-medium text-destructive">Review remote conflicts before applying</div>
          <ul className="space-y-1 text-muted-foreground">
            {visibleRemoteConflicts.map((conflict, index) => (
              <li key={`${conflict.operationKind}-${conflict.objectId ?? conflict.field ?? "document"}-${index}`}>{conflict.label}</li>
            ))}
          </ul>
          {remoteConflicts.length > visibleRemoteConflicts.length ? (
            <div className="text-muted-foreground">
              {remoteConflicts.length - visibleRemoteConflicts.length} more {remoteConflicts.length - visibleRemoteConflicts.length === 1 ? "item" : "items"} need review.
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3 rounded-md bg-muted/40 px-2 py-1 text-xs text-muted-foreground">
        <span className="min-w-0 flex-1">{streamStatusText}</span>
        <Badge className="shrink-0 rounded-md text-[10px]" variant={streamState === "live" ? "secondary" : "outline"}>
          {getStreamStatusBadgeText(streamState, streamTransport)}
        </Badge>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-md bg-muted/30 px-2 py-1 text-xs text-muted-foreground">
        <span className="min-w-0 flex-1">{causalFrontierSummary.detail}</span>
        <Badge className="shrink-0 rounded-md text-[10px]" variant={causalFrontierSummary.status === "tracking" ? "secondary" : "outline"}>
          {causalFrontierSummary.label}
        </Badge>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-md bg-muted/30 px-2 py-1 text-xs text-muted-foreground">
        <span className="min-w-0 flex-1">{appliedFrontierSummary.detail}</span>
        <Badge className="shrink-0 rounded-md text-[10px]" variant={appliedFrontierSummary.status === "tracking" ? "secondary" : "outline"}>
          {appliedFrontierSummary.label}
        </Badge>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-md bg-muted/30 px-2 py-1 text-xs text-muted-foreground">
        <span className="min-w-0 flex-1">{partialOperationAckSummary.detail}</span>
        <Badge className="shrink-0 rounded-md text-[10px]" variant={partialOperationAckSummary.status === "tracking" ? "secondary" : "outline"}>
          {partialOperationAckSummary.label}
        </Badge>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-md bg-muted/30 px-2 py-1 text-xs text-muted-foreground">
        <span className="min-w-0 flex-1">{crdtMergeSummary.detail}</span>
        <Badge className="shrink-0 rounded-md text-[10px]" variant={crdtMergeSummary.status === "merged" ? "secondary" : "outline"}>
          {crdtMergeSummary.label}
        </Badge>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-md bg-muted/30 px-2 py-1 text-xs text-muted-foreground">
        <span className="min-w-0 flex-1">{crdtApplySummary.detail}</span>
        <Badge className="shrink-0 rounded-md text-[10px]" variant={crdtApplySummary.status === "review" ? "destructive" : crdtApplySummary.status === "clean" ? "secondary" : "outline"}>
          {crdtApplySummary.label}
        </Badge>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-md bg-muted/30 px-2 py-1 text-xs text-muted-foreground">
        <span className="min-w-0 flex-1">
          {lastReplayCheckpoint?.streamCursor
            ? `${replayCheckpointSummary.detail} Cursor ${formatActivityTime(lastReplayCheckpoint.streamCursor)}.`
            : replayCheckpointSummary.detail}
        </span>
        <Badge className="shrink-0 rounded-md text-[10px]" variant={replayCheckpointSummary.status === "acked" ? "secondary" : "outline"}>
          {replayCheckpointSummary.label}
        </Badge>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-md bg-muted/30 px-2 py-1 text-xs text-muted-foreground">
        <span className="min-w-0 flex-1">
          {streamRecoverySummary.streamCursor
            ? `${streamRecoverySummary.detail} Latest resume point ${formatActivityTime(streamRecoverySummary.streamCursor)}.`
            : streamRecoverySummary.detail}
        </span>
        <Badge className="shrink-0 rounded-md text-[10px]" variant={streamRecoverySummary.status === "resumed" ? "secondary" : "outline"}>
          {streamRecoverySummary.label}
        </Badge>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-md border border-border px-2 py-2">
        <div className="min-w-0">
          <div className="text-xs font-medium">Live apply clean operations</div>
          <div className="text-[11px] text-muted-foreground">
            {convergenceIssues.length
              ? causallyReadyRemoteBatches.length
                ? "Ready remote prefixes can merge while later history recovers."
                : "Remote causal history must be complete first."
              : remoteConflicts.length
                ? unappliedCleanOperations.length
                  ? "Clean remote operations can merge before conflicted operations are reviewed."
                  : "Remote conflicts still require review."
                : "Conflict-free remote edits merge as they arrive."}
          </div>
        </div>
        <Switch aria-label="Toggle live apply for clean collaboration operations" checked={liveApplyEnabled} onCheckedChange={updateLiveApplyPreference} />
      </div>

      <Button className="h-8 w-full gap-2" disabled={syncState === "loading"} size="sm" variant="secondary" onClick={handleManualRefresh}>
        {syncState === "loading" ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
        Refresh activity
      </Button>
      {causallyReadyRemoteBatches.length && onApplyRemoteBatches ? (
        <Button className="h-8 w-full gap-2" disabled={applying} size="sm" onClick={() => void applyRemoteBatches({ allowConflicts: reviewConfirmed || remoteConflicts.length === 0 })}>
          {applying ? <Loader2 className="size-4 animate-spin" /> : null}
          {remoteConflicts.length ? (reviewConfirmed ? "Apply reviewed activity" : "Review before apply") : applying ? "Applying clean activity" : convergenceIssues.length ? "Apply ready activity" : "Apply remote activity"}
        </Button>
      ) : null}
    </div>
  );
}
