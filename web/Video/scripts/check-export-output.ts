import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  ExportSaveCancelledError,
  exportDialogFilter,
  exportFilename,
  exportJobOutputName,
  exportMimeType,
  projectBundleFilename,
  safeExportBaseName,
} from "../src/lib/render/export-output";
import { RenderEngineError, RenderMediaUnavailableError, RenderUnsupportedError, renderFailureMessage } from "../src/lib/render/render-errors";

const exportOutputSource = readFileSync(new URL("../src/lib/render/export-output.ts", import.meta.url), "utf8");

assert.equal(safeExportBaseName(" Product Launch: v2! "), "product-launch-v2");
assert.equal(safeExportBaseName("!!!"), "project");

assert.equal(exportFilename("Client Cut", "mp4"), "client-cut.mp4");
assert.equal(exportFilename("!!!", "mp4"), "project.mp4");
assert.equal(exportFilename("Client Cut", "webm"), "client-cut.webm");
assert.equal(exportFilename("Client Cut", "mov"), "client-cut.mov");
assert.equal(exportFilename("Client Cut", "avi"), "client-cut.avi");
assert.equal(exportFilename("Client Cut", "mpeg"), "client-cut.mpeg");
assert.equal(exportFilename("Client Cut", "gif"), "client-cut.gif");
assert.equal(exportFilename("Client Cut", "jpg"), "client-cut.jpg");
assert.equal(exportFilename("Client Cut", "webp"), "client-cut.webp");
assert.equal(exportFilename("Client Cut", "mp3"), "client-cut.mp3");
assert.equal(exportFilename("Client Cut", "m4a"), "client-cut.m4a");
assert.equal(projectBundleFilename("Client Cut"), "client-cut.essence-studio.json");
assert.equal(exportJobOutputName("Client Cut", "mp4", "mp4-1080p"), "client-cut.mp4");
assert.equal(exportJobOutputName("Client Cut", "json", "project-bundle"), "client-cut.essence-studio.json");

assert.deepEqual(exportDialogFilter("mp4"), {
  name: "MP4 Video",
  extensions: ["mp4"],
});
assert.deepEqual(exportDialogFilter("json"), {
  name: "Project Bundle",
  extensions: ["json"],
});

assert.equal(exportMimeType("mp4"), "video/mp4");
assert.equal(exportMimeType("webm"), "video/webm");
assert.equal(exportMimeType("mov"), "video/quicktime");
assert.equal(exportMimeType("avi"), "video/x-msvideo");
assert.equal(exportMimeType("mpeg"), "video/mpeg");
assert.equal(exportMimeType("gif"), "image/gif");
assert.equal(exportMimeType("png"), "image/png");
assert.equal(exportMimeType("jpg"), "image/jpeg");
assert.equal(exportMimeType("webp"), "image/webp");
assert.equal(exportMimeType("mp3"), "audio/mpeg");
assert.equal(exportMimeType("m4a"), "audio/mp4");
assert.equal(exportMimeType("json"), "application/json");
assert.equal(new ExportSaveCancelledError().name, "ExportSaveCancelledError");
assert.equal(renderFailureMessage(new RenderUnsupportedError("Add a visual layer before exporting video.")), "Add a visual layer before exporting video.");
assert.equal(renderFailureMessage(new RenderMediaUnavailableError()), "Source media is unavailable. Reconnect it and try again.");
assert.equal(renderFailureMessage(new RenderEngineError()), "Export rendering failed. Try a shorter clip or another preset.");
assert.equal(renderFailureMessage(new Error("FFmpeg exited with code 1.")), "Export failed. Try a shorter clip or another preset.");
assert.match(exportOutputSource, /document\.body\.append\(link\)/);
assert.match(exportOutputSource, /link\.remove\(\)/);
assert.match(exportOutputSource, /window\.setTimeout\(\(\) => URL\.revokeObjectURL\(url\), 0\)/);
assert.doesNotMatch(exportOutputSource, /link\.click\(\);\s*URL\.revokeObjectURL\(url\)/);

console.log("Export output helpers passed.");
