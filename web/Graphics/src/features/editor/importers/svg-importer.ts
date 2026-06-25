import { nanoid } from "nanoid";
import { ImportDiagnosticError } from "@/features/editor/importers/import-diagnostics";
import { createLayerPaint } from "@/features/editor/paint-stack";
import type {
  DesignLayer,
  StrokeLineCap,
  StrokeLineJoin,
  TextAlign,
} from "@/features/editor/types";

type SvgStyle = {
  fill: string;
  stroke: string;
  strokeWidth: number;
  strokeDash?: string;
  strokeLineCap: StrokeLineCap;
  strokeLineJoin: StrokeLineJoin;
  opacity: number;
};

export function importSvgLayers(svg: string): DesignLayer[] {
  const svgDocument = new DOMParser().parseFromString(svg, "image/svg+xml");
  const parserError = svgDocument.querySelector("parsererror");

  if (parserError) {
    throw new ImportDiagnosticError({
      title: "SVG could not be parsed",
      detectedKind: "svg",
      issues: ["The file is not valid SVG XML."],
      hints: ["Open the file in a browser or vector editor and export SVG again."],
    });
  }

  return Array.from(
    svgDocument.querySelectorAll("rect, ellipse, circle, path, text"),
  ).flatMap((element) => elementToLayer(element));
}

export function getSvgImportDiagnostic(svg: string, importedLayerCount: number) {
  const svgDocument = new DOMParser().parseFromString(svg, "image/svg+xml");
  const supportedCount = svgDocument.querySelectorAll(
    "rect, ellipse, circle, path, text",
  ).length;
  const unsupportedElements = Array.from(
    svgDocument.querySelectorAll(
      "line, polygon, polyline, image, use, foreignObject, mask, clipPath, linearGradient, radialGradient",
    ),
  ).map((element) => element.tagName.toLowerCase());
  const uniqueUnsupported = Array.from(new Set(unsupportedElements));

  if (importedLayerCount > 0) {
    return null;
  }

  return {
    title: "No editable SVG layers were imported",
    detectedKind: "svg" as const,
    issues: [
      supportedCount === 0
        ? "The SVG does not contain rect, ellipse, circle, path, or text elements."
        : "Supported SVG elements were present, but none produced valid editable bounds.",
      uniqueUnsupported.length > 0
        ? `Unsupported SVG content detected: ${uniqueUnsupported.join(", ")}.`
        : "No supported editable SVG element was found.",
    ],
    hints: [
      "Flatten complex vectors to paths before import.",
      "Convert lines, polygons, and clipped artwork to paths in the source editor.",
    ],
  };
}

function elementToLayer(element: Element): DesignLayer[] {
  if (element instanceof SVGRectElement) {
    return [rectToLayer(element)];
  }

  if (element instanceof SVGEllipseElement) {
    return [ellipseToLayer(element)];
  }

  if (element instanceof SVGCircleElement) {
    return [circleToLayer(element)];
  }

  if (isSvgPathElement(element)) {
    const layer = pathToLayer(element);
    return layer ? [layer] : [];
  }

  if (element instanceof SVGTextElement) {
    const layer = textToLayer(element);
    return layer ? [layer] : [];
  }

  return [];
}

function rectToLayer(element: SVGRectElement): DesignLayer {
  const style = getSvgStyle(element);
  const width = getNumber(element, "width", 120);
  const height = getNumber(element, "height", 80);

  return {
    ...baseImportedLayer(element, "rectangle", "Imported rectangle", style),
    x: getNumber(element, "x", 0),
    y: getNumber(element, "y", 0),
    width,
    height,
    cornerRadius: Math.min(getNumber(element, "rx", 0), width / 2, height / 2),
  };
}

function ellipseToLayer(element: SVGEllipseElement): DesignLayer {
  const rx = getNumber(element, "rx", 48);
  const ry = getNumber(element, "ry", 48);

  return {
    ...baseImportedLayer(
      element,
      "ellipse",
      "Imported ellipse",
      getSvgStyle(element),
    ),
    x: getNumber(element, "cx", 0) - rx,
    y: getNumber(element, "cy", 0) - ry,
    width: rx * 2,
    height: ry * 2,
    cornerRadius: 999,
  };
}

function circleToLayer(element: SVGCircleElement): DesignLayer {
  const radius = getNumber(element, "r", 48);

  return {
    ...baseImportedLayer(
      element,
      "ellipse",
      "Imported circle",
      getSvgStyle(element),
    ),
    x: getNumber(element, "cx", 0) - radius,
    y: getNumber(element, "cy", 0) - radius,
    width: radius * 2,
    height: radius * 2,
    cornerRadius: 999,
  };
}

function pathToLayer(element: SVGPathElement): DesignLayer | null {
  const pathData = element.getAttribute("d")?.trim();

  if (!pathData) {
    return null;
  }

  const bounds = getPathBounds(pathData);

  if (!bounds) {
    return null;
  }

  const width = Math.max(1, Math.ceil(bounds.width));
  const height = Math.max(1, Math.ceil(bounds.height));

  return {
    ...baseImportedLayer(element, "path", "Imported path", getSvgStyle(element)),
    x: Math.floor(bounds.x),
    y: Math.floor(bounds.y),
    width,
    height,
    cornerRadius: 0,
    pathData,
    pathViewBox: {
      x: bounds.x,
      y: bounds.y,
      width,
      height,
    },
  };
}

function textToLayer(element: SVGTextElement): DesignLayer | null {
  const text = element.textContent?.trim();

  if (!text) {
    return null;
  }

  const fontSize = getNumber(element, "font-size", 16);
  const width = Math.max(80, Math.ceil(text.length * fontSize * 0.58));
  const height = Math.ceil(fontSize * 1.4);

  return {
    ...baseImportedLayer(element, "text", "Imported text", {
      fill: "transparent",
      stroke: "transparent",
      strokeWidth: 0,
      strokeLineCap: "butt",
      strokeLineJoin: "miter",
      opacity: getOpacity(element),
    }),
    x: getNumber(element, "x", 0),
    y: getNumber(element, "y", 0) - fontSize,
    width,
    height,
    cornerRadius: 0,
    text,
    fontFamily: getAttributeOrStyle(element, "font-family") ?? "Inter, Arial, sans-serif",
    fontSize,
    fontWeight: getNumber(element, "font-weight", 400),
    lineHeight: 1.25,
    letterSpacing: getNumber(element, "letter-spacing", 0),
    textAlign: getTextAlign(element),
    textColor: getPaint(element, "fill", "#f4f4f5"),
    textResizeMode: "fixed",
  };
}

function baseImportedLayer(
  element: Element,
  type: DesignLayer["type"],
  name: string,
  style: SvgStyle,
): Omit<DesignLayer, "x" | "y" | "width" | "height" | "cornerRadius"> {
  return {
    id: nanoid(),
    type,
    name,
    rotation: getRotation(element),
    opacity: style.opacity,
    visible: true,
    locked: false,
    fill: style.fill,
    fillPaints: [
      createLayerPaint(style.fill, {
        opacity: 1,
      }),
    ],
    stroke: style.stroke,
    strokeWidth: style.strokeWidth,
    strokeDash: style.strokeDash,
    strokeLineCap: style.strokeLineCap,
    strokeLineJoin: style.strokeLineJoin,
    fillRule: getFillRule(element),
  };
}

function getSvgStyle(element: Element): SvgStyle {
  const stroke = getPaint(element, "stroke", "transparent");

  return {
    fill: getPaint(element, "fill", "#d4d4d8"),
    stroke,
    strokeWidth:
      stroke === "transparent" ? 0 : getNumber(element, "stroke-width", 1),
    strokeDash: getStrokeDash(element),
    strokeLineCap: getStrokeLineCap(element),
    strokeLineJoin: getStrokeLineJoin(element),
    opacity: getOpacity(element),
  };
}

function getStrokeDash(element: Element) {
  const dash = getAttributeOrStyle(element, "stroke-dasharray")?.trim();

  if (!dash || dash === "none") {
    return undefined;
  }

  return dash;
}

function getStrokeLineCap(element: Element): StrokeLineCap {
  const value = getAttributeOrStyle(element, "stroke-linecap") ?? undefined;

  return isStrokeLineCap(value) ? value : "butt";
}

function getStrokeLineJoin(element: Element): StrokeLineJoin {
  const value = getAttributeOrStyle(element, "stroke-linejoin") ?? undefined;

  return isStrokeLineJoin(value) ? value : "miter";
}

function getPaint(element: Element, name: string, fallback: string) {
  const value = getAttributeOrStyle(element, name) ?? fallback;

  if (value === "none") {
    return "transparent";
  }

  return value;
}

function getOpacity(element: Element) {
  return clamp(getNumber(element, "opacity", 1), 0, 1);
}

function getRotation(element: Element) {
  const transform = element.getAttribute("transform");
  const match = transform?.match(/rotate\((-?\d+(?:\.\d+)?)/i);

  return match ? Number(match[1]) : 0;
}

function getTextAlign(element: Element): TextAlign {
  const anchor = getAttributeOrStyle(element, "text-anchor");

  if (anchor === "middle") {
    return "center";
  }

  if (anchor === "end") {
    return "right";
  }

  return "left";
}

function getFillRule(element: Element) {
  const value = getAttributeOrStyle(element, "fill-rule");

  return value === "evenodd" ? "evenodd" : "nonzero";
}

function getNumber(element: Element, name: string, fallback: number) {
  const value = getAttributeOrStyle(element, name);
  const parsed = Number.parseFloat(value ?? "");

  return Number.isFinite(parsed) ? parsed : fallback;
}

function getAttributeOrStyle(element: Element, name: string) {
  const attribute = element.getAttribute(name);

  if (attribute !== null) {
    return attribute;
  }

  const style = element.getAttribute("style");

  if (!style) {
    return null;
  }

  return new Map(
    style.split(";").flatMap((rule) => {
      const [property, value] = rule.split(":");

      if (!property || !value) {
        return [];
      }

      return [[property.trim(), value.trim()]];
    }),
  ).get(name);
}

function isSvgPathElement(element: Element): element is SVGPathElement {
  return element.tagName.toLowerCase() === "path";
}

function isStrokeLineCap(value: string | undefined): value is StrokeLineCap {
  return value === "butt" || value === "round" || value === "square";
}

function isStrokeLineJoin(value: string | undefined): value is StrokeLineJoin {
  return value === "miter" || value === "round" || value === "bevel";
}

function getPathBounds(pathData: string) {
  const ownerDocument = window.document;
  const host = ownerDocument.createElementNS(
    "http://www.w3.org/2000/svg",
    "svg",
  );
  const path = ownerDocument.createElementNS(
    "http://www.w3.org/2000/svg",
    "path",
  );

  host.setAttribute("width", "0");
  host.setAttribute("height", "0");
  Object.assign(host.style, {
    height: "0",
    left: "-9999px",
    overflow: "hidden",
    pointerEvents: "none",
    position: "absolute",
    top: "-9999px",
    width: "0",
  });

  path.setAttribute("d", pathData);
  host.append(path);
  ownerDocument.body.append(host);

  try {
    const box = path.getBBox();

    return {
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
    };
  } catch {
    return null;
  } finally {
    host.remove();
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
