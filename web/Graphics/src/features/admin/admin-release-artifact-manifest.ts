import { createHash, createHmac } from "node:crypto";
import type { AccessibilityPrivacyReleaseChecklist } from "@/features/admin/admin-accessibility-privacy-release";
import {
  getAccessibilityPrivacyReleaseJson,
  getAccessibilityPrivacyReleaseMarkdown,
} from "@/features/admin/admin-accessibility-privacy-release-export";
import type { AdminOfflineVaultPackage } from "@/features/admin/admin-offline-vault";
import {
  getAdminOfflineVaultJson,
  getAdminOfflineVaultMarkdown,
} from "@/features/admin/admin-offline-vault-export";
import type { AdminReleaseChannelsReport } from "@/features/admin/admin-release-channels";
import {
  getAdminReleaseChannelsJson,
  getAdminReleaseChannelsMarkdown,
} from "@/features/admin/admin-release-channels-export";
import type { AdminSelfHostedBackupReadinessReport } from "@/features/admin/admin-self-hosted-backup-readiness";
import { getAdminSelfHostedBackupReadinessMarkdown } from "@/features/admin/admin-self-hosted-backup-readiness-export";
import type { AdminSupportBundle } from "@/features/admin/admin-support-bundle";
import {
  getAdminSupportBundleJson,
  getAdminSupportBundleMarkdown,
} from "@/features/admin/admin-support-bundle-export";
import type { ProductionDeploySmokeReport } from "@/features/editor/production-deploy-smoke";
import { getProductionDeploySmokeMarkdown } from "@/features/editor/production-deploy-smoke";

export type AdminReleaseArtifactKind =
  | "desktop"
  | "offline-vault"
  | "self-hosted"
  | "support-bundle"
  | "web";

export type AdminReleaseArtifactManifestStatus =
  | "ready"
  | "review"
  | "blocked";

export type AdminReleaseArtifactSignatureStatus =
  | "signed"
  | "unsigned"
  | "verification-only";

export type AdminReleaseArtifact = {
  id: string;
  kind: AdminReleaseArtifactKind;
  label: string;
  fileName: string;
  mediaType: string;
  status: AdminReleaseArtifactManifestStatus;
  score: number;
  required: boolean;
  generatedAt: string;
  byteSize: number;
  checksum: string;
  signature: string | null;
  signatureStatus: AdminReleaseArtifactSignatureStatus;
  sourceStatus: string;
  sourceScore: number;
  detail: string;
  recommendation: string;
};

export type AdminReleaseArtifactManifestRow = {
  id: string;
  status: AdminReleaseArtifactManifestStatus;
  label: string;
  value: string;
  detail: string;
  recommendation: string;
};

export type AdminReleaseArtifactManifestReport = {
  generatedAt: string;
  manifestId: string;
  status: AdminReleaseArtifactManifestStatus;
  score: number;
  artifactCount: number;
  signedArtifactCount: number;
  unsignedArtifactCount: number;
  requiredArtifactCount: number;
  blockedArtifactCount: number;
  totalByteSize: number;
  checksum: string;
  signature: string | null;
  signing: {
    algorithm: "hmac-sha256";
    checksumAlgorithm: "sha256";
    configured: boolean;
    keyId: string;
  };
  artifacts: AdminReleaseArtifact[];
  rows: AdminReleaseArtifactManifestRow[];
};

export type AdminReleaseArtifactManifestInput = {
  accessibilityPrivacyRelease: AccessibilityPrivacyReleaseChecklist;
  env?: Record<string, string | undefined>;
  generatedAt?: string;
  offlineVault: AdminOfflineVaultPackage;
  productionDeploySmoke: ProductionDeploySmokeReport;
  releaseChannels: AdminReleaseChannelsReport;
  selfHostedBackupReadiness: AdminSelfHostedBackupReadinessReport;
  supportBundle: AdminSupportBundle;
};

export function getAdminReleaseArtifactManifestReport({
  accessibilityPrivacyRelease,
  env = {},
  generatedAt = new Date().toISOString(),
  offlineVault,
  productionDeploySmoke,
  releaseChannels,
  selfHostedBackupReadiness,
  supportBundle,
}: AdminReleaseArtifactManifestInput): AdminReleaseArtifactManifestReport {
  const signingKey = env.ESSENCE_RELEASE_SIGNING_KEY?.trim() ?? "";
  const keyId = getSigningKeyId(env, signingKey);
  const signingConfigured = signingKey.length >= 32;
  const artifacts = [
    createArtifact({
      detail:
        "Vercel web package evidence includes release-channel scoring, route smoke expectations, and accessibility/privacy release checks.",
      fileName: "web-release-manifest.json",
      generatedAt,
      id: "web-release-manifest",
      kind: "web",
      label: "Web release manifest",
      payload: {
        accessibilityPrivacyRelease,
        accessibilityPrivacyReleaseJson: getAccessibilityPrivacyReleaseJson(
          accessibilityPrivacyRelease,
        ),
        accessibilityPrivacyReleaseMarkdown:
          getAccessibilityPrivacyReleaseMarkdown(accessibilityPrivacyRelease),
        productionDeploySmoke,
        productionDeploySmokeMarkdown:
          getProductionDeploySmokeMarkdown(productionDeploySmoke),
        releaseChannel: releaseChannels.packages.find(
          (releasePackage) => releasePackage.channel === "web",
        ),
        releaseChannels,
        releaseChannelsJson: getAdminReleaseChannelsJson(releaseChannels),
        releaseChannelsMarkdown: getAdminReleaseChannelsMarkdown(releaseChannels),
      },
      recommendation:
        "Attach this manifest to the production approval after Vercel smoke checks pass.",
      score: getAverageScore([
        releaseChannels.packages.find(
          (releasePackage) => releasePackage.channel === "web",
        )?.score ?? releaseChannels.score,
        productionDeploySmoke.score,
        accessibilityPrivacyRelease.score,
      ]),
      signingConfigured,
      signingKey,
      sourceScore: releaseChannels.score,
      sourceStatus: releaseChannels.status,
      status: getWorstStatus([
        releaseChannels.status,
        productionDeploySmoke.status,
        accessibilityPrivacyRelease.status,
      ]),
    }),
    createArtifact({
      detail:
        "Desktop package evidence covers Tauri bundle readiness, static export handoff, release channels, and desktop operator commands.",
      fileName: "desktop-release-manifest.json",
      generatedAt,
      id: "desktop-release-manifest",
      kind: "desktop",
      label: "Desktop release manifest",
      payload: {
        releaseChannel: releaseChannels.packages.find(
          (releasePackage) => releasePackage.channel === "desktop",
        ),
      },
      recommendation:
        "Keep this manifest with platform installers and signing evidence for the desktop channel.",
      score:
        releaseChannels.packages.find(
          (releasePackage) => releasePackage.channel === "desktop",
        )?.score ?? releaseChannels.score,
      signingConfigured,
      signingKey,
      sourceScore:
        releaseChannels.packages.find(
          (releasePackage) => releasePackage.channel === "desktop",
        )?.score ?? releaseChannels.score,
      sourceStatus:
        releaseChannels.packages.find(
          (releasePackage) => releasePackage.channel === "desktop",
        )?.status ?? releaseChannels.status,
      status:
        releaseChannels.packages.find(
          (releasePackage) => releasePackage.channel === "desktop",
        )?.status ?? releaseChannels.status,
    }),
    createArtifact({
      detail:
        "Self-hosted evidence includes backup readiness, restore commands, route smoke expectations, and release channel package metadata.",
      fileName: "self-hosted-release-manifest.json",
      generatedAt,
      id: "self-hosted-release-manifest",
      kind: "self-hosted",
      label: "Self-hosted release manifest",
      payload: {
        markdown: getAdminSelfHostedBackupReadinessMarkdown(
          selfHostedBackupReadiness,
        ),
        releaseChannel: releaseChannels.packages.find(
          (releasePackage) => releasePackage.channel === "self-hosted",
        ),
        selfHostedBackupReadiness,
      },
      recommendation:
        "Attach this manifest to install and recovery documentation for self-hosted operators.",
      score: getAverageScore([
        selfHostedBackupReadiness.score,
        releaseChannels.packages.find(
          (releasePackage) => releasePackage.channel === "self-hosted",
        )?.score ?? releaseChannels.score,
      ]),
      signingConfigured,
      signingKey,
      sourceScore: selfHostedBackupReadiness.score,
      sourceStatus: selfHostedBackupReadiness.status,
      status: getWorstStatus([
        selfHostedBackupReadiness.status,
        releaseChannels.packages.find(
          (releasePackage) => releasePackage.channel === "self-hosted",
        )?.status ?? releaseChannels.status,
      ]),
    }),
    createArtifact({
      detail:
        "Offline vault evidence includes design files, support evidence, backup snapshots, restore guide, and vault checksum.",
      fileName: `${offlineVault.packageId}.json`,
      generatedAt,
      id: "offline-vault-package",
      kind: "offline-vault",
      label: "Offline vault package",
      payload: {
        json: getAdminOfflineVaultJson(offlineVault),
        markdown: getAdminOfflineVaultMarkdown(offlineVault),
        manifest: offlineVault.manifest,
      },
      recommendation:
        "Store the signed manifest beside the vault JSON before sharing or restoring offline packages.",
      score: offlineVault.manifest.score,
      signingConfigured,
      signingKey,
      sourceScore: offlineVault.manifest.score,
      sourceStatus: offlineVault.manifest.status,
      status: offlineVault.manifest.status,
    }),
    createArtifact({
      detail:
        "Support bundle evidence includes scoped users, files, shares, sessions, notification delivery, audit rows, rollback evidence, and privacy policy.",
      fileName: "support-bundle-manifest.json",
      generatedAt,
      id: "support-bundle-manifest",
      kind: "support-bundle",
      label: "Support bundle manifest",
      payload: {
        json: getAdminSupportBundleJson(supportBundle),
        markdown: getAdminSupportBundleMarkdown(supportBundle),
        supportBundle,
      },
      recommendation:
        "Use a redacted or minimal support bundle before sending signed support evidence outside the workspace.",
      score: supportBundle.score,
      signingConfigured,
      signingKey,
      sourceScore: supportBundle.score,
      sourceStatus: supportBundle.status,
      status: supportBundle.status,
    }),
  ];
  const checksumSeed = stableStringify(
    artifacts.map(({ signature, ...artifact }) => ({
      ...artifact,
      signature: signature ? "[artifact-signature]" : null,
    })),
  );
  const checksum = `sha256-${sha256(checksumSeed)}`;
  const signature = signingConfigured
    ? `hmac-sha256-${hmacSha256(signingKey, checksum)}`
    : null;
  const rows = getManifestRows({ artifacts, signingConfigured, keyId });
  const blockedArtifactCount = artifacts.filter(
    (artifact) => artifact.status === "blocked",
  ).length;
  const unsignedArtifactCount = artifacts.filter(
    (artifact) => artifact.signatureStatus !== "signed",
  ).length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const blockedCount = rows.filter((row) => row.status === "blocked").length;

  return {
    generatedAt,
    manifestId: `release-manifest-${generatedAt.replace(/[^0-9a-z]/gi, "").toLowerCase()}`,
    status: blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready",
    score: Math.max(0, 100 - blockedCount * 20 - reviewCount * 7),
    artifactCount: artifacts.length,
    signedArtifactCount: artifacts.filter(
      (artifact) => artifact.signatureStatus === "signed",
    ).length,
    unsignedArtifactCount,
    requiredArtifactCount: artifacts.filter((artifact) => artifact.required).length,
    blockedArtifactCount,
    totalByteSize: artifacts.reduce(
      (total, artifact) => total + artifact.byteSize,
      0,
    ),
    checksum,
    signature,
    signing: {
      algorithm: "hmac-sha256",
      checksumAlgorithm: "sha256",
      configured: signingConfigured,
      keyId,
    },
    artifacts,
    rows,
  };
}

function createArtifact({
  detail,
  fileName,
  generatedAt,
  id,
  kind,
  label,
  payload,
  recommendation,
  required = true,
  score,
  signingConfigured,
  signingKey,
  sourceScore,
  sourceStatus,
  status,
}: {
  detail: string;
  fileName: string;
  generatedAt: string;
  id: string;
  kind: AdminReleaseArtifactKind;
  label: string;
  payload: unknown;
  recommendation: string;
  required?: boolean;
  score: number;
  signingConfigured: boolean;
  signingKey: string;
  sourceScore: number;
  sourceStatus: string;
  status: AdminReleaseArtifactManifestStatus;
}): AdminReleaseArtifact {
  const serialized = stableStringify(payload);
  const checksum = `sha256-${sha256(serialized)}`;
  const signature = signingConfigured
    ? `hmac-sha256-${hmacSha256(signingKey, `${id}:${checksum}`)}`
    : null;

  return {
    id,
    kind,
    label,
    fileName,
    mediaType: "application/json",
    status,
    score,
    required,
    generatedAt,
    byteSize: new TextEncoder().encode(serialized).length,
    checksum,
    signature,
    signatureStatus: signature ? "signed" : "unsigned",
    sourceStatus,
    sourceScore,
    detail,
    recommendation,
  };
}

function getManifestRows({
  artifacts,
  keyId,
  signingConfigured,
}: {
  artifacts: AdminReleaseArtifact[];
  keyId: string;
  signingConfigured: boolean;
}): AdminReleaseArtifactManifestRow[] {
  const blockedArtifacts = artifacts.filter(
    (artifact) => artifact.status === "blocked",
  );

  return [
    {
      id: "release-manifest-signing-key",
      status: signingConfigured ? "ready" : "review",
      label: "Signing key",
      value: signingConfigured ? keyId : "missing",
      detail: signingConfigured
        ? "Release artifacts and the manifest are signed with the configured HMAC key."
        : "Release artifacts have deterministic checksums, but ESSENCE_RELEASE_SIGNING_KEY is not configured.",
      recommendation:
        "Set ESSENCE_RELEASE_SIGNING_KEY and ESSENCE_RELEASE_SIGNING_KEY_ID before approving signed release artifacts.",
    },
    {
      id: "release-manifest-artifact-coverage",
      status: artifacts.length >= 5 ? "ready" : "blocked",
      label: "Artifact coverage",
      value: `${artifacts.length} artifacts`,
      detail:
        "The manifest covers web, desktop, self-hosted, offline vault, and support bundle exports.",
      recommendation:
        "Keep all release channels in the signed manifest so operators can validate every exported package.",
    },
    {
      id: "release-manifest-blockers",
      status: blockedArtifacts.length > 0 ? "blocked" : "ready",
      label: "Blocked artifacts",
      value: `${blockedArtifacts.length} blocked`,
      detail:
        blockedArtifacts.length > 0
          ? blockedArtifacts
              .map((artifact) => `${artifact.label} is ${artifact.status}`)
              .join("; ")
          : "No signed manifest artifacts are blocked.",
      recommendation:
        "Resolve blocked source reports before publishing the signed release manifest.",
    },
    {
      id: "release-manifest-signature-coverage",
      status: signingConfigured ? "ready" : "review",
      label: "Signature coverage",
      value: `${artifacts.filter((artifact) => artifact.signatureStatus === "signed").length}/${artifacts.length} signed`,
      detail: signingConfigured
        ? "Every artifact checksum is paired with an HMAC signature."
        : "Artifacts are checksum-only until the signing key is configured.",
      recommendation:
        "Archive the signature and checksum with each exported artifact in the release record.",
    },
  ];
}

function getWorstStatus(statuses: AdminReleaseArtifactManifestStatus[]) {
  if (statuses.includes("blocked")) {
    return "blocked";
  }

  return statuses.includes("review") ? "review" : "ready";
}

function getAverageScore(scores: number[]) {
  const validScores = scores.filter((score) => Number.isFinite(score));

  if (validScores.length === 0) {
    return 0;
  }

  return Math.round(
    validScores.reduce((total, score) => total + score, 0) / validScores.length,
  );
}

function getSigningKeyId(
  env: Record<string, string | undefined>,
  signingKey: string,
) {
  const configuredKeyId = env.ESSENCE_RELEASE_SIGNING_KEY_ID?.trim();

  if (configuredKeyId) {
    return configuredKeyId;
  }

  return signingKey ? `sha256-${sha256(signingKey).slice(0, 12)}` : "unconfigured";
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function hmacSha256(secret: string, value: string) {
  return createHmac("sha256", secret).update(value).digest("hex");
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortStable(value));
}

function sortStable(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortStable);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, sortStable(item)]),
    );
  }

  return value;
}
