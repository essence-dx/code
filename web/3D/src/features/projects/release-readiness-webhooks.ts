import { createHash } from "node:crypto";
import type { PostDeploySyntheticDashboardSummary } from "@/features/deployment/post-deploy-synthetic-dashboard";
import type { ReleaseDeploymentCheckCategory, ReleaseDeploymentChecklist } from "@/features/deployment/release-deployment-checklist";
import type { ReleaseOperationsDashboard } from "@/features/projects/release-operations-dashboard";
import type { WorkspaceNotificationEmailDeliveryReport } from "@/features/workspaces/notification-email-delivery";

export type ReleaseReadinessWebhookProvider = "brevo" | "desktop-updater" | "turso" | "vercel";
export type ReleaseReadinessWebhookSurface = "deploy" | "desktop-update" | "email" | "migration";
export type ReleaseReadinessWebhookStatus = "blocked" | "ready" | "watch";
export type ReleaseReadinessWebhookSeverity = "critical" | "info" | "warning";
export type ReleaseReadinessWebhookSignatureState = "missing" | "not-required" | "trusted" | "untrusted";

export interface ReleaseReadinessWebhookEventInput {
  dedupeKey?: string;
  eventType: string;
  payload: Record<string, unknown>;
  provider: ReleaseReadinessWebhookProvider;
  receivedAt: string;
  signatureState?: ReleaseReadinessWebhookSignatureState;
}

export interface ReleaseReadinessWebhookRow {
  dedupeKey: string;
  eventType: string;
  evidence: string;
  nextAction: string;
  payloadDigest: string;
  provider: ReleaseReadinessWebhookProvider;
  receivedAt: string;
  severity: ReleaseReadinessWebhookSeverity;
  signatureState: ReleaseReadinessWebhookSignatureState;
  status: ReleaseReadinessWebhookStatus;
  subject: string;
  surface: ReleaseReadinessWebhookSurface;
}

export interface ReleaseReadinessWebhookReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  rows: ReleaseReadinessWebhookRow[];
  summary: {
    blockedCount: number;
    missingProviderCount: number;
    providerCoverage: Record<ReleaseReadinessWebhookProvider, number>;
    readinessScore: number;
    readyCount: number;
    status: ReleaseReadinessWebhookStatus;
    totalCount: number;
    watchCount: number;
  };
}

export interface CreateReleaseReadinessWebhookReportInput {
  events: ReleaseReadinessWebhookRow[];
  generatedAt?: string;
  workspaceId?: string;
}

export interface CreateReleaseReadinessWebhookReportFromSourcesInput {
  emailDeliveryReport: WorkspaceNotificationEmailDeliveryReport | null;
  generatedAt?: string;
  postDeploySummary: PostDeploySyntheticDashboardSummary | null;
  releaseDeploymentChecklist: ReleaseDeploymentChecklist | null;
  releaseOperationsDashboard: ReleaseOperationsDashboard | null;
  workspaceId?: string;
}

const providers: ReleaseReadinessWebhookProvider[] = ["vercel", "turso", "brevo", "desktop-updater"];

const providerSurface: Record<ReleaseReadinessWebhookProvider, ReleaseReadinessWebhookSurface> = {
  brevo: "email",
  "desktop-updater": "desktop-update",
  turso: "migration",
  vercel: "deploy",
};

const statusRank: Record<ReleaseReadinessWebhookStatus, number> = {
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

  return JSON.stringify(value);
}

function payloadDigest(payload: Record<string, unknown>) {
  return `sha256:${createHash("sha256").update(stableJson(payload)).digest("hex")}`;
}

function escapeCsvValue(value: string | number | null) {
  const text = value === null ? "" : String(value);

  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function encodeDataUri(content: string) {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(content)}`;
}

function getRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function getStringAtPath(payload: Record<string, unknown>, path: string) {
  const parts = path.split(".");
  let current: unknown = payload;

  for (const part of parts) {
    const record = getRecord(current);

    if (!record || !(part in record)) {
      return null;
    }

    current = record[part];
  }

  return typeof current === "string" && current.trim() ? current.trim() : null;
}

function firstString(payload: Record<string, unknown>, paths: string[]) {
  for (const path of paths) {
    const value = getStringAtPath(payload, path);

    if (value) {
      return value;
    }
  }

  return null;
}

function countLabel(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function eventState(input: ReleaseReadinessWebhookEventInput) {
  return `${input.eventType} ${firstString(input.payload, ["status", "state", "deployment.state", "migration.status", "event", "type"]) ?? ""}`.toLowerCase();
}

function classifyBaseStatus(input: ReleaseReadinessWebhookEventInput): ReleaseReadinessWebhookStatus {
  const state = eventState(input);

  if (/(blocked|bounce|bounced|canceled|cancelled|error|fail|failed|hard_bounce|invalid|missing|rejected|rollback|rolled_back|spam|unavailable)/.test(state)) {
    return "blocked";
  }

  if (/(building|deferred|opened|pending|processed|queued|running|sent|soft_bounce|staged|started|warning|watch)/.test(state)) {
    return "watch";
  }

  if (/(applied|complete|completed|delivered|pass|passed|promoted|published|ready|success|succeeded)/.test(state)) {
    return "ready";
  }

  return "watch";
}

function signatureStatus(signatureState: ReleaseReadinessWebhookSignatureState): ReleaseReadinessWebhookStatus {
  if (signatureState === "missing" || signatureState === "untrusted") {
    return "blocked";
  }

  return "ready";
}

function worstStatus(first: ReleaseReadinessWebhookStatus, second: ReleaseReadinessWebhookStatus): ReleaseReadinessWebhookStatus {
  return statusRank[first] < statusRank[second] ? first : second;
}

function severityForStatus(status: ReleaseReadinessWebhookStatus): ReleaseReadinessWebhookSeverity {
  if (status === "blocked") {
    return "critical";
  }

  return status === "watch" ? "warning" : "info";
}

function subjectForEvent(input: ReleaseReadinessWebhookEventInput) {
  switch (input.provider) {
    case "brevo": {
      return firstString(input.payload, ["email", "recipient.email", "messageId", "message-id"]) ?? "Brevo delivery event";
    }
    case "desktop-updater": {
      const channel = firstString(input.payload, ["channel", "release.channel"]);
      const version = firstString(input.payload, ["version", "release.version"]);

      return [channel, version].filter(Boolean).join(" ") || "Desktop updater promotion";
    }
    case "turso": {
      const database = firstString(input.payload, ["database", "databaseName", "db"]);
      const migration = firstString(input.payload, ["migrationName", "migration.name", "name"]);

      return [database, migration].filter(Boolean).join(" / ") || "Turso migration event";
    }
    case "vercel": {
      const project = firstString(input.payload, ["project.name", "projectName"]);
      const target = firstString(input.payload, ["deployment.target", "target"]);
      const url = firstString(input.payload, ["deployment.url", "url"]);

      return [project, target, url].filter(Boolean).join(" / ") || "Vercel deployment event";
    }
  }
}

function evidenceForEvent(input: ReleaseReadinessWebhookEventInput, status: ReleaseReadinessWebhookStatus) {
  const state = firstString(input.payload, ["status", "state", "deployment.state", "migration.status", "event", "type"]) ?? input.eventType;
  const signature = input.signatureState ?? "not-required";

  if (input.provider === "vercel") {
    const target = firstString(input.payload, ["deployment.target", "target"]) ?? "unknown target";

    return `Vercel ${target} deploy reported ${state}; webhook trust is ${signature}.`;
  }

  if (input.provider === "turso") {
    const migration = firstString(input.payload, ["migrationName", "migration.name", "name"]) ?? "migration";

    return `Turso ${migration} reported ${state}; webhook trust is ${signature}.`;
  }

  if (input.provider === "brevo") {
    const recipient = firstString(input.payload, ["email", "recipient.email"]) ?? "recipient";

    return `Brevo delivery for ${recipient} reported ${state}; webhook trust is ${signature}.`;
  }

  const channel = firstString(input.payload, ["channel", "release.channel"]) ?? "desktop channel";

  return `Desktop updater ${channel} reported ${status === "ready" ? "promotion-ready" : state}; webhook trust is ${signature}.`;
}

function nextActionForEvent(input: ReleaseReadinessWebhookEventInput, status: ReleaseReadinessWebhookStatus, signatureState: ReleaseReadinessWebhookSignatureState) {
  if (signatureState === "missing" || signatureState === "untrusted") {
    return "Reject or quarantine this webhook until the provider signing secret is configured and verified.";
  }

  if (status === "ready") {
    return "Keep this webhook event attached to the release readiness packet.";
  }

  if (input.provider === "vercel") {
    return "Inspect the Vercel deployment event, rerun post-deploy smoke, and hold promotion until production routes are healthy.";
  }

  if (input.provider === "turso") {
    return "Review the migration job, confirm schema state, and rerun the deployment checklist before serving release traffic.";
  }

  if (input.provider === "brevo") {
    return "Investigate sender reputation, recipient failures, and queued notification retries before relying on release email.";
  }

  return "Resolve unsigned artifacts, missing updater endpoints, or blocked desktop channels before promoting the updater feed.";
}

export function normalizeReleaseReadinessWebhookEvent(input: ReleaseReadinessWebhookEventInput): ReleaseReadinessWebhookRow {
  const signatureState = input.signatureState ?? "not-required";
  const baseStatus = classifyBaseStatus(input);
  const status = worstStatus(baseStatus, signatureStatus(signatureState));
  const subject = subjectForEvent(input);

  return {
    dedupeKey: input.dedupeKey ?? `${input.provider}:${input.eventType}:${subject}`,
    eventType: input.eventType,
    evidence: evidenceForEvent(input, status),
    nextAction: nextActionForEvent(input, status, signatureState),
    payloadDigest: payloadDigest(input.payload),
    provider: input.provider,
    receivedAt: input.receivedAt,
    severity: severityForStatus(status),
    signatureState,
    status,
    subject,
    surface: providerSurface[input.provider],
  };
}

function dedupeLatest(events: ReleaseReadinessWebhookRow[]) {
  const byKey = new Map<string, ReleaseReadinessWebhookRow>();

  for (const event of events) {
    const existing = byKey.get(event.dedupeKey);

    if (!existing || new Date(event.receivedAt).getTime() >= new Date(existing.receivedAt).getTime()) {
      byKey.set(event.dedupeKey, event);
    }
  }

  return [...byKey.values()];
}

function providerCoverage(rows: ReleaseReadinessWebhookRow[]) {
  const coverage: Record<ReleaseReadinessWebhookProvider, number> = {
    brevo: 0,
    "desktop-updater": 0,
    turso: 0,
    vercel: 0,
  };

  for (const row of rows) {
    coverage[row.provider] += 1;
  }

  return coverage;
}

function createCsv(rows: ReleaseReadinessWebhookRow[]) {
  const header = ["provider", "event_type", "status", "surface", "received_at", "signature_state", "subject", "payload_digest", "next_action"];
  const body = rows.map((row) =>
    [row.provider, row.eventType, row.status, row.surface, row.receivedAt, row.signatureState, row.subject, row.payloadDigest, row.nextAction].map(escapeCsvValue).join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function createSummary(rows: ReleaseReadinessWebhookRow[]): ReleaseReadinessWebhookReport["summary"] {
  const coverage = providerCoverage(rows);
  const missingProviderCount = providers.filter((provider) => coverage[provider] === 0).length;
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const watchCount = rows.filter((row) => row.status === "watch").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const readinessScore = Math.max(0, Math.min(100, 100 - blockedCount * 25 - watchCount * 10 - missingProviderCount * 8));
  const status: ReleaseReadinessWebhookStatus = blockedCount > 0 ? "blocked" : watchCount > 0 || missingProviderCount > 0 ? "watch" : "ready";

  return {
    blockedCount,
    missingProviderCount,
    providerCoverage: coverage,
    readinessScore,
    readyCount,
    status,
    totalCount: rows.length,
    watchCount,
  };
}

export function createReleaseReadinessWebhookReport(input: CreateReleaseReadinessWebhookReportInput): ReleaseReadinessWebhookReport {
  const rows = dedupeLatest(input.events).sort(
    (first, second) =>
      statusRank[first.status] - statusRank[second.status] || new Date(second.receivedAt).getTime() - new Date(first.receivedAt).getTime() || first.provider.localeCompare(second.provider),
  );
  const csvContent = createCsv(rows);

  return {
    csvContent,
    csvDataUri: encodeDataUri(csvContent),
    csvFileName: `${input.workspaceId ?? "workspace"}-release-readiness-webhooks.csv`,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    rows,
    summary: createSummary(rows),
  };
}

function statusForChecklistCategories(checklist: ReleaseDeploymentChecklist | null, categories: ReleaseDeploymentCheckCategory[]) {
  const checks = checklist?.checks.filter((check) => categories.includes(check.category)) ?? [];

  if (checks.some((check) => check.status === "fail")) {
    return "failed";
  }

  if (checks.length === 0 || checks.some((check) => check.status === "warning")) {
    return "warning";
  }

  return "completed";
}

function sourceEvents(input: CreateReleaseReadinessWebhookReportFromSourcesInput): ReleaseReadinessWebhookRow[] {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const postDeployStatus = input.postDeploySummary?.status ?? "missing";
  const tursoStatus = statusForChecklistCategories(input.releaseDeploymentChecklist, ["database"]);
  const emailSummary = input.emailDeliveryReport?.summary;
  const emailStatus = !emailSummary || emailSummary.totalCount === 0 ? "pending" : emailSummary.failedCount > 0 ? "failed" : emailSummary.pendingCount > 0 ? "pending" : "delivered";
  const desktopStatus = !input.releaseOperationsDashboard
    ? "missing"
    : input.releaseOperationsDashboard.blockedChannelCount > 0 || input.releaseOperationsDashboard.unsignedArtifactCount > 0 || input.releaseOperationsDashboard.selectedArtifactCount === 0
      ? "blocked"
      : input.releaseOperationsDashboard.readyChannelCount > 0
        ? "promoted"
        : "staged";

  return [
    normalizeReleaseReadinessWebhookEvent({
      dedupeKey: "readiness-source:vercel:deployment",
      eventType: postDeployStatus === "pass" ? "deployment.ready" : postDeployStatus === "fail" ? "deployment.failed" : "deployment.pending",
      payload: {
        completionPercent: input.postDeploySummary?.completionPercent ?? 0,
        historyCount: input.postDeploySummary?.historyCount ?? 0,
        projectId: input.postDeploySummary?.projectId ?? null,
        status: postDeployStatus,
      },
      provider: "vercel",
      receivedAt: input.postDeploySummary?.generatedAt ?? generatedAt,
      signatureState: "not-required",
    }),
    normalizeReleaseReadinessWebhookEvent({
      dedupeKey: "readiness-source:turso:migration",
      eventType: tursoStatus === "completed" ? "database.migration.completed" : tursoStatus === "failed" ? "database.migration.failed" : "database.migration.warning",
      payload: {
        blockerCount: input.releaseDeploymentChecklist?.blockerCount ?? 0,
        status: tursoStatus,
        warningCount: input.releaseDeploymentChecklist?.warningCount ?? 0,
      },
      provider: "turso",
      receivedAt: input.releaseDeploymentChecklist?.generatedAt ?? generatedAt,
      signatureState: "not-required",
    }),
    normalizeReleaseReadinessWebhookEvent({
      dedupeKey: "readiness-source:brevo:delivery",
      eventType: emailStatus === "delivered" ? "delivered" : emailStatus === "failed" ? "delivery.failed" : "delivery.pending",
      payload: {
        failedCount: emailSummary?.failedCount ?? 0,
        pendingCount: emailSummary?.pendingCount ?? 0,
        sentCount: emailSummary?.sentCount ?? 0,
        status: emailStatus,
        totalCount: emailSummary?.totalCount ?? 0,
      },
      provider: "brevo",
      receivedAt: input.emailDeliveryReport?.generatedAt ?? generatedAt,
      signatureState: "not-required",
    }),
    normalizeReleaseReadinessWebhookEvent({
      dedupeKey: "readiness-source:desktop-updater:promotion",
      eventType: desktopStatus === "promoted" ? "desktop.updater.promoted" : desktopStatus === "blocked" ? "desktop.updater.blocked" : "desktop.updater.staged",
      payload: {
        blockedChannelCount: input.releaseOperationsDashboard?.blockedChannelCount ?? 0,
        readyChannelCount: input.releaseOperationsDashboard?.readyChannelCount ?? 0,
        selectedArtifactCount: input.releaseOperationsDashboard?.selectedArtifactCount ?? 0,
        status: desktopStatus,
        unsignedArtifactCount: input.releaseOperationsDashboard?.unsignedArtifactCount ?? 0,
      },
      provider: "desktop-updater",
      receivedAt: input.releaseOperationsDashboard?.generatedAt ?? generatedAt,
      signatureState: "not-required",
    }),
  ];
}

export function createReleaseReadinessWebhookReportFromSources(input: CreateReleaseReadinessWebhookReportFromSourcesInput): ReleaseReadinessWebhookReport {
  return createReleaseReadinessWebhookReport({
    events: sourceEvents(input),
    generatedAt: input.generatedAt,
    workspaceId: input.workspaceId,
  });
}
