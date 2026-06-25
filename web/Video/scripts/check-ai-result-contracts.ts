import assert from "node:assert/strict";
import {
  isCaptionOutput,
  isBrollOutput,
  isCaptionOutputLike,
  isGeneratedImageOutput,
  isSubtitleStyleOutput,
  isSubtitleTranslationOutput,
  isVideoProjectOutput,
} from "../src/features/editor/components/ai-result-types";
import {
  captionsOutputSchema,
  brollOutputSchema,
  imageOutputSchema,
  repurposeOutputSchema,
  smartCutOutputSchema,
  subtitleTranslationOutputSchema,
  transcriptCleanupOutputSchema,
  videoProjectOutputSchema,
} from "../src/lib/ai/schemas";

const validCaption = {
  captions: [{ start: 0, end: 2.4, text: "Open strong.", emphasis: "strong" }],
};
const invalidCaption = {
  captions: [{ start: "0", end: 2.4, text: "Broken start." }],
};
const reversedCaption = {
  captions: [{ start: 3, end: 2.4, text: "Broken range." }],
};
const zeroLengthCaption = {
  captions: [{ start: 2, end: 2, text: "Zero length." }],
};
const blankCaption = {
  captions: [{ start: 0, end: 2.4, text: "   " }],
};

assert.equal(isCaptionOutput(validCaption), true);
assert.equal(isCaptionOutput(invalidCaption), false);
assert.equal(isCaptionOutput(reversedCaption), false);
assert.equal(isCaptionOutput(zeroLengthCaption), false);
assert.equal(isCaptionOutput(blankCaption), false);
assert.equal(isCaptionOutputLike({ captionChunks: validCaption.captions, cleanedTranscript: "Open strong." }), true);
assert.equal(isCaptionOutputLike({ captionChunks: [{ start: 0, end: Number.NaN, text: "Broken end." }] }), false);
assert.equal(captionsOutputSchema.safeParse(validCaption).success, true);
assert.equal(captionsOutputSchema.safeParse(zeroLengthCaption).success, false);
assert.equal(
  transcriptCleanupOutputSchema.safeParse({
    cleanedTranscript: "Clean.",
    summary: "Summary.",
    fixes: [],
    captionChunks: zeroLengthCaption.captions,
  }).success,
  false,
);
assert.equal(
  repurposeOutputSchema.safeParse({
    clips: [{ title: "Clip", start: 5, end: 5, platform: "tiktok", caption: "Clip", editNotes: [] }],
  }).success,
  false,
);
assert.equal(
  brollOutputSchema.safeParse({
    suggestions: [
      {
        query: "city skyline",
        mediaType: "video",
        start: 2,
        end: 6,
        layerName: "City B-roll",
        placement: "cutaway",
        rationale: "Adds context during the intro.",
        searchNotes: ["Use a wide establishing shot."],
      },
    ],
  }).success,
  true,
);
assert.equal(
  isBrollOutput({
    suggestions: [
      {
        query: "city skyline",
        mediaType: "video",
        start: 2,
        end: 6,
        layerName: "City B-roll",
        placement: "cutaway",
        rationale: "Adds context during the intro.",
        searchNotes: ["Use a wide establishing shot."],
      },
    ],
  }),
  true,
);
assert.equal(
  brollOutputSchema.safeParse({
    suggestions: [{ query: "city", mediaType: "video", start: 6, end: 2, layerName: "Broken", placement: "cutaway", rationale: "Backwards", searchNotes: [] }],
  }).success,
  false,
);
const validVideoProject = {
  title: "Launch explainer",
  aspectRatio: "9:16" as const,
  summary: "A short social explainer from the pasted article.",
  exportPreset: "mp4-1080p" as const,
  scenes: [
    {
      title: "Hook",
      duration: 4,
      headline: "Stop losing edits",
      caption: "A faster way to turn long content into clips.",
      visualPrompt: "Bold text over a calm product-style background.",
      brollQuery: "creator editing video",
      backgroundColor: "#111827",
      accentColor: "#38bdf8",
    },
  ],
  notes: ["Use B-roll after review."],
};
assert.equal(videoProjectOutputSchema.safeParse(validVideoProject).success, true);
assert.equal(isVideoProjectOutput(validVideoProject), true);
assert.equal(
  videoProjectOutputSchema.safeParse({
    ...validVideoProject,
    scenes: [{ ...validVideoProject.scenes[0], duration: 0 }],
  }).success,
  false,
);
assert.equal(
  smartCutOutputSchema.safeParse({
    objective: "Trim silence",
    cuts: [{ start: 4, end: 3, priority: "high", suggestedAction: "remove", reason: "Backwards" }],
  }).success,
  false,
);

assert.equal(
  isSubtitleStyleOutput({
    style: {
      fill: "#ffffff",
      background: "#111827",
      fontSize: 42,
      fontWeight: 700,
    },
    rationale: "Readable over dark footage.",
    sampleCaptions: ["Open strong."],
  }),
  true,
);
assert.equal(
  isSubtitleStyleOutput({
    style: {
      fill: "white",
      background: "#111827",
      fontSize: 42,
      fontWeight: 700,
    },
    rationale: "Readable over dark footage.",
    sampleCaptions: ["Open strong."],
  }),
  false,
);

const validTranslation = {
  sourceLanguage: "English",
  targetLanguage: "Spanish",
  translatedCaptions: [{ start: 0, end: 2.4, text: "Abre fuerte.", emphasis: "strong" }],
  notes: ["Preserved short caption timing."],
};

assert.equal(isSubtitleTranslationOutput(validTranslation), true);
assert.equal(subtitleTranslationOutputSchema.safeParse(validTranslation).success, true);
assert.equal(
  subtitleTranslationOutputSchema.safeParse({
    ...validTranslation,
    translatedCaptions: zeroLengthCaption.captions,
  }).success,
  false,
);
assert.equal(
  isSubtitleTranslationOutput({
    ...validTranslation,
    targetLanguage: "",
  }),
  false,
);

assert.equal(
  isGeneratedImageOutput({
    images: [
      {
        filename: "generated.png",
        mediaType: "image/png",
        base64: "AA==",
        prompt: "Hero frame",
        model: "image-model",
      },
    ],
  }),
  true,
);
assert.equal(
  imageOutputSchema.safeParse({
    images: [
      {
        filename: "generated.png",
        mediaType: "image/png",
        base64: "AA==",
        prompt: "Hero frame",
        model: "image-model",
      },
    ],
  }).success,
  true,
);
assert.equal(
  isGeneratedImageOutput({
    images: [{ filename: "generated.txt", mediaType: "text/plain", base64: "AA==", prompt: "Hero frame", model: "image-model" }],
  }),
  false,
);
assert.equal(
  isGeneratedImageOutput({
    images: [{ filename: "generated.png", mediaType: "image/png", base64: "not base64", prompt: "Hero frame", model: "image-model" }],
  }),
  false,
);
assert.equal(
  imageOutputSchema.safeParse({
    images: [{ filename: "generated.png", mediaType: "image/png", base64: "not base64", prompt: "Hero frame", model: "image-model" }],
  }).success,
  false,
);

console.log("AI result contracts passed.");
