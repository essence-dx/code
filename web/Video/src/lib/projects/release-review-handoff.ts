import type { DesktopLaunchProofSummary } from "@/lib/desktop/desktop-launch-proof";
import type { ReleaseEvidenceSummary } from "@/lib/product/release-evidence";
import type { ExportProofBundle, ExportProofBundleSection, ExportProofBundleStatus } from "@/lib/projects/export-proof-bundle";

export type ReleaseReviewHandoffStatus = "match" | "attention" | "mismatch";

export interface ReleaseReviewHandoffItem {
  id: string;
  label: string;
  status: ReleaseReviewHandoffStatus;
  detail: string;
}

export interface ReleaseReviewHandoffComparison {
  status: ReleaseReviewHandoffStatus;
  matchCount: number;
  attentionCount: number;
  mismatchCount: number;
  items: ReleaseReviewHandoffItem[];
}

export interface ReleaseReviewHandoffInput {
  bundle: ExportProofBundle;
  releaseEvidenceSummary: ReleaseEvidenceSummary;
  releaseEvidenceUpdatedAt: string | number | null;
  desktopProofSummary: DesktopLaunchProofSummary;
  desktopEvidenceCheckedAt: number | null;
}

export function createReleaseReviewHandoffComparison(input: ReleaseReviewHandoffInput): ReleaseReviewHandoffComparison {
  const releaseSection = findBundleSection(input.bundle, "release-evidence");
  const desktopSection = findBundleSection(input.bundle, "desktop-evidence");
  const items: ReleaseReviewHandoffItem[] = [
    compareSectionPresence("release-section", "Release proof section", releaseSection),
    compareBundleSectionStatus(
      "release-status",
      "Release proof status",
      releaseSection,
      releaseEvidenceStatus(input.releaseEvidenceSummary.status),
      `${input.releaseEvidenceSummary.readyCount} of ${input.releaseEvidenceSummary.total} latest release checks are ready.`,
    ),
    compareBundleEvidenceCount(
      "release-evidence-count",
      "Release proof count",
      releaseSection,
      input.releaseEvidenceSummary.total,
      "release checks",
    ),
    compareBundleFreshness("release-freshness", "Release proof freshness", input.bundle.generatedAt, input.releaseEvidenceUpdatedAt),
    compareSectionPresence("desktop-section", "Desktop proof section", desktopSection),
    compareBundleSectionStatus(
      "desktop-status",
      "Desktop proof status",
      desktopSection,
      desktopProofStatus(input.desktopProofSummary.status),
      `${input.desktopProofSummary.readyCount} ready, ${input.desktopProofSummary.limitedCount} limited, ${input.desktopProofSummary.failedCount} failed, and ${input.desktopProofSummary.missingCount} missing latest desktop checks.`,
    ),
    compareBundleEvidenceCount("desktop-evidence-count", "Desktop proof count", desktopSection, input.desktopProofSummary.total, "desktop checks"),
    compareBundleFreshness(
      "desktop-freshness",
      "Desktop proof freshness",
      input.bundle.generatedAt,
      input.desktopEvidenceCheckedAt ? new Date(input.desktopEvidenceCheckedAt).toISOString() : null,
    ),
  ];
  const matchCount = countHandoffItems(items, "match");
  const attentionCount = countHandoffItems(items, "attention");
  const mismatchCount = countHandoffItems(items, "mismatch");

  return {
    status: mismatchCount > 0 ? "mismatch" : attentionCount > 0 ? "attention" : "match",
    matchCount,
    attentionCount,
    mismatchCount,
    items,
  };
}

function findBundleSection(bundle: ExportProofBundle, id: ExportProofBundleSection["id"]) {
  return bundle.sections.find((section) => section.id === id) ?? null;
}

function compareSectionPresence(id: string, label: string, section: ExportProofBundleSection | null): ReleaseReviewHandoffItem {
  return {
    id,
    label,
    status: section ? "match" : "mismatch",
    detail: section ? "Review proof bundle includes this handoff section." : "Review proof bundle is missing this handoff section.",
  };
}

function compareBundleSectionStatus(
  id: string,
  label: string,
  section: ExportProofBundleSection | null,
  expected: ExportProofBundleStatus,
  currentDetail: string,
): ReleaseReviewHandoffItem {
  if (!section) {
    return {
      id,
      label,
      status: "mismatch",
      detail: "Review proof bundle has no section to compare.",
    };
  }

  return {
    id,
    label,
    status: section.status === expected ? "match" : "mismatch",
    detail:
      section.status === expected
        ? `Review bundle status matches latest proof. ${currentDetail}`
        : `Review bundle status is ${section.status}; latest proof expects ${expected}. ${currentDetail}`,
  };
}

function compareBundleEvidenceCount(
  id: string,
  label: string,
  section: ExportProofBundleSection | null,
  expectedCount: number,
  evidenceLabel: string,
): ReleaseReviewHandoffItem {
  if (!section) {
    return {
      id,
      label,
      status: "mismatch",
      detail: "Review proof bundle has no section to compare.",
    };
  }

  return {
    id,
    label,
    status: section.evidenceCount === expectedCount ? "match" : "attention",
    detail:
      section.evidenceCount === expectedCount
        ? `Review bundle includes ${expectedCount} ${evidenceLabel}.`
        : `Review bundle includes ${section.evidenceCount} ${evidenceLabel}; latest proof has ${expectedCount}.`,
  };
}

function compareBundleFreshness(
  id: string,
  label: string,
  bundleGeneratedAt: string,
  proofUpdatedAt: string | number | null,
): ReleaseReviewHandoffItem {
  if (!proofUpdatedAt) {
    return {
      id,
      label,
      status: "attention",
      detail: "Latest proof does not have a saved freshness timestamp.",
    };
  }

  const bundleTime = Date.parse(bundleGeneratedAt);
  const proofTime = typeof proofUpdatedAt === "number" ? proofUpdatedAt : Date.parse(proofUpdatedAt);
  if (!Number.isFinite(bundleTime) || !Number.isFinite(proofTime)) {
    return {
      id,
      label,
      status: "attention",
      detail: "Freshness timestamps could not be compared.",
    };
  }

  return {
    id,
    label,
    status: bundleTime >= proofTime ? "match" : "mismatch",
    detail:
      bundleTime >= proofTime
        ? "Review proof was generated after the latest saved proof."
        : "Latest proof is newer than the review proof bundle. Regenerate or re-export the proof bundle before handoff.",
  };
}

function releaseEvidenceStatus(status: ReleaseEvidenceSummary["status"]): ExportProofBundleStatus {
  return status === "ready" ? "ready" : "review";
}

function desktopProofStatus(status: DesktopLaunchProofSummary["status"]): ExportProofBundleStatus {
  if (status === "failed") return "blocked";
  return status === "ready" ? "ready" : "review";
}

function countHandoffItems(items: ReleaseReviewHandoffItem[], status: ReleaseReviewHandoffStatus) {
  return items.filter((item) => item.status === status).length;
}
