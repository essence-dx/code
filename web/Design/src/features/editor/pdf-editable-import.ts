import {
  createImageElement,
  createPage,
  createTextElement,
} from "@/features/editor/document-factory";
import type { DesignPage, TextElement } from "@/features/editor/types";

export type PdfEditableTextItem = {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontFamily?: string;
};

export type PdfEditablePageInput = {
  name: string;
  output: {
    width: number;
    height: number;
  };
  background: {
    src: string;
    alt: string;
    x: number;
    y: number;
    width: number;
    height: number;
  };
  textItems: PdfEditableTextItem[];
};

export type PdfEditablePageResult = {
  page: DesignPage;
  importedTextBlocks: number;
  importedImageBlocks: number;
  outlineItems: string[];
};

type PdfEditableLine = {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  kind: "heading" | "subheading" | "paragraph";
};

export function createEditablePdfPage(
  input: PdfEditablePageInput,
): PdfEditablePageResult {
  const lines = createEditablePdfLines(input.textItems);
  const outlineItems = lines
    .filter((line) => line.kind !== "paragraph")
    .slice(0, 12)
    .map((line) => line.text);
  const textElements = lines.map((line) =>
    createTextElement({
      content: line.text,
      x: line.x,
      y: line.y,
      width: line.width,
      height: line.height,
      fontSize: line.fontSize,
      fontFamily: "Geist",
      fontWeight: getLineFontWeight(line.kind),
      color: "#0f172a",
      lineHeight: 1.15,
      textAlign: "left",
    }),
  );

  return {
    page: createPage({
      name: input.name,
      background: "#ffffff",
      format: "document",
      width: input.output.width,
      height: input.output.height,
      notes: createPdfPageNotes(outlineItems, lines.length),
      elements: [
        createImageElement({
          src: input.background.src,
          alt: input.background.alt,
          x: input.background.x,
          y: input.background.y,
          width: input.background.width,
          height: input.background.height,
          objectFit: "contain",
          locked: true,
          opacity: textElements.length ? 0.28 : 1,
        }),
        ...textElements,
      ],
    }),
    importedTextBlocks: textElements.length,
    importedImageBlocks: 1,
    outlineItems,
  };
}

export function createEditablePdfLines(
  textItems: PdfEditableTextItem[],
): PdfEditableLine[] {
  const cleanItems = textItems
    .map(normalizeTextItem)
    .filter((item): item is PdfEditableTextItem => Boolean(item))
    .sort((a, b) => a.y - b.y || a.x - b.x);
  const groups: PdfEditableTextItem[][] = [];

  for (const item of cleanItems) {
    const previousGroup = groups[groups.length - 1];
    const previousAnchor = previousGroup
      ? getLineAnchorY(previousGroup)
      : Number.NaN;
    const tolerance = Math.max(4, item.fontSize * 0.38);

    if (previousGroup && Math.abs(item.y - previousAnchor) <= tolerance) {
      previousGroup.push(item);
    } else {
      groups.push([item]);
    }
  }

  const rawLines = groups
    .map(createLineFromGroup)
    .filter((line): line is Omit<PdfEditableLine, "kind"> => Boolean(line));
  const averageFontSize = rawLines.length
    ? rawLines.reduce((total, line) => total + line.fontSize, 0) /
      rawLines.length
    : 16;
  const largestFontSize = rawLines.reduce(
    (largest, line) => Math.max(largest, line.fontSize),
    0,
  );

  return rawLines.map((line) => ({
    ...line,
    kind: inferLineKind({ line, averageFontSize, largestFontSize }),
  }));
}

function normalizeTextItem(item: PdfEditableTextItem) {
  const text = item.text.replace(/\s+/g, " ").trim();
  const width = Math.max(8, Math.round(item.width));
  const height = Math.max(8, Math.round(item.height));

  if (!text || width <= 0 || height <= 0) return null;

  return {
    ...item,
    text,
    x: Math.round(item.x),
    y: Math.round(item.y),
    width,
    height,
    fontSize: clampNumber(Math.round(item.fontSize), 8, 96),
  };
}

function getLineAnchorY(group: PdfEditableTextItem[]) {
  return group.reduce((total, item) => total + item.y, 0) / group.length;
}

function createLineFromGroup(group: PdfEditableTextItem[]) {
  const sorted = [...group].sort((a, b) => a.x - b.x);
  const first = sorted[0];

  if (!first) return null;

  const x = Math.min(...sorted.map((item) => item.x));
  const y = Math.min(...sorted.map((item) => item.y));
  const right = Math.max(...sorted.map((item) => item.x + item.width));
  const bottom = Math.max(...sorted.map((item) => item.y + item.height));
  const fontSize = Math.round(
    sorted.reduce((total, item) => total + item.fontSize, 0) / sorted.length,
  );

  return {
    text: joinLineText(sorted),
    x,
    y,
    width: Math.max(24, right - x),
    height: Math.max(fontSize * 1.25, bottom - y),
    fontSize,
  };
}

function joinLineText(items: PdfEditableTextItem[]) {
  return items.reduce((line, item, index) => {
    if (index === 0) return item.text;

    const previous = items[index - 1];
    const gap = previous ? item.x - (previous.x + previous.width) : 0;
    const needsSpace =
      gap > item.fontSize * 0.18 &&
      !line.endsWith(" ") &&
      !item.text.startsWith(" ");

    return `${line}${needsSpace ? " " : ""}${item.text}`;
  }, "");
}

function inferLineKind(input: {
  line: Omit<PdfEditableLine, "kind">;
  averageFontSize: number;
  largestFontSize: number;
}): PdfEditableLine["kind"] {
  const { line, averageFontSize, largestFontSize } = input;

  if (
    line.fontSize >= Math.max(22, averageFontSize * 1.28) ||
    line.fontSize >= largestFontSize * 0.94
  ) {
    return "heading";
  }

  if (line.fontSize >= Math.max(17, averageFontSize * 1.12)) {
    return "subheading";
  }

  return "paragraph";
}

function getLineFontWeight(kind: PdfEditableLine["kind"]): TextElement["fontWeight"] {
  if (kind === "heading") return 800;
  if (kind === "subheading") return 700;

  return 500;
}

function createPdfPageNotes(outlineItems: string[], importedTextBlocks: number) {
  const lines = [
    `PDF editable import: ${importedTextBlocks} text blocks reconstructed.`,
  ];

  if (outlineItems.length) {
    lines.push("Reconstructed outline:");
    lines.push(...outlineItems.map((item) => `- ${item}`));
  } else {
    lines.push("No heading-sized outline text was detected on this page.");
  }

  return lines.join("\n");
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
