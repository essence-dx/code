import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { isSubtitleTranslationOutput } from "../src/features/editor/components/ai-result-types";
import { subtitleTranslationOutputSchema } from "../src/lib/ai/schemas";

const output = {
  sourceLanguage: "English",
  targetLanguage: "Spanish",
  translatedCaptions: [
    { start: 0, end: 1.5, text: "Abre con fuerza.", emphasis: "strong" },
    { start: 1.5, end: 3, text: "Luego muestra el valor rapidamente.", emphasis: "normal" },
  ],
  notes: ["Timing and emphasis were preserved."],
};

assert.equal(subtitleTranslationOutputSchema.safeParse(output).success, true);
assert.equal(isSubtitleTranslationOutput(output), true);
assert.equal(isSubtitleTranslationOutput({ ...output, translatedCaptions: [{ start: 2, end: 2, text: "Broken" }] }), false);

const schemas = readFileSync(new URL("../src/lib/ai/schemas.ts", import.meta.url), "utf8");
assert.match(schemas, /"subtitle-translation"/);
assert.match(schemas, /subtitleTranslationOutputSchema/);

const editorAi = readFileSync(new URL("../src/lib/ai/editor-ai.ts", import.meta.url), "utf8");
assert.match(editorAi, /subtitleTranslationOutputSchema/);
assert.match(editorAi, /Translate the provided captions or transcript/);
assert.match(editorAi, /"subtitle-translation": Output\.object/);

const aiPanel = readFileSync(new URL("../src/features/editor/components/ai-assistant-panel.tsx", import.meta.url), "utf8");
assert.match(aiPanel, /Languages/);
assert.match(aiPanel, /subtitle-translation/);

const resultView = readFileSync(new URL("../src/features/editor/components/ai-result-view.tsx", import.meta.url), "utf8");
assert.match(resultView, /isSubtitleTranslationOutput/);
assert.match(resultView, /Add translated captions/);
assert.match(resultView, /formatSrt/);
assert.match(resultView, /formatVtt/);

const aiCapabilities = readFileSync(new URL("../src/lib/product/capabilities/ai.ts", import.meta.url), "utf8");
assert.match(aiCapabilities, /subtitle translation/);
assert.match(aiCapabilities, /SRT\/VTT sidecar export/);

console.log("AI subtitle translation workflow checks passed.");
