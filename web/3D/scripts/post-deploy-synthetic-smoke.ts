import { config } from "dotenv";
import {
  formatPostDeploySyntheticSmokeReport,
  runPostDeploySyntheticSmoke,
  type PostDeploySyntheticSmokeFetch,
  type PostDeploySyntheticSmokeResponse,
} from "@/features/deployment/post-deploy-synthetic-smoke";
import {
  appendPostDeploySyntheticSmokeHistory,
  getDefaultPostDeploySyntheticSmokeHistoryPath,
  getDefaultPostDeploySyntheticSmokeReportPath,
  writePostDeploySyntheticSmokeReport,
} from "@/features/deployment/server/post-deploy-synthetic-source";

config({ path: ".env.local" });
config({ path: ".env.production.local", override: true });

const args = process.argv.slice(2);
const argMap = new Map(
  args
    .filter((arg) => arg.startsWith("--") && arg.includes("="))
    .map((arg) => {
      const [key, ...valueParts] = arg.slice(2).split("=");

      return [key, valueParts.join("=")] as const;
    }),
);
const argFlags = new Set(args.filter((arg) => arg.startsWith("--") && !arg.includes("=")).map((arg) => arg.slice(2)));

function valueFrom(...keys: string[]) {
  return keys.map((key) => argMap.get(key) ?? process.env[key]).find((value) => value?.trim());
}

function getBaseUrl() {
  const explicitBaseUrl = argMap.get("base-url") ?? process.env.ESSENCE_SYNTHETIC_BASE_URL ?? process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_BETTER_AUTH_URL;
  const vercelProductionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  const candidate = explicitBaseUrl ?? vercelProductionUrl;

  return candidate?.startsWith("http") || !candidate ? candidate : `https://${candidate}`;
}

function getReportPath() {
  return argMap.get("report") ?? process.env.ESSENCE_SYNTHETIC_REPORT_PATH ?? getDefaultPostDeploySyntheticSmokeReportPath();
}

function getHistoryPath() {
  return argMap.get("history") ?? process.env.ESSENCE_SYNTHETIC_HISTORY_PATH ?? getDefaultPostDeploySyntheticSmokeHistoryPath();
}

function response(status: number, headers: Record<string, string>, body: string): PostDeploySyntheticSmokeResponse {
  return {
    headers: {
      get(name: string) {
        return headers[name.toLowerCase()] ?? null;
      },
    },
    status,
    async text() {
      return body;
    },
  };
}

const selfTestFetch: PostDeploySyntheticSmokeFetch = async (url) => {
  if (url.includes("/share/")) {
    return response(200, { "content-type": "text/html; charset=utf-8" }, "<html><body>Shared Essence Spline scene<script src=\"/_next/static/app.js\"></script></body></html>");
  }

  if (url.includes("/embed/")) {
    return response(200, { "content-type": "text/html; charset=utf-8" }, "<html><body><script src=\"/_next/static/embed.js\"></script></body></html>");
  }

  if (url.includes("/code")) {
    return response(
      200,
      { "content-type": "application/json; charset=utf-8" },
      JSON.stringify({
        appPackages: [],
        code: {
          fetchScene: "fetch('/api/public/scenes/share-smoke')",
          iframe: "<iframe />",
          runtimeApi: "postMessage",
        },
        platformEmbeds: [],
        scene: {
          shareId: "share-smoke",
        },
      }),
    );
  }

  return response(
    200,
    {
      "content-disposition": "attachment; filename=\"project-smoke-compliance-report.json\"",
      "content-type": "application/json; charset=utf-8",
    },
    JSON.stringify({
      audit: {
        eventCount: 1,
      },
      project: {
        id: "project-smoke",
      },
      schemaVersion: 1,
    }),
  );
};

const isSelfTest = argFlags.has("self-test");
const baseUrl = isSelfTest ? "https://essence-spline.example.com" : getBaseUrl();
const shareId = isSelfTest ? "share-smoke" : valueFrom("share-id", "ESSENCE_SYNTHETIC_SHARE_ID");
const projectId = isSelfTest ? "project-smoke" : valueFrom("project-id", "ESSENCE_SYNTHETIC_PROJECT_ID");

if (!baseUrl || !shareId || !projectId) {
  console.error("Missing post-deploy smoke configuration. Provide --base-url, --share-id, and --project-id or set ESSENCE_SYNTHETIC_BASE_URL, ESSENCE_SYNTHETIC_SHARE_ID, and ESSENCE_SYNTHETIC_PROJECT_ID.");
  process.exit(1);
}

const report = await runPostDeploySyntheticSmoke(
  {
    authCookie: isSelfTest ? "better-auth.session_token=fixture" : valueFrom("auth-cookie", "ESSENCE_SYNTHETIC_AUTH_COOKIE"),
    baseUrl,
    projectId,
    sceneId: valueFrom("scene-id", "ESSENCE_SYNTHETIC_SCENE_ID"),
    shareId,
    timeoutMs: Number(valueFrom("timeout-ms", "ESSENCE_SYNTHETIC_TIMEOUT_MS") ?? 12_000),
  },
  isSelfTest ? selfTestFetch : fetch,
);

if (argFlags.has("write-report") || process.env.ESSENCE_SYNTHETIC_WRITE_REPORT === "1") {
  writePostDeploySyntheticSmokeReport(report, getReportPath());
  appendPostDeploySyntheticSmokeHistory(report, getHistoryPath());
}

console.log(formatPostDeploySyntheticSmokeReport(report));

if (report.status === "fail") {
  process.exitCode = 1;
}
