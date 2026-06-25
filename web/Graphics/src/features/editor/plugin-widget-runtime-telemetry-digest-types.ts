import type { NativePluginSandboxOperationsReport } from "@/features/editor/native-plugin-sandbox-operations";
import type { PluginWidgetRuntimeOperationsReport } from "@/features/editor/plugin-widget-runtime-operations";

export type PluginWidgetTelemetryDigestStatus = "ready" | "review" | "blocked";

export type PluginWidgetTelemetryDigestCategory =
  | "admin-escalation"
  | "blocked-runs"
  | "crash-isolation"
  | "permission-prompts"
  | "replay-mismatches";

export type PluginWidgetTelemetryDigestRow = {
  id: string;
  status: PluginWidgetTelemetryDigestStatus;
  category: PluginWidgetTelemetryDigestCategory;
  label: string;
  detail: string;
  metric: number;
  threshold: number;
  pluginIds: string[];
  escalationIds: string[];
  recommendation: string;
};

export type PluginWidgetAdminEscalationQueueItem = {
  id: string;
  status: PluginWidgetTelemetryDigestStatus;
  category: PluginWidgetTelemetryDigestCategory;
  pluginId: string;
  pluginName: string;
  reason: string;
  detail: string;
  recommendation: string;
};

export type PluginWidgetTelemetryDigestReport = {
  generatedAt: string;
  status: PluginWidgetTelemetryDigestStatus;
  score: number;
  permissionPromptCount: number;
  permissionPromptBlockedCount: number;
  blockedRunCount: number;
  replayMismatchCount: number;
  crashIsolationBlockedCount: number;
  crashLikeRunCount: number;
  adminEscalationQueueCount: number;
  widgetRuntimeCount: number;
  manifestCount: number;
  readyCount: number;
  reviewCount: number;
  blockedCount: number;
  rows: PluginWidgetTelemetryDigestRow[];
  adminEscalationQueue: PluginWidgetAdminEscalationQueueItem[];
  pluginWidgetRuntimeOperations: PluginWidgetRuntimeOperationsReport;
  nativePluginSandbox: NativePluginSandboxOperationsReport;
};

export type PluginWidgetTelemetryDigestInput = {
  generatedAt?: string;
  nativePluginSandbox: NativePluginSandboxOperationsReport;
  pluginWidgetRuntimeOperations: PluginWidgetRuntimeOperationsReport;
};
