import type { CommandAutomationRecordingReport } from "@/features/editor/command-automation-recording";
import type { LargeCanvasRenderSchedulerReport } from "@/features/editor/large-canvas-render-scheduler";
import type { MediaAssetPipelineReviewReport } from "@/features/editor/media-asset-pipeline-review";
import type { ProductionReadinessSynthesisPacket } from "@/features/editor/production-readiness-synthesis";
import type { TauriDesktopPackagingReadinessReport } from "@/features/editor/tauri-desktop-packaging-readiness";

export type NativeDesktopShipSynthesisStatus = "ready" | "review" | "blocked";

export type NativeDesktopShipSynthesisCategory =
  | "canvas-scheduler"
  | "command-automation"
  | "media-pipeline"
  | "production-evidence"
  | "ship-gate"
  | "tauri-runtime";

export type NativeDesktopShipDecision =
  | "ship"
  | "review-required"
  | "do-not-ship";

export type NativeDesktopReleasePacketKind =
  | "asset-bundle"
  | "desktop-parity"
  | "offline"
  | "qa-replay"
  | "release-packet"
  | "rollback";

export type NativeDesktopReleasePacket = {
  id: string;
  kind: NativeDesktopReleasePacketKind;
  category: NativeDesktopShipSynthesisCategory;
  status: NativeDesktopShipSynthesisStatus;
  label: string;
  detail: string;
  source: string;
  evidence: string[];
  evidenceCount: number;
};

export type NativeDesktopShipSynthesisRow = {
  id: string;
  status: NativeDesktopShipSynthesisStatus;
  category: NativeDesktopShipSynthesisCategory;
  label: string;
  detail: string;
  sourceScore: number;
  blockerCount: number;
  reviewCount: number;
  evidenceCount: number;
  releasePacketIds: string[];
  recommendation: string;
};

export type NativeDesktopShipSynthesisReport = {
  generatedAt: string;
  status: NativeDesktopShipSynthesisStatus;
  desktopShipDecision: NativeDesktopShipDecision;
  score: number;
  sourceCount: number;
  readyCount: number;
  reviewCount: number;
  blockedCount: number;
  blockerCount: number;
  reviewItemCount: number;
  evidenceCount: number;
  releasePacketCount: number;
  desktopParityEvidenceCount: number;
  rollbackEvidenceCount: number;
  offlineEvidenceCount: number;
  minimumScoreCategory: NativeDesktopShipSynthesisCategory;
  sourceScores: Record<NativeDesktopShipSynthesisCategory, number>;
  executiveSummary: string[];
  signoffChecklist: string[];
  rows: NativeDesktopShipSynthesisRow[];
  releasePackets: NativeDesktopReleasePacket[];
};

export type NativeDesktopShipSynthesisInput = {
  commandAutomation: CommandAutomationRecordingReport;
  generatedAt?: string;
  largeCanvasScheduler: LargeCanvasRenderSchedulerReport;
  mediaAssetPipeline: MediaAssetPipelineReviewReport;
  productionReadiness: ProductionReadinessSynthesisPacket;
  tauriDesktopPackaging: TauriDesktopPackagingReadinessReport;
};
