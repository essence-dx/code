import assert from "node:assert/strict";
import {
  DESKTOP_MEDIA_FILTER,
  DESKTOP_MEDIA_DIRECTORY,
  UnsupportedDesktopMediaError,
  desktopMediaStorageKey,
  desktopImportFailureMessage,
  desktopImportResultMessage,
  isAppLocalDesktopMediaKey,
  isSupportedDesktopMediaPath,
  mediaNameFromPath,
  mimeTypeFromPath,
} from "../src/lib/media/desktop-media";

assert.equal(DESKTOP_MEDIA_DIRECTORY, "media");
assert.deepEqual(DESKTOP_MEDIA_FILTER, {
  name: "Media",
  extensions: ["mp4", "mov", "webm", "m4v", "mp3", "wav", "m4a", "png", "jpg", "jpeg", "webp", "gif"],
});

assert.equal(isSupportedDesktopMediaPath("G:/clips/demo.MP4"), true);
assert.equal(isSupportedDesktopMediaPath("G:\\clips\\voice.wav"), true);
assert.equal(isSupportedDesktopMediaPath("G:/clips/poster.webp"), true);
assert.equal(isSupportedDesktopMediaPath("G:/clips/archive.zip"), false);
assert.equal(isSupportedDesktopMediaPath("G:/clips/no-extension"), false);

assert.equal(mediaNameFromPath("G:/clips/demo.MP4"), "demo.MP4");
assert.equal(mediaNameFromPath("G:\\clips\\voice.wav"), "voice.wav");
assert.equal(mediaNameFromPath(""), "media");
assert.equal(desktopMediaStorageKey("asset_123", "Demo.MP4"), "media/asset_123.mp4");
assert.equal(desktopMediaStorageKey("asset_123", "no-extension"), "media/asset_123.bin");
assert.equal(isAppLocalDesktopMediaKey("media/asset_123.mp4"), true);
assert.equal(isAppLocalDesktopMediaKey("media/../secret.mp4"), false);
assert.equal(isAppLocalDesktopMediaKey("G:/clips/demo.mp4"), false);
assert.equal(isAppLocalDesktopMediaKey("media\\asset_123.mp4"), false);

assert.equal(mimeTypeFromPath("clip.mp4"), "video/mp4");
assert.equal(mimeTypeFromPath("clip.mov"), "video/quicktime");
assert.equal(mimeTypeFromPath("clip.webm"), "video/webm");
assert.equal(mimeTypeFromPath("voice.mp3"), "audio/mpeg");
assert.equal(mimeTypeFromPath("voice.wav"), "audio/wav");
assert.equal(mimeTypeFromPath("voice.m4a"), "audio/mp4");
assert.equal(mimeTypeFromPath("poster.png"), "image/png");
assert.equal(mimeTypeFromPath("poster.jpeg"), "image/jpeg");
assert.equal(mimeTypeFromPath("poster.webp"), "image/webp");
assert.equal(mimeTypeFromPath("unknown.bin"), "application/octet-stream");

assert.equal(desktopImportFailureMessage(new UnsupportedDesktopMediaError("archive.zip")), "Choose a supported video, audio, image, or GIF file.");
assert.equal(desktopImportFailureMessage(new Error("permission denied: secret path")), "Desktop import failed. Check the file and try again.");
assert.equal(desktopImportResultMessage(2, 0), null);
assert.equal(desktopImportResultMessage(2, 1), "2 imported. 1 file could not be imported.");
assert.equal(desktopImportResultMessage(0, 3), "No files imported. 3 files could not be imported.");

console.log("Desktop media helpers passed.");
