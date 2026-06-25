import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const editorShell = readFileSync(new URL("../src/features/editor/components/editor-shell.tsx", import.meta.url), "utf8");

assert.match(editorShell, /type EditorNotice/);
assert.match(editorShell, /Local project could not be opened\./);
assert.match(editorShell, /loadLocalProject\(projectId\)[\s\S]*?\.catch\(\(\) =>/);
assert.match(editorShell, /Some media could not be reconnected/);
assert.match(editorShell, /recoverMediaAssets\([\s\S]*?\.catch\(\(\) =>/);
assert.match(editorShell, /<Alert variant=\{notice\.tone\}/);

console.log("Editor boot resilience checks passed.");
