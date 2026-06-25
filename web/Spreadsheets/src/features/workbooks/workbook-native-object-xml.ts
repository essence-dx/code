import { normalizePackagePath } from "@/features/workbooks/workbook-unsupported-part-codec";
import {
  decodeXml,
  nativeObjectKindLabel,
} from "@/features/workbooks/workbook-native-object-utils";
import type {
  WorkbookNativeObjectAnchor,
  WorkbookNativeObjectKind,
} from "@/features/workbooks/types";

export type Relationship = {
  id: string;
  target: string;
  targetPath: string;
  type: string;
};

export type DrawingAnchor = {
  anchor?: WorkbookNativeObjectAnchor;
  xml: string;
};

export type DrawingObjectInput = {
  description?: string;
  kind: WorkbookNativeObjectKind;
  name: string;
  relationship?: Relationship;
};

export function getDrawingObjects(
  xml: string,
  relationships: Map<string, Relationship>,
): DrawingObjectInput[] {
  const objects: DrawingObjectInput[] = [];
  const elementPattern =
    /<xdr:(?:graphicFrame|pic|sp|cxnSp|oleObj|control)\b[\s\S]*?<\/xdr:(?:graphicFrame|pic|sp|cxnSp|oleObj|control)>/g;

  for (const match of xml.matchAll(elementPattern)) {
    const element = match[0] ?? "";
    const chartId = relationshipIdFromAttribute(
      element,
      /<c:chart\b[^>]*r:id="([^"]+)"/,
    );
    const imageId = relationshipIdFromAttribute(
      element,
      /<a:blip\b[^>]*r:embed="([^"]+)"/,
    );
    const oleId = relationshipIdFromAttribute(element, /\br:id="([^"]+)"/);
    const relationship = relationships.get(chartId ?? imageId ?? oleId ?? "");
    const relationshipType = (relationship?.type ?? "").toLowerCase();
    const imageKind = getImageDrawingKind(element, relationship);
    const kind =
      chartId || relationshipType.includes("chart")
        ? "chart"
        : imageKind
          ? imageKind
          : element.includes(":oleObj") ||
              relationshipType.includes("oleobject")
            ? "oleObject"
            : element.includes(":control") ||
                relationshipType.includes("control")
              ? "formControl"
              : element.includes(":cxnSp")
                ? "connector"
                : element.includes(":sp")
                  ? "shape"
                  : "drawing";

    objects.push({
      kind,
      name: drawingObjectName(element, nativeObjectKindLabel(kind)),
      description: drawingObjectDescription(element),
      relationship,
    });
  }

  return objects;
}

export function getDrawingAnchors(xml: string): DrawingAnchor[] {
  const pattern =
    /<xdr:(?:twoCellAnchor|oneCellAnchor|absoluteAnchor)\b[\s\S]*?<\/xdr:(?:twoCellAnchor|oneCellAnchor|absoluteAnchor)>/g;

  return Array.from(xml.matchAll(pattern), (match) => {
    const anchorXml = match[0] ?? "";

    return {
      anchor: readAnchor(anchorXml),
      xml: anchorXml,
    };
  });
}

export function getRelationshipReferences(xml: string) {
  const references: Array<{ id: string; name?: string }> = [];
  const relationshipPattern =
    /<(drawing|legacyDrawing|legacyDrawingHF)\b[^>]*r:id="([^"]+)"[^>]*\/>/g;

  for (const match of xml.matchAll(relationshipPattern)) {
    references.push({ id: match[2] ?? "" });
  }

  const objectPattern = /<(oleObject|control)\b([^>]*)\/?>/g;

  for (const match of xml.matchAll(objectPattern)) {
    const attributes = match[2] ?? "";
    const id = /r:id="([^"]+)"/.exec(attributes)?.[1];

    if (id) {
      references.push({
        id,
        name:
          /name="([^"]+)"/.exec(attributes)?.[1] ??
          /progId="([^"]+)"/.exec(attributes)?.[1],
      });
    }
  }

  return references.filter((reference) => reference.id);
}

export function readRelationships({
  basePath,
  packageText,
  path,
}: {
  basePath: string;
  packageText: Map<string, string>;
  path: string;
}) {
  const xml = packageText.get(path) ?? "";
  const relationships = new Map<string, Relationship>();
  const pattern = /<Relationship\b([^>]*)\/>/g;

  for (const match of xml.matchAll(pattern)) {
    const attributes = readAttributes(match[1] ?? "");
    const id = attributes.get("Id") ?? "";
    const target = attributes.get("Target") ?? "";
    const type = attributes.get("Type") ?? "";

    if (!id || !target) {
      continue;
    }

    relationships.set(id, {
      id,
      target,
      targetPath: resolvePackageTarget(basePath, target),
      type,
    });
  }

  return relationships;
}

export function relationshipKind(
  relationship: Relationship,
): WorkbookNativeObjectKind | null {
  const value = `${relationship.type} ${relationship.target}`.toLowerCase();

  if (value.includes("drawing") || value.includes("vmldrawing")) {
    return "drawing";
  }

  if (value.includes("chart")) {
    return "chart";
  }

  if (value.includes("image")) {
    return "image";
  }

  if (value.includes("oleobject")) {
    return "oleObject";
  }

  if (value.includes("control") || value.includes("ctrlprop")) {
    return "formControl";
  }

  return null;
}

export function worksheetIndexFromPath(path: string) {
  const match = /^xl\/worksheets\/sheet(\d+)\.xml$/i.exec(path);
  const index = Number(match?.[1]);

  return Number.isInteger(index) && index > 0 ? index - 1 : null;
}

export function worksheetRelationshipPath(path: string) {
  const fileName = path.split("/").at(-1) ?? path;

  return `xl/worksheets/_rels/${fileName}.rels`;
}

export function drawingRelationshipPath(path: string) {
  const fileName = path.split("/").at(-1) ?? path;

  return `${drawingBasePath(path)}/_rels/${fileName}.rels`;
}

export function drawingBasePath(path: string) {
  return path.split("/").slice(0, -1).join("/");
}

function readAnchor(xml: string): WorkbookNativeObjectAnchor | undefined {
  const fromXml = firstElement(xml, "xdr:from");
  const toXml = firstElement(xml, "xdr:to");
  const anchor: WorkbookNativeObjectAnchor = {
    ...readAnchorPoint(fromXml, "from"),
    ...readAnchorPoint(toXml, "to"),
  };

  return Object.keys(anchor).length > 0 ? anchor : undefined;
}

function readAnchorPoint(
  xml: string,
  prefix: "from" | "to",
): WorkbookNativeObjectAnchor {
  const columnIndex = readNumberElement(xml, "xdr:col");
  const rowIndex = readNumberElement(xml, "xdr:row");

  return {
    ...(columnIndex !== null
      ? prefix === "from"
        ? { fromColumnIndex: columnIndex }
        : { toColumnIndex: columnIndex }
      : {}),
    ...(rowIndex !== null
      ? prefix === "from"
        ? { fromRowIndex: rowIndex }
        : { toRowIndex: rowIndex }
      : {}),
  };
}

function firstElement(xml: string, name: string) {
  return new RegExp(`<${name}\\b[\\s\\S]*?<\\/${name}>`).exec(xml)?.[0] ?? "";
}

function readNumberElement(xml: string, name: string) {
  const match = new RegExp(`<${name}>(\\d+)<\\/${name}>`).exec(xml);
  const value = Number(match?.[1]);

  return Number.isInteger(value) && value >= 0 ? value : null;
}

function relationshipIdFromAttribute(xml: string, pattern: RegExp) {
  return pattern.exec(xml)?.[1];
}

function getImageDrawingKind(
  xml: string,
  relationship: Relationship | undefined,
): "icon" | "image" | null {
  const relationshipType = (relationship?.type ?? "").toLowerCase();
  const target = (relationship?.target ?? relationship?.targetPath ?? "").toLowerCase();
  const name = drawingObjectName(xml, "");
  const description = drawingObjectDescription(xml) ?? "";
  const objectText = `${name} ${description}`.toLowerCase();
  const isImage =
    xml.includes(":pic") ||
    xml.includes("<a:blip") ||
    relationshipType.includes("image");

  if (!isImage) {
    return null;
  }

  return target.endsWith(".svg") || objectText.includes("icon") ? "icon" : "image";
}

function drawingObjectName(xml: string, fallback: string) {
  const name = /\bname="([^"]+)"/.exec(xml)?.[1];

  return name ? decodeXml(name) : fallback;
}

function drawingObjectDescription(xml: string) {
  const description = /\bdescr="([^"]+)"/.exec(xml)?.[1];
  const geometry = /\bprst="([^"]+)"/.exec(xml)?.[1];

  if (description) {
    return decodeXml(description);
  }

  return geometry ? `Preset geometry: ${decodeXml(geometry)}` : undefined;
}

function readAttributes(value: string) {
  const attributes = new Map<string, string>();
  const pattern = /([A-Za-z_:][\w:.-]*)="([^"]*)"/g;

  for (const match of value.matchAll(pattern)) {
    attributes.set(match[1] ?? "", decodeXml(match[2] ?? ""));
  }

  return attributes;
}

function resolvePackageTarget(basePath: string, target: string) {
  if (target.startsWith("/")) {
    return normalizePackagePath(target);
  }

  const parts = `${basePath}/${target}`.split("/");
  const resolved: string[] = [];

  for (const part of parts) {
    if (!part || part === ".") {
      continue;
    }

    if (part === "..") {
      resolved.pop();
      continue;
    }

    resolved.push(part);
  }

  return normalizePackagePath(resolved.join("/"));
}
