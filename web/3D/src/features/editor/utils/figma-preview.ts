import type { FigmaSettings } from "../types";

const figmaPreviewWidth = 3.2;
const figmaPreviewHeight = 2.1;
const embedHost = "essence-spline";

function isFigmaHost(hostname: string) {
  return hostname === "figma.com" || hostname === "www.figma.com" || hostname.endsWith(".figma.com");
}

function getInnerFigmaUrl(url: URL) {
  const embeddedUrl = url.searchParams.get("url");

  if (embeddedUrl) {
    return embeddedUrl;
  }

  const fileQuery = url.searchParams.get("file");

  return fileQuery || null;
}

function normalizeFigmaUrl(rawUrl: string) {
  const trimmedUrl = rawUrl.trim();

  if (!trimmedUrl) {
    throw new Error("Paste a Figma file, design, prototype, or FigJam URL.");
  }

  const parsedUrl = new URL(trimmedUrl);

  if (!isFigmaHost(parsedUrl.hostname)) {
    throw new Error("Use a figma.com URL.");
  }

  if (parsedUrl.pathname === "/embed") {
    const innerUrl = getInnerFigmaUrl(parsedUrl);

    if (!innerUrl) {
      throw new Error("Figma embed URL is missing the source file URL.");
    }

    return normalizeFigmaUrl(innerUrl);
  }

  parsedUrl.hash = "";
  return parsedUrl;
}

function readFileKey(url: URL) {
  const [area, fileKey] = url.pathname.split("/").filter(Boolean);

  if (["design", "file", "proto", "board"].includes(area ?? "") && fileKey) {
    return fileKey;
  }

  return undefined;
}

function readPreviewName(url: URL) {
  const segments = url.pathname.split("/").filter(Boolean);
  const rawName = segments[2] ?? segments[1] ?? "Figma Preview";
  const decodedName = decodeURIComponent(rawName).replace(/[-_]+/g, " ").trim();

  return decodedName || "Figma Preview";
}

function readNodeId(url: URL) {
  return url.searchParams.get("node-id")?.replace(/-/g, ":") || undefined;
}

export function createFigmaEmbedUrl(rawUrl: string) {
  const normalizedUrl = normalizeFigmaUrl(rawUrl);

  return `https://www.figma.com/embed?embed_host=${embedHost}&url=${encodeURIComponent(normalizedUrl.toString())}`;
}

export function createFigmaPreviewFromUrl(rawUrl: string): FigmaSettings {
  const normalizedUrl = normalizeFigmaUrl(rawUrl);
  const url = normalizedUrl.toString();

  return {
    name: readPreviewName(normalizedUrl),
    url,
    embedUrl: createFigmaEmbedUrl(url),
    fileKey: readFileKey(normalizedUrl),
    nodeId: readNodeId(normalizedUrl),
    width: figmaPreviewWidth,
    height: figmaPreviewHeight,
  };
}
