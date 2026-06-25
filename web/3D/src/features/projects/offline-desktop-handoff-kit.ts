import { createHash } from "node:crypto";
import { createDesktopReleaseManifestPayload, type DesktopReleaseManifestMetadata, type DesktopReleaseScanResult } from "@/features/projects/desktop-release-artifacts";
import type { ProjectAppPackageCertificateReport } from "@/features/projects/app-package-certificates";
import type { ProjectCadConversionQueueReport } from "@/features/projects/cad-conversion-worker";
import { desktopSigningChecklistMarkdown, desktopSigningEnvExample, type DesktopSigningPlan } from "@/features/projects/desktop-signing-workflow";
import type { ReleaseOperationsDashboard } from "@/features/projects/release-operations-dashboard";
import type { WorkspaceRole } from "@/features/workspaces/types";

export type OfflineDesktopHandoffKitFileKind =
  | "app-package-readiness"
  | "cad-worker-outputs"
  | "manifest"
  | "release-operations"
  | "signer-checklist"
  | "signing-env"
  | "signing-plan"
  | "updater-env"
  | "updater-manifest";

export interface OfflineDesktopHandoffKitFile {
  body: string;
  byteSize: number;
  contentHash: string;
  kind: OfflineDesktopHandoffKitFileKind;
  label: string;
  mimeType: "application/json;charset=utf-8" | "text/markdown;charset=utf-8" | "text/plain;charset=utf-8";
  path: string;
}

export interface OfflineDesktopHandoffKitSummary {
  appPackageBlockedCount: number;
  cadUnresolvedCount: number;
  contentHash: string;
  desktopBlockedChannelCount: number;
  fileCount: number;
  generatedAt: string;
  handoffScore: number;
  releaseBlockerCount: number;
  selectedDesktopArtifactCount: number;
  signingMissingSecretCount: number;
  signingReadyPlatformCount: number;
  totalByteSize: number;
  unsignedDesktopArtifactCount: number;
}

export interface OfflineDesktopHandoffKit {
  files: OfflineDesktopHandoffKitFile[];
  schemaVersion: 1;
  summary: OfflineDesktopHandoffKitSummary;
  workspace: {
    id: string;
    name: string;
    role: WorkspaceRole;
  };
}

export interface CreateOfflineDesktopHandoffKitInput {
  appPackageCertificateReport: ProjectAppPackageCertificateReport;
  cadConversionQueueReport: ProjectCadConversionQueueReport;
  generatedAt?: string;
  metadata: DesktopReleaseManifestMetadata;
  releaseOperationsDashboard: ReleaseOperationsDashboard;
  scan: DesktopReleaseScanResult;
  signingPlan: DesktopSigningPlan;
  workspace: {
    id: string;
    name: string;
    role: WorkspaceRole;
  };
}

function byteSize(value: string) {
  return new TextEncoder().encode(value).length;
}

function contentHash(value: string) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function stableJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function envRowsToText(rows: Array<{ key: string; value: string }>) {
  return rows.map((row) => `${row.key}=${row.value}`).join("\n");
}

function file(input: {
  body: string;
  kind: OfflineDesktopHandoffKitFileKind;
  label: string;
  mimeType: OfflineDesktopHandoffKitFile["mimeType"];
  path: string;
}): OfflineDesktopHandoffKitFile {
  return {
    ...input,
    byteSize: byteSize(input.body),
    contentHash: contentHash(input.body),
  };
}

function cadUnresolvedCount(report: ProjectCadConversionQueueReport) {
  return report.summary.failedCount + report.summary.queuedCount + report.summary.retryableCount + report.summary.runningCount;
}

function handoffScore(input: {
  appPackageBlockedCount: number;
  cadUnresolvedCount: number;
  desktopBlockedChannelCount: number;
  signingMissingSecretCount: number;
  unsignedDesktopArtifactCount: number;
}) {
  const penalty =
    input.desktopBlockedChannelCount * 12 +
    input.unsignedDesktopArtifactCount * 9 +
    input.signingMissingSecretCount * 4 +
    input.appPackageBlockedCount * 7 +
    input.cadUnresolvedCount * 5;

  return Math.max(0, Math.min(100, 100 - penalty));
}

function createKitManifest(input: CreateOfflineDesktopHandoffKitInput, summary: Omit<OfflineDesktopHandoffKitSummary, "contentHash" | "fileCount" | "totalByteSize">) {
  return {
    appPackageReadiness: input.appPackageCertificateReport.summary,
    cadWorkerOutputs: input.cadConversionQueueReport.summary,
    desktopRelease: {
      artifactRows: input.releaseOperationsDashboard.artifactRows.length,
      blockedChannelCount: input.releaseOperationsDashboard.blockedChannelCount,
      selectedArtifactCount: input.releaseOperationsDashboard.selectedArtifactCount,
      unsignedArtifactCount: input.releaseOperationsDashboard.unsignedArtifactCount,
    },
    generatedAt: summary.generatedAt,
    schemaVersion: 1,
    signing: {
      missingRequiredSecrets: input.signingPlan.missingRequiredSecrets,
      ready: input.signingPlan.ready,
      readyPlatformCount: summary.signingReadyPlatformCount,
      totalPlatformCount: input.signingPlan.platforms.length,
    },
    summary,
    workspace: input.workspace,
  };
}

export function createOfflineDesktopHandoffKitPreview(input: CreateOfflineDesktopHandoffKitInput): OfflineDesktopHandoffKitSummary {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const appPackageBlockedCount = input.appPackageCertificateReport.summary.blockedCount;
  const unresolvedCadCount = cadUnresolvedCount(input.cadConversionQueueReport);
  const signingReadyPlatformCount = input.signingPlan.platforms.filter((platform) => platform.ready).length;
  const unsignedDesktopArtifactCount = input.releaseOperationsDashboard.unsignedArtifactCount;
  const desktopBlockedChannelCount = input.releaseOperationsDashboard.blockedChannelCount;
  const signingMissingSecretCount = input.signingPlan.missingRequiredSecrets.length;
  const releaseBlockerCount =
    desktopBlockedChannelCount + unsignedDesktopArtifactCount + appPackageBlockedCount + unresolvedCadCount + (signingMissingSecretCount > 0 ? 1 : 0);
  const score = handoffScore({
    appPackageBlockedCount,
    cadUnresolvedCount: unresolvedCadCount,
    desktopBlockedChannelCount,
    signingMissingSecretCount,
    unsignedDesktopArtifactCount,
  });

  return {
    appPackageBlockedCount,
    cadUnresolvedCount: unresolvedCadCount,
    contentHash: "",
    desktopBlockedChannelCount,
    fileCount: 0,
    generatedAt,
    handoffScore: score,
    releaseBlockerCount,
    selectedDesktopArtifactCount: input.releaseOperationsDashboard.selectedArtifactCount,
    signingMissingSecretCount,
    signingReadyPlatformCount,
    totalByteSize: 0,
    unsignedDesktopArtifactCount,
  };
}

export function createOfflineDesktopHandoffKit(input: CreateOfflineDesktopHandoffKitInput): OfflineDesktopHandoffKit {
  const preview = createOfflineDesktopHandoffKitPreview(input);
  const updaterManifest = createDesktopReleaseManifestPayload(input.scan, input.metadata);
  const manifest = createKitManifest(input, {
    appPackageBlockedCount: preview.appPackageBlockedCount,
    cadUnresolvedCount: preview.cadUnresolvedCount,
    desktopBlockedChannelCount: preview.desktopBlockedChannelCount,
    generatedAt: preview.generatedAt,
    handoffScore: preview.handoffScore,
    releaseBlockerCount: preview.releaseBlockerCount,
    selectedDesktopArtifactCount: preview.selectedDesktopArtifactCount,
    signingMissingSecretCount: preview.signingMissingSecretCount,
    signingReadyPlatformCount: preview.signingReadyPlatformCount,
    unsignedDesktopArtifactCount: preview.unsignedDesktopArtifactCount,
  });
  const files = [
    file({
      body: stableJson(manifest),
      kind: "manifest",
      label: "Offline desktop handoff manifest",
      mimeType: "application/json;charset=utf-8",
      path: "desktop-handoff/manifest.json",
    }),
    file({
      body: stableJson(updaterManifest),
      kind: "updater-manifest",
      label: "Tauri updater manifest payload",
      mimeType: "application/json;charset=utf-8",
      path: "desktop-handoff/tauri-updater-manifest.json",
    }),
    file({
      body: stableJson(Object.fromEntries(input.releaseOperationsDashboard.envRows.map((row) => [row.key, row.value]))),
      kind: "updater-env",
      label: "Updater environment JSON",
      mimeType: "application/json;charset=utf-8",
      path: "desktop-handoff/updater-env.json",
    }),
    file({
      body: envRowsToText(input.releaseOperationsDashboard.envRows),
      kind: "updater-env",
      label: "Updater environment file",
      mimeType: "text/plain;charset=utf-8",
      path: "desktop-handoff/updater-env.env",
    }),
    file({
      body: stableJson(input.signingPlan),
      kind: "signing-plan",
      label: "Desktop signing readiness plan",
      mimeType: "application/json;charset=utf-8",
      path: "desktop-handoff/signing-plan.json",
    }),
    file({
      body: desktopSigningChecklistMarkdown(),
      kind: "signer-checklist",
      label: "Signer checklist",
      mimeType: "text/markdown;charset=utf-8",
      path: "desktop-handoff/signing-checklist.md",
    }),
    file({
      body: desktopSigningEnvExample(),
      kind: "signing-env",
      label: "Signing environment example",
      mimeType: "text/plain;charset=utf-8",
      path: "desktop-handoff/signing-env.example",
    }),
    file({
      body: stableJson(input.appPackageCertificateReport),
      kind: "app-package-readiness",
      label: "App package readiness",
      mimeType: "application/json;charset=utf-8",
      path: "desktop-handoff/app-package-readiness.json",
    }),
    file({
      body: stableJson(input.cadConversionQueueReport),
      kind: "cad-worker-outputs",
      label: "CAD worker outputs",
      mimeType: "application/json;charset=utf-8",
      path: "desktop-handoff/cad-worker-outputs.json",
    }),
    file({
      body: stableJson(input.releaseOperationsDashboard),
      kind: "release-operations",
      label: "Release operations dashboard",
      mimeType: "application/json;charset=utf-8",
      path: "desktop-handoff/release-operations-dashboard.json",
    }),
  ];
  const totalByteSize = files.reduce((total, entry) => total + entry.byteSize, 0);
  const summary: OfflineDesktopHandoffKitSummary = {
    ...preview,
    contentHash: contentHash(files.map((entry) => `${entry.path}:${entry.contentHash}`).join("\n")),
    fileCount: files.length,
    totalByteSize,
  };

  return {
    files,
    schemaVersion: 1,
    summary,
    workspace: input.workspace,
  };
}

function slug(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "workspace"
  );
}

export function createOfflineDesktopHandoffKitFileName(kit: OfflineDesktopHandoffKit) {
  return `offline-desktop-handoff-${slug(kit.workspace.name)}-${slug(kit.workspace.id)}-${kit.summary.generatedAt.slice(0, 10).replaceAll("-", "")}.json`;
}

export function createOfflineDesktopHandoffKitDownload(kit: OfflineDesktopHandoffKit) {
  const body = stableJson(kit);

  return {
    body,
    contentHash: contentHash(body),
    fileName: createOfflineDesktopHandoffKitFileName(kit),
    mimeType: "application/json;charset=utf-8" as const,
  };
}
