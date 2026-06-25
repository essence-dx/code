import { z } from "zod";

export const sharePermissionKeys = ["allowCodeExport", "allowEmbed", "allowPublicApi", "allowView", "allowViewerDownload"] as const;
export const projectReviewSurfaceKeys = ["publicLink", "embed", "desktopRelease", "appPackage"] as const;
export const projectReviewStatuses = ["draft", "requested", "changesRequested", "approved"] as const;
export const embedLayoutSchema = z.enum(["fixed", "responsive"]);
export const embedCameraControlsSchema = z.enum(["orbit", "locked"]);
export const projectReviewStatusSchema = z.enum(projectReviewStatuses);

export type ProjectReviewStatus = (typeof projectReviewStatuses)[number];
export type ProjectReviewSurface = (typeof projectReviewSurfaceKeys)[number];
export interface ProjectReviewDecision {
  note?: string;
  reviewerName?: string;
  status: ProjectReviewStatus;
  updatedAt?: string;
}
export type ProjectReviewWorkflow = Record<ProjectReviewSurface, ProjectReviewDecision>;

export const projectReviewDecisionSchema = z.object({
  note: z.string().max(160).optional(),
  reviewerName: z.string().max(80).optional(),
  status: projectReviewStatusSchema.default("draft"),
  updatedAt: z.string().datetime().optional(),
});

export const defaultProjectReviewDecision: ProjectReviewDecision = {
  status: "draft",
};

export const defaultProjectReviewWorkflow: ProjectReviewWorkflow = {
  appPackage: defaultProjectReviewDecision,
  desktopRelease: defaultProjectReviewDecision,
  embed: defaultProjectReviewDecision,
  publicLink: defaultProjectReviewDecision,
};

export const projectReviewWorkflowSchema = z
  .object({
    appPackage: projectReviewDecisionSchema.default(defaultProjectReviewDecision),
    desktopRelease: projectReviewDecisionSchema.default(defaultProjectReviewDecision),
    embed: projectReviewDecisionSchema.default(defaultProjectReviewDecision),
    publicLink: projectReviewDecisionSchema.default(defaultProjectReviewDecision),
  })
  .default(defaultProjectReviewWorkflow);

export const shareSettingsSchema = z.object({
  allowCodeExport: z.boolean().default(true),
  allowEmbed: z.boolean().default(true),
  allowPublicApi: z.boolean().default(true),
  allowView: z.boolean().default(true),
  allowViewerDownload: z.boolean().default(true),
  embedCameraControls: embedCameraControlsSchema.default("orbit"),
  embedHeight: z.number().int().min(240).max(1600).default(640),
  embedLayout: embedLayoutSchema.default("fixed"),
  embedRadius: z.number().int().min(0).max(48).default(12),
  embedShowGrid: z.boolean().default(true),
  embedShowNavigation: z.boolean().default(true),
  embedTransparentBackground: z.boolean().default(false),
  reviewWorkflow: projectReviewWorkflowSchema,
});

export type ShareSettings = z.infer<typeof shareSettingsSchema>;
export type SharePermission = (typeof sharePermissionKeys)[number];
export type EmbedLayout = z.infer<typeof embedLayoutSchema>;
export type EmbedCameraControls = z.infer<typeof embedCameraControlsSchema>;

export const projectReviewSurfaceLabels: Record<ProjectReviewSurface, string> = {
  appPackage: "App packages",
  desktopRelease: "Desktop release",
  embed: "Embeds",
  publicLink: "Public link",
};

export const projectReviewStatusLabels: Record<ProjectReviewStatus, string> = {
  approved: "Approved",
  changesRequested: "Changes",
  draft: "Draft",
  requested: "In review",
};

export const defaultShareSettings: ShareSettings = {
  allowCodeExport: true,
  allowEmbed: true,
  allowPublicApi: true,
  allowView: true,
  allowViewerDownload: true,
  embedCameraControls: "orbit",
  embedHeight: 640,
  embedLayout: "fixed",
  embedRadius: 12,
  embedShowGrid: true,
  embedShowNavigation: true,
  embedTransparentBackground: false,
  reviewWorkflow: defaultProjectReviewWorkflow,
};

export function resolveShareSettings(value: unknown): ShareSettings {
  const parsed = shareSettingsSchema.safeParse(value);

  return parsed.success ? parsed.data : defaultShareSettings;
}

export function resolveProjectReviewWorkflow(value: unknown): ProjectReviewWorkflow {
  const parsed = projectReviewWorkflowSchema.safeParse(value);

  return parsed.success ? parsed.data : defaultProjectReviewWorkflow;
}

export function updateProjectReviewWorkflow(
  workflow: ProjectReviewWorkflow,
  surface: ProjectReviewSurface,
  status: ProjectReviewStatus,
  options: { note?: string; reviewerName?: string; updatedAt?: string } = {},
): ProjectReviewWorkflow {
  return {
    ...workflow,
    [surface]: {
      note: options.note,
      reviewerName: options.reviewerName,
      status,
      updatedAt: options.updatedAt,
    },
  };
}

export function summarizeProjectReviewWorkflow(workflow: ProjectReviewWorkflow) {
  const decisions = projectReviewSurfaceKeys.map((surface) => workflow[surface]);

  return {
    approvedCount: decisions.filter((decision) => decision.status === "approved").length,
    blockedCount: decisions.filter((decision) => decision.status === "changesRequested").length,
    requestedCount: decisions.filter((decision) => decision.status === "requested").length,
    surfaceCount: decisions.length,
  };
}

export function hasSharePermission(value: unknown, permission: SharePermission) {
  return resolveShareSettings(value)[permission];
}
