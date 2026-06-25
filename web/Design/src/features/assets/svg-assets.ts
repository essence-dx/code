export const svgMimeType = "image/svg+xml";

const unsafeTagNames = new Set([
  "script",
  "style",
  "foreignobject",
  "iframe",
  "object",
  "embed",
  "audio",
  "video",
  "canvas",
]);

export async function readSvgFile(file: File) {
  const rawText = await file.text();
  const svgText = sanitizeSvgText(rawText);
  const dimensions = readSvgDimensions(svgText);

  return {
    dataUrl: svgTextToDataUrl(svgText),
    svgText,
    ...dimensions,
  };
}

export function isSvgMimeType(mimeType: string) {
  return mimeType === svgMimeType;
}

export function svgTextToDataUrl(svgText: string) {
  return `data:${svgMimeType};charset=utf-8,${encodeURIComponent(svgText)}`;
}

export function svgTextFromDataUrl(dataUrl: string) {
  if (!dataUrl.startsWith(`data:${svgMimeType}`)) return null;

  const commaIndex = dataUrl.indexOf(",");

  if (commaIndex < 0) return null;

  const metadata = dataUrl.slice(0, commaIndex);
  const payload = dataUrl.slice(commaIndex + 1);

  try {
    if (metadata.includes(";base64")) {
      return atob(payload);
    }

    return decodeURIComponent(payload);
  } catch {
    return null;
  }
}

export function sanitizeSvgText(svgText: string) {
  if (typeof DOMParser === "undefined") {
    return fallbackSanitizeSvg(svgText);
  }

  const document = new DOMParser().parseFromString(svgText, "image/svg+xml");
  const parserError = document.querySelector("parsererror");

  if (parserError || document.documentElement.tagName.toLowerCase() !== "svg") {
    throw new Error("Invalid SVG file.");
  }

  for (const node of Array.from(document.querySelectorAll("*"))) {
    const tagName = node.tagName.toLowerCase();

    if (unsafeTagNames.has(tagName)) {
      node.remove();
      continue;
    }

    for (const attribute of Array.from(node.attributes)) {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim().toLowerCase();

      if (
        name.startsWith("on") ||
        name === "style" ||
        ((name === "href" || name === "xlink:href") &&
          (value.startsWith("javascript:") ||
            value.startsWith("data:text/html")))
      ) {
        node.removeAttribute(attribute.name);
      }
    }
  }

  const root = document.documentElement;

  if (!root.getAttribute("xmlns")) {
    root.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  }
  root.setAttribute("width", "100%");
  root.setAttribute("height", "100%");
  root.setAttribute("preserveAspectRatio", "xMidYMid meet");

  return new XMLSerializer().serializeToString(root);
}

export function getRenderableSvgMarkup(
  svgText: string,
  preserveColors: boolean,
) {
  const sanitized = sanitizeSvgText(svgText);

  if (preserveColors || typeof DOMParser === "undefined") {
    return sanitized;
  }

  const document = new DOMParser().parseFromString(sanitized, "image/svg+xml");

  for (const node of Array.from(document.querySelectorAll("*"))) {
    for (const attributeName of ["fill", "stroke"]) {
      const value = node.getAttribute(attributeName);

      if (value && value.toLowerCase() !== "none") {
        node.removeAttribute(attributeName);
      }
    }
  }

  return new XMLSerializer().serializeToString(document.documentElement);
}

export function readSvgDimensions(svgText: string) {
  const fallback = {
    width: 360,
    height: 240,
  };

  if (typeof DOMParser === "undefined") return fallback;

  const document = new DOMParser().parseFromString(svgText, "image/svg+xml");
  const root = document.documentElement;
  const width = readSvgLength(root.getAttribute("width"));
  const height = readSvgLength(root.getAttribute("height"));

  if (width && height) {
    return { width, height };
  }

  const viewBox = root.getAttribute("viewBox")?.trim().split(/\s+/).map(Number);

  if (viewBox?.length === 4 && Number.isFinite(viewBox[2])) {
    const viewBoxWidth = Math.max(1, Math.round(viewBox[2]));
    const viewBoxHeight = Math.max(1, Math.round(viewBox[3] || viewBox[2]));

    return {
      width: viewBoxWidth,
      height: viewBoxHeight,
    };
  }

  return fallback;
}

function readSvgLength(value: string | null) {
  if (!value) return null;

  const match = value.match(/^\s*(\d+(?:\.\d+)?)/);

  if (!match) return null;

  return Math.max(1, Math.round(Number(match[1])));
}

function fallbackSanitizeSvg(svgText: string) {
  return svgText
    .replace(
      /<\s*(script|style|foreignObject|iframe|object|embed|audio|video|canvas)[\s\S]*?<\s*\/\s*\1\s*>/gi,
      "",
    )
    .replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, "")
    .replace(/\sstyle\s*=\s*(['"]).*?\1/gi, "")
    .replace(
      /\s(xlink:)?href\s*=\s*(['"])\s*(javascript:|data:text\/html)[\s\S]*?\2/gi,
      "",
    );
}
