import { getDesktopReleaseEnvRows, type DesktopReleaseArtifact, type DesktopReleaseManifestMetadata, type DesktopReleaseScanResult, type DesktopReleaseTarget } from "./desktop-release-artifacts";
import { createDesktopReleasePromotionReport, type DesktopReleasePromotionChannel, type DesktopReleasePromotionReport } from "./desktop-release-promotion";

export interface ReleaseOperationsDashboardOptions {
  channels?: DesktopReleasePromotionChannel[];
  currentVersions?: Partial<Record<DesktopReleasePromotionChannel, string | null>>;
  metadata: DesktopReleaseManifestMetadata;
  scan: DesktopReleaseScanResult;
}

export interface ReleaseOperationsChannelRow {
  artifactCount: number;
  channel: DesktopReleasePromotionChannel;
  issueCount: number;
  ready: boolean;
  report: DesktopReleasePromotionReport;
  status: "blocked" | "ready";
  version: string;
}

export interface ReleaseOperationsTargetRow {
  arches: string[];
  artifactCount: number;
  missing: boolean;
  target: DesktopReleaseTarget;
}

export interface ReleaseOperationsArtifactRow {
  arch: string;
  path: string;
  priority: number;
  signed: boolean;
  target: DesktopReleaseTarget;
  url: string;
}

export interface ReleaseOperationsDashboard {
  artifactRows: ReleaseOperationsArtifactRow[];
  blockedChannelCount: number;
  bundleDir: string;
  channelRows: ReleaseOperationsChannelRow[];
  envRows: Array<{ key: string; value: string }>;
  generatedAt: string;
  metadata: DesktopReleaseManifestMetadata;
  readyChannelCount: number;
  selectedArtifactCount: number;
  targetRows: ReleaseOperationsTargetRow[];
  unsignedArtifactCount: number;
}

const defaultChannels: DesktopReleasePromotionChannel[] = ["stable", "beta", "nightly"];
const requiredTargets: DesktopReleaseTarget[] = ["windows", "darwin", "linux"];

function toArtifactRow(artifact: DesktopReleaseArtifact): ReleaseOperationsArtifactRow {
  return {
    arch: artifact.arch,
    path: artifact.relativePath,
    priority: artifact.priority,
    signed: Boolean(artifact.signature),
    target: artifact.target,
    url: artifact.url,
  };
}

function createTargetRows(scan: DesktopReleaseScanResult): ReleaseOperationsTargetRow[] {
  return requiredTargets.map((target) => {
    const artifacts = scan.selectedArtifacts.filter((artifact) => artifact.target === target);

    return {
      arches: [...new Set(artifacts.map((artifact) => artifact.arch))].sort(),
      artifactCount: artifacts.length,
      missing: artifacts.length === 0,
      target,
    };
  });
}

export function createReleaseOperationsDashboard(options: ReleaseOperationsDashboardOptions): ReleaseOperationsDashboard {
  const channels = options.channels ?? defaultChannels;
  const channelRows = channels.map((channel) => {
    const report = createDesktopReleasePromotionReport(options.scan, options.metadata, {
      channel,
      currentVersion: options.currentVersions?.[channel] ?? null,
      requiredTargets,
    });

    return {
      artifactCount: report.artifactCount,
      channel,
      issueCount: report.issueCount,
      ready: report.ready,
      report,
      status: report.ready ? "ready" : "blocked",
      version: report.version,
    } satisfies ReleaseOperationsChannelRow;
  });

  const artifactRows = options.scan.artifactCandidates.map(toArtifactRow).sort((left, right) => Number(right.signed) - Number(left.signed) || right.priority - left.priority || left.path.localeCompare(right.path));
  const envRows = getDesktopReleaseEnvRows(options.scan.selectedArtifacts, options.metadata).map(([key, value]) => ({ key, value }));

  return {
    artifactRows,
    blockedChannelCount: channelRows.filter((row) => !row.ready).length,
    bundleDir: options.scan.bundleDir,
    channelRows,
    envRows,
    generatedAt: new Date().toISOString(),
    metadata: options.metadata,
    readyChannelCount: channelRows.filter((row) => row.ready).length,
    selectedArtifactCount: options.scan.selectedArtifacts.length,
    targetRows: createTargetRows(options.scan),
    unsignedArtifactCount: options.scan.unsignedArtifacts.length,
  };
}
