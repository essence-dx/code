import * as XLSX from "xlsx";
import {
  bytesToText,
  bytesToBase64,
  normalizePackagePath,
  rawContentToBytes,
} from "@/features/workbooks/workbook-unsupported-part-codec";
import {
  inferUnsupportedPartKind,
  normalizeUnsupportedPartKind,
} from "@/features/workbooks/workbook-unsupported-part-classification";
import { applyUnsupportedWorkbookPartsToBuffer } from "@/features/workbooks/workbook-unsupported-part-merge";
import type {
  WorkbookUnsupportedPart,
  WorkbookUnsupportedPartKind,
} from "@/features/workbooks/types";

type RawWorkbookFile = {
  content?: unknown;
  ctype?: string;
  name?: string;
  size?: number;
};

type WorkbookWithPackageFiles = XLSX.WorkBook & {
  files?: Record<string, RawWorkbookFile>;
  keys?: string[];
};

const MAX_UNSUPPORTED_PARTS = 600;
const MAX_UNSUPPORTED_PART_BYTES = 8_000_000;
const MAX_UNSUPPORTED_TOTAL_BYTES = 28_000_000;

function id(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function nowIso() {
  return new Date().toISOString();
}

function safeText(value: unknown, fallback: string, limit: number) {
  return typeof value === "string"
    ? value.trim().slice(0, limit) || fallback
    : fallback;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function readXmlAttributes(value: string) {
  const attributes = new Map<string, string>();
  const pattern = /([A-Za-z_:][\w:.-]*)="([^"]*)"/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(value)) !== null) {
    attributes.set(match[1] ?? "", match[2] ?? "");
  }

  return attributes;
}

function getPackageFile(
  files: Record<string, RawWorkbookFile>,
  path: string,
) {
  const normalizedPath = normalizePackagePath(path);

  return files[normalizedPath] ?? files[`/${normalizedPath}`] ?? null;
}

function getPackageText(files: Record<string, RawWorkbookFile>, path: string) {
  const bytes = rawContentToBytes(getPackageFile(files, path)?.content);

  return bytes ? bytesToText(bytes) : "";
}

function getMacroSheetRelationshipIds(
  files: Record<string, RawWorkbookFile>,
) {
  const relationshipXml = getPackageText(files, "xl/_rels/workbook.xml.rels");
  const ids = new Set<string>();
  const pattern = /<Relationship\b([^>]*)\/>/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(relationshipXml)) !== null) {
    const attributes = readXmlAttributes(match[1] ?? "");
    const id = attributes.get("Id") ?? "";
    const type = attributes.get("Type") ?? "";
    const target = attributes.get("Target") ?? "";

    if (
      id &&
      (type.toLowerCase().includes("macrosheet") ||
        target.toLowerCase().includes("macrosheets/"))
    ) {
      ids.add(id);
    }
  }

  return ids;
}

function workbookXmlReferencesMacroSheet(
  bytes: Uint8Array,
  relationshipIds: Set<string>,
) {
  if (relationshipIds.size === 0) {
    return false;
  }

  const xml = bytesToText(bytes);

  return Array.from(relationshipIds).some((relationshipId) =>
    new RegExp(`<sheet\\b[^>]*\\br:id="${escapeRegExp(relationshipId)}"`).test(xml),
  );
}

export function createUnsupportedWorkbookPart({
  binarySize,
  contentType,
  dataBase64,
  importedAt,
  kind,
  path,
  relationshipType,
  sourceFormat,
}: Omit<WorkbookUnsupportedPart, "id">): WorkbookUnsupportedPart {
  return {
    id: id("part"),
    path: normalizePackagePath(path).slice(0, 240),
    kind,
    sourceFormat,
    importedAt: importedAt || nowIso(),
    binarySize: Math.max(0, Math.floor(binarySize)),
    ...(contentType ? { contentType: contentType.slice(0, 160) } : {}),
    ...(relationshipType
      ? { relationshipType: relationshipType.slice(0, 240) }
      : {}),
    dataBase64,
  };
}

export function normalizeUnsupportedWorkbookParts(
  value: unknown,
): WorkbookUnsupportedPart[] {
  if (!Array.isArray(value)) {
    return [];
  }

  let totalBytes = 0;
  const seenPaths = new Set<string>();

  return value
    .flatMap((item) => {
      if (typeof item !== "object" || item === null) {
        return [];
      }

      const candidate = item as Partial<WorkbookUnsupportedPart>;
      const path = normalizePackagePath(safeText(candidate.path, "", 240));
      const binarySize = Math.max(
        0,
        Math.floor(Number(candidate.binarySize) || 0),
      );
      const dataBase64 = safeText(candidate.dataBase64, "", 12_000_000);
      const sourceFormat: WorkbookUnsupportedPart["sourceFormat"] =
        candidate.sourceFormat === "xlsm" ? "xlsm" : "xlsx";

      if (
        !path ||
        !dataBase64 ||
        seenPaths.has(path) ||
        binarySize > MAX_UNSUPPORTED_PART_BYTES ||
        totalBytes + binarySize > MAX_UNSUPPORTED_TOTAL_BYTES
      ) {
        return [];
      }

      totalBytes += binarySize;
      seenPaths.add(path);

      return [
        {
          id: safeText(candidate.id, id("part"), 80),
          path,
          kind: normalizeUnsupportedPartKind(candidate.kind),
          sourceFormat,
          importedAt: safeText(candidate.importedAt, nowIso(), 40),
          binarySize,
          ...(candidate.contentType
            ? { contentType: safeText(candidate.contentType, "", 160) }
            : {}),
          ...(candidate.relationshipType
            ? {
                relationshipType: safeText(
                  candidate.relationshipType,
                  "",
                  240,
                ),
              }
            : {}),
          dataBase64,
        },
      ];
    })
    .slice(0, MAX_UNSUPPORTED_PARTS);
}

export function getUnsupportedWorkbookParts(
  workbook: XLSX.WorkBook,
  sourceFormat: "xlsx" | "xlsm",
): WorkbookUnsupportedPart[] {
  const packageWorkbook = workbook as WorkbookWithPackageFiles;

  if (!packageWorkbook.files) {
    return [];
  }

  let totalBytes = 0;
  const paths = packageWorkbook.keys ?? Object.keys(packageWorkbook.files);
  const macroSheetRelationshipIds = getMacroSheetRelationshipIds(
    packageWorkbook.files,
  );

  return paths
    .flatMap((rawPath) => {
      const path = normalizePackagePath(rawPath);
      const file = packageWorkbook.files?.[rawPath] ?? packageWorkbook.files?.[path];
      const bytes = rawContentToBytes(file?.content);
      let kind: WorkbookUnsupportedPartKind | null = bytes
        ? inferUnsupportedPartKind(path, bytes)
        : null;

      if (
        !kind &&
        path === "xl/workbook.xml" &&
        bytes &&
        workbookXmlReferencesMacroSheet(bytes, macroSheetRelationshipIds)
      ) {
        kind = "workbook-markup";
      }

      if (
        !file ||
        !bytes ||
        !kind ||
        path === "xl/vbaProject.bin" ||
        bytes.byteLength > MAX_UNSUPPORTED_PART_BYTES ||
        totalBytes + bytes.byteLength > MAX_UNSUPPORTED_TOTAL_BYTES
      ) {
        return [];
      }

      totalBytes += bytes.byteLength;

      return [
        createUnsupportedWorkbookPart({
          binarySize: bytes.byteLength,
          contentType: file.ctype,
          dataBase64: bytesToBase64(bytes),
          importedAt: nowIso(),
          kind,
          path,
          sourceFormat,
        }),
      ];
    })
    .slice(0, MAX_UNSUPPORTED_PARTS);
}

export { applyUnsupportedWorkbookPartsToBuffer };
