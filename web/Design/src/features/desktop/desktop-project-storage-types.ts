import type { DesignDocument } from "@/features/editor/types";

export const desktopProjectStorageVersion = 1;
export const desktopProjectStorageKey =
  "essence-studio.desktop-project-storage.v1";

export type DesktopProjectStorageLike = Pick<
  Storage,
  "getItem" | "setItem" | "removeItem"
>;

export type DesktopProjectMutationKind =
  | "project-document-save"
  | "asset-cache"
  | "conflict-resolution";

export type DesktopProjectMutationStatus =
  | "queued"
  | "syncing"
  | "conflict"
  | "synced"
  | "failed";

export type DesktopProjectAssetResumeStatus = "ready" | "resumable" | "blocked";

export type DesktopProjectAssetReference = {
  cacheKey: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  sourcePageId: string | null;
  sourceElementId: string | null;
  resumeStatus: DesktopProjectAssetResumeStatus;
};

export type DesktopProjectDatabaseRecord = {
  version: typeof desktopProjectStorageVersion;
  projectId: string;
  projectName: string;
  baseUpdatedAt: string;
  localUpdatedAt: string;
  localRevision: number;
  document: DesignDocument;
  assetReferences: DesktopProjectAssetReference[];
  pendingMutationIds: string[];
  conflictMutationIds: string[];
};

export type DesktopProjectMutationRecord = {
  id: string;
  projectId: string;
  projectName: string;
  kind: DesktopProjectMutationKind;
  status: DesktopProjectMutationStatus;
  baseUpdatedAt: string;
  localRevision: number;
  createdAt: string;
  updatedAt: string;
  document: DesignDocument | null;
  assetReferences: DesktopProjectAssetReference[];
  attempts: number;
  remoteUpdatedAt: string | null;
  failureReason: string | null;
};

export type DesktopProjectConflictReplayAction =
  | "load-base"
  | "resume-assets"
  | "apply-local-document"
  | "compare-remote"
  | "mark-conflict"
  | "confirm-sync";

export type DesktopProjectConflictReplayStep = {
  id: string;
  order: number;
  mutationId: string;
  projectId: string;
  action: DesktopProjectConflictReplayAction;
  status: "ready" | "review" | "blocked";
  detail: string;
  evidenceIds: string[];
};

export type DesktopProjectStorageState = {
  version: typeof desktopProjectStorageVersion;
  databases: DesktopProjectDatabaseRecord[];
  mutationQueue: DesktopProjectMutationRecord[];
  replayPlan: DesktopProjectConflictReplayStep[];
  totals: {
    localDatabases: number;
    assetReferences: number;
    pendingMutations: number;
    conflictMutations: number;
    syncedMutations: number;
    blockedAssets: number;
    resumableAssets: number;
    replaySteps: number;
  };
  fingerprint: string;
};
