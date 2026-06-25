import JSZip from "jszip";

import {
  createPage,
  createTableElement,
  createTextElement,
} from "@/features/editor/document-factory";
import {
  clampTableColumns,
  clampTableRows,
  maxTableColumns,
  maxTableRows,
} from "@/features/editor/table";
import type { DesignElement, DesignPage, TextElement } from "@/features/editor/types";

export const acceptedDocxMimeTypes = [
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;
export const maxDocxImportBytes = 10 * 1024 * 1024;
export const maxDocxImportBlocks = 160;

type OutputSize = {
  width: number;
  height: number;
};

type DocxBlock =
  | {
      kind: "paragraph";
      text: string;
      fontSize: number;
      fontWeight: number;
      textAlign: TextElement["textAlign"];
    }
  | {
      kind: "table";
      rows: string[][];
    };

export type DocxImportResult =
  | {
      ok: true;
      pages: DesignPage[];
      importedBlocks: number;
      importedPages: number;
      truncated: boolean;
    }
  | {
      ok: false;
      message: string;
    };

export function isAcceptedDocxFile(file: File) {
  return (
    acceptedDocxMimeTypes.includes(
      file.type as (typeof acceptedDocxMimeTypes)[number],
    ) || file.name.toLowerCase().endsWith(".docx")
  );
}

export async function importDocxFileAsPages(
  file: File,
  output: OutputSize,
): Promise<DocxImportResult> {
  if (!isAcceptedDocxFile(file)) {
    return {
      ok: false,
      message: "Use a .docx document file to import editable pages.",
    };
  }

  if (file.size > maxDocxImportBytes) {
    return {
      ok: false,
      message: "DOCX imports are limited to 10 MB.",
    };
  }

  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const documentXml = await zip.file("word/document.xml")?.async("text");

  if (!documentXml) {
    return {
      ok: false,
      message: "This DOCX does not contain a readable document body.",
    };
  }

  const blocks = readDocumentBlocks(parseXml(documentXml));

  if (blocks.length === 0) {
    return {
      ok: false,
      message: "No readable paragraphs or tables were found in this DOCX.",
    };
  }

  const importedBlocks = blocks.slice(0, maxDocxImportBlocks);
  const pages = createPagesFromBlocks({
    blocks: importedBlocks,
    fileName: file.name,
    output,
  });

  return {
    ok: true,
    pages,
    importedBlocks: importedBlocks.length,
    importedPages: pages.length,
    truncated: blocks.length > maxDocxImportBlocks,
  };
}

function readDocumentBlocks(document: Document) {
  const body = findFirst(document, "body");

  if (!body) return [];

  return Array.from(body.children).flatMap((child): DocxBlock[] => {
    if (child.localName === "p") {
      const paragraph = readParagraphBlock(child);

      return paragraph ? [paragraph] : [];
    }

    if (child.localName === "tbl") {
      const table = readTableBlock(child);

      return table ? [table] : [];
    }

    return [];
  });
}

function readParagraphBlock(paragraph: Element): DocxBlock | null {
  const text = readParagraphText(paragraph).trim();

  if (!text) return null;

  const style = readParagraphStyle(paragraph);

  return {
    kind: "paragraph",
    text,
    fontSize: getParagraphFontSize(style),
    fontWeight: isHeadingStyle(style) || hasBoldRun(paragraph) ? 800 : 500,
    textAlign: readParagraphAlign(paragraph),
  };
}

function readTableBlock(table: Element): DocxBlock | null {
  const rows = findAll(table, "tr")
    .map((row) =>
      findAll(row, "tc")
        .map((cell) =>
          findAll(cell, "p")
            .map(readParagraphText)
            .map((text) => text.trim())
            .filter(Boolean)
            .join("\n"),
        )
        .filter((cell) => cell.length > 0),
    )
    .filter((row) => row.length > 0);

  return rows.length ? { kind: "table", rows } : null;
}

function createPagesFromBlocks(input: {
  blocks: DocxBlock[];
  fileName: string;
  output: OutputSize;
}) {
  const pages: DesignPage[] = [];
  const pageBaseName = input.fileName.replace(/\.docx$/i, "") || "DOCX";
  const marginX = Math.max(56, Math.round(input.output.width * 0.08));
  const marginY = Math.max(56, Math.round(input.output.height * 0.08));
  const contentWidth = Math.max(320, input.output.width - marginX * 2);
  const pageBottom = input.output.height - marginY;
  let elements: DesignElement[] = [];
  let cursorY = marginY;

  function pushPage() {
    if (elements.length === 0) return;

    pages.push(
      createPage({
        name: `${pageBaseName} ${pages.length + 1}`,
        background: "#ffffff",
        elements,
      }),
    );
    elements = [];
    cursorY = marginY;
  }

  for (const block of input.blocks) {
    const element = createElementForBlock({
      block,
      contentWidth,
      x: marginX,
      y: cursorY,
    });
    const gap = block.kind === "table" ? 28 : 18;

    if (cursorY + element.height > pageBottom && elements.length > 0) {
      pushPage();
      element.y = cursorY;
    }

    elements.push(element);
    cursorY += element.height + gap;
  }

  pushPage();

  return pages;
}

function createElementForBlock(input: {
  block: DocxBlock;
  contentWidth: number;
  x: number;
  y: number;
}): DesignElement {
  if (input.block.kind === "table") {
    const tableBlock = input.block;
    const rows = clampTableRows(tableBlock.rows.length);
    const columns = clampTableColumns(
      Math.max(...tableBlock.rows.map((row) => row.length)),
    );
    const cells = Array.from({ length: rows * columns }, (_, index) => {
      const rowIndex = Math.floor(index / columns);
      const columnIndex = index % columns;

      return tableBlock.rows[rowIndex]?.[columnIndex] ?? "";
    });

    return createTableElement({
      rows,
      columns,
      cells,
      x: input.x,
      y: input.y,
      width: Math.min(input.contentWidth, Math.max(420, columns * 150)),
      height: Math.min(560, Math.max(120, rows * 48)),
      headerRow: rows > 1,
    });
  }

  const paragraphBlock = input.block;
  const estimatedLines = estimateLineCount(paragraphBlock.text, input.contentWidth);
  const height = Math.max(
    paragraphBlock.fontSize * 1.55,
    estimatedLines * paragraphBlock.fontSize * 1.35,
  );

  return createTextElement({
    content: paragraphBlock.text,
    x: input.x,
    y: input.y,
    width: input.contentWidth,
    height: Math.ceil(height),
    fontSize: paragraphBlock.fontSize,
    fontWeight: paragraphBlock.fontWeight,
    lineHeight: 1.18,
    textAlign: paragraphBlock.textAlign,
  });
}

function readParagraphText(paragraph: Element) {
  return Array.from(paragraph.childNodes)
    .map((node) => readTextFromNode(node))
    .join("");
}

function readTextFromNode(node: ChildNode): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
  if (!(node instanceof Element)) return "";
  if (node.localName === "t") return node.textContent ?? "";
  if (node.localName === "tab") return " ";
  if (node.localName === "br") return "\n";

  return Array.from(node.childNodes).map(readTextFromNode).join("");
}

function readParagraphStyle(paragraph: Element) {
  return getAttribute(findFirst(paragraph, "pStyle"), "val") ?? "";
}

function readParagraphAlign(paragraph: Element): TextElement["textAlign"] {
  const alignment = getAttribute(findFirst(paragraph, "jc"), "val");

  if (alignment === "center") return "center";
  if (alignment === "right" || alignment === "end") return "right";

  return "left";
}

function getParagraphFontSize(style: string) {
  const normalized = style.toLowerCase();

  if (normalized.includes("heading1") || normalized === "title") return 38;
  if (normalized.includes("heading2")) return 30;
  if (normalized.includes("heading3")) return 24;

  return 18;
}

function isHeadingStyle(style: string) {
  return style.toLowerCase().includes("heading") || style === "Title";
}

function hasBoldRun(paragraph: Element) {
  return findAll(paragraph, "b").length > 0;
}

function estimateLineCount(text: string, width: number) {
  const averageCharacterWidth = 9;
  const charactersPerLine = Math.max(24, Math.floor(width / averageCharacterWidth));

  return text
    .split(/\r?\n/)
    .reduce(
      (total, line) =>
        total + Math.max(1, Math.ceil(line.length / charactersPerLine)),
      0,
    );
}

function findAll(root: ParentNode | null, localName: string) {
  if (!root) return [];

  return Array.from(root.querySelectorAll("*")).filter(
    (element) => element.localName === localName,
  );
}

function findFirst(root: ParentNode | null, localName: string) {
  return findAll(root, localName)[0] ?? null;
}

function parseXml(input: string) {
  const parser = new DOMParser();

  return parser.parseFromString(input, "application/xml");
}

function getAttribute(element: Element | null, localName: string) {
  if (!element) return null;

  for (const attribute of Array.from(element.attributes)) {
    if (attribute.localName === localName) return attribute.value;
  }

  return null;
}
