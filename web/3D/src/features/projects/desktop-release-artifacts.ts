import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join, relative } from "node:path";
import { getDesktopUpdatePlatformEnvKey } from "@/lib/desktop-update-env";

export type DesktopReleaseTarget = "darwin" | "linux" | "windows";

export interface DesktopReleaseArtifact {
  arch: string;
  path: string;
  priority: number;
  relativePath: string;
  signature: string;
  target: DesktopReleaseTarget;
  url: string;
}

export interface DesktopReleaseScanOptions {
  baseUrl: string;
  bundleDir: string;
  requiredTargets?: DesktopReleaseTarget[];
}

export interface DesktopReleaseScanResult {
  artifactCandidates: DesktopReleaseArtifact[];
  bundleDir: string;
  missingTargets: DesktopReleaseTarget[];
  ready: boolean;
  selectedArtifacts: DesktopReleaseArtifact[];
  signedArtifacts: DesktopReleaseArtifact[];
  unsignedArtifacts: DesktopReleaseArtifact[];
}

export interface DesktopReleaseManifestMetadata {
  notes: string;
  pubDate: string;
  version: string;
}

function walkFiles(directory: string): string[] {
  if (!existsSync(directory)) {
    return [];
  }

  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      return walkFiles(entryPath);
    }

    return statSync(entryPath).isFile() ? [entryPath] : [];
  });
}

export function isDesktopReleaseArtifact(filePath: string) {
  const fileName = basename(filePath).toLowerCase();

  return (
    fileName.endsWith(".app.tar.gz") ||
    fileName.endsWith(".appimage") ||
    fileName.endsWith(".deb") ||
    fileName.endsWith(".dmg") ||
    fileName.endsWith(".exe") ||
    fileName.endsWith(".msi") ||
    fileName.endsWith(".rpm")
  );
}

export function inferDesktopReleaseTarget(filePath: string): DesktopReleaseTarget | null {
  const value = filePath.toLowerCase();

  if (value.includes("nsis") || value.includes("msi") || value.endsWith(".exe") || value.endsWith(".msi")) {
    return "windows";
  }

  if (value.includes("macos") || value.includes("darwin") || value.endsWith(".dmg") || value.endsWith(".app.tar.gz")) {
    return "darwin";
  }

  if (value.includes("linux") || value.endsWith(".appimage") || value.endsWith(".deb") || value.endsWith(".rpm")) {
    return "linux";
  }

  return null;
}

export function inferDesktopReleaseArch(filePath: string) {
  const value = filePath.toLowerCase();

  if (value.includes("aarch64") || value.includes("arm64")) {
    return "aarch64";
  }

  if (value.includes("i686") || value.includes("ia32") || /\bx86\b/.test(value)) {
    return "i686";
  }

  return "x86_64";
}

function readSignature(filePath: string) {
  const signaturePath = `${filePath}.sig`;

  if (!existsSync(signaturePath)) {
    return "";
  }

  return readFileSync(signaturePath, "utf8").trim();
}

export function getDesktopReleaseArtifactPriority(artifact: Pick<DesktopReleaseArtifact, "path" | "target">) {
  const fileName = basename(artifact.path).toLowerCase();

  if (artifact.target === "darwin") {
    return fileName.endsWith(".app.tar.gz") ? 50 : 20;
  }

  if (artifact.target === "windows") {
    return fileName.endsWith(".exe") ? 50 : 35;
  }

  if (fileName.endsWith(".appimage")) {
    return 50;
  }

  if (fileName.endsWith(".deb")) {
    return 35;
  }

  return 20;
}

function toUrlPath(filePath: string) {
  return filePath.split(/[/\\]+/).map(encodeURIComponent).join("/");
}

function selectPreferredSignedArtifacts(signedArtifacts: DesktopReleaseArtifact[]) {
  return [...signedArtifacts]
    .sort((left, right) => right.priority - left.priority)
    .reduce<Map<string, DesktopReleaseArtifact>>((selected, artifact) => {
      const platformKey = `${artifact.target}:${artifact.arch}`;

      if (!selected.has(platformKey)) {
        selected.set(platformKey, artifact);
      }

      return selected;
    }, new Map());
}

export function scanDesktopReleaseArtifacts(options: DesktopReleaseScanOptions): DesktopReleaseScanResult {
  const baseUrl = options.baseUrl.replace(/\/+$/, "");
  const requiredTargets = options.requiredTargets ?? [];
  const artifactCandidates = walkFiles(options.bundleDir)
    .filter(isDesktopReleaseArtifact)
    .map((filePath) => {
      const target = inferDesktopReleaseTarget(filePath);

      if (!target) {
        return null;
      }

      const relativePath = relative(options.bundleDir, filePath);
      const signature = readSignature(filePath);
      const artifact = {
        arch: inferDesktopReleaseArch(filePath),
        path: filePath,
        relativePath,
        signature,
        target,
        url: `${baseUrl}/${toUrlPath(relativePath)}`,
      };

      return {
        ...artifact,
        priority: getDesktopReleaseArtifactPriority(artifact),
      };
    })
    .filter((artifact): artifact is DesktopReleaseArtifact => Boolean(artifact));
  const signedArtifacts = artifactCandidates.filter((artifact) => artifact.signature);
  const unsignedArtifacts = artifactCandidates.filter((artifact) => !artifact.signature);
  const selectedArtifacts = [...selectPreferredSignedArtifacts(signedArtifacts).values()];
  const missingTargets = requiredTargets.filter((target) => !selectedArtifacts.some((artifact) => artifact.target === target));

  return {
    artifactCandidates,
    bundleDir: options.bundleDir,
    missingTargets,
    ready: selectedArtifacts.length > 0 && unsignedArtifacts.length === 0 && missingTargets.length === 0,
    selectedArtifacts,
    signedArtifacts,
    unsignedArtifacts,
  };
}

export function getDesktopReleaseEnvRows(artifacts: DesktopReleaseArtifact[], metadata: DesktopReleaseManifestMetadata) {
  return [
    ["DESKTOP_UPDATE_VERSION", metadata.version],
    ["DESKTOP_UPDATE_NOTES", metadata.notes],
    ["DESKTOP_UPDATE_PUB_DATE", metadata.pubDate],
    ...artifacts.flatMap((artifact) => [
      [getDesktopUpdatePlatformEnvKey("DESKTOP_UPDATE_URL", artifact.target, artifact.arch), artifact.url],
      [getDesktopUpdatePlatformEnvKey("DESKTOP_UPDATE_SIGNATURE", artifact.target, artifact.arch), artifact.signature],
    ]),
  ];
}

export function createDesktopReleaseManifestPayload(scan: DesktopReleaseScanResult, metadata: DesktopReleaseManifestMetadata) {
  const envRows = getDesktopReleaseEnvRows(scan.selectedArtifacts, metadata);

  return {
    artifacts: scan.selectedArtifacts.map((artifact) => ({
      arch: artifact.arch,
      path: artifact.relativePath,
      signatureEnv: getDesktopUpdatePlatformEnvKey("DESKTOP_UPDATE_SIGNATURE", artifact.target, artifact.arch),
      target: artifact.target,
      url: artifact.url,
      urlEnv: getDesktopUpdatePlatformEnvKey("DESKTOP_UPDATE_URL", artifact.target, artifact.arch),
    })),
    bundleDir: scan.bundleDir,
    env: Object.fromEntries(envRows),
    missingTargets: scan.missingTargets,
    pubDate: metadata.pubDate,
    unsignedArtifacts: scan.unsignedArtifacts.map((artifact) => ({
      arch: artifact.arch,
      path: artifact.relativePath,
      target: artifact.target,
    })),
    version: metadata.version,
  };
}
