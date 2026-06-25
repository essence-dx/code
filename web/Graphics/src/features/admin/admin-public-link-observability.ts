import {
  getPublicLinkSurfaces,
  sortPublicLinkSurfaces,
} from "@/features/admin/admin-public-link-observability-builders";
import {
  getEmptyPublicLinkObservabilityRow,
  sortPublicLinkRows,
  toPublicLinkObservabilityRows,
} from "@/features/admin/admin-public-link-observability-rows";
import type {
  AdminPublicLinkObservabilityInput,
  AdminPublicLinkObservabilityReport,
} from "@/features/admin/admin-public-link-observability-types";

export type {
  AdminPublicLinkObservabilityFile,
  AdminPublicLinkObservabilityInput,
  AdminPublicLinkObservabilityReport,
  AdminPublicLinkObservabilityRow,
  AdminPublicLinkObservabilityShare,
  AdminPublicLinkRowCategory,
  AdminPublicLinkStatus,
  AdminPublicLinkSurface,
  AdminPublicLinkSurfaceKind,
} from "@/features/admin/admin-public-link-observability-types";

export { normalizePublicLinkReferrerNotes } from "@/features/admin/admin-public-link-observability-utils";

export function getAdminPublicLinkObservabilityReport({
  baseUrl,
  files,
  generatedAt = new Date().toISOString(),
  now = Date.now(),
  productionDeploySmoke,
  publishChannels,
  referrerNotesByToken,
  shares,
}: AdminPublicLinkObservabilityInput): AdminPublicLinkObservabilityReport {
  const activeShares = shares.filter((share) => !share.disabledAt);
  const filesById = new Map(
    files.filter((file) => !file.trashedAt).map((file) => [file.fileId, file]),
  );
  const surfaces = activeShares
    .flatMap((share) =>
      getPublicLinkSurfaces({
        baseUrl,
        filesById,
        input: {
          baseUrl,
          files,
          generatedAt,
          now,
          productionDeploySmoke,
          publishChannels,
          referrerNotesByToken,
          shares,
        },
        now,
        share,
      }),
    )
    .sort(sortPublicLinkSurfaces);
  const rows = surfaces.flatMap(toPublicLinkObservabilityRows).sort(sortPublicLinkRows);
  const blockedCount = surfaces.filter((surface) => surface.status === "blocked").length;
  const reviewCount = surfaces.filter((surface) => surface.status === "review").length;
  const readyCount = surfaces.filter((surface) => surface.status === "ready").length;

  return {
    generatedAt,
    status: blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready",
    score: Math.max(0, 100 - blockedCount * 16 - reviewCount * 5),
    activeShareCount: activeShares.length,
    surfaceCount: surfaces.length,
    readyCount,
    reviewCount,
    blockedCount,
    embedSurfaceCount: surfaces.filter((surface) => surface.kind === "embed").length,
    prototypeSurfaceCount: surfaces.filter((surface) => surface.kind === "prototype").length,
    staleLinkCount: surfaces.filter((surface) => surface.stale).length,
    noExpiryCount: surfaces.filter((surface) => surface.expiryState === "never").length,
    downloadExposureCount: surfaces.filter((surface) => surface.allowDownload).length,
    commentExposureCount: surfaces.filter((surface) => surface.allowComments).length,
    missingReferrerNoteCount: surfaces.filter((surface) => !surface.referrerNote).length,
    releaseSafeCount: surfaces.filter((surface) => surface.releaseSafe).length,
    routeSmokeBlockedCount: surfaces.filter(
      (surface) => surface.smokeStatus === "blocked",
    ).length,
    surfaces,
    rows: rows.length > 0 ? rows : [getEmptyPublicLinkObservabilityRow()],
    commands: getPublicLinkObservabilityCommands(),
  };
}

function getPublicLinkObservabilityCommands() {
  return [
    "Run public route smoke for share, prototype, and embed targets before release approval.",
    "Set expiries and referrer notes for public links that leave the workspace.",
    "Disable download exposure unless a release handoff explicitly needs source exports.",
    "Use /embed/[token] for iframe surfaces and track the host in referrer notes.",
    "Export this report with the publish channel and access budget governance packet.",
  ];
}
