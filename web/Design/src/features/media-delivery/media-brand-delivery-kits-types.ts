import type { ServerExportJobSummary } from "@/features/editor/server-export-job-model";
import type {
  BrandColorSummary,
  BrandFontSummary,
  BrandLogoSummary,
  ProjectDetail,
} from "@/features/editor/types";
import type { MediaProductionReadinessReport } from "@/features/editor/media-production-readiness";
import type { ProjectHandoffPacket } from "@/features/projects/project-handoff-packet";

export type MediaBrandDeliveryKitStatus = "ready" | "review" | "blocked";

export type LowerThirdPresetRole = "speaker" | "section" | "call-to-action";

export type MediaLowerThirdPreset = {
  id: string;
  role: LowerThirdPresetRole;
  label: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  textColor: string;
  surfaceColor: string;
  accentColor: string;
  durationSeconds: number;
  safeAreaPercent: number;
  previewText: string;
};

export type BumperOutroPresetKind = "bumper" | "outro";

export type MediaBumperOutroPreset = {
  id: string;
  kind: BumperOutroPresetKind;
  label: string;
  durationSeconds: number;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  logoIncluded: boolean;
  copy: string;
};

export type MediaAudioLoudnessCheck = {
  id: string;
  status: MediaBrandDeliveryKitStatus;
  targetLufs: number;
  estimatedLufs: number | null;
  peakVolume: number;
  duckingCoveragePercent: number;
  detail: string;
  action: string;
};

export type MediaTimelineQaReport = {
  id: string;
  status: MediaBrandDeliveryKitStatus;
  score: number;
  readiness: MediaProductionReadinessReport;
  checks: {
    id: string;
    label: string;
    status: MediaBrandDeliveryKitStatus;
    detail: string;
    action: string;
  }[];
};

export type MediaBrandDeliveryManifestItem = {
  id: string;
  kind:
    | "lower-third"
    | "bumper"
    | "outro"
    | "loudness"
    | "timeline"
    | "artifact"
    | "metadata"
    | "blocker";
  label: string;
  detail: string;
};

export type MediaBrandDeliveryPacket = {
  id: string;
  title: string;
  status: MediaBrandDeliveryKitStatus;
  generatedAt: string;
  manifest: MediaBrandDeliveryManifestItem[];
  downloadJson: string;
};

export type MediaBrandDeliveryKit = {
  id: string;
  projectId: string;
  projectName: string;
  status: MediaBrandDeliveryKitStatus;
  score: number;
  nextAction: string;
  lowerThirdPresets: MediaLowerThirdPreset[];
  bumperOutroPresets: MediaBumperOutroPreset[];
  audioLoudness: MediaAudioLoudnessCheck;
  timelineQa: MediaTimelineQaReport;
  exportSummary: {
    status: "ready" | "running" | "failed" | "missing";
    latestArtifactName: string | null;
    latestFormatLabel: string | null;
    completedCount: number;
    failedCount: number;
  };
  deliveryPacket: MediaBrandDeliveryPacket;
};

export type MediaBrandDeliveryKitCenter = {
  status: MediaBrandDeliveryKitStatus;
  score: number;
  generatedAt: string;
  kits: MediaBrandDeliveryKit[];
  nextActions: string[];
  totals: {
    projects: number;
    lowerThirdPresets: number;
    bumperOutroPresets: number;
    audioLoudnessChecks: number;
    timelineQaReports: number;
    deliveryPackets: number;
    readyKits: number;
    reviewKits: number;
    blockedKits: number;
  };
};

export type MediaBrandDeliveryKitCenterInput = {
  projects: ProjectDetail[];
  brandColors: BrandColorSummary[];
  brandFonts: BrandFontSummary[];
  brandLogos: BrandLogoSummary[];
  serverExportJobs: ServerExportJobSummary[];
  projectHandoffPackets: ProjectHandoffPacket[];
  now?: string | Date;
};
