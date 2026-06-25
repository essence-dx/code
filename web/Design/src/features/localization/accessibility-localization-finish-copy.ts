import { createTranslationPackJson } from "@/features/editor/translation-pack";
import type { ProjectDetail } from "@/features/editor/types";
import type {
  AccessibilityLocalizationItem,
  CopyEntry,
} from "@/features/localization/accessibility-localization-finish-types";
import {
  inferVisualSuitePageType,
  visualSuitePageTypeLabels,
} from "@/features/visual-suite/mixed-format-orchestration";

export function collectCopyEntries(project: ProjectDetail): CopyEntry[] {
  const pack = JSON.parse(
    createTranslationPackJson({
      document: project.document,
      projectName: project.name,
    }),
  ) as { entries: Array<Omit<CopyEntry, "projectId" | "projectName" | "pageTypeLabel">> };
  const pageTypeById = new Map(
    project.document.pages.map((page) => [
      page.id,
      visualSuitePageTypeLabels[inferVisualSuitePageType({ page, project })],
    ]),
  );

  return pack.entries.map((entry) => ({
    ...entry,
    projectId: project.id,
    projectName: project.name,
    pageTypeLabel: pageTypeById.get(entry.pageId) ?? "Page",
  }));
}

export function createCopyIssues(
  entry: CopyEntry,
): AccessibilityLocalizationItem[] {
  const sourceText = entry.sourceText.trim();
  if (!sourceText) return [];

  const issues: AccessibilityLocalizationItem[] = [];
  const maxLength = getCopyMaxLength(entry);
  const longestWord = getLongestWordLength(sourceText);

  if (sourceText.length > maxLength) {
    issues.push({
      id: `copy-${entry.projectId}-${entry.id}`,
      title: entry.label,
      detail: `${entry.field} is ${sourceText.length} characters; target ${maxLength} or less for this surface.`,
      href: `/editor/${entry.projectId}`,
      status: "review",
      badge: `${sourceText.length}/${maxLength}`,
      meta: [entry.projectName, entry.pageName, entry.pageTypeLabel],
      kind: "copy-length",
    });
  }

  if (longestWord > 34) {
    issues.push({
      id: `word-${entry.projectId}-${entry.id}`,
      title: entry.label,
      detail: `A ${longestWord}-character word may overflow after translation expansion.`,
      href: `/editor/${entry.projectId}`,
      status: "review",
      badge: "Long word",
      meta: [entry.projectName, entry.pageName, entry.pageTypeLabel],
      kind: "copy-length",
    });
  }

  return issues;
}

function getCopyMaxLength(entry: CopyEntry) {
  if (entry.field === "page.websiteSeoTitle") return 60;
  if (entry.field === "page.websiteSeoDescription") return 160;
  if (entry.field === "page.websiteNavLabel") return 28;
  if (entry.field === "page.name") return 60;
  if (entry.pageTypeLabel === "Social") return 140;
  if (entry.pageTypeLabel === "Presentations") return 180;
  if (entry.pageTypeLabel === "Whiteboards") return 90;

  return 320;
}

function getLongestWordLength(value: string) {
  return value
    .split(/\s+/)
    .reduce((longest, word) => Math.max(longest, word.length), 0);
}
