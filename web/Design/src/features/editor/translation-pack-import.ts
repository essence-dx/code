import type {
  ChartElement,
  DesignDocument,
  DesignElement,
  DesignPage,
  DocumentElement,
  FormElement,
  TableElement,
} from "@/features/editor/types";
import {
  translationPackKind,
  type TranslationImportResult,
  type TranslationPack,
  type TranslationPackEntry,
} from "@/features/editor/translation-pack-types";

export function applyTranslationPackJson(
  document: DesignDocument,
  jsonText: string,
): TranslationImportResult {
  const pack = parseTranslationPack(jsonText);
  let nextDocument = document;
  let appliedEntries = 0;
  let skippedEntries = 0;

  for (const entry of pack.entries) {
    const translatedText = entry.translatedText.trim();

    if (!translatedText) {
      skippedEntries += 1;
      continue;
    }

    const result = applyTranslationEntry(nextDocument, entry, translatedText);

    nextDocument = result.document;

    if (result.applied) {
      appliedEntries += 1;
    } else {
      skippedEntries += 1;
    }
  }

  return {
    document: nextDocument,
    appliedEntries,
    skippedEntries,
    totalEntries: pack.entries.length,
  };
}

function parseTranslationPack(jsonText: string): TranslationPack {
  const parsed = JSON.parse(jsonText) as Partial<TranslationPack>;

  if (
    parsed.kind !== translationPackKind ||
    parsed.version !== 1 ||
    !Array.isArray(parsed.entries)
  ) {
    throw new Error("Invalid translation pack.");
  }

  return parsed as TranslationPack;
}

function applyTranslationEntry(
  document: DesignDocument,
  entry: TranslationPackEntry,
  translatedText: string,
) {
  const pageIndex = document.pages.findIndex((page) => page.id === entry.pageId);

  if (pageIndex < 0) {
    return { document, applied: false };
  }

  const page = document.pages[pageIndex];

  if (!entry.elementId) {
    const updatedPage = updatePageTranslationField(page, entry, translatedText);

    if (!updatedPage) {
      return { document, applied: false };
    }

    return {
      document: replacePage(document, pageIndex, updatedPage),
      applied: true,
    };
  }

  const elementIndex = page.elements.findIndex(
    (element) => element.id === entry.elementId,
  );

  if (elementIndex < 0) {
    return { document, applied: false };
  }

  const updatedElement = updateElementTranslationField(
    page.elements[elementIndex],
    entry,
    translatedText,
  );

  if (!updatedElement) {
    return { document, applied: false };
  }

  const nextElements = [...page.elements];

  nextElements[elementIndex] = updatedElement;

  return {
    document: replacePage(document, pageIndex, {
      ...page,
      elements: nextElements,
    }),
    applied: true,
  };
}

function updatePageTranslationField(
  page: DesignPage,
  entry: TranslationPackEntry,
  translatedText: string,
) {
  if (entry.field === "page.name" && page.name === entry.sourceText) {
    return { ...page, name: translatedText };
  }

  if (entry.field === "page.notes" && (page.notes ?? "") === entry.sourceText) {
    return { ...page, notes: translatedText };
  }

  if (
    entry.field === "page.websiteSeoTitle" &&
    (page.websiteSeoTitle ?? "") === entry.sourceText
  ) {
    return { ...page, websiteSeoTitle: translatedText };
  }

  if (
    entry.field === "page.websiteSeoDescription" &&
    (page.websiteSeoDescription ?? "") === entry.sourceText
  ) {
    return { ...page, websiteSeoDescription: translatedText };
  }

  if (
    entry.field === "page.websiteNavLabel" &&
    (page.websiteNavLabel ?? "") === entry.sourceText
  ) {
    return { ...page, websiteNavLabel: translatedText };
  }

  if (
    entry.field === "page.websiteNavGroup" &&
    (page.websiteNavGroup ?? "") === entry.sourceText
  ) {
    return { ...page, websiteNavGroup: translatedText };
  }

  return null;
}

function updateElementTranslationField(
  element: DesignElement,
  entry: TranslationPackEntry,
  translatedText: string,
): DesignElement | null {
  switch (element.type) {
    case "text":
      return entry.field === "text.content" && element.content === entry.sourceText
        ? { ...element, content: translatedText }
        : null;
    case "document":
      return updateDocumentTranslationField(element, entry, translatedText);
    case "sticky-note":
      return entry.field === "sticky-note.content" &&
        element.content === entry.sourceText
        ? { ...element, content: translatedText }
        : null;
    case "connector":
      return entry.field === "connector.label" && element.label === entry.sourceText
        ? { ...element, label: translatedText }
        : null;
    case "form":
      return updateFormTranslationField(element, entry, translatedText);
    case "embed":
      return updateEmbedTranslationField(element, entry, translatedText);
    case "timer":
      return entry.field === "timer.label" && element.label === entry.sourceText
        ? { ...element, label: translatedText }
        : null;
    case "image":
      return entry.field === "image.alt" && element.alt === entry.sourceText
        ? { ...element, alt: translatedText }
        : null;
    case "video":
    case "audio":
    case "pdf":
      return entry.field === `${element.type}.title` &&
        element.title === entry.sourceText
        ? { ...element, title: translatedText }
        : null;
    case "svg":
    case "lottie":
      return entry.field === `${element.type}.name` &&
        element.name === entry.sourceText
        ? { ...element, name: translatedText }
        : null;
    case "chart":
      return updateChartTranslationField(element, entry, translatedText);
    case "table":
      return updateTableTranslationField(element, entry, translatedText);
    case "qr":
    case "draw":
    case "path":
    case "shape":
      return null;
  }
}

function updateDocumentTranslationField(
  element: DocumentElement,
  entry: TranslationPackEntry,
  translatedText: string,
): DesignElement | null {
  if (entry.field === "document.title" && element.title === entry.sourceText) {
    return { ...element, title: translatedText };
  }

  const contentIndex = getIndexedField(entry.field, "document.blocks", ".content");
  if (contentIndex !== null) {
    const block = element.blocks[contentIndex];

    if (!block || block.content !== entry.sourceText) return null;

    return {
      ...element,
      blocks: element.blocks.map((item, index) =>
        index === contentIndex ? { ...item, content: translatedText } : item,
      ),
    };
  }

  const commentIndex = getIndexedField(entry.field, "document.blocks", ".comment");
  if (commentIndex !== null) {
    const block = element.blocks[commentIndex];

    if (!block || (block.comment ?? "") !== entry.sourceText) return null;

    return {
      ...element,
      blocks: element.blocks.map((item, index) =>
        index === commentIndex ? { ...item, comment: translatedText } : item,
      ),
    };
  }

  return null;
}

function updateEmbedTranslationField(
  element: Extract<DesignElement, { type: "embed" }>,
  entry: TranslationPackEntry,
  translatedText: string,
) {
  if (entry.field === "embed.title" && element.title === entry.sourceText) {
    return { ...element, title: translatedText };
  }

  if (
    entry.field === "embed.description" &&
    element.description === entry.sourceText
  ) {
    return { ...element, description: translatedText };
  }

  return null;
}

function updateFormTranslationField(
  element: FormElement,
  entry: TranslationPackEntry,
  translatedText: string,
): DesignElement | null {
  if (entry.field === "form.label" && element.label === entry.sourceText) {
    return { ...element, label: translatedText };
  }

  if (
    entry.field === "form.placeholder" &&
    element.placeholder === entry.sourceText
  ) {
    return { ...element, placeholder: translatedText };
  }

  const optionIndex = getIndexedField(entry.field, "form.options");

  if (
    optionIndex !== null &&
    element.options[optionIndex] === entry.sourceText
  ) {
    const options = [...element.options];

    options[optionIndex] = translatedText;

    return { ...element, options };
  }

  return null;
}

function updateChartTranslationField(
  element: ChartElement,
  entry: TranslationPackEntry,
  translatedText: string,
): DesignElement | null {
  const pointIndex = getIndexedField(entry.field, "chart.data", ".label");

  if (
    pointIndex === null ||
    element.data[pointIndex]?.label !== entry.sourceText
  ) {
    return null;
  }

  const data = [...element.data];

  data[pointIndex] = { ...data[pointIndex], label: translatedText };

  return { ...element, data };
}

function updateTableTranslationField(
  element: TableElement,
  entry: TranslationPackEntry,
  translatedText: string,
): DesignElement | null {
  const cellIndex = getIndexedField(entry.field, "table.cells");

  if (
    cellIndex === null ||
    element.cells[cellIndex] !== entry.sourceText ||
    element.cells[cellIndex].trim().startsWith("=")
  ) {
    return null;
  }

  const cells = [...element.cells];

  cells[cellIndex] = translatedText;

  return { ...element, cells };
}

function getIndexedField(field: string, prefix: string, suffix = "") {
  const match = field.match(
    new RegExp(`^${escapeRegExp(prefix)}\\.(\\d+)${escapeRegExp(suffix)}$`),
  );

  return match ? Number.parseInt(match[1], 10) : null;
}

function replacePage(
  document: DesignDocument,
  pageIndex: number,
  page: DesignPage,
) {
  const pages = [...document.pages];

  pages[pageIndex] = page;

  return { ...document, pages };
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
