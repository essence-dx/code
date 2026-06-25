import type { ReviewTaskSummary } from "@/db/project-comments";
import type { WebsitePublishSummary } from "@/db/website-publishing";
import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type { ServerExportJobSummary } from "@/features/editor/server-export-job-model";
import type { ProjectSummary } from "@/features/editor/types";
import type { ProjectAuditSummary } from "@/features/projects/project-audit-center";
import type { ProjectHandoffPacket } from "@/features/projects/project-handoff-packet";

export type ProductionSupportDeskStatus = "ready" | "triage" | "urgent";

export type ProductionSupportIssueKind =
  | "user-reported"
  | "export-failure"
  | "publishing-domain"
  | "readiness-audit";

export type ProductionSupportSeverity = "low" | "medium" | "high" | "urgent";

export type ProductionSupportIssue = {
  id: string;
  kind: ProductionSupportIssueKind;
  severity: ProductionSupportSeverity;
  title: string;
  summary: string;
  affectedProjectId: string;
  affectedProjectName: string;
  affectedProjectHref: string;
  sourceLabel: string;
  reportedBy: string | null;
  createdAt: string;
  updatedAt: string;
  statusLabel: string;
  auditContext: WorkspaceAuditLogSummary[];
  reproductionNotes: string[];
  resolutionChecklist: string[];
};

export type ProductionSupportView = {
  id: "user-reported" | "production-failures" | "readiness-review";
  title: string;
  description: string;
  status: ProductionSupportDeskStatus;
  issues: ProductionSupportIssue[];
};

export type ProductionSupportResolutionPacket = {
  id: string;
  issueId: string;
  projectId: string;
  projectName: string;
  status: ProjectHandoffPacket["status"] | "needs-packet";
  summary: string;
  auditLogIds: string[];
  handoffPacketScore: number | null;
  checklist: string[];
  download: {
    fileName: string;
    href: string;
    json: string;
  };
};

export type ProductionSupportDesk = {
  status: ProductionSupportDeskStatus;
  score: number;
  views: ProductionSupportView[];
  resolutionPackets: ProductionSupportResolutionPacket[];
  nextActions: string[];
  totals: {
    openIssues: number;
    userReportedIssues: number;
    productionFailures: number;
    readinessIssues: number;
    urgentIssues: number;
    resolutionPackets: number;
  };
};

export type ProductionSupportDeskInput = {
  projects: ProjectSummary[];
  reviewTasks: ReviewTaskSummary[];
  projectAudits: ProjectAuditSummary[];
  projectHandoffPackets: ProjectHandoffPacket[];
  serverExportJobs: ServerExportJobSummary[];
  websitePublishes: WebsitePublishSummary[];
  auditLogs: WorkspaceAuditLogSummary[];
  now?: string;
};
