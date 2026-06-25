import type { NativePluginSandboxOperationsReport } from "@/features/editor/native-plugin-sandbox-operations";
import type { PerformanceRegressionExport } from "@/features/editor/performance-regression-export";

export type DesktopSupportBundleStatus = "ready" | "review" | "blocked";

export type DesktopSupportBundleSignalKind =
  | "canvas-resume"
  | "cold-start"
  | "file-open"
  | "memory-pressure"
  | "plugin-run";

export type DesktopSupportBundleCategory =
  | DesktopSupportBundleSignalKind
  | "support-gate";

export type DesktopSupportBundleSignal = {
  id: string;
  kind: DesktopSupportBundleSignalKind;
  label: string;
  durationMs: number;
  thresholdMs: number;
  crashCount: number;
  memoryMb: number;
  detail: string;
  capturedAt: string;
  evidenceIds: string[];
};

export type DesktopSupportBundleRow = {
  id: string;
  status: DesktopSupportBundleStatus;
  category: DesktopSupportBundleCategory;
  label: string;
  detail: string;
  metric: number;
  threshold: number;
  signalIds: string[];
  evidenceIds: string[];
  recommendation: string;
};

export type DesktopSupportBundlePacket = {
  id: string;
  status: DesktopSupportBundleStatus;
  category: DesktopSupportBundleCategory;
  label: string;
  detail: string;
  signalIds: string[];
  evidence: string[];
  evidenceCount: number;
};

export type DesktopCrashPerformanceSupportBundleReport = {
  generatedAt: string;
  status: DesktopSupportBundleStatus;
  score: number;
  signalCount: number;
  coldStartCount: number;
  fileOpenCount: number;
  canvasResumeCount: number;
  pluginRunCount: number;
  memoryPressureCount: number;
  crashCount: number;
  slowSignalCount: number;
  supportPacketCount: number;
  readyCount: number;
  reviewCount: number;
  blockedCount: number;
  signals: DesktopSupportBundleSignal[];
  rows: DesktopSupportBundleRow[];
  bundles: DesktopSupportBundlePacket[];
  performanceRegression: PerformanceRegressionExport;
  nativePluginSandbox: NativePluginSandboxOperationsReport;
};

export type DesktopCrashPerformanceSupportBundleInput = {
  generatedAt?: string;
  nativePluginSandbox: NativePluginSandboxOperationsReport;
  performanceRegression: PerformanceRegressionExport;
  signals?: DesktopSupportBundleSignal[];
};
