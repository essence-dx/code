import type { PublicRouteKind } from "@/features/public-route-analytics/types";

export type AdminPublicRouteAnalyticsStatus = "ready" | "review" | "blocked";
export type AdminPublicRouteAnalyticsRowCategory =
  | "capture"
  | "coverage"
  | "referrer"
  | "retention"
  | "storage";

export type AdminPublicRouteAnalyticsShare = {
  id: string;
  fileId: string;
  fileName: string;
  ownerEmail: string;
  permissionPreset: string;
  accessLevel: string;
  allowComments: boolean;
  allowDownload: boolean;
  disabledAt: string | null;
};

export type AdminPublicRouteAnalyticsEvent = {
  id: string;
  shareId: string;
  fileId: string;
  routeKind: PublicRouteKind;
  tokenScope: string;
  referrerOrigin: string | null;
  referrerKind: string;
  userAgentFamily: string;
  host: string | null;
  viewportWidth: number | null;
  viewportHeight: number | null;
  retentionExpiresAt: string;
  createdAt: string;
};

export type AdminPublicRouteAnalyticsRoute = {
  id: string;
  shareId: string;
  fileId: string;
  fileName: string;
  ownerEmail: string;
  routeKind: PublicRouteKind;
  tokenScope: string;
  status: AdminPublicRouteAnalyticsStatus;
  eventCount: number;
  last24hCount: number;
  last7dCount: number;
  referrerOrigins: string[];
  referrerKinds: string[];
  userAgentFamilies: string[];
  hostnames: string[];
  latestAt: string | null;
  earliestRetentionExpiresAt: string | null;
  recommendation: string;
};

export type AdminPublicRouteAnalyticsRow = {
  id: string;
  routeId: string;
  category: AdminPublicRouteAnalyticsRowCategory;
  status: AdminPublicRouteAnalyticsStatus;
  label: string;
  detail: string;
  recommendation: string;
  count: number;
  latestAt: string | null;
};

export type AdminPublicRouteAnalyticsReport = {
  generatedAt: string;
  status: AdminPublicRouteAnalyticsStatus;
  score: number;
  storageAvailable: boolean;
  retentionDays: number;
  activeShareCount: number;
  routeCount: number;
  eventCount: number;
  last24hEventCount: number;
  last7dEventCount: number;
  shareRouteEventCount: number;
  prototypeRouteEventCount: number;
  embedRouteEventCount: number;
  directReferrerCount: number;
  internalReferrerCount: number;
  externalReferrerCount: number;
  unknownReferrerCount: number;
  botEventCount: number;
  retentionExpiredCount: number;
  missingCoverageCount: number;
  readyCount: number;
  reviewCount: number;
  blockedCount: number;
  routes: AdminPublicRouteAnalyticsRoute[];
  rows: AdminPublicRouteAnalyticsRow[];
  commands: string[];
};

export type AdminPublicRouteAnalyticsInput = {
  events: AdminPublicRouteAnalyticsEvent[];
  generatedAt?: string;
  now?: number;
  retentionDays: number;
  shares: AdminPublicRouteAnalyticsShare[];
  storageAvailable: boolean;
};
