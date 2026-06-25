import { getPrototypeFlowDiagnostics } from "@/features/editor/prototype-flow-diagnostics";
import type {
  AdminPublishApprovalState,
  AdminPublishChannel,
  AdminPublishChannelKind,
  AdminPublishChannelManagerInput,
  AdminPublishChannelShare,
  AdminPublishChannelStatus,
  AdminPublishRollbackState,
} from "@/features/admin/admin-publish-channel-manager-types";

export function toShareChannel({
  baseUrl,
  file,
  latestApproval,
  now,
  productionDeploySmoke,
  rollbackReadiness,
  share,
}: {
  baseUrl: string;
  file: AdminPublishChannelManagerInput["files"][number] | undefined;
  latestApproval: AdminPublishChannelManagerInput["releaseApprovalSnapshots"][number] | null;
  now: number;
  productionDeploySmoke: AdminPublishChannelManagerInput["productionDeploySmoke"];
  rollbackReadiness: AdminPublishChannelManagerInput["rollbackReadiness"];
  share: AdminPublishChannelShare;
}): AdminPublishChannel {
  const kind = getShareKind(share);
  const smoke = getSmokeRoute(productionDeploySmoke, kind);
  const prototype = file ? getPrototypeFlowDiagnostics(file.document) : null;
  const approvalState = getApprovalState(latestApproval);
  const rollbackState = getRollbackState(rollbackReadiness, share.fileId);
  const expired = share.expiresAt ? new Date(share.expiresAt).getTime() < now : false;
  const warnings = [
    share.allowDownload ? "Download is enabled on this public channel." : "",
    share.allowComments ? "Comments are enabled on this public channel." : "",
    !share.expiresAt ? "No expiry is set for this public channel." : "",
    approvalState === "missing" ? "No release approval snapshot is attached." : "",
    rollbackState !== "linked" ? "No rollback version link is available." : "",
    prototype && kind === "prototype" && prototype.warningCount > 0
      ? `${prototype.warningCount} prototype warnings need review.`
      : "",
  ].filter(Boolean);
  const blockers = [
    !file ? "Source file is missing from the admin file window." : "",
    expired ? "Public channel is expired." : "",
    smoke.status === "blocked" ? "Route smoke is blocked." : "",
    prototype && kind === "prototype" && prototype.brokenCount > 0
      ? "Prototype has broken targets."
      : "",
  ].filter(Boolean);
  const status = getChannelStatus({ blockers, routeSmokeStatus: smoke.status, warnings });

  return {
    id: `share-${share.id}`,
    kind,
    status,
    label: `${share.fileName} ${share.permissionPreset}`,
    fileId: share.fileId,
    fileName: share.fileName,
    ownerEmail: share.ownerEmail,
    targetUrl: joinUrl(baseUrl, share.sharePath),
    shareId: share.id,
    permissionPreset: share.permissionPreset,
    approvalState,
    rollbackState,
    routeSmokeStatus: smoke.status,
    routeSmokeLabel: smoke.label,
    routeSmokeAt: productionDeploySmoke.generatedAt,
    expiresAt: share.expiresAt,
    latestAt: share.createdAt,
    blockerCount: blockers.length,
    reviewCount: warnings.length,
    evidence: getEvidence({ approvalState, rollbackState, smokeStatus: smoke.status }),
    blockers,
    warnings,
    recommendation:
      status === "ready"
        ? "Channel is ready for production handoff."
        : "Refresh smoke, approval, rollback, expiry, or prototype evidence before publishing.",
  };
}

export function toPrototypeGapChannel({
  baseUrl,
  file,
  latestApproval,
  productionDeploySmoke,
  rollbackReadiness,
}: {
  baseUrl: string;
  file: AdminPublishChannelManagerInput["files"][number];
  latestApproval: AdminPublishChannelManagerInput["releaseApprovalSnapshots"][number] | null;
  productionDeploySmoke: AdminPublishChannelManagerInput["productionDeploySmoke"];
  rollbackReadiness: AdminPublishChannelManagerInput["rollbackReadiness"];
}): AdminPublishChannel {
  const prototype = getPrototypeFlowDiagnostics(file.document);
  const smoke = getSmokeRoute(productionDeploySmoke, "prototype");
  const approvalState = getApprovalState(latestApproval);
  const rollbackState = getRollbackState(rollbackReadiness, file.fileId);
  const blockers = [
    prototype.brokenCount > 0 ? "Prototype has broken targets." : "",
    prototype.startPageCount === 0 ? "Prototype start page is missing." : "",
  ].filter(Boolean);
  const warnings = [
    "No active prototype share channel exists for this interactive file.",
    approvalState === "missing" ? "No release approval snapshot is attached." : "",
    rollbackState !== "linked" ? "No rollback version link is available." : "",
  ].filter(Boolean);
  const status = getChannelStatus({ blockers, routeSmokeStatus: smoke.status, warnings });

  return {
    id: `prototype-gap-${file.fileId}`,
    kind: "prototype",
    status,
    label: `${file.fileName} prototype`,
    fileId: file.fileId,
    fileName: file.fileName,
    ownerEmail: file.ownerEmail,
    targetUrl: joinUrl(baseUrl, "/share/<token>/prototype"),
    shareId: null,
    permissionPreset: "prototype",
    approvalState,
    rollbackState,
    routeSmokeStatus: smoke.status,
    routeSmokeLabel: smoke.label,
    routeSmokeAt: productionDeploySmoke.generatedAt,
    expiresAt: null,
    latestAt: file.updatedAt,
    blockerCount: blockers.length,
    reviewCount: warnings.length,
    evidence: getEvidence({ approvalState, rollbackState, smokeStatus: smoke.status }),
    blockers,
    warnings,
    recommendation:
      "Create a prototype share link after fixing start-page and target readiness.",
  };
}

export function toReleaseChannel({
  baseUrl,
  latestApproval,
  productionDeploySmoke,
  rollbackReadiness,
}: {
  baseUrl: string;
  latestApproval: AdminPublishChannelManagerInput["releaseApprovalSnapshots"][number] | null;
  productionDeploySmoke: AdminPublishChannelManagerInput["productionDeploySmoke"];
  rollbackReadiness: AdminPublishChannelManagerInput["rollbackReadiness"];
}): AdminPublishChannel {
  const smoke = getSmokeRoute(productionDeploySmoke, "release");
  const approvalState = getApprovalState(latestApproval);
  const rollbackState =
    rollbackReadiness.deploymentLinkCount > 0 ? "linked" : "missing";
  const blockers = [
    smoke.status === "blocked" ? "Release handoff smoke is blocked." : "",
    approvalState === "blocked" ? "Latest approval snapshot is blocked." : "",
  ].filter(Boolean);
  const warnings = [
    approvalState === "missing" ? "No release approval snapshot is attached." : "",
    rollbackState !== "linked" ? "No rollback deployment link is available." : "",
  ].filter(Boolean);
  const status = getChannelStatus({ blockers, routeSmokeStatus: smoke.status, warnings });

  return {
    id: "release-handoff",
    kind: "release",
    status,
    label: "Production release handoff",
    fileId: null,
    fileName: "Workspace",
    ownerEmail: "workspace",
    targetUrl: latestApproval?.deploymentUrl || baseUrl || productionDeploySmoke.baseUrl,
    shareId: null,
    permissionPreset: null,
    approvalState,
    rollbackState,
    routeSmokeStatus: smoke.status,
    routeSmokeLabel: smoke.label,
    routeSmokeAt: productionDeploySmoke.generatedAt,
    expiresAt: null,
    latestAt: latestApproval?.createdAt ?? productionDeploySmoke.generatedAt,
    blockerCount: blockers.length,
    reviewCount: warnings.length,
    evidence: getEvidence({ approvalState, rollbackState, smokeStatus: smoke.status }),
    blockers,
    warnings,
    recommendation:
      status === "ready"
        ? "Release channel has smoke, approval, and rollback evidence."
        : "Refresh release approval, smoke, and rollback links before production promotion.",
  };
}

export function sortPublishChannels(
  left: AdminPublishChannel,
  right: AdminPublishChannel,
) {
  return (
    statusWeight(left.status) - statusWeight(right.status) ||
    kindWeight(left.kind) - kindWeight(right.kind) ||
    left.label.localeCompare(right.label)
  );
}

export function getStatusFromApproval(
  state: AdminPublishApprovalState,
): AdminPublishChannelStatus {
  if (state === "blocked") {
    return "blocked";
  }

  return state === "approved" ? "ready" : "review";
}

function getShareKind(share: AdminPublishChannelShare): AdminPublishChannelKind {
  if (share.permissionPreset === "prototype" || share.accessLevel === "prototype") {
    return "prototype";
  }

  if (share.permissionPreset === "handoff" && share.allowDownload) {
    return "site";
  }

  return "share";
}

function getSmokeRoute(
  report: AdminPublishChannelManagerInput["productionDeploySmoke"],
  kind: AdminPublishChannelKind,
) {
  const smokeKind =
    kind === "prototype"
      ? "prototype"
      : kind === "release"
        ? "release-handoff"
        : "share";
  const matches = report.rows.filter((row) => row.kind === smokeKind);

  return {
    status: getWorstStatus(matches.map((row) => row.status), "review"),
    label: matches[0]?.label ?? `${smokeKind} route smoke`,
  };
}

function getApprovalState(
  latestApproval: AdminPublishChannelManagerInput["releaseApprovalSnapshots"][number] | null,
): AdminPublishApprovalState {
  if (!latestApproval) {
    return "missing";
  }

  if (
    latestApproval.preflightStatus === "blocked" ||
    latestApproval.incidentStatus === "blocked"
  ) {
    return "blocked";
  }

  return latestApproval.preflightStatus === "ready" &&
    latestApproval.incidentStatus === "ready" &&
    latestApproval.smokeArtifacts.length > 0
    ? "approved"
    : "review";
}

function getRollbackState(
  rollbackReadiness: AdminPublishChannelManagerInput["rollbackReadiness"],
  fileId: string,
): AdminPublishRollbackState {
  if (rollbackReadiness.latestVersions.some((version) => version.fileId === fileId)) {
    return "linked";
  }

  return rollbackReadiness.status === "blocked" ? "missing" : "review";
}

function getEvidence({
  approvalState,
  rollbackState,
  smokeStatus,
}: {
  approvalState: AdminPublishApprovalState;
  rollbackState: AdminPublishRollbackState;
  smokeStatus: AdminPublishChannelStatus;
}) {
  return [
    smokeStatus !== "blocked" ? "route smoke" : "",
    approvalState === "approved" ? "release approval" : "",
    rollbackState === "linked" ? "rollback link" : "",
  ].filter(Boolean);
}

function getChannelStatus({
  blockers,
  routeSmokeStatus,
  warnings,
}: {
  blockers: string[];
  routeSmokeStatus: AdminPublishChannelStatus;
  warnings: string[];
}): AdminPublishChannelStatus {
  if (blockers.length > 0 || routeSmokeStatus === "blocked") {
    return "blocked";
  }

  return warnings.length > 0 || routeSmokeStatus === "review" ? "review" : "ready";
}

function getWorstStatus(
  statuses: AdminPublishChannelStatus[],
  fallback: AdminPublishChannelStatus,
) {
  if (statuses.includes("blocked")) {
    return "blocked";
  }

  if (statuses.includes("review")) {
    return "review";
  }

  return statuses.length > 0 ? "ready" : fallback;
}

function joinUrl(baseUrl: string, path: string) {
  const trimmedBase = baseUrl.trim().replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (!trimmedBase || trimmedBase.includes("<deployment-url>")) {
    return normalizedPath;
  }

  return `${trimmedBase}${normalizedPath}`;
}

function statusWeight(status: AdminPublishChannelStatus) {
  if (status === "blocked") {
    return 0;
  }

  return status === "review" ? 1 : 2;
}

function kindWeight(kind: AdminPublishChannelKind) {
  if (kind === "release") {
    return 0;
  }

  if (kind === "prototype") {
    return 1;
  }

  return kind === "site" ? 2 : 3;
}
