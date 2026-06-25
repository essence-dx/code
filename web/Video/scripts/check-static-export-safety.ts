import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const settingsPage = readFileSync(new URL("../src/app/settings/page.tsx", import.meta.url), "utf8");
const settingsServerData = readFileSync(new URL("../src/app/settings/settings-server-data.ts", import.meta.url), "utf8");
assert.match(settingsPage, /TAURI_STATIC_EXPORT/);
assert.match(settingsPage, /loadSettingsServerData/);
assert.doesNotMatch(settingsPage, /from "@\/lib\/auth\/server"/);
assert.doesNotMatch(settingsPage, /import \{[^}]*getAiUsageReview/);
assert.doesNotMatch(settingsPage, /import \{[^}]*getAiGenerationReview/);
assert.match(settingsServerData, /!input\.databaseConfigured/);
assert.match(settingsServerData, /import\("@\/lib\/auth\/server"\)/);
assert.match(settingsServerData, /import\("@\/lib\/ai\/usage"\)/);
assert.match(settingsServerData, /import\("@\/lib\/ai\/generation-records"\)/);

const nextConfig = readFileSync(new URL("../next.config.ts", import.meta.url), "utf8");
assert.match(nextConfig, /output: "export"/);
assert.match(nextConfig, /TAURI_STATIC_EXPORT/);

console.log("Static export safety check passed.");
