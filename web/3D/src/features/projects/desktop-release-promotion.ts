import type { DesktopReleaseManifestMetadata, DesktopReleaseScanResult, DesktopReleaseTarget } from "./desktop-release-artifacts";

export type DesktopReleasePromotionChannel = "beta" | "nightly" | "stable";
export type DesktopReleasePromotionSeverity = "error" | "warning";

export interface DesktopReleasePromotionIssue {
  code: string;
  detail: string;
  severity: DesktopReleasePromotionSeverity;
}

export interface DesktopReleasePromotionTargetCoverage {
  arches: string[];
  artifactCount: number;
  target: DesktopReleaseTarget;
}

export interface DesktopReleasePromotionOptions {
  channel: DesktopReleasePromotionChannel;
  currentVersion?: string | null;
  requireHttps?: boolean;
  requiredTargets?: DesktopReleaseTarget[];
}

export interface DesktopReleasePromotionReport {
  artifactCount: number;
  channel: DesktopReleasePromotionChannel;
  issueCount: number;
  issues: DesktopReleasePromotionIssue[];
  ready: boolean;
  targetCoverage: DesktopReleasePromotionTargetCoverage[];
  version: string;
}

const defaultRequiredTargets: DesktopReleaseTarget[] = ["windows", "darwin", "linux"];

function pushIssue(issues: DesktopReleasePromotionIssue[], code: string, detail: string, severity: DesktopReleasePromotionSeverity = "error") {
  issues.push({ code, detail, severity });
}

function parseVersion(value: string) {
  const normalized = value.replace(/^v/i, "").split(/[+-]/)[0];
  const parts = normalized.split(".").map((part) => Number.parseInt(part, 10));

  if (parts.length < 3 || parts.some((part) => !Number.isFinite(part) || part < 0)) {
    return null;
  }

  return parts.slice(0, 3);
}

function isNewerVersion(candidate: string, current: string) {
  const next = parseVersion(candidate);
  const active = parseVersion(current);

  if (!next || !active) {
    return false;
  }

  for (let index = 0; index < 3; index += 1) {
    if (next[index] > active[index]) {
      return true;
    }

    if (next[index] < active[index]) {
      return false;
    }
  }

  return false;
}

function getTargetCoverage(scan: DesktopReleaseScanResult, requiredTargets: DesktopReleaseTarget[]): DesktopReleasePromotionTargetCoverage[] {
  return requiredTargets.map((target) => {
    const artifacts = scan.selectedArtifacts.filter((artifact) => artifact.target === target);

    return {
      arches: [...new Set(artifacts.map((artifact) => artifact.arch))].sort(),
      artifactCount: artifacts.length,
      target,
    };
  });
}

function hasValidPubDate(value: string) {
  const parsed = Date.parse(value);

  return Number.isFinite(parsed);
}

export function createDesktopReleasePromotionReport(scan: DesktopReleaseScanResult, metadata: DesktopReleaseManifestMetadata, options: DesktopReleasePromotionOptions): DesktopReleasePromotionReport {
  const issues: DesktopReleasePromotionIssue[] = [];
  const requiredTargets = options.requiredTargets ?? defaultRequiredTargets;
  const requireHttps = options.requireHttps ?? options.channel === "stable";
  const version = metadata.version.trim();
  const targetCoverage = getTargetCoverage(scan, requiredTargets);

  if (!parseVersion(version)) {
    pushIssue(issues, "invalid-version", "Desktop update version must be a three-part semantic version such as 1.2.3.");
  }

  if (options.currentVersion?.trim() && !isNewerVersion(version, options.currentVersion.trim())) {
    pushIssue(issues, "version-not-newer", `Desktop update version ${version} must be newer than the current ${options.currentVersion.trim()} ${options.channel} release.`);
  }

  if (!metadata.notes.trim()) {
    pushIssue(issues, "missing-release-notes", "Release notes are required before promoting a desktop update.");
  }

  if (!hasValidPubDate(metadata.pubDate)) {
    pushIssue(issues, "invalid-pub-date", "Release pubDate must be a valid date string.");
  }

  if (scan.selectedArtifacts.length === 0) {
    pushIssue(issues, "missing-signed-artifacts", "No signed updater artifacts were selected for promotion.");
  }

  for (const target of requiredTargets) {
    if (!scan.selectedArtifacts.some((artifact) => artifact.target === target)) {
      pushIssue(issues, "missing-target", `Missing signed ${target} artifact for ${options.channel} promotion.`);
    }
  }

  if (scan.unsignedArtifacts.length > 0) {
    pushIssue(issues, "unsigned-artifacts", `${scan.unsignedArtifacts.length} desktop artifact${scan.unsignedArtifacts.length === 1 ? " is" : "s are"} missing updater signatures.`);
  }

  for (const artifact of scan.selectedArtifacts) {
    if (!artifact.signature.trim()) {
      pushIssue(issues, "missing-signature", `${artifact.relativePath} is missing an updater signature.`);
    }

    if (requireHttps && !artifact.url.startsWith("https://")) {
      pushIssue(issues, "insecure-artifact-url", `${artifact.relativePath} must use an HTTPS artifact URL for ${options.channel} promotion.`);
    }
  }

  if (scan.missingTargets.length > 0) {
    for (const target of scan.missingTargets) {
      pushIssue(issues, "scan-missing-target", `Artifact scan reported missing ${target} coverage.`);
    }
  }

  return {
    artifactCount: scan.selectedArtifacts.length,
    channel: options.channel,
    issueCount: issues.length,
    issues,
    ready: issues.every((issue) => issue.severity !== "error"),
    targetCoverage,
    version,
  };
}
