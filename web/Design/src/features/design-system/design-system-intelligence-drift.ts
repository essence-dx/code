import type {
  DesignTemplateSummary,
  ProjectSummary,
} from "@/features/editor/types";
import type { ProjectAuditSummary } from "@/features/projects/project-audit-center";
import type {
  DesignSystemTokenDriftReport,
  DesignSystemTokenKind,
  DesignSystemTokenProfile,
  DesignSystemUsageMap,
} from "@/features/design-system/design-system-intelligence-types";
import {
  designSystemCoverageScore,
  getProjectBrandDimension,
  matchesDesignSystemUsageRelation,
  scoreDesignSystemStatus,
  usageRelationLabels,
} from "@/features/design-system/design-system-intelligence-utils";

export function createDesignSystemTokenDriftReports(input: {
  tokenProfile: DesignSystemTokenProfile;
  projectAudits: ProjectAuditSummary[];
}) {
  const brandIssues = input.projectAudits.filter((audit) => {
    const brand = getProjectBrandDimension(audit);
    return brand && brand.status !== "ready";
  });
  const reports = [
    createTokenReport({
      id: "color-token-drift",
      kind: "color",
      label: "Color tokens",
      driftCount: Math.max(0, 3 - input.tokenProfile.colorCount),
      blocked: input.tokenProfile.colorCount === 0,
      detail: `${input.tokenProfile.colorCount} brand color tokens are available.`,
      affectedProjectIds: brandIssues.map((audit) => audit.projectId),
      recommendedFix:
        "Promote primary, accent, and surface colors before reusable component rollout.",
    }),
    createTokenReport({
      id: "font-token-drift",
      kind: "font",
      label: "Font tokens",
      driftCount: input.tokenProfile.missingFontRoles.length,
      blocked: input.tokenProfile.fontCount === 0,
      detail: input.tokenProfile.missingFontRoles.length
        ? `Missing ${input.tokenProfile.missingFontRoles.join(", ")} font roles.`
        : "Heading and body font roles are available.",
      affectedProjectIds: brandIssues.map((audit) => audit.projectId),
      recommendedFix:
        "Define heading and body font roles so text components share stable typography.",
    }),
    createTokenReport({
      id: "logo-token-drift",
      kind: "logo",
      label: "Logo tokens",
      driftCount: input.tokenProfile.logoCount ? 0 : 1,
      blocked: input.tokenProfile.logoCount === 0,
      detail: input.tokenProfile.logoCount
        ? `${input.tokenProfile.logoCount} logo assets are available.`
        : "No logo asset is available for component identity checks.",
      affectedProjectIds: brandIssues.map((audit) => audit.projectId),
      recommendedFix:
        "Add at least one workspace logo before packaging brand components.",
    }),
    {
      id: "project-brand-drift",
      kind: "project-brand",
      label: "Project brand usage",
      status: brandIssues.some((audit) => audit.status === "fix")
        ? "blocked"
        : brandIssues.length
          ? "review"
          : "ready",
      driftCount: brandIssues.length,
      detail: brandIssues.length
        ? `${brandIssues.length} project brand audit${brandIssues.length === 1 ? "" : "s"} need token alignment.`
        : "Project brand audits are aligned with current tokens.",
      affectedProjectIds: brandIssues.map((audit) => audit.projectId),
      recommendedFix:
        "Run brand guardrails before converting repeated layouts into shared components.",
    } satisfies DesignSystemTokenDriftReport,
  ];

  return reports.filter((report) => report.driftCount > 0);
}

export function createDesignSystemUsageMaps(input: {
  templates: DesignTemplateSummary[];
  projects: ProjectSummary[];
  projectAudits: ProjectAuditSummary[];
}) {
  const maps = ["source", "name", "dimensions", "audit"].map((relation) =>
    createUsageMap({
      relation: relation as DesignSystemUsageMap["relation"],
      templates: input.templates,
      projects: input.projects,
      projectAudits: input.projectAudits,
    }),
  );

  return maps
    .filter((map) => map.projectIds.length || map.templateIds.length)
    .sort((left, right) => right.coverageScore - left.coverageScore)
    .slice(0, 6);
}

function createUsageMap(input: {
  relation: DesignSystemUsageMap["relation"];
  templates: DesignTemplateSummary[];
  projects: ProjectSummary[];
  projectAudits: ProjectAuditSummary[];
}): DesignSystemUsageMap {
  const matches = input.projects.filter((project) =>
    input.templates.some((template) =>
      matchesDesignSystemUsageRelation({
        relation: input.relation,
        template,
        project,
        projectAudits: input.projectAudits,
      }),
    ),
  );
  const templateIds = input.templates
    .filter((template) =>
      matches.some((project) =>
        matchesDesignSystemUsageRelation({
          relation: input.relation,
          template,
          project,
          projectAudits: input.projectAudits,
        }),
      ),
    )
    .map((template) => template.id);
  const coverageScore = designSystemCoverageScore(
    matches.length,
    input.projects.length,
  );

  return {
    id: `usage-${input.relation}`,
    title: `${usageRelationLabels[input.relation]} usage`,
    relation: input.relation,
    status: scoreDesignSystemStatus(coverageScore, false),
    coverageScore,
    templateIds,
    projectIds: matches.map((project) => project.id),
    detail: `${matches.length} active project${matches.length === 1 ? "" : "s"} map to ${templateIds.length} reusable component definition${templateIds.length === 1 ? "" : "s"}.`,
  };
}

function createTokenReport(input: {
  id: string;
  kind: Exclude<DesignSystemTokenKind, "project-brand">;
  label: string;
  driftCount: number;
  blocked: boolean;
  detail: string;
  affectedProjectIds: string[];
  recommendedFix: string;
}): DesignSystemTokenDriftReport {
  return {
    id: input.id,
    kind: input.kind,
    label: input.label,
    status: input.blocked ? "blocked" : input.driftCount ? "review" : "ready",
    driftCount: input.driftCount,
    detail: input.detail,
    affectedProjectIds: input.affectedProjectIds,
    recommendedFix: input.recommendedFix,
  };
}
