import { getStatusFromApproval } from "@/features/admin/admin-publish-channel-manager-builders";
import type {
  AdminPublishChannel,
  AdminPublishChannelRow,
} from "@/features/admin/admin-publish-channel-manager-types";

export function toPublishChannelRows(
  channel: AdminPublishChannel,
): AdminPublishChannelRow[] {
  return [
    {
      id: `${channel.id}-target`,
      channelId: channel.id,
      kind: channel.kind,
      status: channel.status,
      category: "target",
      label: `${channel.label} target`,
      targetUrl: channel.targetUrl,
      detail: `Channel points to ${channel.targetUrl}.`,
      recommendation: channel.recommendation,
      latestAt: channel.latestAt,
    },
    {
      id: `${channel.id}-smoke`,
      channelId: channel.id,
      kind: channel.kind,
      status: channel.routeSmokeStatus,
      category: "smoke",
      label: channel.routeSmokeLabel,
      targetUrl: channel.targetUrl,
      detail: `Route smoke status is ${channel.routeSmokeStatus}.`,
      recommendation: "Run deployed route smoke before publishing this channel.",
      latestAt: channel.routeSmokeAt,
    },
    {
      id: `${channel.id}-approval`,
      channelId: channel.id,
      kind: channel.kind,
      status: getStatusFromApproval(channel.approvalState),
      category: "approval",
      label: "Approval state",
      targetUrl: channel.targetUrl,
      detail: `Release approval state is ${channel.approvalState}.`,
      recommendation: "Save a release approval snapshot with smoke artifacts.",
      latestAt: channel.latestAt,
    },
    {
      id: `${channel.id}-rollback`,
      channelId: channel.id,
      kind: channel.kind,
      status: channel.rollbackState === "linked" ? "ready" : "review",
      category: "rollback",
      label: "Rollback link",
      targetUrl: channel.targetUrl,
      detail: `Rollback state is ${channel.rollbackState}.`,
      recommendation:
        "Keep named versions and deployment links with each published channel.",
      latestAt: channel.latestAt,
    },
  ];
}
