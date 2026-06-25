import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { desktopLaunchProofRequirements } from "../src/lib/desktop/desktop-launch-proof";
import type { DesktopVerificationHistoryEntry } from "../src/lib/desktop/desktop-verification-history";
import type { ProductReadinessReport } from "../src/lib/product/capability-summary";
import { createProductReadinessReport } from "../src/lib/product/capability-summary";
import { productCapabilities } from "../src/lib/product/capability-registry";
import {
  createReleaseDesktopProof,
  createReleaseEvidencePacketPayload,
  createReleaseEvidenceSummary,
  hasReleaseDeploymentProof,
  hasReleaseDesktopProof,
  isReleaseEvidenceRequirementReady,
  isReleaseEvidenceUrl,
  isReleaseScreenshotProof,
  isReleaseScreenshotUrl,
  selectProfileReadinessEvidenceFromPacket,
  selectReleaseEvidenceFromPacket,
  selectReadyDesktopVerificationEntry,
  selectUploadEvidenceFromPacket,
} from "../src/lib/product/release-evidence";
import {
  createReleaseEvidenceHistoryEntry,
  filterReleaseEvidenceHistory,
  releaseEvidenceHistoryLabel,
} from "../src/lib/product/release-evidence-history";
import { createReleaseReadinessReport } from "../src/lib/product/release-readiness";

const currentProductReport = createProductReadinessReport(productCapabilities);
const blockedReport = createReleaseReadinessReport({
  productReport: currentProductReport,
  textAiConfigured: false,
  imageGenerationConfigured: false,
  databaseConfigured: false,
  vercelLinked: false,
  deploymentUrlCaptured: false,
  deploymentScreenshotCaptured: false,
  desktopLaunchVerified: false,
});

assert.equal(blockedReport.status, "blocked");
assert.equal(blockedReport.gates.find((gate) => gate.id === "desktop-launch")?.status, "blocked");
assert.equal(blockedReport.gates.find((gate) => gate.id === "deployment-screenshot")?.status, "blocked");
assert.equal(blockedReport.gates.find((gate) => gate.id === "ai-providers")?.status, "blocked");
assert.match(blockedReport.summary, /blocked/);

const readyReport = createReleaseReadinessReport({
  productReport: fakeReadyProductReport(),
  textAiConfigured: true,
  imageGenerationConfigured: true,
  databaseConfigured: true,
  vercelLinked: true,
  deploymentUrlCaptured: true,
  deploymentScreenshotCaptured: true,
  desktopLaunchVerified: true,
});

assert.equal(readyReport.status, "ready");
assert.equal(readyReport.score, 100);
assert.equal(readyReport.nextGate, null);

const warningReport = createReleaseReadinessReport({
  productReport: fakeReadyProductReport(),
  textAiConfigured: true,
  imageGenerationConfigured: false,
  databaseConfigured: false,
  vercelLinked: true,
  deploymentUrlCaptured: true,
  deploymentScreenshotCaptured: true,
  desktopLaunchVerified: true,
});

assert.equal(warningReport.status, "warning");
assert.equal(warningReport.gates.find((gate) => gate.id === "ai-providers")?.status, "warning");
assert.equal(warningReport.gates.find((gate) => gate.id === "database")?.status, "warning");
assert.equal(isReleaseEvidenceUrl("https://essence-studio.vercel.app"), true);
assert.equal(isReleaseEvidenceUrl("ftp://example.com/release"), false);
assert.equal(isReleaseScreenshotUrl("https://example.com/release.png"), true);
assert.equal(isReleaseScreenshotUrl("javascript:alert(1)"), false);
assert.equal(isReleaseScreenshotProof("G:\\Kapwing\\artifacts\\deployed-home.png"), true);
assert.equal(isReleaseScreenshotProof("not-a-screenshot.txt"), false);
assert.equal(
  hasReleaseDeploymentProof({
    deploymentUrl: "https://essence-studio.vercel.app",
    deploymentScreenshotUrl: "https://example.com/release.png",
    deploymentScreenshotArtifact: "",
  }),
  true,
);
assert.equal(
  hasReleaseDeploymentProof({
    deploymentUrl: "https://essence-studio.vercel.app",
    deploymentScreenshotUrl: "",
    deploymentScreenshotArtifact: "G:\\Kapwing\\artifacts\\deployed-home.png",
  }),
  true,
);
assert.equal(
  hasReleaseDeploymentProof({
    deploymentUrl: "",
    deploymentScreenshotUrl: "https://example.com/release.png",
    deploymentScreenshotArtifact: "",
  }),
  false,
);
assert.equal(
  createReleaseEvidenceSummary({
    deploymentUrl: "https://essence-studio.vercel.app",
    deploymentScreenshotUrl: "https://example.com/release.png",
    deploymentScreenshotArtifact: "",
    desktopLaunchVerified: true,
    desktopVerificationId: "desktop_verification_1",
    desktopVerificationCheckedAt: 1,
    desktopVerificationStepCount: 4,
    updatedAt: 2,
  }, 2).score,
  100,
);
assert.equal(
  createReleaseEvidenceSummary({
    deploymentUrl: "",
    deploymentScreenshotUrl: "https://example.com/release.png",
    deploymentScreenshotArtifact: "",
    desktopLaunchVerified: false,
    desktopVerificationId: "",
    desktopVerificationCheckedAt: null,
    desktopVerificationStepCount: 0,
    updatedAt: null,
  }, 2).requirements.find((requirement) => requirement.id === "deployment-screenshot")?.status,
  "stale",
);
assert.equal(
  createReleaseEvidenceSummary({
    deploymentUrl: "https://essence-studio.vercel.app",
    deploymentScreenshotUrl: "https://example.com/release.png",
    deploymentScreenshotArtifact: "",
    desktopLaunchVerified: true,
    desktopVerificationId: "desktop_verification_1",
    desktopVerificationCheckedAt: 1,
    desktopVerificationStepCount: 4,
    updatedAt: 2,
  }, 2 + 15 * 24 * 60 * 60 * 1000).requirements.find((requirement) => requirement.id === "desktop-proof")?.status,
  "stale",
);
const staleEvidenceSummary = createReleaseEvidenceSummary({
  deploymentUrl: "https://essence-studio.vercel.app",
  deploymentScreenshotUrl: "https://example.com/release.png",
  deploymentScreenshotArtifact: "",
  desktopLaunchVerified: true,
  desktopVerificationId: "desktop_verification_1",
  desktopVerificationCheckedAt: 1,
  desktopVerificationStepCount: 4,
  updatedAt: 2,
}, 2 + 15 * 24 * 60 * 60 * 1000);
const staleEvidenceGateReport = createReleaseReadinessReport({
  productReport: fakeReadyProductReport(),
  textAiConfigured: true,
  imageGenerationConfigured: true,
  databaseConfigured: true,
  vercelLinked: true,
  deploymentUrlCaptured: isReleaseEvidenceRequirementReady(staleEvidenceSummary, "deployment-url"),
  deploymentScreenshotCaptured: isReleaseEvidenceRequirementReady(staleEvidenceSummary, "deployment-screenshot"),
  desktopLaunchVerified: isReleaseEvidenceRequirementReady(staleEvidenceSummary, "desktop-proof"),
});
assert.equal(isReleaseEvidenceRequirementReady(staleEvidenceSummary, "deployment-url"), false);
assert.equal(isReleaseEvidenceRequirementReady(staleEvidenceSummary, "deployment-screenshot"), false);
assert.equal(isReleaseEvidenceRequirementReady(staleEvidenceSummary, "desktop-proof"), false);
assert.equal(staleEvidenceGateReport.status, "blocked");
assert.equal(
  selectReleaseEvidenceFromPacket({
    schemaVersion: 1,
    exportedAt: "2026-05-15T00:00:00.000Z",
    report: {},
    evidence: {
      deploymentUrl: "https://essence-studio.vercel.app",
      deploymentScreenshotUrl: "https://example.com/release.png",
      deploymentScreenshotArtifact: "",
      desktopLaunchVerified: true,
      desktopVerificationId: "desktop_verification_1",
      desktopVerificationCheckedAt: 1,
      desktopVerificationStepCount: 4,
      updatedAt: 2,
    },
    desktopVerification: null,
  })?.deploymentUrl,
  "https://essence-studio.vercel.app",
);
assert.equal(selectReleaseEvidenceFromPacket({ exportedAt: "2026-05-15T00:00:00.000Z" }), null);
const screenshotOnlyReport = createReleaseReadinessReport({
  productReport: fakeReadyProductReport(),
  textAiConfigured: true,
  imageGenerationConfigured: true,
  databaseConfigured: true,
  vercelLinked: true,
  deploymentUrlCaptured: false,
  deploymentScreenshotCaptured: true,
  desktopLaunchVerified: true,
});
assert.equal(screenshotOnlyReport.gates.find((gate) => gate.id === "deployment-screenshot")?.status, "blocked");
assert.match(screenshotOnlyReport.gates.find((gate) => gate.id === "deployment-screenshot")?.detail ?? "", /deployed app URL proof/);
const readyDesktopEntry: DesktopVerificationHistoryEntry = {
  id: "desktop_verification_1",
  checkedAt: 1,
  status: "ready",
  stepCount: desktopLaunchProofRequirements.length,
  readyCount: desktopLaunchProofRequirements.length,
  limitedCount: 0,
  failedCount: 0,
  steps: desktopLaunchProofRequirements.map((requirement) => ({
    id: requirement.id,
    label: requirement.label,
    source: "workflow",
    status: "ready",
    detail: `${requirement.label} checked.`,
  })),
};
const desktopProof = createReleaseDesktopProof(readyDesktopEntry);
assert.equal(desktopProof.desktopLaunchVerified, true);
assert.equal(
  hasReleaseDesktopProof({
    desktopLaunchVerified: desktopProof.desktopLaunchVerified === true,
    desktopVerificationId: desktopProof.desktopVerificationId ?? "",
    desktopVerificationCheckedAt: desktopProof.desktopVerificationCheckedAt ?? null,
  }),
  true,
);
assert.equal(hasReleaseDesktopProof({ desktopLaunchVerified: true, desktopVerificationId: "", desktopVerificationCheckedAt: null }), false);
assert.equal(
  selectReadyDesktopVerificationEntry({
    schemaVersion: 1,
    exportedAt: 2,
    entryCount: 2,
    entries: [
      { ...readyDesktopEntry, id: "desktop_verification_old", checkedAt: 1 },
      { ...readyDesktopEntry, id: "desktop_verification_new", checkedAt: 2 },
    ],
  })?.id,
  "desktop_verification_new",
);
assert.equal(
  selectReadyDesktopVerificationEntry({
    schemaVersion: 1,
    exportedAt: "2026-05-15T00:00:00.000Z",
    report: {},
    evidence: {
      deploymentUrl: "https://essence-studio.vercel.app",
      deploymentScreenshotUrl: "https://example.com/release.png",
      deploymentScreenshotArtifact: "",
      desktopLaunchVerified: false,
      desktopVerificationId: "",
      desktopVerificationCheckedAt: null,
      desktopVerificationStepCount: 0,
      updatedAt: 2,
    },
    desktopVerification: readyDesktopEntry,
  })?.id,
  "desktop_verification_1",
);
assert.equal(
  selectReadyDesktopVerificationEntry({
    schemaVersion: 1,
    exportedAt: 2,
    entryCount: 1,
    entries: [{ ...readyDesktopEntry, status: "limited" }],
  }),
  null,
);
const readyReleaseHistoryEntry = createReleaseEvidenceHistoryEntry(
  createReleaseEvidencePacketPayload(
    readyReport,
    {
      deploymentUrl: "https://essence-studio.vercel.app",
      deploymentScreenshotUrl: "https://example.com/release.png",
      deploymentScreenshotArtifact: "",
      desktopLaunchVerified: true,
      desktopVerificationId: "desktop_verification_1",
      desktopVerificationCheckedAt: 2,
      desktopVerificationStepCount: desktopLaunchProofRequirements.length,
      updatedAt: 2,
    },
    { desktopVerification: readyDesktopEntry },
  ),
  2,
);
const draftReleaseHistoryEntry = createReleaseEvidenceHistoryEntry(
  createReleaseEvidencePacketPayload(blockedReport, {
    deploymentUrl: "",
    deploymentScreenshotUrl: "",
    deploymentScreenshotArtifact: "",
    desktopLaunchVerified: false,
    desktopVerificationId: "",
    desktopVerificationCheckedAt: null,
    desktopVerificationStepCount: 0,
    updatedAt: null,
  }),
  2,
);
const staleReleaseHistoryEntry = createReleaseEvidenceHistoryEntry(
  createReleaseEvidencePacketPayload(readyReport, {
    deploymentUrl: "https://essence-studio.vercel.app",
    deploymentScreenshotUrl: "https://example.com/release.png",
    deploymentScreenshotArtifact: "",
    desktopLaunchVerified: true,
    desktopVerificationId: "desktop_verification_1",
    desktopVerificationCheckedAt: 1,
    desktopVerificationStepCount: desktopLaunchProofRequirements.length,
    updatedAt: 1,
  }),
  2 + 15 * 24 * 60 * 60 * 1000,
);
const releaseHistory = [readyReleaseHistoryEntry, draftReleaseHistoryEntry, staleReleaseHistoryEntry];
assert.equal(releaseEvidenceHistoryLabel(readyReleaseHistoryEntry), "Ready");
assert.equal(releaseEvidenceHistoryLabel(draftReleaseHistoryEntry), "Draft");
assert.equal(releaseEvidenceHistoryLabel(staleReleaseHistoryEntry), "Stale");
assert.equal(filterReleaseEvidenceHistory(releaseHistory, "ready").length, 1);
assert.equal(filterReleaseEvidenceHistory(releaseHistory, "draft").length, 1);
assert.equal(filterReleaseEvidenceHistory(releaseHistory, "stale").length, 1);
assert.equal(
  selectProfileReadinessEvidenceFromPacket({
    schemaVersion: 1,
    exportedAt: "2026-05-15T00:00:00.000Z",
    report: {},
    evidence: {},
    profileReadinessEvidence: {
      schemaVersion: 1,
      exportedAt: 2,
      reportCount: 1,
      readyCount: 1,
      limitedCount: 0,
      failedCount: 0,
      reports: [],
    },
  })?.readyCount,
  1,
);
assert.equal(selectProfileReadinessEvidenceFromPacket({ schemaVersion: 1, profileReadinessEvidence: { schemaVersion: 1 } }), null);
assert.equal(
  selectUploadEvidenceFromPacket({
    schemaVersion: 1,
    exportedAt: "2026-05-15T00:00:00.000Z",
    report: {},
    evidence: {},
    uploadEvidence: {
      schemaVersion: 1,
      exportedAt: 2,
      entryCount: 1,
      verifiedCount: 1,
      limitedCount: 0,
      failedCount: 0,
      entries: [],
    },
  })?.verifiedCount,
  1,
);
assert.equal(selectUploadEvidenceFromPacket({ schemaVersion: 1, uploadEvidence: { schemaVersion: 1 } }), null);

const settings = read("src/app/settings/page.tsx");
const card = read("src/features/settings/components/release-readiness-card.tsx");
const evidence = read("src/lib/product/release-evidence.ts");
const evidenceHistory = read("src/lib/product/release-evidence-history.ts");
const release = read("src/lib/product/release-readiness.ts");
const platform = read("src/lib/product/capabilities/platform.ts");

assert.match(settings, /ReleaseReadinessCard/);
assert.match(settings, /ESSENCE_RELEASE_DEPLOYMENT_URL/);
assert.match(settings, /ESSENCE_RELEASE_SCREENSHOT_URL/);
assert.match(settings, /ESSENCE_DESKTOP_LAUNCH_VERIFIED/);
assert.match(card, /Release readiness/);
assert.match(card, /Progress/);
assert.match(card, /releaseBadgeVariant/);
assert.match(card, /createReleaseEvidenceSummary/);
assert.match(card, /isReleaseEvidenceRequirementReady/);
assert.match(card, /freshDeploymentUrlCaptured/);
assert.match(card, /freshDeploymentScreenshotCaptured/);
assert.match(card, /freshDesktopProofCaptured/);
assert.match(card, /freshLatestDesktopVerification/);
assert.match(card, /releaseEvidenceBadgeVariant/);
assert.match(card, /Save URL/);
assert.match(card, /Save proof/);
assert.match(card, /local screenshot path/);
assert.match(card, /Import release evidence packet/);
assert.match(card, /selectReleaseEvidenceFromPacket/);
assert.doesNotMatch(card, /Mark desktop verified/);
assert.match(card, /loadDesktopVerificationHistory/);
assert.match(card, /Use ready desktop check/);
assert.match(card, /Import desktop evidence packet/);
assert.match(card, /selectReadyDesktopVerificationEntry/);
assert.match(card, /latestDesktopVerification/);
assert.match(card, /importedDesktopVerification/);
assert.match(card, /importDesktopVerificationHistoryEntry/);
assert.match(card, /downloadReleaseEvidencePacket/);
assert.match(card, /auditReleaseEvidencePacket/);
assert.match(card, /Evidence verifier/);
assert.match(card, /Export ready proof/);
assert.match(card, /Export draft proof/);
assert.match(card, /createSelfHostedUploadEvidencePacket/);
assert.match(card, /importSelfHostedUploadEvidencePacket/);
assert.match(card, /loadSelfHostedUploadHistory/);
assert.match(card, /Upload evidence/);
assert.match(card, /uploadEvidence/);
assert.match(card, /selectUploadEvidenceFromPacket/);
assert.match(card, /Release evidence history/);
assert.match(card, /Save snapshot/);
assert.match(card, /Re-verify/);
assert.match(card, /releaseEvidenceHistoryFilter/);
assert.match(card, /filterReleaseEvidenceHistory/);
assert.match(card, /pinReleaseEvidenceHistoryEntry/);
assert.match(card, /saveCurrentReleaseEvidenceHistoryEntry/);
assert.match(card, /saveReleaseEvidenceHistoryEntry/);
assert.match(card, /createSelfHostedUploadProfileReadinessEvidencePacket/);
assert.match(card, /importSelfHostedUploadProfileReadinessEvidencePacket/);
assert.match(card, /loadSelfHostedUploadProfileReadinessHistory/);
assert.match(card, /Profile readiness evidence/);
assert.match(card, /profileReadinessEvidence/);
assert.match(card, /selectProfileReadinessEvidenceFromPacket/);
assert.doesNotMatch(card, /deploymentUrlCaptured: props\.deploymentUrlCaptured \|\| localDeploymentUrlCaptured/);
assert.doesNotMatch(card, /deploymentScreenshotCaptured: props\.deploymentScreenshotCaptured \|\| localDeploymentScreenshotCaptured/);
assert.doesNotMatch(card, /props\.desktopLaunchVerified \|\| hasReleaseDesktopProof\(evidence\)/);
assert.match(evidence, /essence\.release\.evidence\.v1/);
assert.match(evidence, /deploymentUrl/);
assert.match(evidence, /isReleaseEvidenceUrl/);
assert.match(evidence, /createReleaseEvidenceSummary/);
assert.match(evidence, /isReleaseEvidenceRequirementReady/);
assert.match(evidence, /stale/);
assert.match(evidence, /releaseEvidenceFreshnessWindowMs/);
assert.match(evidence, /hasReleaseDeploymentProof/);
assert.match(evidence, /selectReleaseEvidenceFromPacket/);
assert.match(evidence, /selectProfileReadinessEvidenceFromPacket/);
assert.match(evidence, /selectUploadEvidenceFromPacket/);
assert.match(evidence, /schemaVersion: 1/);
assert.match(evidence, /deploymentScreenshotUrl/);
assert.match(evidence, /deploymentScreenshotArtifact/);
assert.match(evidence, /isReleaseScreenshotProof/);
assert.match(evidence, /isReleaseScreenshotArtifact/);
assert.match(evidence, /desktopLaunchVerified/);
assert.match(evidence, /desktopVerificationId/);
assert.match(evidence, /desktopVerificationCheckedAt/);
assert.match(evidence, /createReleaseDesktopProof/);
assert.match(evidence, /hasReleaseDesktopProof/);
assert.match(evidence, /selectReadyDesktopVerificationEntry/);
assert.match(evidence, /normalizeDesktopVerificationHistoryEntry/);
assert.match(evidence, /embeddedDesktopVerification/);
assert.match(evidence, /desktopVerification/);
assert.match(evidence, /SelfHostedUploadEvidencePacket/);
assert.match(evidence, /SelfHostedUploadProfileReadinessEvidencePacket/);
assert.match(evidence, /profileReadinessEvidence/);
assert.match(evidence, /uploadEvidence/);
assert.match(evidenceHistory, /essence\.release\.evidence\.history\.v1/);
assert.match(evidenceHistory, /essence\.release\.evidence\.pinned\.v1/);
assert.match(evidenceHistory, /ReleaseEvidenceHistoryFilter/);
assert.match(evidenceHistory, /filterReleaseEvidenceHistory/);
assert.match(evidenceHistory, /releaseEvidenceHistoryLabel/);
assert.match(evidenceHistory, /pinReleaseEvidenceHistoryEntry/);
assert.match(evidenceHistory, /saveCurrentReleaseEvidenceHistoryEntry/);
assert.match(evidenceHistory, /saveReleaseEvidenceHistoryEntry/);
assert.match(evidenceHistory, /selectPinnedReleaseEvidenceHistoryEntry/);
assert.match(release, /deployment-screenshot/);
assert.match(release, /desktop-launch/);
assert.match(release, /product-capabilities/);
assert.match(platform, /release readiness gate/);

console.log("Release readiness workflow checks passed.");

function read(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function fakeReadyProductReport(): ProductReadinessReport {
  return {
    score: 100,
    total: 1,
    ready: 1,
    needsVerification: 0,
    partial: 0,
    missing: 0,
    statusCounts: [{ status: "ready", count: 1 }],
    areas: [],
    nextCapabilities: [],
  };
}
