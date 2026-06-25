import { readFileSync } from "node:fs";

function read(path: string) {
  return readFileSync(path, "utf8");
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

const editorTypes = read("src/lib/editor/types.ts");
const syncSchema = read("src/lib/projects/project-sync-schema.ts");
const mediaAdapter = read("src/lib/media/self-hosted-media.ts");
const mediaBin = read("src/features/editor/components/media-bin.tsx");
const importControls = read("src/features/editor/components/media-bin-import-controls.tsx");
const editorShell = read("src/features/editor/components/editor-shell.tsx");
const browserRenderer = read("src/lib/render/browser-renderer.ts");
const compositeRenderer = read("src/lib/render/composite-renderer.ts");
const renderPreflight = read("src/lib/render/render-preflight.ts");
const capabilities = read("src/lib/product/capabilities/platform.ts");

assert(editorTypes.includes('"self-hosted-url"'), "MediaAsset source must include the self-hosted URL adapter.");
assert(syncSchema.includes('"self-hosted-url"'), "Project sync schema must preserve self-hosted media records.");
assert(mediaAdapter.includes("createSelfHostedMediaAsset"), "Self-hosted media adapter must create media assets.");
assert(mediaAdapter.includes("loadSelfHostedMediaBlob"), "Self-hosted media adapter must load media blobs for renderers.");
assert(mediaAdapter.includes("crossOrigin = \"anonymous\""), "Self-hosted media metadata loading must require CORS-safe media.");
assert(importControls.includes("onOpenSelfHostedImport"), "Media import controls must expose self-hosted import.");
assert(mediaBin.includes("SelfHostedMediaImportDialog"), "Media bin must render the self-hosted import dialog.");
assert(editorShell.includes('source: "self-hosted-url"'), "Editor recovery must restore self-hosted URLs after project reopen.");
assert(browserRenderer.includes("loadSelfHostedMediaBlob"), "Browser FFmpeg renderer must support self-hosted media.");
assert(compositeRenderer.includes("isSelfHostedMediaAsset"), "Composite renderer must apply CORS-safe self-hosted media loading.");
assert(renderPreflight.includes("checkSelfHostedMediaAvailable"), "Render preflight must validate self-hosted media availability.");
assert(capabilities.includes('id: "cloud-media"') && capabilities.includes('status: "ready"'), "Cloud media capability must be marked ready.");

console.log("Self-hosted media workflow checks passed.");
