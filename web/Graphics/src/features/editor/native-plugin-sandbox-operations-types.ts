import type {
  EditorPluginManifest,
  EditorPluginNetworkAccess,
  EditorPluginRunHistoryEntry,
} from "@/features/editor/editor-plugin-api";

export type NativePluginSandboxStatus = "ready" | "review" | "blocked";

export type NativePluginSandboxCategory =
  | "crash-isolation"
  | "offline-execution"
  | "operator-evidence"
  | "permission-prompts"
  | "replay-evidence";

export type NativePluginSandboxPacketKind =
  | "crash-isolation-rehearsal"
  | "offline-policy-review"
  | "operator-export"
  | "permission-prompt-review"
  | "replay-evidence-audit";

export type NativePluginPermissionPromptReview = {
  id: string;
  status: NativePluginSandboxStatus;
  pluginId: string;
  pluginName: string;
  permissionCount: number;
  grantedPermissionCount: number;
  approvalPinned: boolean;
  writePermission: boolean;
  detail: string;
  recommendation: string;
};

export type NativePluginOfflineExecutionPolicy = {
  id: string;
  status: NativePluginSandboxStatus;
  pluginId: string;
  pluginName: string;
  networkAccess: EditorPluginNetworkAccess | "unknown";
  localEntryPoint: boolean;
  isolated: boolean;
  offlineExecutable: boolean;
  detail: string;
  recommendation: string;
};

export type NativePluginCrashIsolationReview = {
  id: string;
  status: NativePluginSandboxStatus;
  pluginId: string;
  pluginName: string;
  timeoutMs: number;
  memoryLimitMb: number;
  crashLikeRunCount: number;
  blockedRunCount: number;
  isolated: boolean;
  detail: string;
  recommendation: string;
};

export type NativePluginReplayEvidenceReview = {
  id: string;
  status: NativePluginSandboxStatus;
  pluginId: string;
  pluginName: string;
  completedRunCount: number;
  replayRunCount: number;
  versionMismatchCount: number;
  latestRunAt: string | null;
  detail: string;
  recommendation: string;
};

export type NativePluginSandboxRow = {
  id: string;
  status: NativePluginSandboxStatus;
  category: NativePluginSandboxCategory;
  pluginId: string;
  pluginName: string;
  label: string;
  detail: string;
  metric: number;
  threshold: number;
  packetIds: string[];
  recommendation: string;
};

export type NativePluginSandboxPacket = {
  id: string;
  kind: NativePluginSandboxPacketKind;
  status: NativePluginSandboxStatus;
  label: string;
  detail: string;
  pluginIds: string[];
  steps: string[];
  evidenceCount: number;
};

export type NativePluginSandboxOperationsReport = {
  generatedAt: string;
  status: NativePluginSandboxStatus;
  score: number;
  manifestCount: number;
  widgetManifestCount: number;
  permissionPromptCount: number;
  permissionPromptBlockedCount: number;
  offlinePolicyReadyCount: number;
  offlinePolicyBlockedCount: number;
  crashIsolationReadyCount: number;
  crashIsolationBlockedCount: number;
  replayEvidenceReadyCount: number;
  replayEvidenceBlockedCount: number;
  crashLikeRunCount: number;
  blockedRunCount: number;
  operatorEvidenceCount: number;
  readyCount: number;
  reviewCount: number;
  blockedCount: number;
  permissionPrompts: NativePluginPermissionPromptReview[];
  offlinePolicies: NativePluginOfflineExecutionPolicy[];
  crashIsolation: NativePluginCrashIsolationReview[];
  replayEvidence: NativePluginReplayEvidenceReview[];
  rows: NativePluginSandboxRow[];
  operationPackets: NativePluginSandboxPacket[];
  operatorEvidence: string[];
};

export type NativePluginSandboxOperationsInput = {
  approvals: Record<string, import("@/features/editor/editor-plugin-api").EditorPluginApprovalRecord>;
  generatedAt?: string;
  grants: Record<string, boolean>;
  manifests: EditorPluginManifest[];
  runHistory: EditorPluginRunHistoryEntry[];
};
