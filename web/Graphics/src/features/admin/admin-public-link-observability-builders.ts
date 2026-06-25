import { getPrototypeFlowDiagnostics } from "@/features/editor/prototype-flow-diagnostics";
import type {
  AdminPublicLinkObservabilityFile,
  AdminPublicLinkObservabilityInput,
  AdminPublicLinkObservabilityShare,
  AdminPublicLinkStatus,
  AdminPublicLinkSurface,
  AdminPublicLinkSurfaceKind,
} from "@/features/admin/admin-public-link-observability-types";
import {
  getWorstPublicLinkStatus,
  joinPublicLinkUrl,
  publicLinkStatusWeight,
} from "@/features/admin/admin-public-link-observability-utils";

const staleLinkDays = 30;

export function getPublicLinkSurfaces({
  baseUrl,
  filesById,
  input,
  now,
  share,
}: {
  baseUrl: string;
  filesById: Map<string, AdminPublicLinkObservabilityFile>;
  input: AdminPublicLinkObservabilityInput;
  now: number;
  share: AdminPublicLinkObservabilityShare;
}) {
  const file = filesById.get(share.fileId);
  const prototype = file ? getPrototypeFlowDiagnostics(file.document) : null;
  const surfaces = [
    toSurface({
      baseUrl,
      file,
      input,
      kind: "handoff",
      now,
      path: `/share/${share.token}`,
      prototype,
      share,
    }),
    prototype && (prototype.hotspotCount > 0 || share.accessLevel === "prototype")
      ? toSurface({
          baseUrl,
          file,
          input,
          kind: "prototype",
          now,
          path: `/share/${share.token}/prototype`,
          prototype,
          share,
        })
      : null,
    toSurface({
      baseUrl,
      file,
      input,
      kind: "embed",
      now,
      path: `/embed/${share.token}`,
      prototype,
      share,
    }),
  ];

  return surfaces.filter(
    (surface): surface is AdminPublicLinkSurface => Boolean(surface),
  );
}

export function sortPublicLinkSurfaces(
  left: AdminPublicLinkSurface,
  right: AdminPublicLinkSurface,
) {
  return (
    publicLinkStatusWeight[left.status] - publicLinkStatusWeight[right.status] ||
    kindWeight(left.kind) - kindWeight(right.kind) ||
    left.fileName.localeCompare(right.fileName)
  );
}

function toSurface({
  baseUrl,
  file,
  input,
  kind,
  now,
  path,
  prototype,
  share,
}: {
  baseUrl: string;
  file: AdminPublicLinkObservabilityFile | undefined;
  input: AdminPublicLinkObservabilityInput;
  kind: AdminPublicLinkSurfaceKind;
  now: number;
  path: string;
  prototype: ReturnType<typeof getPrototypeFlowDiagnostics> | null;
  share: AdminPublicLinkObservabilityShare;
}): AdminPublicLinkSurface {
  const smoke = getSmokeForSurface(input.productionDeploySmoke, kind);
  const publishChannel = input.publishChannels.channels.find(
    (channel) => channel.shareId === share.id,
  );
  const expired = share.expiresAt
    ? new Date(share.expiresAt).getTime() < now
    : false;
  const stale =
    !share.expiresAt &&
    new Date(share.createdAt).getTime() <
      now - staleLinkDays * 24 * 60 * 60 * 1000;
  const referrerNote =
    input.referrerNotesByToken[share.token] ??
    input.referrerNotesByToken[share.id] ??
    input.referrerNotesByToken[share.fileId] ??
    input.referrerNotesByToken["*"] ??
    null;
  const blockers = [
    !file ? "Source file is outside the current admin file window." : "",
    expired ? "Public link is expired but still enabled." : "",
    smoke.status === "blocked" ? "Public route smoke is blocked." : "",
    kind === "prototype" && prototype && prototype.brokenCount > 0
      ? "Prototype route has broken hotspot targets."
      : "",
  ].filter(Boolean);
  const warnings = [
    stale ? "No-expiry public link is older than 30 days." : "",
    !share.expiresAt ? "No expiry is set." : "",
    share.allowDownload ? "Downloads are enabled." : "",
    share.allowComments ? "Comments are enabled." : "",
    !referrerNote ? "No referrer note is configured." : "",
    smoke.status === "review" ? "Public route smoke needs review." : "",
    publishChannel?.approvalState !== "approved"
      ? "Publish channel approval is missing or needs review."
      : "",
    publishChannel?.rollbackState !== "linked"
      ? "Rollback link is missing or needs review."
      : "",
  ].filter(Boolean);
  const status = getWorstPublicLinkStatus([
    blockers.length > 0 ? "blocked" : "ready",
    warnings.length > 0 ? "review" : "ready",
    smoke.status,
  ]);
  const releaseSafe =
    status === "ready" &&
    Boolean(referrerNote) &&
    Boolean(share.expiresAt) &&
    !share.allowDownload;

  return {
    id: `${kind}-${share.id}`,
    shareId: share.id,
    token: share.token,
    kind,
    status,
    label: `${share.fileName} ${formatKind(kind)}`,
    fileId: share.fileId,
    fileName: share.fileName,
    ownerEmail: share.ownerEmail,
    targetUrl: joinPublicLinkUrl(baseUrl, path),
    routePath: path,
    permissionPreset: share.permissionPreset,
    smokeStatus: smoke.status,
    smokeLabel: smoke.label,
    expiryState: expired ? "expired" : share.expiresAt ? "scheduled" : "never",
    stale,
    allowComments: share.allowComments,
    allowDownload: share.allowDownload,
    referrerNote,
    releaseSafe,
    latestAt: share.createdAt,
    blockerCount: blockers.length,
    reviewCount: warnings.length,
    blockers,
    warnings,
    recommendation:
      status === "ready"
        ? "Public target is ready for release-safe publication."
        : "Refresh smoke, expiry, exposure, referrer, approval, and rollback evidence before publication.",
  };
}

function getSmokeForSurface(
  report: AdminPublicLinkObservabilityInput["productionDeploySmoke"],
  kind: AdminPublicLinkSurfaceKind,
) {
  const smokeKind = kind === "handoff" ? "share" : kind;
  const rows = report.rows.filter((row) => row.kind === smokeKind);

  return {
    status: getWorstPublicLinkStatus(
      rows.map((row) => row.status as AdminPublicLinkStatus),
      "review",
    ),
    label: rows[0]?.label ?? `${formatKind(kind)} route smoke`,
  };
}

function formatKind(kind: AdminPublicLinkSurfaceKind) {
  if (kind === "handoff") {
    return "handoff";
  }

  return kind;
}

function kindWeight(kind: AdminPublicLinkSurfaceKind) {
  const weights: Record<AdminPublicLinkSurfaceKind, number> = {
    handoff: 0,
    prototype: 1,
    embed: 2,
  };

  return weights[kind];
}
