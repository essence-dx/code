import type { TeamWorkspaceManagementSummary } from "@/db/team-workspace-management";
import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type { AdvancedAdminAutomationCenter } from "@/features/automation/advanced-admin-automation-recipes";
import type {
  ProductionObservabilityIncident,
  ProductionObservabilityReport,
} from "@/features/observability/production-observability";
import type { ReleaseReadinessReport } from "@/features/operations/release-readiness-gates";
import type {
  ProductionSupportDesk,
  ProductionSupportIssue,
} from "@/features/support/production-support-desk";
import type {
  EnterpriseIncidentOwnerAssignment,
  EnterpriseIncidentRecoveryPlaybook,
  EnterpriseIncidentResponseCommandCenter,
  EnterpriseIncidentResponseItem,
  EnterpriseIncidentResponsePacket,
  EnterpriseIncidentResponseStatus,
  EnterpriseIncidentSeverity,
  EnterpriseIncidentSeverityRoute,
  EnterpriseIncidentTimelineEvent,
} from "@/features/support/enterprise-incident-response-command-center-types";

export type {
  EnterpriseIncidentOwnerAssignment,
  EnterpriseIncidentRecoveryPlaybook,
  EnterpriseIncidentResponseCommandCenter,
  EnterpriseIncidentResponseItem,
  EnterpriseIncidentResponsePacket,
  EnterpriseIncidentResponseStatus,
  EnterpriseIncidentSeverity,
  EnterpriseIncidentSeverityRoute,
  EnterpriseIncidentSource,
  EnterpriseIncidentTimelineEvent,
} from "@/features/support/enterprise-incident-response-command-center-types";

export type EnterpriseIncidentResponseCommandCenterInput = {
  observability: ProductionObservabilityReport;
  supportDesk: ProductionSupportDesk;
  releaseReadiness: ReleaseReadinessReport;
  adminAutomation: AdvancedAdminAutomationCenter;
  teamManagement: TeamWorkspaceManagementSummary[];
  auditLogs: WorkspaceAuditLogSummary[];
  now?: string | Date;
};

export function createEnterpriseIncidentResponseCommandCenter(
  input: EnterpriseIncidentResponseCommandCenterInput,
): EnterpriseIncidentResponseCommandCenter {
  const generatedAt = normalizeNow(input.now).toISOString();
  const supportIssues = input.supportDesk.views.flatMap((view) => view.issues);
  const supportFingerprints = new Set(
    supportIssues.map((issue) =>
      issueFingerprint(issue.title, issue.affectedProjectHref),
    ),
  );
  const incidents = sortIncidents([
    ...supportIssues.map((issue) => createSupportIncident(issue, input)),
    ...createObservabilityIncidents({
      input,
      supportFingerprints,
    }),
    ...createReleaseIncidents(input),
    ...createAutomationIncidents(input),
  ]);
  const status = createStatus(incidents);
  const responsePacket = createResponsePacket({
    generatedAt,
    status,
    incidents,
  });

  return {
    status,
    score: scoreIncidents(incidents),
    generatedAt,
    severityRoutes: createSeverityRoutes({
      incidents,
      teamManagement: input.teamManagement,
    }),
    incidents,
    responsePacket,
    nextActions: incidents
      .slice(0, 6)
      .map(
        (incident) =>
          `Assign ${incident.ownerAssignment.ownerEmail ?? incident.ownerAssignment.workspaceName} to ${incident.title} and run ${incident.recoveryPlaybook.title}.`,
      ),
    totals: {
      incidents: incidents.length,
      sev1: incidents.filter((incident) => incident.severity === "sev1").length,
      sev2: incidents.filter((incident) => incident.severity === "sev2").length,
      sev3: incidents.filter((incident) => incident.severity === "sev3").length,
      watch: incidents.filter((incident) => incident.severity === "watch")
        .length,
      assignedIncidents: incidents.filter(
        (incident) => incident.ownerAssignment.ownerEmail,
      ).length,
      timelineEvents: incidents.reduce(
        (total, incident) => total + incident.timeline.length,
        0,
      ),
      playbooks: incidents.length,
      auditEvents: unique(
        incidents.flatMap((incident) =>
          incident.timeline.flatMap((event) => event.auditLogId ?? []),
        ),
      ).length,
    },
  };
}

function createSupportIncident(
  issue: ProductionSupportIssue,
  input: EnterpriseIncidentResponseCommandCenterInput,
): EnterpriseIncidentResponseItem {
  const packet = input.supportDesk.resolutionPackets.find(
    (item) => item.issueId === issue.id,
  );
  const severity = supportSeverityToIncident(issue.severity);
  const ownerAssignment = assignOwner({
    severity,
    source: "support",
    teamManagement: input.teamManagement,
  });

  return {
    id: `support-${issue.id}`,
    source: "support",
    severity,
    title: issue.title,
    detail: issue.summary,
    metric: issue.sourceLabel,
    href: issue.affectedProjectHref,
    ownerAssignment,
    timeline: createTimeline([
      {
        id: `${issue.id}-created`,
        occurredAt: issue.createdAt,
        label: "Issue opened",
        detail: issue.summary,
        source: "support",
        auditLogId: null,
      },
      {
        id: `${issue.id}-updated`,
        occurredAt: issue.updatedAt,
        label: "Issue updated",
        detail: issue.statusLabel,
        source: "support",
        auditLogId: null,
      },
      ...issue.auditContext.map((log) => auditTimelineEvent(log)),
    ]),
    recoveryPlaybook: createPlaybook({
      id: `playbook-support-${issue.id}`,
      title: `${issue.sourceLabel} recovery playbook`,
      severity,
      steps: [
        ...issue.reproductionNotes,
        ...issue.resolutionChecklist,
        ...(packet?.checklist ?? []),
      ],
      packetIds: packet ? [packet.id] : [],
    }),
  };
}

function createObservabilityIncidents(input: {
  input: EnterpriseIncidentResponseCommandCenterInput;
  supportFingerprints: Set<string>;
}): EnterpriseIncidentResponseItem[] {
  return input.input.observability.groups.flatMap((group) =>
    group.incidents
      .filter((incident) => incident.status !== "healthy")
      .filter(
        (incident) =>
          !input.supportFingerprints.has(
            issueFingerprint(incident.title, incident.href ?? null),
          ),
      )
      .map((incident) =>
        createObservabilityIncident({
          incident,
          groupTitle: group.title,
          input: input.input,
        }),
      ),
  );
}

function createObservabilityIncident(input: {
  incident: ProductionObservabilityIncident;
  groupTitle: string;
  input: EnterpriseIncidentResponseCommandCenterInput;
}): EnterpriseIncidentResponseItem {
  const severity: EnterpriseIncidentSeverity =
    input.incident.status === "critical" ? "sev2" : "watch";
  const ownerAssignment = assignOwner({
    severity,
    source: "observability",
    teamManagement: input.input.teamManagement,
  });
  const matchingAuditLogs = findMatchingAuditLogs({
    logs: input.input.auditLogs,
    title: input.incident.title,
    detail: input.incident.detail,
    href: input.incident.href ?? null,
  });

  return {
    id: `observability-${input.incident.id}`,
    source: "observability",
    severity,
    title: input.incident.title,
    detail: input.incident.detail,
    metric: input.incident.metric,
    href: input.incident.href ?? null,
    ownerAssignment,
    timeline: createTimeline([
      {
        id: `${input.incident.id}-detected`,
        occurredAt: input.input.observability.checkedAt,
        label: `${input.groupTitle} detected`,
        detail: input.incident.detail,
        source: "observability",
        auditLogId: null,
      },
      ...matchingAuditLogs.map((log) => auditTimelineEvent(log)),
    ]),
    recoveryPlaybook: createPlaybook({
      id: `playbook-observability-${input.incident.id}`,
      title: `${input.groupTitle} recovery playbook`,
      severity,
      steps: [
        `Inspect ${input.groupTitle.toLowerCase()} signal: ${input.incident.detail}`,
        input.incident.href
          ? `Open ${input.incident.href} and confirm the active failure.`
          : "Confirm the active failure from the dashboard signal.",
        "Record the fix and watch the signal return to healthy.",
      ],
      packetIds: [],
    }),
  };
}

function createReleaseIncidents(
  input: EnterpriseIncidentResponseCommandCenterInput,
): EnterpriseIncidentResponseItem[] {
  return input.releaseReadiness.gates
    .filter((gate) => gate.status !== "ready")
    .map((gate) => {
      const severity: EnterpriseIncidentSeverity =
        gate.status === "blocked" ? "sev1" : "sev3";
      const ownerAssignment = assignOwner({
        severity,
        source: "release",
        teamManagement: input.teamManagement,
      });

      return {
        id: `release-${gate.id}`,
        source: "release",
        severity,
        title: `Release gate: ${gate.title}`,
        detail: gate.description,
        metric: `${gate.metricValue} ${gate.metricLabel}`,
        href: gate.items.find((item) => item.href)?.href ?? null,
        ownerAssignment,
        timeline: createTimeline([
          {
            id: `${gate.id}-generated`,
            occurredAt: input.releaseReadiness.generatedAt,
            label: "Release gate evaluated",
            detail: `${gate.title} scored ${gate.score}/100.`,
            source: "release",
            auditLogId: null,
          },
          ...gate.items
            .filter((item) => item.status !== "ready")
            .slice(0, 3)
            .map((item) => ({
              id: `${gate.id}-${item.id}`,
              occurredAt: input.releaseReadiness.generatedAt,
              label: item.title,
              detail: item.detail,
              source: "release" as const,
              auditLogId: null,
            })),
        ]),
        recoveryPlaybook: createPlaybook({
          id: `playbook-release-${gate.id}`,
          title: `${gate.title} recovery playbook`,
          severity,
          steps: [
            ...gate.items
              .filter((item) => item.status !== "ready")
              .slice(0, 4)
              .map((item) => `${item.title}: ${item.detail}`),
            ...input.releaseReadiness.nextActions.slice(0, 3),
          ],
          packetIds: [input.releaseReadiness.packet.fileName],
        }),
      };
    });
}

function createAutomationIncidents(
  input: EnterpriseIncidentResponseCommandCenterInput,
): EnterpriseIncidentResponseItem[] {
  return input.adminAutomation.recipes
    .filter((recipe) => recipe.status !== "ready")
    .map((recipe) => {
      const severity: EnterpriseIncidentSeverity =
        recipe.status === "blocked" ? "sev2" : "sev3";
      const ownerAssignment = assignOwner({
        severity,
        source: "automation",
        teamManagement: input.teamManagement,
      });
      const auditLogs = input.auditLogs.filter((log) =>
        recipe.auditLogIds.includes(log.id),
      );

      return {
        id: `automation-${recipe.id}`,
        source: "automation",
        severity,
        title: `Automation recipe: ${recipe.title}`,
        detail: recipe.description,
        metric: `${recipe.targets.length} targets`,
        href: null,
        ownerAssignment,
        timeline: createTimeline([
          {
            id: `${recipe.id}-generated`,
            occurredAt: input.adminAutomation.generatedAt,
            label: "Admin automation evaluated",
            detail: `${recipe.title} scored ${recipe.score}/100.`,
            source: "automation",
            auditLogId: null,
          },
          ...auditLogs.map((log) => auditTimelineEvent(log)),
        ]),
        recoveryPlaybook: createPlaybook({
          id: `playbook-automation-${recipe.id}`,
          title: `${recipe.title} recovery playbook`,
          severity,
          steps: [
            ...recipe.plannedActions,
            "Download the admin automation audit packet before closing the incident.",
          ],
          packetIds: [
            input.adminAutomation.auditPacket.id,
            ...recipe.packetIds,
          ],
        }),
      };
    });
}

function createPlaybook(input: {
  id: string;
  title: string;
  severity: EnterpriseIncidentSeverity;
  steps: string[];
  packetIds: string[];
}): EnterpriseIncidentRecoveryPlaybook {
  return {
    id: input.id,
    title: input.title,
    status: input.severity === "sev1" ? "critical" : "active",
    steps: unique(input.steps.filter(Boolean)).slice(0, 8),
    packetIds: unique(input.packetIds.filter(Boolean)),
  };
}

function createTimeline(
  events: EnterpriseIncidentTimelineEvent[],
): EnterpriseIncidentTimelineEvent[] {
  return [...events]
    .filter((event, index, all) => {
      const duplicateIndex = all.findIndex(
        (item) =>
          item.auditLogId === event.auditLogId &&
          item.auditLogId !== null &&
          item.label === event.label,
      );

      return duplicateIndex === -1 || duplicateIndex === index;
    })
    .sort(
      (left, right) =>
        Date.parse(left.occurredAt) - Date.parse(right.occurredAt),
    )
    .slice(-6);
}

function auditTimelineEvent(
  log: WorkspaceAuditLogSummary,
): EnterpriseIncidentTimelineEvent {
  return {
    id: `audit-${log.id}`,
    occurredAt: log.createdAt,
    label: log.action,
    detail: log.summary,
    source: "audit",
    auditLogId: log.id,
  };
}

function assignOwner(input: {
  severity: EnterpriseIncidentSeverity;
  source: EnterpriseIncidentResponseItem["source"];
  teamManagement: TeamWorkspaceManagementSummary[];
}): EnterpriseIncidentOwnerAssignment {
  const workspace = input.teamManagement[0] ?? null;
  const preferredRole =
    input.severity === "sev1" || input.source === "release" ? "owner" : "admin";
  const member =
    workspace?.members.find((item) => item.role === preferredRole) ??
    workspace?.members.find((item) => item.role === "owner") ??
    workspace?.members.find((item) => item.role === "admin") ??
    workspace?.members[0] ??
    null;

  return {
    ownerEmail: member?.email ?? null,
    ownerRole: member?.role ?? "workspace",
    workspaceId: workspace?.id ?? null,
    workspaceName: workspace?.name ?? "Workspace admins",
    rationale:
      preferredRole === "owner"
        ? "SEV1 and release-blocking incidents route to the workspace owner."
        : "Operational incidents route to an admin, with owner fallback.",
  };
}

function createSeverityRoutes(input: {
  incidents: EnterpriseIncidentResponseItem[];
  teamManagement: TeamWorkspaceManagementSummary[];
}): EnterpriseIncidentSeverityRoute[] {
  const severities: EnterpriseIncidentSeverity[] = [
    "sev1",
    "sev2",
    "sev3",
    "watch",
  ];

  return severities.map((severity) => {
    const assignment = assignOwner({
      severity,
      source: severity === "watch" ? "observability" : "support",
      teamManagement: input.teamManagement,
    });

    return {
      severity,
      label: severityLabels[severity],
      ownerEmail: assignment.ownerEmail,
      count: input.incidents.filter(
        (incident) => incident.severity === severity,
      ).length,
    };
  });
}

function createResponsePacket(input: {
  generatedAt: string;
  status: EnterpriseIncidentResponseStatus;
  incidents: EnterpriseIncidentResponseItem[];
}): EnterpriseIncidentResponsePacket {
  const auditLogIds = unique(
    input.incidents.flatMap((incident) =>
      incident.timeline.flatMap((event) => event.auditLogId ?? []),
    ),
  );
  const payload = {
    kind: "essence-studio.enterprise-incident-response-packet",
    version: 1,
    generatedAt: input.generatedAt,
    status: input.status,
    incidents: input.incidents.map((incident) => ({
      id: incident.id,
      source: incident.source,
      severity: incident.severity,
      title: incident.title,
      ownerAssignment: incident.ownerAssignment,
      timeline: incident.timeline,
      recoveryPlaybook: incident.recoveryPlaybook,
    })),
  };
  const json = JSON.stringify(payload, null, 2);

  return {
    id: "enterprise-incident-response-packet",
    status: input.status,
    generatedAt: input.generatedAt,
    incidentIds: input.incidents.map((incident) => incident.id),
    auditLogIds,
    playbookIds: input.incidents.map(
      (incident) => incident.recoveryPlaybook.id,
    ),
    download: {
      fileName: "enterprise-incident-response-packet.json",
      href: `data:application/json;charset=utf-8,${encodeURIComponent(json)}`,
      json,
    },
  };
}

function createStatus(
  incidents: EnterpriseIncidentResponseItem[],
): EnterpriseIncidentResponseStatus {
  if (incidents.some((incident) => incident.severity === "sev1")) {
    return "critical";
  }
  if (incidents.length) return "active";

  return "ready";
}

function scoreIncidents(incidents: EnterpriseIncidentResponseItem[]) {
  const penalty = incidents.reduce((total, incident) => {
    if (incident.severity === "sev1") return total + 30;
    if (incident.severity === "sev2") return total + 20;
    if (incident.severity === "sev3") return total + 12;

    return total + 6;
  }, 0);

  return Math.max(0, 100 - penalty);
}

function sortIncidents(incidents: EnterpriseIncidentResponseItem[]) {
  return [...incidents].sort(
    (left, right) =>
      severityWeight(right.severity) - severityWeight(left.severity) ||
      right.timeline.length - left.timeline.length ||
      left.title.localeCompare(right.title),
  );
}

function supportSeverityToIncident(
  severity: ProductionSupportIssue["severity"],
): EnterpriseIncidentSeverity {
  if (severity === "urgent") return "sev1";
  if (severity === "high") return "sev2";
  if (severity === "medium") return "sev3";

  return "watch";
}

function findMatchingAuditLogs(input: {
  logs: WorkspaceAuditLogSummary[];
  title: string;
  detail: string;
  href: string | null;
}) {
  const projectId = input.href?.match(/\/editor\/([^/?#]+)/)?.[1] ?? null;
  const haystack = `${input.title} ${input.detail}`.toLowerCase();

  return input.logs
    .filter((log) => {
      const logText = `${log.summary} ${log.action}`.toLowerCase();

      return (
        (projectId &&
          (log.targetId === projectId ||
            String(log.metadata.projectId ?? "") === projectId)) ||
        haystack
          .split(/\s+/)
          .filter((word) => word.length >= 5)
          .some((word) => logText.includes(word))
      );
    })
    .slice(0, 3);
}

function issueFingerprint(title: string, href: string | null) {
  return `${slugify(title)}:${href ?? ""}`;
}

function normalizeNow(value: string | Date | undefined) {
  if (value instanceof Date) return value;
  if (value) return new Date(value);

  return new Date();
}

function severityWeight(severity: EnterpriseIncidentSeverity) {
  if (severity === "sev1") return 4;
  if (severity === "sev2") return 3;
  if (severity === "sev3") return 2;

  return 1;
}

function slugify(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "incident"
  );
}

const severityLabels: Record<EnterpriseIncidentSeverity, string> = {
  sev1: "SEV1",
  sev2: "SEV2",
  sev3: "SEV3",
  watch: "Watch",
};

function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}
