import { createDefaultDocument, createSceneObject } from "../scene/default-document";
import { ensureDocumentScenes } from "../scene/multi-scene";
import type { SceneDocument, SplineSettings } from "../types";

const defaultSplineWidth = 3.6;
const defaultSplineHeight = 2.25;
const viewerEndpointPath = "/api/spline/viewer";
const splineViewerModuleUrl = "https://unpkg.com/@splinetool/viewer/build/spline-viewer.js";
const allowedSplineHosts = new Set(["app.spline.design", "draft.spline.design", "my.spline.design", "prod.spline.design", "viewer.spline.design"]);

type SplineRenderMode = SplineSettings["renderMode"];
type SplineSourceKind = SplineSettings["sourceKind"];

interface SplineImportInput {
  embedUrl?: unknown;
  input?: unknown;
  name?: unknown;
  runtimeUrl?: unknown;
  scene?: unknown;
  sceneUrl?: unknown;
  sourceUrl?: unknown;
  src?: unknown;
  url?: unknown;
  viewerUrl?: unknown;
  width?: unknown;
  height?: unknown;
}

interface ResolvedSplineInput {
  height?: number;
  name?: string;
  rawUrl: string;
  width?: number;
}

export interface SplineImportDocumentResult {
  document: SceneDocument;
  primaryObjectId: string;
  spline: SplineSettings;
}

export interface SplineEditorFileReference {
  fileId: string;
  sourceUrl: string;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readSize(value: unknown, fallback: number) {
  const numberValue = typeof value === "number" ? value : typeof value === "string" ? Number.parseFloat(value) : Number.NaN;

  return Number.isFinite(numberValue) ? Math.min(48, Math.max(0.5, numberValue)) : fallback;
}

function getFirstUrlFromObject(input: SplineImportInput) {
  return (
    readString(input.sceneUrl) ||
    readString(input.url) ||
    readString(input.viewerUrl) ||
    readString(input.sourceUrl) ||
    readString(input.runtimeUrl) ||
    readString(input.embedUrl) ||
    readString(input.scene) ||
    readString(input.src)
  );
}

function tryParseJsonObject(input: string): Record<string, unknown> | null {
  if (!input.startsWith("{") && !input.startsWith("[")) {
    return null;
  }

  try {
    const parsed = JSON.parse(input);

    return isPlainObject(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function decodeHtmlAttribute(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", "\"")
    .replaceAll("&#34;", "\"")
    .replaceAll("&#39;", "'")
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function extractUrlFromSnippet(input: string) {
  const patterns = [
    /\burl\s*=\s*["']([^"']+)["']/i,
    /\bscene\s*=\s*["']([^"']+)["']/i,
    /\bsrc\s*=\s*["']([^"']+)["']/i,
    /https:\/\/[^\s"'<>]+/i,
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(input);
    const value = match?.[1] ?? match?.[0];

    if (value) {
      return decodeHtmlAttribute(value.trim());
    }
  }

  return null;
}

function resolveSplineInput(input: unknown): ResolvedSplineInput {
  if (isPlainObject(input)) {
    const rawUrl = getFirstUrlFromObject(input);

    if (!rawUrl && input.input !== undefined) {
      const nested = resolveSplineInput(input.input);

      return {
        ...nested,
        height: readSize(input.height, nested.height ?? defaultSplineHeight),
        name: readString(input.name) || nested.name,
        width: readSize(input.width, nested.width ?? defaultSplineWidth),
      };
    }

    if (!rawUrl) {
      throw new Error("Provide a Spline public URL, viewer embed code, code-export URL, or API payload with sceneUrl.");
    }

    return {
      height: readSize(input.height, defaultSplineHeight),
      name: readString(input.name) || undefined,
      rawUrl,
      width: readSize(input.width, defaultSplineWidth),
    };
  }

  const rawInput = readString(input);

  if (!rawInput) {
    throw new Error("Paste a Spline public URL, viewer embed code, code-export URL, or API payload.");
  }

  const parsedObject = tryParseJsonObject(rawInput);

  if (parsedObject) {
    return resolveSplineInput(parsedObject);
  }

  return {
    rawUrl: extractUrlFromSnippet(rawInput) ?? rawInput,
  };
}

function isSplineHost(hostname: string) {
  return allowedSplineHosts.has(hostname);
}

function isSplineEditorFileUrl(url: URL) {
  return url.hostname === "app.spline.design" && /^\/file(\/|$)/i.test(url.pathname);
}

function hasSplineCodePath(url: URL) {
  return url.pathname.toLowerCase().endsWith(".splinecode");
}

function getPathSegments(url: URL) {
  return url.pathname.split("/").filter(Boolean);
}

function titleCase(value: string) {
  return value
    .replace(/\.[^.]+$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function readSceneName(url: URL) {
  const segments = getPathSegments(url);
  const sceneCodeIndex = segments.findIndex((segment) => segment.toLowerCase().endsWith(".splinecode"));
  const sourceSegment = sceneCodeIndex > 0 ? segments[sceneCodeIndex - 1] : segments.at(-1);
  const decodedSegment = sourceSegment ? decodeURIComponent(sourceSegment) : "";
  const readableName = titleCase(decodedSegment);

  if (!readableName) {
    return "Spline Scene";
  }

  if (hasSplineCodePath(url) && /^[a-z0-9]+$/i.test(decodedSegment)) {
    return `Spline Scene ${decodedSegment}`;
  }

  return readableName;
}

function resolveSourceKind(url: URL): { renderMode: SplineRenderMode; sourceKind: SplineSourceKind } {
  if (hasSplineCodePath(url)) {
    return {
      renderMode: "spline-viewer",
      sourceKind: "splinecode",
    };
  }

  if (url.hostname === "my.spline.design" || url.hostname === "viewer.spline.design") {
    return {
      renderMode: "iframe",
      sourceKind: "public-url",
    };
  }

  if (url.hostname === "app.spline.design") {
    throw new Error("Spline editor file URLs require a public export, Viewer embed, or Code export API URL before this app can open them.");
  }

  return {
    renderMode: "iframe",
    sourceKind: "public-url",
  };
}

export function normalizeSplineSourceUrl(rawUrl: string) {
  let url: URL;

  try {
    url = new URL(rawUrl.trim());
  } catch {
    throw new Error("Use a valid Spline URL or embed snippet.");
  }

  if (url.protocol !== "https:") {
    throw new Error("Spline scene imports require HTTPS URLs.");
  }

  url.hash = "";

  if (!isSplineHost(url.hostname)) {
    throw new Error("Use a Spline-hosted public URL, Viewer embed URL, or Code export URL.");
  }

  if (isSplineEditorFileUrl(url)) {
    throw new Error("Private Spline editor file URLs need a public export, Viewer embed, or Code export API URL before they can open here.");
  }

  return url;
}

export function getSplineEditorFileReferenceFromInput(input: unknown): SplineEditorFileReference | null {
  const resolvedInput = resolveSplineInput(input);
  let url: URL;

  try {
    url = new URL(resolvedInput.rawUrl.trim());
  } catch {
    return null;
  }

  if (url.protocol !== "https:" || !isSplineEditorFileUrl(url)) {
    return null;
  }

  url.hash = "";

  const [, fileId] = getPathSegments(url);

  return fileId
    ? {
        fileId,
        sourceUrl: url.toString(),
      }
    : null;
}

export function getSplineViewerEmbedPath(runtimeUrl: string) {
  return `${viewerEndpointPath}?url=${encodeURIComponent(runtimeUrl)}`;
}

export function createSplineImportFromInput(input: unknown): SplineSettings {
  const resolvedInput = resolveSplineInput(input);
  const url = normalizeSplineSourceUrl(resolvedInput.rawUrl);
  const source = resolveSourceKind(url);
  const runtimeUrl = url.toString();

  return {
    embedUrl: source.renderMode === "spline-viewer" ? getSplineViewerEmbedPath(runtimeUrl) : runtimeUrl,
    height: resolvedInput.height ?? defaultSplineHeight,
    name: resolvedInput.name ?? readSceneName(url),
    renderMode: source.renderMode,
    runtimeUrl,
    sourceKind: source.sourceKind,
    sourceUrl: runtimeUrl,
    warnings: [],
    width: resolvedInput.width ?? defaultSplineWidth,
  };
}

export function resolveSplineImportRequest(payload: unknown): SplineSettings {
  return createSplineImportFromInput(payload);
}

export function createSplineImportDocumentFromInput(input: unknown): SplineImportDocumentResult {
  const spline = createSplineImportFromInput(input);
  const baseDocument = createDefaultDocument(spline.name);
  const splineObject = createSceneObject("spline", spline.name || "Spline Scene");
  const camera = createSceneObject("camera", "Main Camera");
  const light = createSceneObject("directionalLight", "Key Light");

  splineObject.spline = structuredClone(spline);
  splineObject.transform.position = [0, 1.15, 0];
  splineObject.transform.scale = [1, 1, 1];
  splineObject.material = {
    ...splineObject.material,
    color: "#ffffff",
    roughness: 0.72,
    metalness: 0,
  };

  camera.transform.position = [0, 1.45, 6.2];
  camera.transform.rotation = [-0.18, 0, 0];

  light.transform.position = [2.6, 3.4, 3.2];
  light.transform.rotation = [-0.55, 0.45, 0];

  const document = ensureDocumentScenes({
    ...baseDocument,
    name: spline.name,
    activeCameraId: camera.id,
    sceneStates: [],
    inputControls: [],
    components: [],
    materialAssets: [],
    audioAssets: [],
    variables: [],
    animationTracks: [],
    objects: [splineObject, camera, light],
  });

  return {
    document,
    primaryObjectId: splineObject.id,
    spline,
  };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

export function createSplineViewerHtml(runtimeUrl: string) {
  const settings = createSplineImportFromInput(runtimeUrl);

  if (settings.renderMode !== "spline-viewer") {
    throw new Error("The Spline viewer wrapper requires a .splinecode runtime URL.");
  }

  const safeUrl = escapeHtml(settings.runtimeUrl);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escapeHtml(settings.name)}</title>
    <style>
      html,
      body {
        width: 100%;
        height: 100%;
        margin: 0;
        overflow: hidden;
        background: #09090b;
      }

      spline-viewer {
        display: block;
        width: 100%;
        height: 100%;
      }

      noscript,
      .fallback {
        display: grid;
        min-height: 100%;
        place-items: center;
        padding: 24px;
        color: #f8fafc;
        font: 14px/1.5 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
    </style>
    <script type="module" src="${splineViewerModuleUrl}"></script>
  </head>
  <body>
    <spline-viewer loading="eager" url="${safeUrl}"></spline-viewer>
    <noscript>This Spline scene needs JavaScript to run.</noscript>
  </body>
</html>`;
}
