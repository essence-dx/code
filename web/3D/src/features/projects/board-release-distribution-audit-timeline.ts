import { createHash } from "node:crypto";
import type { BoardEvidenceReleaseVarianceReport } from "@/features/projects/board-evidence-release-variance";
import type { BoardReleaseDistributionAcknowledgementReport } from "@/features/projects/board-release-distribution-acknowledgements";
import type { BoardReleaseDistributionRecipientManifestReport } from "@/features/projects/board-release-distribution-recipient-manifests";
import type { BoardReleaseDistributionRetryPlanningReport } from "@/features/projects/board-release-distribution-retry-planning";
import type { BoardReleaseOperationsExportPacketReport } from "@/features/projects/board-release-operations-export-packets";

export type BoardReleaseDistributionAuditTimelineStatus = "blocked" | "closed" | "open" | "watch";
export type BoardReleaseDistributionAuditTimelineEventType = "acknowledgement" | "delivery-route" | "export-packet" | "retry" | "variance-closure";

export interface BoardReleaseDistributionAuditTimelineEvent {
  actor: string | null;
  eventHash: string;
  eventId: string;
  eventType: BoardReleaseDistributionAuditTimelineEventType;
  evidenceHash: string | null;
  nextAction: string;
  occurredAt: string;
  releasePromotionId: string | null;
  status: BoardReleaseDistributionAuditTimelineStatus;
  title: string;
  workspaceId: string;
}

export interface BoardReleaseDistributionAuditTimelineReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  events: BoardReleaseDistributionAuditTimelineEvent[];
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  summary: {
    acknowledgementEventCount: number;
    blockedCount: number;
    closedCount: number;
    deliveryRouteCount: number;
    eventCount: number;
    exportPacketCount: number;
    nextAction: string;
    openCount: number;
    retryEventCount: number;
    status: BoardReleaseDistributionAuditTimelineStatus;
    varianceClosureCount: number;
    watchCount: number;
  };
  workspaceId: string;
}

export interface CreateBoardReleaseDistributionAuditTimelineReportInput {
  acknowledgements: BoardReleaseDistributionAcknowledgementReport;
  exportPackets: BoardReleaseOperationsExportPacketReport;
  generatedAt?: string;
  manifests: BoardReleaseDistributionRecipientManifestReport;
  retries: BoardReleaseDistributionRetryPlanningReport;
  variance: BoardEvidenceReleaseVarianceReport;
  workspaceId?: string;
}

const statusRank: Record<BoardReleaseDistributionAuditTimelineStatus, number> = {
  blocked: 0,
  watch: 1,
  open: 2,
  closed: 3,
};

const eventRank: Record<BoardReleaseDistributionAuditTimelineEventType, number> = {
  "export-packet": 0,
  "delivery-route": 1,
  acknowledgement: 2,
  retry: 3,
  "variance-closure": 4,
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

function eventHash(input: Omit<BoardReleaseDistributionAuditTimelineEvent, "eventHash">) {
  return sha256(input);
}

function timelineStatusFromPacket(status: string): BoardReleaseDistributionAuditTimelineStatus {
  if (status === "blocked") {
    return "blocked";
  }

  return status === "watch" ? "watch" : "closed";
}

function timelineStatusFromManifest(status: string): BoardReleaseDistributionAuditTimelineStatus {
  if (status === "blocked") {
    return "blocked";
  }

  return status === "watch" ? "watch" : "open";
}

function timelineStatusFromAcknowledgement(status: string): BoardReleaseDistributionAuditTimelineStatus {
  if (status === "blocked") {
    return "blocked";
  }

  return status === "pending" ? "open" : "closed";
}

function timelineStatusFromRetry(status: string): BoardReleaseDistributionAuditTimelineStatus {
  if (status === "blocked") {
    return "blocked";
  }

  return status === "scheduled" ? "watch" : "closed";
}

function timelineStatusFromVariance(severity: string, status: string): BoardReleaseDistributionAuditTimelineStatus {
  if (severity === "critical" && status !== "stable") {
    return "blocked";
  }

  return status === "stable" ? "closed" : "watch";
}

function withHash(event: Omit<BoardReleaseDistributionAuditTimelineEvent, "eventHash">): BoardReleaseDistributionAuditTimelineEvent {
  return {
    ...event,
    eventHash: eventHash(event),
  };
}

function createEvents(input: CreateBoardReleaseDistributionAuditTimelineReportInput & { generatedAt: string; workspaceId: string }) {
  const packetEvents = input.exportPackets.packets.map((packet) =>
    withHash({
      actor: packet.signerName,
      eventId: `board-release-distribution-timeline:${slug(input.workspaceId)}:${slug(packet.packetId)}:export-packet`,
      eventType: "export-packet",
      evidenceHash: packet.packetHash,
      nextAction: packet.status === "blocked" ? "Resolve packet blockers before distribution closeout." : "Signed export packet is part of the audit trail.",
      occurredAt: packet.signedAt,
      releasePromotionId: packet.releasePromotionId,
      status: timelineStatusFromPacket(packet.status),
      title: "Signed export packet",
      workspaceId: input.workspaceId,
    }),
  );
  const manifestEvents = input.manifests.manifests.map((manifest) =>
    withHash({
      actor: manifest.recipientName,
      eventId: `board-release-distribution-timeline:${slug(input.workspaceId)}:${slug(manifest.manifestId)}:delivery-route`,
      eventType: "delivery-route",
      evidenceHash: manifest.manifestHash,
      nextAction: manifest.nextAction,
      occurredAt: input.manifests.generatedAt,
      releasePromotionId: manifest.releasePromotionId,
      status: timelineStatusFromManifest(manifest.status),
      title: `${manifest.channel} delivery route`,
      workspaceId: input.workspaceId,
    }),
  );
  const acknowledgementEvents = input.acknowledgements.acknowledgements.map((acknowledgement) =>
    withHash({
      actor: acknowledgement.signerName,
      eventId: `board-release-distribution-timeline:${slug(input.workspaceId)}:${slug(acknowledgement.acknowledgementId)}:acknowledgement`,
      eventType: "acknowledgement",
      evidenceHash: acknowledgement.acknowledgementHash,
      nextAction: acknowledgement.nextAction,
      occurredAt: acknowledgement.signedAt ?? acknowledgement.dueAt ?? input.acknowledgements.generatedAt,
      releasePromotionId: acknowledgement.releasePromotionId,
      status: timelineStatusFromAcknowledgement(acknowledgement.status),
      title: "Distribution acknowledgement",
      workspaceId: input.workspaceId,
    }),
  );
  const retryEvents = input.retries.retries.map((retry) =>
    withHash({
      actor: retry.recipientName,
      eventId: `board-release-distribution-timeline:${slug(input.workspaceId)}:${slug(retry.retryId)}:retry`,
      eventType: "retry",
      evidenceHash: retry.retryHash,
      nextAction: retry.nextAction,
      occurredAt: retry.dueAt,
      releasePromotionId: retry.releasePromotionId,
      status: timelineStatusFromRetry(retry.status),
      title: `${retry.retryAction} retry`,
      workspaceId: input.workspaceId,
    }),
  );
  const varianceEvents = input.variance.variances.map((variance) =>
    withHash({
      actor: "Release variance monitor",
      eventId: `board-release-distribution-timeline:${slug(input.workspaceId)}:${slug(variance.id)}:variance-closure`,
      eventType: "variance-closure",
      evidenceHash: sha256({
        currentValue: variance.currentValue,
        id: variance.id,
        status: variance.status,
      }),
      nextAction: variance.nextAction,
      occurredAt: input.variance.generatedAt,
      releasePromotionId: input.exportPackets.packets[0]?.releasePromotionId ?? null,
      status: timelineStatusFromVariance(variance.severity, variance.status),
      title: variance.title,
      workspaceId: input.workspaceId,
    }),
  );

  return [...packetEvents, ...manifestEvents, ...acknowledgementEvents, ...retryEvents, ...varianceEvents].sort(
    (first, second) =>
      first.occurredAt.localeCompare(second.occurredAt) ||
      eventRank[first.eventType] - eventRank[second.eventType] ||
      first.eventId.localeCompare(second.eventId),
  );
}

function summarize(events: BoardReleaseDistributionAuditTimelineEvent[]): BoardReleaseDistributionAuditTimelineReport["summary"] {
  const blockedCount = events.filter((event) => event.status === "blocked").length;
  const watchCount = events.filter((event) => event.status === "watch").length;
  const openCount = events.filter((event) => event.status === "open").length;
  const firstAttention = events.find((event) => event.status === "blocked" || event.status === "watch" || event.status === "open") ?? null;

  return {
    acknowledgementEventCount: events.filter((event) => event.eventType === "acknowledgement").length,
    blockedCount,
    closedCount: events.filter((event) => event.status === "closed").length,
    deliveryRouteCount: events.filter((event) => event.eventType === "delivery-route").length,
    eventCount: events.length,
    exportPacketCount: events.filter((event) => event.eventType === "export-packet").length,
    nextAction: firstAttention?.nextAction ?? "Release distribution audit timeline is closed.",
    openCount,
    retryEventCount: events.filter((event) => event.eventType === "retry").length,
    status: events.reduce<BoardReleaseDistributionAuditTimelineStatus>((worst, event) => (statusRank[event.status] < statusRank[worst] ? event.status : worst), "closed"),
    varianceClosureCount: events.filter((event) => event.eventType === "variance-closure").length,
    watchCount,
  };
}

function createCsv(events: BoardReleaseDistributionAuditTimelineEvent[]) {
  const header = ["event_id", "event_type", "release_promotion_id", "occurred_at", "actor", "status", "evidence_hash", "event_hash", "next_action"];
  const body = events.map((event) =>
    [
      event.eventId,
      event.eventType,
      event.releasePromotionId,
      event.occurredAt,
      event.actor,
      event.status,
      event.evidenceHash,
      event.eventHash,
      event.nextAction,
    ]
      .map(csvCell)
      .join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function createJson(input: {
  events: BoardReleaseDistributionAuditTimelineEvent[];
  generatedAt: string;
  summary: BoardReleaseDistributionAuditTimelineReport["summary"];
  workspaceId: string;
}) {
  return JSON.stringify(
    {
      events: input.events,
      generatedAt: input.generatedAt,
      summary: input.summary,
      workspaceId: input.workspaceId,
    },
    null,
    2,
  );
}

export function createBoardReleaseDistributionAuditTimelineReport(
  input: CreateBoardReleaseDistributionAuditTimelineReportInput,
): BoardReleaseDistributionAuditTimelineReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.exportPackets.workspaceId;
  const events = createEvents({
    ...input,
    generatedAt,
    workspaceId,
  });
  const summary = summarize(events);
  const csvContent = createCsv(events);
  const jsonContent = createJson({
    events,
    generatedAt,
    summary,
    workspaceId,
  });
  const fileBase = `${slug(workspaceId)}-board-release-distribution-audit-timeline-${dateStamp(generatedAt)}`;

  return {
    csvContent,
    csvDataUri: encodeCsvDataUri(csvContent),
    csvFileName: `${fileBase}.csv`,
    events,
    generatedAt,
    jsonContent,
    jsonDataUri: encodeJsonDataUri(jsonContent),
    jsonFileName: `${fileBase}.json`,
    summary,
    workspaceId,
  };
}
