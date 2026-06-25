import type { AdminRollbackReadinessReport } from "@/features/admin/admin-rollback-readiness";
import type { AdminReleaseApprovalSnapshot } from "@/features/admin/admin-release-approval-snapshots";
import type { ProductionDeploySmokeReport } from "@/features/editor/production-deploy-smoke";
import type { DesignDocument } from "@/features/editor/types";

export type AdminPublishChannelStatus = "ready" | "review" | "blocked";
export type AdminPublishChannelKind = "prototype" | "release" | "share" | "site";
export type AdminPublishApprovalState =
  | "approved"
  | "blocked"
  | "missing"
  | "review";
export type AdminPublishRollbackState = "linked" | "missing" | "review";

export type AdminPublishChannelFile = {
  fileId: string;
  fileName: string;
  ownerEmail: string;
  document: DesignDocument;
  updatedAt: string;
  trashedAt: string | null;
};

export type AdminPublishChannelShare = {
  id: string;
  fileId: string;
  fileName: string;
  ownerEmail: string;
  sharePath: string;
  permissionPreset: string;
  accessLevel: string;
  allowComments: boolean;
  allowDownload: boolean;
  createdAt: string;
  expiresAt: string | null;
  disabledAt: string | null;
};

export type AdminPublishChannel = {
  id: string;
  kind: AdminPublishChannelKind;
  status: AdminPublishChannelStatus;
  label: string;
  fileId: string | null;
  fileName: string;
  ownerEmail: string;
  targetUrl: string;
  shareId: string | null;
  permissionPreset: string | null;
  approvalState: AdminPublishApprovalState;
  rollbackState: AdminPublishRollbackState;
  routeSmokeStatus: AdminPublishChannelStatus;
  routeSmokeLabel: string;
  routeSmokeAt: string | null;
  expiresAt: string | null;
  latestAt: string | null;
  blockerCount: number;
  reviewCount: number;
  evidence: string[];
  blockers: string[];
  warnings: string[];
  recommendation: string;
};

export type AdminPublishChannelRow = {
  id: string;
  channelId: string;
  kind: AdminPublishChannelKind;
  status: AdminPublishChannelStatus;
  category: "approval" | "rollback" | "smoke" | "target";
  label: string;
  targetUrl: string;
  detail: string;
  recommendation: string;
  latestAt: string | null;
};

export type AdminPublishChannelManagerReport = {
  generatedAt: string;
  status: AdminPublishChannelStatus;
  score: number;
  channelCount: number;
  readyCount: number;
  reviewCount: number;
  blockedCount: number;
  prototypeChannelCount: number;
  shareChannelCount: number;
  siteChannelCount: number;
  releaseChannelCount: number;
  staleChannelCount: number;
  approvalReadyCount: number;
  rollbackLinkedCount: number;
  routeSmokeBlockedCount: number;
  channels: AdminPublishChannel[];
  rows: AdminPublishChannelRow[];
  commands: string[];
};

export type AdminPublishChannelManagerInput = {
  baseUrl: string;
  files: AdminPublishChannelFile[];
  shares: AdminPublishChannelShare[];
  productionDeploySmoke: ProductionDeploySmokeReport;
  releaseApprovalSnapshots: AdminReleaseApprovalSnapshot[];
  rollbackReadiness: AdminRollbackReadinessReport;
  generatedAt?: string;
  now?: number;
};
