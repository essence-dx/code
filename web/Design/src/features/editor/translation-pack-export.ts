import { getEditorLocale, type EditorLocale } from "@/features/editor/editor-localization";
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
  type TranslationPack,
  type TranslationPackEntry,
} from "@/features/editor/translation-pack-types";

export function createTranslationPackJson({
  document,
  projectName,
  targetLocale = "",
}: {
  document: DesignDocument;
  projectName: string;
  targetLocale?: EditorLocale | "";
}) {
  const sourceLocale = getEditorLocale(document.metadata?.editorLocale);
  const pack: TranslationPack = {
    kind: translationPackKind,
    version: 1,
    projectName,
    sourceLocale,
    targetLocale,
    exportedAt: new Date().toISOString(),
    entries: collectTranslationEntries(document),
  };

  return JSON.stringify(pack, null, 2);
}

function collectTranslationEntries(document: DesignDocument) {
  const entries: TranslationPackEntry[] = [];

  document.pages.forEach((page) => {
    addEntry(entries, {
      page,
      field: "page.name",
      label: `${page.name} page name`,
      sourceText: page.name,
    });
    addEntry(entries, {
      page,
      field: "page.notes",
      label: `${page.name} speaker notes`,
      sourceText: page.notes ?? "",
    });
    addEntry(entries, {
      page,
      field: "page.websiteSeoTitle",
      label: `${page.name} website SEO title`,
      sourceText: page.websiteSeoTitle ?? "",
    });
    addEntry(entries, {
      page,
      field: "page.websiteSeoDescription",
      label: `${page.name} website SEO description`,
      sourceText: page.websiteSeoDescription ?? "",
    });
    addEntry(entries, {
      page,
      field: "page.websiteNavLabel",
      label: `${page.name} website navigation label`,
      sourceText: page.websiteNavLabel ?? "",
    });
    addEntry(entries, {
      page,
      field: "page.websiteNavGroup",
      label: `${page.name} website menu group`,
      sourceText: page.websiteNavGroup ?? "",
    });

    page.elements.forEach((element) => {
      collectElementEntries(entries, page, element);
    });
  });

  return entries;
}

function collectElementEntries(
  entries: TranslationPackEntry[],
  page: DesignPage,
  element: DesignElement,
) {
  switch (element.type) {
    case "text":
      addEntry(entries, {
        page,
        element,
        field: "text.content",
        label: `${page.name} text layer`,
        sourceText: element.content,
      });
      return;
    case "document":
      collectDocumentEntries(entries, page, element);
      return;
    case "sticky-note":
      addEntry(entries, {
        page,
        element,
        field: "sticky-note.content",
        label: `${page.name} sticky note`,
        sourceText: element.content,
      });
      return;
    case "connector":
      addEntry(entries, {
        page,
        element,
        field: "connector.label",
        label: `${page.name} connector label`,
        sourceText: element.label,
      });
      return;
    case "form":
      collectFormEntries(entries, page, element);
      return;
    case "embed":
      addEntry(entries, {
        page,
        element,
        field: "embed.title",
        label: `${page.name} embed title`,
        sourceText: element.title,
      });
      addEntry(entries, {
        page,
        element,
        field: "embed.description",
        label: `${page.name} embed description`,
        sourceText: element.description,
      });
      return;
    case "timer":
      addEntry(entries, {
        page,
        element,
        field: "timer.label",
        label: `${page.name} timer label`,
        sourceText: element.label,
      });
      return;
    case "image":
      addEntry(entries, {
        page,
        element,
        field: "image.alt",
        label: `${page.name} image alt text`,
        sourceText: element.alt,
      });
      return;
    case "video":
    case "audio":
    case "pdf":
      addEntry(entries, {
        page,
        element,
        field: `${element.type}.title`,
        label: `${page.name} ${element.type} title`,
        sourceText: element.title,
      });
      return;
    case "svg":
    case "lottie":
      addEntry(entries, {
        page,
        element,
        field: `${element.type}.name`,
        label: `${page.name} ${element.type} name`,
        sourceText: element.name,
      });
      return;
    case "chart":
      collectChartEntries(entries, page, element);
      return;
    case "table":
      collectTableEntries(entries, page, element);
      return;
    case "qr":
    case "draw":
    case "path":
    case "shape":
      return;
  }
}

function collectDocumentEntries(
  entries: TranslationPackEntry[],
  page: DesignPage,
  element: DocumentElement,
) {
  addEntry(entries, {
    page,
    element,
    field: "document.title",
    label: `${page.name} document title`,
    sourceText: element.title,
  });
  element.blocks.forEach((block, index) => {
    if (block.kind === "page-break") return;

    addEntry(entries, {
      page,
      element,
      field: `document.blocks.${index}.content`,
      label: `${page.name} document block ${index + 1}`,
      sourceText: block.content,
    });

    if (block.comment) {
      addEntry(entries, {
        page,
        element,
        field: `document.blocks.${index}.comment`,
        label: `${page.name} document block ${index + 1} comment`,
        sourceText: block.comment,
      });
    }
  });
}

function collectFormEntries(
  entries: TranslationPackEntry[],
  page: DesignPage,
  element: FormElement,
) {
  addEntry(entries, {
    page,
    element,
    field: "form.label",
    label: `${page.name} form label`,
    sourceText: element.label,
  });
  addEntry(entries, {
    page,
    element,
    field: "form.placeholder",
    label: `${page.name} form placeholder`,
    sourceText: element.placeholder,
  });
  element.options.forEach((option, index) => {
    addEntry(entries, {
      page,
      element,
      field: `form.options.${index}`,
      label: `${page.name} form option ${index + 1}`,
      sourceText: option,
    });
  });
}

function collectChartEntries(
  entries: TranslationPackEntry[],
  page: DesignPage,
  element: ChartElement,
) {
  element.data.forEach((point, index) => {
    addEntry(entries, {
      page,
      element,
      field: `chart.data.${index}.label`,
      label: `${page.name} chart label ${index + 1}`,
      sourceText: point.label,
    });
  });
}

function collectTableEntries(
  entries: TranslationPackEntry[],
  page: DesignPage,
  element: TableElement,
) {
  element.cells.forEach((cell, index) => {
    if (cell.trim().startsWith("=")) return;

    addEntry(entries, {
      page,
      element,
      field: `table.cells.${index}`,
      label: `${page.name} table cell ${index + 1}`,
      sourceText: cell,
    });
  });
}

function addEntry(
  entries: TranslationPackEntry[],
  input: {
    page: DesignPage;
    element?: DesignElement;
    field: string;
    label: string;
    sourceText: string;
  },
) {
  const sourceText = input.sourceText.trim();

  if (!sourceText) {
    return;
  }

  entries.push({
    id: [input.page.id, input.element?.id, input.field].filter(Boolean).join(":"),
    pageId: input.page.id,
    pageName: input.page.name,
    elementId: input.element?.id,
    elementType: input.element?.type,
    field: input.field,
    label: input.label,
    sourceText: input.sourceText,
    translatedText: "",
  });
}
