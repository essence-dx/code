"use client";

import { useMemo, useState } from "react";
import { Boxes, Download, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ComponentCard } from "@/features/editor/components/component-card";
import { ComponentDependencyReviewSection } from "@/features/editor/components/component-dependency-review-section";
import { ComponentInstanceReviewSection } from "@/features/editor/components/component-instance-review-section";
import { ComponentIntegrityReviewSection } from "@/features/editor/components/component-integrity-review-section";
import { ComponentLibraryControls } from "@/features/editor/components/component-library-controls";
import { ComponentMarketplaceReadinessSection } from "@/features/editor/components/component-marketplace-readiness-section";
import { ComponentOverrideReviewSection } from "@/features/editor/components/component-override-review-section";
import { ComponentUsageIntelligenceSection } from "@/features/editor/components/component-usage-intelligence-section";
import { ComponentVariableBindingReviewSection } from "@/features/editor/components/component-variable-binding-review-section";
import { ComponentVariableCoverageSection } from "@/features/editor/components/component-variable-coverage-section";
import { DesignSystemLibraryPublicationDepthPanel } from "@/features/editor/components/design-system-library-publication-depth-panel";
import type {
  ComponentPropertyDefinitionPatch,
  ComponentSlotPatch,
} from "@/features/editor/component-definition-document";
import {
  getComponentAnalyticsSummary,
  getComponentUsageAnalytics,
} from "@/features/editor/component-analytics";
import {
  getComponentDocumentationCsv,
  getComponentDocumentationSummary,
  needsComponentDocumentationReview,
} from "@/features/editor/component-documentation-readiness";
import { getComponentDependencyReview } from "@/features/editor/component-dependency-review";
import {
  getComponentIntegrityReview,
  getComponentReferenceRepairPatches,
} from "@/features/editor/component-integrity-review";
import { getComponentInstanceReview } from "@/features/editor/component-instance-review";
import { getComponentMarketplaceReadiness } from "@/features/editor/component-marketplace-readiness";
import { getComponentOverrideReview } from "@/features/editor/component-override-review";
import { getComponentUsageIntelligenceReport } from "@/features/editor/component-usage-intelligence";
import { getComponentVariableBindingReview } from "@/features/editor/component-variable-binding-review";
import { getComponentVariableCoverageReport } from "@/features/editor/component-variable-coverage";
import { getComponentPropertyDefinitions } from "@/features/editor/component-properties";
import { getComponentSlotName } from "@/features/editor/component-slots";
import { getDesignTokenDriftReview } from "@/features/editor/design-token-drift-review";
import { getDesignSystemLibraryPublicationDepthReport } from "@/features/editor/design-system-library-publication-depth";
import type { LocalLibraryStatus } from "@/features/editor/component-library-manifest";
import { createLibraryReleaseArchive } from "@/features/editor/library-release-archive";
import { getLibraryPublishReadiness } from "@/features/editor/library-publish-readiness";
import { getLibraryPublishRiskReport } from "@/features/editor/library-publish-risk";
import { getLibraryReleaseNotes } from "@/features/editor/library-release-notes";
import type {
  ComponentUsageAnalytics,
} from "@/features/editor/component-analytics";
import type { LayerPatch } from "@/features/editor/document-utils";
import type {
  DesignComponent,
  DesignComponentPropertyType,
  DesignDocument,
  DesignLibraryMetadata,
  DesignPage,
} from "@/features/editor/types";

type ComponentReviewFilter =
  | "all"
  | "used"
  | "unused"
  | "updates"
  | "detached"
  | "variants"
  | "docs"
  | "stale"
  | "deps";

type ComponentsPanelProps = {
  document: DesignDocument;
  components: DesignComponent[];
  pages: DesignPage[];
  libraryMetadata?: DesignLibraryMetadata;
  libraryStatus: LocalLibraryStatus;
  pendingLibraryComponentUpdates: Record<string, DesignComponent>;
  canCreateVariant: boolean;
  onUpdateLibraryMetadata: (
    patch: Partial<Pick<DesignLibraryMetadata, "name" | "teamName">>,
  ) => void;
  onPublishLibrary: () => void;
  onExportLibrary: () => void;
  onExportDesignSystemPackage: () => void;
  onImportLibrary: (file: File) => void;
  onAcceptLibraryUpdate: (componentId: string) => void;
  onDetachLibraryComponent: (componentId: string) => void;
  onInsertComponent: (componentId: string, variantId?: string) => void;
  onCreateVariant: (componentId: string) => void;
  onRenameComponent: (componentId: string, name: string) => void;
  onRenameVariant: (
    componentId: string,
    variantId: string,
    name: string,
  ) => void;
  onAddPropertyDefinition: (
    componentId: string,
    type: DesignComponentPropertyType,
  ) => void;
  onUpdatePropertyDefinition: (
    componentId: string,
    definitionId: string,
    patch: ComponentPropertyDefinitionPatch,
  ) => void;
  onDeletePropertyDefinition: (
    componentId: string,
    definitionId: string,
  ) => void;
  onUpdateSlot: (
    componentId: string,
    sourceLayerId: string,
    patch: ComponentSlotPatch,
  ) => void;
  onDeleteComponent: (componentId: string) => void;
  onDeleteVariant: (componentId: string, variantId: string) => void;
  onRepairComponentReferences: (patches: LayerPatch[]) => void;
  onResetComponentInstance: (layerId: string) => void;
  onSelectLayers: (layerIds: string[]) => void;
  onBindMatchingComponentVariables: (matchCount: number) => void;
  onRemoveStaleComponentVariableBindings: (issueCount: number) => void;
};

export function ComponentsPanel({
  document,
  components,
  pages,
  libraryMetadata,
  libraryStatus,
  pendingLibraryComponentUpdates,
  canCreateVariant,
  onUpdateLibraryMetadata,
  onPublishLibrary,
  onExportLibrary,
  onExportDesignSystemPackage,
  onImportLibrary,
  onAcceptLibraryUpdate,
  onDetachLibraryComponent,
  onInsertComponent,
  onCreateVariant,
  onRenameComponent,
  onRenameVariant,
  onAddPropertyDefinition,
  onUpdatePropertyDefinition,
  onDeletePropertyDefinition,
  onUpdateSlot,
  onDeleteComponent,
  onDeleteVariant,
  onRepairComponentReferences,
  onResetComponentInstance,
  onSelectLayers,
  onBindMatchingComponentVariables,
  onRemoveStaleComponentVariableBindings,
}: ComponentsPanelProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ComponentReviewFilter>("all");
  const analyticsByComponentId = useMemo(
    () => getComponentUsageAnalytics(components, pages),
    [components, pages],
  );
  const analyticsSummary = useMemo(
    () => getComponentAnalyticsSummary(components, analyticsByComponentId),
    [analyticsByComponentId, components],
  );
  const usageIntelligence = useMemo(
    () =>
      getComponentUsageIntelligenceReport({
        activityEvents: document.activityEvents ?? [],
        analyticsByComponentId,
        components,
        pages,
        pendingUpdates: pendingLibraryComponentUpdates,
      }),
    [
      analyticsByComponentId,
      components,
      document.activityEvents,
      pages,
      pendingLibraryComponentUpdates,
    ],
  );
  const documentationSummary = useMemo(
    () => getComponentDocumentationSummary(components, analyticsByComponentId),
    [analyticsByComponentId, components],
  );
  const dependencyReview = useMemo(
    () => getComponentDependencyReview(components),
    [components],
  );
  const marketplaceReadiness = useMemo(
    () =>
      getComponentMarketplaceReadiness({
        activityEvents: document.activityEvents ?? [],
        analyticsByComponentId,
        components,
        dependencyReview,
        libraryMetadata,
        libraryStatus,
        pages,
        pendingUpdates: pendingLibraryComponentUpdates,
      }),
    [
      analyticsByComponentId,
      components,
      dependencyReview,
      document.activityEvents,
      libraryMetadata,
      libraryStatus,
      pages,
      pendingLibraryComponentUpdates,
    ],
  );
  const integrityReview = useMemo(
    () => getComponentIntegrityReview(components, pages, analyticsByComponentId),
    [analyticsByComponentId, components, pages],
  );
  const variableCoverage = useMemo(
    () => getComponentVariableCoverageReport(document, components),
    [components, document],
  );
  const variableBindingReview = useMemo(
    () => getComponentVariableBindingReview(document, components),
    [components, document],
  );
  const activePage = useMemo(
    () =>
      pages.find((page) => page.id === document.activePageId) ??
      pages[0] ?? {
        id: "missing",
        name: "Missing page",
        background: "#ffffff",
        layers: [],
      },
    [document.activePageId, pages],
  );
  const componentReferenceRepairPatches = useMemo(
    () => getComponentReferenceRepairPatches(activePage, components),
    [activePage, components],
  );
  const tokenDrift = useMemo(
    () => getDesignTokenDriftReview(document),
    [document],
  );
  const instanceReview = useMemo(
    () =>
      getComponentInstanceReview(
        components,
        pages,
        pendingLibraryComponentUpdates,
      ),
    [components, pages, pendingLibraryComponentUpdates],
  );
  const overrideReview = useMemo(
    () =>
      getComponentOverrideReview({
        activePageId: document.activePageId,
        analyticsByComponentId,
        components,
        pages,
      }),
    [analyticsByComponentId, components, document.activePageId, pages],
  );
  const publishReadiness = useMemo(
    () =>
      getLibraryPublishReadiness({
        components,
        analyticsByComponentId,
        libraryMetadata,
        libraryStatus,
        instanceReview,
        variableCoverage,
      }),
    [
      analyticsByComponentId,
      components,
      instanceReview,
      libraryMetadata,
      libraryStatus,
      variableCoverage,
    ],
  );
  const publishRisk = useMemo(
    () =>
      getLibraryPublishRiskReport({
        document,
        libraryStatus,
        publishReadiness,
      }),
    [document, libraryStatus, publishReadiness],
  );
  const releaseNotes = useMemo(
    () =>
      getLibraryReleaseNotes({
        document,
        components,
        analyticsSummary,
        documentationSummary,
        dependencyReview,
        instanceReview,
        libraryStatus,
        publishReadiness,
        tokenDrift,
      }),
    [
      analyticsSummary,
      components,
      dependencyReview,
      document,
      documentationSummary,
      instanceReview,
      libraryStatus,
      publishReadiness,
      tokenDrift,
    ],
  );
  const releaseArchive = useMemo(
    () =>
      createLibraryReleaseArchive({
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
      }),
    [
      analyticsSummary,
      components,
      dependencyReview,
      document,
      documentationSummary,
      instanceReview,
      libraryStatus,
      publishReadiness,
      publishRisk,
      releaseNotes,
      tokenDrift,
      variableCoverage,
    ],
  );
  const libraryPublicationDepth = useMemo(
    () =>
      getDesignSystemLibraryPublicationDepthReport({
        analyticsByComponentId,
        components,
        document,
        libraryStatus,
        pendingUpdates: pendingLibraryComponentUpdates,
        releaseArchive,
      }),
    [
      analyticsByComponentId,
      components,
      document,
      libraryStatus,
      pendingLibraryComponentUpdates,
      releaseArchive,
    ],
  );
  const filteredComponents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return components.filter((component) => {
      if (
        !matchesComponentReviewFilter(
          component,
          analyticsByComponentId[component.id],
          pendingLibraryComponentUpdates,
          instanceReview.byComponentId,
          dependencyReview.byComponentId,
          filter,
        )
      ) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const searchableValues = [
        component.name,
        ...component.layers.map(getComponentSlotName),
        ...Object.values(getComponentPropertyDefinitions(component)).flatMap(
          (definition) => [
            definition.name,
            definition.defaultValue,
            ...(definition.options ?? []),
          ],
        ),
        ...(component.variants ?? []).flatMap((variant) => [
          variant.name,
          ...Object.values(variant.properties),
        ]),
      ];

      return searchableValues.some((value) =>
        value.toLowerCase().includes(normalizedQuery),
      );
    });
  }, [
    analyticsByComponentId,
    components,
    dependencyReview.byComponentId,
    filter,
    instanceReview.byComponentId,
    pendingLibraryComponentUpdates,
    query,
  ]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex h-11 items-center px-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Components
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-2 p-2">
          <ComponentLibraryControls
            libraryMetadata={libraryMetadata}
            libraryStatus={libraryStatus}
            publishReadiness={publishReadiness}
            publishRisk={publishRisk}
            releaseNotes={releaseNotes}
            releaseArchive={releaseArchive}
            components={components}
            pendingUpdates={pendingLibraryComponentUpdates}
            onUpdateLibraryMetadata={onUpdateLibraryMetadata}
            onPublishLibrary={onPublishLibrary}
            onExportLibrary={onExportLibrary}
            onExportDesignSystemPackage={onExportDesignSystemPackage}
            onImportLibrary={onImportLibrary}
            onAcceptLibraryUpdate={onAcceptLibraryUpdate}
            onReviewDocumentation={() => setFilter("docs")}
            onReviewStaleInstances={() => setFilter("stale")}
            onAcceptAllLibraryUpdates={() => {
              Object.keys(pendingLibraryComponentUpdates).forEach(
                onAcceptLibraryUpdate,
              );
            }}
          />
          <DesignSystemLibraryPublicationDepthPanel
            report={libraryPublicationDepth}
          />
          {components.length > 0 ? (
            <>
              <div className="grid grid-cols-4 gap-1.5">
                <ComponentMetric
                  label="Components"
                  value={analyticsSummary.componentCount}
                />
                <ComponentMetric
                  label="Instances"
                  value={analyticsSummary.instanceCount}
                />
                <ComponentMetric
                  label="Updates"
                  value={analyticsSummary.updateAvailableCount}
                />
                <ComponentMetric
                  label="Detached"
                  value={analyticsSummary.detachedLibraryCount}
                />
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                <ComponentMetric
                  label="Docs score"
                  value={documentationSummary.averageScore}
                />
                <ComponentMetric
                  label="Docs ready"
                  value={documentationSummary.readyComponents}
                />
                <ComponentMetric
                  label="Review"
                  value={documentationSummary.reviewComponents}
                />
                <ComponentMetric
                  label="Missing"
                  value={documentationSummary.missingComponents}
                />
              </div>
              <ComponentInstanceReviewSection
                report={instanceReview}
                onAcceptLibraryUpdate={onAcceptLibraryUpdate}
              />
              <ComponentUsageIntelligenceSection
                report={usageIntelligence}
                onSelectLayers={onSelectLayers}
              />
              <ComponentMarketplaceReadinessSection
                report={marketplaceReadiness}
                onAcceptLibraryUpdate={onAcceptLibraryUpdate}
                onSelectLayers={onSelectLayers}
              />
              <ComponentOverrideReviewSection
                activePageId={document.activePageId}
                report={overrideReview}
                onResetComponentInstance={onResetComponentInstance}
                onSelectLayers={onSelectLayers}
              />
              <ComponentIntegrityReviewSection
                review={integrityReview}
                repairableReferenceCount={componentReferenceRepairPatches.length}
                onRepairActivePageReferences={() =>
                  onRepairComponentReferences(componentReferenceRepairPatches)
                }
              />
              <ComponentVariableCoverageSection
                report={variableCoverage}
                onBindMatchingVariables={() =>
                  onBindMatchingComponentVariables(
                    variableCoverage.matchingRawPropertyCount,
                  )
                }
              />
              <ComponentVariableBindingReviewSection
                review={variableBindingReview}
                onRemoveStaleBindings={onRemoveStaleComponentVariableBindings}
              />
              <ComponentDependencyReviewSection report={dependencyReview} />
            </>
          ) : null}
          {components.length > 0 ? (
            <div className="flex flex-wrap gap-1 rounded-md border border-border bg-background p-1">
              {componentReviewFilters.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={
                    filter === item.id
                      ? "rounded-sm bg-secondary px-2 py-1 text-xs text-secondary-foreground"
                      : "rounded-sm px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
                  }
                  onClick={() => setFilter(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ) : null}
          {components.length > 0 ? (
            <div className="flex gap-1.5">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  placeholder="Search components"
                  className="h-8 pl-8"
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 shrink-0"
                onClick={() =>
                  exportComponentDocumentationCsv(
                    filteredComponents,
                    analyticsByComponentId,
                  )
                }
              >
                <Download className="size-3.5" />
                CSV
              </Button>
            </div>
          ) : null}
          {filteredComponents.length > 0 ? (
            filteredComponents.map((component) => (
              <ComponentCard
                key={component.id}
                component={component}
                analytics={analyticsByComponentId[component.id]}
                canCreateVariant={canCreateVariant}
                onInsertComponent={onInsertComponent}
                onCreateVariant={onCreateVariant}
                onRenameComponent={onRenameComponent}
                onRenameVariant={onRenameVariant}
                onAddPropertyDefinition={onAddPropertyDefinition}
                onUpdatePropertyDefinition={onUpdatePropertyDefinition}
                onDeletePropertyDefinition={onDeletePropertyDefinition}
                onUpdateSlot={onUpdateSlot}
                onDeleteComponent={onDeleteComponent}
                onDeleteVariant={onDeleteVariant}
                onDetachLibraryComponent={onDetachLibraryComponent}
              />
            ))
          ) : components.length > 0 ? (
            <div className="rounded-md border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
              No matching components.
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
              <Boxes className="size-5" />
              No components yet.
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function ComponentMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-background px-2 py-1.5">
      <div className="truncate text-[10px] text-muted-foreground">{label}</div>
      <div className="font-mono text-sm text-foreground">{value}</div>
    </div>
  );
}

function exportComponentDocumentationCsv(
  components: DesignComponent[],
  analyticsByComponentId: Record<string, ComponentUsageAnalytics>,
) {
  const csv = getComponentDocumentationCsv(components, analyticsByComponentId);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "component-documentation-readiness.csv";
  link.click();
  URL.revokeObjectURL(url);
}

const componentReviewFilters = [
  { id: "all", label: "All" },
  { id: "used", label: "Used" },
  { id: "unused", label: "Unused" },
  { id: "updates", label: "Updates" },
  { id: "detached", label: "Detached" },
  { id: "variants", label: "Variants" },
  { id: "docs", label: "Docs" },
  { id: "stale", label: "Stale" },
  { id: "deps", label: "Deps" },
] as const satisfies ReadonlyArray<{
  id: ComponentReviewFilter;
  label: string;
}>;

function matchesComponentReviewFilter(
  component: DesignComponent,
  analytics: ComponentUsageAnalytics | undefined,
  pendingUpdates: Record<string, DesignComponent>,
  instanceRowsByComponentId: Record<string, unknown[]>,
  dependencyRowsByComponentId: Record<string, unknown[]>,
  filter: ComponentReviewFilter,
) {
  if (filter === "all") {
    return true;
  }

  if (filter === "used") {
    return (analytics?.instanceCount ?? 0) > 0;
  }

  if (filter === "unused") {
    return (analytics?.instanceCount ?? 0) === 0;
  }

  if (filter === "updates") {
    return (
      component.librarySource?.status === "update-available" ||
      Boolean(pendingUpdates[component.id])
    );
  }

  if (filter === "detached") {
    return component.librarySource?.status === "detached";
  }

  if (filter === "variants") {
    return (component.variants?.length ?? 0) > 0;
  }

  if (filter === "docs") {
    return needsComponentDocumentationReview(component, analytics);
  }

  if (filter === "stale") {
    return (instanceRowsByComponentId[component.id]?.length ?? 0) > 0;
  }

  return (dependencyRowsByComponentId[component.id]?.length ?? 0) > 0;
}
