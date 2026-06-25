import { createHash } from "node:crypto";
import type {
  BoardEvidenceReleaseCloseoutNotification,
  BoardEvidenceReleaseCloseoutNotificationChannel,
  BoardEvidenceReleaseCloseoutNotificationReport,
} from "@/features/projects/board-evidence-release-closeout-notifications";
import type { BoardReleaseOperationsExportPacketReport } from "@/features/projects/board-release-operations-export-packets";
import type { WorkspaceMemberRow, WorkspaceRole } from "@/features/workspaces/types";

export type BoardReleaseDistributionRecipientManifestStatus = "blocked" | "ready" | "watch";
export type BoardReleaseDistributionPacketAccess = "blocked" | "granted" | "missing-recipient";
export type BoardReleaseDistributionAcknowledgementRequirement = "required" | "suppressed" | "waived";

export interface BoardReleaseDistributionRecipientManifestEntry {
  acknowledgementRequirement: BoardReleaseDistributionAcknowledgementRequirement;
  channel: BoardEvidenceReleaseCloseoutNotificationChannel;
  manifestHash: string;
  manifestId: string;
  nextAction: string;
  notificationId: string;
  packetAccess: BoardReleaseDistributionPacketAccess;
  packetHash: string | null;
  recipientEmail: string | null;
  recipientName: string;
  recipientRole: WorkspaceRole;
  releasePromotionId: string | null;
  status: BoardReleaseDistributionRecipientManifestStatus;
  workspaceId: string;
}

export interface BoardReleaseDistributionRecipientManifestReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  manifests: BoardReleaseDistributionRecipientManifestEntry[];
  summary: {
    acknowledgementRequiredCount: number;
    blockedCount: number;
    grantedAccessCount: number;
    manifestCount: number;
    missingRecipientCount: number;
    nextAction: string;
    readyCount: number;
    status: BoardReleaseDistributionRecipientManifestStatus;
    suppressedCount: number;
    watchCount: number;
  };
  workspaceId: string;
}

export interface CreateBoardReleaseDistributionRecipientManifestReportInput {
  exportPackets: BoardReleaseOperationsExportPacketReport;
  generatedAt?: string;
  members: WorkspaceMemberRow[];
  notifications: BoardEvidenceReleaseCloseoutNotificationReport;
  workspaceId?: string;
}

const statusRank: Record<BoardReleaseDistributionRecipientManifestStatus, number> = {
  blocked: 0,
  watch: 1,
  ready: 2,
};

function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableJson(entry)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([first], [second]) => first.localeCompare(second))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value) ?? "null";
}

function sha256(value: unknown) {
  return `sha256:${createHash("sha256").update(stableJson(value)).digest("hex")}`;
}

function slug(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 72) || "workspace"
  );
}

function dateStamp(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "current" : date.toISOString().slice(0, 10).replaceAll("-", "");
}

function csvCell(value: string | number | null) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function encodeCsvDataUri(csvContent: string) {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`;
}

function encodeJsonDataUri(jsonContent: string) {
  return `data:application/json;charset=utf-8,${encodeURIComponent(jsonContent)}`;
}

function membersByUserId(members: WorkspaceMemberRow[]) {
  return new Map(members.map((member) => [member.userId, member]));
}

function packetFor(input: {
  exportPackets: BoardReleaseOperationsExportPacketReport;
  notification: BoardEvidenceReleaseCloseoutNotification;
}) {
  return (
    input.exportPackets.packets.find((packet) => packet.releasePromotionId === input.notification.releasePromotionId) ??
    input.exportPackets.packets[0] ??
    null
  );
}

function packetAccess(input: {
  hasRecipient: boolean;
  packetHash: string | null;
  packetStatus: string | null;
}): BoardReleaseDistributionPacketAccess {
  if (!input.hasRecipient) {
    return "missing-recipient";
  }

  return input.packetHash && input.packetStatus !== "blocked" ? "granted" : "blocked";
}

function acknowledgementRequirement(notification: BoardEvidenceReleaseCloseoutNotification): BoardReleaseDistributionAcknowledgementRequirement {
  if (notification.status === "eligible") {
    return "required";
  }

  return notification.status === "missing-recipient" ? "waived" : "suppressed";
}

function manifestStatus(input: {
  access: BoardReleaseDistributionPacketAccess;
  acknowledgement: BoardReleaseDistributionAcknowledgementRequirement;
  notification: BoardEvidenceReleaseCloseoutNotification;
}): BoardReleaseDistributionRecipientManifestStatus {
  if (input.access === "blocked" || input.access === "missing-recipient" || input.notification.status === "missing-recipient") {
    return "blocked";
  }

  return input.acknowledgement === "suppressed" || input.notification.status !== "eligible" ? "watch" : "ready";
}

function manifestId(input: {
  channel: BoardEvidenceReleaseCloseoutNotificationChannel;
  notificationId: string;
  releasePromotionId: string | null;
  workspaceId: string;
}) {
  return `board-release-distribution-recipient:${slug(input.workspaceId)}:${slug(input.releasePromotionId ?? "unassigned-release")}:${slug(input.notificationId)}:${input.channel}`;
}

function nextAction(input: {
  access: BoardReleaseDistributionPacketAccess;
  acknowledgement: BoardReleaseDistributionAcknowledgementRequirement;
  notification: BoardEvidenceReleaseCloseoutNotification;
}) {
  if (input.access === "missing-recipient") {
    return "Add a recipient before distribution acknowledgement can be requested.";
  }

  if (input.access === "blocked") {
    return "Resolve packet blockers before granting distribution access.";
  }

  if (input.acknowledgement === "suppressed") {
    return "Review suppressed route preferences before distribution.";
  }

  return input.acknowledgement === "required" ? "Request recipient acknowledgement for the release packet." : input.notification.nextAction;
}

function createManifests(input: CreateBoardReleaseDistributionRecipientManifestReportInput & { workspaceId: string }) {
  const byUserId = membersByUserId(input.members);

  return input.notifications.notifications
    .map<BoardReleaseDistributionRecipientManifestEntry>((notification) => {
      const packet = packetFor({
        exportPackets: input.exportPackets,
        notification,
      });
      const member = notification.userId ? byUserId.get(notification.userId) : null;
      const hasRecipient = Boolean(notification.userId && notification.recipientEmail);
      const access = packetAccess({
        hasRecipient,
        packetHash: packet?.packetHash ?? null,
        packetStatus: packet?.status ?? null,
      });
      const acknowledgement = acknowledgementRequirement(notification);
      const status = manifestStatus({
        access,
        acknowledgement,
        notification,
      });
      const core = {
        acknowledgement,
        access,
        channel: notification.channel,
        notificationId: notification.notificationId,
        packetHash: packet?.packetHash ?? null,
        recipientRole: member?.role ?? notification.recipientRole,
        releasePromotionId: notification.releasePromotionId,
        status,
        workspaceId: input.workspaceId,
      };

      return {
        acknowledgementRequirement: acknowledgement,
        channel: notification.channel,
        manifestHash: sha256(core),
        manifestId: manifestId({
          channel: notification.channel,
          notificationId: notification.notificationId,
          releasePromotionId: notification.releasePromotionId,
          workspaceId: input.workspaceId,
        }),
        nextAction: nextAction({
          access,
          acknowledgement,
          notification,
        }),
        notificationId: notification.notificationId,
        packetAccess: access,
        packetHash: packet?.packetHash ?? null,
        recipientEmail: notification.recipientEmail,
        recipientName: notification.recipientName,
        recipientRole: member?.role ?? notification.recipientRole,
        releasePromotionId: notification.releasePromotionId,
        status,
        workspaceId: input.workspaceId,
      };
    })
    .sort((first, second) => statusRank[first.status] - statusRank[second.status] || first.recipientName.localeCompare(second.recipientName) || first.channel.localeCompare(second.channel));
}

function summarize(manifests: BoardReleaseDistributionRecipientManifestEntry[]): BoardReleaseDistributionRecipientManifestReport["summary"] {
  const blockedCount = manifests.filter((manifest) => manifest.status === "blocked").length;
  const watchCount = manifests.filter((manifest) => manifest.status === "watch").length;
  const readyCount = manifests.filter((manifest) => manifest.status === "ready").length;
  const firstAttention = manifests.find((manifest) => manifest.status === "blocked" || manifest.status === "watch") ?? null;

  return {
    acknowledgementRequiredCount: manifests.filter((manifest) => manifest.acknowledgementRequirement === "required").length,
    blockedCount,
    grantedAccessCount: manifests.filter((manifest) => manifest.packetAccess === "granted").length,
    manifestCount: manifests.length,
    missingRecipientCount: manifests.filter((manifest) => manifest.packetAccess === "missing-recipient").length,
    nextAction: firstAttention?.nextAction ?? "Release distribution recipient manifest is ready for acknowledgement capture.",
    readyCount,
    status: manifests.reduce<BoardReleaseDistributionRecipientManifestStatus>(
      (worst, manifest) => (statusRank[manifest.status] < statusRank[worst] ? manifest.status : worst),
      "ready",
    ),
    suppressedCount: manifests.filter((manifest) => manifest.acknowledgementRequirement === "suppressed").length,
    watchCount,
  };
}

function createCsv(manifests: BoardReleaseDistributionRecipientManifestEntry[]) {
  const header = [
    "manifest_id",
    "release_promotion_id",
    "recipient",
    "role",
    "channel",
    "status",
    "packet_access",
    "acknowledgement_requirement",
    "packet_hash",
    "manifest_hash",
    "next_action",
  ];
  const body = manifests.map((manifest) =>
    [
      manifest.manifestId,
      manifest.releasePromotionId,
      manifest.recipientEmail ?? manifest.recipientName,
      manifest.recipientRole,
      manifest.channel,
      manifest.status,
      manifest.packetAccess,
      manifest.acknowledgementRequirement,
      manifest.packetHash,
      manifest.manifestHash,
      manifest.nextAction,
    ]
      .map(csvCell)
      .join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function createJson(input: {
  generatedAt: string;
  manifests: BoardReleaseDistributionRecipientManifestEntry[];
  summary: BoardReleaseDistributionRecipientManifestReport["summary"];
  workspaceId: string;
}) {
  return JSON.stringify(
    {
      generatedAt: input.generatedAt,
      manifests: input.manifests,
      summary: input.summary,
      workspaceId: input.workspaceId,
    },
    null,
    2,
  );
}

export function createBoardReleaseDistributionRecipientManifestReport(
  input: CreateBoardReleaseDistributionRecipientManifestReportInput,
): BoardReleaseDistributionRecipientManifestReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.exportPackets.workspaceId;
  const manifests = createManifests({
    ...input,
    workspaceId,
  });
  const summary = summarize(manifests);
  const csvContent = createCsv(manifests);
  const jsonContent = createJson({
    generatedAt,
    manifests,
    summary,
    workspaceId,
  });
  const fileBase = `${slug(workspaceId)}-board-release-distribution-recipient-manifests-${dateStamp(generatedAt)}`;

  return {
    csvContent,
    csvDataUri: encodeCsvDataUri(csvContent),
    csvFileName: `${fileBase}.csv`,
    generatedAt,
    jsonContent,
    jsonDataUri: encodeJsonDataUri(jsonContent),
    jsonFileName: `${fileBase}.json`,
    manifests,
    summary,
    workspaceId,
  };
}
