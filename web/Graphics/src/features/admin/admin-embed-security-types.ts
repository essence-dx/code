import type {
  EmbedFramePolicy,
  EmbedSandboxPreset,
} from "@/features/embed-security/types";

export type AdminEmbedSecurityStatus = "ready" | "review" | "blocked";
export type AdminEmbedSecurityRowCategory =
  | "allowlist"
  | "evidence"
  | "frame-policy"
  | "sandbox";

export type AdminEmbedSecurityShare = {
  id: string;
  fileId: string;
  fileName: string;
  ownerEmail: string;
  token: string;
  disabledAt: string | null;
};

export type AdminEmbedSecurityAnalyticsRoute = {
  shareId: string;
  routeKind: string;
  referrerOrigins: string[];
  referrerKinds: string[];
  hostnames: string[];
  eventCount: number;
  last7dCount: number;
  latestAt: string | null;
};

export type AdminEmbedSecurityTarget = {
  id: string;
  shareId: string;
  fileId: string;
  fileName: string;
  ownerEmail: string;
  status: AdminEmbedSecurityStatus;
  framePolicy: EmbedFramePolicy;
  sandboxPreset: EmbedSandboxPreset;
  sandboxAttributes: string;
  allowedOrigins: string[];
  configured: boolean;
  observedOrigins: string[];
  allowedObservedOrigins: string[];
  blockedObservedOrigins: string[];
  hostnames: string[];
  eventCount: number;
  last7dCount: number;
  latestAt: string | null;
  recommendation: string;
};

export type AdminEmbedSecurityRow = {
  id: string;
  targetId: string;
  category: AdminEmbedSecurityRowCategory;
  status: AdminEmbedSecurityStatus;
  label: string;
  detail: string;
  recommendation: string;
  count: number;
  latestAt: string | null;
};

export type AdminEmbedSecurityReport = {
  generatedAt: string;
  status: AdminEmbedSecurityStatus;
  score: number;
  embedShareCount: number;
  configuredAllowlistCount: number;
  selfPolicyCount: number;
  allowlistPolicyCount: number;
  denyPolicyCount: number;
  strictSandboxCount: number;
  trustedSandboxCount: number;
  observedOriginCount: number;
  allowedObservedOriginCount: number;
  blockedObservedOriginCount: number;
  missingHostEvidenceCount: number;
  readyCount: number;
  reviewCount: number;
  blockedCount: number;
  targets: AdminEmbedSecurityTarget[];
  rows: AdminEmbedSecurityRow[];
  commands: string[];
};

export type AdminEmbedSecurityInput = {
  analyticsRoutes: AdminEmbedSecurityAnalyticsRoute[];
  appOrigin?: string | null;
  env?: Record<string, string | undefined>;
  generatedAt?: string;
  shares: AdminEmbedSecurityShare[];
};
