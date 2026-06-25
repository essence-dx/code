import { Buffer } from "node:buffer";
import type { ShareSettings } from "./share-settings";
import { createAppPackageManifestFile } from "./app-package-validation";
import { escapeHtmlAttribute } from "./share-links";
import { signedTauriFiles } from "./signed-tauri-package-export";
import { visionOsPreviewFiles } from "./visionos-package-export";
import type { ProjectExportAppPackageLineageManifest } from "./project-export-lineage";

export const APP_PACKAGE_PRESETS = [
  { id: "web", label: "Web app" },
  { id: "tauri", label: "Tauri desktop shell" },
  { id: "signed-tauri", label: "Signed Tauri desktop package" },
  { id: "capacitor", label: "Capacitor mobile shell" },
  { id: "android-apk", label: "Android APK package" },
  { id: "android-aab", label: "Android AAB package" },
  { id: "visionos-preview", label: "visionOS preview" },
] as const;

export type AppPackagePresetId = (typeof APP_PACKAGE_PRESETS)[number]["id"];

export interface AppPackageFile {
  content: string;
  path: string;
}

export interface AppPackageSceneSummary {
  id: string;
  name: string;
  objectCount: number;
  updatedAt?: string;
}

export interface AppPackageOptions {
  activeSceneId?: string | null;
  embedUrl: string;
  lineage?: ProjectExportAppPackageLineageManifest | null;
  sceneApiUrl: string;
  sceneName: string;
  scenes?: AppPackageSceneSummary[];
  shareSettings: ShareSettings;
  shareUrl: string;
}

const crcTable = new Uint32Array(256);

for (let index = 0; index < crcTable.length; index += 1) {
  let value = index;

  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }

  crcTable[index] = value >>> 0;
}

function crc32(data: Buffer) {
  let crc = 0xffffffff;

  for (const byte of data) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function uint16(value: number) {
  const buffer = Buffer.allocUnsafe(2);
  buffer.writeUInt16LE(value);
  return buffer;
}

function uint32(value: number) {
  const buffer = Buffer.allocUnsafe(4);
  buffer.writeUInt32LE(value >>> 0);
  return buffer;
}

function getDosTimestamp(date = new Date()) {
  const year = Math.max(1980, date.getFullYear());

  return {
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
  };
}

function normalizePackageName(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "essence-spline-scene"
  );
}

function packageJson(name: string, scripts: Record<string, string>, dependencies: Record<string, string>, devDependencies: Record<string, string> = {}) {
  return JSON.stringify(
    {
      name,
      private: true,
      version: "0.1.0",
      type: "module",
      scripts,
      dependencies,
      devDependencies,
    },
    null,
    2,
  );
}

function reactAppSource(options: AppPackageOptions) {
  const embedUrl = JSON.stringify(options.embedUrl);
  const sceneApiUrl = JSON.stringify(options.sceneApiUrl);

  return `import { useEffect, useState } from "react";

export function App() {
  const [sceneName, setSceneName] = useState(${JSON.stringify(options.sceneName)});

  useEffect(() => {
    fetch(${sceneApiUrl})
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (payload?.scene?.name) {
          setSceneName(payload.scene.name);
        }
      })
      .catch(() => undefined);
  }, []);

  return (
    <main className="app-shell">
      <iframe src={${embedUrl}} title={sceneName} allow="fullscreen; xr-spatial-tracking" />
    </main>
  );
}
`;
}

function reactEntrySource() {
  return `import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
`;
}

function appStyles(options: Pick<ShareSettings, "embedTransparentBackground">) {
  const background = options.embedTransparentBackground ? "transparent" : "#09090b";

  return `:root {
  color-scheme: dark;
  background: ${background};
}

* {
  box-sizing: border-box;
}

html,
body,
#root {
  width: 100%;
  height: 100%;
  margin: 0;
}

body {
  overflow: hidden;
  background: ${background};
}

.app-shell,
iframe {
  width: 100%;
  height: 100%;
}

iframe {
  display: block;
  border: 0;
  background: ${background};
}
`;
}

function indexHtml(sceneName: string) {
  const title = escapeHtmlAttribute(sceneName);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;
}

function readme(options: AppPackageOptions, preset: AppPackagePresetId) {
  const sceneList = options.scenes?.length
    ? `\n## Scenes\n\n${options.scenes.map((scene) => `- ${scene.name} (${scene.id}) - ${scene.objectCount} objects`).join("\n")}\n`
    : "";

  return `# ${options.sceneName}

This package wraps the published Essence Spline scene as a standalone ${preset} app shell.

- Share URL: ${options.shareUrl}
- Embed URL: ${options.embedUrl}
- Scene API: ${options.sceneApiUrl}
- Active Scene: ${options.activeSceneId ?? "default"}

The scene is watermark-free and uses the share/embed settings from the original project.
${sceneList}
`;
}

function androidReadme(options: AppPackageOptions, artifact: "apk" | "aab") {
  const command = artifact === "apk" ? "bun run android:apk" : "bun run android:aab";
  const artifactPath = artifact === "apk" ? "android/app/build/outputs/apk/release/app-release.apk" : "android/app/build/outputs/bundle/release/app-release.aab";

  return `# ${options.sceneName} Android ${artifact.toUpperCase()}

This package builds the published Essence Spline scene into an Android ${artifact.toUpperCase()} using Capacitor and the local Android Gradle toolchain.

- Share URL: ${options.shareUrl}
- Embed URL: ${options.embedUrl}
- Scene API: ${options.sceneApiUrl}

## Requirements

- Bun
- Android Studio or Android SDK command-line tools
- JDK 17+

## Build

1. Install dependencies with \`bun install\`.
2. Create the native Android project with \`bun run android:init\`.
3. Run \`${command}\`.
4. Find the artifact at \`${artifactPath}\`.

## Release signing

Copy \`signing/keystore.properties.example\` to \`android/signing/keystore.properties\` after \`android:init\`, then point it at your release keystore before producing a store-ready release.
`;
}

function webFiles(options: AppPackageOptions): AppPackageFile[] {
  const name = normalizePackageName(options.sceneName);

  return [
    {
      path: "package.json",
      content: packageJson(
        `${name}-web-app`,
        {
          dev: "vite --host 0.0.0.0",
          build: "tsc && vite build",
          preview: "vite preview",
        },
        {
          react: "^19.2.0",
          "react-dom": "^19.2.0",
        },
        {
          "@vitejs/plugin-react": "^5.0.0",
          typescript: "^5.0.0",
          vite: "^7.0.0",
        },
      ),
    },
    { path: "index.html", content: indexHtml(options.sceneName) },
    {
      path: "tsconfig.json",
      content: JSON.stringify(
        {
          compilerOptions: {
            jsx: "react-jsx",
            lib: ["ES2022", "DOM", "DOM.Iterable"],
            module: "ESNext",
            moduleResolution: "Bundler",
            noEmit: true,
            strict: true,
            target: "ES2022",
          },
          include: ["src"],
        },
        null,
        2,
      ),
    },
    {
      path: "vite.config.ts",
      content: `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
});
`,
    },
    { path: "src/App.tsx", content: reactAppSource(options) },
    { path: "src/main.tsx", content: reactEntrySource() },
    { path: "src/styles.css", content: appStyles(options.shareSettings) },
    { path: "README.md", content: readme(options, "web") },
    createAppPackageManifestFile(options),
  ];
}

function tauriFiles(options: AppPackageOptions): AppPackageFile[] {
  const files = webFiles(options);
  const productName = options.sceneName.slice(0, 64) || "Essence Spline Scene";

  return [
    ...files,
    {
      path: "src-tauri/Cargo.toml",
      content: `[package]
name = "essence_spline_scene"
version = "0.1.0"
edition = "2021"

[dependencies]
tauri = { version = "2", features = [] }

[build-dependencies]
tauri-build = { version = "2", features = [] }
`,
    },
    {
      path: "src-tauri/src/main.rs",
      content: `fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("failed to run Essence Spline scene app");
}
`,
    },
    {
      path: "src-tauri/tauri.conf.json",
      content: JSON.stringify(
        {
          $schema: "https://schema.tauri.app/config/2",
          productName,
          version: "0.1.0",
          identifier: `com.essencespline.${normalizePackageName(options.sceneName).replaceAll("-", "")}`,
          build: {
            beforeDevCommand: "bun run dev",
            beforeBuildCommand: "bun run build",
            devUrl: "http://localhost:5173",
            frontendDist: "../dist",
          },
          app: {
            windows: [
              {
                title: productName,
                width: 1280,
                height: 800,
              },
            ],
          },
        },
        null,
        2,
      ),
    },
  ];
}

function capacitorFiles(options: AppPackageOptions): AppPackageFile[] {
  const files = webFiles(options);
  const appName = options.sceneName.slice(0, 64) || "Essence Spline Scene";

  return [
    ...files,
    {
      path: "capacitor.config.ts",
      content: `import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.essencespline.${normalizePackageName(options.sceneName).replaceAll("-", "")}",
  appName: ${JSON.stringify(appName)},
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
};

export default config;
`,
    },
  ];
}

function androidBuildScript(artifact: "apk" | "aab") {
  const gradleTask = artifact === "apk" ? "assembleRelease" : "bundleRelease";
  const windowsGradle = artifact === "apk" ? ".\\gradlew.bat assembleRelease" : ".\\gradlew.bat bundleRelease";

  return `import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const artifact = ${JSON.stringify(artifact)};
const gradleTask = ${JSON.stringify(gradleTask)};
const windowsGradle = ${JSON.stringify(windowsGradle)};

function run(command: string, args: string[], cwd = process.cwd()) {
  const result = spawnSync(command, args, {
    cwd,
    shell: process.platform === "win32",
    stdio: "inherit",
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run("bun", ["run", "build"]);

if (!existsSync("android")) {
  run("bun", ["x", "cap", "add", "android"]);
}

run("bun", ["x", "cap", "sync", "android"]);

if (process.platform === "win32") {
  run(windowsGradle, [], "android");
} else {
  run("./gradlew", [gradleTask], "android");
}

console.log(\`Android \${artifact.toUpperCase()} build complete.\`);
`;
}

function androidPackageFiles(options: AppPackageOptions, artifact: "apk" | "aab"): AppPackageFile[] {
  return capacitorFiles(options).map((file) =>
    file.path === "package.json"
      ? {
          ...file,
          content: packageJson(
            `${normalizePackageName(options.sceneName)}-android-${artifact}`,
            {
              dev: "vite --host 0.0.0.0",
              build: "tsc && vite build",
              preview: "vite preview",
              "android:init": "cap add android",
              "android:sync": "bun run build && cap sync android",
              [`android:${artifact}`]: "bun run scripts/build-android.ts",
            },
            {
              "@capacitor/core": "^8.0.0",
              react: "^19.2.0",
              "react-dom": "^19.2.0",
            },
            {
              "@capacitor/android": "^8.0.0",
              "@capacitor/cli": "^8.0.0",
              "@vitejs/plugin-react": "^5.0.0",
              typescript: "^5.0.0",
              vite: "^7.0.0",
            },
          ),
        }
      : file.path === "README.md"
        ? {
            ...file,
            content: androidReadme(options, artifact),
          }
        : file,
  ).concat([
    { path: "scripts/build-android.ts", content: androidBuildScript(artifact) },
    {
      path: "signing/keystore.properties.example",
      content: `storeFile=../release.keystore
storePassword=changeit
keyAlias=release
keyPassword=changeit
`,
    },
  ]);
}

export function getAppPackageFiles(presetId: AppPackagePresetId, options: AppPackageOptions): AppPackageFile[] {
  if (presetId === "tauri") {
    return tauriFiles(options);
  }

  if (presetId === "signed-tauri") {
    return signedTauriFiles(options, tauriFiles(options));
  }

  if (presetId === "android-apk") {
    return androidPackageFiles(options, "apk");
  }

  if (presetId === "android-aab") {
    return androidPackageFiles(options, "aab");
  }

  if (presetId === "visionos-preview") {
    return visionOsPreviewFiles(options, webFiles(options));
  }

  if (presetId === "capacitor") {
    return capacitorFiles(options).map((file) =>
      file.path === "package.json"
        ? {
            ...file,
            content: packageJson(
              `${normalizePackageName(options.sceneName)}-mobile-app`,
              {
                dev: "vite --host 0.0.0.0",
                build: "tsc && vite build",
                preview: "vite preview",
                "cap:add:android": "cap add android",
                "cap:add:ios": "cap add ios",
                "cap:sync": "cap sync",
              },
              {
                "@capacitor/core": "^8.0.0",
                react: "^19.2.0",
                "react-dom": "^19.2.0",
              },
              {
                "@capacitor/android": "^8.0.0",
                "@capacitor/cli": "^8.0.0",
                "@capacitor/ios": "^8.0.0",
                "@vitejs/plugin-react": "^5.0.0",
                typescript: "^5.0.0",
                vite: "^7.0.0",
              },
            ),
          }
        : file,
    );
  }

  return webFiles(options);
}

export function getAppPackageFileName(sceneName: string, presetId: AppPackagePresetId) {
  return `${normalizePackageName(sceneName)}-${presetId}-app.zip`;
}

export function createAppPackageZip(files: AppPackageFile[]) {
  const timestamp = getDosTimestamp();
  const localChunks: Buffer[] = [];
  const centralChunks: Buffer[] = [];
  let offset = 0;

  for (const file of files) {
    const fileName = Buffer.from(file.path.replaceAll("\\", "/"), "utf8");
    const content = Buffer.from(file.content, "utf8");
    const checksum = crc32(content);
    const localHeader = Buffer.concat([
      uint32(0x04034b50),
      uint16(20),
      uint16(0),
      uint16(0),
      uint16(timestamp.time),
      uint16(timestamp.date),
      uint32(checksum),
      uint32(content.length),
      uint32(content.length),
      uint16(fileName.length),
      uint16(0),
      fileName,
    ]);

    localChunks.push(localHeader, content);
    centralChunks.push(
      Buffer.concat([
        uint32(0x02014b50),
        uint16(20),
        uint16(20),
        uint16(0),
        uint16(0),
        uint16(timestamp.time),
        uint16(timestamp.date),
        uint32(checksum),
        uint32(content.length),
        uint32(content.length),
        uint16(fileName.length),
        uint16(0),
        uint16(0),
        uint16(0),
        uint16(0),
        uint32(0),
        uint32(offset),
        fileName,
      ]),
    );

    offset += localHeader.length + content.length;
  }

  const centralDirectory = Buffer.concat(centralChunks);
  const localDirectory = Buffer.concat(localChunks);
  const endRecord = Buffer.concat([
    uint32(0x06054b50),
    uint16(0),
    uint16(0),
    uint16(files.length),
    uint16(files.length),
    uint32(centralDirectory.length),
    uint32(localDirectory.length),
    uint16(0),
  ]);

  return Buffer.concat([localDirectory, centralDirectory, endRecord]);
}

export function getAppPackagePresetPayloads(options: AppPackageOptions) {
  return APP_PACKAGE_PRESETS.map((preset) => {
    const files = getAppPackageFiles(preset.id, options);

    return {
      ...preset,
      fileCount: files.length,
      files: files.map((file) => file.path),
    };
  });
}
