import { createHash } from "node:crypto";
import type {
  BoardReleaseDistributionAcknowledgement,
  BoardReleaseDistributionAcknowledgementReport,
} from "@/features/projects/board-release-distribution-acknowledgements";
import type {
  BoardReleaseDistributionRecipientManifestEntry,
  BoardReleaseDistributionRecipientManifestReport,
} from "@/features/projects/board-release-distribution-recipient-manifests";

export type BoardReleaseDistributionRetryStatus = "blocked" | "ready" | "scheduled";
export type BoardReleaseDistributionRetryReason = "blocked-packet" | "expired-acknowledgement" | "missing-recipient" | "suppressed-route";
export type BoardReleaseDistributionRetryAction = "add-recipient" | "reopen-route" | "resend-acknowledgement" | "resolve-packet";

export interface BoardReleaseDistributionRetryPlan {
  acknowledgementId: string | null;
  dueAt: string;
  manifestId: string;
  nextAction: string;
  packetHash: string | null;
  reason: BoardReleaseDistributionRetryReason;
  recipientEmail: string | null;
  recipientName: string;
  releasePromotionId: string | null;
  retryAction: BoardReleaseDistributionRetryAction;
  retryHash: string;
  retryId: string;
  status: BoardReleaseDistributionRetryStatus;
  workspaceId: string;
}

export interface BoardReleaseDistributionRetryPlanningReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  retries: BoardReleaseDistributionRetryPlan[];
  summary: {
    blockedCount: number;
    expiredAcknowledgementCount: number;
    missingRecipientCount: number;
    nextAction: string;
    readyCount: number;
    retryCount: number;
    scheduledCount: number;
    status: BoardReleaseDistributionRetryStatus;
    suppressedRouteCount: number;
  };
  workspaceId: string;
}

export interface CreateBoardReleaseDistributionRetryPlanningReportInput {
  acknowledgements: BoardReleaseDistributionAcknowledgementReport;
  generatedAt?: string;
  manifests: BoardReleaseDistributionRecipientManifestReport;
  workspaceId?: string;
}

const statusRank: Record<BoardReleaseDistributionRetryStatus, number> = {
  blocked: 0,
  scheduled: 1,
  ready: 2,
};

const reasonRank: Record<BoardReleaseDistributionRetryReason, number> = {
  "missing-recipient": 0,
  "blocked-packet": 1,
  "expired-acknowledgement": 2,
  "suppressed-route": 3,
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

function addHours(value: string, hours: number) {
  const date = new Date(value);
  const time = Number.isNaN(date.getTime()) ? Date.now() : date.getTime();

  return new Date(time + hours * 60 * 60 * 1000).toISOString();
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

function acknowledgementByManifestId(acknowledgements: BoardReleaseDistributionAcknowledgement[]) {
  return new Map(acknowledgements.map((acknowledgement) => [acknowledgement.manifestId, acknowledgement]));
}

function isExpired(input: {
  acknowledgement: BoardReleaseDistributionAcknowledgement | null;
  generatedAt: string;
}) {
  if (!input.acknowledgement?.dueAt || input.acknowledgement.status !== "pending") {
    return false;
  }

  return new Date(input.acknowledgement.dueAt).getTime() < new Date(input.generatedAt).getTime();
}

function retryReason(input: {
  acknowledgement: BoardReleaseDistributionAcknowledgement | null;
  generatedAt: string;
  manifest: BoardReleaseDistributionRecipientManifestEntry;
}): BoardReleaseDistributionRetryReason | null {
  if (input.manifest.packetAccess === "missing-recipient") {
    return "missing-recipient";
  }

  if (input.manifest.packetAccess === "blocked") {
    return "blocked-packet";
  }

  if (
    input.manifest.acknowledgementRequirement === "suppressed" ||
    (input.manifest.status === "watch" && input.acknowledgement?.status === "blocked")
  ) {
    return "suppressed-route";
  }

  return isExpired({
    acknowledgement: input.acknowledgement,
    generatedAt: input.generatedAt,
  })
    ? "expired-acknowledgement"
    : null;
}

function retryAction(reason: BoardReleaseDistributionRetryReason): BoardReleaseDistributionRetryAction {
  if (reason === "missing-recipient") {
    return "add-recipient";
  }

  if (reason === "blocked-packet") {
    return "resolve-packet";
  }

  return reason === "suppressed-route" ? "reopen-route" : "resend-acknowledgement";
}

function retryStatus(reason: BoardReleaseDistributionRetryReason): BoardReleaseDistributionRetryStatus {
  return reason === "blocked-packet" || reason === "missing-recipient" ? "blocked" : "scheduled";
}

function retryDueAt(input: {
  acknowledgement: BoardReleaseDistributionAcknowledgement | null;
  generatedAt: string;
  reason: BoardReleaseDistributionRetryReason;
}) {
  if (input.reason === "expired-acknowledgement") {
    return addHours(input.generatedAt, 6);
  }

  if (input.reason === "suppressed-route") {
    return addHours(input.generatedAt, 12);
  }

  return addHours(input.generatedAt, 24);
}

function retryNextAction(reason: BoardReleaseDistributionRetryReason) {
  if (reason === "missing-recipient") {
    return "Add recipient contact details before retrying distribution.";
  }

  if (reason === "blocked-packet") {
    return "Resolve packet access blockers before retrying distribution.";
  }

  return reason === "suppressed-route" ? "Review notification preferences and reopen the route." : "Resend acknowledgement request before closeout.";
}

function retryId(input: {
  manifestId: string;
  reason: BoardReleaseDistributionRetryReason;
  releasePromotionId: string | null;
  workspaceId: string;
}) {
  return `board-release-distribution-retry:${slug(input.workspaceId)}:${slug(input.releasePromotionId ?? "unassigned-release")}:${slug(input.manifestId)}:${input.reason}`;
}

function createRetry(input: {
  acknowledgement: BoardReleaseDistributionAcknowledgement | null;
  generatedAt: string;
  manifest: BoardReleaseDistributionRecipientManifestEntry;
  reason: BoardReleaseDistributionRetryReason;
  workspaceId: string;
}): BoardReleaseDistributionRetryPlan {
  const action = retryAction(input.reason);
  const status = retryStatus(input.reason);
  const dueAt = retryDueAt({
    acknowledgement: input.acknowledgement,
    generatedAt: input.generatedAt,
    reason: input.reason,
  });
  const core = {
    action,
    acknowledgementHash: input.acknowledgement?.acknowledgementHash ?? null,
    dueAt,
    manifestHash: input.manifest.manifestHash,
    packetHash: input.manifest.packetHash,
    reason: input.reason,
    status,
    workspaceId: input.workspaceId,
  };

  return {
    acknowledgementId: input.acknowledgement?.acknowledgementId ?? null,
    dueAt,
    manifestId: input.manifest.manifestId,
    nextAction: retryNextAction(input.reason),
    packetHash: input.manifest.packetHash,
    reason: input.reason,
    recipientEmail: input.manifest.recipientEmail,
    recipientName: input.manifest.recipientName,
    releasePromotionId: input.manifest.releasePromotionId,
    retryAction: action,
    retryHash: sha256(core),
    retryId: retryId({
      manifestId: input.manifest.manifestId,
      reason: input.reason,
      releasePromotionId: input.manifest.releasePromotionId,
      workspaceId: input.workspaceId,
    }),
    status,
    workspaceId: input.workspaceId,
  };
}

function createRetries(input: CreateBoardReleaseDistributionRetryPlanningReportInput & { generatedAt: string; workspaceId: string }) {
  const acknowledgements = acknowledgementByManifestId(input.acknowledgements.acknowledgements);

  return input.manifests.manifests
    .map((manifest) => {
      const acknowledgement = acknowledgements.get(manifest.manifestId) ?? null;
      const reason = retryReason({
        acknowledgement,
        generatedAt: input.generatedAt,
        manifest,
      });

      return reason
        ? createRetry({
            acknowledgement,
            generatedAt: input.generatedAt,
            manifest,
            reason,
            workspaceId: input.workspaceId,
          })
        : null;
    })
    .filter((retry): retry is BoardReleaseDistributionRetryPlan => Boolean(retry))
    .sort(
      (first, second) =>
        statusRank[first.status] - statusRank[second.status] ||
        reasonRank[first.reason] - reasonRank[second.reason] ||
        first.dueAt.localeCompare(second.dueAt),
    );
}

function summarize(retries: BoardReleaseDistributionRetryPlan[]): BoardReleaseDistributionRetryPlanningReport["summary"] {
  const blockedCount = retries.filter((retry) => retry.status === "blocked").length;
  const scheduledCount = retries.filter((retry) => retry.status === "scheduled").length;
  const firstAttention = retries.find((retry) => retry.status === "blocked" || retry.status === "scheduled") ?? null;

  return {
    blockedCount,
    expiredAcknowledgementCount: retries.filter((retry) => retry.reason === "expired-acknowledgement").length,
    missingRecipientCount: retries.filter((retry) => retry.reason === "missing-recipient").length,
    nextAction: firstAttention?.nextAction ?? "No release distribution retries are needed.",
    readyCount: retries.filter((retry) => retry.status === "ready").length,
    retryCount: retries.length,
    scheduledCount,
    status: retries.reduce<BoardReleaseDistributionRetryStatus>((worst, retry) => (statusRank[retry.status] < statusRank[worst] ? retry.status : worst), "ready"),
    suppressedRouteCount: retries.filter((retry) => retry.reason === "suppressed-route").length,
  };
}

function createCsv(retries: BoardReleaseDistributionRetryPlan[]) {
  const header = [
    "retry_id",
    "release_promotion_id",
    "recipient",
    "status",
    "reason",
    "retry_action",
    "due_at",
    "acknowledgement_id",
    "packet_hash",
    "retry_hash",
    "next_action",
  ];
  const body = retries.map((retry) =>
    [
      retry.retryId,
      retry.releasePromotionId,
      retry.recipientEmail ?? retry.recipientName,
      retry.status,
      retry.reason,
      retry.retryAction,
      retry.dueAt,
      retry.acknowledgementId,
      retry.packetHash,
      retry.retryHash,
      retry.nextAction,
    ]
      .map(csvCell)
      .join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function createJson(input: {
  generatedAt: string;
  retries: BoardReleaseDistributionRetryPlan[];
  summary: BoardReleaseDistributionRetryPlanningReport["summary"];
  workspaceId: string;
}) {
  return JSON.stringify(
    {
      generatedAt: input.generatedAt,
      retries: input.retries,
      summary: input.summary,
      workspaceId: input.workspaceId,
    },
    null,
    2,
  );
}

export function createBoardReleaseDistributionRetryPlanningReport(
  input: CreateBoardReleaseDistributionRetryPlanningReportInput,
): BoardReleaseDistributionRetryPlanningReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.manifests.workspaceId;
  const retries = createRetries({
    ...input,
    generatedAt,
    workspaceId,
  });
  const summary = summarize(retries);
  const csvContent = createCsv(retries);
  const jsonContent = createJson({
    generatedAt,
    retries,
    summary,
    workspaceId,
  });
  const fileBase = `${slug(workspaceId)}-board-release-distribution-retry-planning-${dateStamp(generatedAt)}`;

  return {
    csvContent,
    csvDataUri: encodeCsvDataUri(csvContent),
    csvFileName: `${fileBase}.csv`,
    generatedAt,
    jsonContent,
    jsonDataUri: encodeJsonDataUri(jsonContent),
    jsonFileName: `${fileBase}.json`,
    retries,
    summary,
    workspaceId,
  };
}
