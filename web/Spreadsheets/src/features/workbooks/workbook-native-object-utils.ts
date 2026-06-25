import { normalizePackagePath } from "@/features/workbooks/workbook-unsupported-part-codec";
import type {
  WorkbookNativeObjectAnchor,
  WorkbookNativeObjectKind,
} from "@/features/workbooks/types";

export function nativeObjectKindLabel(kind: WorkbookNativeObjectKind) {
  return {
    chart: "Native chart",
    connector: "Native connector",
    drawing: "Native drawing",
    formControl: "Native form control",
    icon: "Native icon",
    image: "Native image",
    oleObject: "Native embedded object",
    shape: "Native shape",
  }[kind];
}

export function normalizeNativeObjectKind(
  value: unknown,
): WorkbookNativeObjectKind | null {
  return value === "chart" ||
    value === "connector" ||
    value === "icon" ||
    value === "image" ||
    value === "oleObject" ||
    value === "formControl" ||
    value === "shape" ||
    value === "drawing"
    ? value
    : null;
}

export function normalizePackagePaths(
  paths: Array<string | undefined> | undefined,
) {
  return Array.from(
    new Set(
      (paths ?? [])
        .filter((path): path is string => typeof path === "string")
        .map((path) => normalizePackagePath(path).slice(0, 240))
        .filter(Boolean),
    ),
  ).slice(0, 24);
}

export function normalizeAnchor(
  anchor: WorkbookNativeObjectAnchor,
): WorkbookNativeObjectAnchor {
  return {
    ...normalizeAnchorIndex(anchor.fromColumnIndex, "fromColumnIndex"),
    ...normalizeAnchorIndex(anchor.fromRowIndex, "fromRowIndex"),
    ...normalizeAnchorIndex(anchor.toColumnIndex, "toColumnIndex"),
    ...normalizeAnchorIndex(anchor.toRowIndex, "toRowIndex"),
  };
}

export function cleanText(value: unknown, fallback: string, limit: number) {
  return typeof value === "string"
    ? value.replace(/\s+/g, " ").trim().slice(0, limit) || fallback
    : fallback;
}

export function decodeXml(value: string) {
  return value
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function normalizeAnchorIndex(
  value: unknown,
  key: keyof WorkbookNativeObjectAnchor,
) {
  const index = Number(value);

  return Number.isInteger(index) && index >= 0 ? { [key]: index } : {};
}
