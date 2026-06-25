const defaultBaseUrl = "https://essence-suno.vercel.app";
const baseUrl = new URL(process.env.SMOKE_BASE_URL || defaultBaseUrl);
const deepAiSmoke = process.argv.includes("--deep-ai");
const requireHealth =
  process.env.SMOKE_REQUIRE_HEALTH === "true" ||
  process.env.SMOKE_REQUIRE_HEALTH === "1";
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

async function fetchText(pathname, init) {
  const response = await fetch(url(pathname), init);
  const text = await response.text();
  return { response, text };
}

async function fetchJson(pathname, init, options = {}) {
  const { response, text } = await fetchText(pathname, init);

  try {
    return { response, json: JSON.parse(text) };
  } catch {
    if (!options.allowNonJson) {
      failures.push(`${pathname} did not return JSON.`);
    }
    return { response, json: null };
  }
}

async function postJson(pathname, body) {
  return fetchJson(pathname, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const root = await fetchText("/");
results.rootStatus = root.response.status;
assert(root.response.ok, `Root returned ${root.response.status}.`);
assert(root.text.includes("Essence Suno"), "Root HTML is missing the app name.");

const securityHeaders = {
  contentTypeOptions: root.response.headers.get("x-content-type-options") || "",
  frameOptions: root.response.headers.get("x-frame-options") || "",
  referrerPolicy: root.response.headers.get("referrer-policy") || "",
  strictTransportSecurity:
    root.response.headers.get("strict-transport-security") || "",
  permissionsPolicy: root.response.headers.get("permissions-policy") || "",
};
results.securityHeaders = securityHeaders;
assert(
  securityHeaders.contentTypeOptions.toLowerCase() === "nosniff",
  "Missing X-Content-Type-Options: nosniff.",
);
assert(
  securityHeaders.frameOptions.toUpperCase() === "DENY",
  "Missing X-Frame-Options: DENY.",
);
assert(
  securityHeaders.referrerPolicy === "strict-origin-when-cross-origin",
  "Missing Referrer-Policy: strict-origin-when-cross-origin.",
);
assert(
  securityHeaders.strictTransportSecurity.includes("max-age=63072000"),
  "Missing two-year Strict-Transport-Security policy.",
);
assert(
  securityHeaders.permissionsPolicy.includes("camera=()"),
  "Missing restrictive Permissions-Policy.",
);
assert(
  !securityHeaders.permissionsPolicy.includes("microphone=()"),
  "Permissions-Policy disables microphone recording.",
);

const leakedStackTerms = [
  "Better Auth",
  "Drizzle",
  "Turso",
  "Vercel Blob",
  "Vercel AI SDK",
  "Next.js",
  "Tauri",
];
const leakedTerms = leakedStackTerms.filter((term) => root.text.includes(term));
results.leakedTerms = leakedTerms;
assert(leakedTerms.length === 0, `Root HTML leaked stack terms: ${leakedTerms.join(", ")}.`);

const aiStatus = await fetchJson("/api/ai/status");
results.aiStatusCode = aiStatus.response.status;
assert(aiStatus.response.ok, `AI status returned ${aiStatus.response.status}.`);
assert(aiStatus.json?.text === true, "Text AI is not enabled.");
assert(
  typeof aiStatus.json?.backend === "string" && !aiStatus.json.backend.startsWith("\uFEFF"),
  "AI backend contains an invalid prefix.",
);

const readiness = await fetchJson("/api/readiness");
results.readinessStatusCode = readiness.response.status;
results.coreScore = readiness.json?.summary?.coreScore;
results.fullScore = readiness.json?.summary?.fullScore;
results.blocked = readiness.json?.summary?.blocked;
results.warning = readiness.json?.summary?.warning;
assert(readiness.response.ok, `Readiness returned ${readiness.response.status}.`);
assert(readiness.json?.summary?.coreScore === 100, "Core release readiness is not 100/100.");
assert(readiness.json?.summary?.blocked === 0, "Readiness has blocked checks.");
assert(
  typeof readiness.json?.summary?.fullScore === "number",
  "Full readiness score is missing.",
);

const health = await fetchJson("/api/health", undefined, { allowNonJson: true });
results.healthStatusCode = health.response.status;
results.healthPendingDeployment = health.response.status === 404;

if (health.response.status === 404 && !requireHealth) {
  results.healthState = "pending-deploy";
} else {
  results.healthState = health.json?.status;
  results.healthCoreScore = health.json?.readiness?.coreScore;
  assert(health.response.ok, `Health returned ${health.response.status}.`);
  assert(health.json?.ok === true, "Health endpoint is not ok.");
  assert(
    health.json?.status === "ok" || health.json?.status === "degraded",
    `Unexpected health status: ${health.json?.status}.`,
  );
  assert(
    health.json?.readiness?.coreScore === 100,
    "Health endpoint core readiness is not 100/100.",
  );
}

if (aiStatus.json?.text) {
  const lyrics = await postJson("/api/ai/lyrics", {
    theme: "a late night builder finishing a careful release",
    style: "warm synth pop with a clean hook",
    mood: "focused",
    structure: "short",
  });
  const lyricText = lyrics.json?.lyrics || "";
  results.lyricsStatusCode = lyrics.response.status;
  results.lyricsLength = lyricText.length;
  assert(lyrics.response.ok, `Lyric generation returned ${lyrics.response.status}.`);
  assert(lyricText.length > 40, "Lyric generation returned too little text.");

  if (deepAiSmoke) {
    const style = await postJson("/api/ai/style", {
      idea: "A free-first studio anthem for builders shipping carefully.",
      references: "warm synth pop, clean drums, optimistic chorus",
    });
    results.styleStatusCode = style.response.status;
    results.styleLength = (style.json?.style || "").length;
    assert(style.response.ok, `Style expansion returned ${style.response.status}.`);
    assert((style.json?.style || "").length > 40, "Style expansion returned too little text.");

    const styleSnippet = (style.json?.style || "warm synth pop").slice(0, 900);
    const brief = await postJson("/api/ai/song-brief", {
      title: "Careful Release",
      lyrics: lyricText.slice(0, 500),
      style: styleSnippet,
      intention: "Turn a focused late-night build into a concise release brief.",
    });
    const briefBody = brief.json?.brief;
    results.briefStatusCode = brief.response.status;
    results.briefTags = Array.isArray(briefBody?.tags) ? briefBody.tags.length : 0;
    assert(brief.response.ok, `Song brief returned ${brief.response.status}.`);
    assert(typeof briefBody?.title === "string", "Song brief is missing a title.");
    assert(results.briefTags >= 3, "Song brief returned too few tags.");

    const coverArt = await postJson("/api/ai/cover-art", {
      title: briefBody?.title || "Careful Release",
      style: styleSnippet,
      lyrics: lyricText.slice(0, 500),
      generateImage: false,
    });
    results.coverArtStatusCode = coverArt.response.status;
    results.coverArtPromptLength = (coverArt.json?.prompt || "").length;
    assert(coverArt.response.ok, `Cover-art prompt returned ${coverArt.response.status}.`);
    assert(
      (coverArt.json?.prompt || "").length > 40,
      "Cover-art prompt returned too little text.",
    );
  }
}

const audioJobs = await fetchJson("/api/ai/audio-jobs");
results.audioJobsStatusCode = audioJobs.response.status;
results.audioConfigured = Boolean(audioJobs.json?.configured);
assert(audioJobs.response.ok, `Audio jobs status returned ${audioJobs.response.status}.`);

if (deepAiSmoke && audioJobs.json?.configured === false) {
  const audioJob = await postJson("/api/ai/audio-jobs", {
    title: "Careful Release",
    prompt: "Generate a short warm synth-pop release cue.",
    style: "warm synth pop",
    lyrics: "We checked the lights and shipped it clean.",
  });
  results.audioDisabledStatusCode = audioJob.response.status;
  assert(
    audioJob.response.status === 503,
    `Disabled audio provider should return 503, got ${audioJob.response.status}.`,
  );
  assert(
    audioJob.json?.details?.capability === "audio",
    "Disabled audio provider did not report audio capability.",
  );
}

const summary = {
  baseUrl: baseUrl.toString(),
  deepAiSmoke,
  ok: failures.length === 0,
  results,
  failures,
};

console.log(JSON.stringify(summary, null, 2));

if (failures.length) {
  process.exit(1);
}
