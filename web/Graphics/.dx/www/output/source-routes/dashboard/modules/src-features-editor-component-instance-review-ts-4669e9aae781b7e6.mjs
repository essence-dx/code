
export const dxSourceText = "import type {\n  DesignComponent,\n  DesignLayer,\n  DesignPage,\n} from \"@/features/editor/types\";\n\nexport type ComponentInstanceReviewStatus =\n  | \"pending-update\"\n  | \"update-available\"\n  | \"detached\";\n\nexport type ComponentInstanceReviewRow = {\n  id: string;\n  componentId: string;\n  componentName: string;\n  pageId: string;\n  pageName: string;\n  status: ComponentInstanceReviewStatus;\n  sourceVersion?: number;\n  availableVersion?: number;\n  variantName?: string;\n  layerIds: string[];\n  layerNames: string[];\n  instanceLayerCount: number;\n  canAcceptUpdate: boolean;\n  detail: string;\n};\n\nexport type ComponentInstanceReviewReport = {\n  affectedComponentCount: number;\n  affectedInstanceCount: number;\n  staleInstanceCount: number;\n  pendingUpdateInstanceCount: number;\n  detachedInstanceCount: number;\n  rows: ComponentInstanceReviewRow[];\n  byComponentId: Record<string, ComponentInstanceReviewRow[]>;\n};\n\ntype ComponentInstanceBucket = {\n  instanceKey: string;\n  component: DesignComponent;\n  pageId: string;\n  pageName: string;\n  variantId?: string;\n  layers: DesignLayer[];\n};\n\nexport function getComponentInstanceReview(\n  components: DesignComponent[],\n  pages: DesignPage[],\n  pendingUpdates: Record<string, DesignComponent>,\n): ComponentInstanceReviewReport {\n  const componentsById = new Map(\n    components.map((component) => [component.id, component]),\n  );\n  const buckets = new Map<string, ComponentInstanceBucket>();\n\n  pages.forEach((page) => {\n    page.layers.forEach((layer) => {\n      if (!layer.componentId) {\n        return;\n      }\n\n      const component = componentsById.get(layer.componentId);\n\n      if (!component) {\n        return;\n      }\n\n      const instanceKey = getInstanceKey(page.id, layer);\n      const bucket = buckets.get(instanceKey);\n\n      if (bucket) {\n        bucket.layers.push(layer);\n        return;\n      }\n\n      buckets.set(instanceKey, {\n        instanceKey,\n        component,\n        pageId: page.id,\n        pageName: page.name,\n        variantId: layer.componentVariantId,\n        layers: [layer],\n      });\n    });\n  });\n\n  const rows = Array.from(buckets.values())\n    .map((bucket) => buildReviewRow(bucket, pendingUpdates))\n    .filter((row): row is ComponentInstanceReviewRow => Boolean(row))\n    .sort(sortReviewRows);\n  const byComponentId = rows.reduce<Record<string, ComponentInstanceReviewRow[]>>(\n    (accumulator, row) => {\n      accumulator[row.componentId] ??= [];\n      accumulator[row.componentId].push(row);\n      return accumulator;\n    },\n    {},\n  );\n\n  return {\n    affectedComponentCount: Object.keys(byComponentId).length,\n    affectedInstanceCount: rows.length,\n    staleInstanceCount: rows.filter((row) => row.status !== \"detached\").length,\n    pendingUpdateInstanceCount: rows.filter(\n      (row) => row.status === \"pending-update\",\n    ).length,\n    detachedInstanceCount: rows.filter((row) => row.status === \"detached\")\n      .length,\n    rows,\n    byComponentId,\n  };\n}\n\nfunction buildReviewRow(\n  bucket: ComponentInstanceBucket,\n  pendingUpdates: Record<string, DesignComponent>,\n): ComponentInstanceReviewRow | undefined {\n  const { component } = bucket;\n  const source = component.librarySource;\n\n  if (!source) {\n    return undefined;\n  }\n\n  const pendingUpdate = pendingUpdates[component.id];\n  const status = getReviewStatus(component, Boolean(pendingUpdate));\n\n  if (!status) {\n    return undefined;\n  }\n\n  const availableVersion =\n    pendingUpdate?.librarySource?.version ?? source.availableVersion;\n  const variantName = bucket.variantId\n    ? component.variants?.find((variant) => variant.id === bucket.variantId)\n        ?.name\n    : undefined;\n  const layerNames = bucket.layers.map((layer) => layer.name);\n\n  return {\n    id: bucket.instanceKey,\n    componentId: component.id,\n    componentName: component.name,\n    pageId: bucket.pageId,\n    pageName: bucket.pageName,\n    status,\n    sourceVersion: source.version,\n    availableVersion,\n    variantName,\n    layerIds: bucket.layers.map((layer) => layer.id),\n    layerNames,\n    instanceLayerCount: bucket.layers.length,\n    canAcceptUpdate: Boolean(pendingUpdate),\n    detail: getReviewDetail(status, source.version, availableVersion),\n  };\n}\n\nfunction getReviewStatus(\n  component: DesignComponent,\n  hasPendingUpdate: boolean,\n): ComponentInstanceReviewStatus | undefined {\n  if (hasPendingUpdate) {\n    return \"pending-update\";\n  }\n\n  if (component.librarySource?.status === \"update-available\") {\n    return \"update-available\";\n  }\n\n  if (component.librarySource?.status === \"detached\") {\n    return \"detached\";\n  }\n\n  return undefined;\n}\n\nfunction getReviewDetail(\n  status: ComponentInstanceReviewStatus,\n  sourceVersion?: number,\n  availableVersion?: number,\n) {\n  if (status === \"pending-update\") {\n    return `Imported update ready${formatVersionRange(\n      sourceVersion,\n      availableVersion,\n    )}.`;\n  }\n\n  if (status === \"update-available\") {\n    return `Library source reports a newer version${formatVersionRange(\n      sourceVersion,\n      availableVersion,\n    )}.`;\n  }\n\n  return \"Detached from future library updates.\";\n}\n\nfunction formatVersionRange(currentVersion?: number, availableVersion?: number) {\n  if (!currentVersion && !availableVersion) {\n    return \"\";\n  }\n\n  if (currentVersion && availableVersion) {\n    return ` from v${currentVersion} to v${availableVersion}`;\n  }\n\n  if (availableVersion) {\n    return ` to v${availableVersion}`;\n  }\n\n  return ` from v${currentVersion}`;\n}\n\nfunction getInstanceKey(pageId: string, layer: DesignLayer) {\n  return `${pageId}:${layer.componentId}:${layer.componentVariantId ?? \"main\"}:${\n    layer.groupId ?? layer.id\n  }`;\n}\n\nfunction sortReviewRows(\n  first: ComponentInstanceReviewRow,\n  second: ComponentInstanceReviewRow,\n) {\n  const priorityDifference =\n    getStatusPriority(first.status) - getStatusPriority(second.status);\n\n  if (priorityDifference !== 0) {\n    return priorityDifference;\n  }\n\n  return `${first.componentName} ${first.pageName}`.localeCompare(\n    `${second.componentName} ${second.pageName}`,\n  );\n}\n\nfunction getStatusPriority(status: ComponentInstanceReviewStatus) {\n  if (status === \"pending-update\") {\n    return 0;\n  }\n\n  if (status === \"update-available\") {\n    return 1;\n  }\n\n  return 2;\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/editor/component-instance-review.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-editor-component-instance-review-ts-4669e9aae781b7e6.mjs",
  "kind": "ts",
  "hash": "4669e9aae781b7e6",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": false,
  "transform_kind": "metadata-only",
  "runtime_exports": [],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/features/editor/component-instance-review.ts",
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
      "getComponentInstanceReview"
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
export const dxLinkedDependencies = Object.freeze([]);
export default dxSourceModule;
