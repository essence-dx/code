import type { ApprovalStatus } from "@/features/review/approval-status";

export type ClientAnalyticsHandoffStatus = "ready" | "review" | "blocked";

export type ClientAnalyticsMilestoneKind =
  | "approval"
  | "scheduled-publish"
  | "export"
  | "handoff"
  | "report-refresh";

export type ClientAnalyticsStakeholderView = {
  label: string;
  href: string | null;
  safeShare: boolean;
  canComment: boolean;
  rawActorEmailsExposed: boolean;
  exposedFields: string[];
  redactions: string[];
};

export type ClientAnalyticsSnapshot = {
  id: string;
  status: ClientAnalyticsHandoffStatus;
  campaignId: string | null;
  campaignName: string | null;
  websiteViews: number;
  websiteClicks: number;
  formSubmissions: number;
  conversionRate: number;
  publishedItems: number;
  exportArtifacts: number;
  reportDashboardCount: number;
  exportReadyDashboards: number;
  summary: string;
};

export type ClientAnalyticsApprovalContext = {
  status: ClientAnalyticsHandoffStatus;
  approvalStatus: ApprovalStatus;
  packetStatus: ClientAnalyticsHandoffStatus;
  packetScore: number;
  openTasks: number;
  overdueTasks: number;
  resolvedTasks: number;
  deliverableApprovalStatus: ApprovalStatus | null;
  latestApprovalSummary: string | null;
  blockers: string[];
};

export type ClientAnalyticsDeliveryMilestone = {
  id: string;
  kind: ClientAnalyticsMilestoneKind;
  label: string;
  status: ClientAnalyticsHandoffStatus;
  date: string | null;
  detail: string;
};

export type ClientAnalyticsDeliveryTimeline = {
  status: ClientAnalyticsHandoffStatus;
  nextDeliveryAt: string | null;
  summary: string;
  milestones: ClientAnalyticsDeliveryMilestone[];
};

export type ClientAnalyticsEvidenceBundle = {
  id: string;
  status: ClientAnalyticsHandoffStatus;
  generatedAt: string;
  fileName: string;
  dataUrl: string;
};

export type ClientAnalyticsHandoffRoom = {
  id: string;
  projectId: string;
  projectName: string;
  campaignId: string | null;
  campaignName: string | null;
  status: ClientAnalyticsHandoffStatus;
  score: number;
  nextAction: string;
  stakeholderView: ClientAnalyticsStakeholderView;
  analyticsSnapshot: ClientAnalyticsSnapshot;
  approvalContext: ClientAnalyticsApprovalContext;
  deliveryTimeline: ClientAnalyticsDeliveryTimeline;
  evidenceBundle: ClientAnalyticsEvidenceBundle;
};

export type ClientAnalyticsHandoffRoomCenter = {
  generatedAt: string;
  status: ClientAnalyticsHandoffStatus;
  score: number;
  rooms: ClientAnalyticsHandoffRoom[];
  nextActions: string[];
  totals: {
    rooms: number;
    safeViews: number;
    analyticsSnapshots: number;
    approvalContexts: number;
    deliveryMilestones: number;
    evidenceBundles: number;
    blockedRooms: number;
  };
};
