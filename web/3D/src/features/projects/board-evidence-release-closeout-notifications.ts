import type { BoardEvidenceReleaseApprovalHandoffReport, BoardEvidenceReleaseApprovalSignerRole } from "@/features/projects/board-evidence-release-approval-handoff";
import type { BoardEvidenceReleaseVarianceReport } from "@/features/projects/board-evidence-release-variance";
import { canWorkspaceRoleReceiveNotificationTopic } from "@/features/workspaces/notification-email-delivery";
import {
  isWorkspaceNotificationTopicEnabled,
  normalizeWorkspaceNotificationDeliveryPreferences,
} from "@/features/workspaces/notification-delivery-preferences";
import type {
  WorkspaceMemberRow,
  WorkspaceNotificationDeliveryPreference,
  WorkspaceNotificationTopic,
  WorkspaceRole,
} from "@/features/workspaces/types";

export type BoardEvidenceReleaseCloseoutNotificationChannel = "email" | "in-app";
export type BoardEvidenceReleaseCloseoutNotificationReason = "admin" | "packet-owner" | "signer";
export type BoardEvidenceReleaseCloseoutNotificationStatus = "eligible" | "missing-recipient" | "suppressed-by-preference" | "suppressed-by-role";

export interface BoardEvidenceReleaseCloseoutNotification {
  channel: BoardEvidenceReleaseCloseoutNotificationChannel;
  dedupeKey: string;
  message: string;
  nextAction: string;
  notificationId: string;
  reason: BoardEvidenceReleaseCloseoutNotificationReason;
  recipientEmail: string | null;
  recipientName: string;
  recipientRole: WorkspaceRole;
  releasePromotionId: string | null;
  signerRole: BoardEvidenceReleaseApprovalSignerRole | null;
  status: BoardEvidenceReleaseCloseoutNotificationStatus;
  topic: WorkspaceNotificationTopic;
  userId: string | null;
  workspaceId: string;
}

export interface BoardEvidenceReleaseCloseoutNotificationReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  notifications: BoardEvidenceReleaseCloseoutNotification[];
  summary: {
    candidateCount: number;
    eligibleRouteCount: number;
    emailEligibleCount: number;
    inAppEligibleCount: number;
    nextAction: string;
    status: "blocked" | "ready" | "watch";
    suppressedByPreferenceCount: number;
    suppressedByRoleCount: number;
    totalRouteCount: number;
  };
  workspaceId: string;
}

export interface CreateBoardEvidenceReleaseCloseoutNotificationReportInput {
  generatedAt?: string;
  handoff: BoardEvidenceReleaseApprovalHandoffReport;
  members: WorkspaceMemberRow[];
  preferencesByUserId?: Map<string, WorkspaceNotificationDeliveryPreference[]>;
  variance: BoardEvidenceReleaseVarianceReport;
  workspaceId?: string;
}

interface NotificationCandidate {
  email: string | null;
  name: string;
  nextAction: string;
  reason: BoardEvidenceReleaseCloseoutNotificationReason;
  role: WorkspaceRole;
  signerRole: BoardEvidenceReleaseApprovalSignerRole | null;
  topic: WorkspaceNotificationTopic;
  userId: string | null;
}

const channels: BoardEvidenceReleaseCloseoutNotificationChannel[] = ["in-app", "email"];

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

function statusFrom(input: {
  handoff: BoardEvidenceReleaseApprovalHandoffReport;
  variance: BoardEvidenceReleaseVarianceReport;
}) {
  if (input.variance.summary.blockerCount > 0 || input.handoff.summary.status === "blocked") {
    return "blocked" as const;
  }

  return input.variance.summary.watchCount > 0 || input.handoff.summary.status === "watch" ? "watch" : "ready";
}

function memberByUserId(members: WorkspaceMemberRow[]) {
  return new Map(members.map((member) => [member.userId, member]));
}

function memberByEmail(members: WorkspaceMemberRow[]) {
  return new Map(members.map((member) => [member.email.toLowerCase(), member]));
}

function candidateKey(candidate: NotificationCandidate) {
  return candidate.userId ?? candidate.email ?? `${candidate.reason}:${candidate.name.toLowerCase()}`;
}

function createCandidates(input: CreateBoardEvidenceReleaseCloseoutNotificationReportInput): NotificationCandidate[] {
  const byUserId = memberByUserId(input.members);
  const byEmail = memberByEmail(input.members);
  const candidates: NotificationCandidate[] = [];

  for (const signer of input.handoff.signers) {
    const member = signer.userId ? byUserId.get(signer.userId) : signer.email ? byEmail.get(signer.email.toLowerCase()) : null;
    const reason: BoardEvidenceReleaseCloseoutNotificationReason = signer.role === "packet-owner" ? "packet-owner" : "signer";

    candidates.push({
      email: signer.email ?? member?.email ?? null,
      name: signer.name,
      nextAction: signer.nextAction,
      reason,
      role: member?.role ?? (signer.role === "packet-owner" ? "editor" : "viewer"),
      signerRole: signer.role,
      topic: reason === "packet-owner" ? "review" : "release",
      userId: signer.userId ?? member?.userId ?? null,
    });
  }

  for (const member of input.members.filter((entry) => entry.role === "owner" || entry.role === "admin")) {
    candidates.push({
      email: member.email,
      name: member.name,
      nextAction: input.variance.summary.nextAction,
      reason: "admin",
      role: member.role,
      signerRole: null,
      topic: "release",
      userId: member.userId,
    });
  }

  const seen = new Set<string>();

  return candidates.filter((candidate) => {
    const key = candidateKey(candidate);

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);

    return true;
  });
}

function messageFor(input: {
  candidate: NotificationCandidate;
  handoff: BoardEvidenceReleaseApprovalHandoffReport;
  variance: BoardEvidenceReleaseVarianceReport;
}) {
  const releaseId = input.handoff.releasePromotionId ?? "current release";

  if (input.candidate.reason === "admin") {
    return `${releaseId} closeout has ${input.variance.summary.varianceCount} variance checks and ${input.variance.summary.blockerCount} blockers.`;
  }

  if (input.candidate.reason === "packet-owner") {
    return `${releaseId} packet-owner closeout needs attention: ${input.candidate.nextAction}`;
  }

  return `${releaseId} signer closeout is ${input.handoff.summary.status}: ${input.candidate.nextAction}`;
}

function routeStatus(input: {
  candidate: NotificationCandidate;
  channel: BoardEvidenceReleaseCloseoutNotificationChannel;
  preferencesByUserId: Map<string, WorkspaceNotificationDeliveryPreference[]>;
}) {
  if (!input.candidate.userId || !input.candidate.email) {
    return "missing-recipient" as const;
  }

  if (!canWorkspaceRoleReceiveNotificationTopic(input.candidate.role, input.candidate.topic)) {
    return "suppressed-by-role" as const;
  }

  const preferences = normalizeWorkspaceNotificationDeliveryPreferences(input.preferencesByUserId.get(input.candidate.userId) ?? []);
  const channelKey = input.channel === "email" ? "email" : "inApp";

  return isWorkspaceNotificationTopicEnabled(preferences, input.candidate.topic, channelKey) ? "eligible" : "suppressed-by-preference";
}

function createNotifications(input: CreateBoardEvidenceReleaseCloseoutNotificationReportInput & { workspaceId: string }) {
  const preferencesByUserId = input.preferencesByUserId ?? new Map<string, WorkspaceNotificationDeliveryPreference[]>();
  const candidates = createCandidates(input);
  const releasePromotionId = input.handoff.releasePromotionId ?? null;
  const notifications: BoardEvidenceReleaseCloseoutNotification[] = [];

  for (const candidate of candidates) {
    for (const channel of channels) {
      const status = routeStatus({
        candidate,
        channel,
        preferencesByUserId,
      });
      const notificationId = `board-evidence-release-closeout:${candidate.reason}:${candidateKey(candidate)}:${channel}`;

      notifications.push({
        channel,
        dedupeKey: `${input.workspaceId}:${releasePromotionId ?? "release"}:${candidateKey(candidate)}:${candidate.topic}:${channel}`,
        message: messageFor({
          candidate,
          handoff: input.handoff,
          variance: input.variance,
        }),
        nextAction: candidate.nextAction,
        notificationId,
        reason: candidate.reason,
        recipientEmail: candidate.email,
        recipientName: candidate.name,
        recipientRole: candidate.role,
        releasePromotionId,
        signerRole: candidate.signerRole,
        status,
        topic: candidate.topic,
        userId: candidate.userId,
        workspaceId: input.workspaceId,
      });
    }
  }

  return {
    candidateCount: candidates.length,
    notifications,
  };
}

function summarize(input: {
  candidateCount: number;
  handoff: BoardEvidenceReleaseApprovalHandoffReport;
  notifications: BoardEvidenceReleaseCloseoutNotification[];
  variance: BoardEvidenceReleaseVarianceReport;
}): BoardEvidenceReleaseCloseoutNotificationReport["summary"] {
  const eligible = input.notifications.filter((notification) => notification.status === "eligible");

  return {
    candidateCount: input.candidateCount,
    eligibleRouteCount: eligible.length,
    emailEligibleCount: eligible.filter((notification) => notification.channel === "email").length,
    inAppEligibleCount: eligible.filter((notification) => notification.channel === "in-app").length,
    nextAction: input.variance.summary.nextAction,
    status: statusFrom({
      handoff: input.handoff,
      variance: input.variance,
    }),
    suppressedByPreferenceCount: input.notifications.filter((notification) => notification.status === "suppressed-by-preference").length,
    suppressedByRoleCount: input.notifications.filter((notification) => notification.status === "suppressed-by-role").length,
    totalRouteCount: input.notifications.length,
  };
}

function createCsv(notifications: BoardEvidenceReleaseCloseoutNotification[]) {
  const header = ["notification_id", "recipient", "role", "reason", "topic", "channel", "status", "dedupe_key", "next_action"];
  const body = notifications.map((notification) =>
    [
      notification.notificationId,
      notification.recipientEmail ?? notification.recipientName,
      notification.recipientRole,
      notification.reason,
      notification.topic,
      notification.channel,
      notification.status,
      notification.dedupeKey,
      notification.nextAction,
    ]
      .map(csvCell)
      .join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function createJson(input: {
  generatedAt: string;
  notifications: BoardEvidenceReleaseCloseoutNotification[];
  summary: BoardEvidenceReleaseCloseoutNotificationReport["summary"];
  variance: BoardEvidenceReleaseVarianceReport;
  workspaceId: string;
}) {
  return JSON.stringify(
    {
      generatedAt: input.generatedAt,
      notifications: input.notifications,
      summary: input.summary,
      variance: {
        summary: input.variance.summary,
      },
      workspaceId: input.workspaceId,
    },
    null,
    2,
  );
}

export function createBoardEvidenceReleaseCloseoutNotificationReport(
  input: CreateBoardEvidenceReleaseCloseoutNotificationReportInput,
): BoardEvidenceReleaseCloseoutNotificationReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.handoff.workspaceId;
  const { candidateCount, notifications } = createNotifications({
    ...input,
    workspaceId,
  });
  const summary = summarize({
    candidateCount,
    handoff: input.handoff,
    notifications,
    variance: input.variance,
  });
  const csvContent = createCsv(notifications);
  const jsonContent = createJson({
    generatedAt,
    notifications,
    summary,
    variance: input.variance,
    workspaceId,
  });
  const fileBase = `${slug(workspaceId)}-board-evidence-release-closeout-notifications-${dateStamp(generatedAt)}`;

  return {
    csvContent,
    csvDataUri: encodeCsvDataUri(csvContent),
    csvFileName: `${fileBase}.csv`,
    generatedAt,
    jsonContent,
    jsonDataUri: encodeJsonDataUri(jsonContent),
    jsonFileName: `${fileBase}.json`,
    notifications,
    summary,
    workspaceId,
  };
}
