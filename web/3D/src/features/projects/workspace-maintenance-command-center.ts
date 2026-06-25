import type { ProjectArtifactRegistryEntry, ProjectArtifactRegistryReport } from "@/features/projects/project-artifact-registry";
import type { ReleaseArchiveExplorerReport, ReleaseArchiveExplorerStatus } from "@/features/projects/release-archive-explorer";
import type { WorkspaceMemberRow } from "@/features/workspaces/types";

export type WorkspaceMaintenanceScope = "cleanup-tasks" | "expiring-evidence" | "inactive-members" | "old-artifacts" | "stale-projects";
export type WorkspaceMaintenanceStatus = "blocked" | "ready" | "watch";
export type WorkspaceMaintenanceActionPriority = "high" | "low" | "medium";

export interface WorkspaceMaintenanceProjectRow {
  archivedAt: Date | string | null;
  id: string;
  name: string;
  publishedAt: Date | string | null;
  updatedAt: Date | string;
}

export interface WorkspaceMaintenanceCommandCenterAction {
  detail: string;
  dueLabel: string;
  id: string;
  label: string;
  ownerHint: string;
  priority: WorkspaceMaintenanceActionPriority;
  scope: WorkspaceMaintenanceScope;
}

export interface WorkspaceMaintenanceCommandCenterRow {
  actionLabel: string;
  detail: string;
  id: WorkspaceMaintenanceScope;
  label: string;
  metricLabel: string;
  ownerHint: string;
  recordCount: number;
  status: WorkspaceMaintenanceStatus;
}

export interface WorkspaceMaintenanceCommandCenterReport {
  actions: WorkspaceMaintenanceCommandCenterAction[];
  generatedAt: string;
  rows: WorkspaceMaintenanceCommandCenterRow[];
  summary: {
    blockedCount: number;
    cleanupTaskCount: number;
    highPriorityActionCount: number;
    maintenanceScore: number;
    readyCount: number;
    totalCount: number;
    watchCount: number;
    worstStatus: WorkspaceMaintenanceStatus;
  };
}

export interface WorkspaceMaintenanceThresholds {
  expiringEvidenceDays: number;
  inactiveMemberDays: number;
  oldArtifactDays: number;
  staleProjectDays: number;
}

export interface CreateWorkspaceMaintenanceCommandCenterReportInput {
  activeSessionsByUserId?: Record<string, number>;
  artifactRegistryReport: ProjectArtifactRegistryReport;
  generatedAt?: string;
  members: WorkspaceMemberRow[];
  projects: WorkspaceMaintenanceProjectRow[];
  releaseArchiveExplorer: ReleaseArchiveExplorerReport;
  thresholds?: Partial<WorkspaceMaintenanceThresholds>;
}

const defaultThresholds: WorkspaceMaintenanceThresholds = {
  expiringEvidenceDays: 60,
  inactiveMemberDays: 21,
  oldArtifactDays: 60,
  staleProjectDays: 60,
};

const statusRank: Record<WorkspaceMaintenanceStatus, number> = {
  blocked: 0,
  watch: 1,
  ready: 2,
};

const statusScore: Record<WorkspaceMaintenanceStatus, number> = {
  blocked: 0,
  watch: 65,
  ready: 100,
};

const priorityRank: Record<WorkspaceMaintenanceActionPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

function toDate(value: Date | string | null) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function ageInDays(value: Date | string | null, now: Date) {
  const date = toDate(value);

  return date ? Math.floor((now.getTime() - date.getTime()) / (24 * 60 * 60 * 1000)) : 0;
}

function isOlderThan(value: Date | string | null, now: Date, days: number) {
  return ageInDays(value, now) >= days;
}

function action(input: WorkspaceMaintenanceCommandCenterAction): WorkspaceMaintenanceCommandCenterAction {
  return input;
}

function staleProjectRow(input: {
  actions: WorkspaceMaintenanceCommandCenterAction[];
  now: Date;
  projects: WorkspaceMaintenanceProjectRow[];
  thresholdDays: number;
}): WorkspaceMaintenanceCommandCenterRow {
  const staleProjects = input.projects.filter((project) => !project.archivedAt && isOlderThan(project.updatedAt, input.now, input.thresholdDays));
  const stalePublished = staleProjects.filter((project) => project.publishedAt);
  const status: WorkspaceMaintenanceStatus = stalePublished.length > 0 ? "blocked" : staleProjects.length > 0 ? "watch" : "ready";

  staleProjects.slice(0, 6).forEach((project) => {
    const published = Boolean(project.publishedAt);

    input.actions.push(
      action({
        detail: `${project.name} has not changed for ${ageInDays(project.updatedAt, input.now)} days${published ? " and is still published" : ""}.`,
        dueLabel: published ? "Before next public review" : "This week",
        id: `stale-project:${project.id}`,
        label: published ? "Review stale published scene" : "Archive or refresh stale draft scene",
        ownerHint: published ? "Publishing owner" : "Workspace editor",
        priority: published ? "high" : "medium",
        scope: "stale-projects",
      }),
    );
  });

  return {
    actionLabel:
      status === "blocked"
        ? "Review stale published scenes"
        : status === "watch"
          ? "Refresh or archive stale drafts"
          : "Keep project review cadence",
    detail: `${staleProjects.length} stale active project${staleProjects.length === 1 ? "" : "s"}, ${stalePublished.length} published.`,
    id: "stale-projects",
    label: "Stale projects",
    metricLabel: `${input.thresholdDays}+ day inactivity window`,
    ownerHint: "Workspace owner",
    recordCount: staleProjects.length,
    status,
  };
}

function inactiveMemberRow(input: {
  actions: WorkspaceMaintenanceCommandCenterAction[];
  activeSessionsByUserId: Record<string, number>;
  members: WorkspaceMemberRow[];
  now: Date;
  thresholdDays: number;
}): WorkspaceMaintenanceCommandCenterRow {
  const inactiveMembers = input.members.filter((member) => member.role !== "owner" && (input.activeSessionsByUserId[member.userId] ?? 0) === 0 && isOlderThan(member.joinedAt, input.now, input.thresholdDays));
  const inactivePrivileged = inactiveMembers.filter((member) => member.role === "admin");
  const status: WorkspaceMaintenanceStatus = inactivePrivileged.length > 0 ? "blocked" : inactiveMembers.length > 0 ? "watch" : "ready";

  inactiveMembers.slice(0, 8).forEach((member) => {
    const privileged = member.role === "admin";

    input.actions.push(
      action({
        detail: `${member.name} (${member.email}) has no active session and joined ${ageInDays(member.joinedAt, input.now)} days ago.`,
        dueLabel: privileged ? "Before next admin handoff" : "Next workspace cleanup",
        id: `inactive-member:${member.userId}`,
        label: privileged ? "Confirm inactive admin access" : "Check inactive workspace member",
        ownerHint: "Workspace owner",
        priority: privileged ? "high" : "medium",
        scope: "inactive-members",
      }),
    );
  });

  return {
    actionLabel:
      status === "blocked"
        ? "Confirm privileged access"
        : status === "watch"
          ? "Review inactive members"
          : "Member access is current",
    detail: `${inactiveMembers.length} inactive member${inactiveMembers.length === 1 ? "" : "s"}, ${inactivePrivileged.length} admin access review${inactivePrivileged.length === 1 ? "" : "s"}.`,
    id: "inactive-members",
    label: "Inactive members",
    metricLabel: `${input.thresholdDays}+ day membership age without active session`,
    ownerHint: "Workspace owner",
    recordCount: inactiveMembers.length,
    status,
  };
}

function oldArtifactRow(input: {
  actions: WorkspaceMaintenanceCommandCenterAction[];
  now: Date;
  report: ProjectArtifactRegistryReport;
  thresholdDays: number;
}): WorkspaceMaintenanceCommandCenterRow {
  const oldArtifacts = input.report.entries.filter((entry) => isOlderThan(entry.updatedAt, input.now, input.thresholdDays));
  const blockedArtifacts = input.report.entries.filter((entry) => entry.status === "blocked");
  const draftArtifacts = oldArtifacts.filter((entry) => entry.status === "draft");
  const status: WorkspaceMaintenanceStatus = blockedArtifacts.length > 0 ? "blocked" : oldArtifacts.length > 0 || draftArtifacts.length > 0 ? "watch" : "ready";

  [...blockedArtifacts, ...draftArtifacts.filter((entry) => !blockedArtifacts.some((blocked) => blocked.sourceKey === entry.sourceKey))]
    .slice(0, 8)
    .forEach((entry: ProjectArtifactRegistryEntry) => {
      const blocked = entry.status === "blocked";

      input.actions.push(
        action({
          detail: `${entry.label} in ${entry.projectName} is ${entry.status} and was updated ${ageInDays(entry.updatedAt, input.now)} days ago.`,
          dueLabel: blocked ? "Before evidence export" : "Next artifact cleanup",
          id: `artifact:${entry.sourceKey}`,
          label: blocked ? "Clear blocked artifact" : "Archive stale draft artifact",
          ownerHint: blocked ? "Asset owner" : "Workspace editor",
          priority: blocked ? "high" : "medium",
          scope: "old-artifacts",
        }),
      );
    });

  return {
    actionLabel:
      status === "blocked"
        ? "Clear blocked artifacts"
        : status === "watch"
          ? "Archive old drafts"
          : "Artifact inventory is clean",
    detail: `${oldArtifacts.length} old artifact${oldArtifacts.length === 1 ? "" : "s"}, ${blockedArtifacts.length} blocked, ${draftArtifacts.length} old draft${draftArtifacts.length === 1 ? "" : "s"}.`,
    id: "old-artifacts",
    label: "Old artifacts",
    metricLabel: `${input.thresholdDays}+ day artifact update window`,
    ownerHint: "Asset owner",
    recordCount: oldArtifacts.length + blockedArtifacts.filter((entry) => !oldArtifacts.some((old) => old.sourceKey === entry.sourceKey)).length,
    status,
  };
}

function archiveRowNeedsEvidenceReview(rowStatus: ReleaseArchiveExplorerStatus) {
  return rowStatus === "blocked" || rowStatus === "watch";
}

function expiringEvidenceRow(input: {
  actions: WorkspaceMaintenanceCommandCenterAction[];
  now: Date;
  releaseArchiveExplorer: ReleaseArchiveExplorerReport;
  thresholdDays: number;
}): WorkspaceMaintenanceCommandCenterRow {
  const staleRows = input.releaseArchiveExplorer.rows.filter((row) => isOlderThan(row.latestActivityAt, input.now, input.thresholdDays));
  const issueRows = input.releaseArchiveExplorer.rows.filter((row) => archiveRowNeedsEvidenceReview(row.status));
  const blockedRows = input.releaseArchiveExplorer.rows.filter((row) => row.status === "blocked");
  const reviewRows = [...issueRows, ...staleRows.filter((row) => !issueRows.some((issue) => issue.id === row.id))];
  const status: WorkspaceMaintenanceStatus = blockedRows.length > 0 ? "blocked" : reviewRows.length > 0 ? "watch" : "ready";

  reviewRows.slice(0, 6).forEach((row) => {
    input.actions.push(
      action({
        detail: `${row.label} is ${row.status} and last changed ${row.latestActivityAt ? `${ageInDays(row.latestActivityAt, input.now)} days ago` : "without a timestamp"}.`,
        dueLabel: row.status === "blocked" ? "Before governance packet" : "Before next reviewer handoff",
        id: `evidence:${row.id}`,
        label: row.status === "blocked" ? "Regenerate blocked evidence" : "Refresh watched evidence",
        ownerHint: row.ownerHint,
        priority: row.status === "blocked" ? "high" : "medium",
        scope: "expiring-evidence",
      }),
    );
  });

  return {
    actionLabel:
      status === "blocked"
        ? "Regenerate blocked evidence"
        : status === "watch"
          ? "Refresh watched evidence"
          : "Evidence archive is current",
    detail: `${reviewRows.length} evidence archive row${reviewRows.length === 1 ? "" : "s"} need review, ${blockedRows.length} blocked.`,
    id: "expiring-evidence",
    label: "Expiring evidence",
    metricLabel: `${input.thresholdDays}+ day evidence refresh window`,
    ownerHint: "Governance owner",
    recordCount: reviewRows.length,
    status,
  };
}

function cleanupTaskRow(actions: WorkspaceMaintenanceCommandCenterAction[]): WorkspaceMaintenanceCommandCenterRow {
  const highPriorityCount = actions.filter((entry) => entry.priority === "high").length;

  if (actions.length > 0) {
    actions.push(
      action({
        detail: `${actions.length} maintenance action${actions.length === 1 ? "" : "s"} generated across stale projects, member access, artifacts, and evidence.`,
        dueLabel: highPriorityCount > 0 ? "After high priority review" : "Next workspace cleanup",
        id: "cleanup-queue:review",
        label: "Review generated cleanup queue",
        ownerHint: "Workspace owner",
        priority: highPriorityCount > 0 ? "low" : "medium",
        scope: "cleanup-tasks",
      }),
    );
  }

  return {
    actionLabel: actions.length > 0 ? "Work the generated queue" : "No cleanup needed",
    detail: `${actions.length} cleanup task${actions.length === 1 ? "" : "s"} generated, ${highPriorityCount} high priority.`,
    id: "cleanup-tasks",
    label: "Cleanup tasks",
    metricLabel: "Action queue generated from current workspace state",
    ownerHint: "Workspace owner",
    recordCount: actions.length,
    status: "ready",
  };
}

function summarizeRows(rows: WorkspaceMaintenanceCommandCenterRow[], actions: WorkspaceMaintenanceCommandCenterAction[]): WorkspaceMaintenanceCommandCenterReport["summary"] {
  const worstStatus = rows.reduce<WorkspaceMaintenanceStatus>((worst, row) => (statusRank[row.status] < statusRank[worst] ? row.status : worst), "ready");

  return {
    blockedCount: rows.filter((row) => row.status === "blocked").length,
    cleanupTaskCount: actions.length,
    highPriorityActionCount: actions.filter((entry) => entry.priority === "high").length,
    maintenanceScore: Math.round(rows.reduce((sum, row) => sum + statusScore[row.status], 0) / Math.max(rows.length, 1)),
    readyCount: rows.filter((row) => row.status === "ready").length,
    totalCount: rows.length,
    watchCount: rows.filter((row) => row.status === "watch").length,
    worstStatus,
  };
}

function sortActions(actions: WorkspaceMaintenanceCommandCenterAction[]) {
  return [...actions].sort((first, second) => priorityRank[first.priority] - priorityRank[second.priority] || first.scope.localeCompare(second.scope) || first.label.localeCompare(second.label));
}

export function createWorkspaceMaintenanceCommandCenterReport(input: CreateWorkspaceMaintenanceCommandCenterReportInput): WorkspaceMaintenanceCommandCenterReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const now = new Date(generatedAt);
  const thresholds = {
    ...defaultThresholds,
    ...input.thresholds,
  };
  const actions: WorkspaceMaintenanceCommandCenterAction[] = [];
  const rows = [
    staleProjectRow({
      actions,
      now,
      projects: input.projects,
      thresholdDays: thresholds.staleProjectDays,
    }),
    inactiveMemberRow({
      actions,
      activeSessionsByUserId: input.activeSessionsByUserId ?? {},
      members: input.members,
      now,
      thresholdDays: thresholds.inactiveMemberDays,
    }),
    oldArtifactRow({
      actions,
      now,
      report: input.artifactRegistryReport,
      thresholdDays: thresholds.oldArtifactDays,
    }),
    expiringEvidenceRow({
      actions,
      now,
      releaseArchiveExplorer: input.releaseArchiveExplorer,
      thresholdDays: thresholds.expiringEvidenceDays,
    }),
  ];

  rows.push(cleanupTaskRow(actions));

  const sortedActions = sortActions(actions);

  return {
    actions: sortedActions,
    generatedAt,
    rows,
    summary: summarizeRows(rows, sortedActions),
  };
}
