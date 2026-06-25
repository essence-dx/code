import { readFileSync } from "node:fs";

const authSource = readFileSync("src/lib/auth.ts", "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};

assert(
  authSource.includes('"http://localhost:*"') &&
    authSource.includes('"http://127.0.0.1:*"'),
  "Better Auth should trust every local dev port used by Next/Tauri QA.",
);
assert(
  authSource.includes('getVercelURL("VERCEL_BRANCH_URL")'),
  "Better Auth should trust Vercel branch deployment origins.",
);
assert(
  authSource.includes('getVercelURL("VERCEL_PROJECT_PRODUCTION_URL")'),
  "Better Auth should trust the configured Vercel production origin.",
);
assert(
  packageJson.scripts["auth:origin-regression-smoke"]?.includes(
    "auth-origin-regression-smoke",
  ),
  "Targeted auth origin regression smoke should be listed.",
);

console.log(
  "Auth origin regression smoke passed: local QA ports and Vercel origins are trusted.",
);

function assert(value: unknown, message: string): asserts value {
  if (!value) {
    throw new Error(message);
  }
}
