import type { WebsitePublishSummary } from "@/db/website-publishing";
import {
  exportCertificationArtifacts,
  exportCertificationDefinitions,
} from "@/features/export-certification/export-certification-artifacts";
import { createExportCertificationPacket } from "@/features/export-certification/export-certification-packets";
import { createCertificationQaMatrix } from "@/features/export-certification/export-certification-qa";
import { createCertificationSignoff } from "@/features/export-certification/export-certification-signoff";
import type {
  ExportCertificationArtifactDefinition,
  ExportCertificationCenter,
  ExportCertificationCenterInput,
  ExportCertificationWorkspace,
} from "@/features/export-certification/export-certification-types";
import {
  averageCertificationScore,
  clampCertificationScore,
  scoreToCertificationStatus,
  statusScore,
} from "@/features/export-certification/export-certification-utils";

export type {
  ExportCertificationArtifact,
  ExportCertificationCenter,
  ExportCertificationCenterInput,
  ExportCertificationCheck,
  ExportCertificationPacket,
  ExportCertificationQaMatrix,
  ExportCertificationSignoff,
  ExportCertificationStatus,
  ExportCertificationWorkspace,
} from "@/features/export-certification/export-certification-types";

export function createExportCertificationCenter(
  input: ExportCertificationCenterInput,
): ExportCertificationCenter {
  const generatedAt = normalizeDate(input.now).toISOString();
  const activeProjects = input.projects.filter((project) => !project.deletedAt);
  const workspaces = exportCertificationArtifacts.map((artifact) =>
    createExportCertificationWorkspace({
      ...input,
      projects: activeProjects,
      definition: exportCertificationDefinitions[artifact],
      generatedAt,
    }),
  );
  const score = averageCertificationScore(
    workspaces.map((workspace) => workspace.score),
  );

  return {
    status: scoreToCertificationStatus(
      score,
      workspaces.every((workspace) => workspace.status === "blocked"),
    ),
    score,
    generatedAt,
    workspaces,
    nextActions: createCertificationNextActions(workspaces),
    totals: {
      artifacts: workspaces.length,
      readyWorkspaces: workspaces.filter(
        (workspace) => workspace.status === "ready",
      ).length,
      blockedWorkspaces: workspaces.filter(
        (workspace) => workspace.status === "blocked",
      ).length,
      qaChecks: workspaces.reduce(
        (total, workspace) => total + workspace.qaMatrix.checks.length,
        0,
      ),
      signoffApprovals: workspaces.reduce(
        (total, workspace) =>
          total + workspace.stakeholderSignoff.approvalEvents.length,
        0,
      ),
      certificationPackets: workspaces.length,
      certifiedProjects: new Set(
        workspaces
          .filter((workspace) => workspace.status === "ready")
          .flatMap((workspace) => workspace.projectIds),
      ).size,
    },
  };
}

function createExportCertificationWorkspace(
  input: ExportCertificationCenterInput & {
    projects: ExportCertificationCenterInput["projects"];
    definition: ExportCertificationArtifactDefinition;
    generatedAt: string;
  },
): ExportCertificationWorkspace {
  const exportJobs = input.serverExportJobs.filter((job) =>
    input.definition.requiredExportFormats.includes(job.format),
  );
  const websitePublishes =
    input.definition.artifact === "website" ? input.websitePublishes : [];
  const projects = findWorkspaceProjects({
    definition: input.definition,
    projects: input.projects,
    exportJobs,
    websitePublishes,
  });
  const projectIds = projects.map((project) => project.id);
  const projectIdSet = new Set(projectIds);
  const audits = input.projectAudits.filter((audit) =>
    projectIdSet.has(audit.projectId),
  );
  const workspaceExportJobs = exportJobs.filter((job) =>
    projectIdSet.has(job.projectId),
  );
  const workspacePublishes = websitePublishes.filter((publish) =>
    projectIdSet.has(publish.projectId),
  );
  const qaMatrix = createCertificationQaMatrix({
    definition: input.definition,
    projects,
    audits,
    exportJobs: workspaceExportJobs,
    websitePublishes: workspacePublishes,
  });
  const stakeholderSignoff = createCertificationSignoff({
    definition: input.definition,
    projects,
    projectHandoffPackets: input.projectHandoffPackets.filter((packet) =>
      projectIdSet.has(packet.projectId),
    ),
    reviewTasks: input.reviewTasks.filter((task) =>
      projectIdSet.has(task.projectId),
    ),
    auditLogs: input.auditLogs,
    now: normalizeDate(input.now),
  });
  const score = clampCertificationScore(
    Math.round(qaMatrix.score * 0.64 + stakeholderSignoff.score * 0.36),
  );
  const status = scoreToCertificationStatus(
    score,
    qaMatrix.status === "blocked" || stakeholderSignoff.status === "blocked",
  );
  const projectNames = projects.map((project) => project.name);
  const certificationPacket = createExportCertificationPacket({
    definition: input.definition,
    status,
    generatedAt: input.generatedAt,
    projectIds,
    projectNames,
    qaMatrix,
    stakeholderSignoff,
  });

  return {
    artifact: input.definition.artifact,
    label: input.definition.label,
    description: input.definition.description,
    status,
    score,
    projectIds,
    projectNames,
    exportJobs: workspaceExportJobs,
    websitePublishes: workspacePublishes,
    qaMatrix,
    stakeholderSignoff,
    certificationPacket,
    nextAction: createWorkspaceNextAction({
      definition: input.definition,
      projects,
      qaMatrix,
      stakeholderSignoff,
    }),
  };
}

function findWorkspaceProjects(input: {
  definition: ExportCertificationArtifactDefinition;
  projects: ExportCertificationCenterInput["projects"];
  exportJobs: ExportCertificationCenterInput["serverExportJobs"];
  websitePublishes: WebsitePublishSummary[];
}) {
  const projectIds = new Set<string>();

  for (const job of input.exportJobs) {
    projectIds.add(job.projectId);
  }

  for (const publish of input.websitePublishes) {
    projectIds.add(publish.projectId);
  }

  for (const project of input.projects) {
    if (
      input.definition.projectNameHints.some((hint) => hint.test(project.name))
    ) {
      projectIds.add(project.id);
    }
  }

  return input.projects.filter((project) => projectIds.has(project.id));
}

function createWorkspaceNextAction(input: {
  definition: ExportCertificationArtifactDefinition;
  projects: ExportCertificationCenterInput["projects"];
  qaMatrix: ExportCertificationWorkspace["qaMatrix"];
  stakeholderSignoff: ExportCertificationWorkspace["stakeholderSignoff"];
}) {
  const projectName = input.projects[0]?.name;

  if (!projectName)
    return `${input.definition.label}: ${input.definition.emptyAction}`;

  if (input.stakeholderSignoff.status === "blocked") {
    return `${input.definition.label}: ${projectName} - ${input.stakeholderSignoff.summary}`;
  }

  const blockedCheck = input.qaMatrix.checks.find(
    (check) => check.status === "blocked",
  );

  if (blockedCheck) {
    return `${input.definition.label}: ${projectName} - ${blockedCheck.detail}`;
  }

  const reviewCheck = input.qaMatrix.checks.find(
    (check) => check.status === "review",
  );

  if (reviewCheck) {
    return `${input.definition.label}: ${projectName} - ${reviewCheck.detail}`;
  }

  if (input.stakeholderSignoff.status === "review") {
    return `${input.definition.label}: ${projectName} - ${input.stakeholderSignoff.summary}`;
  }

  return `${input.definition.label}: ${projectName} is certified with QA and signoff evidence.`;
}

function createCertificationNextActions(
  workspaces: ExportCertificationWorkspace[],
) {
  return workspaces
    .filter((workspace) => workspace.status !== "ready")
    .sort(
      (left, right) =>
        statusScore(left.status) - statusScore(right.status) ||
        exportCertificationArtifacts.indexOf(left.artifact) -
          exportCertificationArtifacts.indexOf(right.artifact) ||
        left.score - right.score,
    )
    .map((workspace) => workspace.nextAction)
    .slice(0, 5);
}

function normalizeDate(value: ExportCertificationCenterInput["now"]) {
  if (!value) return new Date();
  if (value instanceof Date) return value;

  return new Date(value);
}
