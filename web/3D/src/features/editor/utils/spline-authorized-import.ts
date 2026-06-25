import { createSplineImportDocumentFromInput, getSplineEditorFileReferenceFromInput, type SplineImportDocumentResult } from "./spline-import";

export const splineAuthorizedImportEnvironmentKeys = ["SPLINE_IMPORT_EXPORT_ENDPOINT", "SPLINE_IMPORT_API_TOKEN", "SPLINE_IMPORT_REQUEST_TOKEN"] as const;
export { getSplineEditorFileReferenceFromInput };

type SplineAuthorizedImportEnvironmentKey = (typeof splineAuthorizedImportEnvironmentKeys)[number];

export type SplineAuthorizedImportFetcher = (url: string, init: RequestInit) => Promise<Response>;

export interface SplineAuthorizedImportConfig {
  endpoint?: string;
  fetcher?: SplineAuthorizedImportFetcher;
  requestToken?: string;
  token?: string;
}

export interface SplineAuthorizedImportCapabilities {
  environmentKeys: SplineAuthorizedImportEnvironmentKey[];
  privateEditorFileImport: boolean;
  publicExportImport: true;
}

export interface SplineAuthorizedImportHealth {
  checkedAt: string;
  privateEditorFileImport: {
    acceptedFormats?: string[];
    configured: boolean;
    endpointConfigured: boolean;
    environmentKeys: SplineAuthorizedImportEnvironmentKey[];
    message: string;
    provider?: string;
    requestTokenConfigured: boolean;
    status: "configured" | "invalid-configuration" | "invalid-response" | "not-configured" | "ready" | "unreachable";
    tokenConfigured: boolean;
  };
  publicExportImport: {
    message: string;
    status: "ready";
  };
}

export interface SplineProjectOpenResult extends SplineImportDocumentResult {
  importSource: {
    bridge: "authorized-exporter" | "none";
    inputKind: "private-editor-file" | "public-export";
    privateFileId?: string;
    sourceUrl: string;
  };
}

export interface SplineAuthorizedImportConformanceResult {
  checkedAt: string;
  document?: {
    name: string;
    objectCount: number;
    primaryObjectId: string;
  };
  health: SplineAuthorizedImportHealth["privateEditorFileImport"];
  message: string;
  ok: boolean;
  privateFileId?: string;
  provider?: string;
  runtime?: {
    height: number;
    renderMode: SplineProjectOpenResult["spline"]["renderMode"];
    runtimeUrl: string;
    sourceKind: SplineProjectOpenResult["spline"]["sourceKind"];
    width: number;
  };
  sourceUrl?: string;
  status: "invalid-configuration" | "invalid-request" | "invalid-response" | "not-configured" | "ready" | "unreachable";
}

function clean(value: string | undefined) {
  return value?.trim() || "";
}

function isLoopbackHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function normalizeAuthorizedEndpoint(endpoint: string | undefined) {
  const rawEndpoint = clean(endpoint);

  if (!rawEndpoint) {
    throw new Error("Private Spline editor-file imports need SPLINE_IMPORT_EXPORT_ENDPOINT configured with a user-approved Spline export service.");
  }

  let url: URL;

  try {
    url = new URL(rawEndpoint);
  } catch {
    throw new Error("SPLINE_IMPORT_EXPORT_ENDPOINT must be a valid absolute URL.");
  }

  if (url.protocol !== "https:" && !(url.protocol === "http:" && isLoopbackHost(url.hostname))) {
    throw new Error("SPLINE_IMPORT_EXPORT_ENDPOINT must use HTTPS, except localhost during development.");
  }

  url.hash = "";

  return url.toString();
}

function normalizeAuthorizedToken(token: string | undefined) {
  const rawToken = clean(token);

  if (!rawToken) {
    throw new Error("Private Spline editor-file imports need SPLINE_IMPORT_API_TOKEN configured for the user-approved Spline export service.");
  }

  return rawToken;
}

function normalizeAuthorizedRequestToken(token: string | undefined) {
  const rawToken = clean(token);

  if (!rawToken) {
    throw new Error("Private Spline editor-file API imports need SPLINE_IMPORT_REQUEST_TOKEN configured so callers must prove they can use the private export bridge.");
  }

  return rawToken;
}

function readRequestToken(headers: Headers) {
  const bearerPrefix = "Bearer ";
  const authorization = headers.get("authorization")?.trim() ?? "";

  if (authorization.toLowerCase().startsWith(bearerPrefix.toLowerCase())) {
    return authorization.slice(bearerPrefix.length).trim();
  }

  return headers.get("x-spline-import-token")?.trim() ?? "";
}

function isSameToken(left: string, right: string) {
  const maxLength = Math.max(left.length, right.length);
  let difference = left.length === right.length ? 0 : 1;

  for (let index = 0; index < maxLength; index += 1) {
    difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }

  return difference === 0;
}

function normalizeExternalError(value: unknown) {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  if (value && typeof value === "object" && "error" in value && typeof value.error === "string" && value.error.trim()) {
    return value.error.trim();
  }

  return "Authorized Spline export service could not resolve this private editor file.";
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasRuntimeExportReference(value: Record<string, unknown>) {
  return ["sceneUrl", "url", "viewerUrl", "sourceUrl", "runtimeUrl", "embedUrl", "scene", "src"].some((key) => typeof value[key] === "string" && value[key].trim().length > 0);
}

export function normalizeAuthorizedSplineExportPayload(value: unknown) {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  if (!isPlainObject(value)) {
    throw new Error("Authorized Spline export service returned an invalid export payload. Return a Spline public URL, Viewer embed, .splinecode URL, or JSON runtime payload.");
  }

  const rawSplinePayload = value.spline;
  const payload =
    typeof rawSplinePayload === "string" && rawSplinePayload.trim()
      ? rawSplinePayload.trim()
      : isPlainObject(rawSplinePayload)
        ? {
            ...rawSplinePayload,
            height: rawSplinePayload.height ?? value.height,
            name: rawSplinePayload.name ?? value.name,
            width: rawSplinePayload.width ?? value.width,
          }
        : value;

  if (typeof payload === "string" && payload.trim()) {
    return payload.trim();
  }

  if (!isPlainObject(payload) || !hasRuntimeExportReference(payload)) {
    throw new Error("Authorized Spline export service returned an invalid export payload. Return JSON with sceneUrl, viewerUrl, runtimeUrl, url, sourceUrl, embedUrl, scene, or src.");
  }

  return payload;
}

function readStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim()) : [];
}

export function readSplineAuthorizedImportConfig(env: Record<string, string | undefined> = process.env): SplineAuthorizedImportConfig {
  return {
    endpoint: env.SPLINE_IMPORT_EXPORT_ENDPOINT,
    requestToken: env.SPLINE_IMPORT_REQUEST_TOKEN,
    token: env.SPLINE_IMPORT_API_TOKEN,
  };
}

export function getSplineAuthorizedImportCapabilities(config: SplineAuthorizedImportConfig): SplineAuthorizedImportCapabilities {
  return {
    environmentKeys: [...splineAuthorizedImportEnvironmentKeys],
    privateEditorFileImport: Boolean(clean(config.endpoint) && clean(config.token) && clean(config.requestToken)),
    publicExportImport: true,
  };
}

export function getSplineAuthorizedImportHealth(
  config: SplineAuthorizedImportConfig,
  now: Date = new Date(),
): SplineAuthorizedImportHealth {
  const endpointConfigured = Boolean(clean(config.endpoint));
  const requestTokenConfigured = Boolean(clean(config.requestToken));
  const tokenConfigured = Boolean(clean(config.token));
  const missingKeys = [
    endpointConfigured ? "" : "SPLINE_IMPORT_EXPORT_ENDPOINT",
    tokenConfigured ? "" : "SPLINE_IMPORT_API_TOKEN",
    requestTokenConfigured ? "" : "SPLINE_IMPORT_REQUEST_TOKEN",
  ].filter(Boolean);

  let status: SplineAuthorizedImportHealth["privateEditorFileImport"]["status"] = "not-configured";
  let message = "Private Spline editor-file imports need SPLINE_IMPORT_EXPORT_ENDPOINT, SPLINE_IMPORT_API_TOKEN, and SPLINE_IMPORT_REQUEST_TOKEN.";

  if (missingKeys.length > 0 && missingKeys.length < splineAuthorizedImportEnvironmentKeys.length) {
    status = "invalid-configuration";
    message = `Private Spline editor-file imports are missing ${missingKeys.join(", ")}.`;
  }

  if (missingKeys.length === 0) {
    try {
      normalizeAuthorizedEndpoint(config.endpoint);
      normalizeAuthorizedToken(config.token);
      normalizeAuthorizedRequestToken(config.requestToken);
      status = "configured";
      message = "Private Spline editor-file bridge is configured. Use the document import API to resolve authorized editor-file exports.";
    } catch (error) {
      status = "invalid-configuration";
      message = error instanceof Error ? error.message : "Private Spline editor-file bridge configuration is invalid.";
    }
  }

  return {
    checkedAt: now.toISOString(),
    privateEditorFileImport: {
      configured: status === "configured",
      endpointConfigured,
      environmentKeys: [...splineAuthorizedImportEnvironmentKeys],
      message,
      requestTokenConfigured,
      status,
      tokenConfigured,
    },
    publicExportImport: {
      message: "Public Spline URLs, Viewer embeds, .splinecode URLs, and JSON runtime payloads are supported.",
      status: "ready",
    },
  };
}

export function assertSplinePrivateImportRequestAccess(input: unknown, config: SplineAuthorizedImportConfig, headers: Headers) {
  const privateFileReference = getSplineEditorFileReferenceFromInput(input);

  if (!privateFileReference || !clean(config.endpoint) || !clean(config.token)) {
    return;
  }

  const expectedToken = normalizeAuthorizedRequestToken(config.requestToken);
  const requestToken = readRequestToken(headers);

  if (!requestToken) {
    throw new Error("Private Spline editor-file imports require Authorization: Bearer <SPLINE_IMPORT_REQUEST_TOKEN> or X-Spline-Import-Token.");
  }

  if (!isSameToken(requestToken, expectedToken)) {
    throw new Error("Private Spline editor-file import token is invalid.");
  }
}

export async function probeSplineAuthorizedImportProvider(
  config: SplineAuthorizedImportConfig,
  fetcher: SplineAuthorizedImportFetcher = fetch,
) {
  const endpoint = normalizeAuthorizedEndpoint(config.endpoint);
  const token = normalizeAuthorizedToken(config.token);
  const response = await (config.fetcher ?? fetcher)(endpoint, {
    body: JSON.stringify({
      acceptedFormats: ["public-url", "viewer-embed", "splinecode", "json-scene-url"],
      action: "health-check",
      requestedFormat: "capability-check",
    }),
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const responseBody = await response.json().catch(() => null);

  if (!response.ok) {
    return {
      message: normalizeExternalError(responseBody),
      status: "unreachable" as const,
    };
  }

  if (!isPlainObject(responseBody)) {
    return {
      message: "Authorized Spline export service returned an invalid health response.",
      status: "invalid-response" as const,
    };
  }

  const ready = responseBody.ok === true || responseBody.status === "ready";

  if (!ready) {
    return {
      message: normalizeExternalError(responseBody),
      status: "invalid-response" as const,
    };
  }

  return {
    acceptedFormats: readStringArray(responseBody.acceptedFormats),
    message: "Authorized Spline export service is reachable and ready.",
    provider: typeof responseBody.provider === "string" ? responseBody.provider.trim() || undefined : undefined,
    status: "ready" as const,
  };
}

export async function createAuthorizedSplineImportDocumentFromInput(
  input: unknown,
  config: SplineAuthorizedImportConfig,
  fetcher: SplineAuthorizedImportFetcher = fetch,
): Promise<SplineImportDocumentResult> {
  const privateFileReference = getSplineEditorFileReferenceFromInput(input);

  if (!privateFileReference) {
    return createSplineImportDocumentFromInput(input);
  }

  const endpoint = normalizeAuthorizedEndpoint(config.endpoint);
  const token = normalizeAuthorizedToken(config.token);
  const response = await (config.fetcher ?? fetcher)(endpoint, {
    body: JSON.stringify({
      acceptedFormats: ["public-url", "viewer-embed", "splinecode", "json-scene-url"],
      fileId: privateFileReference.fileId,
      requestedFormat: "public-runtime-export",
      sourceUrl: privateFileReference.sourceUrl,
    }),
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const responseBody = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(normalizeExternalError(responseBody));
  }

  return createSplineImportDocumentFromInput(normalizeAuthorizedSplineExportPayload(responseBody));
}

export async function openSplineProjectFromInput(
  input: unknown,
  config: SplineAuthorizedImportConfig,
  fetcher: SplineAuthorizedImportFetcher = fetch,
): Promise<SplineProjectOpenResult> {
  const privateFileReference = getSplineEditorFileReferenceFromInput(input);
  const result = await createAuthorizedSplineImportDocumentFromInput(input, config, fetcher);

  return {
    ...result,
    importSource: privateFileReference
      ? {
          bridge: "authorized-exporter",
          inputKind: "private-editor-file",
          privateFileId: privateFileReference.fileId,
          sourceUrl: privateFileReference.sourceUrl,
        }
      : {
          bridge: "none",
          inputKind: "public-export",
          sourceUrl: result.spline.sourceUrl,
      },
  };
}

export async function verifySplineAuthorizedImportProviderConformance(
  input: unknown,
  config: SplineAuthorizedImportConfig,
  fetcher: SplineAuthorizedImportFetcher = fetch,
  now: Date = new Date(),
): Promise<SplineAuthorizedImportConformanceResult> {
  const checkedAt = now.toISOString();
  const privateFileReference = getSplineEditorFileReferenceFromInput(input);
  const health = getSplineAuthorizedImportHealth(config, now).privateEditorFileImport;

  if (!privateFileReference) {
    return {
      checkedAt,
      health,
      message: "Provider conformance needs a private app.spline.design/file/... URL.",
      ok: false,
      status: "invalid-request",
    };
  }

  if (health.status !== "configured") {
    return {
      checkedAt,
      health,
      message: health.message,
      ok: false,
      privateFileId: privateFileReference.fileId,
      sourceUrl: privateFileReference.sourceUrl,
      status: health.status === "not-configured" ? "not-configured" : "invalid-configuration",
    };
  }

  let probe: Awaited<ReturnType<typeof probeSplineAuthorizedImportProvider>>;

  try {
    probe = await probeSplineAuthorizedImportProvider(config, fetcher);
  } catch (error) {
    return {
      checkedAt,
      health: {
        ...health,
        message: error instanceof Error ? error.message : "Authorized Spline export service could not be reached.",
        status: "unreachable",
      },
      message: error instanceof Error ? error.message : "Authorized Spline export service could not be reached.",
      ok: false,
      privateFileId: privateFileReference.fileId,
      sourceUrl: privateFileReference.sourceUrl,
      status: "unreachable",
    };
  }

  const probedHealth = {
    ...health,
    ...probe,
  };

  if (probe.status !== "ready") {
    return {
      checkedAt,
      health: probedHealth,
      message: probe.message,
      ok: false,
      privateFileId: privateFileReference.fileId,
      provider: probe.provider,
      sourceUrl: privateFileReference.sourceUrl,
      status: probe.status,
    };
  }

  try {
    const openedProject = await openSplineProjectFromInput(input, config, fetcher);

    return {
      checkedAt,
      document: {
        name: openedProject.document.name,
        objectCount: openedProject.document.objects.length,
        primaryObjectId: openedProject.primaryObjectId,
      },
      health: probedHealth,
      message: "Authorized Spline export bridge can resolve this private file into a valid editor document.",
      ok: true,
      privateFileId: privateFileReference.fileId,
      provider: probe.provider,
      runtime: {
        height: openedProject.spline.height,
        renderMode: openedProject.spline.renderMode,
        runtimeUrl: openedProject.spline.runtimeUrl,
        sourceKind: openedProject.spline.sourceKind,
        width: openedProject.spline.width,
      },
      sourceUrl: privateFileReference.sourceUrl,
      status: "ready",
    };
  } catch (error) {
    return {
      checkedAt,
      health: probedHealth,
      message: error instanceof Error ? error.message : "Authorized Spline export bridge returned an invalid project export.",
      ok: false,
      privateFileId: privateFileReference.fileId,
      provider: probe.provider,
      sourceUrl: privateFileReference.sourceUrl,
      status: "invalid-response",
    };
  }
}
