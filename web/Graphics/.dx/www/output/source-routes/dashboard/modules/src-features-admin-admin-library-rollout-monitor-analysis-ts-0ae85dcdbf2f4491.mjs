import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-features-editor-component-analytics-ts-6d341d58b5af3d16.mjs";
import { dxSourceModule as dep1, dxRuntimeExports as dep1Runtime } from "./src-features-editor-component-instance-review-ts-4669e9aae781b7e6.mjs";
export const dxSourceText = "import {\n  getComponentAnalyticsSummary,\n  getComponentUsageAnalytics,\n} from \"@/features/editor/component-analytics\";\nimport { getComponentInstanceReview } from \"@/features/editor/component-instance-review\";\nimport type {\n  AdminLibraryRolloutFile,\n  AdminLibraryRolloutFileInput,\n  AdminLibraryRolloutLibrary,\n  AdminLibraryRolloutStatus,\n} from \"@/features/admin/admin-library-rollout-monitor\";\nimport type {\n  DesignComponent,\n  DesignLibraryMetadata,\n} from \"@/features/editor/types\";\n\nexport type PublishedLibrary = DesignLibraryMetadata & {\n  fileId: string;\n  fileName: string;\n  ownerEmail: string;\n};\n\nexport type LatestLibrary = {\n  libraryId: string;\n  libraryName: string;\n  teamName: string;\n  version: number;\n  updatedAt: string;\n  fileName: string | null;\n};\n\nexport const READY_ADOPTION_PERCENT = 80;\n\nexport function getPublishedLibraries(\n  files: AdminLibraryRolloutFileInput[],\n): PublishedLibrary[] {\n  return files\n    .map((file) =>\n      file.document.libraryMetadata\n        ? {\n            ...file.document.libraryMetadata,\n            fileId: file.fileId,\n            fileName: file.fileName,\n            ownerEmail: file.ownerEmail,\n          }\n        : null,\n    )\n    .filter((library): library is PublishedLibrary => Boolean(library));\n}\n\nexport function getLatestLibraries(publishedLibraries: PublishedLibrary[]) {\n  const libraries = new Map<string, LatestLibrary>();\n\n  for (const library of publishedLibraries) {\n    const current = libraries.get(library.id);\n\n    if (!current || isNewerLibrary(library, current)) {\n      libraries.set(library.id, {\n        libraryId: library.id,\n        libraryName: library.name,\n        teamName: library.teamName,\n        version: library.version,\n        updatedAt: library.updatedAt,\n        fileName: library.fileName,\n      });\n    }\n  }\n\n  return libraries;\n}\n\nexport function getRolloutFile(\n  file: AdminLibraryRolloutFileInput,\n  latestLibraries: Map<string, LatestLibrary>,\n): AdminLibraryRolloutFile | null {\n  const document = file.document;\n  const components = Object.values(document.components ?? {});\n  const sourcedComponents = components.filter(hasLibrarySource);\n  const subscriptions = Object.values(document.librarySubscriptions ?? {});\n  const publishedLibraryCount = document.libraryMetadata ? 1 : 0;\n\n  if (\n    publishedLibraryCount === 0 &&\n    sourcedComponents.length === 0 &&\n    subscriptions.length === 0\n  ) {\n    return null;\n  }\n\n  const pendingUpdates = document.pendingLibraryComponentUpdates ?? {};\n  const analytics = getComponentUsageAnalytics(components, document.pages);\n  const analyticsSummary = getComponentAnalyticsSummary(components, analytics);\n  const instanceReview = getComponentInstanceReview(\n    components,\n    document.pages,\n    pendingUpdates,\n  );\n  const subscriptionById = new Map(\n    subscriptions.map((subscription) => [subscription.id, subscription]),\n  );\n  const subscribedInstanceCount = sourcedComponents.reduce(\n    (count, component) =>\n      count + (analytics[component.id]?.instanceCount ?? 0),\n    0,\n  );\n  const updateAvailableComponentCount = sourcedComponents.filter((component) =>\n    hasAvailableUpdate(component, pendingUpdates),\n  ).length;\n  const detachedComponentCount = sourcedComponents.filter(\n    (component) => component.librarySource.status === \"detached\",\n  ).length;\n  const subscriptionDriftCount = sourcedComponents.filter((component) =>\n    hasSubscriptionDrift(component, subscriptionById, latestLibraries),\n  ).length;\n  const adoptedLatestComponentCount = sourcedComponents.filter((component) =>\n    hasAdoptedLatestRelease(component, subscriptionById, latestLibraries),\n  ).length;\n  const sourceLibraryIds = new Set(\n    sourcedComponents.map((component) => component.librarySource.libraryId),\n  );\n  const orphanSubscriptionCount = subscriptions.filter(\n    (subscription) => !sourceLibraryIds.has(subscription.id),\n  ).length;\n\n  return {\n    fileId: file.fileId,\n    fileName: file.fileName,\n    ownerEmail: file.ownerEmail,\n    publishedLibraryCount,\n    librarySubscriptionCount: subscriptions.length,\n    subscribedComponentCount: sourcedComponents.length,\n    subscribedInstanceCount,\n    updateAvailableComponentCount,\n    pendingUpdateInstanceCount: instanceReview.pendingUpdateInstanceCount,\n    detachedComponentCount,\n    detachedInstanceCount: instanceReview.detachedInstanceCount,\n    subscriptionDriftCount,\n    orphanSubscriptionCount,\n    adoptedLatestComponentCount,\n    releaseAdoptionPercent: getPercent(\n      adoptedLatestComponentCount,\n      sourcedComponents.length,\n    ),\n    latestSubscriptionAt: getLatestDate([\n      ...subscriptions.map((subscription) => subscription.updatedAt),\n      ...sourcedComponents.map((component) => component.librarySource.updatedAt),\n      document.libraryMetadata?.updatedAt,\n    ]),\n    status: getRolloutFileStatus({\n      publishedLibraryCount,\n      componentCount: analyticsSummary.componentCount,\n      subscribedComponentCount: sourcedComponents.length,\n      updateAvailableComponentCount,\n      detachedComponentCount,\n      subscriptionDriftCount,\n      orphanSubscriptionCount,\n    }),\n  };\n}\n\nexport function getRolloutLibraries({\n  files,\n  latestLibraries,\n}: {\n  files: AdminLibraryRolloutFileInput[];\n  latestLibraries: Map<string, LatestLibrary>;\n}) {\n  const libraries = new Map<string, AdminLibraryRolloutLibrary>();\n\n  for (const latest of latestLibraries.values()) {\n    libraries.set(latest.libraryId, {\n      libraryId: latest.libraryId,\n      libraryName: latest.libraryName,\n      teamName: latest.teamName,\n      latestVersion: latest.version,\n      publishedFileName: latest.fileName,\n      subscribedFileCount: 0,\n      subscribedComponentCount: 0,\n      subscribedInstanceCount: 0,\n      updateAvailableComponentCount: 0,\n      pendingUpdateInstanceCount: 0,\n      detachedComponentCount: 0,\n      subscriptionDriftCount: 0,\n      adoptedLatestComponentCount: 0,\n      releaseAdoptionPercent: 0,\n      latestActivityAt: latest.updatedAt,\n      status: \"ready\",\n    });\n  }\n\n  for (const file of files) {\n    const components = Object.values(file.document.components ?? {});\n    const pendingUpdates = file.document.pendingLibraryComponentUpdates ?? {};\n    const analytics = getComponentUsageAnalytics(components, file.document.pages);\n    const subscriptions = Object.values(file.document.librarySubscriptions ?? {});\n    const subscriptionById = new Map(\n      subscriptions.map((subscription) => [subscription.id, subscription]),\n    );\n    const instanceReview = getComponentInstanceReview(\n      components,\n      file.document.pages,\n      pendingUpdates,\n    );\n    const sourceComponentsByLibrary = groupByLibrary(\n      components.filter(hasLibrarySource),\n    );\n\n    for (const subscription of subscriptions) {\n      const library = ensureRolloutLibrary(libraries, subscription, null);\n      library.latestActivityAt = getLatestDate([\n        library.latestActivityAt,\n        subscription.updatedAt,\n      ]);\n    }\n\n    for (const [libraryId, sourcedComponents] of sourceComponentsByLibrary) {\n      const firstSource = sourcedComponents[0]?.librarySource;\n\n      if (!firstSource) {\n        continue;\n      }\n\n      const library = ensureRolloutLibrary(\n        libraries,\n        subscriptionById.get(libraryId) ?? null,\n        firstSource,\n      );\n      const subscribedInstanceCount = sourcedComponents.reduce(\n        (count, component) =>\n          count + (analytics[component.id]?.instanceCount ?? 0),\n        0,\n      );\n      const updateAvailableComponentCount = sourcedComponents.filter(\n        (component) => hasAvailableUpdate(component, pendingUpdates),\n      ).length;\n      const detachedComponentCount = sourcedComponents.filter(\n        (component) => component.librarySource.status === \"detached\",\n      ).length;\n      const subscriptionDriftCount = sourcedComponents.filter((component) =>\n        hasSubscriptionDrift(component, subscriptionById, latestLibraries),\n      ).length;\n      const adoptedLatestComponentCount = sourcedComponents.filter((component) =>\n        hasAdoptedLatestRelease(component, subscriptionById, latestLibraries),\n      ).length;\n\n      library.subscribedFileCount += 1;\n      library.subscribedComponentCount += sourcedComponents.length;\n      library.subscribedInstanceCount += subscribedInstanceCount;\n      library.updateAvailableComponentCount += updateAvailableComponentCount;\n      library.pendingUpdateInstanceCount += instanceReview.rows.filter(\n        (row) =>\n          row.status === \"pending-update\" &&\n          sourcedComponents.some((component) => component.id === row.componentId),\n      ).length;\n      library.detachedComponentCount += detachedComponentCount;\n      library.subscriptionDriftCount += subscriptionDriftCount;\n      library.adoptedLatestComponentCount += adoptedLatestComponentCount;\n      library.latestActivityAt = getLatestDate([\n        library.latestActivityAt,\n        ...sourcedComponents.map((component) => component.librarySource.updatedAt),\n      ]);\n    }\n  }\n\n  return Array.from(libraries.values())\n    .map((library) => ({\n      ...library,\n      releaseAdoptionPercent: getPercent(\n        library.adoptedLatestComponentCount,\n        library.subscribedComponentCount,\n      ),\n      status: getRolloutLibraryStatus(library),\n    }))\n    .sort(sortRolloutLibraries);\n}\n\nexport function sortRolloutFiles(\n  first: AdminLibraryRolloutFile,\n  second: AdminLibraryRolloutFile,\n) {\n  const statusDifference =\n    getStatusPriority(first.status) - getStatusPriority(second.status);\n\n  if (statusDifference !== 0) {\n    return statusDifference;\n  }\n\n  return (\n    second.subscriptionDriftCount +\n    second.updateAvailableComponentCount -\n    (first.subscriptionDriftCount + first.updateAvailableComponentCount)\n  );\n}\n\nfunction hasLibrarySource(\n  component: DesignComponent,\n): component is DesignComponent & {\n  librarySource: NonNullable<DesignComponent[\"librarySource\"]>;\n} {\n  return Boolean(component.librarySource);\n}\n\nfunction hasAvailableUpdate(\n  component: DesignComponent & {\n    librarySource: NonNullable<DesignComponent[\"librarySource\"]>;\n  },\n  pendingUpdates: Record<string, DesignComponent>,\n) {\n  return (\n    Boolean(pendingUpdates[component.id]) ||\n    component.librarySource.status === \"update-available\" ||\n    Boolean(\n      component.librarySource.availableVersion &&\n        component.librarySource.availableVersion > component.librarySource.version,\n    )\n  );\n}\n\nfunction hasSubscriptionDrift(\n  component: DesignComponent & {\n    librarySource: NonNullable<DesignComponent[\"librarySource\"]>;\n  },\n  subscriptions: Map<string, DesignLibraryMetadata>,\n  latestLibraries: Map<string, LatestLibrary>,\n) {\n  if (component.librarySource.status === \"detached\") {\n    return true;\n  }\n\n  return (\n    getLatestKnownVersion(component, subscriptions, latestLibraries) >\n    component.librarySource.version\n  );\n}\n\nfunction hasAdoptedLatestRelease(\n  component: DesignComponent & {\n    librarySource: NonNullable<DesignComponent[\"librarySource\"]>;\n  },\n  subscriptions: Map<string, DesignLibraryMetadata>,\n  latestLibraries: Map<string, LatestLibrary>,\n) {\n  if (component.librarySource.status === \"detached\") {\n    return false;\n  }\n\n  return (\n    component.librarySource.version >=\n    getLatestKnownVersion(component, subscriptions, latestLibraries)\n  );\n}\n\nfunction getLatestKnownVersion(\n  component: DesignComponent & {\n    librarySource: NonNullable<DesignComponent[\"librarySource\"]>;\n  },\n  subscriptions: Map<string, DesignLibraryMetadata>,\n  latestLibraries: Map<string, LatestLibrary>,\n) {\n  return Math.max(\n    component.librarySource.version,\n    component.librarySource.availableVersion ?? 0,\n    subscriptions.get(component.librarySource.libraryId)?.version ?? 0,\n    latestLibraries.get(component.librarySource.libraryId)?.version ?? 0,\n  );\n}\n\nfunction ensureRolloutLibrary(\n  libraries: Map<string, AdminLibraryRolloutLibrary>,\n  subscription: DesignLibraryMetadata | null,\n  source: NonNullable<DesignComponent[\"librarySource\"]> | null,\n) {\n  const libraryId = subscription?.id ?? source?.libraryId ?? \"unknown-library\";\n  const existing = libraries.get(libraryId);\n\n  if (existing) {\n    existing.latestVersion = Math.max(\n      existing.latestVersion,\n      subscription?.version ?? 0,\n      source?.availableVersion ?? 0,\n      source?.version ?? 0,\n    );\n    return existing;\n  }\n\n  const library: AdminLibraryRolloutLibrary = {\n    libraryId,\n    libraryName: subscription?.name ?? source?.libraryName ?? \"Unknown library\",\n    teamName: subscription?.teamName ?? source?.teamName ?? \"Unknown team\",\n    latestVersion: Math.max(\n      subscription?.version ?? 0,\n      source?.availableVersion ?? 0,\n      source?.version ?? 0,\n    ),\n    publishedFileName: null,\n    subscribedFileCount: 0,\n    subscribedComponentCount: 0,\n    subscribedInstanceCount: 0,\n    updateAvailableComponentCount: 0,\n    pendingUpdateInstanceCount: 0,\n    detachedComponentCount: 0,\n    subscriptionDriftCount: 0,\n    adoptedLatestComponentCount: 0,\n    releaseAdoptionPercent: 0,\n    latestActivityAt: subscription?.updatedAt ?? source?.updatedAt ?? null,\n    status: \"ready\",\n  };\n\n  libraries.set(libraryId, library);\n  return library;\n}\n\nfunction groupByLibrary(\n  components: Array<\n    DesignComponent & {\n      librarySource: NonNullable<DesignComponent[\"librarySource\"]>;\n    }\n  >,\n) {\n  const groups = new Map<string, typeof components>();\n\n  for (const component of components) {\n    const libraryId = component.librarySource.libraryId;\n    groups.set(libraryId, [...(groups.get(libraryId) ?? []), component]);\n  }\n\n  return groups;\n}\n\nfunction getRolloutFileStatus({\n  publishedLibraryCount,\n  componentCount,\n  subscribedComponentCount,\n  updateAvailableComponentCount,\n  detachedComponentCount,\n  subscriptionDriftCount,\n  orphanSubscriptionCount,\n}: {\n  publishedLibraryCount: number;\n  componentCount: number;\n  subscribedComponentCount: number;\n  updateAvailableComponentCount: number;\n  detachedComponentCount: number;\n  subscriptionDriftCount: number;\n  orphanSubscriptionCount: number;\n}): AdminLibraryRolloutStatus {\n  if (publishedLibraryCount > 0 && componentCount === 0) {\n    return \"blocked\";\n  }\n\n  if (\n    subscribedComponentCount === 0 &&\n    publishedLibraryCount === 0 &&\n    orphanSubscriptionCount > 0\n  ) {\n    return \"review\";\n  }\n\n  if (\n    updateAvailableComponentCount > 0 ||\n    detachedComponentCount > 0 ||\n    subscriptionDriftCount > 0 ||\n    orphanSubscriptionCount > 0\n  ) {\n    return \"review\";\n  }\n\n  return \"ready\";\n}\n\nfunction getRolloutLibraryStatus(\n  library: AdminLibraryRolloutLibrary,\n): AdminLibraryRolloutStatus {\n  if (library.subscribedComponentCount === 0 && library.publishedFileName) {\n    return \"review\";\n  }\n\n  if (\n    library.updateAvailableComponentCount > 0 ||\n    library.detachedComponentCount > 0 ||\n    library.subscriptionDriftCount > 0 ||\n    library.releaseAdoptionPercent < READY_ADOPTION_PERCENT\n  ) {\n    return \"review\";\n  }\n\n  return \"ready\";\n}\n\nfunction isNewerLibrary(library: PublishedLibrary, current: LatestLibrary) {\n  if (library.version !== current.version) {\n    return library.version > current.version;\n  }\n\n  return toTime(library.updatedAt) > toTime(current.updatedAt);\n}\n\nfunction sortRolloutLibraries(\n  first: AdminLibraryRolloutLibrary,\n  second: AdminLibraryRolloutLibrary,\n) {\n  const statusDifference =\n    getStatusPriority(first.status) - getStatusPriority(second.status);\n\n  if (statusDifference !== 0) {\n    return statusDifference;\n  }\n\n  return second.subscribedComponentCount - first.subscribedComponentCount;\n}\n\nfunction getStatusPriority(status: AdminLibraryRolloutStatus) {\n  if (status === \"blocked\") {\n    return 0;\n  }\n\n  return status === \"review\" ? 1 : 2;\n}\n\nexport function getLatestDate(values: Array<string | null | undefined>) {\n  return values\n    .filter((value): value is string => Boolean(value))\n    .sort((first, second) => toTime(second) - toTime(first))[0] ?? null;\n}\n\nexport function getPercent(numerator: number, denominator: number) {\n  if (denominator === 0) {\n    return 0;\n  }\n\n  return Math.round((numerator / denominator) * 100);\n}\n\nexport function sum(values: number[]) {\n  return values.reduce((total, value) => total + value, 0);\n}\n\nfunction toTime(value: string) {\n  return new Date(value).getTime();\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-library-rollout-monitor-analysis.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-library-rollout-monitor-analysis-ts-0ae85dcdbf2f4491.mjs",
  "kind": "ts",
  "hash": "0ae85dcdbf2f4491",
  "dependencies": [
    {
      "specifier": "@/features/editor/component-analytics",
      "resolved_path": "src/features/editor/component-analytics.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-editor-component-analytics-ts-6d341d58b5af3d16.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/editor/component-instance-review",
      "resolved_path": "src/features/editor/component-instance-review.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-editor-component-instance-review-ts-4669e9aae781b7e6.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    }
  ],
  "browser_executable": true,
  "source_transformed": false,
  "transform_kind": "metadata-only",
  "runtime_exports": [],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/features/admin/admin-library-rollout-monitor-analysis.ts",
    "source_kind": "ts",
    "parser_backend": "oxc-parser",
    "diagnostics": 0,
    "compatibility_reference": {
      "upstream_crates": [
        "turbopack-ecmascript"
      ],
      "reference_only": true,
      "runtime_build_adoption": false,
      "public_runtime_dependency": false,
      "vendor_root": "vendor/next-rust",
      "vendor_commit": "f3f56ecec2f3f8cefa0f0a1323ea406740251d5c",
      "next_transform_references": [
        "next-custom-transforms::track_dynamic_imports",
        "next-custom-transforms::react_server_components"
      ],
      "copied_code": false
    },
    "output_model": {
      "contract": "dx.www.moduleGraph",
      "compiler_owns_output": true,
      "public_architecture": "DX-owned source graph analysis"
    },
    "runtime_boundaries": {
      "next_runtime_required": false,
      "react_runtime_required": false,
      "rsc_required": false,
      "node_modules_required": false
    },
    "directives": [],
    "static_imports": [
      {
        "specifier": "@/features/editor/component-analytics",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/editor/component-instance-review",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/admin/admin-library-rollout-monitor",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/editor/types",
        "side_effect_only": false,
        "type_only": true
      }
    ],
    "dynamic_imports": [],
    "unresolved_dynamic_imports": [],
    "unsupported_dynamic_imports": [],
    "dynamic_import_analysis": {
      "status": "none-observed",
      "static_count": 0,
      "unresolved_count": 0,
      "unsupported_count": 0,
      "boundary": "source-owned dynamic import analysis; static specifiers become evidence, expressions remain unresolved, and unsupported call forms stay as adapter-boundary receipts"
    },
    "export_names": [
      "getPublishedLibraries",
      "getLatestLibraries",
      "getRolloutFile",
      "getRolloutLibraries",
      "sortRolloutFiles",
      "getLatestDate",
      "getPercent",
      "sum",
      "READY_ADOPTION_PERCENT"
    ],
    "jsx": false,
    "top_level_await": false,
    "full_nextjs_parity": false,
    "analysis_boundary": "Uses vendored Turbopack ECMAScript and selected Next transform behavior as compatibility references while emitting DX-owned source graph receipts."
  },
  "node_modules_required": false
});
export const dxRuntimeModule = Object.freeze({
  transformed: false,
  transformKind: "metadata-only",
  exportNames: []
});
export const dxRuntimeExports = Object.freeze({});
export const dxLinkedDependencies = Object.freeze([dep0, dep1]);
export default dxSourceModule;
