import type { ComponentAnalyticsSummary } from "@/features/editor/component-analytics";
import type { ComponentDependencyReviewReport } from "@/features/editor/component-dependency-review";
import type { ComponentDocumentationSummary } from "@/features/editor/component-documentation-readiness";
import type { ComponentInstanceReviewReport } from "@/features/editor/component-instance-review";
import type { ComponentVariableCoverageReport } from "@/features/editor/component-variable-coverage";
import type { LocalLibraryStatus } from "@/features/editor/component-library-manifest";
import type { DesignTokenDriftReport } from "@/features/editor/design-token-drift-review";
import type { LibraryPublishReadinessReport } from "@/features/editor/library-publish-readiness";
import type { LibraryPublishRiskReport } from "@/features/editor/library-publish-risk";
import type { LibraryReleaseApprovalReport } from "@/features/editor/library-release-approval";
import type { LibraryReleaseNotesReport } from "@/features/editor/library-release-notes";
import type { DesignComponent, DesignDocument } from "@/features/editor/types";

export const libraryReleaseArchiveType = "essence.library-release-archive";

export type LibraryReleaseArchiveIntegrity = {
  algorithm: "fnv1a-32-stable-json";
  payloadHash: string;
  payloadLength: number;
  componentCount: number;
  reportRowCount: number;
};

export type LibraryReleaseArchive = {
  type: typeof libraryReleaseArchiveType;
  version: 1;
  exportedAt: string;
  integrity: LibraryReleaseArchiveIntegrity;
  library: {
    id: string;
    name: string;
    teamName: string;
    currentVersion: number;
    targetVersion: number;
    componentCount: number;
  };
  components: Array<{
    id: string;
    name: string;
    layerCount: number;
    variantCount: number;
    updatedAt: string;
  }>;
  releaseNotes: LibraryReleaseNotesReport;
  reports: {
    analytics: ComponentAnalyticsSummary;
    documentation: ComponentDocumentationSummary;
    dependency: ComponentDependencyReviewReport;
    instance: ComponentInstanceReviewReport;
    libraryStatus: LocalLibraryStatus;
    publishReadiness: LibraryPublishReadinessReport;
    publishRisk: LibraryPublishRiskReport;
    releaseApproval?: LibraryReleaseApprovalReport;
    tokenDrift: DesignTokenDriftReport;
    variableCoverage: ComponentVariableCoverageReport;
  };
};

export type LibraryReleaseArchiveVerification = {
  valid: boolean;
  expectedHash: string;
  actualHash: string;
  detail: string;
};

export type LibraryReleaseArchiveComparison = {
  componentDelta: number;
  currentOnlyCount: number;
  archivedOnlyCount: number;
  readinessDelta: number;
  riskDelta: number;
  versionChanged: boolean;
  detail: string;
};

export type LibraryReleaseArchiveImportSummary = {
  libraryName: string;
  teamName: string;
  targetVersion: number;
  exportedAt: string;
  payloadHash: string;
  componentCount: number;
  reportRowCount: number;
  readinessScore: number;
  riskScore: number;
  approvalOpenCount: number;
};

type LibraryReleaseArchivePayload = Omit<
  LibraryReleaseArchive,
  "exportedAt" | "integrity"
>;

type LibraryReleaseArchiveInput = {
  document: DesignDocument;
  components: DesignComponent[];
  analyticsSummary: ComponentAnalyticsSummary;
  documentationSummary: ComponentDocumentationSummary;
  dependencyReview: ComponentDependencyReviewReport;
  instanceReview: ComponentInstanceReviewReport;
  libraryStatus: LocalLibraryStatus;
  publishReadiness: LibraryPublishReadinessReport;
  publishRisk: LibraryPublishRiskReport;
  releaseNotes: LibraryReleaseNotesReport;
  tokenDrift: DesignTokenDriftReport;
  variableCoverage: ComponentVariableCoverageReport;
};

export function createLibraryReleaseArchive({
  document,
  components,
  analyticsSummary,
  documentationSummary,
  dependencyReview,
  instanceReview,
  libraryStatus,
  publishReadiness,
  publishRisk,
  releaseNotes,
  tokenDrift,
  variableCoverage,
}: LibraryReleaseArchiveInput): LibraryReleaseArchive {
  const currentVersion = document.libraryMetadata?.version ?? 0;
  const payload: LibraryReleaseArchivePayload = {
    type: libraryReleaseArchiveType,
    version: 1,
    library: {
      id: document.libraryMetadata?.id ?? "local-library",
      name:
        document.libraryMetadata?.name?.trim() || "Essence Component Library",
      teamName: document.libraryMetadata?.teamName?.trim() || "Personal",
      currentVersion,
      targetVersion: currentVersion + 1,
      componentCount: components.length,
    },
    components: components.map((component) => ({
      id: component.id,
      name: component.name,
      layerCount: component.layers.length,
      variantCount: component.variants?.length ?? 0,
      updatedAt: component.updatedAt,
    })),
    releaseNotes,
    reports: {
      analytics: analyticsSummary,
      documentation: documentationSummary,
      dependency: dependencyReview,
      instance: instanceReview,
      libraryStatus,
      publishReadiness,
      publishRisk,
      tokenDrift,
      variableCoverage,
    },
  };

  return {
    ...payload,
    exportedAt: new Date().toISOString(),
    integrity: getArchiveIntegrity(payload),
  };
}

export function withLibraryReleaseApprovalReport(
  archive: LibraryReleaseArchive,
  releaseApproval: LibraryReleaseApprovalReport,
): LibraryReleaseArchive {
  const payload: LibraryReleaseArchivePayload = getArchivePayload({
    ...archive,
    reports: {
      ...archive.reports,
      releaseApproval,
    },
  });

  return {
    ...payload,
    exportedAt: new Date().toISOString(),
    integrity: getArchiveIntegrity(payload),
  };
}

export function verifyLibraryReleaseArchiveIntegrity(
  archive: LibraryReleaseArchive,
): LibraryReleaseArchiveVerification {
  if (archive.type !== libraryReleaseArchiveType) {
    return {
      valid: false,
      expectedHash: archive.integrity?.payloadHash ?? "unknown",
      actualHash: "invalid-type",
      detail: "The selected JSON file is not an Essence release archive.",
    };
  }

  const actualIntegrity = getArchiveIntegrity(getArchivePayload(archive));
  const valid =
    archive.integrity?.algorithm === actualIntegrity.algorithm &&
    archive.integrity.payloadHash === actualIntegrity.payloadHash &&
    archive.integrity.payloadLength === actualIntegrity.payloadLength;

  return {
    valid,
    expectedHash: archive.integrity?.payloadHash ?? "missing",
    actualHash: actualIntegrity.payloadHash,
    detail: valid
      ? "Archive payload matches its stored integrity metadata."
      : "Archive payload does not match its stored integrity metadata.",
  };
}

export function compareLibraryReleaseArchives(
  currentArchive: LibraryReleaseArchive,
  archivedRelease: LibraryReleaseArchive,
): LibraryReleaseArchiveComparison {
  const currentIds = new Set(
    currentArchive.components.map((component) => component.id),
  );
  const archivedIds = new Set(
    archivedRelease.components.map((component) => component.id),
  );
  const currentOnlyCount = currentArchive.components.filter(
    (component) => !archivedIds.has(component.id),
  ).length;
  const archivedOnlyCount = archivedRelease.components.filter(
    (component) => !currentIds.has(component.id),
  ).length;
  const readinessDelta =
    currentArchive.reports.publishReadiness.score -
    archivedRelease.reports.publishReadiness.score;
  const riskDelta =
    currentArchive.reports.publishRisk.score -
    archivedRelease.reports.publishRisk.score;
  const versionChanged =
    currentArchive.library.targetVersion !== archivedRelease.library.targetVersion;

  return {
    componentDelta:
      currentArchive.library.componentCount - archivedRelease.library.componentCount,
    currentOnlyCount,
    archivedOnlyCount,
    readinessDelta,
    riskDelta,
    versionChanged,
    detail: getArchiveComparisonDetail({
      currentOnlyCount,
      archivedOnlyCount,
      readinessDelta,
      riskDelta,
      versionChanged,
    }),
  };
}

export function getLibraryReleaseArchiveImportSummary(
  archive: LibraryReleaseArchive,
): LibraryReleaseArchiveImportSummary {
  return {
    libraryName: archive.library.name,
    teamName: archive.library.teamName,
    targetVersion: archive.library.targetVersion,
    exportedAt: archive.exportedAt,
    payloadHash: archive.integrity?.payloadHash ?? "missing",
    componentCount: archive.library.componentCount,
    reportRowCount: archive.integrity?.reportRowCount ?? 0,
    readinessScore: archive.reports.publishReadiness.score,
    riskScore: archive.reports.publishRisk.score,
    approvalOpenCount: archive.reports.releaseApproval?.outstandingCount ?? 0,
  };
}

function getArchiveComparisonDetail({
  currentOnlyCount,
  archivedOnlyCount,
  readinessDelta,
  riskDelta,
  versionChanged,
}: Omit<LibraryReleaseArchiveComparison, "componentDelta" | "detail">) {
  if (
    currentOnlyCount === 0 &&
    archivedOnlyCount === 0 &&
    readinessDelta === 0 &&
    riskDelta === 0 &&
    !versionChanged
  ) {
    return "Current release archive matches the imported archive summary.";
  }

  return "Current release archive differs from the imported archive summary.";
}

function getArchivePayload(
  archive: LibraryReleaseArchive,
): LibraryReleaseArchivePayload {
  return {
    type: archive.type,
    version: archive.version,
    library: archive.library,
    components: archive.components,
    releaseNotes: archive.releaseNotes,
    reports: archive.reports,
  };
}

function getArchiveIntegrity(
  payload: LibraryReleaseArchivePayload,
): LibraryReleaseArchiveIntegrity {
  const normalizedPayload = stableStringify(payload);

  return {
    algorithm: "fnv1a-32-stable-json",
    payloadHash: getFnv1aHash(normalizedPayload),
    payloadLength: normalizedPayload.length,
    componentCount: payload.components.length,
    reportRowCount:
      payload.reports.dependency.rows.length +
      payload.reports.instance.rows.length +
      payload.reports.publishReadiness.items.length +
      payload.reports.publishRisk.items.length +
      (payload.reports.releaseApproval?.items.length ?? 0) +
      payload.reports.tokenDrift.rows.length +
      payload.reports.variableCoverage.rows.length,
  };
}

function stableStringify(value: unknown): string {
  if (value === undefined) {
    return "null";
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => {
        const record = value as Record<string, unknown>;
        return `${JSON.stringify(key)}:${stableStringify(record[key])}`;
      })
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function getFnv1aHash(value: string) {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
}
