import {
  editorLocales,
  getEditorLocale,
} from "@/features/editor/editor-localization";
import type { ProjectDetail } from "@/features/editor/types";
import {
  collectCopyEntries,
  createCopyIssues,
} from "@/features/localization/accessibility-localization-finish-copy";
import { createPageIssues } from "@/features/localization/accessibility-localization-finish-routing";
import type { ProjectFinishSummary } from "@/features/localization/accessibility-localization-finish-types";
import { scoreToStatus } from "@/features/localization/accessibility-localization-finish-utils";

export function createProjectFinishSummary(
  project: ProjectDetail,
): ProjectFinishSummary {
  const copyEntries = collectCopyEntries(project);
  const pageIssues = project.document.pages.flatMap((page) =>
    createPageIssues(project, page),
  );
  const copyIssues = copyEntries.flatMap(createCopyIssues);
  const translationEntries = copyEntries.filter((entry) =>
    entry.sourceText.trim(),
  ).length;
  const blockedCount = pageIssues.filter((issue) => issue.status === "blocked")
    .length;
  const reviewCount =
    pageIssues.filter((issue) => issue.status === "review").length +
    copyIssues.length;
  const sourceLocale = getEditorLocale(project.document.metadata?.editorLocale);
  const translationStatus = scoreToStatus(
    translationEntries ? Math.max(0, 100 - reviewCount * 8 - blockedCount * 20) : 0,
    translationEntries === 0 || blockedCount > 0,
  );

  return {
    project,
    pageIssues,
    copyIssues,
    translationItem: {
      id: `translation-${project.id}`,
      title: project.name,
      detail: translationEntries
        ? `${translationEntries} source strings are ready for ${editorLocales.length - 1} target locale handoffs.`
        : "No editable source copy is available for translation export.",
      href: `/editor/${project.id}`,
      status: translationStatus,
      badge: `${translationEntries} strings`,
      meta: [
        `Source ${sourceLocale.toUpperCase()}`,
        `${copyIssues.length} copy risks`,
        `${editorLocales.length - 1} target locales`,
      ],
      kind: "translation",
    },
    handoffItem: {
      id: `handoff-${project.id}`,
      title: project.name,
      detail: blockedCount
        ? "Resolve blocked accessibility or localization issues before final handoff."
        : reviewCount
          ? "Review copy and translation warnings before final handoff."
          : "Finishing packet is ready for stakeholder handoff.",
      href: `/editor/${project.id}`,
      status: blockedCount ? "blocked" : reviewCount ? "review" : "ready",
      badge: `${blockedCount + reviewCount} issues`,
      meta: [
        `${project.document.pages.length} pages`,
        `${translationEntries} strings`,
        `${project.approvalStatus} approval`,
      ],
      kind: "handoff",
    },
    translationEntries,
  };
}
