import type { DesktopVerificationHistoryEntry } from "@/lib/desktop/desktop-verification-history";
import type { SelfHostedUploadEvidencePacket } from "@/lib/media/self-hosted-upload-history";
import type { SelfHostedUploadProfileReadinessEvidencePacket } from "@/lib/media/self-hosted-upload-profile-readiness";
import { getReleaseScreenshotProof, hasReleaseDeploymentProof, hasReleaseDesktopProof, type ReleaseEvidence } from "@/lib/product/release-evidence";

export type ReleasePacketImportConflictId = "release-url-proof" | "desktop-proof" | "upload-verification-proof" | "profile-readiness-proof";
export type ReleasePacketImportConflictStatus = "same" | "new" | "conflict";

export interface ReleasePacketImportConflictItem {
  id: ReleasePacketImportConflictId;
  label: string;
  status: ReleasePacketImportConflictStatus;
  currentSummary: string;
  incomingSummary: string;
  detail: string;
}

export interface ReleasePacketImportConflictPreview {
  status: "clear" | "conflict";
  sameCount: number;
  newCount: number;
  conflictCount: number;
  items: ReleasePacketImportConflictItem[];
}

export interface ReleasePacketImportConflictInput {
  currentEvidence: ReleaseEvidence;
  incomingEvidence: ReleaseEvidence;
  currentDesktopVerification: DesktopVerificationHistoryEntry | null;
  incomingDesktopVerification: DesktopVerificationHistoryEntry | null;
  currentUploadEvidence: SelfHostedUploadEvidencePacket | null;
  incomingUploadEvidence: SelfHostedUploadEvidencePacket | null;
  currentProfileReadinessEvidence: SelfHostedUploadProfileReadinessEvidencePacket | null;
  incomingProfileReadinessEvidence: SelfHostedUploadProfileReadinessEvidencePacket | null;
}

export function createReleasePacketImportConflictPreview(input: ReleasePacketImportConflictInput): ReleasePacketImportConflictPreview {
  const items: ReleasePacketImportConflictItem[] = [
    compareImportEvidence({
      id: "release-url-proof",
      label: "Release URL proof",
      currentFingerprint: releaseProofFingerprint(input.currentEvidence),
      incomingFingerprint: releaseProofFingerprint(input.incomingEvidence),
      currentSummary: releaseProofSummary(input.currentEvidence),
      incomingSummary: releaseProofSummary(input.incomingEvidence),
      emptyIncomingOverwrites: true,
    }),
    compareImportEvidence({
      id: "desktop-proof",
      label: "Desktop proof",
      currentFingerprint: desktopProofFingerprint(input.currentEvidence, input.currentDesktopVerification),
      incomingFingerprint: desktopProofFingerprint(input.incomingEvidence, input.incomingDesktopVerification),
      currentSummary: desktopProofSummary(input.currentEvidence, input.currentDesktopVerification),
      incomingSummary: desktopProofSummary(input.incomingEvidence, input.incomingDesktopVerification),
      emptyIncomingOverwrites: true,
    }),
    compareImportEvidence({
      id: "upload-verification-proof",
      label: "Upload verification proof",
      currentFingerprint: uploadEvidenceFingerprint(input.currentUploadEvidence),
      incomingFingerprint: uploadEvidenceFingerprint(input.incomingUploadEvidence),
      currentSummary: uploadEvidenceSummary(input.currentUploadEvidence),
      incomingSummary: uploadEvidenceSummary(input.incomingUploadEvidence),
      emptyIncomingOverwrites: false,
    }),
    compareImportEvidence({
      id: "profile-readiness-proof",
      label: "Profile readiness proof",
      currentFingerprint: profileReadinessFingerprint(input.currentProfileReadinessEvidence),
      incomingFingerprint: profileReadinessFingerprint(input.incomingProfileReadinessEvidence),
      currentSummary: profileReadinessSummary(input.currentProfileReadinessEvidence),
      incomingSummary: profileReadinessSummary(input.incomingProfileReadinessEvidence),
      emptyIncomingOverwrites: false,
    }),
  ];
  const sameCount = countItems(items, "same");
  const newCount = countItems(items, "new");
  const conflictCount = countItems(items, "conflict");

  return {
    status: conflictCount > 0 ? "conflict" : "clear",
    sameCount,
    newCount,
    conflictCount,
    items,
  };
}

function compareImportEvidence(input: {
  id: ReleasePacketImportConflictId;
  label: string;
  currentFingerprint: string;
  incomingFingerprint: string;
  currentSummary: string;
  incomingSummary: string;
  emptyIncomingOverwrites: boolean;
}): ReleasePacketImportConflictItem {
  if (!input.incomingFingerprint) {
    const status = input.currentFingerprint && input.emptyIncomingOverwrites ? "conflict" : "same";
    return {
      id: input.id,
      label: input.label,
      status,
      currentSummary: input.currentSummary,
      incomingSummary: input.incomingSummary,
      detail:
        status === "conflict"
          ? "The incoming packet has no matching proof and would replace the current saved proof."
          : "The incoming packet has no matching proof for this section.",
    };
  }

  if (!input.currentFingerprint) {
    return {
      id: input.id,
      label: input.label,
      status: "new",
      currentSummary: input.currentSummary,
      incomingSummary: input.incomingSummary,
      detail: "The incoming packet adds proof that is not saved locally yet.",
    };
  }

  return {
    id: input.id,
    label: input.label,
    status: input.currentFingerprint === input.incomingFingerprint ? "same" : "conflict",
    currentSummary: input.currentSummary,
    incomingSummary: input.incomingSummary,
    detail:
      input.currentFingerprint === input.incomingFingerprint
        ? "The incoming proof matches the saved local proof."
        : "The incoming proof differs from the saved local proof and needs confirmation before import.",
  };
}

function releaseProofFingerprint(evidence: ReleaseEvidence) {
  if (!hasReleaseDeploymentProof(evidence)) return "";
  return [evidence.deploymentUrl, getReleaseScreenshotProof(evidence)].join("|");
}

function releaseProofSummary(evidence: ReleaseEvidence) {
  if (!hasReleaseDeploymentProof(evidence)) return "No deployment URL and screenshot proof";
  return `${evidence.deploymentUrl} / ${getReleaseScreenshotProof(evidence)}`;
}

function desktopProofFingerprint(evidence: ReleaseEvidence, verification: DesktopVerificationHistoryEntry | null) {
  if (verification) return `${verification.id}:${verification.checkedAt}:${verification.status}:${verification.readyCount}:${verification.failedCount}`;
  if (!hasReleaseDesktopProof(evidence)) return "";
  return `${evidence.desktopVerificationId}:${evidence.desktopVerificationCheckedAt}:${evidence.desktopVerificationStepCount}`;
}

function desktopProofSummary(evidence: ReleaseEvidence, verification: DesktopVerificationHistoryEntry | null) {
  if (verification) return `${verification.status} check ${verification.id} from ${formatEvidenceTime(verification.checkedAt)}`;
  if (!hasReleaseDesktopProof(evidence)) return "No desktop proof";
  return `${evidence.desktopVerificationId} from ${formatEvidenceTime(evidence.desktopVerificationCheckedAt ?? 0)}`;
}

function uploadEvidenceFingerprint(evidence: SelfHostedUploadEvidencePacket | null) {
  if (!evidence || evidence.entryCount <= 0) return "";
  return `${evidence.exportedAt}:${evidence.entryCount}:${evidence.verifiedCount}:${evidence.limitedCount}:${evidence.failedCount}`;
}

function uploadEvidenceSummary(evidence: SelfHostedUploadEvidencePacket | null) {
  if (!evidence || evidence.entryCount <= 0) return "No upload verification proof";
  return `${evidence.entryCount} checks / ${evidence.verifiedCount} verified / exported ${formatEvidenceTime(evidence.exportedAt)}`;
}

function profileReadinessFingerprint(evidence: SelfHostedUploadProfileReadinessEvidencePacket | null) {
  if (!evidence || evidence.reportCount <= 0) return "";
  return `${evidence.exportedAt}:${evidence.reportCount}:${evidence.readyCount}:${evidence.limitedCount}:${evidence.failedCount}`;
}

function profileReadinessSummary(evidence: SelfHostedUploadProfileReadinessEvidencePacket | null) {
  if (!evidence || evidence.reportCount <= 0) return "No profile readiness proof";
  return `${evidence.reportCount} checks / ${evidence.readyCount} ready / exported ${formatEvidenceTime(evidence.exportedAt)}`;
}

function countItems(items: ReleasePacketImportConflictItem[], status: ReleasePacketImportConflictStatus) {
  return items.filter((item) => item.status === status).length;
}

function formatEvidenceTime(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "unknown time";
  return new Date(value).toLocaleString();
}
