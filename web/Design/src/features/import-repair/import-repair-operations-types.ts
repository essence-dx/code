import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type {
  ProjectSummary,
  ProjectVersionSummary,
} from "@/features/editor/types";
import type { ProjectAuditSummary } from "@/features/projects/project-audit-center";
import type { MixedFormatWorkspaceOrchestration } from "@/features/visual-suite/mixed-format-orchestration";

export type ImportRepairFormat =
  | "pdf"
  | "pptx"
  | "docx"
  | "xlsx"
  | "svg"
  | "media";

export type ImportRepairStatus = "ready" | "review" | "blocked";

export type ImportRepairSeverity = "info" | "review" | "blocked";

export type ImportRepairMappingDiff = {
  id: string;
  source: string;
  target: string;
  gap: string;
  repair: string;
  severity: ImportRepairSeverity;
};

export type ImportRepairRetryStrategy = {
  id: string;
  title: string;
  maxAttempts: number;
  steps: string[];
  fallback: string;
};

export type ImportRepairEvidenceProject = {
  projectId: string;
  projectName: string;
  href: string;
  pageCount: number;
  readinessScore: number;
  status: ImportRepairStatus;
  pageTypeLabels: string[];
  gaps: string[];
  hasVersion: boolean;
  auditScore: number | null;
  auditStatus: ImportRepairStatus | null;
  auditLogCount: number;
  latestAt: string;
};

export type ImportRepairEvidencePacket = {
  id: string;
  title: string;
  format: ImportRepairFormat;
  status: ImportRepairStatus;
  generatedAt: string;
  projectIds: string[];
  checks: string[];
  mappingDiffIds: string[];
  retryStrategyId: string;
  downloadJson: string;
};

export type ImportRepairOperation = {
  format: ImportRepairFormat;
  label: string;
  sourceNoun: string;
  status: ImportRepairStatus;
  score: number;
  acceptedSources: string[];
  sourceLimits: string[];
  capabilitySummary: string[];
  mappingDiffs: ImportRepairMappingDiff[];
  retryStrategy: ImportRepairRetryStrategy;
  evidenceProjects: ImportRepairEvidenceProject[];
  evidencePacket: ImportRepairEvidencePacket;
  latestEvidenceAt: string | null;
};

export type ImportRepairOperationsCenter = {
  status: ImportRepairStatus;
  score: number;
  generatedAt: string;
  operations: ImportRepairOperation[];
  nextActions: string[];
  totals: {
    formats: number;
    readyFormats: number;
    blockedFormats: number;
    mappingDiffs: number;
    retryStrategies: number;
    evidencePackets: number;
    projectsWithEvidence: number;
  };
};

export type ImportRepairOperationsInput = {
  projects: ProjectSummary[];
  mixedFormatOrchestration: MixedFormatWorkspaceOrchestration;
  projectAudits: ProjectAuditSummary[];
  projectVersions: ProjectVersionSummary[];
  auditLogs: WorkspaceAuditLogSummary[];
  generatedAt?: string;
};

export type ImportRepairCapability = {
  format: ImportRepairFormat;
  label: string;
  sourceNoun: string;
  acceptedSources: string[];
  sourceLimits: string[];
  capabilitySummary: string[];
  nameHints: RegExp[];
  pageTypeHints: string[];
  mappingDiffs: ImportRepairMappingDiff[];
  retryStrategy: ImportRepairRetryStrategy;
};
