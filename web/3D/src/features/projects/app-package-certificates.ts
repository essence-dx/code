import { APP_PACKAGE_PRESETS, type AppPackagePresetId } from "@/features/projects/app-package-export";
import type { ProjectArtifactRegistryEntry, ProjectArtifactRegistryReport } from "@/features/projects/project-artifact-registry";

export const appPackageCertificatePlatforms = ["windows", "macos", "linux", "android", "visionos"] as const;

export type ProjectAppPackageCertificatePlatform = (typeof appPackageCertificatePlatforms)[number];
export type ProjectAppPackageCertificateStatus = "expired" | "expiring" | "mismatch" | "missing" | "revoked" | "valid";
export type ProjectAppPackageCertificateMetadata = Record<string, boolean | number | string | null>;

export interface ProjectAppPackageCertificateRecord {
  bundleIdentifier: string | null;
  expiresAt: string;
  fingerprintSha256: string;
  id?: string;
  issuer: string;
  metadata: ProjectAppPackageCertificateMetadata | null;
  platform: ProjectAppPackageCertificatePlatform;
  presetId: AppPackagePresetId | null;
  projectId: string;
  revokedAt: string | null;
  serialNumber: string;
  sourceArtifactId: string | null;
  subject: string;
  teamId: string | null;
  uploadedAt: string;
  validFrom: string;
  verifiedAt: string;
}

export interface ProjectAppPackageCertificateInput {
  bundleIdentifier?: string | null;
  expiresAt: string;
  fingerprintSha256: string;
  issuer: string;
  metadata?: ProjectAppPackageCertificateMetadata | null;
  platform: ProjectAppPackageCertificatePlatform;
  presetId?: AppPackagePresetId | null;
  revokedAt?: string | null;
  serialNumber: string;
  sourceArtifactId?: string | null;
  subject: string;
  teamId?: string | null;
  validFrom: string;
  verifiedAt?: string | null;
}

export interface ProjectAppPackageCertificateBundleRow {
  artifactId: string;
  certificate: ProjectAppPackageCertificateRecord | null;
  expiresAt: string | null;
  issue: string | null;
  label: string;
  platform: ProjectAppPackageCertificatePlatform;
  presetId: AppPackagePresetId;
  presetLabel: string;
  projectId: string;
  projectName: string;
  sourceKey: string;
  sourceVersionId: string;
  status: ProjectAppPackageCertificateStatus;
}

export interface ProjectAppPackageCertificateReport {
  generatedAt: string;
  rows: ProjectAppPackageCertificateBundleRow[];
  summary: {
    blockedCount: number;
    expiredCount: number;
    expiringCount: number;
    missingCount: number;
    mismatchCount: number;
    nativeBundleCount: number;
    readyCount: number;
    revokedCount: number;
    totalRequiredCount: number;
    validCount: number;
  };
}

const appPackagePresetLabels = new Map<AppPackagePresetId, string>(APP_PACKAGE_PRESETS.map((preset) => [preset.id, preset.label]));
const certificateValidityWarningDays = 30;

const presetCertificatePlatformMap: Record<AppPackagePresetId, ProjectAppPackageCertificatePlatform[]> = {
  "android-aab": ["android"],
  "android-apk": ["android"],
  capacitor: [],
  "signed-tauri": ["windows", "macos", "linux"],
  tauri: [],
  "visionos-preview": ["visionos"],
  web: [],
};

function isAppPackagePresetId(value: unknown): value is AppPackagePresetId {
  return typeof value === "string" && APP_PACKAGE_PRESETS.some((preset) => preset.id === value);
}

function toDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function getPresetId(entry: ProjectArtifactRegistryEntry) {
  const presetId = entry.metadata?.presetId;

  return isAppPackagePresetId(presetId) ? presetId : null;
}

function requiredPlatformsForEntry(entry: ProjectArtifactRegistryEntry) {
  const presetId = getPresetId(entry);

  return presetId ? presetCertificatePlatformMap[presetId] : [];
}

function cleanFingerprint(value: string) {
  return value.replace(/[^a-fA-F0-9]/g, "").toUpperCase();
}

export function normalizeCertificateFingerprint(value: string) {
  const cleaned = cleanFingerprint(value);

  if (cleaned.length !== 64) {
    return value.trim().toUpperCase();
  }

  return cleaned.match(/.{1,2}/g)?.join(":") ?? cleaned;
}

export function isValidSha256Fingerprint(value: string) {
  return cleanFingerprint(value).length === 64;
}

export function getAppPackageCertificatePresetLabel(presetId: AppPackagePresetId) {
  return appPackagePresetLabels.get(presetId) ?? presetId;
}

export function getRequiredAppPackageCertificatePlatforms(presetId: AppPackagePresetId) {
  return [...presetCertificatePlatformMap[presetId]];
}

function certificateIssue(input: {
  certificate: ProjectAppPackageCertificateRecord | null;
  now: Date;
  platform: ProjectAppPackageCertificatePlatform;
  presetId: AppPackagePresetId;
}) {
  const certificate = input.certificate;

  if (!certificate) {
    return { issue: "No signing certificate has been ingested for this package/platform.", status: "missing" as const };
  }

  if (certificate.platform !== input.platform) {
    return { issue: "Certificate platform does not match the package platform.", status: "mismatch" as const };
  }

  if (certificate.presetId && certificate.presetId !== input.presetId) {
    return { issue: "Certificate preset does not match the package preset.", status: "mismatch" as const };
  }

  if (!isValidSha256Fingerprint(certificate.fingerprintSha256)) {
    return { issue: "Certificate fingerprint must be a SHA-256 fingerprint.", status: "mismatch" as const };
  }

  const validFrom = toDate(certificate.validFrom);
  const expiresAt = toDate(certificate.expiresAt);
  const revokedAt = toDate(certificate.revokedAt);

  if (!validFrom || !expiresAt) {
    return { issue: "Certificate validity dates are malformed.", status: "mismatch" as const };
  }

  if (validFrom.getTime() > input.now.getTime()) {
    return { issue: "Certificate validity window has not started yet.", status: "mismatch" as const };
  }

  if (revokedAt && revokedAt.getTime() <= input.now.getTime()) {
    return { issue: "Certificate has been revoked.", status: "revoked" as const };
  }

  if (expiresAt.getTime() <= input.now.getTime()) {
    return { issue: "Certificate has expired.", status: "expired" as const };
  }

  const warningCutoff = new Date(input.now.getTime() + certificateValidityWarningDays * 24 * 60 * 60 * 1000);

  if (expiresAt.getTime() <= warningCutoff.getTime()) {
    return { issue: "Certificate expires within 30 days.", status: "expiring" as const };
  }

  return { issue: null, status: "valid" as const };
}

function pickCertificate(input: {
  artifactId: string;
  certificates: ProjectAppPackageCertificateRecord[];
  platform: ProjectAppPackageCertificatePlatform;
  presetId: AppPackagePresetId;
  projectId: string;
}) {
  const candidates = input.certificates.filter(
    (certificate) =>
      certificate.projectId === input.projectId &&
      certificate.platform === input.platform &&
      (!certificate.presetId || certificate.presetId === input.presetId),
  );

  return (
    candidates.find((certificate) => certificate.sourceArtifactId === input.artifactId) ??
    candidates.find((certificate) => certificate.presetId === input.presetId) ??
    candidates[0] ??
    null
  );
}

function summarizeRows(rows: ProjectAppPackageCertificateBundleRow[]): ProjectAppPackageCertificateReport["summary"] {
  const missingCount = rows.filter((row) => row.status === "missing").length;
  const expiredCount = rows.filter((row) => row.status === "expired").length;
  const expiringCount = rows.filter((row) => row.status === "expiring").length;
  const mismatchCount = rows.filter((row) => row.status === "mismatch").length;
  const revokedCount = rows.filter((row) => row.status === "revoked").length;
  const validCount = rows.filter((row) => row.status === "valid").length;

  return {
    blockedCount: missingCount + expiredCount + mismatchCount + revokedCount,
    expiredCount,
    expiringCount,
    missingCount,
    mismatchCount,
    nativeBundleCount: new Set(rows.map((row) => row.sourceKey)).size,
    readyCount: validCount + expiringCount,
    revokedCount,
    totalRequiredCount: rows.length,
    validCount,
  };
}

export function createProjectAppPackageCertificateReport(input: {
  artifactRegistryReport: ProjectArtifactRegistryReport;
  certificates: ProjectAppPackageCertificateRecord[];
  generatedAt?: string;
  now?: Date;
}): ProjectAppPackageCertificateReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const now = input.now ?? new Date(generatedAt);
  const signedBundleEntries = input.artifactRegistryReport.entries.filter((entry) => entry.kind === "signed-app-bundle");
  const rows = signedBundleEntries
    .flatMap((entry) => {
      const presetId = getPresetId(entry);

      if (!presetId) {
        return [];
      }

      return requiredPlatformsForEntry(entry).map<ProjectAppPackageCertificateBundleRow>((platform) => {
        const certificate = pickCertificate({
          artifactId: entry.artifactId,
          certificates: input.certificates,
          platform,
          presetId,
          projectId: entry.projectId,
        });
        const state = certificateIssue({ certificate, now, platform, presetId });

        return {
          artifactId: entry.artifactId,
          certificate,
          expiresAt: certificate?.expiresAt ?? null,
          issue: state.issue,
          label: entry.label,
          platform,
          presetId,
          presetLabel: getAppPackageCertificatePresetLabel(presetId),
          projectId: entry.projectId,
          projectName: entry.projectName,
          sourceKey: entry.sourceKey,
          sourceVersionId: entry.sourceVersionId,
          status: state.status,
        };
      });
    })
    .sort((first, second) => first.projectName.localeCompare(second.projectName) || first.presetLabel.localeCompare(second.presetLabel) || first.platform.localeCompare(second.platform));

  return {
    generatedAt,
    rows,
    summary: summarizeRows(rows),
  };
}
