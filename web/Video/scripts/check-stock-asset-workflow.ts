import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  stockAttributionNote,
  stockAudioCollectionName,
  stockAudioLayerName,
  stockAudioLayerPatch,
  stockAudioLibraryPresets,
  stockAudioRoleFromAsset,
} from "../src/lib/stock/audio-library";
import { isSupportedStockMimeType, stockAssetKindFromMime, stockFileNameFromTitle } from "../src/lib/stock/stock-assets";

assert.equal(stockAssetKindFromMime("image/jpeg"), "image");
assert.equal(stockAssetKindFromMime("video/webm"), "video");
assert.equal(stockAssetKindFromMime("audio/ogg"), "audio");
assert.equal(stockAssetKindFromMime("application/pdf"), null);
assert.equal(isSupportedStockMimeType("image/svg+xml"), false);
assert.equal(isSupportedStockMimeType("image/png"), true);
assert.equal(stockFileNameFromTitle('File:Unsafe <City>|Clip', "image/jpeg"), "Unsafe -City--Clip.jpg");
assert.equal(stockAudioCollectionName, "Music & SFX");
assert.equal(stockAudioLibraryPresets.some((preset) => preset.role === "music" && preset.query.includes("music")), true);
assert.equal(stockAudioLibraryPresets.some((preset) => preset.role === "sound-effect" && preset.query.includes("sound effect")), true);
assert.equal(stockAudioRoleFromAsset({ name: "Warm piano loop.mp3", title: "File:Warm piano loop.mp3" }), "music");
assert.equal(stockAudioRoleFromAsset({ name: "Whoosh.ogg", title: "File:Whoosh.ogg" }), "sound-effect");
const musicPatch = stockAudioLayerPatch("music");
const soundEffectPatch = stockAudioLayerPatch("sound-effect");
assert.equal((musicPatch.volume ?? 1) < (soundEffectPatch.volume ?? 1), true);
assert.equal(stockAudioLayerName({ name: "Track.mp3" }, "music"), "Track.mp3 music bed");
assert.match(
  stockAttributionNote({ providerLabel: "Wikimedia Commons", licenseLabel: "CC BY", attribution: "Creator", pageUrl: "https://example.com" }),
  /Wikimedia Commons.+CC BY.+Creator/,
);

const searchRoute = readFileSync(new URL("../src/app/api/stock/search/route.ts", import.meta.url), "utf8");
assert.match(searchRoute, /searchWikimediaStockAssets/);
assert.match(searchRoute, /isStockMediaType/);
assert.match(searchRoute, /corsPreflight/);
assert.match(searchRoute, /Search needs at least 2 characters/);

const downloadRoute = readFileSync(new URL("../src/app/api/stock/download/route.ts", import.meta.url), "utf8");
assert.match(downloadRoute, /getWikimediaStockAsset/);
assert.match(downloadRoute, /maxStockDownloadBytes/);
assert.match(downloadRoute, /asset\.sourceUrl/);
assert.doesNotMatch(downloadRoute, /searchParams\.get\("url"\)/);

const wikimedia = readFileSync(new URL("../src/lib/stock/wikimedia.ts", import.meta.url), "utf8");
assert.match(wikimedia, /commons\.wikimedia\.org/);
assert.match(wikimedia, /upload\.wikimedia\.org/);
assert.match(wikimedia, /extmetadata/);
assert.match(wikimedia, /LicenseShortName/);
assert.match(wikimedia, /isSupportedStockMimeType/);

const browser = readFileSync(new URL("../src/features/editor/components/stock-asset-browser.tsx", import.meta.url), "utf8");
assert.match(browser, /\/api\/stock\/search/);
assert.match(browser, /Free media/);
assert.match(browser, /Audio library/);
assert.match(browser, /stockAudioLibraryPresets/);
assert.match(browser, /addToTimeline/);
assert.match(browser, /licenseLabel/);
assert.match(browser, /onImport/);

const mediaBin = readFileSync(new URL("../src/features/editor/components/media-bin.tsx", import.meta.url), "utf8");
assert.match(mediaBin, /StockAssetBrowser/);
assert.match(mediaBin, /\/api\/stock\/download/);
assert.match(mediaBin, /saveBrowserMedia/);
assert.match(mediaBin, /stockAudioCollectionName/);
assert.match(mediaBin, /stockAudioLayerPatch/);
assert.match(mediaBin, /ensureStockAudioCollection/);

const capabilities = readFileSync(new URL("../src/lib/product/capabilities/assets.ts", import.meta.url), "utf8");
assert.match(capabilities, /id: "stock-media"/);
assert.match(capabilities, /status: "partial"/);
assert.match(capabilities, /music and SFX presets/);

console.log("Stock asset workflow checks passed.");
