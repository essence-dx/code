import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { isVideoProjectOutput } from "../src/features/editor/components/ai-result-types";
import { createAiVideoProject } from "../src/lib/editor/ai-video-project";
import { addAiVideoSceneMediaLayer, createAiVideoSceneMediaSlots } from "../src/lib/editor/ai-video-media-placement";
import { createAiVideoSceneImagePrompt, createAiVideoSceneImageSlots } from "../src/lib/editor/ai-video-scene-images";
import { createAiVideoSceneVideoPrompt, createAiVideoSceneVideoSlots } from "../src/lib/editor/ai-video-scene-videos";
import { videoProjectOutputSchema } from "../src/lib/ai/schemas";
import { createVideoProjectPromptFromSource, readAiSourceBrief } from "../src/lib/ai/source-ingest";
import { normalizeSceneVideoGenerationRequest, sceneVideoGenerationServiceStatus } from "../src/lib/ai/scene-video-generation";
import { aiGenerationAssetMetadata, summarizeAiGenerationOutput } from "../src/lib/ai/generation-records";
import { syncedProjectPayloadSchema } from "../src/lib/projects/project-sync-schema";
import { aiCapabilities } from "../src/lib/product/capabilities/ai";
import type { MediaAsset } from "../src/lib/editor/types";

const blueprint = {
  title: "Article to Reel",
  aspectRatio: "9:16" as const,
  summary: "Turns a pasted article into a short editable reel.",
  exportPreset: "mp4-1080p" as const,
  scenes: [
    {
      title: "Hook",
      duration: 4,
      headline: "Make the point fast",
      caption: "Open with the main idea from the article.",
      visualPrompt: "Large editorial headline with a clear contrast panel.",
      brollQuery: "person reading article laptop",
      backgroundColor: "#111827",
      accentColor: "#38bdf8",
    },
    {
      title: "Proof",
      duration: 5,
      headline: "Show the evidence",
      caption: "Summarize the strongest proof in one sentence.",
      visualPrompt: "Simple chart-inspired panel with space for captions.",
      brollQuery: "data analysis desk",
      backgroundColor: "#0f172a",
      accentColor: "#14b8a6",
    },
  ],
  notes: ["Review stock B-roll before export."],
};

assert.equal(videoProjectOutputSchema.safeParse(blueprint).success, true);
assert.equal(isVideoProjectOutput(blueprint), true);

const project = createAiVideoProject(blueprint);
assert.equal(project.title, "Article to Reel");
assert.equal(project.aspectRatio, "9:16");
assert.equal(project.duration, 9);
assert.equal(project.layers.some((layer) => layer.name === "Generated captions" && layer.cues?.length === 2), true);
assert.equal(project.layers.some((layer) => layer.notes?.includes("B-roll search: person reading article laptop")), true);
assert.equal(project.markers?.length, 2);
assert.equal(syncedProjectPayloadSchema.safeParse({ project, mediaAssets: [] }).success, true);

const slots = createAiVideoSceneMediaSlots(blueprint);
const imageSlots = createAiVideoSceneImageSlots(blueprint);
const videoSlots = createAiVideoSceneVideoSlots(blueprint);
const sceneAsset: MediaAsset = {
  id: "asset_scene_broll",
  name: "article-broll.mp4",
  type: "video",
  mimeType: "video/mp4",
  size: 4200,
  duration: 8,
  width: 1280,
  height: 720,
  storageKey: "asset_scene_broll",
  source: "browser-indexeddb",
  createdAt: "2026-05-15T00:00:00.000Z",
};
assert.equal(slots.length, 2);
assert.equal(slots[0]?.query, "person reading article laptop");
assert.equal(imageSlots.length, 2);
assert.match(imageSlots[0]?.prompt ?? "", /Avoid|without adding text|Aspect ratio: 9:16/);
assert.match(createAiVideoSceneImagePrompt(blueprint, 1), /Show the evidence/);
assert.equal(videoSlots.length, 2);
assert.equal(videoSlots[0]?.layerName, "Scene 1 generated video");
assert.match(videoSlots[0]?.prompt ?? "", /short editor-ready video scene clip/);
assert.match(createAiVideoSceneVideoPrompt(blueprint, 1), /Show the evidence/);
assert.equal(sceneVideoGenerationServiceStatus().ok, true);
assert.equal(normalizeSceneVideoGenerationRequest({
  projectTitle: "Article to Reel",
  sceneTitle: "Hook",
  prompt: videoSlots[0]?.prompt,
  aspectRatio: "9:16",
  duration: "4",
}).duration, 4);
assert.equal(summarizeAiGenerationOutput("scene-video", { filename: "scene-hook.mp4" }), "Scene video generated: scene-hook.mp4.");
assert.deepEqual(aiGenerationAssetMetadata("scene-video", { filename: "scene-hook.mp4" }), { kind: "video", name: "scene-hook.mp4" });
const placedLayer = addAiVideoSceneMediaLayer(project, sceneAsset, slots[0]!);
assert.equal(placedLayer.assetId, sceneAsset.id);
assert.equal(placedLayer.start, 0);
assert.equal(placedLayer.duration, 4);
assert.equal(placedLayer.transform.width, project.width);
assert.equal(project.layers.includes(placedLayer), true);
assert.equal(syncedProjectPayloadSchema.safeParse({ project, mediaAssets: [sceneAsset] }).success, true);

const articleBrief = await readAiSourceBrief(new File(["<article><h1>Creator workflow</h1><p>Plan, edit, caption, and export faster with reusable scenes.</p></article>"], "workflow.html", { type: "text/html" }));
assert.equal(articleBrief.kind, "article");
assert.equal(articleBrief.extraction, "html-text");
assert.match(createVideoProjectPromptFromSource(articleBrief), /editable short video project/);
const pdfBrief = await readAiSourceBrief(new File(["%PDF-1.7\nBT (PDF launch story with enough readable text for a social video project.) Tj ET"], "launch.pdf", { type: "application/pdf" }));
assert.equal(pdfBrief.kind, "pdf");
assert.equal(pdfBrief.extraction, "pdf-selectable-text");
assert.match(pdfBrief.text, /PDF launch story/);
const embeddedOcrText = "PDF OCR source text with enough readable details for a social video project.";
const ocrPdfBrief = await readAiSourceBrief(new File([`%PDF-1.7\n/ActualText <${toUtf16BeHex(embeddedOcrText)}> Tj`], "scanned-with-ocr.pdf", { type: "application/pdf" }));
assert.equal(ocrPdfBrief.kind, "pdf");
assert.equal(ocrPdfBrief.extraction, "pdf-embedded-ocr");
assert.match(ocrPdfBrief.text, /PDF OCR source text/);
assert.match(createVideoProjectPromptFromSource(ocrPdfBrief), /pdf-embedded-ocr/);

const schemas = readFileSync(new URL("../src/lib/ai/schemas.ts", import.meta.url), "utf8");
const editorAi = readFileSync(new URL("../src/lib/ai/editor-ai.ts", import.meta.url), "utf8");
const sceneVideoService = readFileSync(new URL("../src/lib/ai/scene-video-generation.ts", import.meta.url), "utf8");
const sceneVideoRoute = readFileSync(new URL("../src/app/api/ai/scene-video/route.ts", import.meta.url), "utf8");
const sceneVideoClient = readFileSync(new URL("../src/features/editor/lib/scene-video-generation-client.ts", import.meta.url), "utf8");
const assistant = readFileSync(new URL("../src/features/editor/components/ai-assistant-panel.tsx", import.meta.url), "utf8");
const resultView = readFileSync(new URL("../src/features/editor/components/ai-result-view.tsx", import.meta.url), "utf8");
const review = readFileSync(new URL("../src/features/editor/components/ai-video-project-review.tsx", import.meta.url), "utf8");
const dbSchema = readFileSync(new URL("../src/lib/db/schema.ts", import.meta.url), "utf8");

assert.match(schemas, /"video-project"/);
assert.match(schemas, /videoProjectOutputSchema/);
assert.match(editorAi, /Output\.object\(\{ schema: videoProjectOutputSchema \}\)/);
assert.match(editorAi, /script, article, PDF text, screenshot, storyboard image/);
assert.match(editorAi, /AI_GATEWAY_VISION_MODEL/);
assert.match(editorAi, /isVideoProjectImageSource/);
assert.match(editorAi, /type: "image"/);
assert.match(editorAi, /input:image-source/);
assert.match(assistant, /saveGeneratedVideoProject/);
assert.match(assistant, /createAiVideoProject/);
assert.match(assistant, /readAiSourceBrief/);
assert.match(assistant, /prepareVideoProjectSourceImage/);
assert.match(assistant, /createVideoProjectPromptFromImageSource/);
assert.match(assistant, /image\/png,image\/jpeg,image\/webp/);
assert.match(assistant, /Import source/);
assert.match(assistant, /createAiVideoSceneMediaSlots/);
assert.match(assistant, /createAiVideoSceneImageSlots/);
assert.match(assistant, /createAiVideoSceneVideoSlots/);
assert.match(assistant, /importGeneratedProjectSceneImages/);
assert.match(assistant, /importGeneratedProjectSceneVideos/);
assert.match(assistant, /fetchSceneVideoGenerationStatus/);
assert.match(assistant, /generateSceneVideoWithConnectedService/);
assert.match(assistant, /fileFromSceneVideoOutput/);
assert.match(assistant, /failedCount/);
assert.match(assistant, /kept the generated text layout/);
assert.match(assistant, /addAiVideoSceneMediaLayer/);
assert.match(assistant, /loadProject\(generatedProject, generatedAssets\)/);
assert.match(resultView, /AiVideoProjectReview/);
assert.match(review, /Create and open project/);
assert.match(review, /AI scene images/);
assert.match(review, /AI scene videos/);
assert.match(review, /failedSceneImageCount/);
assert.match(review, /generatedSceneVideoCount/);
assert.match(sceneVideoService, /VIDEO_SCENE_GENERATION_ENDPOINT/);
assert.match(sceneVideoService, /VIDEO_SCENE_GENERATION_API_KEY/);
assert.match(sceneVideoService, /runAiSceneVideoGeneration/);
assert.match(sceneVideoService, /scene-video/);
assert.match(sceneVideoRoute, /sceneVideoGenerationServiceStatus/);
assert.match(sceneVideoRoute, /runAiSceneVideoGeneration/);
assert.match(sceneVideoClient, /fetchSceneVideoGenerationStatus/);
assert.match(sceneVideoClient, /generateSceneVideoWithConnectedService/);
assert.match(sceneVideoClient, /fileFromSceneVideoOutput/);
assert.match(dbSchema, /"scene-video"/);

const capability = aiCapabilities.find((item) => item.id === "ai-video-generation");
assert.equal(capability?.status, "partial");
assert.match(capability?.evidence.join(" ") ?? "", /AI video project/);
assert.match(capability?.evidence.join(" ") ?? "", /article text to video/);
assert.match(capability?.evidence.join(" ") ?? "", /article\/PDF source ingest/);
assert.match(capability?.evidence.join(" ") ?? "", /embedded OCR PDF text/);
assert.match(capability?.evidence.join(" ") ?? "", /image source to video project/);
assert.match(capability?.evidence.join(" ") ?? "", /AI Gateway vision model routing/);
assert.match(capability?.evidence.join(" ") ?? "", /generated scene media placement/);
assert.match(capability?.evidence.join(" ") ?? "", /generated scene image placement/);
assert.match(capability?.evidence.join(" ") ?? "", /generated scene video placement/);

console.log("AI video project workflow checks passed.");

function toUtf16BeHex(value: string) {
  return `FEFF${[...value]
    .map((char) => char.charCodeAt(0).toString(16).padStart(4, "0"))
    .join("")
    .toUpperCase()}`;
}
