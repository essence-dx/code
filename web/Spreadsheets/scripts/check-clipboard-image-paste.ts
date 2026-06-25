import { strict as assert } from "node:assert";
import {
  createInsertedImageInputFromClipboard,
  getClipboardImageFile,
  validateWorksheetImageFile,
} from "@/features/spreadsheet/clipboard-image";
import { MAX_INSERTED_OBJECT_IMAGE_BYTES } from "@/features/spreadsheet/inserted-objects";

const png = new File(["image-bytes"], "pasted.png", { type: "image/png" });
const bmp = new File(["image-bytes"], "pasted.bmp", { type: "image/bmp" });
const oversized = new File(
  [new Uint8Array(MAX_INSERTED_OBJECT_IMAGE_BYTES + 1)],
  "large.png",
  { type: "image/png" },
);

assert.deepEqual(validateWorksheetImageFile(png), { ok: true });
assert.equal(validateWorksheetImageFile(bmp).ok, false);
assert.equal(validateWorksheetImageFile(oversized).ok, false);

const clipboardFile = getClipboardImageFile({
  items: [
    {
      kind: "string",
      type: "text/plain",
      getAsFile: () => null,
    },
    {
      kind: "file",
      type: "image/png",
      getAsFile: () => png,
    },
  ],
});

assert.equal(clipboardFile?.name, "pasted.png", "finds image clipboard item");

const fallbackFile = getClipboardImageFile({
  files: [bmp, png],
});

assert.equal(fallbackFile?.name, "pasted.bmp", "falls back to clipboard files");

const input = createInsertedImageInputFromClipboard({
  dataUrl: "data:image/png;base64,aW1hZ2UtYnl0ZXM=",
  file: png,
});

assert.equal(input?.kind, "image");
assert.equal(input?.fileName, "pasted.png");
assert.equal(input?.mimeType, "image/png");
assert.equal(input?.originalSizeBytes, png.size);

assert.equal(
  createInsertedImageInputFromClipboard({
    dataUrl: "data:text/plain;base64,aW1hZ2UtYnl0ZXM=",
    file: png,
  }),
  null,
  "rejects non-image data URLs",
);

console.log("Clipboard image paste checks passed.");
