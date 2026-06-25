import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const mediaStore = readFileSync(new URL("../src/lib/media/browser-media-store.ts", import.meta.url), "utf8");
const mediaType = readFileSync(new URL("../src/lib/media/media-type.ts", import.meta.url), "utf8");

assert.match(mediaStore, /export function inferMediaType\(file: File\): MediaType/);
assert.match(mediaStore, /return inferMediaTypeFromFile\(file\);/);
assert.match(mediaStore, /error instanceof UnsupportedMediaTypeError/);
assert.match(mediaStore, /export class UnsupportedBrowserMediaError extends Error/);
assert.match(mediaStore, /Choose a supported video, audio, image, or GIF file\./);
assert.doesNotMatch(mediaStore, /return "image";\s*\}/);

assert.match(mediaType, /export function inferMediaTypeFromFile\(file: Pick<File, "name" \| "type">\): MediaType/);
assert.match(mediaType, /const mimeType = file\.type\.toLowerCase\(\);/);
assert.match(mediaType, /const name = file\.name\.toLowerCase\(\);/);
assert.match(mediaType, /video: \["\.mp4", "\.mov", "\.webm", "\.m4v"\]/);
assert.match(mediaType, /audio: \["\.mp3", "\.wav", "\.m4a"\]/);
assert.match(mediaType, /image: \["\.png", "\.jpg", "\.jpeg", "\.webp", "\.gif"\]/);
assert.match(mediaType, /throw new UnsupportedMediaTypeError\(\);/);
assert.match(mediaType, /function hasExtension\(name: string, extensions: readonly string\[\]\)/);

console.log("Browser media validation checks passed.");
