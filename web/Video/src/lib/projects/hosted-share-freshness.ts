import type { HostedReviewLinkSummary } from "@/lib/projects/hosted-review-link-contracts";

export type HostedShareFreshnessStatus = "ready" | "review" | "stale";
export type HostedShareFreshnessItemStatus = "current" | "review" | "stale";
export type HostedShareFreshnessItemId = "release-evidence" | "desktop-proof" | "review-proof";

export interface HostedShareFreshnessItem {
  id: HostedShareFreshnessItemId;
  label: string;
  status: HostedShareFreshnessItemStatus;
  detail: string;
  evidenceAt: string;
}

export interface HostedShareFreshnessReport {
  status: HostedShareFreshnessStatus;
  linkIssuedAt: string;
  currentCount: number;
  reviewCount: number;
  staleCount: number;
  items: HostedShareFreshnessItem[];
}

export interface HostedShareFreshnessInput {
  link: Pick<HostedReviewLinkSummary, "createdAt">;
  releaseEvidenceUpdatedAt: string | number | null;
  desktopEvidenceCheckedAt: string | number | null;
  reviewProofUpdatedAt: string | number | null;
}

export function createHostedShareFreshnessReport(input: HostedShareFreshnessInput): HostedShareFreshnessReport {
  const items: HostedShareFreshnessItem[] = [
    compareHostedShareEvidenceTimestamp({
      id: "release-evidence",
      label: "Release proof",
      linkIssuedAt: input.link.createdAt,
      evidenceAt: input.releaseEvidenceUpdatedAt,
      missingDetail: "No release proof timestamp is available for this hosted link.",
      currentDetail: "Release proof has not changed since this hosted link was issued.",
      staleDetail: "Release proof changed after this hosted link was issued. Renew or recreate the link after refreshing release proof.",
    }),
    compareHostedShareEvidenceTimestamp({
      id: "desktop-proof",
      label: "Desktop proof",
      linkIssuedAt: input.link.createdAt,
      evidenceAt: input.desktopEvidenceCheckedAt,
      missingDetail: "No desktop proof timestamp is available for this hosted link.",
      currentDetail: "Desktop proof has not changed since this hosted link was issued.",
      staleDetail: "Desktop proof changed after this hosted link was issued. Refresh the hosted handoff before release sharing.",
    }),
    compareHostedShareEvidenceTimestamp({
      id: "review-proof",
      label: "Review proof",
      linkIssuedAt: input.link.createdAt,
      evidenceAt: input.reviewProofUpdatedAt,
      missingDetail: "No local review proof timestamp is available for this hosted link.",
      currentDetail: "Review proof has not changed since this hosted link was issued.",
      staleDetail: "Review proof changed after this hosted link was issued. Share the newest proof before final handoff.",
    }),
  ];
  const currentCount = countItems(items, "current");
  const reviewCount = countItems(items, "review");
  const staleCount = countItems(items, "stale");

  return {
    status: staleCount > 0 ? "stale" : reviewCount > 0 ? "review" : "ready",
    linkIssuedAt: input.link.createdAt,
    currentCount,
    reviewCount,
    staleCount,
    items,
  };
}

export function hostedShareFreshnessStatusLabel(status: HostedShareFreshnessStatus | HostedShareFreshnessItemStatus) {
  if (status === "stale") return "Stale";
  if (status === "review") return "Review";
  if (status === "current") return "Current";
  return "Ready";
}

export function newestEvidenceTimestamp(values: Array<string | number | null | undefined>): string | number | null {
  const newest = values
    .flatMap((value) => {
      const time = timestampMs(value);
      return time === null ? [] : [{ time, value: value as string | number }];
    })
    .sort((first, second) => second.time - first.time)[0];

  return newest?.value ?? null;
}

function compareHostedShareEvidenceTimestamp(input: {
  id: HostedShareFreshnessItemId;
  label: string;
  linkIssuedAt: string;
  evidenceAt: string | number | null;
  missingDetail: string;
  currentDetail: string;
  staleDetail: string;
}): HostedShareFreshnessItem {
  if (!input.evidenceAt) {
    return {
      id: input.id,
      label: input.label,
      status: "review",
      detail: input.missingDetail,
      evidenceAt: "",
    };
  }

  const linkTime = timestampMs(input.linkIssuedAt);
  const evidenceTime = timestampMs(input.evidenceAt);
  const evidenceAt = timestampIso(input.evidenceAt);
  if (linkTime === null || evidenceTime === null) {
    return {
      id: input.id,
      label: input.label,
      status: "review",
      detail: "Hosted share freshness timestamps could not be compared.",
      evidenceAt,
    };
  }

  return {
    id: input.id,
    label: input.label,
    status: evidenceTime > linkTime ? "stale" : "current",
    detail: evidenceTime > linkTime ? input.staleDetail : input.currentDetail,
    evidenceAt,
  };
}

function countItems(items: HostedShareFreshnessItem[], status: HostedShareFreshnessItemStatus) {
  return items.filter((item) => item.status === status).length;
}

function timestampMs(value: string | number | null | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function timestampIso(value: string | number) {
  if (typeof value === "number") return new Date(value).toISOString();
  return value;
}
