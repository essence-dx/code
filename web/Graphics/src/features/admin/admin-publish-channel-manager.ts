import { getPrototypeFlowDiagnostics } from "@/features/editor/prototype-flow-diagnostics";
import {
  sortPublishChannels,
  toPrototypeGapChannel,
  toReleaseChannel,
  toShareChannel,
} from "@/features/admin/admin-publish-channel-manager-builders";
import { toPublishChannelRows } from "@/features/admin/admin-publish-channel-manager-rows";
import type {
  AdminPublishChannelManagerInput,
  AdminPublishChannelManagerReport,
} from "@/features/admin/admin-publish-channel-manager-types";

export type {
  AdminPublishApprovalState,
  AdminPublishChannel,
  AdminPublishChannelFile,
  AdminPublishChannelKind,
  AdminPublishChannelManagerInput,
  AdminPublishChannelManagerReport,
  AdminPublishChannelRow,
  AdminPublishChannelShare,
  AdminPublishChannelStatus,
  AdminPublishRollbackState,
} from "@/features/admin/admin-publish-channel-manager-types";

export function getAdminPublishChannelManagerReport({
  baseUrl,
  files,
  generatedAt = new Date().toISOString(),
  now = Date.now(),
  productionDeploySmoke,
  releaseApprovalSnapshots,
  rollbackReadiness,
  shares,
}: AdminPublishChannelManagerInput): AdminPublishChannelManagerReport {
  const activeFiles = files.filter((file) => !file.trashedAt);
  const filesById = new Map(activeFiles.map((file) => [file.fileId, file]));
  const latestApproval = releaseApprovalSnapshots[0] ?? null;
  const activeShares = shares.filter((share) => !share.disabledAt);
  const prototypeShareFileIds = new Set(
    activeShares
      .filter((share) => share.permissionPreset === "prototype")
      .map((share) => share.fileId),
  );
  const channels = [
    ...activeShares.map((share) =>
      toShareChannel({
        baseUrl,
        file: filesById.get(share.fileId),
        latestApproval,
        now,
        productionDeploySmoke,
        rollbackReadiness,
        share,
      }),
    ),
    ...activeFiles
      .filter((file) => {
        const prototype = getPrototypeFlowDiagnostics(file.document);
        return prototype.hotspotCount > 0 && !prototypeShareFileIds.has(file.fileId);
      })
      .map((file) =>
        toPrototypeGapChannel({
          baseUrl,
          file,
          latestApproval,
          productionDeploySmoke,
          rollbackReadiness,
        }),
      ),
    toReleaseChannel({
      baseUrl,
      latestApproval,
      productionDeploySmoke,
      rollbackReadiness,
    }),
  ].sort(sortPublishChannels);
  const rows = channels.flatMap(toPublishChannelRows);
  const blockedCount = channels.filter((channel) => channel.status === "blocked").length;
  const reviewCount = channels.filter((channel) => channel.status === "review").length;
  const readyCount = channels.filter((channel) => channel.status === "ready").length;

  return {
    generatedAt,
    status: blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready",
    score: Math.max(0, 100 - blockedCount * 20 - reviewCount * 7),
    channelCount: channels.length,
    readyCount,
    reviewCount,
    blockedCount,
    prototypeChannelCount: channels.filter((channel) => channel.kind === "prototype").length,
    shareChannelCount: channels.filter((channel) => channel.kind === "share").length,
    siteChannelCount: channels.filter((channel) => channel.kind === "site").length,
    releaseChannelCount: channels.filter((channel) => channel.kind === "release").length,
    staleChannelCount: channels.filter((channel) =>
      channel.expiresAt ? new Date(channel.expiresAt).getTime() < now : false,
    ).length,
    approvalReadyCount: channels.filter((channel) => channel.approvalState === "approved").length,
    rollbackLinkedCount: channels.filter((channel) => channel.rollbackState === "linked").length,
    routeSmokeBlockedCount: channels.filter((channel) => channel.routeSmokeStatus === "blocked").length,
    channels,
    rows,
    commands: getPublishChannelCommands(),
  };
}

function getPublishChannelCommands() {
  return [
    "Run deployed route smoke before promoting prototype, share, or handoff links.",
    "Save a release approval snapshot after smoke, rollback, and channel targets are reviewed.",
    "Create named versions for files behind public channels before publishing.",
    "Expire or disable public channels that no longer belong to an active handoff.",
  ];
}
