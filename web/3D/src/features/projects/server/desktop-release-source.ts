import { isAbsolute, join, resolve } from "node:path";
import { scanDesktopReleaseArtifacts } from "@/features/projects/desktop-release-artifacts";
import { createReleaseOperationsDashboard } from "@/features/projects/release-operations-dashboard";

export function getDesktopReleaseMetadata() {
  const version = process.env.DESKTOP_UPDATE_VERSION?.trim() || "0.0.0";

  return {
    notes: process.env.DESKTOP_UPDATE_NOTES?.trim() || `Essence Spline ${version}`,
    pubDate: process.env.DESKTOP_UPDATE_PUB_DATE?.trim() || new Date().toISOString(),
    version,
  };
}

export function getDesktopCurrentVersions() {
  return {
    beta: process.env.DESKTOP_BETA_CURRENT_VERSION ?? process.env.DESKTOP_CURRENT_VERSION ?? null,
    nightly: process.env.DESKTOP_NIGHTLY_CURRENT_VERSION ?? process.env.DESKTOP_CURRENT_VERSION ?? null,
    stable: process.env.DESKTOP_STABLE_CURRENT_VERSION ?? process.env.DESKTOP_CURRENT_VERSION ?? null,
  };
}

export function resolveDesktopReleaseBundleDir(configuredBundleDir = process.env.DESKTOP_RELEASE_BUNDLE_DIR) {
  const trimmedBundleDir = configuredBundleDir?.trim();

  if (!trimmedBundleDir) {
    return join(process.cwd(), "src-tauri", "target", "release", "bundle");
  }

  if (isAbsolute(trimmedBundleDir)) {
    return trimmedBundleDir;
  }

  return resolve(/* turbopackIgnore: true */ process.cwd(), trimmedBundleDir);
}

export function createDesktopReleaseOperationsSnapshot(origin: string) {
  const bundleDir = resolveDesktopReleaseBundleDir();
  const baseUrl = process.env.DESKTOP_RELEASE_ARTIFACT_BASE_URL?.trim() || `${origin}/desktop/releases`;
  const scan = scanDesktopReleaseArtifacts({
    baseUrl,
    bundleDir,
    requiredTargets: ["windows", "darwin", "linux"],
  });
  const metadata = getDesktopReleaseMetadata();
  const dashboard = createReleaseOperationsDashboard({
    currentVersions: getDesktopCurrentVersions(),
    metadata,
    scan,
  });

  return {
    dashboard,
    metadata,
    scan,
  };
}
