import type {
  WebsiteFormSubmissionSummary,
  WebsitePublishSummary,
} from "@/db/website-publishing";
import type {
  EmailClientQaCheck,
  EmailQaClient,
  RenderingQaAccessibilityEvidence,
  RenderingQaFormDiagnostic,
  RenderingQaLinkValidation,
  RenderingQaStatus,
  WebsiteEmailRenderingQaCenter,
  WebsiteQaViewport,
  WebsiteViewportQaCheck,
} from "@/features/distribution/website-email-rendering-qa-types";
import type { ServerExportJobSummary } from "@/features/editor/server-export-job-model";
import type { ProjectSummary } from "@/features/editor/types";
import type {
  ProjectAuditDimensionId,
  ProjectAuditSummary,
} from "@/features/projects/project-audit-center";

export type {
  EmailClientQaCheck,
  EmailQaClient,
  RenderingQaAccessibilityEvidence,
  RenderingQaFormDiagnostic,
  RenderingQaLinkValidation,
  RenderingQaStatus,
  WebsiteEmailRenderingQaCenter,
  WebsiteQaViewport,
  WebsiteViewportQaCheck,
} from "@/features/distribution/website-email-rendering-qa-types";

export function createWebsiteEmailRenderingQaCenter(input: {
  appUrl: string;
  projects: ProjectSummary[];
  projectAudits: ProjectAuditSummary[];
  websitePublishes: WebsitePublishSummary[];
  websiteFormSubmissions: WebsiteFormSubmissionSummary[];
  serverExportJobs: ServerExportJobSummary[];
  now?: string | Date;
}): WebsiteEmailRenderingQaCenter {
  const generatedAt = normalizeDate(input.now).toISOString();
  const auditByProjectId = new Map(
    input.projectAudits.map((audit) => [audit.projectId, audit]),
  );
  const emailProjects = selectEmailProjects({
    projects: input.projects,
    projectAudits: input.projectAudits,
    serverExportJobs: input.serverExportJobs,
  });
  const websiteViewportMatrix = createWebsiteViewportMatrix({
    appUrl: input.appUrl,
    websitePublishes: input.websitePublishes,
    auditByProjectId,
  });
  const emailClientMatrix = createEmailClientMatrix({
    projects: emailProjects,
    projectAudits: input.projectAudits,
    serverExportJobs: input.serverExportJobs,
  });
  const linkValidation = createLinkValidation({
    appUrl: input.appUrl,
    websitePublishes: input.websitePublishes,
    serverExportJobs: input.serverExportJobs,
  });
  const formRoutingDiagnostics = createFormDiagnostics({
    websitePublishes: input.websitePublishes,
    websiteFormSubmissions: input.websiteFormSubmissions,
  });
  const accessibilityEvidence = createAccessibilityEvidence({
    projectAudits: input.projectAudits,
    websiteProjectIds: new Set(
      input.websitePublishes.map((publish) => publish.projectId),
    ),
    emailProjectIds: new Set(emailProjects.map((project) => project.id)),
  });
  const allStatuses = [
    ...websiteViewportMatrix,
    ...emailClientMatrix,
    ...linkValidation,
    ...formRoutingDiagnostics,
    ...accessibilityEvidence,
  ].map((item) => item.status);
  const score = scoreStatuses(allStatuses);
  const status = aggregateStatus(allStatuses);
  const totals = {
    websiteViewportChecks: websiteViewportMatrix.length,
    emailClientChecks: emailClientMatrix.length,
    linkChecks: linkValidation.length,
    formDiagnostics: formRoutingDiagnostics.length,
    accessibilityEvidence: accessibilityEvidence.length,
    readyChecks: allStatuses.filter((item) => item === "ready").length,
    reviewChecks: allStatuses.filter((item) => item === "review").length,
    blockedChecks: allStatuses.filter((item) => item === "blocked").length,
  };
  const nextActions = createNextActions({
    status,
    websiteViewportMatrix,
    emailClientMatrix,
    linkValidation,
    formRoutingDiagnostics,
    accessibilityEvidence,
  });

  return {
    generatedAt,
    status,
    score,
    websiteViewportMatrix,
    emailClientMatrix,
    linkValidation,
    formRoutingDiagnostics,
    accessibilityEvidence,
    releaseReport: createReleaseReport({
      generatedAt,
      status,
      score,
      totals,
      websiteViewportMatrix,
      emailClientMatrix,
      linkValidation,
      formRoutingDiagnostics,
      accessibilityEvidence,
      nextActions,
    }),
    nextActions,
    totals,
  };
}

function createWebsiteViewportMatrix(input: {
  appUrl: string;
  websitePublishes: WebsitePublishSummary[];
  auditByProjectId: Map<string, ProjectAuditSummary>;
}): WebsiteViewportQaCheck[] {
  return input.websitePublishes.flatMap((publish) => {
    const audit = input.auditByProjectId.get(publish.projectId);
    const websiteScore = getDimensionScore(audit, "website");
    const accessibilityScore = getDimensionScore(audit, "accessibility");
    const url = createWebsiteUrl(input.appUrl, publish.slug);

    return websiteViewports.map((viewport) => {
      const warnings = [
        publish.status !== "published"
          ? "Website is not currently published."
          : null,
        websiteScore < 85
          ? `Website audit score is ${websiteScore}/100.`
          : null,
        accessibilityScore < 85
          ? `Accessibility score is ${accessibilityScore}/100.`
          : null,
        publish.customDomains.length &&
        !publish.customDomains.some(
          (domain) =>
            domain.status === "verified" && domain.platformStatus === "attached",
        )
          ? "Custom domain still needs verification or platform attachment."
          : null,
      ].filter((warning): warning is string => Boolean(warning));
      const status = checkStatus({
        blocked: publish.status !== "published",
        review: warnings.length > 0,
      });

      return {
        id: `${publish.id}-${viewport.id}`,
        publishId: publish.id,
        projectId: publish.projectId,
        title: publish.title,
        viewport: viewport.id,
        width: viewport.width,
        status,
        url,
        checks: [
          `${viewport.label} viewport width: ${viewport.width}px`,
          `Website audit: ${websiteScore}/100`,
          `Accessibility: ${accessibilityScore}/100`,
        ],
        warnings,
      };
    });
  });
}

function createEmailClientMatrix(input: {
  projects: ProjectSummary[];
  projectAudits: ProjectAuditSummary[];
  serverExportJobs: ServerExportJobSummary[];
}): EmailClientQaCheck[] {
  const auditByProjectId = new Map(
    input.projectAudits.map((audit) => [audit.projectId, audit]),
  );

  return input.projects.flatMap((project) => {
    const audit = auditByProjectId.get(project.id);
    const score = getDimensionScore(audit, "email");
    const exportJob = findCompletedHtmlExport(input.serverExportJobs, project.id);

    return emailClients.map((client) => {
      const warnings = [
        score < 85 ? `Email QA score is ${score}/100.` : null,
        exportJob ? null : "No completed HTML export is available.",
        client === "Gmail" && exportJob?.artifactSizeBytes && exportJob.artifactSizeBytes > 95_000
          ? "Gmail clipping risk: exported HTML is near 102 KB."
          : null,
        client === "Outlook" && score < 90
          ? "Outlook should receive a focused image/link review before send."
          : null,
      ].filter((warning): warning is string => Boolean(warning));
      const status = checkStatus({
        blocked: score < 60,
        review: warnings.length > 0,
      });

      return {
        id: `${project.id}-${client.toLowerCase().replace(/\s+/g, "-")}`,
        projectId: project.id,
        projectName: project.name,
        client,
        status,
        score,
        exportJobId: exportJob?.id ?? null,
        checks: [
          `${client} client rendering score: ${score}/100`,
          exportJob
            ? `Completed HTML export: ${exportJob.fileName}`
            : "HTML export missing",
        ],
        warnings,
      };
    });
  });
}

function createLinkValidation(input: {
  appUrl: string;
  websitePublishes: WebsitePublishSummary[];
  serverExportJobs: ServerExportJobSummary[];
}): RenderingQaLinkValidation[] {
  const websiteLinks = input.websitePublishes.flatMap((publish) => {
    const slugStatus = checkStatus({
      blocked: publish.status !== "published",
      review: !isReadableSlug(publish.slug),
    });
    const slugCheck: RenderingQaLinkValidation = {
      id: `website-slug-${publish.id}`,
      kind: "website-slug",
      label: `${publish.title} slug`,
      url: createWebsiteUrl(input.appUrl, publish.slug),
      status: slugStatus,
      detail:
        slugStatus === "ready"
          ? "Published slug is readable and release-ready."
          : "Publish status or slug format needs review.",
    };
    const domainChecks = publish.customDomains.map(
      (domain): RenderingQaLinkValidation => {
        const status = checkStatus({
          blocked: domain.platformStatus === "error",
          review:
            domain.status !== "verified" ||
            domain.platformStatus !== "attached",
        });

        return {
          id: `custom-domain-${domain.id}`,
          kind: "custom-domain",
          label: domain.domain,
          url: `https://${domain.domain}`,
          status,
          detail:
            status === "ready"
              ? "Domain is verified and attached."
              : (domain.platformError ?? "Domain verification or attachment is pending."),
        };
      },
    );

    return [slugCheck, ...domainChecks];
  });
  const emailLinks = input.serverExportJobs
    .filter((job) => job.format === "html")
    .map(
      (job): RenderingQaLinkValidation => ({
        id: `email-export-${job.id}`,
        kind: "email-export",
        label: `${job.projectName} HTML export`,
        url: job.artifactDataUrl ? `download:${job.fileName}` : "",
        status: checkStatus({
          blocked: job.status === "failed",
          review: job.status !== "completed" || !job.artifactDataUrl,
        }),
        detail:
          job.status === "completed"
            ? "HTML export artifact is available for email link review."
            : job.failureMessage ?? "HTML export is not completed yet.",
      }),
    );

  return [...websiteLinks, ...emailLinks];
}

function createFormDiagnostics(input: {
  websitePublishes: WebsitePublishSummary[];
  websiteFormSubmissions: WebsiteFormSubmissionSummary[];
}): RenderingQaFormDiagnostic[] {
  return input.websitePublishes.map((publish) => {
    const submissions = input.websiteFormSubmissions.filter(
      (submission) => submission.publishId === publish.id,
    );
    const status = checkStatus({
      blocked: publish.status !== "published",
      review: submissions.length === 0,
    });

    return {
      id: `form-routing-${publish.id}`,
      publishId: publish.id,
      projectId: publish.projectId,
      title: publish.title,
      status,
      submissionCount: submissions.length,
      sectionIds: unique(submissions.map((submission) => submission.sectionId)),
      detail: submissions.length
        ? `${submissions.length} form submission${submissions.length === 1 ? "" : "s"} captured.`
        : "No form submissions have been captured for this published site.",
    };
  });
}

function createAccessibilityEvidence(input: {
  projectAudits: ProjectAuditSummary[];
  websiteProjectIds: Set<string>;
  emailProjectIds: Set<string>;
}): RenderingQaAccessibilityEvidence[] {
  return input.projectAudits.flatMap((audit) => {
    const score = getDimensionScore(audit, "accessibility");
    const detail = getDimensionDetail(audit, "accessibility");
    const surfaces: Array<"website" | "email"> = [];

    if (input.websiteProjectIds.has(audit.projectId)) surfaces.push("website");
    if (input.emailProjectIds.has(audit.projectId)) surfaces.push("email");

    return surfaces.map((surface) => ({
      id: `${surface}-accessibility-${audit.projectId}`,
      projectId: audit.projectId,
      projectName: audit.projectName,
      surface,
      status: checkStatus({ blocked: score < 60, review: score < 85 }),
      score,
      detail,
    }));
  });
}

function selectEmailProjects(input: {
  projects: ProjectSummary[];
  projectAudits: ProjectAuditSummary[];
  serverExportJobs: ServerExportJobSummary[];
}) {
  const exportedProjectIds = new Set(
    input.serverExportJobs
      .filter((job) => job.format === "html")
      .map((job) => job.projectId),
  );
  const auditedEmailProjectIds = new Set(
    input.projectAudits
      .filter((audit) => getDimensionScore(audit, "email") >= 85)
      .map((audit) => audit.projectId),
  );

  return input.projects.filter(
    (project) =>
      exportedProjectIds.has(project.id) ||
      auditedEmailProjectIds.has(project.id) ||
      project.width === 1200,
  );
}

function findCompletedHtmlExport(
  jobs: ServerExportJobSummary[],
  projectId: string,
) {
  return jobs
    .filter(
      (job) =>
        job.projectId === projectId &&
        job.format === "html" &&
        job.status === "completed",
    )
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
}

function createNextActions(input: {
  status: RenderingQaStatus;
  websiteViewportMatrix: WebsiteViewportQaCheck[];
  emailClientMatrix: EmailClientQaCheck[];
  linkValidation: RenderingQaLinkValidation[];
  formRoutingDiagnostics: RenderingQaFormDiagnostic[];
  accessibilityEvidence: RenderingQaAccessibilityEvidence[];
}) {
  if (input.status === "ready") {
    return [
      "Website and email release QA matrices are ready for packet handoff.",
    ];
  }

  return [
    firstAction(input.websiteViewportMatrix, "Fix website viewport QA"),
    firstAction(input.emailClientMatrix, "Fix email client QA"),
    firstAction(input.linkValidation, "Fix link validation"),
    firstAction(input.formRoutingDiagnostics, "Review form routing"),
    firstAction(input.accessibilityEvidence, "Review accessibility evidence"),
  ]
    .filter((action): action is string => Boolean(action))
    .slice(0, 5);
}

function firstAction(
  items: Array<{ status: RenderingQaStatus; warnings?: string[]; title?: string; projectName?: string; label?: string; detail?: string }>,
  prefix: string,
) {
  const item = items.find((entry) => entry.status !== "ready");
  const label = item?.title ?? item?.projectName ?? item?.label;
  const detail = item?.warnings?.[0] ?? item?.detail;

  return item ? `${prefix}${label ? ` for ${label}` : ""}: ${detail}` : null;
}

function createReleaseReport(input: {
  generatedAt: string;
  status: RenderingQaStatus;
  score: number;
  totals: WebsiteEmailRenderingQaCenter["totals"];
  websiteViewportMatrix: WebsiteViewportQaCheck[];
  emailClientMatrix: EmailClientQaCheck[];
  linkValidation: RenderingQaLinkValidation[];
  formRoutingDiagnostics: RenderingQaFormDiagnostic[];
  accessibilityEvidence: RenderingQaAccessibilityEvidence[];
  nextActions: string[];
}) {
  return {
    fileName: "website-email-rendering-qa-report.json",
    dataUrl: `data:application/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(input, null, 2),
    )}`,
  };
}

function getDimensionScore(
  audit: ProjectAuditSummary | undefined,
  dimensionId: ProjectAuditDimensionId,
) {
  return audit?.dimensions.find((dimension) => dimension.id === dimensionId)
    ?.score ?? 0;
}

function getDimensionDetail(
  audit: ProjectAuditSummary,
  dimensionId: ProjectAuditDimensionId,
) {
  return (
    audit.dimensions.find((dimension) => dimension.id === dimensionId)?.detail ??
    "No evidence available."
  );
}

function scoreStatuses(statuses: RenderingQaStatus[]) {
  if (!statuses.length) return 100;

  const total = statuses.reduce((score, status) => {
    if (status === "ready") return score + 100;
    if (status === "review") return score + 72;

    return score + 30;
  }, 0);

  return Math.round(total / statuses.length);
}

function aggregateStatus(statuses: RenderingQaStatus[]): RenderingQaStatus {
  if (statuses.some((status) => status === "blocked")) return "blocked";
  if (statuses.some((status) => status === "review")) return "review";

  return "ready";
}

function checkStatus(input: {
  blocked?: boolean;
  review?: boolean;
}): RenderingQaStatus {
  if (input.blocked) return "blocked";
  if (input.review) return "review";

  return "ready";
}

function createWebsiteUrl(appUrl: string, slug: string) {
  return `${appUrl.replace(/\/$/, "")}/w/${slug}`;
}

function isReadableSlug(value: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

function unique(values: string[]) {
  return [...new Set(values)];
}

function normalizeDate(value: string | Date | undefined) {
  if (!value) return new Date();
  return value instanceof Date ? value : new Date(value);
}

const websiteViewports: Array<{
  id: WebsiteQaViewport;
  label: string;
  width: number;
}> = [
  { id: "mobile", label: "Mobile", width: 390 },
  { id: "tablet", label: "Tablet", width: 768 },
  { id: "desktop", label: "Desktop", width: 1180 },
];

const emailClients: EmailQaClient[] = ["Gmail", "Outlook", "Apple Mail"];
