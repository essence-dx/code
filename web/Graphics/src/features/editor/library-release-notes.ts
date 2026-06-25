import type { ComponentAnalyticsSummary } from "@/features/editor/component-analytics";
import type { ComponentDependencyReviewReport } from "@/features/editor/component-dependency-review";
import type { ComponentDocumentationSummary } from "@/features/editor/component-documentation-readiness";
import type { ComponentInstanceReviewReport } from "@/features/editor/component-instance-review";
import {
  getComponentLibrarySignature,
  type LocalLibraryStatus,
} from "@/features/editor/component-library-manifest";
import type { DesignTokenDriftReport } from "@/features/editor/design-token-drift-review";
import type {
  LibraryPublishReadinessItem,
  LibraryPublishReadinessReport,
} from "@/features/editor/library-publish-readiness";
import type { DesignComponent, DesignDocument } from "@/features/editor/types";

export type LibraryReleaseNotesReport = {
  title: string;
  subtitle: string;
  summary: string;
  notes: string;
  blockerCount: number;
  reviewCount: number;
};

type LibraryReleaseNotesInput = {
  document: DesignDocument;
  components: DesignComponent[];
  analyticsSummary: ComponentAnalyticsSummary;
  documentationSummary: ComponentDocumentationSummary;
  dependencyReview: ComponentDependencyReviewReport;
  instanceReview: ComponentInstanceReviewReport;
  libraryStatus: LocalLibraryStatus;
  publishReadiness: LibraryPublishReadinessReport;
  tokenDrift: DesignTokenDriftReport;
};

export function getLibraryReleaseNotes({
  document,
  components,
  analyticsSummary,
  documentationSummary,
  dependencyReview,
  instanceReview,
  libraryStatus,
  publishReadiness,
  tokenDrift,
}: LibraryReleaseNotesInput): LibraryReleaseNotesReport {
  const libraryName =
    document.libraryMetadata?.name?.trim() || "Essence Component Library";
  const targetVersion = (document.libraryMetadata?.version ?? 0) + 1;
  const changedComponents = getChangedComponents(document, components);
  const blockers = publishReadiness.items.filter(
    (item) => item.status === "blocked",
  );
  const reviews = publishReadiness.items.filter(
    (item) => item.status === "review",
  );
  const notes = [
    `# ${libraryName} v${targetVersion} Release Notes`,
    "",
    `Readiness: ${publishReadiness.label} (${publishReadiness.score}/100)`,
    "",
    "## Library",
    `- Components: ${analyticsSummary.componentCount}`,
    `- Instances in files: ${analyticsSummary.instanceCount}`,
    `- Unpublished component changes: ${libraryStatus.changedCount}`,
    `- Pending imported updates: ${libraryStatus.pendingUpdateCount}`,
    `- Detached library components: ${libraryStatus.detachedCount}`,
    "",
    "## Component Changes",
    ...formatList(
      changedComponents.map((component) => `${component.name} (${component.kind})`),
      "No changed components detected against the last published signatures.",
    ),
    "",
    "## Documentation",
    `- Ready components: ${documentationSummary.readyComponents}`,
    `- Needs review: ${documentationSummary.reviewComponents}`,
    `- Missing docs: ${documentationSummary.missingComponents}`,
    "",
    "## Tokens And Styles",
    `- Variables: ${
      Object.keys(document.variableDefinitions ?? document.variables ?? {})
        .length
    }`,
    `- Saved styles: ${getSavedStyleCount(document)}`,
    `- Token drift: ${tokenDrift.driftCount}`,
    `- Unpaired style properties: ${tokenDrift.unpairedCount}`,
    "",
    "## Dependencies",
    `- Component dependencies: ${dependencyReview.dependencyCount}`,
    `- Nested component layers: ${dependencyReview.nestedLayerCount}`,
    `- Dependency issues: ${dependencyReview.issueCount}`,
    "",
    "## Source State",
    `- Stale instances: ${instanceReview.staleInstanceCount}`,
    `- Detached instances: ${instanceReview.detachedInstanceCount}`,
    `- Affected components: ${instanceReview.affectedComponentCount}`,
    "",
    "## Publish Blockers",
    ...formatReadinessItems(blockers, "No blocking publish items."),
    "",
    "## Review Items",
    ...formatReadinessItems(reviews, "No review items."),
  ].join("\n");

  return {
    title: `${libraryName} v${targetVersion}`,
    subtitle: `${publishReadiness.label} / ${publishReadiness.score}`,
    summary: `${changedComponents.length} changed components, ${blockers.length} blockers, ${reviews.length} review items`,
    notes,
    blockerCount: blockers.length,
    reviewCount: reviews.length,
  };
}

function getChangedComponents(
  document: DesignDocument,
  components: DesignComponent[],
) {
  const signatures = document.libraryMetadata?.componentSignatures ?? {};

  return components
    .map((component) => {
      const publishedSignature = signatures[component.id];
      const signature = getComponentLibrarySignature(component);

      if (!publishedSignature) {
        return { name: component.name, kind: "new" };
      }

      if (publishedSignature !== signature) {
        return { name: component.name, kind: "changed" };
      }

      return null;
    })
    .filter((component): component is { name: string; kind: string } =>
      Boolean(component),
    );
}

function formatList(items: string[], fallback: string) {
  return items.length > 0
    ? items.map((item) => `- ${item}`)
    : [`- ${fallback}`];
}

function formatReadinessItems(
  items: LibraryPublishReadinessItem[],
  fallback: string,
) {
  return items.length > 0
    ? items.map((item) => `- ${item.label}: ${item.detail}`)
    : [`- ${fallback}`];
}

function getSavedStyleCount(document: DesignDocument) {
  return (
    Object.keys(document.paintStyles ?? {}).length +
    Object.keys(document.textStyles ?? {}).length +
    Object.keys(document.effectStyles ?? {}).length +
    Object.keys(document.layoutGridStyles ?? {}).length +
    Object.keys(document.layoutPresetStyles ?? {}).length
  );
}
