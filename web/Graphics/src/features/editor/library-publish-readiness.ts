import type { ComponentUsageAnalytics } from "@/features/editor/component-analytics";
import {
  getComponentDocumentationAuditRows,
  getComponentDocumentationSummary,
} from "@/features/editor/component-documentation-readiness";
import type { ComponentInstanceReviewReport } from "@/features/editor/component-instance-review";
import type { ComponentVariableCoverageReport } from "@/features/editor/component-variable-coverage";
import type { LocalLibraryStatus } from "@/features/editor/component-library-manifest";
import type {
  DesignComponent,
  DesignLibraryMetadata,
} from "@/features/editor/types";

export type LibraryPublishReadinessStatus = "ready" | "review" | "blocked";

export type LibraryPublishReadinessItem = {
  id: string;
  label: string;
  detail: string;
  status: LibraryPublishReadinessStatus;
};

export type LibraryPublishReadinessReport = {
  label: string;
  score: number;
  canPublish: boolean;
  readyCount: number;
  reviewCount: number;
  blockedCount: number;
  items: LibraryPublishReadinessItem[];
};

type LibraryPublishReadinessInput = {
  components: DesignComponent[];
  analyticsByComponentId: Record<string, ComponentUsageAnalytics>;
  libraryMetadata?: DesignLibraryMetadata;
  libraryStatus: LocalLibraryStatus;
  instanceReview: ComponentInstanceReviewReport;
  variableCoverage: ComponentVariableCoverageReport;
};

export function getLibraryPublishReadiness({
  components,
  analyticsByComponentId,
  libraryMetadata,
  libraryStatus,
  instanceReview,
  variableCoverage,
}: LibraryPublishReadinessInput): LibraryPublishReadinessReport {
  const documentationSummary = getComponentDocumentationSummary(
    components,
    analyticsByComponentId,
  );
  const auditRows = getComponentDocumentationAuditRows(
    components,
    analyticsByComponentId,
  );
  const componentCount = components.length;
  const examplesReadyCount = auditRows.filter((row) => row.instanceCount > 0)
    .length;
  const variantsReadyCount = auditRows.filter((row) => row.variantCount > 0)
    .length;
  const codeConnectReadyCount = auditRows.filter(
    (row) => row.codeConnectCount > 0,
  ).length;
  const hasExplicitMetadata = Boolean(
    libraryMetadata?.name?.trim() && libraryMetadata.teamName?.trim(),
  );

  const items: LibraryPublishReadinessItem[] = [
    {
      id: "metadata",
      label: "Metadata",
      detail: hasExplicitMetadata
        ? `${libraryMetadata?.name} / ${libraryMetadata?.teamName}`
        : "Library name and team will use local defaults",
      status: hasExplicitMetadata ? "ready" : "review",
    },
    {
      id: "components",
      label: "Components",
      detail:
        componentCount > 0
          ? `${componentCount} component${componentCount === 1 ? "" : "s"} included`
          : "Create at least one component before publishing",
      status: componentCount > 0 ? "ready" : "blocked",
    },
    {
      id: "changes",
      label: "Changes",
      detail:
        libraryStatus.changedCount > 0
          ? `${libraryStatus.changedCount} unpublished component change${
              libraryStatus.changedCount === 1 ? "" : "s"
            }`
          : "No unpublished component changes",
      status: libraryStatus.changedCount > 0 ? "ready" : "review",
    },
    {
      id: "documentation",
      label: "Documentation",
      detail: `${documentationSummary.readyComponents} ready, ${documentationSummary.reviewComponents} review, ${documentationSummary.missingComponents} missing`,
      status: getDocumentationStatus(
        documentationSummary.missingComponents,
        documentationSummary.reviewComponents,
      ),
    },
    {
      id: "examples",
      label: "Examples",
      detail: `${examplesReadyCount} of ${componentCount} component${
        componentCount === 1 ? "" : "s"
      } placed in a file`,
      status: getCoverageStatus(examplesReadyCount, componentCount, "review"),
    },
    {
      id: "variants",
      label: "Variants",
      detail: `${variantsReadyCount} of ${componentCount} component${
        componentCount === 1 ? "" : "s"
      } define variants`,
      status: getCoverageStatus(variantsReadyCount, componentCount, "review"),
    },
    {
      id: "code-connect",
      label: "Code Connect",
      detail: `${codeConnectReadyCount} of ${componentCount} component${
        componentCount === 1 ? "" : "s"
      } mapped to code`,
      status: getCoverageStatus(
        codeConnectReadyCount,
        componentCount,
        "review",
      ),
    },
    {
      id: "variable-coverage",
      label: "Variable coverage",
      detail: `${variableCoverage.coveragePercent}% coverage, ${variableCoverage.matchingRawPropertyCount} raw propert${
        variableCoverage.matchingRawPropertyCount === 1 ? "y" : "ies"
      } ready to bind`,
      status: getVariableCoverageStatus(variableCoverage),
    },
    {
      id: "source-state",
      label: "Source state",
      detail: `${instanceReview.pendingUpdateInstanceCount} pending, ${instanceReview.staleInstanceCount} stale, ${instanceReview.detachedInstanceCount} detached instances`,
      status: getSourceStateStatus(instanceReview),
    },
  ];
  const readyCount = items.filter((item) => item.status === "ready").length;
  const reviewCount = items.filter((item) => item.status === "review").length;
  const blockedCount = items.filter((item) => item.status === "blocked").length;
  const score = Math.round(
    ((readyCount + reviewCount * 0.5) / items.length) * 100,
  );

  return {
    label: getReadinessLabel(blockedCount, reviewCount),
    score,
    canPublish: blockedCount === 0,
    readyCount,
    reviewCount,
    blockedCount,
    items,
  };
}

export function getLibraryPublishReadinessCsv(
  report: LibraryPublishReadinessReport,
) {
  const header: Array<keyof LibraryPublishReadinessItem> = [
    "id",
    "label",
    "status",
    "detail",
  ];

  return [
    ["score", report.score].map(escapeCsvCell).join(","),
    ["label", report.label].map(escapeCsvCell).join(","),
    ["canPublish", report.canPublish ? "yes" : "no"].map(escapeCsvCell).join(
      ",",
    ),
    "",
    header.join(","),
    ...report.items.map((item) =>
      header.map((key) => escapeCsvCell(item[key])).join(","),
    ),
  ].join("\n");
}

function getDocumentationStatus(
  missingCount: number,
  reviewCount: number,
): LibraryPublishReadinessStatus {
  if (missingCount > 0) {
    return "blocked";
  }

  if (reviewCount > 0) {
    return "review";
  }

  return "ready";
}

function getCoverageStatus(
  readyCount: number,
  totalCount: number,
  emptyStatus: LibraryPublishReadinessStatus,
): LibraryPublishReadinessStatus {
  if (totalCount === 0) {
    return emptyStatus;
  }

  if (readyCount === totalCount) {
    return "ready";
  }

  return "review";
}

function getSourceStateStatus(
  instanceReview: ComponentInstanceReviewReport,
): LibraryPublishReadinessStatus {
  if (instanceReview.pendingUpdateInstanceCount > 0) {
    return "blocked";
  }

  if (
    instanceReview.staleInstanceCount > 0 ||
    instanceReview.detachedInstanceCount > 0
  ) {
    return "review";
  }

  return "ready";
}

function getVariableCoverageStatus(
  report: ComponentVariableCoverageReport,
): LibraryPublishReadinessStatus {
  if (report.componentCount === 0) {
    return "review";
  }

  if (report.coveragePercent >= 80) {
    return "ready";
  }

  if (report.coveragePercent >= 40 || report.matchingRawPropertyCount > 0) {
    return "review";
  }

  return "blocked";
}

function getReadinessLabel(blockedCount: number, reviewCount: number) {
  if (blockedCount > 0) {
    return "Blocked";
  }

  if (reviewCount > 0) {
    return "Needs review";
  }

  return "Ready";
}

function escapeCsvCell(value: string | number) {
  const text = String(value);

  if (!/[",\n]/.test(text)) {
    return text;
  }

  return `"${text.replace(/"/g, '""')}"`;
}
