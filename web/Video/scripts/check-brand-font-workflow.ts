import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const types = read("src/lib/editor/types.ts");
assert.match(types, /export interface BrandFontAsset/);
assert.match(types, /fontAssets: BrandFontAsset\[\]/);
assert.match(types, /defaultFontAssetId\?: string/);
assert.match(types, /"browser-indexeddb" \| "tauri-fs"/);

const brandKit = read("src/lib/editor/brand-kit.ts");
assert.match(brandKit, /fontAssets: \[\]/);
assert.match(brandKit, /uniqueFontAssets/);
assert.match(brandKit, /defaultFontAssetId/);
assert.match(brandKit, /"tauri-fs"/);

const fontStore = read("src/lib/media/brand-font-store.ts");
assert.match(fontStore, /saveBrowserBrandFont/);
assert.match(fontStore, /loadBrandFontFaces/);
assert.match(fontStore, /FontFace/);
assert.match(fontStore, /isDesktopRuntime/);
assert.match(fontStore, /BaseDirectory\.AppLocalData/);
assert.match(fontStore, /desktopFontStorageKey/);
assert.match(fontStore, /loadTauriBrandFont/);
assert.match(fontStore, /\.ttf/);
assert.match(fontStore, /\.otf/);
assert.match(fontStore, /\.woff2/);

const storeTypes = read("src/features/editor/state/editor-store-types.ts");
assert.match(storeTypes, /addBrandFontAsset/);
assert.match(storeTypes, /removeBrandFontAsset/);

const presetSlice = read("src/features/editor/state/editor-preset-brand-slice.ts");
assert.match(presetSlice, /addBrandFontAsset/);
assert.match(presetSlice, /removeBrandFontAsset/);
assert.match(presetSlice, /cleanBrandFontAsset/);

const typographyPanel = read("src/features/editor/components/brand-typography-panel.tsx");
assert.match(typographyPanel, /Upload font/);
assert.match(typographyPanel, /saveBrowserBrandFont/);
assert.match(typographyPanel, /brandKit\.fontAssets/);
assert.match(typographyPanel, /removeBrandFontAsset/);

const fontLoader = read("src/features/editor/components/brand-font-loader.tsx");
assert.match(fontLoader, /BrandFontLoader/);
assert.match(fontLoader, /loadBrandFontFaces/);

const editorShell = read("src/features/editor/components/editor-shell.tsx");
assert.match(editorShell, /BrandFontLoader/);

const projectSyncSchema = read("src/lib/projects/project-sync-schema.ts");
assert.match(projectSyncSchema, /brandFontAssetSchema/);
assert.match(projectSyncSchema, /z\.enum\(\["browser-indexeddb", "tauri-fs"\]\)/);
assert.match(projectSyncSchema, /fontAssets: z\.array\(brandFontAssetSchema\)\.max\(24\)\.default\(\[\]\)/);

const nativeGraph = read("src/lib/render/native-render-graph.ts");
assert.match(nativeGraph, /NativeRenderGraphFont/);
assert.match(nativeGraph, /fonts: project\.brandKit\?\.fontAssets/);

const nativeFfmpeg = read("src-tauri/src/native_ffmpeg.rs");
assert.match(nativeFfmpeg, /native_layer_filtergraph\(&request\.render_graph, app_local_data_dir\)/);

const nativeFfmpegGraph = read("src-tauri/src/native_ffmpeg_graph.rs");
assert.match(nativeFfmpegGraph, /native_font_files/);
assert.match(nativeFfmpegGraph, /fontfile/);
assert.match(nativeFfmpegGraph, /escape_filter_path/);

const tauriConfig = read("src-tauri/tauri.conf.json");
assert.match(tauriConfig, /font-src[^"]*blob:/);

const todo = read("todo.md");
assert.match(todo, /custom font upload and font asset persistence/i);
assert.match(todo, /native FFmpeg fontfile mapping/i);

console.log("Brand font workflow checks passed.");

function read(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}
