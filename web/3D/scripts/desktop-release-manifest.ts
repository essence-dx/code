import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createDesktopReleaseManifestPayload, getDesktopReleaseEnvRows, scanDesktopReleaseArtifacts, type DesktopReleaseTarget } from "../src/features/projects/desktop-release-artifacts";
import { createDesktopReleasePromotionReport, type DesktopReleasePromotionChannel } from "../src/features/projects/desktop-release-promotion";

type TauriConfig = {
  version?: unknown;
};

const args = process.argv.slice(2);
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const defaultBundleDir = resolve(repoRoot, "src-tauri", "target", "release", "bundle");
const defaultBaseUrl = "https://essence-spline.vercel.app/desktop/releases";

function readOption(name: string) {
  const inlinePrefix = `--${name}=`;
  const inline = args.find((arg) => arg.startsWith(inlinePrefix));

  if (inline) {
    return inline.slice(inlinePrefix.length);
  }

  const optionIndex = args.indexOf(`--${name}`);

  return optionIndex >= 0 ? args[optionIndex + 1] : undefined;
}

function hasFlag(name: string) {
  return args.includes(`--${name}`);
}

function readListOption(name: string) {
  return readOption(name)
    ?.split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function readPromotionChannel(): DesktopReleasePromotionChannel | null {
  const value = readOption("promote-channel") ?? process.env.DESKTOP_UPDATE_CHANNEL;

  if (value === "beta" || value === "nightly" || value === "stable") {
    return value;
  }

  return null;
}

function readRequiredTargets(): DesktopReleaseTarget[] | undefined {
  const values = readListOption("required-targets");

  if (!values?.length) {
    return undefined;
  }

  return values.filter((value): value is DesktopReleaseTarget => value === "windows" || value === "darwin" || value === "linux");
}

function readTauriVersion() {
  try {
    const config = JSON.parse(readFileSync(resolve(repoRoot, "src-tauri", "tauri.conf.json"), "utf8")) as TauriConfig;

    return typeof config.version === "string" && config.version.trim() ? config.version.trim() : "0.0.0";
  } catch {
    return "0.0.0";
  }
}

function quoteEnvValue(value: string) {
  return JSON.stringify(value);
}

const bundleDir = resolve(readOption("bundle-dir") ?? process.env.DESKTOP_RELEASE_BUNDLE_DIR ?? defaultBundleDir);
const baseUrl = readOption("base-url") ?? process.env.DESKTOP_RELEASE_ARTIFACT_BASE_URL ?? defaultBaseUrl;
const version = readOption("version") ?? process.env.DESKTOP_UPDATE_VERSION ?? readTauriVersion();
const notes = readOption("notes") ?? process.env.DESKTOP_UPDATE_NOTES ?? `Essence Spline ${version}`;
const pubDate = readOption("pub-date") ?? process.env.DESKTOP_UPDATE_PUB_DATE ?? new Date().toISOString();
const requiredTargets = readRequiredTargets();
const scan = scanDesktopReleaseArtifacts({ baseUrl, bundleDir, requiredTargets });
const metadata = { notes, pubDate, version };
const envRows = getDesktopReleaseEnvRows(scan.selectedArtifacts, metadata);
const promotionChannel = readPromotionChannel();

if (promotionChannel) {
  const promotion = createDesktopReleasePromotionReport(scan, metadata, {
    channel: promotionChannel,
    currentVersion: readOption("current-version") ?? process.env.DESKTOP_CURRENT_VERSION,
    requiredTargets,
  });

  if (hasFlag("json")) {
    console.log(JSON.stringify({ manifest: createDesktopReleaseManifestPayload(scan, metadata), promotion }, null, 2));
  } else {
    console.log(`# ${promotion.channel} desktop release promotion`);
    console.log(`# Version: ${promotion.version}`);
    console.log(`# Selected artifacts: ${promotion.artifactCount}`);

    for (const coverage of promotion.targetCoverage) {
      console.log(`# ${coverage.target}: ${coverage.artifactCount} artifact(s), arches: ${coverage.arches.join(", ") || "none"}`);
    }

    if (promotion.issues.length > 0) {
      for (const issue of promotion.issues) {
        console.error(`${issue.severity}: ${issue.code}: ${issue.detail}`);
      }
    } else {
      console.log("# Promotion checks passed");
    }
  }

  if (!promotion.ready) {
    process.exitCode = 1;
  }
} else if (scan.selectedArtifacts.length === 0) {
  console.error(`No signed Tauri updater artifacts were found in ${bundleDir}.`);
  console.error("Run a signed Tauri build with createUpdaterArtifacts enabled, then run this script again.");
  process.exitCode = 1;
} else if (hasFlag("json")) {
  console.log(JSON.stringify(createDesktopReleaseManifestPayload(scan, metadata), null, 2));
} else {
  console.log("# Essence Spline desktop updater environment");
  console.log(`# Generated from ${bundleDir}`);
  console.log(`# Unsigned artifacts skipped: ${scan.unsignedArtifacts.length}`);

  for (const [key, value] of envRows) {
    console.log(`${key}=${quoteEnvValue(value)}`);
  }
}

if (hasFlag("fail-on-unsigned") && scan.unsignedArtifacts.length > 0) {
  process.exitCode = 1;
}
