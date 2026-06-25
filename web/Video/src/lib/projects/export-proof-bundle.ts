import type { DesktopLaunchProofStatus, DesktopLaunchProofSummary } from "@/lib/desktop/desktop-launch-proof";
import type { ExportQaSnapshot, MediaAttributionSummary } from "@/lib/editor/types";
import type { ReleaseEvidenceRequirementStatus, ReleaseEvidenceSummary } from "@/lib/product/release-evidence";
import type { ExportReviewDownload, ExportReviewPackage } from "@/lib/projects/collaboration-store";

export type ExportProofBundleStatus = "ready" | "review" | "blocked";

export type ExportProofBundleSectionId =
  | "export-qa"
  | "render-route"
  | "media-attribution"
  | "release-evidence"
  | "desktop-evidence"
  | "download-history";

export interface ExportProofBundleSection {
  id: ExportProofBundleSectionId;
  label: string;
  status: ExportProofBundleStatus;
  summary: string;
  detail: string;
  evidenceCount: number;
}

export interface ExportProofBundle {
  schemaVersion: 1;
  id: string;
  reviewId: string;
  projectId: string;
  exportJobId: string;
  outputName: string;
  format: string;
  preset: string;
  generatedAt: string;
  status: ExportProofBundleStatus;
  readyCount: number;
  reviewCount: number;
  blockedCount: number;
  downloadCount: number;
  downloadBytes: number;
  sections: ExportProofBundleSection[];
}

export type ExportProofBundleComparisonStatus = "match" | "attention" | "mismatch";

export interface ExportProofBundleComparisonItem {
  id: string;
  label: string;
  status: ExportProofBundleComparisonStatus;
  detail: string;
}

export interface ExportProofBundleComparison {
  status: ExportProofBundleComparisonStatus;
  matchCount: number;
  attentionCount: number;
  mismatchCount: number;
  items: ExportProofBundleComparisonItem[];
}

export interface ExportProofBundleInput {
  review: ExportReviewPackage;
  downloads: ExportReviewDownload[];
  releaseEvidenceSummary?: ReleaseEvidenceSummary | null;
  releaseEvidenceLabel?: string;
  desktopProofSummary?: DesktopLaunchProofSummary | null;
  desktopEvidenceLabel?: string;
  generatedAt?: string;
}

export function createExportProofBundle(input: ExportProofBundleInput): ExportProofBundle {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const sections = [
    createExportQaSection(input.review.exportQaSnapshot),
    createRenderRouteSection(input.review.exportQaSnapshot),
    createMediaAttributionSection(input.review.mediaAttributionSummary),
    createReleaseEvidenceSection(input.releaseEvidenceSummary, input.releaseEvidenceLabel),
    createDesktopEvidenceSection(input.desktopProofSummary, input.desktopEvidenceLabel),
    createDownloadHistorySection(input.downloads),
  ];
  const readyCount = countSections(sections, "ready");
  const reviewCount = countSections(sections, "review");
  const blockedCount = countSections(sections, "blocked");
  const downloadBytes = input.downloads.reduce((total, download) => total + Math.max(0, download.size), 0);

  return {
    schemaVersion: 1,
    id: `proof_${input.review.id}_${generatedAt.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "")}`,
    reviewId: input.review.id,
    projectId: input.review.projectId,
    exportJobId: input.review.exportJobId,
    outputName: input.review.outputName,
    format: input.review.format,
    preset: input.review.preset,
    generatedAt,
    status: blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready",
    readyCount,
    reviewCount,
    blockedCount,
    downloadCount: input.downloads.length,
    downloadBytes,
    sections,
  };
}

export function normalizeExportProofBundle(value: unknown): ExportProofBundle | null {
  if (!value || typeof value !== "object") return null;

  const candidate = value as Partial<ExportProofBundle>;
  const sections = Array.isArray(candidate.sections)
    ? candidate.sections.flatMap((section) => {
        const normalized = normalizeProofBundleSection(section);
        return normalized ? [normalized] : [];
      })
    : [];

  if (
    candidate.schemaVersion !== 1 ||
    !candidate.id ||
    !candidate.reviewId ||
    !candidate.projectId ||
    !candidate.exportJobId ||
    !candidate.outputName ||
    !candidate.format ||
    !candidate.preset ||
    !candidate.generatedAt ||
    !isProofBundleStatus(candidate.status) ||
    sections.length === 0
  ) {
    return null;
  }

  return {
    schemaVersion: 1,
    id: candidate.id,
    reviewId: candidate.reviewId,
    projectId: candidate.projectId,
    exportJobId: candidate.exportJobId,
    outputName: candidate.outputName,
    format: candidate.format,
    preset: candidate.preset,
    generatedAt: candidate.generatedAt,
    status: candidate.status,
    readyCount: positiveNumber(candidate.readyCount),
    reviewCount: positiveNumber(candidate.reviewCount),
    blockedCount: positiveNumber(candidate.blockedCount),
    downloadCount: positiveNumber(candidate.downloadCount),
    downloadBytes: positiveNumber(candidate.downloadBytes),
    sections,
  };
}

export function compareExportProofBundles(current: ExportProofBundle, imported: ExportProofBundle): ExportProofBundleComparison {
  const currentSections = new Map(current.sections.map((section) => [section.id, section]));
  const importedSections = new Map(imported.sections.map((section) => [section.id, section]));
  const sectionItems = current.sections.map((section) => compareBundleSection(section, importedSections.get(section.id)));
  const items: ExportProofBundleComparisonItem[] = [
    compareText("identity", "Review identity", current.reviewId, imported.reviewId, "Review package id"),
    compareText("project", "Project", current.projectId, imported.projectId, "Project id"),
    compareText("export-job", "Export job", current.exportJobId, imported.exportJobId, "Export job id"),
    compareText("format", "Format and preset", `${current.format}:${current.preset}`, `${imported.format}:${imported.preset}`, "Format/preset"),
    compareNumbers("bundle-status", "Bundle status", statusRank(current.status), statusRank(imported.status), "Proof bundle readiness"),
    ...sectionItems,
    compareNumbers("downloads", "Download history", current.downloadCount, imported.downloadCount, "Recorded download count"),
  ];
  const extraSections = imported.sections.filter((section) => !currentSections.has(section.id));
  for (const section of extraSections) {
    items.push({
      id: `extra-${section.id}`,
      label: `${section.label} extra`,
      status: "attention",
      detail: "Imported proof has a section that the current review does not produce.",
    });
  }

  const matchCount = countComparisonItems(items, "match");
  const attentionCount = countComparisonItems(items, "attention");
  const mismatchCount = countComparisonItems(items, "mismatch");

  return {
    status: mismatchCount > 0 ? "mismatch" : attentionCount > 0 ? "attention" : "match",
    matchCount,
    attentionCount,
    mismatchCount,
    items,
  };
}

function createExportQaSection(snapshot: ExportQaSnapshot | undefined): ExportProofBundleSection {
  if (!snapshot) {
    return {
      id: "export-qa",
      label: "Export QA",
      status: "review",
      summary: "No export QA snapshot",
      detail: "Create the review package from a completed export so the delivery QA snapshot is attached.",
      evidenceCount: 0,
    };
  }

  return {
    id: "export-qa",
    label: "Export QA",
    status: snapshot.status,
    summary: `${snapshot.readyCount} ready / ${snapshot.reviewCount} review / ${snapshot.blockedCount} blocked`,
    detail: `${snapshot.format.toUpperCase()} ${snapshot.preset} QA captured ${snapshot.capturedAt}.`,
    evidenceCount: snapshot.sections.length,
  };
}

function createRenderRouteSection(snapshot: ExportQaSnapshot | undefined): ExportProofBundleSection {
  const route = snapshot?.sections.find((section) => section.id === "render-route");
  if (!snapshot || !route) {
    return {
      id: "render-route",
      label: "Render route",
      status: "review",
      summary: "No render route proof",
      detail: "Export QA must include the browser or desktop render route before reviewers can trust this delivery path.",
      evidenceCount: 0,
    };
  }

  return {
    id: "render-route",
    label: "Render route",
    status: route.status,
    summary: snapshot.renderRouteLabel,
    detail: route.detail,
    evidenceCount: 1,
  };
}

function createMediaAttributionSection(summary: MediaAttributionSummary | undefined): ExportProofBundleSection {
  if (!summary) {
    return {
      id: "media-attribution",
      label: "Media attribution",
      status: "review",
      summary: "No media handoff summary",
      detail: "Attach stock, self-hosted, browser, and desktop media attribution before final reviewer handoff.",
      evidenceCount: 0,
    };
  }

  return {
    id: "media-attribution",
    label: "Media attribution",
    status: summary.status,
    summary: `${summary.itemCount} assets / ${summary.reviewCount} need review`,
    detail: `${summary.stockCount} stock, ${summary.selfHostedCount} self-hosted, ${summary.browserCount} browser, and ${summary.desktopCount} desktop media sources are included.`,
    evidenceCount: summary.itemCount,
  };
}

function createReleaseEvidenceSection(
  summary: ReleaseEvidenceSummary | null | undefined,
  releaseEvidenceLabel: string | undefined,
): ExportProofBundleSection {
  if (!summary) {
    return {
      id: "release-evidence",
      label: "Release evidence",
      status: "review",
      summary: "No release proof loaded",
      detail: "Save or import deployment URL, screenshot, and desktop proof from Settings before final release handoff.",
      evidenceCount: 0,
    };
  }

  const missingOrStale = summary.requirements.filter((requirement) => requirement.status !== "ready");
  return {
    id: "release-evidence",
    label: "Release evidence",
    status: releaseEvidenceStatus(summary.status),
    summary: `${summary.readyCount} of ${summary.total} release checks ready`,
    detail: missingOrStale.length
      ? `${missingOrStale.map((requirement) => requirement.label).join(", ")} still need proof.`
      : releaseEvidenceLabel ?? "Deployment URL, screenshot proof, and desktop proof are ready.",
    evidenceCount: summary.requirements.length,
  };
}

function createDesktopEvidenceSection(
  summary: DesktopLaunchProofSummary | null | undefined,
  desktopEvidenceLabel: string | undefined,
): ExportProofBundleSection {
  if (!summary) {
    return {
      id: "desktop-evidence",
      label: "Desktop evidence",
      status: "review",
      summary: "No desktop proof loaded",
      detail: "Capture or import a desktop evidence packet before claiming native export readiness.",
      evidenceCount: 0,
    };
  }

  return {
    id: "desktop-evidence",
    label: "Desktop evidence",
    status: desktopProofStatus(summary.status),
    summary: `${summary.readyCount} ready / ${summary.limitedCount} limited / ${summary.failedCount} failed / ${summary.missingCount} missing`,
    detail: desktopEvidenceLabel ?? desktopProofDetail(summary.status),
    evidenceCount: summary.total,
  };
}

function createDownloadHistorySection(downloads: ExportReviewDownload[]): ExportProofBundleSection {
  if (!downloads.length) {
    return {
      id: "download-history",
      label: "Download history",
      status: "review",
      summary: "No recorded downloads",
      detail: "Record at least one reviewer download so the delivery handoff has a local audit trail.",
      evidenceCount: 0,
    };
  }

  const latestDownload = [...downloads].sort((first, second) => second.createdAt.localeCompare(first.createdAt))[0];
  return {
    id: "download-history",
    label: "Download history",
    status: "ready",
    summary: `${downloads.length} download ${downloads.length === 1 ? "record" : "records"}`,
    detail: `Latest download ${latestDownload.filename} was recorded ${latestDownload.createdAt}.`,
    evidenceCount: downloads.length,
  };
}

function releaseEvidenceStatus(status: ReleaseEvidenceRequirementStatus): ExportProofBundleStatus {
  return status === "ready" ? "ready" : "review";
}

function desktopProofStatus(status: DesktopLaunchProofStatus): ExportProofBundleStatus {
  if (status === "failed") return "blocked";
  return status === "ready" ? "ready" : "review";
}

function desktopProofDetail(status: DesktopLaunchProofStatus) {
  if (status === "ready") return "Desktop launch, storage, media recovery, render smoke, and export output proof are ready.";
  if (status === "failed") return "Desktop proof has failed checks and should be refreshed before handoff.";
  if (status === "limited") return "Desktop proof has limited checks and should be refreshed before handoff.";
  return "Desktop proof is missing one or more required launch, storage, media, or export checks.";
}

function countSections(sections: ExportProofBundleSection[], status: ExportProofBundleStatus) {
  return sections.filter((section) => section.status === status).length;
}

function normalizeProofBundleSection(value: unknown): ExportProofBundleSection | null {
  if (!value || typeof value !== "object") return null;

  const section = value as Partial<ExportProofBundleSection>;
  if (!section.id || !isProofBundleSectionId(section.id) || !section.label || !isProofBundleStatus(section.status) || !section.summary || !section.detail) {
    return null;
  }

  return {
    id: section.id,
    label: section.label,
    status: section.status,
    summary: section.summary,
    detail: section.detail,
    evidenceCount: positiveNumber(section.evidenceCount),
  };
}

function compareBundleSection(current: ExportProofBundleSection, imported: ExportProofBundleSection | undefined): ExportProofBundleComparisonItem {
  if (!imported) {
    return {
      id: `section-${current.id}`,
      label: current.label,
      status: "mismatch",
      detail: "Imported proof is missing this section.",
    };
  }

  if (current.status !== imported.status) {
    return {
      id: `section-${current.id}`,
      label: current.label,
      status: "attention",
      detail: `Current status is ${current.status}; imported status is ${imported.status}.`,
    };
  }

  if (current.evidenceCount !== imported.evidenceCount) {
    return {
      id: `section-${current.id}`,
      label: current.label,
      status: "attention",
      detail: `Current evidence count is ${current.evidenceCount}; imported evidence count is ${imported.evidenceCount}.`,
    };
  }

  return {
    id: `section-${current.id}`,
    label: current.label,
    status: "match",
    detail: "Section status and evidence count match.",
  };
}

function compareText(id: string, label: string, current: string, imported: string, subject: string): ExportProofBundleComparisonItem {
  return {
    id,
    label,
    status: current === imported ? "match" : "mismatch",
    detail: current === imported ? `${subject} matches.` : `Current ${subject.toLowerCase()} is ${current}; imported ${subject.toLowerCase()} is ${imported}.`,
  };
}

function compareNumbers(id: string, label: string, current: number, imported: number, subject: string): ExportProofBundleComparisonItem {
  return {
    id,
    label,
    status: current === imported ? "match" : "attention",
    detail: current === imported ? `${subject} matches.` : `Current ${subject.toLowerCase()} is ${current}; imported ${subject.toLowerCase()} is ${imported}.`,
  };
}

function countComparisonItems(items: ExportProofBundleComparisonItem[], status: ExportProofBundleComparisonStatus) {
  return items.filter((item) => item.status === status).length;
}

function isProofBundleSectionId(value: string): value is ExportProofBundleSectionId {
  return ["export-qa", "render-route", "media-attribution", "release-evidence", "desktop-evidence", "download-history"].includes(value);
}

function isProofBundleStatus(value: unknown): value is ExportProofBundleStatus {
  return value === "ready" || value === "review" || value === "blocked";
}

function positiveNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;
}

function statusRank(status: ExportProofBundleStatus) {
  if (status === "ready") return 3;
  if (status === "review") return 2;
  return 1;
}
