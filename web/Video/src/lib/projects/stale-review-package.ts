import type { ExportReviewPackage } from "@/lib/projects/collaboration-store";

export type StaleReviewPackageStatus = "ready" | "review" | "stale";
export type StaleReviewPackageItemStatus = "current" | "review" | "stale";
export type StaleReviewPackageItemId = "export-qa" | "media-attribution" | "release-evidence" | "desktop-proof";

export interface StaleReviewPackageItem {
  id: StaleReviewPackageItemId;
  label: string;
  status: StaleReviewPackageItemStatus;
  detail: string;
  evidenceAt: string;
}

export interface StaleReviewPackageReport {
  status: StaleReviewPackageStatus;
  reviewCreatedAt: string;
  currentCount: number;
  reviewCount: number;
  staleCount: number;
  items: StaleReviewPackageItem[];
}

export interface StaleReviewPackageInput {
  review: Pick<ExportReviewPackage, "createdAt" | "exportQaSnapshot" | "mediaAttributionSummary">;
  releaseEvidenceUpdatedAt: string | number | null;
  desktopEvidenceCheckedAt: string | number | null;
}

export function createStaleReviewPackageReport(input: StaleReviewPackageInput): StaleReviewPackageReport {
  const items: StaleReviewPackageItem[] = [
    compareReviewEvidenceTimestamp({
      id: "export-qa",
      label: "Export QA",
      reviewCreatedAt: input.review.createdAt,
      evidenceAt: input.review.exportQaSnapshot?.capturedAt ?? null,
      missingDetail: "This review package has no export QA snapshot attached.",
      currentDetail: "Export QA evidence was captured before this review package was created.",
      staleDetail: "Export QA evidence was captured after this review package was created. Re-export the proof bundle before handoff.",
    }),
    compareReviewEvidenceTimestamp({
      id: "media-attribution",
      label: "Media attribution",
      reviewCreatedAt: input.review.createdAt,
      evidenceAt: input.review.mediaAttributionSummary?.generatedAt ?? null,
      missingDetail: "This review package has no media attribution summary attached.",
      currentDetail: "Media attribution evidence was generated before this review package was created.",
      staleDetail: "Media attribution evidence was generated after this review package was created. Refresh the review package before sharing.",
    }),
    compareReviewEvidenceTimestamp({
      id: "release-evidence",
      label: "Release evidence",
      reviewCreatedAt: input.review.createdAt,
      evidenceAt: input.releaseEvidenceUpdatedAt,
      missingDetail: "Latest release evidence has no saved update timestamp.",
      currentDetail: "Release proof has not moved ahead of this review package.",
      staleDetail: "Release proof changed after this review package was created. Regenerate review proof before release handoff.",
    }),
    compareReviewEvidenceTimestamp({
      id: "desktop-proof",
      label: "Desktop proof",
      reviewCreatedAt: input.review.createdAt,
      evidenceAt: input.desktopEvidenceCheckedAt,
      missingDetail: "Latest desktop proof has no saved verification timestamp.",
      currentDetail: "Desktop proof has not moved ahead of this review package.",
      staleDetail: "Desktop proof changed after this review package was created. Refresh the review package before handoff.",
    }),
  ];
  const currentCount = countItems(items, "current");
  const reviewCount = countItems(items, "review");
  const staleCount = countItems(items, "stale");

  return {
    status: staleCount > 0 ? "stale" : reviewCount > 0 ? "review" : "ready",
    reviewCreatedAt: input.review.createdAt,
    currentCount,
    reviewCount,
    staleCount,
    items,
  };
}

export function staleReviewPackageStatusLabel(status: StaleReviewPackageStatus | StaleReviewPackageItemStatus) {
  if (status === "stale") return "Stale";
  if (status === "review") return "Review";
  if (status === "current") return "Current";
  return "Ready";
}

function compareReviewEvidenceTimestamp(input: {
  id: StaleReviewPackageItemId;
  label: string;
  reviewCreatedAt: string;
  evidenceAt: string | number | null;
  missingDetail: string;
  currentDetail: string;
  staleDetail: string;
}): StaleReviewPackageItem {
  if (!input.evidenceAt) {
    return {
      id: input.id,
      label: input.label,
      status: "review",
      detail: input.missingDetail,
      evidenceAt: "",
    };
  }

  const reviewTime = Date.parse(input.reviewCreatedAt);
  const evidenceTime = typeof input.evidenceAt === "number" ? input.evidenceAt : Date.parse(input.evidenceAt);
  const evidenceAt = typeof input.evidenceAt === "number" ? new Date(input.evidenceAt).toISOString() : input.evidenceAt;
  if (!Number.isFinite(reviewTime) || !Number.isFinite(evidenceTime)) {
    return {
      id: input.id,
      label: input.label,
      status: "review",
      detail: "Evidence freshness timestamps could not be compared.",
      evidenceAt,
    };
  }

  return {
    id: input.id,
    label: input.label,
    status: evidenceTime > reviewTime ? "stale" : "current",
    detail: evidenceTime > reviewTime ? input.staleDetail : input.currentDetail,
    evidenceAt,
  };
}

function countItems(items: StaleReviewPackageItem[], status: StaleReviewPackageItemStatus) {
  return items.filter((item) => item.status === status).length;
}
