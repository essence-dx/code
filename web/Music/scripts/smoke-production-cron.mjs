import { readFile } from "node:fs/promises";

const defaultBaseUrl = "https://essence-suno.vercel.app";
const baseUrl = new URL(process.env.SMOKE_BASE_URL || defaultBaseUrl);
const requireCron =
  process.env.SMOKE_REQUIRE_CRON === "true" ||
  process.env.SMOKE_REQUIRE_CRON === "1";
const failures = [];
const results = {};

function assert(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

function url(pathname) {
  return new URL(pathname, baseUrl).toString();
}

async function fetchJson(pathname, init, options = {}) {
  const response = await fetch(url(pathname), init);
  const text = await response.text();

  try {
    return { response, json: JSON.parse(text) };
  } catch {
    if (!options.allowNonJson) {
      failures.push(`${pathname} did not return JSON.`);
    }

    return { response, json: null };
  }
}

async function localEnvValue(name) {
  if (process.env[name]?.trim()) {
    return process.env[name].trim();
  }

  try {
    const envFile = await readFile(".env.local", "utf8");
    const match = envFile.match(new RegExp(`^${name}=(.*)$`, "m"));
    return match?.[1]?.replace(/^["']|["']$/g, "").trim() || "";
  } catch {
    return "";
  }
}

const cronSecret =
  process.env.SMOKE_CRON_SECRET?.trim() || (await localEnvValue("CRON_SECRET"));
const unauthenticated = await fetchJson("/api/cron/health", undefined, {
  allowNonJson: true,
});
results.unauthenticatedStatusCode = unauthenticated.response.status;
results.pendingDeployment = unauthenticated.response.status === 404;

if (results.pendingDeployment && !requireCron) {
  results.cronState = "pending-deploy";
} else {
  assert(
    unauthenticated.response.status === 401,
    `Cron monitor should reject unauthenticated requests, got ${unauthenticated.response.status}.`,
  );

  if (!cronSecret) {
    assert(!requireCron, "CRON_SECRET or SMOKE_CRON_SECRET is required for cron smoke.");
    results.authorizedCheck = "skipped-missing-secret";
  } else {
    const authorized = await fetchJson("/api/cron/health", {
      headers: {
        authorization: `Bearer ${cronSecret}`,
      },
    });

    results.authorizedStatusCode = authorized.response.status;
    results.authorizedCheck = "checked";
    results.coreScore = authorized.json?.readiness?.coreScore;
    results.monitorStatus = authorized.json?.status;
    results.audioProviderState = authorized.json?.audioProvider?.state;

    assert(authorized.response.ok, `Cron monitor returned ${authorized.response.status}.`);
    assert(authorized.json?.ok === true, "Cron monitor did not report ok: true.");
    assert(
      authorized.json?.readiness?.coreScore === 100,
      "Cron monitor core readiness is not 100/100.",
    );
    assert(
      authorized.json?.status === "ok" || authorized.json?.status === "degraded",
      `Unexpected cron monitor status: ${authorized.json?.status}.`,
    );
    assert(
      ["not-configured", "ready"].includes(authorized.json?.audioProvider?.state),
      `Unexpected audio provider health state: ${authorized.json?.audioProvider?.state}.`,
    );
  }
}

const summary = {
  baseUrl: baseUrl.toString(),
  ok: failures.length === 0,
  results,
  failures,
};

console.log(JSON.stringify(summary, null, 2));

if (failures.length) {
  process.exit(1);
}
