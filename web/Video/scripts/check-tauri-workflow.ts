import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function readJson<T>(path: string) {
  return JSON.parse(read(path)) as T;
}

type TauriConfig = {
  productName: string;
  build: {
    frontendDist: string;
    devUrl: string;
    beforeDevCommand: string;
    beforeBuildCommand: string;
  };
  app: {
    windows: Array<{
      title: string;
      minWidth: number;
      minHeight: number;
    }>;
    security: {
      csp: string;
    };
  };
};

type CapabilityConfig = {
  permissions: string[];
};

const tauriConfig = readJson<TauriConfig>("src-tauri/tauri.conf.json");
assert.equal(tauriConfig.productName, "Essence Studio");
assert.equal(tauriConfig.app.windows[0]?.title, "Essence Studio");
assert.equal(tauriConfig.build.frontendDist, "../out");
assert.equal(tauriConfig.build.devUrl, "http://localhost:3000");
assert.equal(tauriConfig.build.beforeDevCommand, "bun run dev");
assert.equal(tauriConfig.build.beforeBuildCommand, "bun run build:tauri-frontend");
assert.ok((tauriConfig.app.windows[0]?.minWidth ?? 0) >= 1180);
assert.ok((tauriConfig.app.windows[0]?.minHeight ?? 0) >= 720);
assert.match(tauriConfig.app.security.csp, /default-src 'self'/);
assert.match(tauriConfig.app.security.csp, /script-src 'self' 'wasm-unsafe-eval' blob:/);
assert.match(tauriConfig.app.security.csp, /worker-src 'self' blob:/);
assert.match(tauriConfig.app.security.csp, /connect-src 'self' https: http:\/\/localhost:\* tauri:/);
assert.match(tauriConfig.app.security.csp, /img-src 'self' asset: http:\/\/asset\.localhost blob: data:/);
assert.match(tauriConfig.app.security.csp, /media-src 'self' asset: http:\/\/asset\.localhost blob: data:/);

const capability = readJson<CapabilityConfig>("src-tauri/capabilities/default.json");
for (const permission of ["core:default", "dialog:default", "fs:default"]) {
  assert.ok(capability.permissions.includes(permission), `${permission} permission is required for desktop import/export.`);
}
for (const permission of ["fs:allow-applocaldata-read-recursive", "fs:allow-applocaldata-write-recursive"]) {
  assert.ok(capability.permissions.includes(permission), `${permission} permission is required for durable app-local media.`);
}
for (const folder of ["desktop", "document", "download", "picture", "video"]) {
  for (const access of ["read", "write"]) {
    const permission = `fs:allow-${folder}-${access}-recursive`;
    assert.ok(capability.permissions.includes(permission), `${permission} permission is required for native media import/export folders.`);
  }
}

const cargoToml = read("src-tauri/Cargo.toml");
assert.match(cargoToml, /description = "Local-first media editor desktop shell"/);
assert.match(cargoToml, /tauri-plugin-dialog/);
assert.match(cargoToml, /tauri-plugin-fs/);

const rustLib = read("src-tauri/src/lib.rs");
assert.match(rustLib, /mod desktop_diagnostics/);
assert.match(rustLib, /mod desktop_launch/);
assert.match(rustLib, /mod desktop_workflow/);
assert.match(rustLib, /tauri_plugin_dialog::init\(\)/);
assert.match(rustLib, /tauri_plugin_fs::init\(\)/);
assert.match(rustLib, /desktop_diagnostics::run_desktop_diagnostics/);
assert.match(rustLib, /desktop_launch::read_desktop_launch_session/);
assert.match(rustLib, /desktop_workflow::run_desktop_workflow_smoke/);

const desktopLaunch = read("src-tauri/src/desktop_launch.rs");
assert.match(desktopLaunch, /DesktopLaunchSession/);
assert.match(desktopLaunch, /create_desktop_launch_session/);
assert.match(desktopLaunch, /read_desktop_launch_session/);
assert.match(desktopLaunch, /auto_verify/);
assert.match(desktopLaunch, /ESSENCE_DESKTOP_AUTO_VERIFY/);

const desktopDiagnostics = read("src-tauri/src/desktop_diagnostics.rs");
assert.match(desktopDiagnostics, /pub fn run_desktop_diagnostics/);
assert.match(desktopDiagnostics, /app_local_data_dir/);
assert.match(desktopDiagnostics, /media/);
assert.match(desktopDiagnostics, /fonts/);
assert.match(desktopDiagnostics, /native-media-engine/);
assert.match(desktopDiagnostics, /native-render-smoke/);
assert.match(desktopDiagnostics, /run_native_render_smoke/);
assert.match(desktopDiagnostics, /essence-studio-native-render/);

const desktopWorkflow = read("src-tauri/src/desktop_workflow.rs");
assert.match(desktopWorkflow, /pub fn run_desktop_workflow_smoke/);
assert.match(desktopWorkflow, /file_backed_media_recovery_step/);
assert.match(desktopWorkflow, /native_export_output_step/);
assert.match(desktopWorkflow, /desktop-workflow-smoke/);
assert.match(desktopWorkflow, /SAMPLE_PNG/);
assert.match(desktopWorkflow, /run_native_render_smoke/);

const nativeRender = read("src-tauri/src/native_render.rs");
assert.match(nativeRender, /pub\(crate\) fn run_native_render_smoke/);
assert.match(nativeRender, /desktop-smoke/);
assert.match(nativeRender, /render_native_output/);
assert.match(nativeRender, /artifact_kind/);

const nextConfig = read("next.config.ts");
assert.match(nextConfig, /TAURI_STATIC_EXPORT/);
assert.match(nextConfig, /output: "export"/);
assert.match(nextConfig, /trailingSlash: true/);
assert.match(nextConfig, /unoptimized: true/);

const buildScript = read("scripts/build-tauri-frontend.mjs");
assert.match(buildScript, /TAURI_STATIC_EXPORT: "1"/);

const tauriMedia = read("src/lib/media/tauri-media.ts");
assert.match(read("src/lib/runtime/client-api.ts"), /__TAURI_INTERNALS__/);
assert.match(read("src/lib/desktop/desktop-launch-session.ts"), /read_desktop_launch_session/);
assert.match(read("src/features/settings/components/desktop-proof-autopilot.tsx"), /desktopProof/);
assert.match(read("src/features/settings/components/desktop-proof-autopilot.tsx"), /writeDesktopVerificationEvidenceToAppLocalData/);
assert.match(read("src/lib/desktop/desktop-verification-history.ts"), /writeTextFile/);
assert.match(read("src/lib/desktop/desktop-verification-history.ts"), /BaseDirectory\.AppLocalData/);
assert.match(read("src/lib/desktop/desktop-verification-history.ts"), /latest-desktop-evidence\.json/);
assert.match(tauriMedia, /isDesktopRuntime/);
assert.match(tauriMedia, /@tauri-apps\/plugin-dialog/);
assert.match(tauriMedia, /@tauri-apps\/plugin-fs/);
assert.match(tauriMedia, /DESKTOP_MEDIA_FILTER/);
assert.match(tauriMedia, /isSupportedDesktopMediaPath/);
assert.match(tauriMedia, /desktopMediaStorageKey/);
assert.match(tauriMedia, /BaseDirectory\.AppLocalData/);
assert.match(tauriMedia, /writeFile/);
assert.match(tauriMedia, /mkdir/);
assert.match(tauriMedia, /failedCount/);
assert.match(tauriMedia, /importTauriMediaPath/);
assert.ok(
  tauriMedia.indexOf("readMediaMetadata(file, mediaType)") < tauriMedia.indexOf("writeFile(storageKey, bytes"),
  "desktop media should be decoded before it is persisted into app-local storage.",
);
assert.match(tauriMedia, /source: "tauri-fs"/);
assert.match(tauriMedia, /restoreTauriMediaAssets/);
assert.match(tauriMedia, /loadTauriMediaBlob/);

for (const path of [
  "src/lib/render/export-output.ts",
  "src/lib/render/render-preflight.ts",
  "src/lib/render/browser-renderer.ts",
  "src/lib/render/composite-renderer.ts",
]) {
  const source = read(path);
  if (path.endsWith("export-output.ts")) {
    assert.match(source, /@tauri-apps\/plugin-dialog/);
    assert.match(source, /@tauri-apps\/plugin-fs/);
    assert.match(source, /writeFile/);
  } else {
    assert.match(source, /loadTauriMediaBlob/, `${path} must support desktop media during export.`);
  }
}

const mediaBin = read("src/features/editor/components/media-bin.tsx");
assert.match(mediaBin, /importTauriMedia/);
assert.match(mediaBin, /useIsDesktopRuntime/);
assert.match(mediaBin, /desktopImportFailureMessage/);
assert.match(mediaBin, /desktopImportResultMessage/);

const editorShell = read("src/features/editor/components/editor-shell.tsx");
assert.match(editorShell, /restoreTauriMediaAssets/);
assert.match(editorShell, /source: "tauri-fs"/);

assert.match(read(".gitignore"), /\/out\//);

console.log("Tauri desktop workflow preflight passed.");
