import { getCodeExportPath, getEmbedPath, getSharePath } from "@/features/projects/share-links";

export type PostDeploySyntheticSmokeKey = "api-helper" | "compliance-download" | "embed" | "public-viewer";
export type PostDeploySyntheticSmokeStatus = "fail" | "pass";

export interface PostDeploySyntheticSmokeConfig {
  authCookie?: string | null;
  baseUrl: string;
  generatedAt?: string;
  projectId: string;
  sceneId?: string | null;
  shareId: string;
  timeoutMs?: number;
}

export interface PostDeploySyntheticSmokeCheck {
  accept: string;
  key: PostDeploySyntheticSmokeKey;
  label: string;
  method: "GET";
  requiredAuthCookie: boolean;
  requiredHeaders?: Record<string, string>;
  requiredText?: string[];
  url: string;
  validateJson?: (json: unknown) => string[];
}

export interface PostDeploySyntheticSmokeCheckResult {
  contentType: string | null;
  durationMs: number;
  httpStatus: number | null;
  issues: string[];
  key: PostDeploySyntheticSmokeKey;
  label: string;
  status: PostDeploySyntheticSmokeStatus;
  url: string;
}

export interface PostDeploySyntheticSmokeReport {
  baseUrl: string;
  checks: PostDeploySyntheticSmokeCheckResult[];
  durationMs: number;
  failedCount: number;
  generatedAt: string;
  passedCount: number;
  projectId: string;
  sceneId: string | null;
  shareId: string;
  status: PostDeploySyntheticSmokeStatus;
}

export interface PostDeploySyntheticSmokeResponse {
  headers: {
    get(name: string): string | null;
  };
  status: number;
  text(): Promise<string>;
}

export type PostDeploySyntheticSmokeFetch = (url: string, init: RequestInit) => Promise<PostDeploySyntheticSmokeResponse>;

function normalizeBaseUrl(baseUrl: string) {
  const normalized = baseUrl.trim().replace(/\/+$/, "");

  if (!normalized) {
    throw new Error("A base URL is required for post-deploy synthetic smoke checks.");
  }

  return normalized.startsWith("http://") || normalized.startsWith("https://") ? normalized : `https://${normalized}`;
}

function absoluteUrl(baseUrl: string, path: string) {
  return new URL(path, `${normalizeBaseUrl(baseUrl)}/`).toString();
}

function getComplianceDownloadPath(projectId: string) {
  return `/api/projects/${encodeURIComponent(projectId)}/compliance?download=1`;
}

function hasContentType(contentType: string | null, expected: string) {
  return contentType?.toLowerCase().includes(expected) ?? false;
}

function readJsonPath(source: unknown, path: string) {
  return path.split(".").reduce<unknown>((value, key) => {
    if (!value || typeof value !== "object") {
      return undefined;
    }

    return (value as Record<string, unknown>)[key];
  }, source);
}

function validateJsonPaths(json: unknown, paths: string[]) {
  return paths.flatMap((path) => (readJsonPath(json, path) === undefined ? [`Missing JSON field ${path}.`] : []));
}

function validateApiHelperJson(json: unknown, shareId: string) {
  const issues = validateJsonPaths(json, ["code.fetchScene", "code.runtimeApi", "code.iframe", "platformEmbeds", "appPackages", "scene.shareId"]);
  const jsonShareId = readJsonPath(json, "scene.shareId");
  const fetchScene = readJsonPath(json, "code.fetchScene");

  if (jsonShareId !== shareId) {
    issues.push("API helper response did not match the requested share id.");
  }

  if (typeof fetchScene !== "string" || !fetchScene.includes(`/api/public/scenes/${shareId}`)) {
    issues.push("API helper response did not include a usable public scene fetch helper.");
  }

  return issues;
}

function validateComplianceJson(json: unknown, projectId: string) {
  const issues = validateJsonPaths(json, ["audit.eventCount", "project.id", "schemaVersion"]);
  const jsonProjectId = readJsonPath(json, "project.id");
  const schemaVersion = readJsonPath(json, "schemaVersion");

  if (jsonProjectId !== projectId) {
    issues.push("Compliance download did not match the requested project id.");
  }

  if (schemaVersion !== 1) {
    issues.push("Compliance download did not expose schemaVersion 1.");
  }

  return issues;
}

export function createPostDeploySyntheticSmokeChecks(config: PostDeploySyntheticSmokeConfig): PostDeploySyntheticSmokeCheck[] {
  const baseUrl = normalizeBaseUrl(config.baseUrl);

  return [
    {
      accept: "text/html",
      key: "public-viewer",
      label: "Public viewer",
      method: "GET",
      requiredAuthCookie: false,
      requiredText: ["Shared Essence Spline scene"],
      url: absoluteUrl(baseUrl, getSharePath(config.shareId, config.sceneId)),
    },
    {
      accept: "text/html",
      key: "embed",
      label: "Embed",
      method: "GET",
      requiredAuthCookie: false,
      requiredText: ["_next/static"],
      url: absoluteUrl(baseUrl, getEmbedPath(config.shareId, config.sceneId)),
    },
    {
      accept: "application/json",
      key: "api-helper",
      label: "API helper",
      method: "GET",
      requiredAuthCookie: false,
      url: absoluteUrl(baseUrl, getCodeExportPath(config.shareId, config.sceneId)),
      validateJson: (json) => validateApiHelperJson(json, config.shareId),
    },
    {
      accept: "application/json",
      key: "compliance-download",
      label: "Compliance download",
      method: "GET",
      requiredAuthCookie: true,
      requiredHeaders: {
        "content-disposition": "attachment",
      },
      url: absoluteUrl(baseUrl, getComplianceDownloadPath(config.projectId)),
      validateJson: (json) => validateComplianceJson(json, config.projectId),
    },
  ];
}

function createTimeoutSignal(timeoutMs: number) {
  if (typeof AbortSignal !== "undefined" && "timeout" in AbortSignal) {
    return AbortSignal.timeout(timeoutMs);
  }

  const controller = new AbortController();

  setTimeout(() => controller.abort(), timeoutMs).unref?.();

  return controller.signal;
}

function buildHeaders(check: PostDeploySyntheticSmokeCheck, authCookie?: string | null) {
  const headers: Record<string, string> = {
    Accept: check.accept,
  };

  if (check.requiredAuthCookie && authCookie?.trim()) {
    headers.Cookie = authCookie.trim();
  }

  return headers;
}

async function runCheck(check: PostDeploySyntheticSmokeCheck, config: PostDeploySyntheticSmokeConfig, fetcher: PostDeploySyntheticSmokeFetch): Promise<PostDeploySyntheticSmokeCheckResult> {
  const startedAt = Date.now();
  const issues: string[] = [];

  if (check.requiredAuthCookie && !config.authCookie?.trim()) {
    return {
      contentType: null,
      durationMs: Date.now() - startedAt,
      httpStatus: null,
      issues: ["Authenticated compliance smoke requires ESSENCE_SYNTHETIC_AUTH_COOKIE or --auth-cookie."],
      key: check.key,
      label: check.label,
      status: "fail",
      url: check.url,
    };
  }

  try {
    const response = await fetcher(check.url, {
      headers: buildHeaders(check, config.authCookie),
      method: check.method,
      signal: createTimeoutSignal(config.timeoutMs ?? 12_000),
    });
    const contentType = response.headers.get("content-type");
    const body = await response.text();

    if (response.status < 200 || response.status >= 300) {
      issues.push(`Expected a 2xx response but received ${response.status}.`);
    }

    if (!hasContentType(contentType, check.accept)) {
      issues.push(`Expected ${check.accept} content type but received ${contentType ?? "none"}.`);
    }

    for (const [headerName, expectedValue] of Object.entries(check.requiredHeaders ?? {})) {
      const actualValue = response.headers.get(headerName);

      if (!actualValue?.toLowerCase().includes(expectedValue.toLowerCase())) {
        issues.push(`Expected ${headerName} to include ${expectedValue}.`);
      }
    }

    for (const token of check.requiredText ?? []) {
      if (!body.includes(token)) {
        issues.push(`Missing response text token ${token}.`);
      }
    }

    if (check.validateJson) {
      try {
        issues.push(...check.validateJson(JSON.parse(body)));
      } catch {
        issues.push("Response body was not valid JSON.");
      }
    }

    return {
      contentType,
      durationMs: Date.now() - startedAt,
      httpStatus: response.status,
      issues,
      key: check.key,
      label: check.label,
      status: issues.length > 0 ? "fail" : "pass",
      url: check.url,
    };
  } catch (error) {
    return {
      contentType: null,
      durationMs: Date.now() - startedAt,
      httpStatus: null,
      issues: [error instanceof Error ? error.message : "Request failed."],
      key: check.key,
      label: check.label,
      status: "fail",
      url: check.url,
    };
  }
}

export async function runPostDeploySyntheticSmoke(config: PostDeploySyntheticSmokeConfig, fetcher: PostDeploySyntheticSmokeFetch = fetch) {
  const startedAt = Date.now();
  const baseUrl = normalizeBaseUrl(config.baseUrl);
  const checks = createPostDeploySyntheticSmokeChecks(config);
  const results = await Promise.all(checks.map((check) => runCheck(check, config, fetcher)));
  const failedCount = results.filter((result) => result.status === "fail").length;

  return {
    baseUrl,
    checks: results,
    durationMs: Date.now() - startedAt,
    failedCount,
    generatedAt: config.generatedAt ?? new Date().toISOString(),
    passedCount: results.length - failedCount,
    projectId: config.projectId,
    sceneId: config.sceneId?.trim() || null,
    shareId: config.shareId,
    status: failedCount > 0 ? "fail" : "pass",
  } satisfies PostDeploySyntheticSmokeReport;
}

export function formatPostDeploySyntheticSmokeReport(report: PostDeploySyntheticSmokeReport) {
  const lines = [
    `Post-deploy synthetic smoke: ${report.status.toUpperCase()}`,
    `Base URL: ${report.baseUrl}`,
    `Checks: ${report.passedCount}/${report.checks.length} passed`,
    `Duration: ${report.durationMs}ms`,
    "",
    ...report.checks.map((check) => {
      const issueText = check.issues.length > 0 ? ` - ${check.issues.join(" ")}` : "";

      return `[${check.status.toUpperCase()}] ${check.label}: ${check.url}${issueText}`;
    }),
  ];

  return lines.join("\n");
}
