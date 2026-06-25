import { strict as assert } from "node:assert";

const rawBaseUrl =
  process.env.ESSENCE_EXCEL_SMOKE_BASE_URL ?? process.env.VERCEL_URL;
const smokePaths = (
  process.env.ESSENCE_EXCEL_SMOKE_PATHS ?? "/,/auth,/desktop"
)
  .split(",")
  .map((path) => path.trim())
  .filter(Boolean);

function normalizeBaseUrl(value: string | undefined) {
  if (!value) {
    return "";
  }

  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

const baseUrl = normalizeBaseUrl(rawBaseUrl).replace(/\/$/, "");

assert.ok(
  baseUrl,
  "Set ESSENCE_EXCEL_SMOKE_BASE_URL or VERCEL_URL before running preview smoke checks.",
);

for (const path of smokePaths) {
  const url = new URL(path, `${baseUrl}/`);
  const response = await fetch(url, {
    headers: {
      "user-agent": "EssenceExcelPreviewSmoke/1.0",
    },
    redirect: "follow",
  });
  const body = await response.text();

  assert.ok(
    response.status < 500,
    `${url.toString()} returned ${response.status}.`,
  );
  assert.doesNotMatch(
    body,
    /dev stack info|ai slop|vibe coding/i,
    `${url.toString()} still exposes development-only copy.`,
  );
}

console.log(`Preview smoke checks passed for ${baseUrl}.`);
