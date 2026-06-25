import type { CampaignBoardSummary } from "@/db/campaigns";
import type {
  WebsiteFormSubmissionSummary,
  WebsitePublishSummary,
} from "@/db/website-publishing";
import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type { AssetLibraryAudit } from "@/features/assets/asset-library-audit";
import type { ServerExportJobSummary } from "@/features/editor/server-export-job-model";
import type {
  DesignTemplateSummary,
  ProjectSummary,
  ProjectVersionSummary,
} from "@/features/editor/types";

export type WorkspaceBackupRestoreStatus = "ready" | "review" | "blocked";

export type WorkspaceBackupRestoreInput = {
  projects: ProjectSummary[];
  templates: DesignTemplateSummary[];
  projectVersions: ProjectVersionSummary[];
  serverExportJobs: ServerExportJobSummary[];
  websitePublishes: WebsitePublishSummary[];
  websiteFormSubmissions: WebsiteFormSubmissionSummary[];
  campaigns: CampaignBoardSummary[];
  assetAudit: AssetLibraryAudit;
  auditLogs: WorkspaceAuditLogSummary[];
};

export type WorkspaceBackupRestoreContext = WorkspaceBackupRestoreInput & {
  activeProjects: ProjectSummary[];
  deletedProjects: ProjectSummary[];
};

export type WorkspaceBackupManifestCounts = {
  activeProjects: number;
  deletedProjects: number;
  templates: number;
  projectVersions: number;
  completedExports: number;
  failedExports: number;
  websites: number;
  customDomains: number;
  formSubmissions: number;
  campaigns: number;
  campaignDeliverables: number;
  assetRecords: number;
  projectAssetReferences: number;
  auditLogs: number;
};

export type WorkspaceProjectBackupSnapshot = {
  projectId: string;
  name: string;
  dimensions: string;
  approvalStatus: ProjectSummary["approvalStatus"];
  updatedAt: string;
  latestVersionId: string | null;
  latestVersionAt: string | null;
  latestCompletedExportId: string | null;
  latestCompletedExportAt: string | null;
  failedExportCount: number;
  websiteCount: number;
  campaignDeliverableCount: number;
  publicSurfaceCount: number;
  restoreStatus: WorkspaceBackupRestoreStatus;
};

export type WorkspaceTemplateBackupSnapshot = {
  templateId: string;
  name: string;
  marketplaceStatus: DesignTemplateSummary["marketplaceStatus"];
  approvalStatus: DesignTemplateSummary["approvalStatus"];
  updatedAt: string;
  included: boolean;
};

export type WorkspaceWebsiteBackupSnapshot = {
  publishId: string;
  projectId: string;
  title: string;
  slug: string;
  status: WebsitePublishSummary["status"];
  domainCount: number;
  verifiedDomainCount: number;
  platformErrorCount: number;
  restoreStatus: WorkspaceBackupRestoreStatus;
};

export type WorkspaceCampaignBackupSnapshot = {
  campaignId: string;
  name: string;
  status: CampaignBoardSummary["status"];
  deliverableCount: number;
  linkedDeliverableCount: number;
  restoreStatus: WorkspaceBackupRestoreStatus;
};

export type WorkspaceBackupManifest = {
  kind: "essence-studio.workspace-backup";
  schemaVersion: 1;
  generatedAt: string;
  fingerprint: string;
  counts: WorkspaceBackupManifestCounts;
  projectSnapshots: WorkspaceProjectBackupSnapshot[];
  templateSnapshots: WorkspaceTemplateBackupSnapshot[];
  websiteSnapshots: WorkspaceWebsiteBackupSnapshot[];
  campaignSnapshots: WorkspaceCampaignBackupSnapshot[];
  assetSummary: {
    quotaBytes: number;
    totalBytes: number;
    assetCount: number;
    duplicateCount: number;
    duplicateBytes: number;
    projectManifestCount: number;
    skippedProjectReferenceCount: number;
  };
  auditSummary: {
    totalLogs: number;
    latestActivityAt: string | null;
    actionKinds: string[];
  };
};

export type WorkspaceBackupManifestDownload = {
  fileName: string;
  href: string;
  json: string;
};

export type WorkspaceBackupIntegrityCheckId =
  | "version-snapshots"
  | "completed-exports"
  | "website-domains"
  | "campaign-links"
  | "asset-manifests"
  | "audit-coverage";

export type WorkspaceBackupIntegrityCheck = {
  id: WorkspaceBackupIntegrityCheckId;
  title: string;
  scope: string;
  status: WorkspaceBackupRestoreStatus;
  affectedCount: number;
  detail: string;
  remediation: string;
  affectedNames: string[];
};

export type WorkspaceRestoreProjectDryRun = {
  projectId: string;
  name: string;
  restoreOrder: number;
  status: WorkspaceBackupRestoreStatus;
  latestVersionId: string | null;
  latestCompletedExportId: string | null;
  reason: string;
};

export type WorkspaceRestoreWebsiteDryRun = {
  publishId: string;
  title: string;
  status: WorkspaceBackupRestoreStatus;
  reason: string;
};

export type WorkspaceRestoreCampaignDryRun = {
  campaignId: string;
  name: string;
  status: WorkspaceBackupRestoreStatus;
  reason: string;
};

export type WorkspaceRestoreDryRunReport = {
  status: WorkspaceBackupRestoreStatus;
  score: number;
  summary: {
    restorableProjects: number;
    needsReviewProjects: number;
    blockedProjects: number;
    restorableTemplates: number;
    restorableWebsites: number;
    restorableCampaigns: number;
    skippedDeletedProjects: number;
  };
  projects: WorkspaceRestoreProjectDryRun[];
  websites: WorkspaceRestoreWebsiteDryRun[];
  campaigns: WorkspaceRestoreCampaignDryRun[];
};

export type WorkspaceRollbackPlaybookId =
  | "project-version-rollback"
  | "export-artifact-rollback"
  | "website-domain-rollback"
  | "campaign-board-rollback";

export type WorkspaceRollbackPlaybook = {
  id: WorkspaceRollbackPlaybookId;
  title: string;
  status: WorkspaceBackupRestoreStatus;
  detail: string;
  targets: number;
  steps: string[];
  nextAction: string;
};

export type WorkspaceBackupRestoreCenter = {
  status: WorkspaceBackupRestoreStatus;
  score: number;
  manifest: WorkspaceBackupManifest;
  manifestDownload: WorkspaceBackupManifestDownload;
  integrityChecks: WorkspaceBackupIntegrityCheck[];
  dryRun: WorkspaceRestoreDryRunReport;
  rollbackPlaybooks: WorkspaceRollbackPlaybook[];
  nextActions: string[];
  totals: {
    activeProjects: number;
    projectSnapshots: number;
    completedExports: number;
    restorableProjects: number;
    blockedChecks: number;
    rollbackPlaybooks: number;
  };
};
