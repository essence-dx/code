import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type {
  BrandColorSummary,
  BrandFontSummary,
  BrandLogoSummary,
  DesignTemplateSummary,
  ProjectSummary,
} from "@/features/editor/types";
import type { ApprovalStatus } from "@/features/review/approval-status";
import { templateLockRuleLabels } from "@/features/templates/template-locking";

export type DesignGovernanceStatus = "strong" | "watch" | "needs-work";

export type DesignGovernanceRule = {
  id: string;
  title: string;
  description: string;
  status: DesignGovernanceStatus;
  score: number;
  evidence: string[];
};

export type DesignApprovalPolicySummary = {
  scope: "projects" | "templates";
  total: number;
  approved: number;
  inReview: number;
  changesRequested: number;
  draft: number;
  score: number;
  status: DesignGovernanceStatus;
};

export type DesignGovernanceAuditEvent = {
  id: string;
  action: string;
  summary: string;
  actorEmail: string | null;
  createdAt: string;
};

export type DesignGovernanceReport = {
  score: number;
  status: DesignGovernanceStatus;
  rules: DesignGovernanceRule[];
  approvalPolicies: DesignApprovalPolicySummary[];
  templateLockRules: string[];
  auditTrail: DesignGovernanceAuditEvent[];
  totals: {
    activeProjects: number;
    governedTemplates: number;
    brandColors: number;
    brandFonts: number;
    brandLogos: number;
    auditEvents: number;
  };
};

type CreateDesignGovernanceReportInput = {
  projects: ProjectSummary[];
  templates: DesignTemplateSummary[];
  brandColors: BrandColorSummary[];
  brandFonts: BrandFontSummary[];
  brandLogos: BrandLogoSummary[];
  auditLogs: WorkspaceAuditLogSummary[];
};

const governanceAuditActions = new Set([
  "approval.updated",
  "template.marketplace.updated",
  "team.member.role.updated",
  "team.owner.transferred",
  "team.invite.created",
  "team.invite.revoked",
  "asset.deleted",
  "asset.duplicates_deleted",
]);

export function createDesignGovernanceReport(
  input: CreateDesignGovernanceReportInput,
): DesignGovernanceReport {
  const activeProjects = input.projects.filter((project) => !project.deletedAt);
  const governedTemplates = input.templates.filter(
    (template) =>
      template.isBrandTemplate ||
      template.isTeamTemplate ||
      template.marketplaceStatus === "published",
  );
  const approvalPolicies = [
    createApprovalPolicySummary(
      "projects",
      activeProjects.map((project) => project.approvalStatus),
    ),
    createApprovalPolicySummary(
      "templates",
      input.templates.map((template) => template.approvalStatus),
    ),
  ];
  const auditTrail = input.auditLogs
    .filter((log) => governanceAuditActions.has(log.action))
    .slice(0, 8)
    .map((log) => ({
      id: log.id,
      action: log.action,
      summary: log.summary,
      actorEmail: log.actorEmail,
      createdAt: log.createdAt,
    }));
  const rules = [
    createColorRule(input.brandColors),
    createFontRule(input.brandFonts),
    createLogoRule(input.brandLogos),
    createTemplateLockRule(governedTemplates),
    createApprovalRule(approvalPolicies),
    createAuditRule(auditTrail),
  ];
  const score = Math.round(
    rules.reduce((total, rule) => total + rule.score, 0) / rules.length,
  );

  return {
    score,
    status: getGovernanceStatus(score),
    rules,
    approvalPolicies,
    templateLockRules: [...templateLockRuleLabels],
    auditTrail,
    totals: {
      activeProjects: activeProjects.length,
      governedTemplates: governedTemplates.length,
      brandColors: input.brandColors.length,
      brandFonts: input.brandFonts.length,
      brandLogos: input.brandLogos.length,
      auditEvents: auditTrail.length,
    },
  };
}

function createColorRule(
  brandColors: BrandColorSummary[],
): DesignGovernanceRule {
  const score =
    brandColors.length >= 3 ? 100 : brandColors.length > 0 ? 65 : 0;

  return {
    id: "brand-colors",
    title: "Reusable brand color rules",
    description: "Shared palette tokens for templates and governed designs.",
    status: getGovernanceStatus(score),
    score,
    evidence: brandColors.length
      ? brandColors.slice(0, 6).map((color) => color.color)
      : ["No brand colors saved yet."],
  };
}

function createFontRule(brandFonts: BrandFontSummary[]): DesignGovernanceRule {
  const roles = new Set(brandFonts.map((font) => font.role));
  const hasHeading = roles.has("heading") || roles.has("subheading");
  const hasBody = roles.has("body");
  const score = hasHeading && hasBody ? 100 : brandFonts.length ? 60 : 0;

  return {
    id: "brand-fonts",
    title: "Reusable typography rules",
    description: "Role-based type styles for consistent document families.",
    status: getGovernanceStatus(score),
    score,
    evidence: brandFonts.length
      ? brandFonts.map((font) => `${font.role}: ${font.fontFamily}`).slice(0, 6)
      : ["No brand fonts saved yet."],
  };
}

function createLogoRule(brandLogos: BrandLogoSummary[]): DesignGovernanceRule {
  const score = brandLogos.length ? 100 : 0;

  return {
    id: "brand-logos",
    title: "Logo usage library",
    description: "Approved logo assets available for workspace templates.",
    status: getGovernanceStatus(score),
    score,
    evidence: brandLogos.length
      ? brandLogos.map((logo) => logo.name).slice(0, 6)
      : ["No approved logo assets saved yet."],
  };
}

function createTemplateLockRule(
  governedTemplates: DesignTemplateSummary[],
): DesignGovernanceRule {
  const brandTemplateCount = governedTemplates.filter(
    (template) => template.isBrandTemplate,
  ).length;
  const teamTemplateCount = governedTemplates.filter(
    (template) => template.isTeamTemplate,
  ).length;
  const score =
    brandTemplateCount > 0 && teamTemplateCount > 0
      ? 100
      : governedTemplates.length
        ? 70
        : 35;

  return {
    id: "template-locks",
    title: "Locked template region policy",
    description: "Structural lock rules protect brand-safe template regions.",
    status: getGovernanceStatus(score),
    score,
    evidence: [
      `${governedTemplates.length} governed templates`,
      `${brandTemplateCount} brand templates`,
      `${teamTemplateCount} team templates`,
      ...templateLockRuleLabels,
    ],
  };
}

function createApprovalRule(
  approvalPolicies: DesignApprovalPolicySummary[],
): DesignGovernanceRule {
  const score = Math.round(
    approvalPolicies.reduce((total, policy) => total + policy.score, 0) /
      approvalPolicies.length,
  );
  const pending = approvalPolicies.reduce(
    (total, policy) =>
      total + policy.draft + policy.inReview + policy.changesRequested,
    0,
  );

  return {
    id: "approval-policy",
    title: "Approval policy coverage",
    description: "Designs and templates move through review before release.",
    status: getGovernanceStatus(score),
    score,
    evidence: [
      `${approvalPolicies[0]?.approved ?? 0} approved projects`,
      `${approvalPolicies[1]?.approved ?? 0} approved templates`,
      `${pending} items still need approval movement`,
    ],
  };
}

function createAuditRule(
  auditTrail: DesignGovernanceAuditEvent[],
): DesignGovernanceRule {
  const score =
    auditTrail.length >= 5 ? 100 : auditTrail.length > 0 ? 70 : 30;

  return {
    id: "audit-trail",
    title: "Governance audit trail",
    description: "Policy and ownership changes remain traceable.",
    status: getGovernanceStatus(score),
    score,
    evidence: auditTrail.length
      ? auditTrail.map((event) => event.summary).slice(0, 4)
      : ["No recent governance audit events found."],
  };
}

function createApprovalPolicySummary(
  scope: DesignApprovalPolicySummary["scope"],
  statuses: ApprovalStatus[],
): DesignApprovalPolicySummary {
  const summary = statuses.reduce(
    (total, status) => ({
      approved: total.approved + (status === "approved" ? 1 : 0),
      inReview: total.inReview + (status === "in-review" ? 1 : 0),
      changesRequested:
        total.changesRequested + (status === "changes-requested" ? 1 : 0),
      draft: total.draft + (status === "draft" ? 1 : 0),
    }),
    { approved: 0, inReview: 0, changesRequested: 0, draft: 0 },
  );
  const total = statuses.length;
  const score = total
    ? Math.round(
        ((summary.approved + summary.inReview * 0.65) / total) * 100,
      )
    : 0;

  return {
    scope,
    total,
    ...summary,
    score,
    status: getGovernanceStatus(score),
  };
}

function getGovernanceStatus(score: number): DesignGovernanceStatus {
  if (score >= 80) return "strong";
  if (score >= 55) return "watch";

  return "needs-work";
}
