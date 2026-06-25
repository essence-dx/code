import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type { DesignTemplateSummary } from "@/features/editor/types";
import type {
  AccessibilityLocalizationFinishCenter,
  AccessibilityLocalizationItem,
} from "@/features/localization/accessibility-localization-finish";
import type { ProjectAuditSummary } from "@/features/projects/project-audit-center";
import {
  normalizeText,
  tokenize,
  uniqueStrings,
} from "@/features/templates/template-quality-qa-center-utils";

export type RelatedTemplateEvidence = {
  audits: ProjectAuditSummary[];
  finishItems: AccessibilityLocalizationItem[];
  marketplaceLog: WorkspaceAuditLogSummary | null;
};

export function createRelatedEvidence(input: {
  template: DesignTemplateSummary;
  projectAudits: ProjectAuditSummary[];
  finishCenter: AccessibilityLocalizationFinishCenter;
  auditLogs: WorkspaceAuditLogSummary[];
}): RelatedTemplateEvidence {
  const audits = findRelatedProjectAudits(input.template, input.projectAudits);
  const finishItems = findRelatedFinishItems({
    template: input.template,
    audits,
    finishCenter: input.finishCenter,
  });
  const marketplaceLog =
    input.auditLogs
      .filter(
        (log) =>
          log.action === "template.marketplace.updated" &&
          log.targetId === input.template.id,
      )
      .sort(
        (left, right) =>
          Date.parse(left.createdAt) - Date.parse(right.createdAt),
      )[0] ?? null;

  return {
    audits,
    finishItems,
    marketplaceLog,
  };
}

function findRelatedProjectAudits(
  template: DesignTemplateSummary,
  audits: ProjectAuditSummary[],
) {
  const templateName = normalizeText(template.name);
  const templateTokens = tokenize(template.name);

  return audits.filter((audit) => {
    const auditName = normalizeText(audit.projectName);

    if (auditName === templateName) return true;
    if (auditName.includes(templateName) || templateName.includes(auditName)) {
      return true;
    }

    const auditTokens = tokenize(audit.projectName);
    const overlap = auditTokens.filter((token) =>
      templateTokens.includes(token),
    ).length;

    return overlap >= Math.min(2, templateTokens.length);
  });
}

function findRelatedFinishItems(input: {
  template: DesignTemplateSummary;
  audits: ProjectAuditSummary[];
  finishCenter: AccessibilityLocalizationFinishCenter;
}) {
  const matchTerms = uniqueStrings([
    input.template.name,
    ...input.audits.map((audit) => audit.projectName),
  ]).map(normalizeText);

  return input.finishCenter.sections
    .flatMap((section) => section.items)
    .filter((item) => {
      const haystack = normalizeText(
        `${item.title} ${item.detail} ${item.meta.join(" ")}`,
      );

      return matchTerms.some((term) => term && haystack.includes(term));
    });
}
