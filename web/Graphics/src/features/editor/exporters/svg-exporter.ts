import { getActivePage } from "@/features/editor/document-utils";
import {
  getPrimaryFillValue,
  getPrimaryStrokeValue,
} from "@/features/editor/paint-stack";
import type {
  DesignDocument,
  DesignLayer,
  DesignPage,
} from "@/features/editor/types";

export type PageSvgFrame = {
  svg: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
};

export function exportDocumentToSvg(document: DesignDocument) {
  return exportPageToSvg(getActivePage(document));
}

export function exportPageToSvg(page: DesignPage) {
  return exportPageToSvgFrame(page).svg;
}

export function exportPageToSvgFrame(page: DesignPage): PageSvgFrame {
  const visibleLayers = page.layers.filter((layer) => layer.visible);
  const bounds = getBounds(visibleLayers);
  const width = Math.max(1, bounds.width);
  const height = Math.max(1, bounds.height);

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${bounds.x} ${bounds.y} ${width} ${height}">`,
    `<rect x="${bounds.x}" y="${bounds.y}" width="${width}" height="${height}" fill="${escapeAttribute(page.background)}"/>`,
    ...visibleLayers.map(layerToSvg),
    "</svg>",
  ].join("");

  return {
    svg,
    bounds: {
      ...bounds,
      width,
      height,
    },
  };
}

export function exportLayerToSvg(layer: DesignLayer) {
  const padding = getLayerExportPadding(layer);
  const width = Math.max(1, Math.ceil(layer.width + padding * 2));
  const height = Math.max(1, Math.ceil(layer.height + padding * 2));

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${layer.x - padding} ${layer.y - padding} ${width} ${height}">`,
    layerToSvg(layer),
    "</svg>",
  ].join("");
}

function getBounds(layers: DesignLayer[]) {
  if (layers.length === 0) {
    return { x: 0, y: 0, width: 1200, height: 800 };
  }

  const minX = Math.min(...layers.map((layer) => layer.x));
  const minY = Math.min(...layers.map((layer) => layer.y));
  const maxX = Math.max(...layers.map((layer) => layer.x + layer.width));
  const maxY = Math.max(...layers.map((layer) => layer.y + layer.height));
  const padding = 48;

  return {
    x: Math.floor(minX - padding),
    y: Math.floor(minY - padding),
    width: Math.ceil(maxX - minX + padding * 2),
    height: Math.ceil(maxY - minY + padding * 2),
  };
}

function getLayerExportPadding(layer: DesignLayer) {
  const rotationPadding = layer.rotation ? 48 : 0;
  const shadowPadding = layer.shadowEnabled
    ? Math.max(
        Math.abs(layer.shadowX ?? 0),
        Math.abs(layer.shadowY ?? 12),
        layer.shadowBlur ?? 24,
        layer.shadowSpread ?? 0,
      )
    : 0;
  const blurPadding = Math.max(layer.layerBlur ?? 0, layer.backgroundBlur ?? 0);

  return Math.ceil(Math.max(rotationPadding, shadowPadding, blurPadding));
}

function layerToSvg(layer: DesignLayer) {
  const centerX = layer.x + layer.width / 2;
  const centerY = layer.y + layer.height / 2;
  const common = [
    `opacity="${layer.opacity}"`,
    getStrokeAttributes(layer),
    getStyleAttribute(layer),
    `transform="rotate(${layer.rotation} ${centerX} ${centerY})"`,
  ].join(" ");

  if (layer.type === "ellipse") {
    return withLayerMask(
      layer,
      `<ellipse cx="${layer.x + layer.width / 2}" cy="${layer.y + layer.height / 2}" rx="${layer.width / 2}" ry="${layer.height / 2}" fill="${escapeAttribute(getPrimaryFillValue(layer))}" ${common}/>`,
    );
  }

  if (layer.type === "image" && layer.imageSrc) {
    const strokeRect =
      layer.strokeWidth > 0 && layer.stroke !== "transparent"
        ? `<rect x="${layer.x}" y="${layer.y}" width="${layer.width}" height="${layer.height}" rx="${layer.cornerRadius}" fill="transparent" ${getStrokeAttributes(layer)}/>`
        : "";

    return withLayerMask(
      layer,
      [
        `<g opacity="${layer.opacity}" ${getStyleAttribute(layer)} transform="rotate(${layer.rotation} ${centerX} ${centerY})">`,
        `<image href="${escapeAttribute(layer.imageSrc)}" x="${layer.x}" y="${layer.y}" width="${layer.width}" height="${layer.height}" preserveAspectRatio="${getImagePreserveAspectRatio(layer)}"/>`,
        strokeRect,
        "</g>",
      ].join(""),
    );
  }

  if (layer.type === "path" && layer.pathData) {
    const box = layer.pathViewBox ?? {
      x: layer.x,
      y: layer.y,
      width: layer.width,
      height: layer.height,
    };
    const viewBox = [
      box.x,
      box.y,
      Math.max(1, box.width),
      Math.max(1, box.height),
    ].join(" ");

    return withLayerMask(
      layer,
      [
        `<g opacity="${layer.opacity}" ${getStyleAttribute(layer)} transform="rotate(${layer.rotation} ${centerX} ${centerY})">`,
        `<svg x="${layer.x}" y="${layer.y}" width="${layer.width}" height="${layer.height}" viewBox="${viewBox}" preserveAspectRatio="none" overflow="${layer.clipContent ? "hidden" : "visible"}">`,
        `<path d="${escapeAttribute(layer.pathData)}" fill="${escapeAttribute(getPrimaryFillValue(layer))}" fill-rule="${layer.fillRule ?? "nonzero"}" clip-rule="${layer.fillRule ?? "nonzero"}" ${getStrokeAttributes(layer)}/>`,
        "</svg>",
        "</g>",
      ].join(""),
    );
  }

  if (layer.text !== undefined) {
    return withLayerMask(layer, textLayerToSvg(layer, common));
  }

  return withLayerMask(
    layer,
    `<rect x="${layer.x}" y="${layer.y}" width="${layer.width}" height="${layer.height}" rx="${layer.cornerRadius}" fill="${escapeAttribute(getPrimaryFillValue(layer))}" ${common}/>`,
  );
}

function withLayerMask(layer: DesignLayer, svg: string) {
  if (!layer.mask) {
    return svg;
  }

  const clipId = `mask-${escapeAttribute(layer.id)}`;

  return [
    `<defs><clipPath id="${clipId}" clipPathUnits="userSpaceOnUse">${maskToSvg(layer)}</clipPath></defs>`,
    `<g clip-path="url(#${clipId})">`,
    svg,
    "</g>",
  ].join("");
}

function maskToSvg(layer: DesignLayer) {
  const mask = layer.mask;

  if (!mask) {
    return "";
  }

  if (mask.kind === "ellipse") {
    const cx = layer.x + mask.x + mask.width / 2;
    const cy = layer.y + mask.y + mask.height / 2;

    return `<ellipse cx="${cx}" cy="${cy}" rx="${mask.width / 2}" ry="${mask.height / 2}"/>`;
  }

  if (mask.kind === "path" && mask.pathData) {
    return `<path d="${escapeAttribute(mask.pathData)}" transform="translate(${layer.x} ${layer.y})"/>`;
  }

  return `<rect x="${layer.x + mask.x}" y="${layer.y + mask.y}" width="${mask.width}" height="${mask.height}" rx="${mask.cornerRadius ?? 0}"/>`;
}

function getStrokeAttributes(layer: DesignLayer) {
  const stroke = getPrimaryStrokeValue(layer);
  const attributes = [
    `stroke="${escapeAttribute(stroke)}"`,
    `stroke-width="${layer.strokeWidth}"`,
    `stroke-linecap="${layer.strokeLineCap ?? "butt"}"`,
    `stroke-linejoin="${layer.strokeLineJoin ?? "miter"}"`,
  ];
  const dash = layer.strokeDash?.trim();

  if (dash) {
    attributes.push(`stroke-dasharray="${escapeAttribute(dash)}"`);
  }

  return attributes.join(" ");
}

function getImagePreserveAspectRatio(layer: DesignLayer) {
  if (layer.imageFit === "contain") {
    return "xMidYMid meet";
  }

  if (layer.imageFit === "fill") {
    return "none";
  }

  return "xMidYMid slice";
}

function textLayerToSvg(layer: DesignLayer, common: string) {
  const fontSize = layer.fontSize ?? 16;
  const lineHeight = fontSize * (layer.lineHeight ?? 1.25);
  const x = getTextX(layer);
  const lines = (layer.text ?? "").split(/\r?\n/);

  return [
    `<g ${common}>`,
    `<rect x="${layer.x}" y="${layer.y}" width="${layer.width}" height="${layer.height}" rx="${layer.cornerRadius}" fill="${escapeAttribute(getPrimaryFillValue(layer))}"/>`,
    `<text x="${x}" y="${layer.y + 12 + fontSize}" fill="${escapeAttribute(layer.textColor ?? "#ffffff")}" font-size="${fontSize}" font-weight="${layer.fontWeight ?? 400}" font-family="${escapeAttribute(layer.fontFamily ?? "Inter, Arial, sans-serif")}" letter-spacing="${layer.letterSpacing ?? 0}" text-anchor="${getTextAnchor(layer)}">`,
    ...lines.map(
      (line, index) =>
        `<tspan x="${x}" dy="${index === 0 ? 0 : lineHeight}">${escapeText(line)}</tspan>`,
    ),
    "</text>",
    "</g>",
  ].join("");
}

function getTextX(layer: DesignLayer) {
  if (layer.textAlign === "center") {
    return layer.x + layer.width / 2;
  }

  if (layer.textAlign === "right") {
    return layer.x + layer.width - 12;
  }

  return layer.x + 12;
}

function getTextAnchor(layer: DesignLayer) {
  if (layer.textAlign === "center") {
    return "middle";
  }

  if (layer.textAlign === "right") {
    return "end";
  }

  return "start";
}

function getStyleAttribute(layer: DesignLayer) {
  const filters = [];

  if (layer.shadowEnabled) {
    filters.push(
      `drop-shadow(${layer.shadowX ?? 0}px ${layer.shadowY ?? 12}px ${layer.shadowBlur ?? 24}px ${layer.shadowColor ?? "rgb(0 0 0 / 0.24)"})`,
    );
  }

  if ((layer.layerBlur ?? 0) > 0) {
    filters.push(`blur(${layer.layerBlur}px)`);
  }

  return filters.length > 0
    ? `style="filter: ${escapeAttribute(filters.join(" "))}"`
    : "";
}

function escapeAttribute(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeText(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
