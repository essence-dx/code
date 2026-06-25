import type {
  DesignDocument,
  DesignElement,
  DesignPage,
  TemplateLockSummary,
} from "@/features/editor/types";
import type { TemplateCatalogItem } from "@/features/templates/template-catalog";

export const templateLockRuleLabels = [
  "Lock foundation shapes",
  "Lock accent surfaces",
  "Lock structural connectors",
] as const;

export function applyTemplateLockingRules(
  document: DesignDocument,
  template: TemplateCatalogItem,
): DesignDocument {
  const pages = document.pages.map(lockTemplatePage);
  const summary = summarizeTemplateLocks({ ...document, pages });

  return {
    ...document,
    pages,
    metadata: {
      ...document.metadata,
      templateSourceId: template.id,
      templateSourceName: template.name,
      templateLockAppliedAt: new Date().toISOString(),
      templateLockSummary: summary,
    },
  };
}

export function summarizeTemplateLocks(
  document: DesignDocument,
): TemplateLockSummary {
  let lockedElementCount = 0;
  let editableElementCount = 0;

  for (const page of document.pages) {
    for (const element of page.elements) {
      if (element.locked) {
        lockedElementCount += 1;
      } else {
        editableElementCount += 1;
      }
    }
  }

  return {
    lockedElementCount,
    editableElementCount,
    rules: [...templateLockRuleLabels],
  };
}

function lockTemplatePage(page: DesignPage): DesignPage {
  return {
    ...page,
    elements: page.elements.map((element) =>
      shouldLockTemplateElement(element, page)
        ? { ...element, locked: true }
        : { ...element, locked: element.locked || undefined },
    ),
  };
}

function shouldLockTemplateElement(
  element: DesignElement,
  page: DesignPage,
) {
  if (element.locked) return true;
  if (element.type === "connector") return true;
  if (element.type !== "shape") return false;

  const pageArea = Math.max(1, (page.width ?? 1) * (page.height ?? 1));
  const elementArea = Math.max(1, element.width * element.height);
  const areaRatio = elementArea / pageArea;
  const isEdgeBand =
    element.x <= (page.width ?? 0) * 0.08 ||
    element.y <= (page.height ?? 0) * 0.08;

  return areaRatio >= 0.025 || isEdgeBand;
}
