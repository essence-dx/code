import type { ReviewTaskSummary } from "@/db/project-comments";
import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type {
  DesignTemplateSummary,
  ProjectSummary,
  ProjectVersionSummary,
} from "@/features/editor/types";
import type { ProjectAuditSummary } from "@/features/projects/project-audit-center";
import type {
  TemplatePackageDependency,
  TemplatePackageEntry,
} from "@/features/templates/template-package-registry";

export type MarketplaceCreatorOperationStatus = "ready" | "review" | "blocked";

export type MarketplaceCreatorSubmissionStage =
  | "draft"
  | "review"
  | "changes-requested"
  | "approved"
  | "published";

export type MarketplaceCreatorModerationQueue =
  | "release-ready"
  | "license-review"
  | "trust-safety"
  | "rollback-readiness"
  | "curator-review"
  | "creator-support";

export type MarketplaceCreatorModerationPriority = "high" | "medium" | "low";

export type MarketplaceCreatorTrustScore = {
  status: MarketplaceCreatorOperationStatus;
  score: number;
  summary: string;
  signals: string[];
};

export type MarketplaceCreatorLicenseEvidence = {
  status: MarketplaceCreatorOperationStatus;
  score: number;
  summary: string;
  evidence: string[];
  gaps: string[];
};

export type MarketplaceCreatorRollbackPlan = {
  status: MarketplaceCreatorOperationStatus;
  score: number;
  summary: string;
  dependencies: TemplatePackageDependency[];
  restorePointCount: number;
  latestRestoreAt: string | null;
  installCount: number;
};

export type MarketplaceCreatorModerationRoute = {
  id: string;
  templateId: string;
  templateName: string;
  queue: MarketplaceCreatorModerationQueue;
  queueLabel: string;
  priority: MarketplaceCreatorModerationPriority;
  status: MarketplaceCreatorOperationStatus;
  owner: "creator" | "curator" | "ops";
  reason: string;
  relatedTaskIds: string[];
  dueAt: string | null;
};

export type MarketplaceCreatorVersionEvent = {
  id: string;
  title: string;
  detail: string;
  actorEmail: string | null;
  createdAt: string;
};

export type MarketplaceCreatorOperationPacket = {
  fileName: string;
  dataUrl: string;
  downloadJson: string;
};

export type MarketplaceCreatorSubmission = {
  id: string;
  templateId: string;
  templateName: string;
  creatorDetail: string;
  href: string;
  version: string;
  submissionStage: MarketplaceCreatorSubmissionStage;
  marketplaceLabel: string;
  approvalLabel: string;
  status: MarketplaceCreatorOperationStatus;
  score: number;
  trustScore: MarketplaceCreatorTrustScore;
  licenseEvidence: MarketplaceCreatorLicenseEvidence;
  rollbackPlan: MarketplaceCreatorRollbackPlan;
  moderationRoute: MarketplaceCreatorModerationRoute;
  versionTimeline: MarketplaceCreatorVersionEvent[];
  operationPacket: MarketplaceCreatorOperationPacket;
  stats: {
    views: number;
    uses: number;
    conversionRate: number;
    relatedProjects: number;
    relatedAudits: number;
    openTasks: number;
  };
};

export type MarketplaceCreatorOperationsCenter = {
  generatedAt: string;
  status: MarketplaceCreatorOperationStatus;
  score: number;
  submissions: MarketplaceCreatorSubmission[];
  moderationRoutes: MarketplaceCreatorModerationRoute[];
  licenseEvidenceQueue: MarketplaceCreatorSubmission[];
  rollbackPlans: MarketplaceCreatorRollbackPlan[];
  nextActions: string[];
  totals: {
    versionedSubmissions: number;
    readySubmissions: number;
    reviewSubmissions: number;
    blockedSubmissions: number;
    trustedCreators: number;
    licenseReady: number;
    rollbackReady: number;
    moderationRoutes: number;
    operationPackets: number;
  };
};

export type MarketplaceCreatorOperationsInput = {
  templates: DesignTemplateSummary[];
  projects: ProjectSummary[];
  projectVersions: ProjectVersionSummary[];
  projectAudits: ProjectAuditSummary[];
  reviewTasks: ReviewTaskSummary[];
  auditLogs: WorkspaceAuditLogSummary[];
  now?: Date | string;
};

export type MarketplaceCreatorSubmissionBuildInput = {
  template: DesignTemplateSummary;
  packageEntry: TemplatePackageEntry | null;
  projects: ProjectSummary[];
  projectVersions: ProjectVersionSummary[];
  projectAudits: ProjectAuditSummary[];
  reviewTasks: ReviewTaskSummary[];
  auditLogs: WorkspaceAuditLogSummary[];
  generatedAt: string;
  now: Date;
};
