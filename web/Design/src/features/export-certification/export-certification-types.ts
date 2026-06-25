import type { ReviewTaskSummary } from "@/db/project-comments";
import type { WebsitePublishSummary } from "@/db/website-publishing";
import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type { ServerExportJobSummary } from "@/features/editor/server-export-job-model";
import type { ExportFormat } from "@/features/editor/export-design";
import type { ProjectSummary } from "@/features/editor/types";
import type { ProjectAuditSummary } from "@/features/projects/project-audit-center";
import type { ProjectHandoffPacket } from "@/features/projects/project-handoff-packet";

export type ExportCertificationArtifact =
  | "pdf"
  | "video"
  | "email"
  | "website"
  | "print";

export type ExportCertificationStatus = "ready" | "review" | "blocked";

export type ExportCertificationCheckSource =
  | "export-job"
  | "project-audit"
  | "website-publish"
  | "handoff-packet"
  | "review-task"
  | "approval-log";

export type ExportCertificationCheck = {
  id: string;
  label: string;
  status: ExportCertificationStatus;
  score: number;
  detail: string;
  source: ExportCertificationCheckSource;
};

export type ExportCertificationQaMatrix = {
  status: ExportCertificationStatus;
  score: number;
  checks: ExportCertificationCheck[];
  passedChecks: number;
  blockedChecks: number;
};

export type ExportCertificationApprovalEvent = {
  id: string;
  projectId: string | null;
  summary: string;
  actorEmail: string | null;
  createdAt: string;
};

export type ExportCertificationSignoff = {
  status: ExportCertificationStatus;
  score: number;
  approvedProjects: number;
  totalProjects: number;
  openTasks: number;
  overdueTasks: number;
  approvalEvents: ExportCertificationApprovalEvent[];
  summary: string;
};

export type ExportCertificationPacket = {
  id: string;
  title: string;
  artifact: ExportCertificationArtifact;
  status: ExportCertificationStatus;
  generatedAt: string;
  projectIds: string[];
  checks: string[];
  signoffSummary: string;
  downloadJson: string;
};

export type ExportCertificationWorkspace = {
  artifact: ExportCertificationArtifact;
  label: string;
  description: string;
  status: ExportCertificationStatus;
  score: number;
  projectIds: string[];
  projectNames: string[];
  exportJobs: ServerExportJobSummary[];
  websitePublishes: WebsitePublishSummary[];
  qaMatrix: ExportCertificationQaMatrix;
  stakeholderSignoff: ExportCertificationSignoff;
  certificationPacket: ExportCertificationPacket;
  nextAction: string;
};

export type ExportCertificationCenter = {
  status: ExportCertificationStatus;
  score: number;
  generatedAt: string;
  workspaces: ExportCertificationWorkspace[];
  nextActions: string[];
  totals: {
    artifacts: number;
    readyWorkspaces: number;
    blockedWorkspaces: number;
    qaChecks: number;
    signoffApprovals: number;
    certificationPackets: number;
    certifiedProjects: number;
  };
};

export type ExportCertificationCenterInput = {
  projects: ProjectSummary[];
  projectAudits: ProjectAuditSummary[];
  serverExportJobs: ServerExportJobSummary[];
  websitePublishes: WebsitePublishSummary[];
  reviewTasks: ReviewTaskSummary[];
  projectHandoffPackets: ProjectHandoffPacket[];
  auditLogs: WorkspaceAuditLogSummary[];
  now?: string | Date;
};

export type ExportCertificationArtifactDefinition = {
  artifact: ExportCertificationArtifact;
  label: string;
  description: string;
  requiredExportFormats: ExportFormat[];
  relatedAuditDimensions: ProjectAuditSummary["dimensions"][number]["id"][];
  projectNameHints: RegExp[];
  emptyAction: string;
};
