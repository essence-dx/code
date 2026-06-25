import type { ProjectDetail } from "@/features/editor/types";
import { createProjectFinishSummary } from "@/features/localization/accessibility-localization-finish-summary";
import type {
  AccessibilityLocalizationFinishCenter,
  AccessibilityLocalizationSection,
} from "@/features/localization/accessibility-localization-finish-types";
import {
  average,
  createHandoffExport,
  createNextActions,
  createSection,
  scoreToStatus,
} from "@/features/localization/accessibility-localization-finish-utils";

export type {
  AccessibilityLocalizationFinishCenter,
  AccessibilityLocalizationHandoffExport,
  AccessibilityLocalizationIssueKind,
  AccessibilityLocalizationItem,
  AccessibilityLocalizationSection,
  AccessibilityLocalizationSectionId,
  AccessibilityLocalizationStatus,
} from "@/features/localization/accessibility-localization-finish-types";

export function createAccessibilityLocalizationFinishCenter(input: {
  projects: ProjectDetail[];
  now?: Date;
}): AccessibilityLocalizationFinishCenter {
  const now = input.now ?? new Date();
  const projectSummaries = input.projects
    .filter((project) => !project.deletedAt)
    .map((project) => createProjectFinishSummary(project));
  const pageIssues = projectSummaries.flatMap((summary) => summary.pageIssues);
  const copyIssues = projectSummaries.flatMap((summary) => summary.copyIssues);
  const translationItems = projectSummaries.map(
    (summary) => summary.translationItem,
  );
  const handoffItems = projectSummaries.map((summary) => summary.handoffItem);
  const sections: AccessibilityLocalizationSection[] = [
    createSection({
      id: "page-routing",
      title: "Page-level issue routing",
      description:
        "Accessibility and production issues routed to the exact project page.",
      metricLabel: "open issues",
      emptyState: "No page-level accessibility or production issues are open.",
      items: pageIssues,
    }),
    createSection({
      id: "copy-length",
      title: "Copy-length checks",
      description:
        "Long text, navigation labels, SEO copy, and expansion risk before export.",
      metricLabel: "copy warnings",
      emptyState: "No copy-length or long-word warnings are open.",
      items: copyIssues,
    }),
    createSection({
      id: "translation-qa",
      title: "Translation QA",
      description:
        "Source locale, translation-pack coverage, and copy risk per project.",
      metricLabel: "projects checked",
      emptyState: "Create a project with editable copy to run translation QA.",
      items: translationItems,
    }),
    createSection({
      id: "handoff-export",
      title: "Handoff exports",
      description:
        "Downloadable finishing packets for accessibility and localization review.",
      metricLabel: "packets",
      emptyState: "Create a project before exporting finishing handoff packets.",
      items: handoffItems,
    }),
  ];
  const score = average(sections.map((section) => section.score));
  const status = scoreToStatus(
    score,
    sections.some((section) => section.status === "blocked"),
  );

  return {
    status,
    score,
    sections,
    nextActions: createNextActions(sections),
    handoffExport: createHandoffExport({
      generatedAt: now.toISOString(),
      score,
      status,
      sections,
    }),
    totals: {
      projects: projectSummaries.length,
      pages: projectSummaries.reduce(
        (total, summary) => total + summary.project.document.pages.length,
        0,
      ),
      routedIssues: pageIssues.length,
      copyWarnings: copyIssues.length,
      translationEntries: projectSummaries.reduce(
        (total, summary) => total + summary.translationEntries,
        0,
      ),
      handoffExports: handoffItems.length,
    },
  };
}
