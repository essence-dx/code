import type {
  BrandColorSummary,
  BrandFontSummary,
  BrandLogoSummary,
  DesignTemplateSummary,
  ProjectSummary,
} from "@/features/editor/types";
import type { ProjectAuditSummary } from "@/features/projects/project-audit-center";

export type MultiBrandWorkspaceStatus = "ready" | "review" | "blocked";

export type MultiBrandTemplateVisibility =
  | "visible"
  | "review-only"
  | "hidden";

export type MultiBrandApprovalGate = {
  id: "assets" | "templates" | "visibility" | "project-brand";
  label: string;
  status: MultiBrandWorkspaceStatus;
  score: number;
  detail: string;
};

export type MultiBrandTemplateRule = {
  templateId: string;
  templateName: string;
  visibility: MultiBrandTemplateVisibility;
  reason: string;
  approvalStatus: DesignTemplateSummary["approvalStatus"];
  marketplaceStatus: DesignTemplateSummary["marketplaceStatus"];
};

export type MultiBrandKit = {
  id: "workspace" | "team" | "published";
  name: string;
  description: string;
  status: MultiBrandWorkspaceStatus;
  score: number;
  colors: BrandColorSummary[];
  fonts: BrandFontSummary[];
  logos: BrandLogoSummary[];
  projects: ProjectSummary[];
  templates: DesignTemplateSummary[];
  visibleTemplateCount: number;
  reviewTemplateCount: number;
  hiddenTemplateCount: number;
  approvalGates: MultiBrandApprovalGate[];
  templateRules: MultiBrandTemplateRule[];
  switchSummary: string;
};

export type MultiBrandWorkspaceControlCenter = {
  status: MultiBrandWorkspaceStatus;
  score: number;
  kits: MultiBrandKit[];
  nextActions: string[];
  totals: {
    kits: number;
    brandAssets: number;
    visibleTemplates: number;
    reviewTemplates: number;
    hiddenTemplates: number;
  };
};

export function createMultiBrandWorkspaceControlCenter(input: {
  brandColors: BrandColorSummary[];
  brandFonts: BrandFontSummary[];
  brandLogos: BrandLogoSummary[];
  templates: DesignTemplateSummary[];
  projects: ProjectSummary[];
  projectAudits: ProjectAuditSummary[];
}): MultiBrandWorkspaceControlCenter {
  const activeProjects = input.projects.filter((project) => !project.deletedAt);
  const kits = [
    createMultiBrandKit({
      id: "workspace",
      name: "Workspace brand",
      description: "Default kit for every active project.",
      colors: input.brandColors,
      fonts: input.brandFonts,
      logos: input.brandLogos,
      projects: activeProjects,
      templates: input.templates,
      projectAudits: input.projectAudits,
      templateScope: "workspace",
    }),
    createMultiBrandKit({
      id: "team",
      name: "Team brand",
      description: "Shared kit for team and brand templates.",
      colors: input.brandColors,
      fonts: input.brandFonts,
      logos: input.brandLogos,
      projects: activeProjects.filter(
        (project) =>
          project.editSharePermission !== "view" ||
          project.approvalStatus !== "draft",
      ),
      templates: input.templates.filter(
        (template) => template.isTeamTemplate || template.isBrandTemplate,
      ),
      projectAudits: input.projectAudits,
      templateScope: "team",
    }),
    createMultiBrandKit({
      id: "published",
      name: "Published brand",
      description: "Release kit for public projects and marketplace templates.",
      colors: input.brandColors,
      fonts: input.brandFonts,
      logos: input.brandLogos,
      projects: activeProjects.filter((project) => project.publicShareId),
      templates: input.templates.filter(
        (template) =>
          template.marketplaceStatus === "published" ||
          template.marketplaceStatus === "review",
      ),
      projectAudits: input.projectAudits,
      templateScope: "published",
    }),
  ];
  const score = Math.round(
    kits.reduce((total, kit) => total + kit.score, 0) / kits.length,
  );

  return {
    status: scoreToStatus(score),
    score,
    kits,
    nextActions: createNextActions(kits),
    totals: {
      kits: kits.length,
      brandAssets:
        input.brandColors.length +
        input.brandFonts.length +
        input.brandLogos.length,
      visibleTemplates: kits.reduce(
        (total, kit) => total + kit.visibleTemplateCount,
        0,
      ),
      reviewTemplates: kits.reduce(
        (total, kit) => total + kit.reviewTemplateCount,
        0,
      ),
      hiddenTemplates: kits.reduce(
        (total, kit) => total + kit.hiddenTemplateCount,
        0,
      ),
    },
  };
}

function createMultiBrandKit(input: {
  id: MultiBrandKit["id"];
  name: string;
  description: string;
  colors: BrandColorSummary[];
  fonts: BrandFontSummary[];
  logos: BrandLogoSummary[];
  projects: ProjectSummary[];
  templates: DesignTemplateSummary[];
  projectAudits: ProjectAuditSummary[];
  templateScope: MultiBrandKit["id"];
}): MultiBrandKit {
  const templateRules = input.templates
    .map((template) => createTemplateRule(template, input.templateScope))
    .sort(compareTemplateRules);
  const visibleTemplateCount = templateRules.filter(
    (rule) => rule.visibility === "visible",
  ).length;
  const reviewTemplateCount = templateRules.filter(
    (rule) => rule.visibility === "review-only",
  ).length;
  const hiddenTemplateCount = templateRules.filter(
    (rule) => rule.visibility === "hidden",
  ).length;
  const approvalGates = [
    createAssetGate(input),
    createTemplateApprovalGate(input.templates),
    createTemplateVisibilityGate(templateRules),
    createProjectBrandGate(input.projects, input.projectAudits),
  ];
  const score = Math.round(
    approvalGates.reduce((total, gate) => total + gate.score, 0) /
      approvalGates.length,
  );

  return {
    id: input.id,
    name: input.name,
    description: input.description,
    status: scoreToStatus(score),
    score,
    colors: input.colors,
    fonts: input.fonts,
    logos: input.logos,
    projects: input.projects,
    templates: input.templates,
    visibleTemplateCount,
    reviewTemplateCount,
    hiddenTemplateCount,
    approvalGates,
    templateRules,
    switchSummary: createSwitchSummary({
      projectCount: input.projects.length,
      visibleTemplateCount,
      reviewTemplateCount,
    }),
  };
}

function createAssetGate(input: {
  colors: BrandColorSummary[];
  fonts: BrandFontSummary[];
  logos: BrandLogoSummary[];
}): MultiBrandApprovalGate {
  const roles = new Set(input.fonts.map((font) => font.role));
  const hasHeading = roles.has("heading") || roles.has("subheading");
  const hasBody = roles.has("body");
  const colorScore =
    input.colors.length >= 3 ? 100 : input.colors.length > 0 ? 65 : 0;
  const fontScore = hasHeading && hasBody ? 100 : input.fonts.length ? 60 : 0;
  const logoScore = input.logos.length ? 100 : 0;
  const score = Math.round((colorScore + fontScore + logoScore) / 3);

  return {
    id: "assets",
    label: "Brand assets",
    status: scoreToStatus(score),
    score,
    detail: `${input.colors.length} colors, ${input.fonts.length} fonts, ${input.logos.length} logos`,
  };
}

function createTemplateApprovalGate(
  templates: DesignTemplateSummary[],
): MultiBrandApprovalGate {
  const approved = templates.filter(
    (template) => template.approvalStatus === "approved",
  ).length;
  const score = templates.length
    ? Math.round((approved / templates.length) * 100)
    : 0;

  return {
    id: "templates",
    label: "Template approvals",
    status: scoreToStatus(score),
    score,
    detail: templates.length
      ? `${approved} of ${templates.length} templates are approved`
      : "No templates are assigned to this kit",
  };
}

function createTemplateVisibilityGate(
  rules: MultiBrandTemplateRule[],
): MultiBrandApprovalGate {
  const visible = rules.filter((rule) => rule.visibility === "visible").length;
  const reviewOnly = rules.filter(
    (rule) => rule.visibility === "review-only",
  ).length;
  const score = rules.length
    ? Math.round(((visible + reviewOnly * 0.5) / rules.length) * 100)
    : 0;

  return {
    id: "visibility",
    label: "Template visibility",
    status: scoreToStatus(score),
    score,
    detail: rules.length
      ? `${visible} visible, ${reviewOnly} review-only, ${rules.length - visible - reviewOnly} hidden`
      : "No template visibility rules are active",
  };
}

function createProjectBrandGate(
  projects: ProjectSummary[],
  audits: ProjectAuditSummary[],
): MultiBrandApprovalGate {
  const auditByProject = new Map(audits.map((audit) => [audit.projectId, audit]));
  const brandScores = projects
    .map((project) =>
      auditByProject
        .get(project.id)
        ?.dimensions.find((dimension) => dimension.id === "brand")?.score,
    )
    .filter((score): score is number => typeof score === "number");
  const score = brandScores.length
    ? Math.round(
        brandScores.reduce((total, item) => total + item, 0) /
          brandScores.length,
      )
    : projects.length
      ? 50
      : 100;

  return {
    id: "project-brand",
    label: "Project brand gate",
    status: scoreToStatus(score),
    score,
    detail: brandScores.length
      ? `${brandScores.length} project brand audits averaged`
      : projects.length
        ? "Projects exist but brand audits have not run yet"
        : "No active projects are assigned to this kit",
  };
}

function createTemplateRule(
  template: DesignTemplateSummary,
  scope: MultiBrandKit["id"],
): MultiBrandTemplateRule {
  if (template.approvalStatus === "changes-requested") {
    return createRule(template, "hidden", "Changes requested");
  }

  if (template.approvalStatus === "draft") {
    return createRule(template, "hidden", "Draft templates stay hidden");
  }

  if (scope === "published") {
    if (template.marketplaceStatus === "published") {
      return createRule(template, "visible", "Published marketplace template");
    }

    return createRule(template, "review-only", "Marketplace review required");
  }

  if (scope === "team") {
    if (template.isTeamTemplate || template.isBrandTemplate) {
      return template.approvalStatus === "approved"
        ? createRule(template, "visible", "Approved team or brand template")
        : createRule(template, "review-only", "Team template needs approval");
    }

    return createRule(template, "hidden", "Not assigned to team brand");
  }

  if (template.approvalStatus === "approved") {
    return createRule(template, "visible", "Approved workspace template");
  }

  return createRule(template, "review-only", "Template is still in review");
}

function createRule(
  template: DesignTemplateSummary,
  visibility: MultiBrandTemplateVisibility,
  reason: string,
): MultiBrandTemplateRule {
  return {
    templateId: template.id,
    templateName: template.name,
    visibility,
    reason,
    approvalStatus: template.approvalStatus,
    marketplaceStatus: template.marketplaceStatus,
  };
}

function createSwitchSummary(input: {
  projectCount: number;
  visibleTemplateCount: number;
  reviewTemplateCount: number;
}) {
  return `${input.projectCount} projects, ${input.visibleTemplateCount} visible templates, ${input.reviewTemplateCount} review templates`;
}

function createNextActions(kits: MultiBrandKit[]) {
  return kits
    .filter((kit) => kit.status !== "ready")
    .sort((left, right) => left.score - right.score)
    .map((kit) => {
      const gate = [...kit.approvalGates].sort(
        (left, right) => left.score - right.score,
      )[0];

      return gate
        ? `${kit.name}: ${gate.label} - ${gate.detail}`
        : `${kit.name}: review kit setup`;
    })
    .slice(0, 3);
}

function compareTemplateRules(
  left: MultiBrandTemplateRule,
  right: MultiBrandTemplateRule,
) {
  return (
    visibilityWeight(left.visibility) - visibilityWeight(right.visibility) ||
    left.templateName.localeCompare(right.templateName)
  );
}

function visibilityWeight(visibility: MultiBrandTemplateVisibility) {
  if (visibility === "hidden") return 0;
  if (visibility === "review-only") return 1;

  return 2;
}

function scoreToStatus(score: number): MultiBrandWorkspaceStatus {
  if (score >= 85) return "ready";
  if (score >= 55) return "review";

  return "blocked";
}
