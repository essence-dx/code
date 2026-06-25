import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  normalizeVideoEnhancementRequest,
  videoEnhancementServiceStatus,
} from "../src/lib/ai/video-enhancement";
import { normalizeVideoEnhancementStrength, videoEnhancementModes } from "../src/lib/ai/video-enhancement-contract";
import { aiGenerationAssetMetadata, summarizeAiGenerationOutput } from "../src/lib/ai/generation-records";
import { reviewAiTextSafety } from "../src/lib/ai/safety";

function read(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

assert.deepEqual(videoEnhancementModes, ["stabilization", "eye-contact", "lip-sync"]);
assert.equal(videoEnhancementServiceStatus().ok, true);
assert.deepEqual(videoEnhancementServiceStatus().modes, videoEnhancementModes);
assert.equal(normalizeVideoEnhancementStrength(9), 1.5);
assert.equal(normalizeVideoEnhancementStrength(0.1), 0.5);
assert.equal(normalizeVideoEnhancementRequest({ sourceAssetName: "clip.mp4", mode: "eye-contact", strength: "1.25" }).strength, 1.25);
assert.equal(reviewAiTextSafety({ action: "video-enhancement", text: "Stabilize my own talking-head clip." }).status, "allowed");
assert.equal(summarizeAiGenerationOutput("video-enhancement", { filename: "clip-stabilized.mp4" }), "Enhanced video generated: clip-stabilized.mp4.");
assert.deepEqual(aiGenerationAssetMetadata("video-enhancement", { filename: "clip-stabilized.mp4" }), { kind: "video", name: "clip-stabilized.mp4" });

const service = read("src/lib/ai/video-enhancement.ts");
assert.match(service, /VIDEO_ENHANCEMENT_ENDPOINT/);
assert.match(service, /VIDEO_ENHANCEMENT_API_KEY/);
assert.match(service, /runAiVideoEnhancement/);
assert.match(service, /FormData/);
assert.match(service, /logAiGenerationRecord/);
assert.match(service, /video-enhancement/);

const contract = read("src/lib/ai/video-enhancement-contract.ts");
assert.match(contract, /videoEnhancementModes/);
assert.match(contract, /normalizeVideoEnhancementStrength/);

const route = read("src/app/api/ai/video-enhancement/route.ts");
assert.match(route, /videoEnhancementServiceStatus/);
assert.match(route, /runAiVideoEnhancement/);
assert.match(route, /request\.formData/);

const client = read("src/features/editor/lib/video-enhancement-client.ts");
assert.match(client, /fetchVideoEnhancementStatus/);
assert.match(client, /enhanceVideoWithConnectedService/);
assert.match(client, /fileFromVideoEnhancementOutput/);

const controls = read("src/features/editor/components/ai-video-enhancement-controls.tsx");
assert.match(controls, /Video enhancement/);
assert.match(controls, /videoEnhancementModes/);
assert.match(controls, /Video enhancement strength/);
assert.match(controls, /Stabilization/);
assert.match(controls, /Eye contact/);
assert.match(controls, /Lip-sync/);

const panel = read("src/features/editor/components/ai-assistant-panel.tsx");
assert.match(panel, /AiVideoEnhancementControls/);
assert.match(panel, /fetchVideoEnhancementStatus/);
assert.match(panel, /enhanceVideoWithConnectedService/);
assert.match(panel, /fileFromVideoEnhancementOutput/);
assert.match(panel, /Enhance video/);
assert.match(panel, /findVideoEnhancementTarget/);

const schema = read("src/lib/db/schema.ts");
assert.match(schema, /"video-enhancement"/);
assert.match(schema, /"video"/);

const settings = read("src/app/settings/page.tsx");
assert.match(settings, /"video-enhancement": "Video enhancement"/);

const envExample = read(".env.example");
assert.match(envExample, /VIDEO_ENHANCEMENT_ENDPOINT/);
assert.match(envExample, /VIDEO_ENHANCEMENT_MODEL/);

console.log("AI video enhancement workflow guard passed.");
