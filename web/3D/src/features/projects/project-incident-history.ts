import { createExportManifest, type ExportReadinessFormat } from "@/features/editor/utils/export-manifest";
import { sceneDocumentSchema } from "@/features/editor/types";
import type { PostDeploySyntheticSmokeReport } from "@/features/deployment/post-deploy-synthetic-smoke";
import { getProjectReviewGate } from "./project-review-gates";
import { projectReviewSurfaceKeys, projectReviewSurfaceLabels, type ShareSettings } from "./share-settings";

type DateLike = Date | string | null | undefined;

export type ProjectIncidentKind = "blocked-review-gate" | "failed-export" | "post-deploy-failure";
export type ProjectIncidentSeverity = "critical" | "warning";

export interface ProjectIncidentHistoryProject {
  archivedAt: DateLike;
  id: string;
  name: string;
  publishedAt: DateLike;
  sceneData: unknown;
  shareId: string | null;
  shareSettings: ShareSettings | null;
  updatedAt: DateLike;
}

export interface ProjectIncident {
  actionLabel: string;
  count: number;
  details: string[];
  id: string;
  kind: ProjectIncidentKind;
  message: string;
  occurredAt: string | null;
  projectId: string;
  projectName: string;
  severity: ProjectIncidentSeverity;
  source: "export-manifest" | "post-deploy-smoke" | "review-workflow";
  title: string;
}

export interface ProjectIncidentHistory {
  generatedAt: string;
  incidents: ProjectIncident[];
  summary: {
    blockedReviewCount: number;
    criticalCount: number;
    failedExportCount: number;
    impactedProjectCount: number;
    postDeployFailureCount: number;
    totalCount: number;
    warningCount: number;
  };
}

const exportFormats: ExportReadinessFormat[] = ["web", "glb", "stl", "usdz"];
const severityRank: Record<ProjectIncidentSeverity, number> = {
  critical: 0,
  warning: 1,
};

function toTime(value: DateLike) {
  if (!value) {
    return 0;
  }

  const time = value instanceof Date ? value.getTime() : new Date(value).getTime();

  return Number.isNaN(time) ? 0 : time;
}

function toIso(value: DateLike) {
  const time = toTime(value);

  return time > 0 ? new Date(time).toISOString() : null;
}

function createIncident(input: Omit<ProjectIncident, "id">): ProjectIncident {
  return {
    ...input,
    id: `${input.projectId}:${input.kind}:${input.occurredAt ?? "unknown"}`,
  };
}

function formatList(values: string[]) {
  if (values.length <= 2) {
    return values.join(", ");
  }

  return `${values.slice(0, 2).join(", ")} +${values.length - 2}`;
}

function createBlockedReviewIncident(project: ProjectIncidentHistoryProject) {
  const blockedGates = projectReviewSurfaceKeys.map((surface) => getProjectReviewGate(project.shareSettings, surface)).filter((gate) => !gate.allowed);

  if (blockedGates.length === 0) {
    return null;
  }

  const labels = blockedGates.map((gate) => gate.surfaceLabel);

  return createIncident({
    actionLabel: "Open review workflow",
    count: blockedGates.length,
    details: blockedGates.map((gate) => gate.message),
    kind: "blocked-review-gate",
    message: `${formatList(labels)} ${blockedGates.length === 1 ? "is" : "are"} blocking release or public handoff.`,
    occurredAt: toIso(project.updatedAt),
    projectId: project.id,
    projectName: project.name,
    severity: project.publishedAt ? "critical" : "warning",
    source: "review-workflow",
    title: "Blocked review gates",
  });
}

function createExportIncident(project: ProjectIncidentHistoryProject) {
  const parsedScene = sceneDocumentSchema.safeParse(project.sceneData);

  if (!parsedScene.success) {
    return createIncident({
      actionLabel: "Repair scene",
      count: 1,
      details: ["Scene data could not be parsed by the current schema."],
      kind: "failed-export",
      message: "Scene data is invalid, so exported packages and public viewers need repair.",
      occurredAt: toIso(project.updatedAt),
      projectId: project.id,
      projectName: project.name,
      severity: "critical",
      source: "export-manifest",
      title: "Export failed",
    });
  }

  const manifest = createExportManifest(parsedScene.data);
  const blockedFormats = exportFormats
    .map((format) => ({ format, readiness: manifest.readiness[format] }))
    .filter((entry) => entry.readiness.status !== "ready");

  if (blockedFormats.length === 0) {
    return null;
  }

  const reviewCount = blockedFormats.filter((entry) => entry.readiness.status === "review").length;
  const labels = blockedFormats.map((entry) => entry.format.toUpperCase());
  const details = blockedFormats.flatMap((entry) => entry.readiness.notes.map((note) => `${entry.format.toUpperCase()}: ${note}`));

  return createIncident({
    actionLabel: "Check export readiness",
    count: blockedFormats.length,
    details,
    kind: "failed-export",
    message: `${formatList(labels)} ${blockedFormats.length === 1 ? "needs" : "need"} export review before handoff.`,
    occurredAt: toIso(project.updatedAt),
    projectId: project.id,
    projectName: project.name,
    severity: reviewCount > 0 ? "critical" : "warning",
    source: "export-manifest",
    title: reviewCount > 0 ? "Export failed" : "Export review needed",
  });
}

function createPostDeployIncidents(projects: Map<string, ProjectIncidentHistoryProject>, reports: PostDeploySyntheticSmokeReport[]) {
  return reports.flatMap((report) => {
    if (report.status !== "fail") {
      return [];
    }

    const project = projects.get(report.projectId);

    if (!project) {
      return [];
    }

    const failedChecks = report.checks.filter((check) => check.status === "fail");
    const labels = failedChecks.map((check) => check.label);

    return [
      createIncident({
        actionLabel: "Run deploy smoke",
        count: failedChecks.length,
        details: failedChecks.flatMap((check) => (check.issues.length > 0 ? check.issues.map((issue) => `${check.label}: ${issue}`) : [`${check.label}: ${check.httpStatus ?? "no response"}`])),
        kind: "post-deploy-failure",
        message: `${formatList(labels)} ${failedChecks.length === 1 ? "failed" : "failed"} after deployment.`,
        occurredAt: report.generatedAt,
        projectId: project.id,
        projectName: project.name,
        severity: "critical",
        source: "post-deploy-smoke",
        title: "Post-deploy smoke failed",
      }),
    ];
  });
}

export function summarizeProjectIncidentHistory(incidents: ProjectIncident[]): ProjectIncidentHistory["summary"] {
  return {
    blockedReviewCount: incidents.filter((incident) => incident.kind === "blocked-review-gate").length,
    criticalCount: incidents.filter((incident) => incident.severity === "critical").length,
    failedExportCount: incidents.filter((incident) => incident.kind === "failed-export").length,
    impactedProjectCount: new Set(incidents.map((incident) => incident.projectId)).size,
    postDeployFailureCount: incidents.filter((incident) => incident.kind === "post-deploy-failure").length,
    totalCount: incidents.length,
    warningCount: incidents.filter((incident) => incident.severity === "warning").length,
  };
}

export function createProjectIncidentHistory(input: {
  now?: Date;
  postDeployReports?: PostDeploySyntheticSmokeReport[];
  projects: ProjectIncidentHistoryProject[];
}): ProjectIncidentHistory {
  const now = input.now ?? new Date();
  const activeProjects = input.projects.filter((project) => !project.archivedAt);
  const projectById = new Map(activeProjects.map((project) => [project.id, project]));
  const currentIncidents = activeProjects.flatMap((project) => [createBlockedReviewIncident(project), createExportIncident(project)].filter((incident): incident is ProjectIncident => Boolean(incident)));
  const historicalIncidents = createPostDeployIncidents(projectById, input.postDeployReports ?? []);
  const incidents = [...currentIncidents, ...historicalIncidents]
    .sort((first, second) => toTime(second.occurredAt) - toTime(first.occurredAt) || severityRank[first.severity] - severityRank[second.severity] || first.title.localeCompare(second.title))
    .slice(0, 30);

  return {
    generatedAt: now.toISOString(),
    incidents,
    summary: summarizeProjectIncidentHistory(incidents),
  };
}
