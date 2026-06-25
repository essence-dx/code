import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type {
  BrandFontRole,
  BrandFontSummary,
  DesignTemplateSummary,
  ProjectSummary,
} from "@/features/editor/types";
import type { ProjectAuditSummary } from "@/features/projects/project-audit-center";
import type {
  DesignSystemIntelligenceInput,
  DesignSystemIntelligenceStatus,
  DesignSystemTokenProfile,
  DesignSystemUsageMap,
} from "@/features/design-system/design-system-intelligence-types";

export const usageRelationLabels: Record<
  DesignSystemUsageMap["relation"],
  string
> = {
  source: "Source component",
  name: "Name-match component",
  dimensions: "Dimension-match component",
  audit: "Audit-backed component",
};

export function createDesignSystemTokenProfile(
  input: Pick<
    DesignSystemIntelligenceInput,
    "brandColors" | "brandFonts" | "brandLogos"
  >,
): DesignSystemTokenProfile {
  const roles = new Set(input.brandFonts.map((font) => font.role));
  const missingFontRoles = (["heading", "body"] as BrandFontRole[]).filter(
    (role) => !roles.has(role),
  );

  return {
    colorCount: input.brandColors.length,
    fontCount: input.brandFonts.length,
    logoCount: input.brandLogos.length,
    missingFontRoles,
    complete:
      input.brandColors.length >= 3 &&
      missingFontRoles.length === 0 &&
      input.brandLogos.length > 0,
  };
}

export function matchesDesignSystemUsageRelation(input: {
  relation: DesignSystemUsageMap["relation"];
  template: DesignTemplateSummary;
  project: ProjectSummary;
  projectAudits: ProjectAuditSummary[];
}) {
  if (input.relation === "source") {
    return input.project.sourceProjectId === input.template.id;
  }
  if (input.relation === "dimensions") {
    return (
      input.project.width === input.template.width &&
      input.project.height === input.template.height
    );
  }
  if (input.relation === "audit") {
    return input.projectAudits.some(
      (audit) =>
        audit.projectId === input.project.id &&
        getProjectBrandDimension(audit)?.status !== "ready",
    );
  }

  const templateName = normalizeDesignSystemLookup(input.template.name);
  const projectName = normalizeDesignSystemLookup(input.project.name);

  return (
    templateName.length >= 4 &&
    projectName.length >= 4 &&
    (projectName.includes(templateName) || templateName.includes(projectName))
  );
}

export function getProjectBrandDimension(audit: ProjectAuditSummary) {
  return audit.dimensions.find((dimension) => dimension.id === "brand") ?? null;
}

export function countDesignSystemAuditEvents(logs: WorkspaceAuditLogSummary[]) {
  return logs.filter(
    (log) =>
      log.action === "template.marketplace.updated" ||
      log.action === "approval.updated" ||
      log.action.startsWith("asset.") ||
      log.targetType === "template",
  ).length;
}

export function scoreDesignSystemStatus(
  score: number,
  hasBlocked: boolean,
): DesignSystemIntelligenceStatus {
  if (hasBlocked || score < 50) return "blocked";
  if (score < 85) return "review";

  return "ready";
}

export function aggregateDesignSystemStatus(
  items: Array<{ status: DesignSystemIntelligenceStatus }>,
) {
  if (items.some((item) => item.status === "blocked")) return "blocked";
  if (items.some((item) => item.status === "review")) return "review";

  return "ready";
}

export function designSystemStatusScore(
  status: DesignSystemIntelligenceStatus,
) {
  if (status === "ready") return 100;
  if (status === "review") return 65;

  return 15;
}

export function designSystemCoverageScore(
  readyCount: number,
  totalCount: number,
) {
  if (totalCount <= 0) return 100;

  return Math.round((readyCount / totalCount) * 100);
}

export function averageDesignSystemScore(values: number[]) {
  if (!values.length) return 100;

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(
        values.reduce((total, value) => total + value, 0) / values.length,
      ),
    ),
  );
}

export function designSystemStatusWeight(
  status: DesignSystemIntelligenceStatus,
) {
  if (status === "blocked") return 2;
  if (status === "review") return 1;

  return 0;
}

export function latestDesignSystemTimestamp(values: string[]) {
  return (
    values
      .filter(Boolean)
      .sort((left, right) => Date.parse(right) - Date.parse(left))[0] ??
    new Date().toISOString()
  );
}

export function normalizeDesignSystemLookup(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function uniqueDesignSystemValues(values: string[]) {
  return [...new Set(values)];
}

export function hasFontRole(
  fonts: BrandFontSummary[],
  role: BrandFontSummary["role"],
) {
  return fonts.some((font) => font.role === role);
}
