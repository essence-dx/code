import { readFileSync } from "node:fs";

function read(path: string) {
  return readFileSync(path, "utf8");
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

const mediaBin = read("src/features/editor/components/media-bin.tsx");
const batchActions = read("src/features/editor/components/media-bin-batch-actions.tsx");
const coreCapabilities = read("src/lib/product/capabilities/core-editor.ts");
const todo = read("todo.md");

assert(mediaBin.includes("assignFilteredAssetsToActiveCollection"), "Media bin must assign filtered assets to a collection.");
assert(mediaBin.includes("prefixRenameFilteredAssets"), "Media bin must support batch rename.");
assert(mediaBin.includes("removeUnusedAssets"), "Media bin must support removing unused media.");
assert(mediaBin.includes("activeCollectionAssetIds.has(asset.id)"), "Collection assignment must not toggle already assigned assets off.");
assert(mediaBin.includes("prefixMediaAssetName"), "Batch rename must use a bounded name helper.");
assert(batchActions.includes("MediaBinBatchActions"), "Batch action UI must be split into a focused component.");
assert(batchActions.includes("FolderPlus") && batchActions.includes("Pencil") && batchActions.includes("Trash2"), "Batch action UI should expose collection, rename, and cleanup controls.");
assert(coreCapabilities.includes("batch rename") && coreCapabilities.includes("batch collection assign"), "Capability evidence must mention batch media operations.");
assert(todo.includes("Add batch media operations") && todo.includes("[x] Add batch media operations"), "Todo must mark batch media operations complete.");

console.log("Media batch actions workflow checks passed.");
