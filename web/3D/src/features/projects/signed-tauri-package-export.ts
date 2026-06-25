import type { AppPackageFile } from "./app-package-export";
import { desktopSigningChecklistMarkdown, desktopSigningEnvExample } from "./desktop-signing-workflow";

interface SignedTauriPackageOptions {
  sceneApiUrl: string;
  sceneName: string;
  shareUrl: string;
}

type PackageJson = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  name?: string;
  scripts?: Record<string, string>;
};

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

function updatePackageJson(content: string, options: SignedTauriPackageOptions) {
  const parsed = JSON.parse(content) as PackageJson;

  return JSON.stringify(
    {
      ...parsed,
      name: `${normalizePackageName(options.sceneName)}-signed-tauri-app`,
      scripts: {
        ...parsed.scripts,
        "desktop:build": "tauri build",
        "desktop:sign:check": "bun run scripts/verify-signed-artifacts.ts",
        "desktop:sign:check:json": "bun run scripts/verify-signed-artifacts.ts --json",
      },
      devDependencies: {
        ...parsed.devDependencies,
        "@tauri-apps/cli": "^2.11.1",
      },
    },
    null,
    2,
  );
}

function updateTauriConfig(content: string) {
  const parsed = JSON.parse(content) as {
    bundle?: Record<string, unknown>;
    plugins?: Record<string, unknown>;
  };

  return JSON.stringify(
    {
      ...parsed,
      bundle: {
        ...(parsed.bundle ?? {}),
        active: true,
        createUpdaterArtifacts: true,
        targets: "all",
      },
    },
    null,
    2,
  );
}

function readme(options: SignedTauriPackageOptions) {
  return `# ${options.sceneName} Signed Desktop Package

This package wraps the published Essence Spline scene in a signing-ready Tauri desktop shell.

- Share URL: ${options.shareUrl}
- Scene API: ${options.sceneApiUrl}

## Build

1. Install dependencies with \`bun install\`.
2. Copy \`signing/.env.signing.example\` to your secret manager or local ignored environment file.
3. Set \`TAURI_SIGNING_PRIVATE_KEY\` and \`TAURI_SIGNING_PRIVATE_KEY_PASSWORD\`.
4. Run \`bun run desktop:build\`.
5. Run \`bun run desktop:sign:check\` to verify every release artifact has an updater signature.

## Platform signing

- Windows: sign the installer with a trusted code-signing certificate and timestamp server.
- macOS: sign with a Developer ID certificate, then notarize and staple the app or DMG.
- Linux: ship the updater signature and, when distributing package-manager artifacts, sign repository metadata with your package key.

The \`.github/workflows/signed-desktop-release.yml\` file is a starter CI workflow. It intentionally references secrets instead of storing private material in source control.
`;
}

function signingEnvExample() {
  return desktopSigningEnvExample();
}

function releaseChecklist() {
  return desktopSigningChecklistMarkdown();
}

function verifySignedArtifactsScript() {
  return `import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join, relative, resolve } from "node:path";

const args = process.argv.slice(2);
const bundleDir = resolve(args.find((arg) => arg.startsWith("--bundle-dir="))?.slice("--bundle-dir=".length) ?? "src-tauri/target/release/bundle");
const json = args.includes("--json");

function walk(directory: string): string[] {
  if (!existsSync(directory)) {
    return [];
  }

  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      return walk(path);
    }

    return statSync(path).isFile() ? [path] : [];
  });
}

function isArtifact(path: string) {
  const name = basename(path).toLowerCase();

  return name.endsWith(".app.tar.gz") || name.endsWith(".appimage") || name.endsWith(".deb") || name.endsWith(".dmg") || name.endsWith(".exe") || name.endsWith(".msi") || name.endsWith(".rpm");
}

function readSignature(path: string) {
  const signaturePath = \`\${path}.sig\`;

  return existsSync(signaturePath) ? readFileSync(signaturePath, "utf8").trim() : "";
}

const artifacts = walk(bundleDir)
  .filter(isArtifact)
  .map((path) => ({
    path: relative(bundleDir, path).replaceAll("\\\\", "/"),
    signed: readSignature(path).length > 0,
  }));

const unsigned = artifacts.filter((artifact) => !artifact.signed);

if (json) {
  console.log(JSON.stringify({ artifacts, bundleDir, passed: artifacts.length > 0 && unsigned.length === 0, unsigned }, null, 2));
} else {
  console.log(\`Checked \${artifacts.length} desktop artifacts in \${bundleDir}\`);

  for (const artifact of artifacts) {
    console.log(\`\${artifact.signed ? "signed" : "missing-signature"}  \${artifact.path}\`);
  }
}

if (artifacts.length === 0 || unsigned.length > 0) {
  process.exitCode = 1;
}
`;
}

function githubWorkflow() {
  return `name: Signed desktop release

on:
  workflow_dispatch:

jobs:
  build:
    strategy:
      fail-fast: false
      matrix:
        include:
          - os: windows-latest
            command: bun run desktop:build
          - os: macos-latest
            command: bun run desktop:build
          - os: ubuntu-latest
            command: bun run desktop:build
    runs-on: \${{ matrix.os }}
    env:
      TAURI_SIGNING_PRIVATE_KEY: \${{ secrets.TAURI_SIGNING_PRIVATE_KEY }}
      TAURI_SIGNING_PRIVATE_KEY_PASSWORD: \${{ secrets.TAURI_SIGNING_PRIVATE_KEY_PASSWORD }}
      WINDOWS_CERTIFICATE_BASE64: \${{ secrets.WINDOWS_CERTIFICATE_BASE64 }}
      WINDOWS_CERTIFICATE_PASSWORD: \${{ secrets.WINDOWS_CERTIFICATE_PASSWORD }}
      APPLE_CERTIFICATE_BASE64: \${{ secrets.APPLE_CERTIFICATE_BASE64 }}
      APPLE_CERTIFICATE_PASSWORD: \${{ secrets.APPLE_CERTIFICATE_PASSWORD }}
      APPLE_ID: \${{ secrets.APPLE_ID }}
      APPLE_APP_SPECIFIC_PASSWORD: \${{ secrets.APPLE_APP_SPECIFIC_PASSWORD }}
      APPLE_TEAM_ID: \${{ secrets.APPLE_TEAM_ID }}
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - uses: dtolnay/rust-toolchain@stable
      - run: bun install --frozen-lockfile
      - run: \${{ matrix.command }}
      - run: bun run desktop:sign:check
      - uses: actions/upload-artifact@v4
        with:
          name: desktop-\${{ matrix.os }}
          path: src-tauri/target/release/bundle
`;
}

export function signedTauriFiles(options: SignedTauriPackageOptions, baseFiles: AppPackageFile[]): AppPackageFile[] {
  return baseFiles
    .map((file) => {
      if (file.path === "package.json") {
        return { ...file, content: updatePackageJson(file.content, options) };
      }

      if (file.path === "src-tauri/tauri.conf.json") {
        return { ...file, content: updateTauriConfig(file.content) };
      }

      if (file.path === "README.md") {
        return { ...file, content: readme(options) };
      }

      return file;
    })
    .concat([
      { path: ".github/workflows/signed-desktop-release.yml", content: githubWorkflow() },
      { path: "release/signed-desktop-checklist.md", content: releaseChecklist() },
      { path: "scripts/verify-signed-artifacts.ts", content: verifySignedArtifactsScript() },
      { path: "signing/.env.signing.example", content: signingEnvExample() },
    ]);
}
