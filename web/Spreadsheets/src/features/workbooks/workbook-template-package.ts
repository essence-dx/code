import * as XLSX from "xlsx";
import {
  bytesToText,
  normalizePackagePath,
  rawContentToBytes,
  textToBytes,
  toArrayBuffer,
} from "@/features/workbooks/workbook-unsupported-part-codec";
import type { WorkbookProtection } from "@/features/workbooks/types";

export type OoxmlWorkbookFormat = "xlsx" | "xlsm" | "xltx" | "xltm";

const sheetWorkbookContentType =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml";
const macroWorkbookContentType =
  "application/vnd.ms-excel.sheet.macroEnabled.main+xml";
const templateWorkbookContentType =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.template.main+xml";
const macroTemplateWorkbookContentType =
  "application/vnd.ms-excel.template.macroEnabled.main+xml";

function readCfbFile(cfb: unknown, path: string): { content?: unknown } | null {
  const normalizedPath = normalizePackagePath(path);

  return (
    XLSX.CFB.find(cfb, `/${normalizedPath}`) ??
    XLSX.CFB.find(cfb, normalizedPath)
  );
}

export function readOoxmlPackageText(cfb: unknown, path: string) {
  const bytes = rawContentToBytes(readCfbFile(cfb, path)?.content);

  return bytes ? bytesToText(bytes) : "";
}

function setOoxmlPackageText(cfb: unknown, path: string, value: string) {
  XLSX.CFB.utils.cfb_add(cfb, `/${normalizePackagePath(path)}`, textToBytes(value));
}

function writeOoxmlPackage(cfb: unknown) {
  return toArrayBuffer(
    XLSX.CFB.write(cfb, {
      fileType: "zip",
      type: "array",
    }),
  );
}

export function readOoxmlPackage(buffer: ArrayBuffer) {
  return XLSX.CFB.read(new Uint8Array(buffer), { type: "buffer" });
}

function getWorkbookTemplateContentType(format: "xltx" | "xltm") {
  return format === "xltm"
    ? macroTemplateWorkbookContentType
    : templateWorkbookContentType;
}

export function markWorkbookPackageAsTemplate({
  buffer,
  format,
}: {
  buffer: ArrayBuffer;
  format: "xltx" | "xltm";
}) {
  const cfb = readOoxmlPackage(buffer);
  const contentTypesXml = readOoxmlPackageText(cfb, "[Content_Types].xml");
  const workbookContentType = getWorkbookTemplateContentType(format);
  const nextXml = contentTypesXml.replace(
    /(<Override\b(?=[^>]*\bPartName="\/?xl\/workbook\.xml")[^>]*\bContentType=")[^"]+("[^>]*\/>)/i,
    `$1${workbookContentType}$2`,
  );

  if (!nextXml || nextXml === contentTypesXml) {
    return buffer;
  }

  setOoxmlPackageText(cfb, "[Content_Types].xml", nextXml);
  return writeOoxmlPackage(cfb);
}

function readXmlAttributes(source: string) {
  const attributes = new Map<string, string>();
  const pattern = /([A-Za-z_:][\w:.-]*)="([^"]*)"/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(source)) !== null) {
    attributes.set(match[1] ?? "", match[2] ?? "");
  }

  return attributes;
}

function getBooleanAttribute(attributes: Map<string, string>, name: string) {
  const value = attributes.get(name);

  return value === "1" || value?.toLowerCase() === "true";
}

function getNumberAttribute(attributes: Map<string, string>, name: string) {
  const value = Number(attributes.get(name));

  return Number.isFinite(value) && value > 0 ? Math.floor(value) : undefined;
}

export function detectEncryptedOoxmlPackage(buffer: ArrayBuffer) {
  try {
    const cfb = XLSX.CFB.read(new Uint8Array(buffer), { type: "buffer" });

    return Boolean(readCfbFile(cfb, "EncryptedPackage"));
  } catch {
    return false;
  }
}

export function getWorkbookProtectionFromPackage({
  buffer,
  sourceFormat,
}: {
  buffer: ArrayBuffer;
  sourceFormat: OoxmlWorkbookFormat;
}): WorkbookProtection | null {
  let cfb: unknown;

  try {
    cfb = readOoxmlPackage(buffer);
  } catch {
    return null;
  }

  if (detectEncryptedOoxmlPackage(buffer)) {
    return {
      protectedAt: new Date().toISOString(),
      importedFrom: sourceFormat,
      lockStructure: true,
      source: "encrypted-package",
    };
  }

  const workbookXml = readOoxmlPackageText(cfb, "xl/workbook.xml");
  const match = /<workbookProtection\b([^>]*)\/?>/i.exec(workbookXml);

  if (!match) {
    return null;
  }

  const attributes = readXmlAttributes(match[1] ?? "");
  const spinCount = getNumberAttribute(attributes, "spinCount");

  return {
    protectedAt: new Date().toISOString(),
    importedFrom: sourceFormat,
    source: "imported-ooxml",
    ...(attributes.get("algorithmName")
      ? { algorithmName: attributes.get("algorithmName")?.slice(0, 80) }
      : {}),
    ...(attributes.get("hashValue")
      ? { hashValue: attributes.get("hashValue")?.slice(0, 300) }
      : {}),
    ...(attributes.get("workbookPassword")
      ? { legacyPasswordHash: attributes.get("workbookPassword")?.slice(0, 80) }
      : {}),
    ...(getBooleanAttribute(attributes, "lockStructure")
      ? { lockStructure: true }
      : {}),
    ...(getBooleanAttribute(attributes, "lockWindows")
      ? { lockWindows: true }
      : {}),
    ...(attributes.get("saltValue")
      ? { saltValue: attributes.get("saltValue")?.slice(0, 300) }
      : {}),
    ...(spinCount ? { spinCount } : {}),
  };
}

export function getWorkbookMainContentType(buffer: ArrayBuffer) {
  const cfb = readOoxmlPackage(buffer);
  const contentTypesXml = readOoxmlPackageText(cfb, "[Content_Types].xml");
  const match =
    /<Override\b(?=[^>]*\bPartName="\/?xl\/workbook\.xml")[^>]*\bContentType="([^"]+)"/i.exec(
      contentTypesXml,
    );

  return match?.[1] ?? "";
}

export function workbookContentTypeIsTemplate(contentType: string) {
  return (
    contentType === templateWorkbookContentType ||
    contentType === macroTemplateWorkbookContentType
  );
}

export function workbookContentTypeIsMacro(contentType: string) {
  return (
    contentType === macroWorkbookContentType ||
    contentType === macroTemplateWorkbookContentType
  );
}

export function workbookContentTypeIsSheet(contentType: string) {
  return (
    contentType === sheetWorkbookContentType ||
    contentType === macroWorkbookContentType ||
    contentType === templateWorkbookContentType ||
    contentType === macroTemplateWorkbookContentType
  );
}
