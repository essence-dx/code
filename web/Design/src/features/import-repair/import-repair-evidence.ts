import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type {
  ProjectSummary,
  ProjectVersionSummary,
} from "@/features/editor/types";
import type { ProjectAuditSummary } from "@/features/projects/project-audit-center";
import type {
  ImportRepairCapability,
  ImportRepairEvidencePacket,
  ImportRepairEvidenceProject,
  ImportRepairStatus,
} from "@/features/import-repair/import-repair-operations-types";
import type {
  MixedFormatProjectOrchestration,
  MixedFormatWorkspaceOrchestration,
} from "@/features/visual-suite/mixed-format-orchestration";

export function createImportRepairEvidenceProjects(input: {
  capability: ImportRepairCapability;
  projects: ProjectSummary[];
  mixedFormatOrchestration: MixedFormatWorkspaceOrchestration;
  projectAudits: ProjectAuditSummary[];
  projectVersions: ProjectVersionSummary[];
  auditLogs: WorkspaceAuditLogSummary[];
}): ImportRepairEvidenceProject[] {
  const activeProjects = input.projects.filter((project) => !project.deletedAt);
  const projectById = new Map(
    activeProjects.map((project) => [project.id, project]),
  );
  const auditByProject = new Map(
    input.projectAudits.map((audit) => [audit.projectId, audit]),
  );
  const versionsByProject = groupVersionsByProject(input.projectVersions);
  const logsByProject = groupLogsByProject(input.auditLogs);
  const orchestrationByProject = new Map(
    input.mixedFormatOrchestration.projects.map((project) => [
      project.projectId,
      project,
    ]),
  );
  const evidenceProjectIds = new Set<string>();

  for (const project of activeProjects) {
    if (matchesProjectName(project.name, input.capability)) {
      evidenceProjectIds.add(project.id);
    }
  }

  for (const project of input.mixedFormatOrchestration.projects) {
    if (matchesOrchestration(project, input.capability)) {
      evidenceProjectIds.add(project.projectId);
    }
  }

  for (const log of input.auditLogs) {
    const targetId = log.targetId ?? "";

    if (projectById.has(targetId) && matchesAuditLog(log, input.capability)) {
      evidenceProjectIds.add(targetId);
    }
  }

  return Array.from(evidenceProjectIds)
    .map((projectId) => {
      const project = projectById.get(projectId);
      const orchestration = orchestrationByProject.get(projectId);

      if (!project && !orchestration) return null;

      const audit = auditByProject.get(projectId) ?? null;
      const versions = versionsByProject.get(projectId) ?? [];
      const logs = logsByProject.get(projectId) ?? [];
      const latestAt = latestTimestamp([
        project?.updatedAt,
        orchestration?.updatedAt,
        audit?.updatedAt,
        ...versions.map((version) => version.createdAt),
        ...logs.map((log) => log.createdAt),
      ]);

      return {
        projectId,
        projectName:
          project?.name ?? orchestration?.projectName ?? "Imported project",
        href: `/editor/${projectId}`,
        pageCount: orchestration?.pageCount ?? 0,
        readinessScore:
          orchestration?.readinessScore ?? audit?.overallScore ?? 50,
        status: mergeStatuses([
          toRepairStatus(orchestration?.status),
          toRepairStatus(audit?.status),
        ]),
        pageTypeLabels: orchestration?.pageTypeLabels ?? [],
        gaps: collectProjectGaps(orchestration),
        hasVersion: versions.length > 0,
        auditScore: audit?.overallScore ?? null,
        auditStatus: audit ? toRepairStatus(audit.status) : null,
        auditLogCount: logs.length,
        latestAt,
      } satisfies ImportRepairEvidenceProject;
    })
    .filter((project): project is ImportRepairEvidenceProject =>
      Boolean(project),
    )
    .sort(compareEvidenceProjects)
    .slice(0, 5);
}

export function createImportRepairEvidencePacket(input: {
  capability: ImportRepairCapability;
  status: ImportRepairStatus;
  generatedAt: string;
  evidenceProjects: ImportRepairEvidenceProject[];
}): ImportRepairEvidencePacket {
  const checks = createEvidenceChecks(input.evidenceProjects);
  const packetBody = {
    schema: "essence.importRepairEvidence.v1",
    generatedAt: input.generatedAt,
    format: input.capability.format,
    label: input.capability.label,
    status: input.status,
    checks,
    sourceLimits: input.capability.sourceLimits,
    capabilitySummary: input.capability.capabilitySummary,
    mappingDiffs: input.capability.mappingDiffs,
    retryStrategy: input.capability.retryStrategy,
    projects: input.evidenceProjects.map((project) => ({
      projectId: project.projectId,
      projectName: project.projectName,
      readinessScore: project.readinessScore,
      status: project.status,
      gaps: project.gaps,
      hasVersion: project.hasVersion,
      auditScore: project.auditScore,
      auditLogCount: project.auditLogCount,
    })),
  };

  return {
    id: `${input.capability.format}-conversion-evidence`,
    title: `${input.capability.label} evidence packet`,
    format: input.capability.format,
    status: input.status,
    generatedAt: input.generatedAt,
    projectIds: input.evidenceProjects.map((project) => project.projectId),
    checks,
    mappingDiffIds: input.capability.mappingDiffs.map((diff) => diff.id),
    retryStrategyId: input.capability.retryStrategy.id,
    downloadJson: JSON.stringify(packetBody, null, 2),
  };
}

function matchesProjectName(name: string, capability: ImportRepairCapability) {
  return capability.nameHints.some((hint) => hint.test(name));
}

function matchesOrchestration(
  project: MixedFormatProjectOrchestration,
  capability: ImportRepairCapability,
) {
  if (matchesProjectName(project.projectName, capability)) return true;

  const pageNameMatches = project.pageReadiness.some((page) =>
    matchesProjectName(page.pageName, capability),
  );

  if (pageNameMatches) return true;

  return (
    project.pageTypes.some((pageType) =>
      capability.pageTypeHints.includes(pageType),
    ) &&
    matchesProjectName(
      `${project.projectName} ${project.pageTypeLabels.join(" ")}`,
      capability,
    )
  );
}

function matchesAuditLog(
  log: WorkspaceAuditLogSummary,
  capability: ImportRepairCapability,
) {
  const text = `${log.summary} ${log.action} ${JSON.stringify(log.metadata)}`;

  return (
    /import|conversion|repair/i.test(text) &&
    matchesProjectName(text, capability)
  );
}

function groupVersionsByProject(versions: ProjectVersionSummary[]) {
  const grouped = new Map<string, ProjectVersionSummary[]>();

  for (const version of versions) {
    grouped.set(version.projectId, [
      ...(grouped.get(version.projectId) ?? []),
      version,
    ]);
  }

  return grouped;
}

function groupLogsByProject(logs: WorkspaceAuditLogSummary[]) {
  const grouped = new Map<string, WorkspaceAuditLogSummary[]>();

  for (const log of logs) {
    if (!log.targetId) continue;

    grouped.set(log.targetId, [...(grouped.get(log.targetId) ?? []), log]);
  }

  return grouped;
}

function collectProjectGaps(
  orchestration: MixedFormatProjectOrchestration | undefined,
) {
  if (!orchestration) return [];

  const gaps = orchestration.pageReadiness.flatMap((page) =>
    page.gaps.filter((gap) => !/ready for this first-pass/i.test(gap)),
  );

  return Array.from(new Set([...gaps, ...orchestration.nextBestActions])).slice(
    0,
    4,
  );
}

function createEvidenceChecks(projects: ImportRepairEvidenceProject[]) {
  if (!projects.length) return ["No imported workspace evidence yet"];

  const checks = [
    `${projects.length} workspace project${projects.length === 1 ? "" : "s"} linked`,
  ];

  if (projects.some((project) => project.hasVersion)) {
    checks.push("Version snapshot available");
  }

  if (projects.some((project) => project.auditScore !== null)) {
    checks.push("Project audit reviewed");
  }

  if (projects.some((project) => project.auditLogCount > 0)) {
    checks.push("Workspace audit trail includes import activity");
  }

  if (projects.some((project) => project.gaps.length > 0)) {
    checks.push("Repair gaps captured");
  }

  return checks;
}

function toRepairStatus(
  status:
    | ImportRepairStatus
    | ProjectAuditSummary["status"]
    | MixedFormatProjectOrchestration["status"]
    | undefined,
): ImportRepairStatus | null {
  if (!status) return null;
  if (status === "fix") return "blocked";

  return status;
}

function mergeStatuses(statuses: Array<ImportRepairStatus | null>) {
  if (statuses.includes("blocked")) return "blocked";
  if (statuses.includes("review")) return "review";

  return "ready";
}

function compareEvidenceProjects(
  left: ImportRepairEvidenceProject,
  right: ImportRepairEvidenceProject,
) {
  return (
    statusWeight(left.status) - statusWeight(right.status) ||
    left.readinessScore - right.readinessScore ||
    Date.parse(right.latestAt) - Date.parse(left.latestAt) ||
    left.projectName.localeCompare(right.projectName)
  );
}

function statusWeight(status: ImportRepairStatus) {
  if (status === "blocked") return 0;
  if (status === "review") return 1;

  return 2;
}

function latestTimestamp(values: Array<string | null | undefined>) {
  const latest = values
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => Date.parse(right) - Date.parse(left))[0];

  return latest ?? new Date(0).toISOString();
}
