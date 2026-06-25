import type {
  AssetAuditRecord,
  AssetLibraryAudit,
  AssetAuditScope,
} from "@/features/assets/asset-library-audit";

export type AssetProvenanceStatus = "ready" | "review" | "blocked";

export type AssetLicenseReviewStatus =
  | "export-safe"
  | "needs-attribution"
  | "expires-soon"
  | "missing-source"
  | "restricted";

export type AssetUsageImpact = "low" | "medium" | "high";

export type AssetSourceLineageStep = {
  label: string;
  detail: string;
  href: string | null;
};

export type AssetProvenanceReviewItem = {
  id: string;
  name: string;
  scope: AssetAuditScope;
  scopeLabel: string;
  mimeType: string;
  updatedAt: string;
  sourceLabel: string;
  licenseLabel: string;
  authorLabel: string;
  licenseStatus: AssetLicenseReviewStatus;
  status: AssetProvenanceStatus;
  usageImpact: AssetUsageImpact;
  usageDetail: string;
  reviewDueAt: string | null;
  sourceLineage: AssetSourceLineageStep[];
  exportWarnings: string[];
};

export type AssetProvenanceReviewCenter = {
  status: AssetProvenanceStatus;
  score: number;
  items: AssetProvenanceReviewItem[];
  sourceLineageQueue: AssetProvenanceReviewItem[];
  expirationQueue: AssetProvenanceReviewItem[];
  usageImpactQueue: AssetProvenanceReviewItem[];
  exportWarnings: AssetProvenanceReviewItem[];
  nextActions: string[];
  totals: {
    assets: number;
    exportSafe: number;
    needsAttribution: number;
    expiring: number;
    blocked: number;
    highImpact: number;
  };
};

const externalReviewCadenceDays = 365;
const missingReviewCadenceDays = 30;
const expirationReminderWindowDays = 30;

export function createAssetProvenanceReviewCenter(input: {
  audit: AssetLibraryAudit;
  now?: string;
}): AssetProvenanceReviewCenter {
  const now = parseDate(input.now ?? new Date().toISOString());
  const items = input.audit.records.map((record) =>
    createReviewItem(record, now),
  );
  const exportSafe = items.filter((item) => item.status === "ready").length;
  const blocked = items.filter((item) => item.status === "blocked").length;
  const expiring = items.filter(
    (item) => item.licenseStatus === "expires-soon",
  ).length;
  const needsAttribution = items.filter(
    (item) => item.licenseStatus === "needs-attribution",
  ).length;
  const highImpact = items.filter((item) => item.usageImpact === "high").length;
  const score = items.length
    ? Math.round(
        (exportSafe / items.length) * 65 +
          ((items.length - blocked) / items.length) * 25 +
          ((items.length - expiring) / items.length) * 10,
      )
    : 100;

  return {
    status: scoreToStatus(score, blocked),
    score,
    items,
    sourceLineageQueue: items
      .filter((item) =>
        ["missing-source", "restricted"].includes(item.licenseStatus),
      )
      .sort(compareReviewItems)
      .slice(0, 8),
    expirationQueue: items
      .filter((item) => item.licenseStatus === "expires-soon")
      .sort(compareReviewItems)
      .slice(0, 8),
    usageImpactQueue: items
      .filter((item) => item.usageImpact !== "low" || item.exportWarnings.length)
      .sort(compareReviewItems)
      .slice(0, 8),
    exportWarnings: items
      .filter((item) => item.exportWarnings.length > 0)
      .sort(compareReviewItems)
      .slice(0, 8),
    nextActions: createNextActions(items),
    totals: {
      assets: items.length,
      exportSafe,
      needsAttribution,
      expiring,
      blocked,
      highImpact,
    },
  };
}

function createReviewItem(
  record: AssetAuditRecord,
  now: Date,
): AssetProvenanceReviewItem {
  const baseReview = classifyLicense(record);
  const reviewDueAt = createReviewDueAt(record, baseReview.status);
  const isDueSoon = reviewDueAt
    ? daysBetween(now, parseDate(reviewDueAt)) <= expirationReminderWindowDays
    : false;
  const licenseStatus =
    isDueSoon && baseReview.status !== "missing-source" && baseReview.status !== "restricted"
      ? "expires-soon"
      : baseReview.status;
  const usage = createUsageImpact(record);
  const exportWarnings = createExportWarnings({
    record,
    licenseStatus,
    usageImpact: usage.impact,
  });

  return {
    id: record.id,
    name: record.name,
    scope: record.scope,
    scopeLabel: record.scopeLabel,
    mimeType: record.mimeType,
    updatedAt: record.updatedAt,
    sourceLabel: record.sourceProvider || record.sourceUrl || "Source missing",
    licenseLabel: record.licenseName || "License missing",
    authorLabel: record.authorName || "Author not recorded",
    licenseStatus,
    status: createItemStatus(licenseStatus, exportWarnings),
    usageImpact: usage.impact,
    usageDetail: usage.detail,
    reviewDueAt,
    sourceLineage: createSourceLineage(record),
    exportWarnings,
  };
}

function classifyLicense(record: AssetAuditRecord): {
  status: AssetLicenseReviewStatus;
} {
  if (record.scope === "brand" || record.scope === "projects") {
    return { status: "export-safe" };
  }

  const license = normalize(record.licenseName);
  const hasSource = Boolean(record.sourceProvider || record.sourceUrl);
  const hasLicense = Boolean(record.licenseName || record.licenseUrl);

  if (!hasSource || !hasLicense) return { status: "missing-source" };

  if (isRestrictedLicense(license)) return { status: "restricted" };

  if (license.includes("cc by") || license.includes("attribution")) {
    return { status: "needs-attribution" };
  }

  return { status: "export-safe" };
}

function createReviewDueAt(
  record: AssetAuditRecord,
  status: AssetLicenseReviewStatus,
) {
  if (record.scope === "brand" || record.scope === "projects") return null;

  const days =
    status === "missing-source" || status === "restricted"
      ? missingReviewCadenceDays
      : externalReviewCadenceDays;

  return addDays(record.updatedAt, days);
}

function createUsageImpact(record: AssetAuditRecord): {
  impact: AssetUsageImpact;
  detail: string;
} {
  if (record.scope === "projects") {
    const count = record.referenceCount ?? 0;

    return {
      impact: count >= 4 || record.skippedReferenceCount ? "high" : "medium",
      detail: `${count} project asset${count === 1 ? "" : "s"} indexed${
        record.skippedReferenceCount
          ? ` with ${record.skippedReferenceCount} skipped reference${record.skippedReferenceCount === 1 ? "" : "s"}`
          : ""
      }.`,
    };
  }

  if (record.scope === "brand") {
    return {
      impact: "high",
      detail: "Reusable brand asset can affect many future designs.",
    };
  }

  return {
    impact: "low",
    detail: "Upload is available in the library; project usage is not indexed yet.",
  };
}

function createExportWarnings(input: {
  record: AssetAuditRecord;
  licenseStatus: AssetLicenseReviewStatus;
  usageImpact: AssetUsageImpact;
}) {
  const warnings: string[] = [];

  if (input.licenseStatus === "missing-source") {
    warnings.push("Add source and license metadata before external export.");
  }

  if (input.licenseStatus === "restricted") {
    warnings.push("Restricted or unclear license blocks export-safe handoff.");
  }

  if (input.licenseStatus === "needs-attribution") {
    warnings.push("Keep author and license attribution with every export.");
  }

  if (input.licenseStatus === "expires-soon") {
    warnings.push("License review is due soon or overdue.");
  }

  if (input.record.skippedReferenceCount) {
    warnings.push("Project manifest skipped asset references during indexing.");
  }

  if (input.usageImpact === "high" && warnings.length > 0) {
    warnings.push("High-impact asset should be reviewed before package export.");
  }

  return warnings;
}

function createSourceLineage(record: AssetAuditRecord): AssetSourceLineageStep[] {
  return [
    {
      label: "Library scope",
      detail: record.scopeLabel,
      href: record.href,
    },
    {
      label: "Source",
      detail: record.sourceProvider || record.sourceUrl || "Source missing",
      href: record.sourceUrl,
    },
    {
      label: "Author",
      detail: record.authorName || "Author not recorded",
      href: null,
    },
    {
      label: "License",
      detail: record.licenseName || "License missing",
      href: record.licenseUrl,
    },
  ];
}

function createItemStatus(
  licenseStatus: AssetLicenseReviewStatus,
  warnings: string[],
): AssetProvenanceStatus {
  if (licenseStatus === "restricted" || licenseStatus === "missing-source") {
    return "blocked";
  }

  if (warnings.length > 0 || licenseStatus !== "export-safe") {
    return "review";
  }

  return "ready";
}

function createNextActions(items: AssetProvenanceReviewItem[]) {
  const blocked = items.find((item) => item.status === "blocked");
  const expiring = items.find((item) => item.licenseStatus === "expires-soon");
  const attribution = items.find(
    (item) => item.licenseStatus === "needs-attribution",
  );
  const highImpact = items.find(
    (item) => item.usageImpact === "high" && item.exportWarnings.length > 0,
  );

  return [
    blocked ? `Resolve source and license gaps for ${blocked.name}.` : null,
    expiring ? `Refresh license review for ${expiring.name}.` : null,
    attribution ? `Attach export attribution for ${attribution.name}.` : null,
    highImpact ? `Review high-impact asset ${highImpact.name}.` : null,
  ].filter(Boolean).slice(0, 3) as string[];
}

function compareReviewItems(
  first: AssetProvenanceReviewItem,
  second: AssetProvenanceReviewItem,
) {
  return (
    statusWeight(second.status) - statusWeight(first.status) ||
    impactWeight(second.usageImpact) - impactWeight(first.usageImpact) ||
    first.name.localeCompare(second.name)
  );
}

function scoreToStatus(score: number, blockedCount: number): AssetProvenanceStatus {
  if (blockedCount > 0) return "blocked";
  if (score < 90) return "review";

  return "ready";
}

function statusWeight(status: AssetProvenanceStatus) {
  if (status === "blocked") return 3;
  if (status === "review") return 2;

  return 1;
}

function impactWeight(impact: AssetUsageImpact) {
  if (impact === "high") return 3;
  if (impact === "medium") return 2;

  return 1;
}

function isRestrictedLicense(license: string) {
  return (
    license.includes("all rights reserved") ||
    license.includes("editorial") ||
    license.includes("non-commercial") ||
    license.includes("noncommercial") ||
    license.includes("cc by-nc") ||
    license.includes("trial") ||
    license.includes("unknown")
  );
}

function addDays(dateValue: string, days: number) {
  const date = parseDate(dateValue);
  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString();
}

function daysBetween(start: Date, end: Date) {
  const dayMs = 24 * 60 * 60 * 1000;

  return Math.ceil((end.getTime() - start.getTime()) / dayMs);
}

function parseDate(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? new Date(0) : date;
}

function normalize(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}
