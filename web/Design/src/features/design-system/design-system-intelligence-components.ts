import type {
  DesignTemplateSummary,
  ProjectSummary,
  ProjectVersionSummary,
} from "@/features/editor/types";
import type {
  DesignSystemComponentDefinition,
  DesignSystemComponentKind,
  DesignSystemTokenProfile,
  DesignSystemUsageMap,
} from "@/features/design-system/design-system-intelligence-types";
import {
  averageDesignSystemScore,
  designSystemCoverageScore,
  designSystemStatusWeight,
  matchesDesignSystemUsageRelation,
  scoreDesignSystemStatus,
  uniqueDesignSystemValues,
} from "@/features/design-system/design-system-intelligence-utils";

export function createDesignSystemComponentDefinitions(input: {
  templates: DesignTemplateSummary[];
  projects: ProjectSummary[];
  projectVersions: ProjectVersionSummary[];
  tokenProfile: DesignSystemTokenProfile;
}) {
  return input.templates
    .filter((template) => template.marketplaceStatus !== "archived")
    .map((template) =>
      createComponentDefinition({
        template,
        projects: input.projects,
        projectVersions: input.projectVersions,
        tokenProfile: input.tokenProfile,
      }),
    )
    .sort(compareComponents)
    .slice(0, 12);
}

function createComponentDefinition(input: {
  template: DesignTemplateSummary;
  projects: ProjectSummary[];
  projectVersions: ProjectVersionSummary[];
  tokenProfile: DesignSystemTokenProfile;
}): DesignSystemComponentDefinition {
  const usage = createTemplateUsage(input.template, input.projects);
  const versionedProjectIds = new Set(
    input.projectVersions.map((version) => version.projectId),
  );
  const rollbackCoverage = usage.projectIds.length
    ? designSystemCoverageScore(
        usage.projectIds.filter((projectId) =>
          versionedProjectIds.has(projectId),
        ).length,
        usage.projectIds.length,
      )
    : 100;
  const approvalScore = scoreApproval(input.template);
  const usageScore = usage.projectIds.length
    ? Math.min(100, 60 + usage.projectIds.length * 10)
    : input.template.marketplaceUseCount
      ? 75
      : 55;
  const tokenScore = input.tokenProfile.complete
    ? 100
    : input.template.isBrandTemplate
      ? 35
      : 60;
  const score = averageDesignSystemScore([
    approvalScore,
    usageScore,
    rollbackCoverage,
    tokenScore,
  ]);
  const status = scoreDesignSystemStatus(
    score,
    input.template.approvalStatus === "changes-requested" ||
      (input.template.isBrandTemplate && !input.tokenProfile.complete),
  );

  return {
    id: `component-${input.template.id}`,
    templateId: input.template.id,
    name: input.template.name,
    kind: createComponentKind(input.template),
    status,
    score,
    href: `/templates/${input.template.id}`,
    tokenCoverage: {
      colors: input.tokenProfile.colorCount,
      fonts: input.tokenProfile.fontCount,
      logos: input.tokenProfile.logoCount,
      complete: input.tokenProfile.complete,
    },
    usage,
    recommendation: createComponentRecommendation({
      status,
      template: input.template,
      usage,
      rollbackCoverage,
      tokenProfile: input.tokenProfile,
    }),
  };
}

function createTemplateUsage(
  template: DesignTemplateSummary,
  projects: ProjectSummary[],
): DesignSystemComponentDefinition["usage"] {
  const matches = projects.filter((project) =>
    ["source", "name", "dimensions"].some((relation) =>
      matchesDesignSystemUsageRelation({
        relation: relation as DesignSystemUsageMap["relation"],
        template,
        project,
        projectAudits: [],
      }),
    ),
  );

  return {
    projectIds: matches.map((project) => project.id),
    projectNames: matches.map((project) => project.name),
    relationKinds: uniqueDesignSystemValues(
      matches.flatMap((project) =>
        ["source", "name", "dimensions"].filter((relation) =>
          matchesDesignSystemUsageRelation({
            relation: relation as DesignSystemUsageMap["relation"],
            template,
            project,
            projectAudits: [],
          }),
        ),
      ),
    ),
  };
}

function createComponentRecommendation(input: {
  status: DesignSystemComponentDefinition["status"];
  template: DesignTemplateSummary;
  usage: DesignSystemComponentDefinition["usage"];
  rollbackCoverage: number;
  tokenProfile: DesignSystemTokenProfile;
}) {
  if (input.template.approvalStatus === "changes-requested") {
    return "Resolve requested changes before promoting this template as a reusable component.";
  }
  if (input.template.isBrandTemplate && !input.tokenProfile.complete) {
    return "Complete brand color, font, and logo tokens before component rollout.";
  }
  if (input.rollbackCoverage < 100) {
    return "Create project snapshots before applying shared component refactors.";
  }
  if (!input.usage.projectIds.length && !input.template.marketplaceUseCount) {
    return "Map this component to at least one active project or starter workflow.";
  }
  if (input.status === "ready")
    return "Component is ready for reusable rollout.";

  return "Review component usage and token coverage before rollout.";
}

function createComponentKind(
  template: DesignTemplateSummary,
): DesignSystemComponentKind {
  if (template.marketplaceStatus === "published") return "marketplace-template";
  if (template.isBrandTemplate) return "brand-template";
  if (template.isTeamTemplate) return "team-template";

  return "private-component";
}

function scoreApproval(template: DesignTemplateSummary) {
  if (
    template.approvalStatus === "approved" ||
    template.marketplaceStatus === "published"
  ) {
    return 100;
  }
  if (
    template.approvalStatus === "in-review" ||
    template.marketplaceStatus === "review"
  ) {
    return 65;
  }

  return template.approvalStatus === "changes-requested" ? 10 : 45;
}

function compareComponents(
  left: DesignSystemComponentDefinition,
  right: DesignSystemComponentDefinition,
) {
  return (
    designSystemStatusWeight(right.status) -
      designSystemStatusWeight(left.status) ||
    left.score - right.score ||
    right.usage.projectIds.length - left.usage.projectIds.length ||
    left.name.localeCompare(right.name)
  );
}
