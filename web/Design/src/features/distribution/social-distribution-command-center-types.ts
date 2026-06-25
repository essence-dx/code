import type { ApprovalStatus } from "@/features/review/approval-status";

export type SocialDistributionStatus = "ready" | "review" | "blocked";

export type SocialPlatformId =
  | "instagram"
  | "tiktok"
  | "youtube"
  | "linkedin"
  | "pinterest"
  | "x";

export type SocialPlatformCropMode = "fit" | "crop" | "pad";

export type SocialPlatformCropPreview = {
  id: string;
  platformId: SocialPlatformId;
  platformLabel: string;
  projectId: string;
  projectName: string;
  sourceWidth: number;
  sourceHeight: number;
  targetWidth: number;
  targetHeight: number;
  targetLabel: string;
  cropMode: SocialPlatformCropMode;
  status: SocialDistributionStatus;
  scalePercent: number;
  safeAreaWarning: string | null;
  detail: string;
};

export type SocialApprovalQueueItem = {
  id: string;
  platformId: SocialPlatformId;
  platformLabel: string;
  scheduleItemId: string | null;
  campaignId: string | null;
  campaignName: string | null;
  deliverableId: string | null;
  projectId: string;
  projectName: string;
  scheduledAt: string | null;
  scheduleStatus: string;
  approvalStatus: ApprovalStatus | "missing";
  captionReady: boolean;
  cropPreviewId: string | null;
  status: SocialDistributionStatus;
  nextAction: string;
};

export type SocialCaptionVersion = {
  id: string;
  source: "schedule" | "audit-log" | "project-version";
  label: string;
  caption: string;
  createdAt: string;
};

export type SocialCaptionVersionHistory = {
  id: string;
  scheduleItemId: string;
  projectId: string | null;
  projectName: string | null;
  platformId: SocialPlatformId;
  platformLabel: string;
  currentCaption: string;
  versions: SocialCaptionVersion[];
};

export type ScheduledPostRecoveryPacket = {
  id: string;
  scheduleItemId: string;
  projectId: string;
  projectName: string;
  platformId: SocialPlatformId;
  platformLabel: string;
  fileName: string;
  dataUrl: string;
  status: SocialDistributionStatus;
  steps: string[];
};

export type SocialDistributionCommandCenter = {
  generatedAt: string;
  status: SocialDistributionStatus;
  score: number;
  platformCropPreviews: SocialPlatformCropPreview[];
  approvalQueue: SocialApprovalQueueItem[];
  captionHistories: SocialCaptionVersionHistory[];
  recoveryPackets: ScheduledPostRecoveryPacket[];
  nextActions: string[];
  totals: {
    platforms: number;
    cropPreviews: number;
    approvalQueue: number;
    captionHistories: number;
    captionVersions: number;
    recoveryPackets: number;
    blockedItems: number;
  };
};
