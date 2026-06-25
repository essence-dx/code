import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { aiEditorRequestSchema, imageOutputSchema } from "../src/lib/ai/schemas";

const tinyPng =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";

const sourceImage = {
  filename: "source.png",
  mediaType: "image/png",
  base64: tinyPng,
};
const mask = {
  filename: "source-mask.png",
  mediaType: "image/png",
  base64: tinyPng,
};

assert.equal(
  aiEditorRequestSchema.safeParse({
    action: "image-edit",
    prompt: "Fill the masked area with the same wall texture.",
    sourceImage,
    imageEdit: { mode: "inpaint", mask },
  }).success,
  true,
);
assert.equal(
  aiEditorRequestSchema.safeParse({
    action: "image-edit",
    prompt: "Fill the masked area with the same wall texture.",
    sourceImage,
    imageEdit: { mode: "inpaint" },
  }).success,
  false,
);
assert.equal(
  aiEditorRequestSchema.safeParse({
    action: "image-edit",
    prompt: "Extend this banner for a vertical social post.",
    sourceImage,
    imageEdit: { mode: "outpaint", outpaintPreset: "vertical" },
  }).success,
  true,
);
assert.equal(
  aiEditorRequestSchema.safeParse({
    action: "image-edit",
    prompt: "Translate visible text.",
    sourceImage,
    imageEdit: { mode: "translate", targetLanguage: "Arabic" },
  }).success,
  true,
);
assert.equal(
  imageOutputSchema.safeParse({
    images: [
      {
        filename: "edited.png",
        mediaType: "image/png",
        base64: tinyPng,
        prompt: "Clean up legal artifacts.",
        model: "openai/gpt-image-1-mini",
        editMode: "cleanup",
        sourceImageName: "source.png",
      },
    ],
  }).success,
  true,
);

const editorAi = read("src/lib/ai/editor-ai.ts");
assert.match(editorAi, /imageEditInstruction/);
assert.match(editorAi, /mask: input\.imageEdit\?\.mask/);
assert.match(editorAi, /imageAspectRatio/);
assert.match(editorAi, /background-removal/);
assert.match(editorAi, /targetLanguage/);
assert.match(editorAi, /Do not remove watermarks/);

const assistantPanel = read("src/features/editor/components/ai-assistant-panel.tsx");
assert.match(assistantPanel, /AiImageEditControls/);
assert.match(assistantPanel, /prepareImageEditMaskSource/);
assert.match(assistantPanel, /renderImageObjectMaskBlob/);
assert.match(assistantPanel, /removeImageBackgroundLocally/);
assert.match(assistantPanel, /runLocalImageBackgroundRemoval/);
assert.match(assistantPanel, /isImageProviderUnavailable/);
assert.match(assistantPanel, /imageEditMode === "inpaint"/);
assert.match(assistantPanel, /imageEditMode === "background-removal"/);
assert.match(assistantPanel, /imageEdit,/);

const maskHelper = read("src/lib/media/image-edit-mask.ts");
assert.match(maskHelper, /activeImageObjectMaskCount/);
assert.match(maskHelper, /renderImageObjectMaskBlob/);
assert.match(maskHelper, /normalizeLayerObjectMasks/);

const localBackgroundRemoval = read("src/lib/media/local-background-removal.ts");
assert.match(localBackgroundRemoval, /edgeConnectedBackgroundMask/);
assert.match(localBackgroundRemoval, /sampleBackground/);
assert.match(localBackgroundRemoval, /canvasToPng/);
assert.match(localBackgroundRemoval, /transparentFilename/);

const controls = read("src/features/editor/components/ai-image-edit-controls.tsx");
assert.match(controls, /BG remove/);
assert.match(controls, /Outpaint/);
assert.match(controls, /Translate/);
assert.match(controls, /Target language/);

const capability = read("src/lib/product/capabilities/ai.ts");
assert.match(capability, /local transparent-background adapter/);
assert.match(capability, /offline background removal fallback/);

console.log("AI image edit workflow checks passed.");

function read(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}
