import {
  base64ToBytes,
  bytesToText,
  normalizePackagePath,
} from "@/features/workbooks/workbook-unsupported-part-codec";
import { readNativeChartMetadata } from "@/features/workbooks/workbook-native-chart-metadata";
import { normalizeNativeWorkbookObjects } from "@/features/workbooks/workbook-native-object-normalization";
import {
  drawingBasePath,
  drawingRelationshipPath,
  getDrawingAnchors,
  getDrawingObjects,
  getRelationshipReferences,
  readRelationships,
  relationshipKind,
  worksheetIndexFromPath,
  worksheetRelationshipPath,
  type Relationship,
} from "@/features/workbooks/workbook-native-object-xml";
import {
  cleanText,
  nativeObjectKindLabel,
  normalizePackagePaths,
} from "@/features/workbooks/workbook-native-object-utils";
import type {
  SheetData,
  WorkbookNativeObject,
  WorkbookNativeObjectAnchor,
  WorkbookNativeObjectKind,
  WorkbookUnsupportedPart,
} from "@/features/workbooks/types";

const MAX_NATIVE_OBJECTS = 300;

export { normalizeNativeWorkbookObjects };

export function discoverNativeWorkbookObjects({
  importedAt,
  sheetNames,
  sheets,
  unsupportedParts,
}: {
  importedAt: string;
  sheetNames: string[];
  sheets: SheetData[];
  unsupportedParts: WorkbookUnsupportedPart[];
}) {
  const packageText = new Map(
    unsupportedParts.flatMap((part) => {
      if (!part.path.endsWith(".xml") && !part.path.endsWith(".rels")) {
        return [];
      }

      return [[part.path, bytesToText(base64ToBytes(part.dataBase64))]];
    }),
  );
  const partsByPath = new Map(unsupportedParts.map((part) => [part.path, part]));
  const nativeObjects: WorkbookNativeObject[] = [];

  for (const part of unsupportedParts) {
    if (part.kind !== "worksheet-markup") {
      continue;
    }

    const sheetIndex = worksheetIndexFromPath(part.path);
    const sheet = sheetIndex === null ? undefined : sheets[sheetIndex];
    const sheetName = sheetIndex === null ? undefined : sheetNames[sheetIndex];
    const relsPath = worksheetRelationshipPath(part.path);
    const worksheetRelationships = readRelationships({
      basePath: "xl/worksheets",
      packageText,
      path: relsPath,
    });

    for (const reference of getRelationshipReferences(
      packageText.get(part.path) ?? "",
    )) {
      const relationship = worksheetRelationships.get(reference.id);
      const kind = relationship ? relationshipKind(relationship) : null;

      if (!relationship || !kind) {
        continue;
      }

      if (kind === "drawing") {
        nativeObjects.push(
          ...readDrawingObjects({
            drawingPath: relationship.targetPath,
            importedAt,
            packageText,
            partsByPath,
            relationship,
            sheet,
            sheetName,
            worksheetPartPath: part.path,
          }),
        );
        continue;
      }

      nativeObjects.push(
        createNativeObject({
          importedAt,
          kind,
          name: reference.name || nativeObjectKindLabel(kind),
          packagePaths: [part.path, relsPath, relationship.targetPath],
          relationship,
          sheet,
          sheetName,
          sourcePath: part.path,
          targetPart: partsByPath.get(relationship.targetPath),
        }),
      );
    }
  }

  return uniqueNativeObjects(nativeObjects).slice(0, MAX_NATIVE_OBJECTS);
}

function readDrawingObjects({
  drawingPath,
  importedAt,
  packageText,
  partsByPath,
  relationship,
  sheet,
  sheetName,
  worksheetPartPath,
}: {
  drawingPath: string;
  importedAt: string;
  packageText: Map<string, string>;
  partsByPath: Map<string, WorkbookUnsupportedPart>;
  relationship: Relationship;
  sheet?: SheetData;
  sheetName?: string;
  worksheetPartPath: string;
}) {
  const drawingXml = packageText.get(drawingPath) ?? "";
  const drawingRelsPath = drawingRelationshipPath(drawingPath);
  const drawingRelationships = readRelationships({
    basePath: drawingBasePath(drawingPath),
    packageText,
    path: drawingRelsPath,
  });
  const anchors = getDrawingAnchors(drawingXml);

  if (anchors.length === 0 && drawingXml) {
    return [
      createNativeObject({
        importedAt,
        kind: "drawing",
        name: "Native drawing",
        packagePaths: [worksheetPartPath, drawingPath, drawingRelsPath],
        relationship,
        sheet,
        sheetName,
        sourcePath: drawingPath,
        targetPart: partsByPath.get(drawingPath),
      }),
    ];
  }

  return anchors.flatMap((anchor, index) => {
    const objects = getDrawingObjects(anchor.xml, drawingRelationships);

    if (objects.length === 0) {
      return [
        createNativeObject({
          anchor: anchor.anchor,
          importedAt,
          kind: "drawing",
          name: `Native drawing ${index + 1}`,
          packagePaths: [worksheetPartPath, drawingPath, drawingRelsPath],
          relationship,
          sheet,
          sheetName,
          sourcePath: drawingPath,
          targetPart: partsByPath.get(drawingPath),
        }),
      ];
    }

    return objects.map((object) =>
      createNativeObject({
        anchor: anchor.anchor,
        description: object.description,
        importedAt,
        kind: object.kind,
        name: object.name,
        packagePaths: [
          worksheetPartPath,
          drawingPath,
          drawingRelsPath,
          object.relationship?.targetPath,
        ],
        relationship: object.relationship ?? relationship,
        sheet,
        sheetName,
        sourcePath: drawingPath,
        targetPart: object.relationship
          ? partsByPath.get(object.relationship.targetPath)
          : partsByPath.get(drawingPath),
      }),
    );
  });
}

function createNativeObject({
  anchor,
  description,
  importedAt,
  kind,
  name,
  packagePaths,
  relationship,
  sheet,
  sheetName,
  sourcePath,
  targetPart,
}: {
  anchor?: WorkbookNativeObjectAnchor;
  description?: string;
  importedAt: string;
  kind: WorkbookNativeObjectKind;
  name: string;
  packagePaths: Array<string | undefined>;
  relationship?: Relationship;
  sheet?: SheetData;
  sheetName?: string;
  sourcePath?: string;
  targetPart?: WorkbookUnsupportedPart;
}): WorkbookNativeObject {
  const targetPath = relationship?.targetPath ?? targetPart?.path;
  const chart =
    kind === "chart" && targetPart
      ? readNativeChartMetadata(bytesToText(base64ToBytes(targetPart.dataBase64)))
      : undefined;

  return {
    id: `native_${crypto.randomUUID()}`,
    kind,
    name: cleanText(name, nativeObjectKindLabel(kind), 120),
    importedAt,
    packagePaths: normalizePackagePaths(packagePaths),
    ...(sheet ? { sheetId: sheet.id } : {}),
    ...(sheetName ?? sheet?.name ? { sheetName: sheetName ?? sheet?.name } : {}),
    ...(sourcePath ? { sourcePath: normalizePackagePath(sourcePath) } : {}),
    ...(relationship?.id ? { relationshipId: relationship.id } : {}),
    ...(relationship?.type ? { relationshipType: relationship.type } : {}),
    ...(targetPath ? { targetPath: normalizePackagePath(targetPath) } : {}),
    ...(targetPart?.contentType ? { contentType: targetPart.contentType } : {}),
    ...(chart ? { chart } : {}),
    ...(description ? { description: cleanText(description, "", 240) } : {}),
    ...(anchor ? { anchor } : {}),
  };
}

function uniqueNativeObjects(objects: WorkbookNativeObject[]) {
  const seen = new Set<string>();

  return objects.filter((object) => {
    const key = `${object.kind}:${object.sourcePath ?? ""}:${
      object.targetPath ?? ""
    }:${object.relationshipId ?? ""}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}
