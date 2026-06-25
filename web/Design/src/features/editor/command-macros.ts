import { nanoid } from "nanoid";

import { getPageDimensions } from "@/features/editor/page-dimensions";
import type {
  DesignDocument,
  DesignElement,
  DesignPage,
  EditorCommandAutomationIssue,
  EditorCommandAutomationRun,
  EditorCommandMacroCategory,
  EditorCommandMacroId,
  ImageElement,
  TextElement,
} from "@/features/editor/types";

export type EditorCommandMacroDefinition = {
  id: EditorCommandMacroId;
  category: EditorCommandMacroCategory;
  title: string;
  description: string;
};

type ApplyCommandMacroOptions = {
  selectedElementIds?: string[];
  projectName?: string;
  now?: string;
};

type CommandMacroResult = {
  document: DesignDocument;
  summary: string;
  changedElementIds: string[];
  selectedElementIds?: string[];
  issues: EditorCommandAutomationIssue[];
};

export type AppliedCommandMacroResult = CommandMacroResult & {
  macro: EditorCommandMacroDefinition;
  run: EditorCommandAutomationRun;
};

export const editorCommandMacroCatalog: EditorCommandMacroDefinition[] = [
  {
    id: "tidy-selected-layers",
    category: "batch",
    title: "Tidy selected layers",
    description:
      "Batch snap selected layers to the grid, normalize size, rotation, and opacity.",
  },
  {
    id: "prepare-export",
    category: "export",
    title: "Prepare pages for export",
    description:
      "Clamp unlocked artwork to page bounds, fill transparent pages, and add missing image alt text.",
  },
  {
    id: "setup-publishing",
    category: "publishing",
    title: "Set up publishing metadata",
    description:
      "Generate missing section navigation labels, SEO titles, and descriptions from the project.",
  },
  {
    id: "run-qa-checks",
    category: "qa",
    title: "Run production QA checks",
    description:
      "Review empty pages, missing alt text, tiny text, bounds issues, and publishing metadata.",
  },
];

export function applyEditorCommandMacro(
  document: DesignDocument,
  macroId: EditorCommandMacroId,
  options: ApplyCommandMacroOptions = {},
): AppliedCommandMacroResult {
  const macro =
    editorCommandMacroCatalog.find((item) => item.id === macroId) ??
    editorCommandMacroCatalog[0];
  const now = options.now ?? new Date().toISOString();
  const result = runMacro(document, macro.id, options);
  const run: EditorCommandAutomationRun = {
    id: nanoid(),
    macroId: macro.id,
    title: macro.title,
    category: macro.category,
    ranAt: now,
    summary: result.summary,
    changedElementIds: result.changedElementIds,
    issueCount: result.issues.length,
  };

  return {
    ...result,
    macro,
    run,
    document: recordCommandAutomationRun(result.document, run, result.issues),
    selectedElementIds:
      result.selectedElementIds ?? options.selectedElementIds ?? [],
  };
}

export function createCommandAutomationQaIssues(
  document: DesignDocument,
  macroId: EditorCommandMacroId = "run-qa-checks",
): EditorCommandAutomationIssue[] {
  const issues: EditorCommandAutomationIssue[] = [];

  if (document.pages.length === 0) {
    issues.push(
      createIssue({
        macroId,
        severity: "blocked",
        message: "The project has no pages.",
        fix: "Add at least one page before handoff.",
      }),
    );

    return issues;
  }

  for (const page of document.pages) {
    const pageSize = getPageDimensions(document, page);
    const visibleElements = page.elements.filter((element) => !element.hidden);

    if (!page.name.trim()) {
      issues.push(
        createIssue({
          macroId,
          severity: "review",
          page,
          message: "A page is missing a readable name.",
          fix: "Rename the page so exports and publishing sections are clear.",
        }),
      );
    }

    if (visibleElements.length === 0) {
      issues.push(
        createIssue({
          macroId,
          severity: "blocked",
          page,
          message: `${page.name} has no visible layers.`,
          fix: "Add visible artwork or remove the blank page before handoff.",
        }),
      );
    }

    if (!page.background || page.background === "transparent") {
      issues.push(
        createIssue({
          macroId,
          severity: "review",
          page,
          message: `${page.name} has a transparent page background.`,
          fix: "Use a solid page background for predictable exports.",
        }),
      );
    }

    if (isPublishingPage(page) && !page.websiteSeoTitle?.trim()) {
      issues.push(
        createIssue({
          macroId,
          severity: "review",
          page,
          message: `${page.name} is missing a publishing SEO title.`,
          fix: "Run the publishing setup macro or add an explicit SEO title.",
        }),
      );
    }

    if (isPublishingPage(page) && !page.websiteSeoDescription?.trim()) {
      issues.push(
        createIssue({
          macroId,
          severity: "review",
          page,
          message: `${page.name} is missing a publishing SEO description.`,
          fix: "Run the publishing setup macro or add an explicit SEO description.",
        }),
      );
    }

    page.elements.forEach((element, index) => {
      if (element.hidden) return;

      if (isElementOutsidePage(element, pageSize)) {
        issues.push(
          createIssue({
            macroId,
            severity: "review",
            page,
            element,
            message: `${getElementLabel(element, index)} sits outside ${page.name}.`,
            fix: "Move the layer fully inside the page or intentionally crop it.",
          }),
        );
      }

      if (element.type === "image" && !element.alt.trim()) {
        issues.push(
          createIssue({
            macroId,
            severity: "review",
            page,
            element,
            message: `${getElementLabel(element, index)} is missing alt text.`,
            fix: "Add descriptive alt text for accessibility and handoff.",
          }),
        );
      }

      if (element.type === "text" && !element.content.trim()) {
        issues.push(
          createIssue({
            macroId,
            severity: "review",
            page,
            element,
            message: `${getElementLabel(element, index)} has empty text.`,
            fix: "Add copy or remove the empty text layer.",
          }),
        );
      }

      if (element.type === "text" && element.fontSize < 10) {
        issues.push(
          createIssue({
            macroId,
            severity: "review",
            page,
            element,
            message: `${getElementLabel(element, index)} uses very small text.`,
            fix: "Increase text size or verify it is intentional for print.",
          }),
        );
      }
    });
  }

  return issues;
}

function runMacro(
  document: DesignDocument,
  macroId: EditorCommandMacroId,
  options: ApplyCommandMacroOptions,
): CommandMacroResult {
  switch (macroId) {
    case "prepare-export":
      return prepareDocumentForExport(document);
    case "setup-publishing":
      return setupPublishingMetadata(document, options.projectName);
    case "run-qa-checks":
      return runProductionQaChecks(document, options.selectedElementIds);
    case "tidy-selected-layers":
    default:
      return tidySelectedLayers(document, options.selectedElementIds);
  }
}

function tidySelectedLayers(
  document: DesignDocument,
  selectedElementIds: string[] = [],
): CommandMacroResult {
  const activePage = getActivePage(document);

  if (!activePage) {
    return {
      document,
      summary: "No page is available for layer tidying.",
      changedElementIds: [],
      selectedElementIds,
      issues: [
        createIssue({
          macroId: "tidy-selected-layers",
          severity: "blocked",
          message: "The project has no pages.",
          fix: "Add a page before running layer macros.",
        }),
      ],
    };
  }

  const targetIds = new Set(
    selectedElementIds.length
      ? selectedElementIds
      : activePage.elements
          .filter((element) => !element.locked && !element.hidden)
          .map((element) => element.id),
  );
  const changedElementIds: string[] = [];
  const pages = document.pages.map((page) => {
    if (page.id !== activePage.id) return page;

    return {
      ...page,
      elements: page.elements.map((element) => {
        if (!targetIds.has(element.id) || element.locked) return element;

        const nextElement = tidyElementGeometry(element);

        if (nextElement !== element) {
          changedElementIds.push(element.id);
        }

        return nextElement;
      }),
    };
  });

  const changedCount = unique(changedElementIds).length;

  return {
    document: { ...document, pages },
    summary: changedCount
      ? `Tidied ${changedCount} layer${changedCount === 1 ? "" : "s"} on ${activePage.name}.`
      : `No unlocked layers needed tidying on ${activePage.name}.`,
    changedElementIds: unique(changedElementIds),
    selectedElementIds: changedCount ? unique(changedElementIds) : selectedElementIds,
    issues: [],
  };
}

function prepareDocumentForExport(
  document: DesignDocument,
): CommandMacroResult {
  const changedElementIds: string[] = [];
  const issues: EditorCommandAutomationIssue[] = [];
  let changedPageCount = 0;
  const pages = document.pages.map((page) => {
    const pageSize = getPageDimensions(document, page);
    const visibleElements = page.elements.filter((element) => !element.hidden);
    let changedPage = false;
    const nextPage: DesignPage = {
      ...page,
      background:
        page.background && page.background !== "transparent"
          ? page.background
          : "#ffffff",
      elements: page.elements.map((element, index) => {
        if (element.locked) return element;

        const nextElement = prepareElementForExport(
          element,
          page,
          pageSize,
          index,
        );

        if (nextElement !== element) {
          changedElementIds.push(element.id);
          changedPage = true;
        }

        return nextElement;
      }),
    };

    if (nextPage.background !== page.background) {
      changedPage = true;
    }

    if (visibleElements.length === 0) {
      issues.push(
        createIssue({
          macroId: "prepare-export",
          severity: "blocked",
          page,
          message: `${page.name} has no visible layers to export.`,
          fix: "Add visible artwork or remove the blank page.",
        }),
      );
    }

    if (changedPage) changedPageCount += 1;

    return nextPage;
  });
  const changedCount = unique(changedElementIds).length;

  return {
    document: { ...document, pages },
    summary: `Prepared ${changedPageCount} page${changedPageCount === 1 ? "" : "s"} and ${changedCount} layer${changedCount === 1 ? "" : "s"} for export.`,
    changedElementIds: unique(changedElementIds),
    selectedElementIds: changedCount ? unique(changedElementIds) : undefined,
    issues,
  };
}

function setupPublishingMetadata(
  document: DesignDocument,
  projectName = "Untitled project",
): CommandMacroResult {
  let changedPageCount = 0;
  const pages = document.pages.map((page, index) => {
    const seoTitle =
      page.websiteSeoTitle?.trim() ||
      `${projectName.trim() || "Untitled project"} - ${page.name}`;
    const seoDescription =
      page.websiteSeoDescription?.trim() ||
      createSeoDescription(page, projectName);
    const navLabel =
      page.websiteNavLabel?.trim() || page.name.trim() || `Page ${index + 1}`;
    const nextPage: DesignPage = {
      ...page,
      websiteSeoTitle: trimToLength(seoTitle, 70),
      websiteSeoDescription: trimToLength(seoDescription, 155),
      websiteNavLabel: trimToLength(navLabel, 32),
      websiteHideFromNavigation: page.websiteHideFromNavigation ?? false,
    };

    if (
      nextPage.websiteSeoTitle !== page.websiteSeoTitle ||
      nextPage.websiteSeoDescription !== page.websiteSeoDescription ||
      nextPage.websiteNavLabel !== page.websiteNavLabel ||
      nextPage.websiteHideFromNavigation !== page.websiteHideFromNavigation
    ) {
      changedPageCount += 1;
    }

    return nextPage;
  });

  return {
    document: { ...document, pages },
    summary: changedPageCount
      ? `Updated publishing metadata on ${changedPageCount} page${changedPageCount === 1 ? "" : "s"}.`
      : "Publishing metadata already looked complete.",
    changedElementIds: [],
    issues: createCommandAutomationQaIssues(
      { ...document, pages },
      "setup-publishing",
    ).filter((issue) => issue.message.includes("publishing")),
  };
}

function runProductionQaChecks(
  document: DesignDocument,
  selectedElementIds: string[] = [],
): CommandMacroResult {
  const issues = createCommandAutomationQaIssues(document);
  const firstIssueElementId = issues.find((issue) => issue.elementId)?.elementId;

  return {
    document,
    summary: issues.length
      ? `Found ${issues.length} production QA issue${issues.length === 1 ? "" : "s"}.`
      : "Production QA checks passed.",
    changedElementIds: [],
    selectedElementIds: firstIssueElementId
      ? [firstIssueElementId]
      : selectedElementIds,
    issues,
  };
}

function recordCommandAutomationRun(
  document: DesignDocument,
  run: EditorCommandAutomationRun,
  issues: EditorCommandAutomationIssue[],
): DesignDocument {
  const previous = document.metadata?.commandAutomation;
  const shouldReplaceQaIssues = run.macroId === "run-qa-checks" || issues.length > 0;

  return {
    ...document,
    metadata: {
      ...document.metadata,
      commandAutomation: {
        lastRunAt: run.ranAt,
        runs: [run, ...(previous?.runs ?? [])].slice(0, 12),
        qaIssues: shouldReplaceQaIssues ? issues : (previous?.qaIssues ?? []),
      },
    },
  };
}

function tidyElementGeometry(element: DesignElement): DesignElement {
  return applyCommonElementUpdates(element, {
    x: snap(element.x),
    y: snap(element.y),
    width: Math.max(1, snap(element.width)),
    height: Math.max(1, snap(element.height)),
    rotation: normalizeRotation(element.rotation),
    opacity: normalizeOpacity(element.opacity),
  });
}

function prepareElementForExport(
  element: DesignElement,
  page: DesignPage,
  pageSize: { width: number; height: number },
  index: number,
): DesignElement {
  const width = Math.max(1, Math.round(element.width));
  const height = Math.max(1, Math.round(element.height));
  const maxX = Math.max(0, pageSize.width - width);
  const maxY = Math.max(0, pageSize.height - height);
  const nextElement = applyCommonElementUpdates(element, {
    x: clamp(Math.round(element.x), 0, maxX),
    y: clamp(Math.round(element.y), 0, maxY),
    width,
    height,
    rotation: normalizeRotation(element.rotation),
    opacity: normalizeOpacity(element.opacity),
  });

  if (nextElement.type === "image" && !nextElement.alt.trim()) {
    return {
      ...nextElement,
      alt: `${page.name} image ${index + 1}`,
    } satisfies ImageElement;
  }

  return nextElement;
}

function applyCommonElementUpdates(
  element: DesignElement,
  updates: Pick<
    DesignElement,
    "x" | "y" | "width" | "height" | "rotation" | "opacity"
  >,
): DesignElement {
  if (
    element.x === updates.x &&
    element.y === updates.y &&
    element.width === updates.width &&
    element.height === updates.height &&
    element.rotation === updates.rotation &&
    element.opacity === updates.opacity
  ) {
    return element;
  }

  return {
    ...element,
    ...updates,
  } as DesignElement;
}

function createSeoDescription(page: DesignPage, projectName: string) {
  const notes = page.notes?.replace(/\s+/g, " ").trim();

  if (notes) return notes;

  return `${projectName.trim() || "This project"} section for ${page.name}.`;
}

function createIssue(input: {
  macroId: EditorCommandMacroId;
  severity: EditorCommandAutomationIssue["severity"];
  page?: DesignPage;
  element?: DesignElement;
  message: string;
  fix: string;
}): EditorCommandAutomationIssue {
  return {
    id: nanoid(),
    macroId: input.macroId,
    severity: input.severity,
    pageId: input.page?.id,
    pageName: input.page?.name,
    elementId: input.element?.id,
    message: input.message,
    fix: input.fix,
  };
}

function getActivePage(document: DesignDocument): DesignPage | null {
  return (
    document.pages.find((page) => page.id === document.activePageId) ??
    document.pages[0] ??
    null
  );
}

function getElementLabel(element: DesignElement, index: number) {
  if (element.type === "text") {
    return createTextLabel(element, index);
  }

  if ("name" in element && typeof element.name === "string" && element.name.trim()) {
    return element.name.trim();
  }

  return `${element.type} layer ${index + 1}`;
}

function createTextLabel(element: TextElement, index: number) {
  const content = element.content.trim();

  if (!content) return `text layer ${index + 1}`;

  return trimToLength(content, 34);
}

function isPublishingPage(page: DesignPage) {
  return (
    page.format === "website" ||
    Boolean(
      page.websiteSeoTitle ||
        page.websiteSeoDescription ||
        page.websiteNavLabel ||
        page.websiteNavGroup,
    )
  );
}

function isElementOutsidePage(
  element: DesignElement,
  pageSize: { width: number; height: number },
) {
  return (
    element.x < 0 ||
    element.y < 0 ||
    element.x + element.width > pageSize.width ||
    element.y + element.height > pageSize.height
  );
}

function snap(value: number, grid = 4) {
  return Math.round(value / grid) * grid;
}

function normalizeRotation(value: number) {
  let rotation = value % 360;

  if (rotation > 180) rotation -= 360;
  if (rotation < -180) rotation += 360;

  return round(rotation, 2);
}

function normalizeOpacity(value: number) {
  return clamp(round(value, 3), 0, 1);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, decimals: number) {
  const factor = 10 ** decimals;

  return Math.round(value * factor) / factor;
}

function trimToLength(value: string, maxLength: number) {
  const trimmed = value.replace(/\s+/g, " ").trim();

  if (trimmed.length <= maxLength) return trimmed;

  return `${trimmed.slice(0, Math.max(0, maxLength - 3)).trim()}...`;
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}
