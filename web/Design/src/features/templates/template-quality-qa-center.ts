import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type { DesignTemplateSummary } from "@/features/editor/types";
import type { AccessibilityLocalizationFinishCenter } from "@/features/localization/accessibility-localization-finish";
import type { ProjectAuditSummary } from "@/features/projects/project-audit-center";
import { approvalStatusLabels } from "@/features/review/approval-status";
import {
  templateMarketplaceStatusLabels,
  type TemplateMarketplaceStatus,
} from "@/features/templates/template-marketplace";
import { toDiscoveryTemplate } from "@/features/templates/template-marketplace-discovery";
import {
  createRelatedEvidence,
  type RelatedTemplateEvidence,
} from "@/features/templates/template-quality-qa-center-evidence";
import {
  createAccessibilityReadiness,
  createLocalizationReadiness,
  createMarketplaceReadiness,
  createModerationReadiness,
} from "@/features/templates/template-quality-qa-center-readiness";
import {
  createFixPlan,
  createModerationRoutes,
  createNextActions,
  createQualityPacket,
} from "@/features/templates/template-quality-qa-center-routing";
import type {
  TemplateQualityProfile,
  TemplateQualityQaCenter,
  TemplateQualityQaDomain,
  TemplateQualityReadiness,
} from "@/features/templates/template-quality-qa-center-types";
import {
  average,
  compareFixPlans,
  compareModerationRoutes,
  compareProfiles,
  scoreToStatus,
} from "@/features/templates/template-quality-qa-center-utils";

export type {
  TemplateQualityFixItem,
  TemplateQualityFixPlan,
  TemplateQualityModerationRoute,
  TemplateQualityPacket,
  TemplateQualityProfile,
  TemplateQualityQaCenter,
  TemplateQualityQaDomain,
  TemplateQualityQaPriority,
  TemplateQualityQaQueue,
  TemplateQualityQaStatus,
  TemplateQualityReadiness,
} from "@/features/templates/template-quality-qa-center-types";

type TemplateQualityQaInput = {
  templates: DesignTemplateSummary[];
  projectAudits: ProjectAuditSummary[];
  accessibilityLocalizationFinish: AccessibilityLocalizationFinishCenter;
  auditLogs: WorkspaceAuditLogSummary[];
  now?: Date;
};

export function createTemplateQualityQaCenter(
  input: TemplateQualityQaInput,
): TemplateQualityQaCenter {
  const now = input.now ?? new Date();
  const generatedAt = now.toISOString();
  const activeTemplates = input.templates.filter(
    (template) => template.marketplaceStatus !== "archived",
  );
  const profiles = activeTemplates
    .map((template) =>
      createTemplateQualityProfile({
        template,
        evidence: createRelatedEvidence({
          template,
          projectAudits: input.projectAudits,
          finishCenter: input.accessibilityLocalizationFinish,
          auditLogs: input.auditLogs,
        }),
        now,
      }),
    )
    .sort(compareProfiles);
  const moderationRoutes = profiles
    .flatMap((profile) => createModerationRoutes(profile))
    .sort(compareModerationRoutes)
    .slice(0, 12);
  const creatorFixPlans = profiles
    .map((profile) => profile.fixPlan)
    .sort(compareFixPlans);
  const score = average(
    profiles.map((profile) => profile.score),
    100,
  );
  const status = scoreToStatus(
    score,
    profiles.some((profile) => profile.status === "blocked"),
  );
  const totals = {
    templates: profiles.length,
    readyTemplates: profiles.filter((profile) => profile.status === "ready")
      .length,
    reviewTemplates: profiles.filter((profile) => profile.status === "review")
      .length,
    blockedTemplates: profiles.filter((profile) => profile.status === "blocked")
      .length,
    moderationRoutes: moderationRoutes.length,
    creatorFixes: creatorFixPlans.reduce(
      (total, plan) => total + plan.items.length,
      0,
    ),
    accessibilityIssues: profiles.filter(
      (profile) => profile.readiness.accessibility.status !== "ready",
    ).length,
    localizationIssues: profiles.filter(
      (profile) => profile.readiness.localization.status !== "ready",
    ).length,
    marketplaceIssues: profiles.filter(
      (profile) => profile.readiness.marketplace.status !== "ready",
    ).length,
  };
  const nextActions = createNextActions({
    profiles,
    moderationRoutes,
    creatorFixPlans,
  });

  return {
    generatedAt,
    status,
    score,
    templateProfiles: profiles,
    moderationRoutes,
    creatorFixPlans,
    qualityPacket: createQualityPacket({
      generatedAt,
      status,
      score,
      profiles,
      moderationRoutes,
      creatorFixPlans,
      totals,
    }),
    nextActions,
    totals,
  };
}

function createTemplateQualityProfile(input: {
  template: DesignTemplateSummary;
  evidence: RelatedTemplateEvidence;
  now: Date;
}): TemplateQualityProfile {
  const discoveryTemplate = toDiscoveryTemplate(input.template);
  const readiness = {
    accessibility: createAccessibilityReadiness({
      template: input.template,
      evidence: input.evidence,
    }),
    localization: createLocalizationReadiness({
      template: input.template,
      evidence: input.evidence,
    }),
    marketplace: createMarketplaceReadiness({
      template: input.template,
      discoveryTemplate,
    }),
    moderation: createModerationReadiness({
      template: input.template,
      discoveryTemplate,
      evidence: input.evidence,
      now: input.now,
    }),
  } satisfies Record<TemplateQualityQaDomain, TemplateQualityReadiness>;
  const readinessList = Object.values(readiness);
  const score = average(
    readinessList.map((item) => item.score),
    100,
  );
  const status = scoreToStatus(
    score,
    readinessList.some((item) => item.status === "blocked"),
  );
  const fixPlan = createFixPlan({
    template: input.template,
    status,
    score,
    readiness: readinessList,
  });

  return {
    templateId: input.template.id,
    templateName: input.template.name,
    creatorDetail: discoveryTemplate.creatorDetail,
    href: `/templates/${input.template.id}`,
    dimensions: `${input.template.width} x ${input.template.height}`,
    status,
    score,
    updatedAt: input.template.updatedAt,
    readiness,
    fixPlan,
    stats: {
      uses: discoveryTemplate.useCount,
      views: discoveryTemplate.viewCount,
      conversionRate: discoveryTemplate.conversionRate,
      qualityGateScore: discoveryTemplate.qualityScore,
      relatedProjectAudits: input.evidence.audits.length,
    },
  };
}

export function getTemplateQualityMarketplaceLabel(
  status: TemplateMarketplaceStatus,
) {
  return templateMarketplaceStatusLabels[status];
}

export function getTemplateQualityApprovalLabel(
  status: DesignTemplateSummary["approvalStatus"],
) {
  return approvalStatusLabels[status];
}
