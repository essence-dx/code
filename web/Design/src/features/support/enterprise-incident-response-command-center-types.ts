import type { TeamWorkspaceRole } from "@/db/team-workspaces";

export type EnterpriseIncidentResponseStatus = "ready" | "active" | "critical";

export type EnterpriseIncidentSeverity = "sev1" | "sev2" | "sev3" | "watch";

export type EnterpriseIncidentSource =
  | "support"
  | "observability"
  | "release"
  | "automation";

export type EnterpriseIncidentOwnerAssignment = {
  ownerEmail: string | null;
  ownerRole: TeamWorkspaceRole | "workspace";
  workspaceId: string | null;
  workspaceName: string;
  rationale: string;
};

export type EnterpriseIncidentTimelineEvent = {
  id: string;
  occurredAt: string;
  label: string;
  detail: string;
  source: EnterpriseIncidentSource | "audit";
  auditLogId: string | null;
};

export type EnterpriseIncidentRecoveryPlaybook = {
  id: string;
  title: string;
  status: EnterpriseIncidentResponseStatus;
  steps: string[];
  packetIds: string[];
};

export type EnterpriseIncidentResponseItem = {
  id: string;
  source: EnterpriseIncidentSource;
  severity: EnterpriseIncidentSeverity;
  title: string;
  detail: string;
  metric: string;
  href: string | null;
  ownerAssignment: EnterpriseIncidentOwnerAssignment;
  timeline: EnterpriseIncidentTimelineEvent[];
  recoveryPlaybook: EnterpriseIncidentRecoveryPlaybook;
};

export type EnterpriseIncidentResponsePacket = {
  id: string;
  status: EnterpriseIncidentResponseStatus;
  generatedAt: string;
  incidentIds: string[];
  auditLogIds: string[];
  playbookIds: string[];
  download: {
    fileName: string;
    href: string;
    json: string;
  };
};

export type EnterpriseIncidentSeverityRoute = {
  severity: EnterpriseIncidentSeverity;
  label: string;
  ownerEmail: string | null;
  count: number;
};

export type EnterpriseIncidentResponseCommandCenter = {
  status: EnterpriseIncidentResponseStatus;
  score: number;
  generatedAt: string;
  severityRoutes: EnterpriseIncidentSeverityRoute[];
  incidents: EnterpriseIncidentResponseItem[];
  responsePacket: EnterpriseIncidentResponsePacket;
  nextActions: string[];
  totals: {
    incidents: number;
    sev1: number;
    sev2: number;
    sev3: number;
    watch: number;
    assignedIncidents: number;
    timelineEvents: number;
    playbooks: number;
    auditEvents: number;
  };
};
