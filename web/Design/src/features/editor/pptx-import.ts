import JSZip from "jszip";

import {
  createImageElement,
  createPage,
  createShapeElement,
  createTextElement,
} from "@/features/editor/document-factory";
import type {
  DesignElement,
  DesignPage,
  ImageElement,
  ShapeElement,
  TextElement,
} from "@/features/editor/types";

export const acceptedPptxMimeTypes = [
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
] as const;

export const maxPptxImportBytes = 10 * 1024 * 1024;
export const maxPptxImportSlides = 30;
export const maxPptxElementsPerSlide = 80;

const defaultSlideSize = {
  cx: 9_144_000,
  cy: 6_858_000,
};
const emusPerPixel = 9_525;
const maxEmbeddedImageDataUrlLength = 3_500_000;

type SlideSize = typeof defaultSlideSize;
type OutputSize = {
  width: number;
  height: number;
};
type Bounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};
type ImportContext = {
  zip: JSZip;
  output: OutputSize;
  slideSize: SlideSize;
};

export type PptxImportResult =
  | {
      ok: true;
      pages: DesignPage[];
      importedSlides: number;
      importedElements: number;
      truncated: boolean;
    }
  | {
      ok: false;
      message: string;
    };

export function isAcceptedPptxFile(file: File) {
  return (
    acceptedPptxMimeTypes.includes(
      file.type as (typeof acceptedPptxMimeTypes)[number],
    ) || file.name.toLowerCase().endsWith(".pptx")
  );
}

export async function importPptxFileAsPages(
  file: File,
  output: OutputSize,
): Promise<PptxImportResult> {
  if (!isAcceptedPptxFile(file)) {
    return {
      ok: false,
      message: "Use a .pptx presentation file to import editable pages.",
    };
  }

  if (file.size > maxPptxImportBytes) {
    return {
      ok: false,
      message: "PPTX imports are limited to 10 MB.",
    };
  }

  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const slidePaths = await getOrderedSlidePaths(zip);

  if (slidePaths.length === 0) {
    return {
      ok: false,
      message: "This PPTX does not contain readable slides.",
    };
  }

  const slideSize = await readPresentationSlideSize(zip);
  const context = { zip, output, slideSize };
  const importedSlidePaths = slidePaths.slice(0, maxPptxImportSlides);
  const pages = await Promise.all(
    importedSlidePaths.map((slidePath, index) =>
      importSlideAsPage(context, slidePath, index),
    ),
  );
  const importedElements = pages.reduce(
    (sum, page) => sum + page.elements.length,
    0,
  );

  if (importedElements === 0) {
    return {
      ok: false,
      message: "No editable text, shapes, or images were found in this PPTX.",
    };
  }

  return {
    ok: true,
    pages,
    importedSlides: pages.length,
    importedElements,
    truncated: slidePaths.length > maxPptxImportSlides,
  };
}

async function readPresentationSlideSize(zip: JSZip): Promise<SlideSize> {
  const presentationXml = await zip.file("ppt/presentation.xml")?.async("text");

  if (!presentationXml) return defaultSlideSize;

  const document = parseXml(presentationXml);
  const slideSizeNode = findFirst(document, "sldSz");
  const cx = readIntegerAttribute(slideSizeNode, "cx");
  const cy = readIntegerAttribute(slideSizeNode, "cy");

  return cx && cy ? { cx, cy } : defaultSlideSize;
}

async function getOrderedSlidePaths(zip: JSZip) {
  const fallbackPaths = Object.keys(zip.files)
    .filter((path) => /^ppt\/slides\/slide\d+\.xml$/.test(path))
    .sort((left, right) => getSlideNumber(left) - getSlideNumber(right));
  const presentationXml = await zip.file("ppt/presentation.xml")?.async("text");
  const relationshipsXml = await zip
    .file("ppt/_rels/presentation.xml.rels")
    ?.async("text");

  if (!presentationXml || !relationshipsXml) return fallbackPaths;

  const presentation = parseXml(presentationXml);
  const relationships = readRelationships(parseXml(relationshipsXml));
  const orderedPaths = findAll(presentation, "sldId")
    .map((slideId) => {
      const relationshipId = readRelationshipId(slideId);

      return relationshipId ? relationships.get(relationshipId) : null;
    })
    .filter((target): target is string => Boolean(target))
    .map((target) => normalizeZipPath("ppt", target))
    .filter((path) => Boolean(zip.file(path)));

  return orderedPaths.length > 0 ? orderedPaths : fallbackPaths;
}

async function importSlideAsPage(
  context: ImportContext,
  slidePath: string,
  slideIndex: number,
) {
  const slideXml = await context.zip.file(slidePath)?.async("text");
  const document = parseXml(slideXml ?? "");
  const background = readSlideBackground(document);
  const rels = await readSlideRelationships(context.zip, slidePath);
  const imageElements = await readPictureElements(
    context,
    document,
    slidePath,
    rels,
  );
  const shapeAndTextElements = readShapeAndTextElements(context, document);
  const elements = [...imageElements, ...shapeAndTextElements].slice(
    0,
    maxPptxElementsPerSlide,
  );

  return createPage({
    name: `PPTX ${slideIndex + 1}`,
    background,
    elements,
  });
}

async function readSlideRelationships(zip: JSZip, slidePath: string) {
  const relsPath = getSlideRelationshipsPath(slidePath);
  const relationshipsXml = await zip.file(relsPath)?.async("text");

  return readRelationships(parseXml(relationshipsXml ?? ""));
}

async function readPictureElements(
  context: ImportContext,
  document: Document,
  slidePath: string,
  relationships: Map<string, string>,
) {
  const elements: ImageElement[] = [];

  for (const picture of findAll(document, "pic")) {
    const relationshipId = readPictureRelationshipId(picture);
    const target = relationshipId ? relationships.get(relationshipId) : null;
    const bounds = readElementBounds(context, picture);

    if (!target || !bounds) continue;

    const imagePath = normalizeZipPath(getZipDirectory(slidePath), target);
    const dataUrl = await readImageDataUrl(context.zip, imagePath);

    if (!dataUrl) continue;

    elements.push(
      createImageElement({
        src: dataUrl,
        alt: readName(picture) ?? "Imported PPTX image",
        ...bounds,
        objectFit: "contain",
      }),
    );
  }

  return elements;
}

function readShapeAndTextElements(context: ImportContext, document: Document) {
  const elements: DesignElement[] = [];
  let fallbackIndex = 0;

  for (const shape of findAll(document, "sp")) {
    const text = readTextContent(shape);
    const fallbackBounds = getFallbackTextBounds(context.output, fallbackIndex);
    const bounds = readElementBounds(context, shape) ?? fallbackBounds;
    const shapeElement = createImportedShape(shape, bounds);
    const textElement = text
      ? createImportedText(shape, text, bounds, context)
      : null;

    if (textElement) fallbackIndex += 1;

    if (shapeElement && shouldKeepShape(shapeElement, textElement)) {
      elements.push(shapeElement);
    }

    if (textElement) {
      elements.push(textElement);
    }
  }

  return elements;
}

function createImportedShape(shape: Element, bounds: Bounds) {
  const properties = findFirstChild(shape, "spPr");
  const fill = readSolidColor(properties) ?? "transparent";
  const stroke = readStrokeColor(properties) ?? "transparent";
  const strokeWidth = readStrokeWidth(properties);
  const geometry = readGeometry(properties);

  if (fill === "transparent" && stroke === "transparent") return null;

  return createShapeElement({
    shape: geometry,
    fill,
    stroke,
    strokeWidth,
    radius:
      geometry === "rectangle"
        ? Math.round(Math.min(bounds.width, bounds.height) * 0.04)
        : 0,
    ...bounds,
  });
}

function createImportedText(
  shape: Element,
  content: string,
  bounds: Bounds,
  context: ImportContext,
) {
  const textBody = findFirstChild(shape, "txBody") ?? shape;
  const fontSize = readTextFontSize(textBody, bounds, context);

  return createTextElement({
    content,
    color: readTextColor(textBody) ?? "#111827",
    fontSize,
    fontWeight: isBoldText(textBody) ? 800 : fontSize >= 30 ? 700 : 500,
    textAlign: readTextAlign(textBody),
    lineHeight: 1.12,
    ...bounds,
    height: Math.max(bounds.height, Math.ceil(fontSize * 1.35)),
  });
}

function shouldKeepShape(shape: ShapeElement, text: TextElement | null) {
  if (!text) return true;
  if (shape.fill !== "transparent") return true;

  return shape.stroke !== "transparent" && shape.strokeWidth > 0;
}

function readElementBounds(context: ImportContext, element: Element) {
  const transform = findFirst(element, "xfrm");
  const offset = findFirstChild(transform, "off");
  const extension = findFirstChild(transform, "ext");
  const x = readIntegerAttribute(offset, "x");
  const y = readIntegerAttribute(offset, "y");
  const cx = readIntegerAttribute(extension, "cx");
  const cy = readIntegerAttribute(extension, "cy");

  if (x === null || y === null || cx === null || cy === null) return null;

  return convertBounds(context, {
    x,
    y,
    width: cx,
    height: cy,
  });
}

function convertBounds(context: ImportContext, bounds: Bounds) {
  return {
    x: Math.round((bounds.x / context.slideSize.cx) * context.output.width),
    y: Math.round((bounds.y / context.slideSize.cy) * context.output.height),
    width: Math.max(
      12,
      Math.round((bounds.width / context.slideSize.cx) * context.output.width),
    ),
    height: Math.max(
      12,
      Math.round(
        (bounds.height / context.slideSize.cy) * context.output.height,
      ),
    ),
  };
}

function getFallbackTextBounds(output: OutputSize, index: number) {
  return {
    x: Math.round(output.width * 0.1),
    y: Math.round(output.height * 0.12 + index * output.height * 0.11),
    width: Math.round(output.width * 0.8),
    height: Math.round(output.height * 0.08),
  };
}

function readTextContent(shape: Element) {
  const textBody = findFirstChild(shape, "txBody");

  if (!textBody) return "";

  return findAll(textBody, "p")
    .map((paragraph) =>
      findAll(paragraph, "t")
        .map((textNode) => textNode.textContent ?? "")
        .join(""),
    )
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .join("\n");
}

function readTextFontSize(
  textBody: Element,
  bounds: Bounds,
  context: ImportContext,
) {
  const rawSize = findAll(textBody, "rPr")
    .map((runProperties) => readIntegerAttribute(runProperties, "sz"))
    .find((size): size is number => Boolean(size));
  const slidePixelWidth = context.slideSize.cx / emusPerPixel;
  const slidePixelHeight = context.slideSize.cy / emusPerPixel;
  const scale = Math.min(
    context.output.width / slidePixelWidth,
    context.output.height / slidePixelHeight,
  );
  const fromRun = rawSize ? (rawSize / 100) * (96 / 72) * scale : null;
  const fromBounds = bounds.height * 0.34;

  return clamp(Math.round(fromRun ?? fromBounds), 9, 120);
}

function readTextAlign(textBody: Element): TextElement["textAlign"] {
  const alignment = findAll(textBody, "pPr")
    .map((properties) => getAttribute(properties, "algn"))
    .find(Boolean);

  if (alignment === "ctr") return "center";
  if (alignment === "r") return "right";

  return "left";
}

function isBoldText(textBody: Element) {
  return findAll(textBody, "rPr").some((runProperties) =>
    ["1", "true"].includes(getAttribute(runProperties, "b") ?? ""),
  );
}

function readTextColor(textBody: Element) {
  return findAll(textBody, "rPr")
    .map(readSolidColor)
    .find((color): color is string => Boolean(color));
}

function readSlideBackground(document: Document) {
  const backgroundProperties = findFirst(document, "bgPr");

  return readSolidColor(backgroundProperties) ?? "#ffffff";
}

function readGeometry(properties: Element | null): ShapeElement["shape"] {
  const preset = getAttribute(findFirst(properties, "prstGeom"), "prst");

  if (preset === "ellipse") return "ellipse";
  if (preset === "line") return "line";

  return "rectangle";
}

function readSolidColor(element: Element | null) {
  const solidFill = findFirst(element, "solidFill");

  if (!solidFill) return null;

  const rgbColor = getAttribute(findFirst(solidFill, "srgbClr"), "val");

  if (rgbColor) return `#${rgbColor}`;

  const schemeColor = getAttribute(findFirst(solidFill, "schemeClr"), "val");

  return schemeColor ? mapSchemeColor(schemeColor) : null;
}

function readStrokeColor(properties: Element | null) {
  const line = findFirstChild(properties, "ln");

  return readSolidColor(line);
}

function readStrokeWidth(properties: Element | null) {
  const line = findFirstChild(properties, "ln");
  const width = readIntegerAttribute(line, "w");

  return width ? clamp(Math.round(width / 12_700), 1, 24) : 1;
}

function readPictureRelationshipId(picture: Element) {
  const blip = findFirst(picture, "blip");

  return readRelationshipId(blip);
}

function readName(element: Element) {
  return getAttribute(findFirst(element, "cNvPr"), "name");
}

async function readImageDataUrl(zip: JSZip, imagePath: string) {
  const file = zip.file(imagePath);
  const mimeType = getImageMimeType(imagePath);

  if (!file || !mimeType) return null;

  const base64 = await file.async("base64");
  const dataUrl = `data:${mimeType};base64,${base64}`;

  return dataUrl.length <= maxEmbeddedImageDataUrlLength ? dataUrl : null;
}

function readRelationships(document: Document) {
  const relationships = new Map<string, string>();

  for (const relationship of findAll(document, "Relationship")) {
    const id = getAttribute(relationship, "Id");
    const target = getAttribute(relationship, "Target");

    if (id && target) relationships.set(id, target);
  }

  return relationships;
}

function readRelationshipId(element: Element | null) {
  return (
    getAttribute(element, "id") ??
    getAttribute(element, "embed") ??
    getAttribute(element, "link")
  );
}

function getSlideRelationshipsPath(slidePath: string) {
  const directory = getZipDirectory(slidePath);
  const name = slidePath.slice(slidePath.lastIndexOf("/") + 1);

  return `${directory}/_rels/${name}.rels`;
}

function normalizeZipPath(baseDirectory: string, target: string) {
  const normalizedParts: string[] = [];
  const joined = target.startsWith("/")
    ? target.slice(1)
    : `${baseDirectory}/${target}`;

  for (const part of joined.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") {
      normalizedParts.pop();
      continue;
    }

    normalizedParts.push(part);
  }

  return normalizedParts.join("/");
}

function getZipDirectory(path: string) {
  return path.slice(0, path.lastIndexOf("/"));
}

function getSlideNumber(path: string) {
  return Number(path.match(/slide(\d+)\.xml$/)?.[1] ?? 0);
}

function getImageMimeType(path: string) {
  const extension = path.slice(path.lastIndexOf(".") + 1).toLowerCase();

  if (extension === "png") return "image/png";
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "gif") return "image/gif";
  if (extension === "webp") return "image/webp";
  if (extension === "svg") return "image/svg+xml";

  return null;
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

function findFirstChild(root: Element | null, localName: string) {
  if (!root) return null;

  return (
    Array.from(root.children).find((child) => child.localName === localName) ??
    null
  );
}

function parseXml(input: string) {
  const parser = new DOMParser();

  return parser.parseFromString(input, "application/xml");
}

function readIntegerAttribute(element: Element | null, name: string) {
  const value = getAttribute(element, name);

  return value ? Number.parseInt(value, 10) : null;
}

function getAttribute(element: Element | null, localName: string) {
  if (!element) return null;

  for (const attribute of Array.from(element.attributes)) {
    if (attribute.localName === localName) return attribute.value;
  }

  return null;
}

function mapSchemeColor(value: string) {
  const schemeColors: Record<string, string> = {
    bg1: "#ffffff",
    bg2: "#f8fafc",
    tx1: "#111827",
    tx2: "#475569",
    accent1: "#2563eb",
    accent2: "#dc2626",
    accent3: "#16a34a",
    accent4: "#f59e0b",
    accent5: "#7c3aed",
    accent6: "#0891b2",
  };

  return schemeColors[value] ?? "#111827";
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
