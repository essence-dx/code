import type { AuthEmailSummary } from "@/db/auth-emails";
import type { ReviewTaskSummary } from "@/db/project-comments";
import type { WebsitePublishSummary } from "@/db/website-publishing";
import type { AssetLibraryAudit } from "@/features/assets/asset-library-audit";
import type { ServerExportJobSummary } from "@/features/editor/server-export-job-model";
import type { ProjectSummary } from "@/features/editor/types";
import { isReviewTaskOverdue } from "@/features/review/review-tasks";

export type ProductionObservabilityStatus = "healthy" | "watch" | "critical";

export type ProductionObservabilityIncident = {
  id: string;
  title: string;
  detail: string;
  status: ProductionObservabilityStatus;
  metric: string;
  href?: string;
};

export type ProductionObservabilityGroup = {
  id: "exports" | "email" | "publishing" | "storage" | "collaboration";
  title: string;
  description: string;
  status: ProductionObservabilityStatus;
  score: number;
  incidents: ProductionObservabilityIncident[];
};

export type ProductionObservabilityReport = {
  status: ProductionObservabilityStatus;
  score: number;
  checkedAt: string;
  groups: ProductionObservabilityGroup[];
  totals: {
    incidents: number;
    critical: number;
    watch: number;
  };
};

export type ProductionObservabilityInput = {
  exportJobs: ServerExportJobSummary[];
  authEmails: AuthEmailSummary[];
  websitePublishes: WebsitePublishSummary[];
  assetAudit: AssetLibraryAudit;
  reviewTasks: ReviewTaskSummary[];
  projects: ProjectSummary[];
  now?: Date;
};

const slowCompletedExportMs = 2 * 60 * 1000;
const staleRunningExportMs = 15 * 60 * 1000;
const queuedEmailWatchMs = 10 * 60 * 1000;

export function createProductionObservabilityReport(
  input: ProductionObservabilityInput,
): ProductionObservabilityReport {
  const now = input.now ?? new Date();
  const groups = [
    createExportObservability(input.exportJobs, now),
    createEmailObservability(input.authEmails, now),
    createPublishingObservability(input.websitePublishes),
    createStorageObservability(input.assetAudit),
    createCollaborationObservability(input.reviewTasks, input.projects, now),
  ];
  const score = Math.round(
    groups.reduce((total, group) => total + group.score, 0) / groups.length,
  );
  const activeIncidents = groups
    .flatMap((group) => group.incidents)
    .filter((incident) => incident.status !== "healthy");
  const critical = activeIncidents.filter(
    (incident) => incident.status === "critical",
  ).length;
  const watch = activeIncidents.filter((incident) => incident.status === "watch")
    .length;

  return {
    status: getStatusFromScore(score, critical),
    score,
    checkedAt: now.toISOString(),
    groups,
    totals: {
      incidents: activeIncidents.length,
      critical,
      watch,
    },
  };
}

function createExportObservability(
  jobs: ServerExportJobSummary[],
  now: Date,
): ProductionObservabilityGroup {
  const incidents: ProductionObservabilityIncident[] = [];
  const failedJobs = jobs.filter((job) => job.status === "failed");
  const staleJobs = jobs.filter(
    (job) =>
      (job.status === "queued" || job.status === "running") &&
      ageMs(job.updatedAt, now) >= staleRunningExportMs,
  );
  const slowJobs = jobs.filter((job) => {
    if (job.status !== "completed" || !job.completedAt) return false;

    return durationMs(job.createdAt, job.completedAt) >= slowCompletedExportMs;
  });

  for (const job of failedJobs.slice(0, 4)) {
    incidents.push({
      id: `export-failed-${job.id}`,
      title: `Failed export: ${job.projectName}`,
      detail: job.failureMessage || `${job.formatLabel} export did not finish.`,
      status: "critical",
      metric: job.formatLabel,
      href: `/editor/${job.projectId}`,
    });
  }

  for (const job of staleJobs.slice(0, 4)) {
    incidents.push({
      id: `export-stale-${job.id}`,
      title: `Stalled export: ${job.projectName}`,
      detail: `${job.formatLabel} has not updated for ${formatDuration(
        ageMs(job.updatedAt, now),
      )}.`,
      status: "watch",
      metric: `${job.progress}%`,
      href: `/editor/${job.projectId}`,
    });
  }

  for (const job of slowJobs.slice(0, 3)) {
    incidents.push({
      id: `export-slow-${job.id}`,
      title: `Slow export: ${job.projectName}`,
      detail: `${job.formatLabel} took ${formatDuration(
        durationMs(job.createdAt, job.completedAt ?? job.updatedAt),
      )}.`,
      status: "watch",
      metric: job.formatLabel,
      href: `/editor/${job.projectId}`,
    });
  }

  return createGroup({
    id: "exports",
    title: "Export reliability",
    description: "Slow, stalled, and failed durable export jobs.",
    incidents,
    fallbackMetric: `${jobs.length} recent jobs`,
  });
}

function createEmailObservability(
  emails: AuthEmailSummary[],
  now: Date,
): ProductionObservabilityGroup {
  const incidents: ProductionObservabilityIncident[] = [];
  const failedEmails = emails.filter(
    (email) => email.deliveryStatus === "failed",
  );
  const staleQueuedEmails = emails.filter(
    (email) =>
      email.deliveryStatus === "queued" &&
      ageMs(email.createdAt, now) >= queuedEmailWatchMs,
  );

  for (const email of failedEmails.slice(0, 5)) {
    incidents.push({
      id: `email-failed-${email.id}`,
      title: `Failed email: ${email.subject}`,
      detail: email.errorMessage || `${email.purpose} delivery failed.`,
      status: "critical",
      metric: email.purpose,
      href: email.previewUrl ?? undefined,
    });
  }

  for (const email of staleQueuedEmails.slice(0, 4)) {
    incidents.push({
      id: `email-queued-${email.id}`,
      title: `Queued email: ${email.subject}`,
      detail: `Queued for ${formatDuration(ageMs(email.createdAt, now))}.`,
      status: "watch",
      metric: email.purpose,
      href: email.previewUrl ?? undefined,
    });
  }

  return createGroup({
    id: "email",
    title: "Email delivery",
    description: "Failed and stale transactional email sends.",
    incidents,
    fallbackMetric: `${emails.length} recent emails`,
  });
}

function createPublishingObservability(
  publishes: WebsitePublishSummary[],
): ProductionObservabilityGroup {
  const incidents: ProductionObservabilityIncident[] = [];

  for (const publish of publishes) {
    const erroredDomains = publish.customDomains.filter(
      (domain) => domain.platformStatus === "error",
    );
    const pendingDomains = publish.customDomains.filter(
      (domain) => domain.status === "pending",
    );

    for (const domain of erroredDomains.slice(0, 3)) {
      incidents.push({
        id: `publish-domain-error-${domain.id}`,
        title: `Domain attach error: ${domain.domain}`,
        detail:
          domain.platformError ||
          `Platform attachment needs attention for ${publish.title}.`,
        status: "critical",
        metric: publish.slug,
      });
    }

    for (const domain of pendingDomains.slice(0, 2)) {
      incidents.push({
        id: `publish-domain-pending-${domain.id}`,
        title: `Domain verification pending: ${domain.domain}`,
        detail: `DNS verification is still pending for ${publish.title}.`,
        status: "watch",
        metric: publish.slug,
      });
    }
  }

  return createGroup({
    id: "publishing",
    title: "Publishing health",
    description: "Website publishing and custom-domain readiness.",
    incidents,
    fallbackMetric: `${publishes.length} published records`,
  });
}

function createStorageObservability(
  audit: AssetLibraryAudit,
): ProductionObservabilityGroup {
  const incidents: ProductionObservabilityIncident[] = [];

  if (audit.usagePercent >= 90) {
    incidents.push({
      id: "storage-quota-critical",
      title: "Storage near quota",
      detail: `${audit.usagePercent.toFixed(1)}% of the asset quota is used.`,
      status: "critical",
      metric: formatPercent(audit.usagePercent),
    });
  } else if (audit.usagePercent >= 75) {
    incidents.push({
      id: "storage-quota-watch",
      title: "Storage growth watch",
      detail: `${audit.usagePercent.toFixed(1)}% of the asset quota is used.`,
      status: "watch",
      metric: formatPercent(audit.usagePercent),
    });
  }

  if (audit.duplicateCount > 0) {
    incidents.push({
      id: "storage-duplicates",
      title: "Duplicate assets",
      detail: `${audit.duplicateCount} duplicates can recover ${formatBytes(
        audit.duplicateBytes,
      )}.`,
      status: audit.duplicateCount >= 10 ? "critical" : "watch",
      metric: `${audit.duplicateCount} duplicates`,
    });
  }

  if (audit.skippedProjectReferenceCount > 0) {
    incidents.push({
      id: "storage-skipped-references",
      title: "Skipped project asset references",
      detail: `${audit.skippedProjectReferenceCount} project references exceeded manifest limits.`,
      status: "watch",
      metric: `${audit.skippedProjectReferenceCount} skipped`,
    });
  }

  return createGroup({
    id: "storage",
    title: "Storage growth",
    description: "Asset quota, duplicates, and skipped manifest references.",
    incidents,
    fallbackMetric: formatBytes(audit.totalBytes),
  });
}

function createCollaborationObservability(
  reviewTasks: ReviewTaskSummary[],
  projects: ProjectSummary[],
  now: Date,
): ProductionObservabilityGroup {
  const incidents: ProductionObservabilityIncident[] = [];
  const overdueTasks = reviewTasks.filter((task) =>
    isReviewTaskOverdue({ ...task, now }),
  );
  const staleTasks = reviewTasks.filter(
    (task) =>
      task.taskStatus !== "done" &&
      !isReviewTaskOverdue({ ...task, now }) &&
      ageMs(task.updatedAt, now) >= 7 * 24 * 60 * 60 * 1000,
  );
  const openEditLinks = projects.filter(
    (project) => project.editShareId && project.editSharePermission === "edit",
  );

  for (const task of overdueTasks.slice(0, 5)) {
    incidents.push({
      id: `collab-overdue-${task.id}`,
      title: `Overdue review: ${task.projectName}`,
      detail: task.body,
      status: "critical",
      metric: task.taskAssigneeName || "Unassigned",
      href: `/editor/${task.projectId}`,
    });
  }

  for (const task of staleTasks.slice(0, 4)) {
    incidents.push({
      id: `collab-stale-${task.id}`,
      title: `Stale collaboration task: ${task.projectName}`,
      detail: `No task movement for ${formatDuration(ageMs(task.updatedAt, now))}.`,
      status: "watch",
      metric: task.taskStatus,
      href: `/editor/${task.projectId}`,
    });
  }

  if (openEditLinks.length >= 5) {
    incidents.push({
      id: "collab-open-edit-links",
      title: "Many editor share links",
      detail: `${openEditLinks.length} projects have edit links enabled.`,
      status: "watch",
      metric: `${openEditLinks.length} links`,
    });
  }

  return createGroup({
    id: "collaboration",
    title: "Collaboration conflicts",
    description: "Overdue review tasks, stale tasks, and open edit access.",
    incidents,
    fallbackMetric: `${reviewTasks.length} review tasks`,
  });
}

function createGroup(input: {
  id: ProductionObservabilityGroup["id"];
  title: string;
  description: string;
  incidents: ProductionObservabilityIncident[];
  fallbackMetric: string;
}): ProductionObservabilityGroup {
  const critical = input.incidents.filter(
    (incident) => incident.status === "critical",
  ).length;
  const watch = input.incidents.filter((incident) => incident.status === "watch")
    .length;
  const score = Math.max(0, 100 - critical * 35 - watch * 12);

  return {
    id: input.id,
    title: input.title,
    description: input.description,
    status: getStatusFromScore(score, critical),
    score,
    incidents: input.incidents.length
      ? input.incidents
      : [
          {
            id: `${input.id}-healthy`,
            title: "No active incidents",
            detail: "Recent production signals are inside the current guardrails.",
            status: "healthy",
            metric: input.fallbackMetric,
          },
        ],
  };
}

function getStatusFromScore(
  score: number,
  criticalCount: number,
): ProductionObservabilityStatus {
  if (criticalCount > 0 || score < 55) return "critical";
  if (score < 85) return "watch";

  return "healthy";
}

function ageMs(value: string, now: Date) {
  const time = new Date(value).getTime();

  if (Number.isNaN(time)) return 0;

  return Math.max(0, now.getTime() - time);
}

function durationMs(start: string, end: string) {
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();

  if (Number.isNaN(startTime) || Number.isNaN(endTime)) return 0;

  return Math.max(0, endTime - startTime);
}

function formatDuration(ms: number) {
  const minutes = Math.max(1, Math.round(ms / 60_000));

  if (minutes < 60) return `${minutes}m`;

  const hours = Math.round(minutes / 60);

  if (hours < 48) return `${hours}h`;

  return `${Math.round(hours / 24)}d`;
}

function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;

  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}
