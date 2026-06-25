import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(join(process.cwd(), "src/features/editor/components/viewport/editor-viewport.tsx"), "utf8");
const editableObjectSource = readFileSync(join(process.cwd(), "src/features/editor/components/viewport/editable-object.tsx"), "utf8");

assert.equal(
  /useEditorStore\(\(state\)\s*=>\s*resolveSceneSettings\(/.test(source),
  false,
  "EditorViewport must not return freshly resolved scene settings from a Zustand selector.",
);
assert.equal(
  /useEditorStore\(\(state\)\s*=>\s*state\.document\.[a-zA-Z]+ \?\? \[\]\)/.test(source),
  false,
  "EditorViewport must not return fresh [] fallbacks from Zustand selectors.",
);
assert.equal(
  /useEditorStore\(\(state\)\s*=>[^)]*\?\? \[\]/.test(editableObjectSource),
  false,
  "EditableObject must not return fresh [] fallbacks from Zustand selectors.",
);
assert.equal(
  /useEditorStore\(\(state\)\s*=>\s*resolveRuntimeParticleSettings\(/.test(editableObjectSource),
  false,
  "EditableObject must not resolve fresh particle settings inside Zustand selectors.",
);
assert.match(
  source,
  /<section className="[^"]*\bh-full\b[^"]*\bw-full\b/,
  "EditorViewport section must fill its grid cell so the WebGL canvas does not fall back to 300x150.",
);
assert.match(
  source,
  /<Canvas\s+className="[^"]*\bh-full\b[^"]*\bw-full\b/,
  "EditorViewport Canvas must be full-size so the browser canvas is not the default 300x150.",
);

console.log("editor viewport store selectors smoke passed");
