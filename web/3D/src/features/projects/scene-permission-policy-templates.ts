import {
  defaultProjectReviewDecision,
  projectReviewSurfaceKeys,
  projectReviewSurfaceLabels,
  resolveShareSettings,
  sharePermissionKeys,
  type ProjectReviewSurface,
  type SharePermission,
  type ShareSettings,
} from "@/features/projects/share-settings";

type DateLike = Date | string | null | undefined;

export type ScenePermissionPolicyTemplateId = "api-partner" | "app-package-release" | "embed-portfolio" | "viewer-review";
export type ScenePermissionPolicySurface = "api" | "appPackage" | "embed" | "viewer";
export type ScenePermissionPolicyStatus = "blocked" | "ready" | "watch";
export type ScenePermissionMap = Pick<ShareSettings, SharePermission>;

export interface ScenePermissionPolicyTemplate {
  description: string;
  embedSettings: Pick<ShareSettings, "embedCameraControls" | "embedLayout" | "embedShowGrid" | "embedShowNavigation" | "embedTransparentBackground">;
  id: ScenePermissionPolicyTemplateId;
  label: string;
  permissions: ScenePermissionMap;
  requiredReviewSurfaces: ProjectReviewSurface[];
  reviewIntent: string;
  surfaces: ScenePermissionPolicySurface[];
}

export interface ScenePermissionPolicyTemplateProjectSource {
  archivedAt: DateLike;
  id: string;
  name: string;
  publishedAt: DateLike;
  shareSettings: unknown;
}

export interface ScenePermissionPolicyTemplateRow {
  description: string;
  enabledPermissionCount: number;
  id: ScenePermissionPolicyTemplateId;
  label: string;
  matchingProjectCount: number;
  nextAction: string;
  permissionSummary: string;
  projectNames: string[];
  requiredReviewLabels: string[];
  surfaceLabels: string[];
  templateId: ScenePermissionPolicyTemplateId;
}

export interface ScenePermissionPolicyTemplateProjectRow {
  currentPermissionSummary: string;
  matchedTemplateId: ScenePermissionPolicyTemplateId | null;
  matchedTemplateLabel: string | null;
  nextAction: string;
  projectId: string;
  projectName: string;
  recommendedTemplateId: ScenePermissionPolicyTemplateId;
  recommendedTemplateLabel: string;
  status: ScenePermissionPolicyStatus;
}

export interface ScenePermissionPolicyTemplateReport {
  csvContent: string;
  generatedAt: string;
  projectRows: ScenePermissionPolicyTemplateProjectRow[];
  rows: ScenePermissionPolicyTemplateRow[];
  summary: {
    activeProjectCount: number;
    blockedProjectCount: number;
    classifiedProjectCount: number;
    coverageScore: number;
    readyProjectCount: number;
    status: ScenePermissionPolicyStatus;
    templateCount: number;
    unclassifiedProjectCount: number;
    watchProjectCount: number;
  };
}

export interface CreateScenePermissionPolicyTemplateReportInput {
  generatedAt?: string;
  projects: ScenePermissionPolicyTemplateProjectSource[];
}

const surfaceLabels: Record<ScenePermissionPolicySurface, string> = {
  api: "Scene API",
  appPackage: "App package",
  embed: "Embed",
  viewer: "Viewer",
};

const permissionLabels: Record<SharePermission, string> = {
  allowCodeExport: "code",
  allowEmbed: "embed",
  allowPublicApi: "api",
  allowView: "viewer",
  allowViewerDownload: "download",
};

export const scenePermissionPolicyTemplates = [
  {
    description: "Public viewer access without embeds, API payloads, snippets, or package downloads.",
    embedSettings: {
      embedCameraControls: "locked",
      embedLayout: "fixed",
      embedShowGrid: false,
      embedShowNavigation: false,
      embedTransparentBackground: false,
    },
    id: "viewer-review",
    label: "Viewer review",
    permissions: {
      allowCodeExport: false,
      allowEmbed: false,
      allowPublicApi: false,
      allowView: true,
      allowViewerDownload: false,
    },
    requiredReviewSurfaces: ["publicLink"],
    reviewIntent: "Viewer-only public page approval before sharing a stable scene link.",
    surfaces: ["viewer"],
  },
  {
    description: "Website embed package with iframe and snippet access while API payloads and downloads stay closed.",
    embedSettings: {
      embedCameraControls: "orbit",
      embedLayout: "responsive",
      embedShowGrid: false,
      embedShowNavigation: true,
      embedTransparentBackground: true,
    },
    id: "embed-portfolio",
    label: "Embed portfolio",
    permissions: {
      allowCodeExport: true,
      allowEmbed: true,
      allowPublicApi: false,
      allowView: true,
      allowViewerDownload: false,
    },
    requiredReviewSurfaces: ["publicLink", "embed"],
    reviewIntent: "Embed and public link approval for website placement.",
    surfaces: ["viewer", "embed"],
  },
  {
    description: "Partner integration access for public scene API payloads and fetch helpers without app-package downloads.",
    embedSettings: {
      embedCameraControls: "locked",
      embedLayout: "responsive",
      embedShowGrid: false,
      embedShowNavigation: false,
      embedTransparentBackground: true,
    },
    id: "api-partner",
    label: "API partner",
    permissions: {
      allowCodeExport: true,
      allowEmbed: false,
      allowPublicApi: true,
      allowView: false,
      allowViewerDownload: false,
    },
    requiredReviewSurfaces: ["embed"],
    reviewIntent: "API payload and generated helper approval for partner integrations.",
    surfaces: ["api"],
  },
  {
    description: "Release package access for viewer downloads, self-hosted HTML, and native app starter packages.",
    embedSettings: {
      embedCameraControls: "orbit",
      embedLayout: "responsive",
      embedShowGrid: true,
      embedShowNavigation: true,
      embedTransparentBackground: false,
    },
    id: "app-package-release",
    label: "App package release",
    permissions: {
      allowCodeExport: true,
      allowEmbed: true,
      allowPublicApi: false,
      allowView: true,
      allowViewerDownload: true,
    },
    requiredReviewSurfaces: ["appPackage", "desktopRelease"],
    reviewIntent: "Package and desktop-release approval before exporting distributable viewers or app starters.",
    surfaces: ["viewer", "embed", "appPackage"],
  },
] as const satisfies ScenePermissionPolicyTemplate[];

function isArchived(value: DateLike) {
  return Boolean(value);
}

function escapeCsvValue(value: string | number | null) {
  const text = String(value ?? "");

  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function permissionsFromSettings(settings: ShareSettings): ScenePermissionMap {
  return {
    allowCodeExport: settings.allowCodeExport,
    allowEmbed: settings.allowEmbed,
    allowPublicApi: settings.allowPublicApi,
    allowView: settings.allowView,
    allowViewerDownload: settings.allowViewerDownload,
  };
}

function permissionMapsEqual(first: ScenePermissionMap, second: ScenePermissionMap) {
  return sharePermissionKeys.every((permission) => first[permission] === second[permission]);
}

function permissionSummary(permissions: ScenePermissionMap) {
  const enabled = sharePermissionKeys.filter((permission) => permissions[permission]).map((permission) => permissionLabels[permission]);

  return enabled.length > 0 ? enabled.join(", ") : "private";
}

function requiredReviewLabels(surfaces: ProjectReviewSurface[]) {
  return surfaces.map((surface) => projectReviewSurfaceLabels[surface]);
}

export function getScenePermissionPolicyTemplate(id: ScenePermissionPolicyTemplateId) {
  return scenePermissionPolicyTemplates.find((template) => template.id === id) ?? null;
}

export function applyScenePermissionPolicyTemplate(
  value: ShareSettings | null | undefined,
  templateId: ScenePermissionPolicyTemplateId,
  options: { now?: string; reviewerName?: string } = {},
): ShareSettings {
  const template = getScenePermissionPolicyTemplate(templateId);

  if (!template) {
    return resolveShareSettings(value);
  }

  const baseSettings = resolveShareSettings(value);
  const now = options.now ?? new Date().toISOString();
  const requiredSurfaces = new Set<ProjectReviewSurface>(template.requiredReviewSurfaces);
  const reviewWorkflow = Object.fromEntries(
    projectReviewSurfaceKeys.map((surface) => [
      surface,
      requiredSurfaces.has(surface)
        ? {
            note: `${template.reviewIntent} Template: ${template.label}.`,
            reviewerName: options.reviewerName,
            status: "requested",
            updatedAt: now,
          }
        : { ...defaultProjectReviewDecision },
    ]),
  ) as ShareSettings["reviewWorkflow"];

  return {
    ...baseSettings,
    ...template.permissions,
    ...template.embedSettings,
    reviewWorkflow,
  };
}

function matchTemplate(settings: ShareSettings) {
  const permissions = permissionsFromSettings(settings);

  return scenePermissionPolicyTemplates.find((template) => permissionMapsEqual(template.permissions, permissions)) ?? null;
}

function recommendTemplate(settings: ShareSettings) {
  if (settings.allowViewerDownload) {
    return getScenePermissionPolicyTemplate("app-package-release")!;
  }

  if (settings.allowPublicApi) {
    return getScenePermissionPolicyTemplate("api-partner")!;
  }

  if (settings.allowEmbed || settings.allowCodeExport) {
    return getScenePermissionPolicyTemplate("embed-portfolio")!;
  }

  return getScenePermissionPolicyTemplate("viewer-review")!;
}

function projectRow(project: ScenePermissionPolicyTemplateProjectSource): ScenePermissionPolicyTemplateProjectRow {
  const settings = resolveShareSettings(project.shareSettings);
  const matchedTemplate = matchTemplate(settings);
  const recommendedTemplate = matchedTemplate ?? recommendTemplate(settings);
  const status: ScenePermissionPolicyStatus =
    matchedTemplate === null
      ? "blocked"
      : recommendedTemplate.requiredReviewSurfaces.some((surface) => settings.reviewWorkflow[surface].status === "changesRequested")
        ? "blocked"
        : recommendedTemplate.requiredReviewSurfaces.some((surface) => settings.reviewWorkflow[surface].status !== "approved")
          ? "watch"
          : "ready";

  return {
    currentPermissionSummary: permissionSummary(permissionsFromSettings(settings)),
    matchedTemplateId: matchedTemplate?.id ?? null,
    matchedTemplateLabel: matchedTemplate?.label ?? null,
    nextAction:
      status === "blocked"
        ? "Apply a scene permission policy template and clear rejected review gates before sharing."
        : status === "watch"
          ? "Finish requested review gates before release handoff."
          : "Keep this policy template attached for audit evidence.",
    projectId: project.id,
    projectName: project.name,
    recommendedTemplateId: recommendedTemplate.id,
    recommendedTemplateLabel: recommendedTemplate.label,
    status,
  };
}

function templateRows(projectRows: ScenePermissionPolicyTemplateProjectRow[]): ScenePermissionPolicyTemplateRow[] {
  return scenePermissionPolicyTemplates.map((template) => {
    const matchingProjects = projectRows.filter((project) => project.matchedTemplateId === template.id);

    return {
      description: template.description,
      enabledPermissionCount: sharePermissionKeys.filter((permission) => template.permissions[permission]).length,
      id: template.id,
      label: template.label,
      matchingProjectCount: matchingProjects.length,
      nextAction:
        matchingProjects.length > 0
          ? "Keep matching projects reviewed against this policy before release."
          : "Use this template when a project needs this exposure surface.",
      permissionSummary: permissionSummary(template.permissions),
      projectNames: matchingProjects.map((project) => project.projectName),
      requiredReviewLabels: requiredReviewLabels(template.requiredReviewSurfaces),
      surfaceLabels: template.surfaces.map((surface) => surfaceLabels[surface]),
      templateId: template.id,
    };
  });
}

export function createScenePermissionPolicyTemplateCsv(report: Pick<ScenePermissionPolicyTemplateReport, "rows">) {
  const header = ["template_id", "label", "surface_count", "permission_summary", "matching_projects", "required_reviews"];
  const lines = report.rows.map((row) =>
    [row.id, row.label, row.surfaceLabels.length, row.permissionSummary, row.matchingProjectCount, row.requiredReviewLabels.join("; ")]
      .map(escapeCsvValue)
      .join(","),
  );

  return `${[header.join(","), ...lines].join("\n")}\n`;
}

export function createScenePermissionPolicyTemplateReport(input: CreateScenePermissionPolicyTemplateReportInput): ScenePermissionPolicyTemplateReport {
  const activeProjects = input.projects.filter((project) => !isArchived(project.archivedAt));
  const projectRows = activeProjects.map(projectRow);
  const rows = templateRows(projectRows);
  const classifiedProjectCount = projectRows.filter((row) => row.matchedTemplateId !== null).length;
  const blockedProjectCount = projectRows.filter((row) => row.status === "blocked").length;
  const watchProjectCount = projectRows.filter((row) => row.status === "watch").length;
  const readyProjectCount = projectRows.filter((row) => row.status === "ready").length;
  const reportWithoutCsv = {
    csvContent: "",
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    projectRows,
    rows,
    summary: {
      activeProjectCount: activeProjects.length,
      blockedProjectCount,
      classifiedProjectCount,
      coverageScore: Math.round((classifiedProjectCount / Math.max(activeProjects.length, 1)) * 100),
      readyProjectCount,
      status: blockedProjectCount > 0 ? "blocked" : watchProjectCount > 0 ? "watch" : "ready",
      templateCount: scenePermissionPolicyTemplates.length,
      unclassifiedProjectCount: projectRows.length - classifiedProjectCount,
      watchProjectCount,
    },
  } satisfies ScenePermissionPolicyTemplateReport;

  return {
    ...reportWithoutCsv,
    csvContent: createScenePermissionPolicyTemplateCsv(reportWithoutCsv),
  };
}
