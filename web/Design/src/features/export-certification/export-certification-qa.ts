import type { WebsitePublishSummary } from "@/db/website-publishing";
import type { ServerExportJobSummary } from "@/features/editor/server-export-job-model";
import type { ProjectSummary } from "@/features/editor/types";
import type { ProjectAuditSummary } from "@/features/projects/project-audit-center";
import type {
  ExportCertificationArtifactDefinition,
  ExportCertificationQaMatrix,
} from "@/features/export-certification/export-certification-types";
import {
  createCertificationCheck,
  createQaMatrix,
  formatCertificationDate,
} from "@/features/export-certification/export-certification-utils";

export function createCertificationQaMatrix(input: {
  definition: ExportCertificationArtifactDefinition;
  projects: ProjectSummary[];
  audits: ProjectAuditSummary[];
  exportJobs: ServerExportJobSummary[];
  websitePublishes: WebsitePublishSummary[];
}): ExportCertificationQaMatrix {
  const checks = [
    createArtifactCoverageCheck(input),
    createArtifactFreshnessCheck(input),
    createFailureQueueCheck(input.exportJobs),
    createStoredEvidenceCheck(input),
    createAuditDimensionCheck(input),
  ];

  if (input.definition.artifact === "website") {
    checks.push(createWebsitePublishCheck(input.websitePublishes));
  }

  return createQaMatrix(checks);
}

function createArtifactCoverageCheck(input: {
  definition: ExportCertificationArtifactDefinition;
  exportJobs: ServerExportJobSummary[];
  websitePublishes: WebsitePublishSummary[];
}) {
  if (input.definition.artifact === "website") {
    const published = input.websitePublishes.filter(
      (publish) => publish.status === "published",
    );

    return createCertificationCheck({
      id: "artifact-coverage",
      label: "Artifact coverage",
      status: published.length ? "ready" : "blocked",
      score: published.length ? 100 : 20,
      detail: published.length
        ? `${published.length} published website artifact${published.length === 1 ? "" : "s"} linked.`
        : "No published website artifact is linked.",
      source: "website-publish",
    });
  }

  const completed = input.exportJobs.filter(
    (job) => job.status === "completed",
  );

  return createCertificationCheck({
    id: "artifact-coverage",
    label: "Artifact coverage",
    status: completed.length ? "ready" : "blocked",
    score: completed.length ? 100 : 20,
    detail: completed.length
      ? `${completed.length} completed export artifact${completed.length === 1 ? "" : "s"} linked.`
      : `No completed ${input.definition.label.toLowerCase()} export artifact is linked.`,
    source: "export-job",
  });
}

function createArtifactFreshnessCheck(input: {
  projects: ProjectSummary[];
  exportJobs: ServerExportJobSummary[];
  websitePublishes: WebsitePublishSummary[];
  definition: ExportCertificationArtifactDefinition;
}) {
  if (input.projects.length === 0) {
    return createCertificationCheck({
      id: "artifact-freshness",
      label: "Artifact freshness",
      status: "blocked",
      score: 20,
      detail: "No project timestamp is available for freshness comparison.",
      source:
        input.definition.artifact === "website"
          ? "website-publish"
          : "export-job",
    });
  }

  const projectUpdatedAt = Math.max(
    ...input.projects.map((project) => Date.parse(project.updatedAt)),
  );
  const artifactCompletedAt =
    input.definition.artifact === "website"
      ? Math.max(
          0,
          ...input.websitePublishes.map((publish) =>
            Date.parse(publish.publishedAt ?? publish.updatedAt),
          ),
        )
      : Math.max(
          0,
          ...input.exportJobs
            .filter((job) => job.status === "completed")
            .map((job) => Date.parse(job.completedAt ?? job.updatedAt)),
        );
  const fresh = artifactCompletedAt >= projectUpdatedAt;

  return createCertificationCheck({
    id: "artifact-freshness",
    label: "Artifact freshness",
    status: fresh ? "ready" : artifactCompletedAt ? "review" : "blocked",
    score: fresh ? 100 : artifactCompletedAt ? 64 : 20,
    detail: fresh
      ? `Latest artifact is fresh as of ${formatCertificationDate(new Date(artifactCompletedAt).toISOString())}.`
      : artifactCompletedAt
        ? "Latest artifact is older than project updates."
        : "No completed artifact timestamp is available.",
    source:
      input.definition.artifact === "website"
        ? "website-publish"
        : "export-job",
  });
}

function createFailureQueueCheck(exportJobs: ServerExportJobSummary[]) {
  const failed = exportJobs.filter((job) => job.status === "failed");
  const running = exportJobs.filter(
    (job) => job.status === "queued" || job.status === "running",
  );

  return createCertificationCheck({
    id: "export-failures",
    label: "Failure queue",
    status: failed.length ? "blocked" : running.length ? "review" : "ready",
    score: failed.length ? 20 : running.length ? 70 : 100,
    detail: failed.length
      ? `${failed.length} failed export job${failed.length === 1 ? "" : "s"} need repair.`
      : running.length
        ? `${running.length} export job${running.length === 1 ? "" : "s"} still running.`
        : "No export failures are blocking certification.",
    source: "export-job",
  });
}

function createStoredEvidenceCheck(input: {
  definition: ExportCertificationArtifactDefinition;
  exportJobs: ServerExportJobSummary[];
  websitePublishes: WebsitePublishSummary[];
}) {
  if (input.definition.artifact === "website") {
    const published = input.websitePublishes.filter(
      (publish) => publish.status === "published",
    );
    const analytics = published.reduce(
      (total, publish) => total + publish.viewCount + publish.clickCount,
      0,
    );

    return createCertificationCheck({
      id: "stored-evidence",
      label: "Evidence capture",
      status: published.length ? "ready" : "blocked",
      score: published.length ? (analytics ? 100 : 88) : 20,
      detail: published.length
        ? `${published.length} published website record${published.length === 1 ? "" : "s"} with ${analytics} analytics signals.`
        : "No website publish record is available.",
      source: "website-publish",
    });
  }

  const completed = input.exportJobs.filter(
    (job) => job.status === "completed",
  );
  const stored = completed.filter((job) => job.artifactDataUrl);

  return createCertificationCheck({
    id: "stored-evidence",
    label: "Evidence capture",
    status: stored.length ? "ready" : completed.length ? "review" : "blocked",
    score: stored.length ? 100 : completed.length ? 66 : 20,
    detail: stored.length
      ? `${stored.length}/${completed.length} completed artifacts include downloadable evidence.`
      : completed.length
        ? "Completed artifacts need external evidence links because stored data is missing."
        : "No completed artifact evidence is available.",
    source: "export-job",
  });
}

function createAuditDimensionCheck(input: {
  definition: ExportCertificationArtifactDefinition;
  audits: ProjectAuditSummary[];
}) {
  const dimensions = input.audits.flatMap((audit) =>
    audit.dimensions.filter((dimension) =>
      input.definition.relatedAuditDimensions.includes(dimension.id),
    ),
  );
  const score = dimensions.length
    ? Math.round(
        dimensions.reduce((total, dimension) => total + dimension.score, 0) /
          dimensions.length,
      )
    : 0;
  const blocked = dimensions.some((dimension) => dimension.status === "fix");

  return createCertificationCheck({
    id: "qa-matrix",
    label: "QA matrix",
    status: dimensions.length
      ? blocked
        ? "blocked"
        : score >= 86
          ? "ready"
          : "review"
      : "blocked",
    score: dimensions.length ? score : 20,
    detail: dimensions.length
      ? `${dimensions.length} artifact-specific audit check${dimensions.length === 1 ? "" : "s"} average ${score}/100.`
      : "No artifact-specific project audit dimensions are available.",
    source: "project-audit",
  });
}

function createWebsitePublishCheck(publishes: WebsitePublishSummary[]) {
  const published = publishes.filter(
    (publish) => publish.status === "published",
  );
  const domainReady = published.filter((publish) =>
    publish.customDomains.some(
      (domain) =>
        domain.status === "verified" && domain.platformStatus === "attached",
    ),
  );

  return createCertificationCheck({
    id: "website-publish",
    label: "Website publish",
    status: published.length ? "ready" : "blocked",
    score: published.length ? (domainReady.length ? 100 : 88) : 20,
    detail: published.length
      ? `${published.length} site${published.length === 1 ? "" : "s"} published; ${domainReady.length} custom domains attached.`
      : "Website is not published.",
    source: "website-publish",
  });
}
