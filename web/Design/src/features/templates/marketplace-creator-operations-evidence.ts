import type { ReviewTaskSummary } from "@/db/project-comments";
import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type {
  DesignTemplateSummary,
  ProjectSummary,
  ProjectVersionSummary,
} from "@/features/editor/types";
import type { ProjectAuditSummary } from "@/features/projects/project-audit-center";
import type { TemplatePackageDependency } from "@/features/templates/template-package-registry";
import type {
  MarketplaceCreatorLicenseEvidence,
  MarketplaceCreatorOperationStatus,
  MarketplaceCreatorRollbackPlan,
  MarketplaceCreatorTrustScore,
  MarketplaceCreatorVersionEvent,
  MarketplaceCreatorSubmissionBuildInput,
} from "@/features/templates/marketplace-creator-operations-types";
import {
  average,
  clampScore,
  conversionRate,
  scoreToStatus,
  statusScore,
  uniqueEvents,
} from "@/features/templates/marketplace-creator-operations-utils";

export function createTrustScore(input: {
  template: DesignTemplateSummary;
  relatedAudits: ProjectAuditSummary[];
  openTasks: ReviewTaskSummary[];
}): MarketplaceCreatorTrustScore {
  const signals: string[] = [];
  let score = 45;

  if (input.template.creatorName || input.template.creatorEmail) {
    score += 12;
    signals.push("Creator identity is attached to the submission.");
  } else {
    score -= 18;
    signals.push("Creator identity is missing.");
  }

  if (input.template.approvalStatus === "approved") {
    score += 20;
    signals.push("Approval status is approved.");
  } else if (input.template.approvalStatus === "in-review") {
    score += 6;
    signals.push("Approval is still in review.");
  } else if (input.template.approvalStatus === "changes-requested") {
    score -= 32;
    signals.push("Approval has requested changes.");
  }

  if (input.template.marketplaceStatus === "published") {
    score += 16;
    signals.push("Marketplace listing is published.");
  } else if (input.template.marketplaceStatus === "review") {
    score += 4;
    signals.push("Marketplace listing is under review.");
  } else {
    score -= 8;
    signals.push("Marketplace listing is not submitted for release.");
  }

  const auditAverage = average(
    input.relatedAudits.map((audit) => audit.overallScore),
    input.relatedAudits.length ? 0 : 72,
  );
  if (auditAverage >= 88) {
    score += 12;
    signals.push("Related project audits are clean.");
  } else if (auditAverage < 70) {
    score -= 18;
    signals.push("Related project audits need fixes.");
  }

  if (input.openTasks.length) {
    score -= Math.min(24, input.openTasks.length * 12);
    signals.push(`${input.openTasks.length} open review task(s) affect trust.`);
  }

  if (conversionRate(input.template) >= 20) {
    score += 8;
    signals.push("Install conversion is healthy.");
  } else if (
    input.template.marketplaceViewCount >= 20 &&
    input.template.marketplaceUseCount === 0
  ) {
    score -= 10;
    signals.push("High views without installs reduce trust confidence.");
  }

  const normalizedScore = clampScore(score);

  return {
    status: scoreToStatus(
      normalizedScore,
      input.template.approvalStatus === "changes-requested",
    ),
    score: normalizedScore,
    summary:
      normalizedScore >= 85
        ? "Creator and submission trust are ready for marketplace operations."
        : normalizedScore >= 50
          ? "Creator trust needs curator review before wider distribution."
          : "Creator trust is blocked by identity, approval, or QA issues.",
    signals,
  };
}

export function createLicenseEvidence(input: {
  template: DesignTemplateSummary;
  auditLogs: WorkspaceAuditLogSummary[];
}): MarketplaceCreatorLicenseEvidence {
  const evidence: string[] = [];
  const gaps: string[] = [];
  const reviewNote = input.template.marketplaceReviewNote.trim();
  const evidenceLogs = input.auditLogs.filter((log) =>
    licenseEvidencePattern.test(log.summary),
  );

  if (licenseEvidencePattern.test(reviewNote)) {
    evidence.push("Curator note includes asset source or license evidence.");
  } else if (reviewNote) {
    gaps.push("Expand the curator note with source, license, or rights proof.");
  } else {
    gaps.push("Add a creator licensing note before marketplace release.");
  }

  if (evidenceLogs.length) {
    evidence.push(
      `${evidenceLogs.length} audit log license evidence record(s).`,
    );
  }

  if (input.template.creatorName || input.template.creatorEmail) {
    evidence.push("Creator identity can be attached to licensing records.");
  } else {
    gaps.push("Attach a named creator or accountable creator email.");
  }

  if (input.template.marketplaceStatus === "published") {
    evidence.push("Published listing has passed marketplace curation.");
  } else if (input.template.marketplaceStatus === "review") {
    gaps.push("Complete marketplace review before license evidence is final.");
  }

  if (input.template.approvalStatus === "changes-requested") {
    gaps.push("Resolve requested approval changes before release.");
  }

  const score = clampScore(evidence.length * 28 - gaps.length * 18 + 42);

  return {
    status: scoreToStatus(score, gaps.length >= 3 || evidence.length === 0),
    score,
    summary: evidence.length
      ? `${evidence.length} evidence item(s), ${gaps.length} open gap(s).`
      : "No usable licensing evidence is attached yet.",
    evidence,
    gaps,
  };
}

export function createRollbackPlan(input: {
  template: DesignTemplateSummary;
  packageEntry: MarketplaceCreatorSubmissionBuildInput["packageEntry"];
  projectVersions: ProjectVersionSummary[];
  relatedProjects: ProjectSummary[];
}): MarketplaceCreatorRollbackPlan {
  const relatedProjectIds = new Set(
    input.relatedProjects.map((project) => project.id),
  );
  const dependencies = (input.packageEntry?.dependencies ?? []).filter(
    (dependency) =>
      relatedProjectIds.has(dependency.projectId) ||
      dependency.relation !== "dimensions",
  );
  const restoreVersions = input.projectVersions.filter((version) =>
    relatedProjectIds.has(version.projectId),
  );
  const latestRestoreAt =
    restoreVersions
      .map((version) => version.createdAt)
      .sort((left, right) => Date.parse(right) - Date.parse(left))[0] ?? null;
  const readyDependencies = dependencies.filter(
    (dependency) => dependency.status === "ready",
  ).length;
  const dependencyScore = dependencies.length
    ? Math.round((readyDependencies / dependencies.length) * 100)
    : input.template.marketplaceUseCount > 0
      ? 45
      : 65;
  const status = createRollbackStatus({
    dependencies,
    restorePointCount: restoreVersions.length,
  });
  const score = average([statusScore(status), dependencyScore]);

  return {
    status,
    score,
    summary: createRollbackSummary({
      dependencies,
      restorePointCount: restoreVersions.length,
      installCount: input.template.marketplaceUseCount,
      status,
    }),
    dependencies,
    restorePointCount: restoreVersions.length,
    latestRestoreAt,
    installCount: input.template.marketplaceUseCount,
  };
}

export function createVersionTimeline(input: {
  template: DesignTemplateSummary;
  packageEntry: MarketplaceCreatorSubmissionBuildInput["packageEntry"];
  auditLogs: WorkspaceAuditLogSummary[];
}): MarketplaceCreatorVersionEvent[] {
  const packageEvents = input.packageEntry?.changelog ?? [];
  const auditEvents = input.auditLogs.map((log) => ({
    id: `audit-${log.id}`,
    title: "Marketplace audit",
    detail: log.summary,
    actorEmail: log.actorEmail,
    createdAt: log.createdAt,
  }));
  const fallbackEvents: MarketplaceCreatorVersionEvent[] = [
    {
      id: "created",
      title: "Submission created",
      detail: `${input.template.width} x ${input.template.height} template created.`,
      actorEmail: input.template.creatorEmail,
      createdAt: input.template.createdAt,
    },
  ];

  if (input.template.marketplaceReviewNote.trim()) {
    fallbackEvents.push({
      id: "review-note",
      title: "Curator note",
      detail: input.template.marketplaceReviewNote.trim(),
      actorEmail: input.template.creatorEmail,
      createdAt: input.template.updatedAt,
    });
  }

  return uniqueEvents([...packageEvents, ...fallbackEvents, ...auditEvents])
    .sort(
      (left, right) =>
        Date.parse(right.createdAt) - Date.parse(left.createdAt) ||
        left.title.localeCompare(right.title),
    )
    .slice(0, 10);
}

function createRollbackStatus(input: {
  dependencies: TemplatePackageDependency[];
  restorePointCount: number;
}): MarketplaceCreatorOperationStatus {
  if (!input.dependencies.length) return "review";

  if (
    input.dependencies.every((dependency) => dependency.status === "ready") &&
    input.restorePointCount >= input.dependencies.length
  ) {
    return "ready";
  }

  if (
    input.dependencies.some((dependency) => dependency.status === "ready") ||
    input.restorePointCount > 0
  ) {
    return "review";
  }

  return "blocked";
}

function createRollbackSummary(input: {
  dependencies: TemplatePackageDependency[];
  restorePointCount: number;
  installCount: number;
  status: MarketplaceCreatorOperationStatus;
}) {
  if (!input.dependencies.length && input.installCount > 0) {
    return "Template has install history, but no source-linked project rollback dependency is mapped yet.";
  }

  if (!input.dependencies.length) {
    return "No active project depends on this marketplace submission yet.";
  }

  if (input.status === "ready") {
    return "Every source-linked dependent project has a restorable snapshot.";
  }

  if (input.restorePointCount > 0) {
    return "Some source-linked projects still need restore snapshots before rollback is safe.";
  }

  return "Create restore snapshots for source-linked projects before release.";
}

const licenseEvidencePattern =
  /license|licensed|rights|source|sources|provenance|attribution|original|cc0/i;
