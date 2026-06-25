import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const store = read("src/lib/projects/local-project-store.ts");
assert.match(store, /export async function trySaveLocalProject/);
assert.match(store, /return false/);

for (const path of ["src/features/editor/components/editor-shell.tsx", "src/features/editor/hooks/use-editor-shortcuts.ts"]) {
  const source = read(path);
  assert.match(source, /trySaveLocalProject/, `${path} should use safe local save for fire-and-forget saves.`);
  assert.doesNotMatch(source, /void saveLocalProject/, `${path} should not fire-and-forget raw saveLocalProject.`);
}

const cloudLibraryHook = read("src/features/dashboard/hooks/use-dashboard-cloud-library.ts");
assert.match(cloudLibraryHook, /trySaveLocalProject\(shell\.project, shell\.mediaAssets\)/);

console.log("Safe local save checks passed.");
