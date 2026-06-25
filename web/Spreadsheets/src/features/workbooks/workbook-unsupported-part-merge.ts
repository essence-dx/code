import * as XLSX from "xlsx";
import {
  base64ToBytes,
  bytesToText,
  normalizePackagePath,
  rawContentToBytes,
  textToBytes,
  toArrayBuffer,
} from "@/features/workbooks/workbook-unsupported-part-codec";
import {
  hasUnsupportedRelationshipHint,
  inferUnsupportedPartKind,
  workbookMarkupElements,
  worksheetMarkupElements,
} from "@/features/workbooks/workbook-unsupported-part-classification";
import type { WorkbookDocument } from "@/features/workbooks/types";

type RelationshipMergeResult = {
  xml: string;
  idRemap: Map<string, string>;
  addedIds: Set<string>;
};

function getCfbFile(cfb: unknown, path: string): { content?: unknown } | null {
  const normalizedPath = normalizePackagePath(path);

  return (
    XLSX.CFB.find(cfb, `/${normalizedPath}`) ??
    XLSX.CFB.find(cfb, normalizedPath)
  );
}

function getCfbText(cfb: unknown, path: string) {
  const file = getCfbFile(cfb, path);
  const bytes = rawContentToBytes(file?.content);

  return bytes ? bytesToText(bytes) : "";
}

function setCfbText(cfb: unknown, path: string, value: string) {
  XLSX.CFB.utils.cfb_add(cfb, `/${normalizePackagePath(path)}`, textToBytes(value));
}

function setCfbBytes(cfb: unknown, path: string, value: Uint8Array) {
  XLSX.CFB.utils.cfb_add(cfb, `/${normalizePackagePath(path)}`, value);
}

function readRelationshipAttributes(attributes: string) {
  const values = new Map<string, string>();
  const pattern = /([A-Za-z_:][\w:.-]*)="([^"]*)"/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(attributes)) !== null) {
    values.set(match[1] ?? "", match[2] ?? "");
  }

  return values;
}

function readElementAttribute(element: string, name: string) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`\\b${escapedName}="([^"]*)"`).exec(element);

  return match?.[1] ?? "";
}

function relationshipIsUnsupported(type: string, target: string) {
  return hasUnsupportedRelationshipHint(type) || hasUnsupportedRelationshipHint(target);
}

function getAllRelationshipElements(xml: string) {
  const relationships: Array<{
    attributes: Map<string, string>;
    element: string;
  }> = [];
  const pattern = /<Relationship\b([^>]*)\/>/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(xml)) !== null) {
    relationships.push({
      attributes: readRelationshipAttributes(match[1] ?? ""),
      element: match[0] ?? "",
    });
  }

  return relationships;
}

function getUnsupportedRelationshipElements(xml: string) {
  return getAllRelationshipElements(xml).filter(({ attributes }) =>
    relationshipIsUnsupported(
      attributes.get("Type") ?? "",
      attributes.get("Target") ?? "",
    ),
  );
}

function replaceRelationshipId(element: string, idValue: string) {
  return element.replace(/\bId="[^"]*"/, `Id="${idValue}"`);
}

function nextRelationshipId(usedIds: Set<string>) {
  let index = 1;

  while (usedIds.has(`rIdEssence${index}`)) {
    index += 1;
  }

  const nextId = `rIdEssence${index}`;
  usedIds.add(nextId);

  return nextId;
}

function mergeRelationshipXml(
  generatedXml: string,
  preservedXml: string,
): RelationshipMergeResult {
  const generatedIds = new Set<string>();
  const generatedPairs = new Set<string>();
  const idRemap = new Map<string, string>();
  const addedIds = new Set<string>();

  for (const relationship of getAllRelationshipElements(generatedXml)) {
    const idValue = relationship.attributes.get("Id");
    const type = relationship.attributes.get("Type") ?? "";
    const target = relationship.attributes.get("Target") ?? "";

    if (idValue) {
      generatedIds.add(idValue);
    }

    generatedPairs.add(`${type}\n${target}`);
  }

  const additions = getUnsupportedRelationshipElements(preservedXml).flatMap(
    ({ attributes, element }) => {
      const type = attributes.get("Type") ?? "";
      const target = attributes.get("Target") ?? "";
      const pairKey = `${type}\n${target}`;
      const oldId = attributes.get("Id") ?? "";

      if (generatedPairs.has(pairKey)) {
        return [];
      }

      generatedPairs.add(pairKey);

      if (!oldId || generatedIds.has(oldId)) {
        const newId = nextRelationshipId(generatedIds);

        if (oldId) {
          idRemap.set(oldId, newId);
        }

        addedIds.add(newId);
        return [replaceRelationshipId(element, newId)];
      }

      generatedIds.add(oldId);
      addedIds.add(oldId);
      return [element];
    },
  );

  if (additions.length === 0) {
    return { xml: generatedXml, idRemap, addedIds };
  }

  return {
    xml: generatedXml.replace(
      "</Relationships>",
      `${additions.join("")}</Relationships>`,
    ),
    idRemap,
    addedIds,
  };
}

function getXmlElements(xml: string, elementNames: readonly string[]) {
  return elementNames.flatMap((elementName) => {
    const pattern = new RegExp(
      `<${elementName}\\b[^>]*(?:/>|>[\\s\\S]*?</${elementName}>)`,
      "g",
    );

    return Array.from(xml.matchAll(pattern), (match) => ({
      elementName,
      xml: match[0] ?? "",
    }));
  });
}

function applyRelationshipRemap(xml: string, remap?: Map<string, string>) {
  if (!remap || remap.size === 0) {
    return xml;
  }

  let updatedXml = xml;

  for (const [oldId, newId] of remap.entries()) {
    updatedXml = updatedXml.replace(
      new RegExp(`r:id="${oldId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`, "g"),
      `r:id="${newId}"`,
    );
  }

  return updatedXml;
}

function mergeXmlElements({
  closingTag,
  elementNames,
  generatedXml,
  preservedXml,
  remap,
}: {
  closingTag: string;
  elementNames: readonly string[];
  generatedXml: string;
  preservedXml: string;
  remap?: Map<string, string>;
}) {
  const additions = getXmlElements(preservedXml, elementNames).flatMap(
    ({ elementName, xml }) =>
      new RegExp(`<${elementName}\\b`).test(generatedXml)
        ? []
        : [applyRelationshipRemap(xml, remap)],
  );

  if (additions.length === 0 || !generatedXml.includes(closingTag)) {
    return generatedXml;
  }

  return generatedXml.replace(closingTag, `${additions.join("")}${closingTag}`);
}

function mergeMacroSheetEntries({
  generatedXml,
  preservedXml,
  relationshipIds,
  remap,
}: {
  generatedXml: string;
  preservedXml: string;
  relationshipIds: Set<string>;
  remap?: Map<string, string>;
}) {
  if (relationshipIds.size === 0 || !generatedXml.includes("</sheets>")) {
    return generatedXml;
  }

  const generatedSheetEntries = getXmlElements(generatedXml, ["sheet"]);
  const generatedSheetEntriesByName = new Map(
    generatedSheetEntries.flatMap(({ xml }) => {
      const name = readElementAttribute(xml, "name");

      return name ? [[name, xml] as const] : [];
    }),
  );
  const generatedRelationshipIds = new Set(
    generatedSheetEntries.map(({ xml }) => readElementAttribute(xml, "r:id")),
  );
  const additions = getXmlElements(preservedXml, ["sheet"]).flatMap(({ xml }) => {
    const remappedXml = applyRelationshipRemap(xml, remap);
    const name = readElementAttribute(remappedXml, "name");
    const relationshipId = readElementAttribute(remappedXml, "r:id");

    if (
      !relationshipId ||
      !relationshipIds.has(relationshipId) ||
      generatedRelationshipIds.has(relationshipId)
    ) {
      return [];
    }

    if (name && generatedSheetEntriesByName.has(name)) {
      generatedXml = generatedXml.replace(
        generatedSheetEntriesByName.get(name) ?? "",
        remappedXml,
      );
      generatedRelationshipIds.add(relationshipId);
      return [];
    }

    generatedRelationshipIds.add(relationshipId);

    return [remappedXml];
  });

  if (additions.length === 0) {
    return generatedXml;
  }

  return generatedXml.replace("</sheets>", `${additions.join("")}</sheets>`);
}

function contentTypePathIsUnsupported(partName: string, contentType: string) {
  return (
    inferUnsupportedPartKind(partName.replace(/^\//, "")) !== null ||
    hasUnsupportedRelationshipHint(contentType)
  );
}

function mergeContentTypesXml(generatedXml: string, preservedXml: string) {
  const defaultExtensions = new Set(
    Array.from(generatedXml.matchAll(/<Default\b[^>]*Extension="([^"]+)"/g), (
      match,
    ) => match[1]?.toLowerCase() ?? ""),
  );
  const overridePartNames = new Set(
    Array.from(generatedXml.matchAll(/<Override\b[^>]*PartName="([^"]+)"/g), (
      match,
    ) => match[1] ?? ""),
  );
  const defaultAdditions = Array.from(
    preservedXml.matchAll(
      /<Default\b[^>]*Extension="([^"]+)"[^>]*ContentType="([^"]+)"[^>]*\/>/g,
    ),
  ).flatMap((match) => {
    const extension = match[1]?.toLowerCase() ?? "";
    const contentType = match[2] ?? "";

    if (
      !extension ||
      defaultExtensions.has(extension) ||
      !hasUnsupportedRelationshipHint(contentType)
    ) {
      return [];
    }

    defaultExtensions.add(extension);
    return [match[0] ?? ""];
  });
  const overrideAdditions = Array.from(
    preservedXml.matchAll(
      /<Override\b[^>]*PartName="([^"]+)"[^>]*ContentType="([^"]+)"[^>]*\/>/g,
    ),
  ).flatMap((match) => {
    const partName = match[1] ?? "";
    const contentType = match[2] ?? "";

    if (
      !partName ||
      overridePartNames.has(partName) ||
      !contentTypePathIsUnsupported(partName, contentType)
    ) {
      return [];
    }

    overridePartNames.add(partName);
    return [match[0] ?? ""];
  });
  const additions = [...defaultAdditions, ...overrideAdditions];

  if (additions.length === 0 || !generatedXml.includes("</Types>")) {
    return generatedXml;
  }

  return generatedXml.replace("</Types>", `${additions.join("")}</Types>`);
}

function getWorksheetRelationshipPath(sheetPath: string) {
  const fileName = sheetPath.split("/").pop() ?? "";

  return `xl/worksheets/_rels/${fileName}.rels`;
}

function getUnsupportedPartApplyPriority(
  part: WorkbookDocument["unsupportedParts"][number],
) {
  if (part.kind === "package-relationship") {
    return 0;
  }

  if (part.kind === "content-type") {
    return 1;
  }

  if (part.kind === "workbook-markup") {
    return 2;
  }

  if (part.kind === "worksheet-markup") {
    return 3;
  }

  return 4;
}

export function applyUnsupportedWorkbookPartsToBuffer(
  buffer: ArrayBuffer,
  document: WorkbookDocument,
) {
  if (document.unsupportedParts.length === 0) {
    return buffer;
  }

  const cfb = XLSX.CFB.read(new Uint8Array(buffer), { type: "buffer" });
  const relationshipRemaps = new Map<string, Map<string, string>>();
  const relationshipAddedIds = new Map<string, Set<string>>();

  for (const part of [...document.unsupportedParts].sort(
    (left, right) =>
      getUnsupportedPartApplyPriority(left) - getUnsupportedPartApplyPriority(right),
  )) {
    const bytes = base64ToBytes(part.dataBase64);

    if (part.kind === "package-relationship") {
      const generatedXml = getCfbText(cfb, part.path);
      const preservedXml = bytesToText(bytes);
      const mergeResult = generatedXml
        ? mergeRelationshipXml(generatedXml, preservedXml)
        : {
            xml: preservedXml,
            idRemap: new Map<string, string>(),
            addedIds: new Set<string>(),
          };

      setCfbText(cfb, part.path, mergeResult.xml);
      relationshipRemaps.set(part.path, mergeResult.idRemap);
      relationshipAddedIds.set(part.path, mergeResult.addedIds);
      continue;
    }

    if (part.kind === "content-type") {
      const generatedXml = getCfbText(cfb, "[Content_Types].xml");
      const preservedXml = bytesToText(bytes);

      setCfbText(
        cfb,
        "[Content_Types].xml",
        generatedXml
          ? mergeContentTypesXml(generatedXml, preservedXml)
          : preservedXml,
      );
      continue;
    }

    if (part.kind === "workbook-markup") {
      const generatedXml = getCfbText(cfb, part.path);

      if (generatedXml) {
        const workbookRelationshipPath = "xl/_rels/workbook.xml.rels";
        const remap = relationshipRemaps.get(workbookRelationshipPath);
        const mergedMarkup = mergeXmlElements({
          closingTag: "</workbook>",
          elementNames: workbookMarkupElements,
          generatedXml,
          preservedXml: bytesToText(bytes),
          remap,
        });

        setCfbText(
          cfb,
          part.path,
          mergeMacroSheetEntries({
            generatedXml: mergedMarkup,
            preservedXml: bytesToText(bytes),
            relationshipIds:
              relationshipAddedIds.get(workbookRelationshipPath) ?? new Set(),
            remap,
          }),
        );
      }

      continue;
    }

    if (part.kind === "worksheet-markup") {
      const generatedXml = getCfbText(cfb, part.path);

      if (generatedXml) {
        setCfbText(
          cfb,
          part.path,
          mergeXmlElements({
            closingTag: "</worksheet>",
            elementNames: worksheetMarkupElements,
            generatedXml,
            preservedXml: bytesToText(bytes),
            remap: relationshipRemaps.get(getWorksheetRelationshipPath(part.path)),
          }),
        );
      }

      continue;
    }

    setCfbBytes(cfb, part.path, bytes);
  }

  return toArrayBuffer(
    XLSX.CFB.write(cfb, {
      fileType: "zip",
      type: "array",
    }),
  );
}
