import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { isBrollOutput } from "../src/features/editor/components/ai-result-types";
import { brollOutputSchema } from "../src/lib/ai/schemas";
import { aiCapabilities } from "../src/lib/product/capabilities/ai";

const validBroll = {
  suggestions: [
    {
      query: "hands typing laptop",
      mediaType: "video" as const,
      start: 3,
      end: 8,
      layerName: "Product context B-roll",
      placement: "cutaway" as const,
      rationale: "Covers the explanation with a concrete work shot.",
      searchNotes: ["Prefer bright office footage.", "Avoid branded devices."],
    },
  ],
};

assert.equal(brollOutputSchema.safeParse(validBroll).success, true);
assert.equal(isBrollOutput(validBroll), true);
assert.equal(
  brollOutputSchema.safeParse({
    suggestions: [{ ...validBroll.suggestions[0], start: 8, end: 3 }],
  }).success,
  false,
);

const schemas = readFileSync(new URL("../src/lib/ai/schemas.ts", import.meta.url), "utf8");
const editorAi = readFileSync(new URL("../src/lib/ai/editor-ai.ts", import.meta.url), "utf8");
const assistant = readFileSync(new URL("../src/features/editor/components/ai-assistant-panel.tsx", import.meta.url), "utf8");
const resultView = readFileSync(new URL("../src/features/editor/components/ai-result-view.tsx", import.meta.url), "utf8");
const brollReview = readFileSync(new URL("../src/features/editor/components/ai-broll-review.tsx", import.meta.url), "utf8");
const storeTypes = readFileSync(new URL("../src/features/editor/state/editor-store-types.ts", import.meta.url), "utf8");
const layerCreationSlice = readFileSync(new URL("../src/features/editor/state/editor-layer-creation-slice.ts", import.meta.url), "utf8");

assert.match(schemas, /"b-roll"/);
assert.match(schemas, /brollOutputSchema/);
assert.match(editorAi, /Output\.object\(\{ schema: brollOutputSchema \}\)/);
assert.match(editorAi, /free stock search/);
assert.match(assistant, /insertBrollSuggestions/);
assert.match(assistant, /\/api\/stock\/search/);
assert.match(assistant, /\/api\/stock\/download/);
assert.match(assistant, /addLayerFromAsset\(asset\.id, \{/);
assert.match(resultView, /AiBrollReview/);
assert.match(brollReview, /Insert accepted B-roll/);
assert.match(storeTypes, /options\?: Partial<Pick<TimelineLayer, "start" \| "duration" \| "track" \| "name" \| "notes" \| "transform"/);
assert.match(layerCreationSlice, /return nextLayer\.id/);

const capability = aiCapabilities.find((item) => item.id === "ai-video-generation");
assert.equal(capability?.status, "partial");
assert.match(capability?.evidence.join(" ") ?? "", /B-roll review/);
assert.match(capability?.evidence.join(" ") ?? "", /stock media insertion/);

console.log("AI B-roll workflow checks passed.");
