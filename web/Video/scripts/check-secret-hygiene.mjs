import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const trackedFiles = execFileSync("git", ["ls-files"], { encoding: "utf8" })
  .split(/\r?\n/)
  .map((item) => item.trim())
  .filter(Boolean)
  .filter((path) => !isBinaryAsset(path));

const secretPatterns = [
  /\bgsk_[A-Za-z0-9]{20,}\b/,
  /\bsk-[A-Za-z0-9_-]{20,}\b/,
  /\bghp_[A-Za-z0-9]{20,}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{20,}\b/,
  /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/,
  /\b(?:TURSO_AUTH_TOKEN|BETTER_AUTH_SECRET|GROQ_API_KEY|AI_GATEWAY_API_KEY|VERCEL_OIDC_TOKEN)[ \t]*=[ \t]*["']?[^"'\s#]+/,
];

const offenders = [];
for (const file of trackedFiles) {
  const source = readFileSync(file, "utf8");
  for (const pattern of secretPatterns) {
    if (pattern.test(source)) {
      offenders.push(file);
      break;
    }
  }
}

assert.deepEqual([...new Set(offenders)], []);
console.log("Secret hygiene check passed.");

function isBinaryAsset(path) {
  return /\.(png|ico|icns|jpg|jpeg|gif|webp|woff2?|ttf|otf)$/i.test(path);
}
