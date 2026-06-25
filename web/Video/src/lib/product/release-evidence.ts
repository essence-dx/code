import type { ReleaseReadinessReport } from "@/lib/product/release-readiness";
import { hasDesktopLaunchProofEntry } from "@/lib/desktop/desktop-launch-proof";
import {
  normalizeDesktopVerificationHistoryEntry,
  type DesktopVerificationEvidencePacket,
  type DesktopVerificationHistoryEntry,
} from "@/lib/desktop/desktop-verification-history";
import type { SelfHostedUploadEvidencePacket } from "@/lib/media/self-hosted-upload-history";
import type { SelfHostedUploadProfileReadinessEvidencePacket } from "@/lib/media/self-hosted-upload-profile-readiness";

export interface ReleaseEvidence {
  deploymentUrl: string;
  deploymentScreenshotUrl: string;
  deploymentScreenshotArtifact: string;
  desktopLaunchVerified: boolean;
  desktopVerificationId: string;
  desktopVerificationCheckedAt: number | null;
  desktopVerificationStepCount: number;
  updatedAt: number | null;
}

export interface ReleaseEvidencePacketOptions {
  desktopVerification?: DesktopVerificationHistoryEntry | null;
  profileReadinessEvidence?: SelfHostedUploadProfileReadinessEvidencePacket | null;
  uploadEvidence?: SelfHostedUploadEvidencePacket | null;
}

export interface ReleaseEvidencePacket {
  schemaVersion: 1;
  exportedAt: string;
  report: ReleaseReadinessReport;
  evidence: ReleaseEvidence;
  desktopVerification: DesktopVerificationHistoryEntry | null;
  profileReadinessEvidence: SelfHostedUploadProfileReadinessEvidencePacket | null;
  uploadEvidence: SelfHostedUploadEvidencePacket | null;
}

export type ReleaseEvidenceRequirementStatus = "ready" | "missing" | "stale";

export type ReleaseEvidenceRequirementId = "deployment-url" | "deployment-screenshot" | "desktop-proof";

export interface ReleaseEvidenceRequirement {
  id: ReleaseEvidenceRequirementId;
  label: string;
  status: ReleaseEvidenceRequirementStatus;
  detail: string;
}

export interface ReleaseEvidenceSummary {
  score: number;
  status: ReleaseEvidenceRequirementStatus;
  readyCount: number;
  total: number;
  requirements: ReleaseEvidenceRequirement[];
}

const releaseEvidenceStorageKey = "essence.release.evidence.v1";
const releaseEvidenceFreshnessWindowMs = 14 * 24 * 60 * 60 * 1000;

const emptyReleaseEvidence: ReleaseEvidence = {
  deploymentUrl: "",
  deploymentScreenshotUrl: "",
  deploymentScreenshotArtifact: "",
  desktopLaunchVerified: false,
  desktopVerificationId: "",
  desktopVerificationCheckedAt: null,
  desktopVerificationStepCount: 0,
  updatedAt: null,
};

export function loadReleaseEvidence(): ReleaseEvidence {
  if (!hasBrowserStorage()) return emptyReleaseEvidence;

  try {
    return normalizeReleaseEvidence(JSON.parse(window.localStorage.getItem(releaseEvidenceStorageKey) ?? "null"));
  } catch {
    return emptyReleaseEvidence;
  }
}

export function saveReleaseEvidence(nextEvidence: Partial<ReleaseEvidence>): ReleaseEvidence {
  const current = loadReleaseEvidence();
  const next = normalizeReleaseEvidence({
    ...current,
    ...nextEvidence,
    updatedAt: Date.now(),
  });

  if (hasBrowserStorage()) {
    window.localStorage.setItem(releaseEvidenceStorageKey, JSON.stringify(next));
  }

  return next;
}

export function clearReleaseEvidence(): ReleaseEvidence {
  if (hasBrowserStorage()) {
    window.localStorage.removeItem(releaseEvidenceStorageKey);
  }

  return emptyReleaseEvidence;
}

export function isReleaseEvidenceUrl(value: string) {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function isReleaseScreenshotUrl(value: string) {
  return isReleaseEvidenceUrl(value);
}

export function isReleaseScreenshotArtifact(value: string) {
  const artifact = value.trim();
  if (!artifact || artifact.length > 512 || /[\r\n]/.test(artifact)) return false;
  if (!/\.(png|jpe?g|webp)$/i.test(artifact)) return false;

  return /^[a-z]:[\\/]/i.test(artifact) || artifact.startsWith("/") || artifact.startsWith("\\\\");
}

export function isReleaseScreenshotProof(value: string) {
  return isReleaseScreenshotUrl(value) || isReleaseScreenshotArtifact(value);
}

export function getReleaseScreenshotProof(evidence: Pick<ReleaseEvidence, "deploymentScreenshotUrl" | "deploymentScreenshotArtifact">) {
  return evidence.deploymentScreenshotUrl || evidence.deploymentScreenshotArtifact;
}

export function hasReleaseDeploymentProof(evidence: Pick<ReleaseEvidence, "deploymentUrl" | "deploymentScreenshotUrl" | "deploymentScreenshotArtifact">) {
  return isReleaseEvidenceUrl(evidence.deploymentUrl) && isReleaseScreenshotProof(getReleaseScreenshotProof(evidence));
}

export function createReleaseDesktopProof(entry: DesktopVerificationHistoryEntry | null): Partial<ReleaseEvidence> {
  if (!entry || !hasDesktopLaunchProofEntry(entry)) {
    return {
      desktopLaunchVerified: false,
      desktopVerificationId: "",
      desktopVerificationCheckedAt: null,
      desktopVerificationStepCount: 0,
    };
  }

  return {
    desktopLaunchVerified: true,
    desktopVerificationId: entry.id,
    desktopVerificationCheckedAt: entry.checkedAt,
    desktopVerificationStepCount: entry.stepCount,
  };
}

export function hasReleaseDesktopProof(evidence: Pick<ReleaseEvidence, "desktopLaunchVerified" | "desktopVerificationId" | "desktopVerificationCheckedAt">) {
  return Boolean(
    evidence.desktopLaunchVerified &&
      evidence.desktopVerificationId.trim() &&
      typeof evidence.desktopVerificationCheckedAt === "number" &&
      Number.isFinite(evidence.desktopVerificationCheckedAt),
  );
}

export function createReleaseEvidenceSummary(evidence: ReleaseEvidence, now = Date.now()): ReleaseEvidenceSummary {
  const deploymentUrlReady = isReleaseEvidenceUrl(evidence.deploymentUrl);
  const screenshotProof = getReleaseScreenshotProof(evidence);
  const screenshotReady = isReleaseScreenshotProof(screenshotProof);
  const screenshotProofLabel = evidence.deploymentScreenshotUrl ? "URL" : "artifact";
  const desktopProofReady = hasReleaseDesktopProof(evidence);
  const deploymentProofFresh = isFreshEvidenceTimestamp(evidence.updatedAt, now);
  const desktopProofFresh = isFreshEvidenceTimestamp(evidence.desktopVerificationCheckedAt, now);
  const requirements: ReleaseEvidenceRequirement[] = [
    {
      id: "deployment-url",
      label: "Deployment URL",
      status: requirementStatus(deploymentUrlReady, deploymentProofFresh),
      detail: deploymentUrlReady
        ? deploymentProofFresh
          ? "Deployed app URL is saved for the current release window."
          : "Deployed app URL exists but should be refreshed for this release."
        : "Save the deployed app URL after release deployment.",
    },
    {
      id: "deployment-screenshot",
      label: "Screenshot proof",
      status: requirementStatus(screenshotReady, deploymentProofFresh),
      detail: screenshotReady
        ? deploymentProofFresh
          ? `Deployed screenshot ${screenshotProofLabel} is saved for the current release window.`
          : "Deployed screenshot proof exists but should be refreshed for this release."
        : "Capture and save the deployed UI screenshot URL or screenshot artifact path.",
    },
    {
      id: "desktop-proof",
      label: "Desktop proof",
      status: requirementStatus(desktopProofReady, desktopProofFresh),
      detail: desktopProofReady
        ? desktopProofFresh
          ? "Ready desktop verification evidence is saved for the current release window."
          : "Desktop verification proof exists but should be refreshed for this release."
        : "Import or reuse a ready desktop verification packet.",
    },
  ];
  const readyCount = requirements.filter((requirement) => requirement.status === "ready").length;

  return {
    score: Math.round((readyCount / requirements.length) * 100),
    status: readyCount === requirements.length ? "ready" : "missing",
    readyCount,
    total: requirements.length,
    requirements,
  };
}

export function isReleaseEvidenceRequirementReady(summary: ReleaseEvidenceSummary | null | undefined, id: ReleaseEvidenceRequirementId) {
  return summary?.requirements.find((requirement) => requirement.id === id)?.status === "ready";
}

function requirementStatus(hasProof: boolean, isFresh: boolean): ReleaseEvidenceRequirementStatus {
  if (!hasProof) return "missing";
  return isFresh ? "ready" : "stale";
}

function isFreshEvidenceTimestamp(value: number | null, now: number) {
  return typeof value === "number" && Number.isFinite(value) && value <= now && now - value <= releaseEvidenceFreshnessWindowMs;
}

export function selectReadyDesktopVerificationEntry(value: unknown): DesktopVerificationHistoryEntry | null {
  const entries = readDesktopVerificationEntries(value);

  return entries
    .filter((entry) => hasDesktopLaunchProofEntry(entry))
    .sort((first, second) => second.checkedAt - first.checkedAt)[0] ?? null;
}

export function selectReleaseEvidenceFromPacket(value: unknown): ReleaseEvidence | null {
  const rawEvidence = readReleaseEvidence(value);
  if (!rawEvidence) return null;

  return normalizeReleaseEvidence(rawEvidence);
}

export function selectProfileReadinessEvidenceFromPacket(value: unknown): SelfHostedUploadProfileReadinessEvidencePacket | null {
  if (!value || typeof value !== "object") return null;

  const candidate = value as Partial<ReleaseEvidencePacket>;
  return isProfileReadinessEvidencePacket(candidate.profileReadinessEvidence) ? candidate.profileReadinessEvidence : null;
}

export function selectUploadEvidenceFromPacket(value: unknown): SelfHostedUploadEvidencePacket | null {
  if (!value || typeof value !== "object") return null;

  const candidate = value as Partial<ReleaseEvidencePacket>;
  return isUploadEvidencePacket(candidate.uploadEvidence) ? candidate.uploadEvidence : null;
}

export function downloadReleaseEvidencePacket(
  report: ReleaseReadinessReport,
  evidence: ReleaseEvidence,
  options: ReleaseEvidencePacketOptions = {},
) {
  if (typeof document === "undefined") return;

  const payload = createReleaseEvidencePacketPayload(report, evidence, options);
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `essence-release-evidence-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function createReleaseEvidencePacketPayload(
  report: ReleaseReadinessReport,
  evidence: ReleaseEvidence,
  options: ReleaseEvidencePacketOptions = {},
): ReleaseEvidencePacket {
  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    report,
    evidence,
    desktopVerification: options.desktopVerification ?? null,
    profileReadinessEvidence: options.profileReadinessEvidence ?? null,
    uploadEvidence: options.uploadEvidence ?? null,
  };
}

function readReleaseEvidence(value: unknown): unknown {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<ReleaseEvidencePacket> & Partial<ReleaseEvidence>;

  if (candidate.evidence && typeof candidate.evidence === "object") {
    return candidate.evidence;
  }

  if (
    typeof candidate.deploymentUrl === "string" ||
    typeof candidate.deploymentScreenshotUrl === "string" ||
    typeof candidate.deploymentScreenshotArtifact === "string" ||
    typeof candidate.desktopVerificationId === "string"
  ) {
    return candidate;
  }

  return null;
}

function readDesktopVerificationEntries(value: unknown): DesktopVerificationHistoryEntry[] {
  if (Array.isArray(value)) {
    return value.flatMap(readDesktopVerificationEntries);
  }

  const singleEntry = normalizeDesktopVerificationHistoryEntry(value);
  if (singleEntry) return [singleEntry];

  if (!value || typeof value !== "object") return [];
  const packet = value as Partial<DesktopVerificationEvidencePacket>;
  const releasePacket = value as Partial<ReleaseEvidencePacket>;
  const embeddedDesktopVerification = normalizeDesktopVerificationHistoryEntry(releasePacket.desktopVerification);

  if (embeddedDesktopVerification) return [embeddedDesktopVerification];

  if (!Array.isArray(packet.entries)) return [];

  return packet.entries.flatMap((entry) => {
    const normalized = normalizeDesktopVerificationHistoryEntry(entry);
    return normalized ? [normalized] : [];
  });
}

function isProfileReadinessEvidencePacket(value: unknown): value is SelfHostedUploadProfileReadinessEvidencePacket {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<SelfHostedUploadProfileReadinessEvidencePacket>;
  return (
    candidate.schemaVersion === 1 &&
    typeof candidate.exportedAt === "number" &&
    Number.isFinite(candidate.exportedAt) &&
    typeof candidate.reportCount === "number" &&
    Number.isFinite(candidate.reportCount) &&
    typeof candidate.readyCount === "number" &&
    Number.isFinite(candidate.readyCount) &&
    typeof candidate.limitedCount === "number" &&
    Number.isFinite(candidate.limitedCount) &&
    typeof candidate.failedCount === "number" &&
    Number.isFinite(candidate.failedCount) &&
    Array.isArray(candidate.reports)
  );
}

function isUploadEvidencePacket(value: unknown): value is SelfHostedUploadEvidencePacket {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<SelfHostedUploadEvidencePacket>;
  return (
    candidate.schemaVersion === 1 &&
    typeof candidate.exportedAt === "number" &&
    Number.isFinite(candidate.exportedAt) &&
    typeof candidate.entryCount === "number" &&
    Number.isFinite(candidate.entryCount) &&
    typeof candidate.verifiedCount === "number" &&
    Number.isFinite(candidate.verifiedCount) &&
    typeof candidate.limitedCount === "number" &&
    Number.isFinite(candidate.limitedCount) &&
    typeof candidate.failedCount === "number" &&
    Number.isFinite(candidate.failedCount) &&
    Array.isArray(candidate.entries)
  );
}

function normalizeReleaseEvidence(value: unknown): ReleaseEvidence {
  if (typeof value !== "object" || value === null) return emptyReleaseEvidence;
  const candidate = value as Partial<ReleaseEvidence>;
  const deploymentUrl =
    typeof candidate.deploymentUrl === "string" && isReleaseEvidenceUrl(candidate.deploymentUrl) ? candidate.deploymentUrl.trim() : "";
  const rawScreenshotProof = typeof candidate.deploymentScreenshotUrl === "string" ? candidate.deploymentScreenshotUrl.trim() : "";
  const deploymentScreenshotUrl =
    rawScreenshotProof && isReleaseScreenshotUrl(rawScreenshotProof) ? rawScreenshotProof : "";
  const rawScreenshotArtifact =
    typeof candidate.deploymentScreenshotArtifact === "string" ? candidate.deploymentScreenshotArtifact.trim() : rawScreenshotProof;
  const deploymentScreenshotArtifact =
    !deploymentScreenshotUrl && rawScreenshotArtifact && isReleaseScreenshotArtifact(rawScreenshotArtifact) ? rawScreenshotArtifact : "";
  const desktopVerificationId = typeof candidate.desktopVerificationId === "string" ? candidate.desktopVerificationId.trim() : "";
  const desktopVerificationCheckedAt =
    typeof candidate.desktopVerificationCheckedAt === "number" && Number.isFinite(candidate.desktopVerificationCheckedAt)
      ? candidate.desktopVerificationCheckedAt
      : null;
  const desktopVerificationStepCount =
    typeof candidate.desktopVerificationStepCount === "number" && Number.isFinite(candidate.desktopVerificationStepCount)
      ? Math.max(0, Math.trunc(candidate.desktopVerificationStepCount))
      : 0;

  return {
    deploymentUrl,
    deploymentScreenshotUrl,
    deploymentScreenshotArtifact,
    desktopLaunchVerified: candidate.desktopLaunchVerified === true && Boolean(desktopVerificationId) && desktopVerificationCheckedAt !== null,
    desktopVerificationId,
    desktopVerificationCheckedAt,
    desktopVerificationStepCount,
    updatedAt: typeof candidate.updatedAt === "number" && Number.isFinite(candidate.updatedAt) ? candidate.updatedAt : null,
  };
}

function hasBrowserStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}
