import type { AdminPublishChannelManagerReport } from "@/features/admin/admin-publish-channel-manager";
import type { ProductionDeploySmokeReport } from "@/features/editor/production-deploy-smoke";
import type { DesignDocument } from "@/features/editor/types";

export type AdminPublicLinkStatus = "ready" | "review" | "blocked";
export type AdminPublicLinkSurfaceKind = "embed" | "handoff" | "prototype";
export type AdminPublicLinkRowCategory =
  | "embed"
  | "expiry"
  | "exposure"
  | "referrer"
  | "release-safe"
  | "route-smoke";

export type AdminPublicLinkObservabilityFile = {
  fileId: string;
  fileName: string;
  ownerEmail: string;
  document: DesignDocument;
  updatedAt: string;
  trashedAt: string | null;
};

export type AdminPublicLinkObservabilityShare = {
  id: string;
  fileId: string;
  fileName: string;
  ownerEmail: string;
  token: string;
  sharePath: string;
  permissionPreset: string;
  accessLevel: string;
  allowComments: boolean;
  allowDownload: boolean;
  createdAt: string;
  expiresAt: string | null;
  disabledAt: string | null;
};

export type AdminPublicLinkObservabilityInput = {
  baseUrl: string;
  files: AdminPublicLinkObservabilityFile[];
  generatedAt?: string;
  now?: number;
  productionDeploySmoke: ProductionDeploySmokeReport;
  publishChannels: AdminPublishChannelManagerReport;
  referrerNotesByToken: Record<string, string>;
  shares: AdminPublicLinkObservabilityShare[];
};

export type AdminPublicLinkSurface = {
  id: string;
  shareId: string;
  token: string;
  kind: AdminPublicLinkSurfaceKind;
  status: AdminPublicLinkStatus;
  label: string;
  fileId: string;
  fileName: string;
  ownerEmail: string;
  targetUrl: string;
  routePath: string;
  permissionPreset: string;
  smokeStatus: AdminPublicLinkStatus;
  smokeLabel: string;
  expiryState: "expired" | "never" | "scheduled";
  stale: boolean;
  allowComments: boolean;
  allowDownload: boolean;
  referrerNote: string | null;
  releaseSafe: boolean;
  latestAt: string | null;
  blockerCount: number;
  reviewCount: number;
  blockers: string[];
  warnings: string[];
  recommendation: string;
};

export type AdminPublicLinkObservabilityRow = {
  id: string;
  surfaceId: string;
  category: AdminPublicLinkRowCategory;
  status: AdminPublicLinkStatus;
  label: string;
  targetUrl: string;
  detail: string;
  recommendation: string;
  latestAt: string | null;
};

export type AdminPublicLinkObservabilityReport = {
  generatedAt: string;
  status: AdminPublicLinkStatus;
  score: number;
  activeShareCount: number;
  surfaceCount: number;
  readyCount: number;
  reviewCount: number;
  blockedCount: number;
  embedSurfaceCount: number;
  prototypeSurfaceCount: number;
  staleLinkCount: number;
  noExpiryCount: number;
  downloadExposureCount: number;
  commentExposureCount: number;
  missingReferrerNoteCount: number;
  releaseSafeCount: number;
  routeSmokeBlockedCount: number;
  surfaces: AdminPublicLinkSurface[];
  rows: AdminPublicLinkObservabilityRow[];
  commands: string[];
};
