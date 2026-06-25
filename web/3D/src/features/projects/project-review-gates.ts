import {
  projectReviewStatusLabels,
  projectReviewSurfaceLabels,
  resolveShareSettings,
  type ProjectReviewSurface,
  type SharePermission,
  type ShareSettings,
} from "./share-settings";

export interface ProjectReviewGate {
  allowed: boolean;
  message: string;
  status: string;
  surface: ProjectReviewSurface;
  surfaceLabel: string;
}

const sharePermissionReviewSurfaces: Record<SharePermission, ProjectReviewSurface> = {
  allowCodeExport: "embed",
  allowEmbed: "embed",
  allowPublicApi: "embed",
  allowView: "publicLink",
  allowViewerDownload: "appPackage",
};

export function getProjectReviewGate(value: ShareSettings | null | undefined, surface: ProjectReviewSurface): ProjectReviewGate {
  const settings = resolveShareSettings(value);
  const decision = settings.reviewWorkflow[surface];
  const allowed = decision.status === "approved";
  const surfaceLabel = projectReviewSurfaceLabels[surface];
  const statusLabel = projectReviewStatusLabels[decision.status].toLowerCase();

  return {
    allowed,
    message: allowed ? `${surfaceLabel} is approved.` : `${surfaceLabel} requires approval before this action. Current state: ${statusLabel}.`,
    status: decision.status,
    surface,
    surfaceLabel,
  };
}

export function getSharePermissionReviewGate(value: ShareSettings | null | undefined, permission: SharePermission) {
  return getProjectReviewGate(value, sharePermissionReviewSurfaces[permission]);
}

export function hasProjectReviewApproval(value: ShareSettings | null | undefined, surface: ProjectReviewSurface) {
  return getProjectReviewGate(value, surface).allowed;
}
