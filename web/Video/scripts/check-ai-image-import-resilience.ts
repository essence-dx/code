import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const aiPanel = readFileSync(new URL("../src/features/editor/components/ai-assistant-panel.tsx", import.meta.url), "utf8");

assert.match(aiPanel, /type AiAssetImportMessage/);
assert.match(aiPanel, /const \[assetImportMessage, setAssetImportMessage\]/);
assert.match(aiPanel, /setAssetImportMessage\(null\)/);
assert.match(aiPanel, /let importedCount = 0/);
assert.match(aiPanel, /let failedCount = 0/);
assert.match(aiPanel, /try \{[\s\S]*?fileFromBase64\(image\)[\s\S]*?saveBrowserMedia\(file\)/);
assert.match(aiPanel, /catch \{[\s\S]*?failedCount \+= 1/);
assert.match(aiPanel, /generatedImageImportMessage\(importedCount, failedCount\)/);
assert.match(aiPanel, /decodeBase64ImagePayload\(image\.base64\)/);
assert.doesNotMatch(aiPanel, /atob\(normalizeBase64ImageData/);
assert.match(aiPanel, /Generated image could not be saved locally\./);

console.log("AI image import resilience checks passed.");
