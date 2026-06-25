import type {
  InsertedObjectAnchor,
  InsertedObjectDefinition,
  InsertedObjectFormat,
  SheetData,
} from "@/features/workbooks/types";

export const insertedObjectColorSwatches = [
  "#2563eb",
  "#16a34a",
  "#f59e0b",
  "#dc2626",
  "#7c3aed",
  "#111827",
];

export const MAX_INSERTED_OBJECT_IMAGE_BYTES = 1_500_000;

const insertedObjectKinds = new Set<InsertedObjectDefinition["kind"]>([
  "image",
  "shape",
  "textBox",
]);
const shapeTypes = new Set<NonNullable<InsertedObjectDefinition["shapeType"]>>([
  "rectangle",
  "roundedRectangle",
  "ellipse",
  "diamond",
  "connector",
]);

export type InsertedObjectCreateInput =
  | {
      kind: "image";
      dataUrl: string;
      fileName: string;
      mimeType: string;
      originalSizeBytes: number;
    }
  | {
      kind: "shape";
      shapeType: NonNullable<InsertedObjectDefinition["shapeType"]>;
    }
  | {
      kind: "textBox";
      text?: string;
    };

export type InsertedObjectUpdate = {
  altText?: string;
  anchor?: Partial<InsertedObjectAnchor>;
  format?: Partial<InsertedObjectFormat>;
  locked?: boolean;
  name?: string;
  text?: string;
};

export type InsertedObjectLayerAction =
  | "bringForward"
  | "bringToFront"
  | "sendBackward"
  | "sendToBack";

export function createInsertedObject(
  sheetId: string,
  anchorCell: { columnIndex: number; rowIndex: number },
  zIndex: number,
  input: InsertedObjectCreateInput,
): InsertedObjectDefinition {
  const now = new Date().toISOString();
  const base = {
    id: `object_${crypto.randomUUID()}`,
    sheetId,
    anchor: normalizeAnchor({
      columnIndex: anchorCell.columnIndex,
      height:
        input.kind === "textBox"
          ? 96
          : input.kind === "shape" && input.shapeType === "connector"
            ? 64
            : 140,
      offsetX: 8,
      offsetY: 8,
      rowIndex: anchorCell.rowIndex,
      width:
        input.kind === "image"
          ? 220
          : input.kind === "shape" && input.shapeType === "connector"
            ? 240
            : 180,
    }),
    altText: "",
    format: {
      fillColor: input.kind === "textBox" ? "#ffffff" : "#dbeafe",
      fontSize: 13,
      opacity: 1,
      strokeColor: "#2563eb",
      strokeWidth: 1,
      textColor: "#111827",
    },
    locked: false,
    metadata: {
      createdAt: now,
      updatedAt: now,
    },
    name: "",
    zIndex,
  } satisfies Omit<InsertedObjectDefinition, "kind" | "name"> & { name: string };

  if (input.kind === "image") {
    return {
      ...base,
      kind: "image",
      name: cleanObjectName(input.fileName, "Image"),
      metadata: {
        ...base.metadata,
        fileName: input.fileName.slice(0, 120),
        mimeType: input.mimeType.slice(0, 80),
        originalSizeBytes: Math.max(0, Math.round(input.originalSizeBytes)),
      },
      source: {
        dataUrl: input.dataUrl,
      },
    };
  }

  if (input.kind === "textBox") {
    return {
      ...base,
      kind: "textBox",
      name: "Text box",
      text: cleanObjectText(input.text || "Text box"),
    };
  }

  return {
    ...base,
    kind: "shape",
    name: shapeName(input.shapeType),
    shapeType: input.shapeType,
    text: "",
  };
}

export function normalizeInsertedObjects(
  value: unknown,
  sheets: SheetData[],
): InsertedObjectDefinition[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const sheetById = new Map(sheets.map((sheet) => [sheet.id, sheet]));

  return value
    .reduce<InsertedObjectDefinition[]>((objects, item, index) => {
      const object = normalizeInsertedObject(item, sheetById, index);

      if (object) {
        objects.push(object);
      }

      return objects;
    }, [])
    .sort((left, right) => left.zIndex - right.zIndex)
    .map((object, index) => ({ ...object, zIndex: index + 1 }));
}

export function updateInsertedObject(
  object: InsertedObjectDefinition,
  updates: InsertedObjectUpdate,
): InsertedObjectDefinition {
  return {
    ...object,
    altText:
      typeof updates.altText === "string"
        ? cleanObjectText(updates.altText)
        : object.altText,
    anchor: normalizeAnchor({
      ...object.anchor,
      ...(updates.anchor ?? {}),
    }),
    format: normalizeFormat({
      ...object.format,
      ...(updates.format ?? {}),
    }),
    locked:
      typeof updates.locked === "boolean" ? updates.locked : object.locked,
    metadata: {
      ...object.metadata,
      updatedAt: new Date().toISOString(),
    },
    name:
      typeof updates.name === "string"
        ? cleanObjectName(updates.name, object.name)
        : object.name,
    text:
      typeof updates.text === "string"
        ? cleanObjectText(updates.text)
        : object.text,
  };
}

function normalizeInsertedObject(
  value: unknown,
  sheetById: Map<string, SheetData>,
  fallbackZIndex: number,
) {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const candidate = value as Partial<InsertedObjectDefinition>;
  const sheet = typeof candidate.sheetId === "string"
    ? sheetById.get(candidate.sheetId)
    : undefined;

  if (
    typeof candidate.id !== "string" ||
    !sheet ||
    !candidate.kind ||
    !insertedObjectKinds.has(candidate.kind)
  ) {
    return null;
  }

  const source =
    candidate.kind === "image" ? normalizeImageSource(candidate.source) : undefined;

  if (candidate.kind === "image" && !source) {
    return null;
  }

  const now = new Date().toISOString();
  const metadata = candidate.metadata;
  const createdAt =
    typeof metadata?.createdAt === "string" ? metadata.createdAt.slice(0, 40) : now;
  const updatedAt =
    typeof metadata?.updatedAt === "string" ? metadata.updatedAt.slice(0, 40) : createdAt;
  const shapeType =
    candidate.kind === "shape" &&
    candidate.shapeType &&
    shapeTypes.has(candidate.shapeType)
      ? candidate.shapeType
      : candidate.kind === "shape"
        ? "rectangle"
        : undefined;

  return {
    id: candidate.id.slice(0, 80),
    sheetId: sheet.id,
    altText:
      typeof candidate.altText === "string"
        ? cleanObjectText(candidate.altText)
        : "",
    anchor: normalizeAnchorForSheet(candidate.anchor, sheet),
    format: normalizeFormat(candidate.format),
    kind: candidate.kind,
    locked: candidate.locked === true,
    metadata: {
      createdAt,
      fileName:
        typeof metadata?.fileName === "string"
          ? metadata.fileName.slice(0, 120)
          : undefined,
      mimeType:
        typeof metadata?.mimeType === "string"
          ? metadata.mimeType.slice(0, 80)
          : undefined,
      originalSizeBytes: Number.isFinite(metadata?.originalSizeBytes)
        ? Math.max(0, Math.round(Number(metadata?.originalSizeBytes)))
        : undefined,
      updatedAt,
    },
    name:
      typeof candidate.name === "string"
        ? cleanObjectName(candidate.name, objectKindLabel(candidate.kind))
        : objectKindLabel(candidate.kind),
    shapeType,
    source,
    text:
      typeof candidate.text === "string"
        ? cleanObjectText(candidate.text)
        : candidate.kind === "textBox"
          ? "Text box"
          : "",
    zIndex: Number.isFinite(candidate.zIndex)
      ? Math.max(1, Math.round(Number(candidate.zIndex)))
      : fallbackZIndex + 1,
  } satisfies InsertedObjectDefinition;
}

function normalizeAnchorForSheet(
  value: unknown,
  sheet: SheetData,
): InsertedObjectAnchor {
  const anchor = typeof value === "object" && value !== null
    ? (value as Partial<InsertedObjectAnchor>)
    : {};

  return normalizeAnchor({
    columnIndex: clampNumber(anchor.columnIndex, 0, sheet.columnCount - 1, 0),
    height: anchor.height,
    offsetX: anchor.offsetX,
    offsetY: anchor.offsetY,
    rowIndex: clampNumber(anchor.rowIndex, 0, sheet.rowCount - 1, 0),
    width: anchor.width,
  });
}

function normalizeAnchor(value: Partial<InsertedObjectAnchor>): InsertedObjectAnchor {
  return {
    columnIndex: Math.max(0, Math.round(Number(value.columnIndex) || 0)),
    height: clampNumber(value.height, 24, 720, 120),
    offsetX: clampNumber(value.offsetX, 0, 360, 0),
    offsetY: clampNumber(value.offsetY, 0, 240, 0),
    rowIndex: Math.max(0, Math.round(Number(value.rowIndex) || 0)),
    width: clampNumber(value.width, 32, 960, 180),
  };
}

function normalizeFormat(value: unknown): InsertedObjectFormat {
  const candidate =
    typeof value === "object" && value !== null
      ? (value as Partial<InsertedObjectFormat>)
      : {};

  return {
    fillColor: normalizeHexColor(candidate.fillColor, "#dbeafe"),
    fontSize: clampNumber(candidate.fontSize, 10, 32, 13),
    opacity: clampNumber(candidate.opacity, 0.2, 1, 1),
    strokeColor: normalizeHexColor(candidate.strokeColor, "#2563eb"),
    strokeWidth: clampNumber(candidate.strokeWidth, 0, 8, 1),
    textColor: normalizeHexColor(candidate.textColor, "#111827"),
  };
}

function normalizeImageSource(value: unknown) {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }

  const dataUrl = (value as { dataUrl?: unknown }).dataUrl;

  if (
    typeof dataUrl !== "string" ||
    !dataUrl.startsWith("data:image/") ||
    dataUrl.length > MAX_INSERTED_OBJECT_IMAGE_BYTES * 2
  ) {
    return undefined;
  }

  return { dataUrl };
}

function cleanObjectName(value: string, fallback: string) {
  const cleaned = value.replace(/\s+/g, " ").trim().slice(0, 80);

  return cleaned || fallback;
}

function cleanObjectText(value: string) {
  return value.replace(/\r\n/g, "\n").slice(0, 1000);
}

function shapeName(shapeType: NonNullable<InsertedObjectDefinition["shapeType"]>) {
  return {
    diamond: "Diamond",
    connector: "Connector",
    ellipse: "Ellipse",
    rectangle: "Rectangle",
    roundedRectangle: "Rounded rectangle",
  }[shapeType];
}

function objectKindLabel(kind: InsertedObjectDefinition["kind"]) {
  return {
    image: "Image",
    shape: "Shape",
    textBox: "Text box",
  }[kind];
}

function normalizeHexColor(value: unknown, fallback: string) {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim();

  return /^#[0-9a-f]{6}$/i.test(normalized) ? normalized.toLowerCase() : fallback;
}

function clampNumber(
  value: unknown,
  min: number,
  max: number,
  fallback: number,
) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  return Math.min(Math.max(numeric, min), max);
}
