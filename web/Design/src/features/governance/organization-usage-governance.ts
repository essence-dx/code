import type { AuthEmailSummary } from "@/db/auth-emails";
import type { TeamWorkspaceManagementSummary } from "@/db/team-workspace-management";
import type {
  WebsiteFormSubmissionSummary,
  WebsitePublishSummary,
} from "@/db/website-publishing";
import type { AssetLibraryAudit } from "@/features/assets/asset-library-audit";
import { formatAssetBytes } from "@/features/assets/asset-library-audit";
import type { AutomationRecipeSummary } from "@/features/automation/automation-recipes";
import type { ServerExportJobSummary } from "@/features/editor/server-export-job-model";

export type OrganizationUsageStatus = "ready" | "review" | "blocked";

export type OrganizationUsageAreaId =
  | "storage"
  | "exports"
  | "publishing"
  | "email"
  | "automation"
  | "team-seats";

export type OrganizationUsageQuotaConfig = {
  storageBytes?: number;
  exportJobs: number;
  publishedWebsites: number;
  emailSends: number;
  automationRecipes: number;
  teamSeats: number;
};

export type OrganizationUsageArea = {
  id: OrganizationUsageAreaId;
  title: string;
  description: string;
  status: OrganizationUsageStatus;
  used: number;
  quota: number;
  usagePercent: number;
  metricLabel: string;
  signals: string[];
  nextAction: string | null;
};

export type OrganizationUsageRemediationPlan = {
  id: string;
  areaId: OrganizationUsageAreaId;
  severity: OrganizationUsageStatus;
  title: string;
  detail: string;
  actions: string[];
};

export type OrganizationUsageGovernance = {
  status: OrganizationUsageStatus;
  score: number;
  checkedAt: string;
  areas: OrganizationUsageArea[];
  remediationPlans: OrganizationUsageRemediationPlan[];
  nextActions: string[];
  totals: {
    areas: number;
    pressureAreas: number;
    blockedAreas: number;
    reviewAreas: number;
    totalUsed: number;
    totalQuota: number;
    averageUsagePercent: number;
  };
};

export type OrganizationUsageGovernanceInput = {
  assetAudit: AssetLibraryAudit;
  serverExportJobs: ServerExportJobSummary[];
  websitePublishes: WebsitePublishSummary[];
  websiteFormSubmissions: WebsiteFormSubmissionSummary[];
  authEmails: AuthEmailSummary[];
  automationRecipes: AutomationRecipeSummary[];
  teamManagement: TeamWorkspaceManagementSummary[];
  quotas?: Partial<OrganizationUsageQuotaConfig>;
  now?: string;
};

export const defaultOrganizationUsageQuotas: OrganizationUsageQuotaConfig = {
  exportJobs: 50,
  publishedWebsites: 20,
  emailSends: 100,
  automationRecipes: 12,
  teamSeats: 25,
};

export function createOrganizationUsageGovernance(
  input: OrganizationUsageGovernanceInput,
): OrganizationUsageGovernance {
  const quotas = {
    ...defaultOrganizationUsageQuotas,
    ...input.quotas,
    storageBytes: input.quotas?.storageBytes ?? input.assetAudit.quotaBytes,
  };
  const areas = [
    createStorageArea(input.assetAudit, quotas.storageBytes),
    createExportArea(input.serverExportJobs, quotas.exportJobs),
    createPublishingArea(
      input.websitePublishes,
      input.websiteFormSubmissions,
      quotas.publishedWebsites,
    ),
    createEmailArea(input.authEmails, quotas.emailSends),
    createAutomationArea(input.automationRecipes, quotas.automationRecipes),
    createTeamSeatArea(input.teamManagement, quotas.teamSeats),
  ];
  const remediationPlans = areas
    .filter((area) => area.status !== "ready" && area.nextAction)
    .map(createRemediationPlan);
  const blockedAreas = areas.filter((area) => area.status === "blocked").length;
  const reviewAreas = areas.filter((area) => area.status === "review").length;
  const status = createStatus({ blockedAreas, reviewAreas });
  const totalUsed = areas.reduce((total, area) => total + area.used, 0);
  const totalQuota = areas.reduce((total, area) => total + area.quota, 0);

  return {
    status,
    score: scoreGovernance(areas),
    checkedAt: input.now ?? new Date().toISOString(),
    areas,
    remediationPlans,
    nextActions: remediationPlans.slice(0, 5).map((plan) => plan.title),
    totals: {
      areas: areas.length,
      pressureAreas: blockedAreas + reviewAreas,
      blockedAreas,
      reviewAreas,
      totalUsed,
      totalQuota,
      averageUsagePercent: roundPercent(
        areas.reduce((total, area) => total + area.usagePercent, 0) /
          Math.max(areas.length, 1),
      ),
    },
  };
}

function createStorageArea(
  assetAudit: AssetLibraryAudit,
  quotaBytes: number,
): OrganizationUsageArea {
  const usagePercent = percent(assetAudit.totalBytes, quotaBytes);
  const signals = [
    `${formatPercent(usagePercent)} of storage quota used.`,
    `${assetAudit.assetCount} uploaded or brand assets tracked.`,
    `${formatAssetBytes(assetAudit.duplicateBytes)} recoverable from duplicates.`,
    `${assetAudit.skippedProjectReferenceCount} skipped project asset references.`,
  ];

  return {
    id: "storage",
    title: "Storage",
    description: "Uploaded assets, brand logos, and project asset manifests.",
    status: statusFromUsage(usagePercent, {
      blockedAt: 95,
      reviewAt: 80,
      forceReview: assetAudit.skippedProjectReferenceCount > 0,
    }),
    used: assetAudit.totalBytes,
    quota: quotaBytes,
    usagePercent,
    metricLabel: `${formatAssetBytes(assetAudit.totalBytes)} / ${formatAssetBytes(quotaBytes)}`,
    signals,
    nextAction:
      usagePercent >= 80 || assetAudit.duplicateBytes > 0
        ? "Reduce storage pressure by deleting duplicates and reviewing large project manifests."
        : null,
  };
}

function createExportArea(
  jobs: ServerExportJobSummary[],
  quota: number,
): OrganizationUsageArea {
  const failedExports = jobs.filter((job) => job.status === "failed").length;
  const runningExports = jobs.filter(
    (job) => job.status === "queued" || job.status === "running",
  ).length;
  const storedBytes = jobs.reduce(
    (total, job) => total + (job.artifactSizeBytes ?? 0),
    0,
  );
  const usagePercent = percent(jobs.length, quota);

  return {
    id: "exports",
    title: "Exports",
    description: "Durable export volume, stored artifacts, and failed jobs.",
    status:
      usagePercent >= 100 && failedExports > 0
        ? "blocked"
        : statusFromUsage(usagePercent, {
            blockedAt: 110,
            reviewAt: 80,
            forceReview: failedExports > 0 || runningExports > 3,
          }),
    used: jobs.length,
    quota,
    usagePercent,
    metricLabel: `${jobs.length} jobs / ${quota} budget`,
    signals: [
      `${failedExports} failed exports need retry or cleanup.`,
      `${runningExports} queued or running exports are consuming attention.`,
      `${formatAssetBytes(storedBytes)} stored export artifacts.`,
    ],
    nextAction:
      failedExports > 0 || usagePercent >= 80
        ? "Retry failed exports and archive stale export artifacts."
        : null,
  };
}

function createPublishingArea(
  publishes: WebsitePublishSummary[],
  submissions: WebsiteFormSubmissionSummary[],
  quota: number,
): OrganizationUsageArea {
  const published = publishes.filter(
    (publish) => publish.status === "published",
  );
  const domainIssues = publishes.reduce(
    (total, publish) =>
      total +
      publish.customDomains.filter(
        (domain) =>
          domain.status !== "verified" || domain.platformStatus === "error",
      ).length,
    0,
  );
  const usagePercent = percent(published.length, quota);

  return {
    id: "publishing",
    title: "Publishing",
    description: "Published websites, custom domains, and form submissions.",
    status: statusFromUsage(usagePercent, {
      blockedAt: 110,
      reviewAt: 80,
      forceReview: domainIssues > 0,
    }),
    used: published.length,
    quota,
    usagePercent,
    metricLabel: `${published.length} published / ${quota} budget`,
    signals: [
      `${domainIssues} custom domain issues need verification.`,
      `${submissions.length} form submissions need retention visibility.`,
      `${published.reduce((total, publish) => total + publish.viewCount, 0)} website views tracked.`,
    ],
    nextAction:
      domainIssues > 0 || usagePercent >= 80
        ? "Review published-site quota and resolve custom domain issues."
        : null,
  };
}

function createEmailArea(
  emails: AuthEmailSummary[],
  quota: number,
): OrganizationUsageArea {
  const failedEmails = emails.filter(
    (email) => email.deliveryStatus === "failed" || email.errorMessage,
  ).length;
  const usagePercent = percent(emails.length, quota);

  return {
    id: "email",
    title: "Email",
    description: "Verification, security, and transactional email sends.",
    status: statusFromUsage(usagePercent, {
      blockedAt: 110,
      reviewAt: 80,
      forceReview: failedEmails > 0,
    }),
    used: emails.length,
    quota,
    usagePercent,
    metricLabel: `${emails.length} emails / ${quota} budget`,
    signals: [
      `${failedEmails} failed emails need provider review.`,
      `${emails.filter((email) => email.sentAt).length} messages have sent timestamps.`,
    ],
    nextAction:
      failedEmails > 0 || usagePercent >= 80
        ? "Review failed transactional emails and provider quota."
        : null,
  };
}

function createAutomationArea(
  recipes: AutomationRecipeSummary[],
  quota: number,
): OrganizationUsageArea {
  const disabledRecipes = recipes.filter(
    (recipe) => recipe.disabledReason,
  ).length;
  const targetCount = recipes.reduce(
    (total, recipe) => total + recipe.targets.length,
    0,
  );
  const usagePercent = percent(recipes.length, quota);

  return {
    id: "automation",
    title: "Automation",
    description: "Recipe availability, target volume, and disabled workflows.",
    status: statusFromUsage(usagePercent, {
      blockedAt: 110,
      reviewAt: 80,
      forceReview: disabledRecipes > 0,
    }),
    used: recipes.length,
    quota,
    usagePercent,
    metricLabel: `${recipes.length} recipes / ${quota} budget`,
    signals: [
      `${disabledRecipes} disabled automation recipes need setup.`,
      `${targetCount} automation targets are visible.`,
    ],
    nextAction:
      disabledRecipes > 0 || usagePercent >= 80
        ? "Resolve disabled automation recipes before scaling schedules."
        : null,
  };
}

function createTeamSeatArea(
  workspaces: TeamWorkspaceManagementSummary[],
  quota: number,
): OrganizationUsageArea {
  const members = uniqueMembers(workspaces).size;
  const pendingInvites = workspaces.reduce(
    (total, workspace) => total + workspace.pendingInvites.length,
    0,
  );
  const used = members + pendingInvites;
  const usagePercent = percent(used, quota);

  return {
    id: "team-seats",
    title: "Team seats",
    description: "Accepted members plus pending invites across workspaces.",
    status: statusFromUsage(usagePercent, {
      blockedAt: 110,
      reviewAt: 80,
      forceReview: pendingInvites > 0 && usagePercent >= 70,
    }),
    used,
    quota,
    usagePercent,
    metricLabel: `${used} seats / ${quota} budget`,
    signals: [
      `${members} accepted members counted once.`,
      `${pendingInvites} pending invites reserve seats.`,
    ],
    nextAction:
      pendingInvites > 0 || usagePercent >= 80
        ? "Review pending invites and seat budget before inviting more teammates."
        : null,
  };
}

function createRemediationPlan(
  area: OrganizationUsageArea,
): OrganizationUsageRemediationPlan {
  const action =
    area.nextAction ?? `Review ${area.title.toLowerCase()} pressure.`;

  return {
    id: `usage-${area.id}`,
    areaId: area.id,
    severity: area.status,
    title:
      area.id === "storage"
        ? "Reduce storage pressure"
        : `Review ${area.title.toLowerCase()} quota pressure`,
    detail: `${area.metricLabel}. ${area.signals[0] ?? action}`,
    actions: [
      action,
      "Assign an owner before the next release readiness review.",
      "Re-run usage governance after cleanup or quota changes.",
    ],
  };
}

function uniqueMembers(workspaces: TeamWorkspaceManagementSummary[]) {
  const memberIds = new Set<string>();

  for (const workspace of workspaces) {
    for (const member of workspace.members) {
      memberIds.add(member.userId);
    }
  }

  return memberIds;
}

function statusFromUsage(
  usagePercent: number,
  options: {
    blockedAt: number;
    reviewAt: number;
    forceReview?: boolean;
  },
): OrganizationUsageStatus {
  if (usagePercent >= options.blockedAt) return "blocked";
  if (usagePercent >= options.reviewAt || options.forceReview) return "review";

  return "ready";
}

function createStatus(input: {
  blockedAreas: number;
  reviewAreas: number;
}): OrganizationUsageStatus {
  if (input.blockedAreas) return "blocked";
  if (input.reviewAreas) return "review";

  return "ready";
}

function scoreGovernance(areas: OrganizationUsageArea[]) {
  const penalty = areas.reduce((total, area) => {
    const statusPenalty =
      area.status === "blocked" ? 18 : area.status === "review" ? 8 : 0;

    return total + statusPenalty + Math.max(0, area.usagePercent - 75) * 0.25;
  }, 0);

  return Math.max(0, Math.min(100, Math.round(100 - penalty)));
}

function percent(used: number, quota: number) {
  if (quota <= 0) return used > 0 ? 100 : 0;

  return roundPercent(Math.min((used / quota) * 100, 100));
}

function roundPercent(value: number) {
  return Math.round(value * 10) / 10;
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}
