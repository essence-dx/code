import { bytesToText, normalizePackagePath } from "@/features/workbooks/workbook-unsupported-part-codec";
import type { WorkbookUnsupportedPartKind } from "@/features/workbooks/types";

const INTERNAL_SHEETJS_ENTRY = "\u0001Sh33tJ5";

export const unsupportedRelationshipHints = [
  "activeX",
  "chart",
  "connections",
  "control",
  "ctrlProp",
  "customXml",
  "diagram",
  "drawing",
  "externalLink",
  "hyperlink",
  "image",
  "macrosheet",
  "oleObject",
  "printerSettings",
  "queryTable",
  "vmlDrawing",
];

export const workbookMarkupElements = ["externalReferences", "extLst"] as const;

export const worksheetMarkupElements = [
  "controls",
  "drawing",
  "legacyDrawing",
  "legacyDrawingHF",
  "oleObjects",
] as const;

export function hasUnsupportedRelationshipHint(value: string) {
  return unsupportedRelationshipHints.some((hint) =>
    value.toLowerCase().includes(hint.toLowerCase()),
  );
}

export function inferUnsupportedPartKind(
  path: string,
  content?: Uint8Array,
): WorkbookUnsupportedPartKind | null {
  const normalizedPath = normalizePackagePath(path);

  if (!normalizedPath || normalizedPath === INTERNAL_SHEETJS_ENTRY) {
    return null;
  }

  if (normalizedPath === "[Content_Types].xml") {
    return content && hasUnsupportedRelationshipHint(bytesToText(content))
      ? "content-type"
      : null;
  }

  if (normalizedPath.endsWith(".rels")) {
    return content && hasUnsupportedRelationshipHint(bytesToText(content))
      ? "package-relationship"
      : null;
  }

  if (
    normalizedPath === "xl/workbook.xml" &&
    content &&
    workbookMarkupElements.some((element) =>
      new RegExp(`<${element}\\b`).test(bytesToText(content)),
    )
  ) {
    return "workbook-markup";
  }

  if (
    /^xl\/worksheets\/sheet\d+\.xml$/i.test(normalizedPath) &&
    content &&
    worksheetMarkupElements.some((element) =>
      new RegExp(`<${element}\\b`).test(bytesToText(content)),
    )
  ) {
    return "worksheet-markup";
  }

  if (/^customXml\//i.test(normalizedPath)) {
    return "custom-xml";
  }

  if (/^xl\/externalLinks\//i.test(normalizedPath)) {
    return "external-link";
  }

  if (
    normalizedPath === "xl/connections.xml" ||
    /^xl\/queryTables\//i.test(normalizedPath)
  ) {
    return "workbook-connection";
  }

  if (/^xl\/embeddings\//i.test(normalizedPath)) {
    return "embedded-object";
  }

  if (/^xl\/ctrlProps\//i.test(normalizedPath)) {
    return "form-control";
  }

  if (/^xl\/activeX\//i.test(normalizedPath)) {
    return "activex-control";
  }

  if (/^xl\/macrosheets\//i.test(normalizedPath)) {
    return "macro-sheet";
  }

  if (/^xl\/charts\//i.test(normalizedPath)) {
    return "chart";
  }

  if (/^xl\/drawings\//i.test(normalizedPath)) {
    return "drawing";
  }

  if (/^xl\/media\//i.test(normalizedPath)) {
    return "media";
  }

  if (/^xl\/printerSettings\//i.test(normalizedPath)) {
    return "printer-setting";
  }

  return null;
}

export function normalizeUnsupportedPartKind(
  value: unknown,
): WorkbookUnsupportedPartKind {
  const kinds: WorkbookUnsupportedPartKind[] = [
    "custom-xml",
    "external-link",
    "workbook-connection",
    "embedded-object",
    "form-control",
    "activex-control",
    "macro-sheet",
    "chart",
    "drawing",
    "media",
    "printer-setting",
    "content-type",
    "package-relationship",
    "workbook-markup",
    "worksheet-markup",
    "unsupported-package-part",
  ];

  return kinds.includes(value as WorkbookUnsupportedPartKind)
    ? (value as WorkbookUnsupportedPartKind)
    : "unsupported-package-part";
}
