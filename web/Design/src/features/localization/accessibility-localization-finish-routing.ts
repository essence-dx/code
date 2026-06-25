import type { DesignPage, ProjectDetail } from "@/features/editor/types";
import type {
  AccessibilityLocalizationIssueKind,
  AccessibilityLocalizationItem,
  AccessibilityLocalizationStatus,
} from "@/features/localization/accessibility-localization-finish-types";
import {
  inferVisualSuitePageType,
  visualSuitePageTypeLabels,
} from "@/features/visual-suite/mixed-format-orchestration";

export function createPageIssues(
  project: ProjectDetail,
  page: DesignPage,
): AccessibilityLocalizationItem[] {
  const pageType = inferVisualSuitePageType({ page, project });
  const pageTypeLabel = visualSuitePageTypeLabels[pageType];
  const visibleElements = page.elements.filter((element) => !element.hidden);
  const issues: AccessibilityLocalizationItem[] = [];
  const href = `/editor/${project.id}`;

  if (!visibleElements.length) {
    issues.push(
      createItem({
        project,
        page,
        pageTypeLabel,
        id: `empty-${project.id}-${page.id}`,
        title: `${page.name}: empty page`,
        detail: "Add at least one visible editable layer before handoff.",
        href,
        status: "blocked",
        badge: "Empty",
        meta: [pageTypeLabel],
        kind: "accessibility",
      }),
    );
  }

  const missingAltCount = visibleElements.filter(
    (element) => element.type === "image" && !element.alt.trim(),
  ).length;
  if (missingAltCount) {
    issues.push(
      createItem({
        project,
        page,
        pageTypeLabel,
        id: `alt-${project.id}-${page.id}`,
        title: `${page.name}: image alt text`,
        detail: `${missingAltCount} visible image layer${missingAltCount === 1 ? "" : "s"} need descriptive alt text.`,
        href,
        status: "blocked",
        badge: `${missingAltCount} missing`,
        meta: [pageTypeLabel, "Accessibility"],
        kind: "accessibility",
      }),
    );
  }

  if (
    pageType === "websites" &&
    (!page.websiteSeoTitle?.trim() || !page.websiteSeoDescription?.trim())
  ) {
    issues.push(
      createItem({
        project,
        page,
        pageTypeLabel,
        id: `website-seo-${project.id}-${page.id}`,
        title: `${page.name}: website metadata`,
        detail: "Add SEO title and description before publishing handoff.",
        href,
        status: "review",
        badge: "SEO",
        meta: [pageTypeLabel, "Metadata"],
        kind: "accessibility",
      }),
    );
  }

  return issues;
}

function createItem(input: {
  project: ProjectDetail;
  page: DesignPage;
  pageTypeLabel: string;
  id: string;
  title: string;
  detail: string;
  href: string | null;
  status: AccessibilityLocalizationStatus;
  badge: string;
  meta: string[];
  kind: AccessibilityLocalizationIssueKind;
}): AccessibilityLocalizationItem {
  return {
    id: input.id,
    title: input.title,
    detail: input.detail,
    href: input.href,
    status: input.status,
    badge: input.badge,
    meta: [input.project.name, input.page.name, ...input.meta],
    kind: input.kind,
  };
}
