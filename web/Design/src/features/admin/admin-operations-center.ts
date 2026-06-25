import type {
  AdminDashboardData,
  AdminDashboardEmail,
  AdminDashboardTemplate,
} from "@/db/admin-dashboard";
import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type { AssetLibraryAudit } from "@/features/assets/asset-library-audit";
import type { ServerExportJobSummary } from "@/features/editor/server-export-job-model";
import type { WebsitePublishSummary } from "@/db/website-publishing";

export type AdminOperationStatus = "ready" | "attention" | "blocked";

export type AdminOperationArea =
  | "templates"
  | "assets"
  | "domains"
  | "email"
  | "exports";

export type AdminModerationQueueItem = {
  id: string;
  area: AdminOperationArea;
  title: string;
  detail: string;
  status: AdminOperationStatus;
  severity: "low" | "medium" | "high";
  targetId: string | null;
  updatedAt: string;
};

export type AdminBulkActionPlan = {
  id: string;
  area: AdminOperationArea;
  title: string;
  detail: string;
  targetCount: number;
  actionKind:
    | "template-review"
    | "asset-duplicate-cleanup"
    | "domain-verification"
    | "email-investigation"
    | "export-retry";
  available: boolean;
};

export type AdminOperationAreaReport = {
  area: AdminOperationArea;
  name: string;
  description: string;
  status: AdminOperationStatus;
  score: number;
  queue: AdminModerationQueueItem[];
  bulkActions: AdminBulkActionPlan[];
  auditTrail: WorkspaceAuditLogSummary[];
};

export type AdminOperationsCenter = {
  status: AdminOperationStatus;
  score: number;
  areas: AdminOperationAreaReport[];
  queue: AdminModerationQueueItem[];
  bulkActions: AdminBulkActionPlan[];
  nextActions: string[];
  totals: {
    queueItems: number;
    highSeverity: number;
    bulkActions: number;
    availableBulkActions: number;
    auditEvents: number;
  };
};

const areaNames: Record<AdminOperationArea, string> = {
  templates: "Templates",
  assets: "Assets",
  domains: "Domains",
  email: "Email",
  exports: "Exports",
};

export function createAdminOperationsCenter(input: {
  adminData: AdminDashboardData;
  assetAudit: AssetLibraryAudit;
  websitePublishes: WebsitePublishSummary[];
  serverExportJobs: ServerExportJobSummary[];
  auditLogs: WorkspaceAuditLogSummary[];
  now?: Date;
}): AdminOperationsCenter {
  const areas = [
    createTemplateArea(input),
    createAssetArea(input),
    createDomainArea(input),
    createEmailArea(input),
    createExportArea(input),
  ];
  const queue = areas
    .flatMap((area) => area.queue)
    .sort(compareQueueItems)
    .slice(0, 24);
  const bulkActions = areas.flatMap((area) => area.bulkActions);
  const score = Math.round(
    areas.reduce((total, area) => total + area.score, 0) / areas.length,
  );

  return {
    status: scoreToStatus(score),
    score,
    areas,
    queue,
    bulkActions,
    nextActions: createNextActions(areas),
    totals: {
      queueItems: queue.length,
      highSeverity: queue.filter((item) => item.severity === "high").length,
      bulkActions: bulkActions.length,
      availableBulkActions: bulkActions.filter((action) => action.available)
        .length,
      auditEvents: areas.reduce(
        (total, area) => total + area.auditTrail.length,
        0,
      ),
    },
  };
}

function createTemplateArea(input: {
  adminData: AdminDashboardData;
  auditLogs: WorkspaceAuditLogSummary[];
}): AdminOperationAreaReport {
  const queue = input.adminData.templates
    .filter(
      (template) =>
        template.marketplaceStatus === "review" ||
        template.approvalStatus === "changes-requested" ||
        (template.marketplaceStatus === "published" &&
          template.approvalStatus !== "approved"),
    )
    .map(createTemplateQueueItem)
    .sort(compareQueueItems);
  const publishReady = input.adminData.templates.filter(
    (template) =>
      template.approvalStatus === "approved" &&
      template.marketplaceStatus === "review",
  );

  return createAreaReport({
    area: "templates",
    description: "Marketplace listings, approvals, and moderation notes.",
    queue,
    bulkActions: [
      {
        id: "template-review",
        area: "templates",
        title: "Review marketplace templates",
        detail: `${publishReady.length} approved templates are waiting in review.`,
        targetCount: publishReady.length,
        actionKind: "template-review",
        available: publishReady.length > 0,
      },
    ],
    auditTrail: filterAudit(input.auditLogs, [
      "template.marketplace.updated",
      "approval.updated",
    ]),
  });
}

function createAssetArea(input: {
  assetAudit: AssetLibraryAudit;
  auditLogs: WorkspaceAuditLogSummary[];
}): AdminOperationAreaReport {
  const duplicateItems = input.assetAudit.duplicateGroups.map((group) => ({
    id: `asset-duplicate-${group.key}`,
    area: "assets" as const,
    title: `${group.assets.length} duplicate assets`,
    detail: `${group.mimeType}, ${group.duplicateBytes} duplicate bytes`,
    status: group.duplicateBytes > 1_000_000 ? "blocked" : "attention",
    severity: group.duplicateBytes > 1_000_000 ? "high" : "medium",
    targetId: group.key,
    updatedAt: group.assets[0]?.updatedAt ?? new Date(0).toISOString(),
  })) satisfies AdminModerationQueueItem[];
  const quotaItem =
    input.assetAudit.usagePercent >= 80
      ? [
          {
            id: "asset-quota",
            area: "assets" as const,
            title: "Asset quota pressure",
            detail: `${Math.round(input.assetAudit.usagePercent)}% of storage quota is used.`,
            status:
              input.assetAudit.usagePercent >= 95 ? "blocked" : "attention",
            severity: input.assetAudit.usagePercent >= 95 ? "high" : "medium",
            targetId: null,
            updatedAt: new Date().toISOString(),
          } satisfies AdminModerationQueueItem,
        ]
      : [];
  const queue = [...quotaItem, ...duplicateItems].sort(compareQueueItems);

  return createAreaReport({
    area: "assets",
    description: "Duplicate cleanup, quota pressure, and asset moderation.",
    queue,
    bulkActions: [
      {
        id: "asset-duplicate-cleanup",
        area: "assets",
        title: "Delete duplicate assets",
        detail: `${input.assetAudit.duplicateCount} duplicates can recover ${input.assetAudit.duplicateBytes} bytes.`,
        targetCount: input.assetAudit.duplicateCount,
        actionKind: "asset-duplicate-cleanup",
        available: input.assetAudit.duplicateCount > 0,
      },
    ],
    auditTrail: filterAudit(input.auditLogs, [
      "asset.deleted",
      "asset.duplicates_deleted",
    ]),
  });
}

function createDomainArea(input: {
  websitePublishes: WebsitePublishSummary[];
  auditLogs: WorkspaceAuditLogSummary[];
}): AdminOperationAreaReport {
  const domains = input.websitePublishes.flatMap((publish) =>
    publish.customDomains.map((domain) => ({
      publish,
      domain,
    })),
  );
  const queue = domains
    .filter(
      ({ domain }) =>
        domain.status !== "verified" || domain.platformStatus !== "attached",
    )
    .map(
      ({ publish, domain }): AdminModerationQueueItem => ({
        id: `domain-${domain.id}`,
        area: "domains",
        title: domain.domain,
        detail:
          domain.platformStatus === "error"
            ? domain.platformError ?? "Platform attachment failed."
            : `${publish.title} needs ${domain.status === "verified" ? "platform attachment" : "DNS verification"}.`,
        status: domain.platformStatus === "error" ? "blocked" : "attention",
        severity: domain.platformStatus === "error" ? "high" : "medium",
        targetId: domain.id,
        updatedAt: domain.updatedAt,
      }),
    )
    .sort(compareQueueItems);

  return createAreaReport({
    area: "domains",
    description: "Website domain verification and platform attachment.",
    queue,
    bulkActions: [
      {
        id: "domain-verification",
        area: "domains",
        title: "Verify or attach domains",
        detail: `${queue.length} domains need verification, refresh, or platform attachment.`,
        targetCount: queue.length,
        actionKind: "domain-verification",
        available: queue.length > 0,
      },
    ],
    auditTrail: filterAudit(input.auditLogs, [
      "website.domain.added",
      "website.domain.verified",
      "website.domain.attached",
      "website.domain.refreshed",
      "website.domain.deleted",
    ]),
  });
}

function createEmailArea(input: {
  adminData: AdminDashboardData;
  auditLogs: WorkspaceAuditLogSummary[];
  now?: Date;
}): AdminOperationAreaReport {
  const now = input.now ?? new Date();
  const queue = input.adminData.emails
    .filter((email) => email.deliveryStatus !== "sent" || isStaleEmail(email, now))
    .map(
      (email): AdminModerationQueueItem => ({
        id: `email-${email.id}`,
        area: "email",
        title: email.subject,
        detail:
          email.deliveryStatus === "failed"
            ? email.errorMessage ?? `Failed email to ${email.recipient}`
            : `${email.purpose} email to ${email.recipient}`,
        status: email.deliveryStatus === "failed" ? "blocked" : "attention",
        severity: email.deliveryStatus === "failed" ? "high" : "medium",
        targetId: email.id,
        updatedAt: email.createdAt,
      }),
    )
    .sort(compareQueueItems);

  return createAreaReport({
    area: "email",
    description: "Transactional email failures, pending sends, and auth notices.",
    queue,
    bulkActions: [
      {
        id: "email-investigation",
        area: "email",
        title: "Investigate failed email",
        detail: `${queue.length} email records need delivery review.`,
        targetCount: queue.length,
        actionKind: "email-investigation",
        available: false,
      },
    ],
    auditTrail: filterAudit(input.auditLogs, [
      "auth.verification.sent",
      "auth.two_factor.enabled",
      "auth.two_factor.disabled",
    ]),
  });
}

function createExportArea(input: {
  serverExportJobs: ServerExportJobSummary[];
  auditLogs: WorkspaceAuditLogSummary[];
  now?: Date;
}): AdminOperationAreaReport {
  const now = input.now ?? new Date();
  const queue = input.serverExportJobs
    .filter(
      (job) =>
        job.status === "failed" ||
        (job.status !== "completed" && isOlderThan(job.updatedAt, now, 30)),
    )
    .map(
      (job): AdminModerationQueueItem => ({
        id: `export-${job.id}`,
        area: "exports",
        title: job.fileName,
        detail:
          job.status === "failed"
            ? job.failureMessage ?? "Export failed without diagnostics."
            : `${job.formatLabel} export has not completed.`,
        status: job.status === "failed" ? "blocked" : "attention",
        severity: job.status === "failed" ? "high" : "medium",
        targetId: job.id,
        updatedAt: job.updatedAt,
      }),
    )
    .sort(compareQueueItems);

  return createAreaReport({
    area: "exports",
    description: "Failed, stuck, and diagnostic export operations.",
    queue,
    bulkActions: [
      {
        id: "export-retry",
        area: "exports",
        title: "Retry failed exports",
        detail: `${queue.length} export jobs need retry or diagnostics.`,
        targetCount: queue.length,
        actionKind: "export-retry",
        available: false,
      },
    ],
    auditTrail: filterAudit(input.auditLogs, ["automation.recipe.applied"]),
  });
}

function createTemplateQueueItem(
  template: AdminDashboardTemplate,
): AdminModerationQueueItem {
  const blocked =
    template.approvalStatus === "changes-requested" ||
    (template.marketplaceStatus === "published" &&
      template.approvalStatus !== "approved");

  return {
    id: `template-${template.id}`,
    area: "templates",
    title: template.name,
    detail: `${template.marketplaceStatus} marketplace state, approval is ${template.approvalStatus}`,
    status: blocked ? "blocked" : "attention",
    severity: blocked ? "high" : "medium",
    targetId: template.id,
    updatedAt: template.updatedAt,
  };
}

function createAreaReport(input: {
  area: AdminOperationArea;
  description: string;
  queue: AdminModerationQueueItem[];
  bulkActions: AdminBulkActionPlan[];
  auditTrail: WorkspaceAuditLogSummary[];
}): AdminOperationAreaReport {
  const highSeverity = input.queue.filter(
    (item) => item.severity === "high",
  ).length;
  const score = !input.queue.length ? 100 : highSeverity ? 45 : 70;

  return {
    area: input.area,
    name: areaNames[input.area],
    description: input.description,
    status: scoreToStatus(score),
    score,
    queue: input.queue,
    bulkActions: input.bulkActions,
    auditTrail: input.auditTrail.slice(0, 5),
  };
}

function filterAudit(logs: WorkspaceAuditLogSummary[], actions: string[]) {
  const actionSet = new Set(actions);

  return logs.filter((log) => actionSet.has(log.action)).slice(0, 8);
}

function createNextActions(areas: AdminOperationAreaReport[]) {
  return areas
    .filter((area) => area.status !== "ready")
    .sort((left, right) => left.score - right.score)
    .map((area) => {
      const worst = [...area.queue].sort(compareQueueItems)[0];

      return worst
        ? `${area.name}: ${worst.title} - ${worst.detail}`
        : `${area.name}: review moderation setup`;
    })
    .slice(0, 5);
}

function compareQueueItems(
  left: AdminModerationQueueItem,
  right: AdminModerationQueueItem,
) {
  return (
    severityWeight(right.severity) - severityWeight(left.severity) ||
    Date.parse(right.updatedAt) - Date.parse(left.updatedAt) ||
    left.title.localeCompare(right.title)
  );
}

function severityWeight(severity: AdminModerationQueueItem["severity"]) {
  if (severity === "high") return 2;
  if (severity === "medium") return 1;

  return 0;
}

function isStaleEmail(email: AdminDashboardEmail, now: Date) {
  return email.deliveryStatus !== "sent" && isOlderThan(email.createdAt, now, 15);
}

function isOlderThan(value: string, now: Date, minutes: number) {
  const timestamp = Date.parse(value);

  if (!Number.isFinite(timestamp)) return false;

  return now.getTime() - timestamp > minutes * 60 * 1000;
}

function scoreToStatus(score: number): AdminOperationStatus {
  if (score >= 80) return "ready";
  if (score >= 50) return "attention";

  return "blocked";
}
