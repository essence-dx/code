
export const dxSourceText = "import type { ComponentUsageAnalytics } from \"@/features/editor/component-analytics\";\nimport type { LayerPatch } from \"@/features/editor/document-utils\";\nimport type {\n  DesignComponent,\n  DesignLayer,\n  DesignPage,\n} from \"@/features/editor/types\";\n\nexport type ComponentIntegrityIssueType =\n  | \"unused-component\"\n  | \"empty-source\"\n  | \"missing-component\"\n  | \"missing-variant\";\n\nexport type ComponentIntegrityIssue = {\n  id: string;\n  type: ComponentIntegrityIssueType;\n  severity: \"review\" | \"warning\";\n  componentId?: string;\n  componentName: string;\n  pageName?: string;\n  layerName?: string;\n  detail: string;\n};\n\nexport type ComponentIntegrityReview = {\n  issueCount: number;\n  unusedComponentCount: number;\n  emptySourceCount: number;\n  missingComponentReferenceCount: number;\n  missingVariantReferenceCount: number;\n  issues: ComponentIntegrityIssue[];\n};\n\nexport function getComponentIntegrityReview(\n  components: DesignComponent[],\n  pages: DesignPage[],\n  analyticsByComponentId: Record<string, ComponentUsageAnalytics>,\n): ComponentIntegrityReview {\n  const componentById = new Map(\n    components.map((component) => [component.id, component]),\n  );\n  const issues = [\n    ...getComponentSourceIssues(components, analyticsByComponentId),\n    ...getLayerReferenceIssues(pages, componentById),\n  ].sort(sortIntegrityIssues);\n\n  return {\n    issueCount: issues.length,\n    unusedComponentCount: issues.filter(\n      (issue) => issue.type === \"unused-component\",\n    ).length,\n    emptySourceCount: issues.filter((issue) => issue.type === \"empty-source\")\n      .length,\n    missingComponentReferenceCount: issues.filter(\n      (issue) => issue.type === \"missing-component\",\n    ).length,\n    missingVariantReferenceCount: issues.filter(\n      (issue) => issue.type === \"missing-variant\",\n    ).length,\n    issues,\n  };\n}\n\nexport function getComponentIntegrityCsv(review: ComponentIntegrityReview) {\n  return [\n    [\n      \"type\",\n      \"severity\",\n      \"componentId\",\n      \"component\",\n      \"page\",\n      \"layer\",\n      \"detail\",\n    ],\n    ...review.issues.map((issue) => [\n      issue.type,\n      issue.severity,\n      issue.componentId ?? \"\",\n      issue.componentName,\n      issue.pageName ?? \"\",\n      issue.layerName ?? \"\",\n      issue.detail,\n    ]),\n  ]\n    .map((row) => row.map(formatCsvCell).join(\",\"))\n    .join(\"\\n\");\n}\n\nexport function getComponentReferenceRepairPatches(\n  page: DesignPage,\n  components: DesignComponent[],\n): LayerPatch[] {\n  const componentById = new Map(\n    components.map((component) => [component.id, component]),\n  );\n\n  return page.layers.flatMap((layer): LayerPatch[] => {\n    if (!layer.componentId) {\n      return [];\n    }\n\n    const component = componentById.get(layer.componentId);\n\n    if (!component) {\n      return [\n        {\n          layerId: layer.id,\n          patch: {\n            componentId: undefined,\n            componentVariantId: undefined,\n            componentLayerId: undefined,\n            componentProperties: undefined,\n            componentSlotName: undefined,\n            componentSlotType: undefined,\n            name: `${layer.name} (detached)`,\n          },\n        },\n      ];\n    }\n\n    if (\n      layer.componentVariantId &&\n      !(component.variants ?? []).some(\n        (variant) => variant.id === layer.componentVariantId,\n      )\n    ) {\n      return [\n        {\n          layerId: layer.id,\n          patch: {\n            componentVariantId: undefined,\n          },\n        },\n      ];\n    }\n\n    return [];\n  });\n}\n\nfunction getComponentSourceIssues(\n  components: DesignComponent[],\n  analyticsByComponentId: Record<string, ComponentUsageAnalytics>,\n) {\n  return components.flatMap((component): ComponentIntegrityIssue[] => {\n    const issues: ComponentIntegrityIssue[] = [];\n    const analytics = analyticsByComponentId[component.id];\n\n    if ((analytics?.instanceCount ?? 0) === 0) {\n      issues.push({\n        id: `unused:${component.id}`,\n        type: \"unused-component\",\n        severity: \"warning\",\n        componentId: component.id,\n        componentName: component.name,\n        detail: \"Component has no instances in the current file.\",\n      });\n    }\n\n    if (component.layers.length === 0) {\n      issues.push({\n        id: `empty:${component.id}`,\n        type: \"empty-source\",\n        severity: \"review\",\n        componentId: component.id,\n        componentName: component.name,\n        detail: \"Component source has no layers to instantiate.\",\n      });\n    }\n\n    return issues;\n  });\n}\n\nfunction getLayerReferenceIssues(\n  pages: DesignPage[],\n  componentById: Map<string, DesignComponent>,\n) {\n  return pages.flatMap((page) =>\n    page.layers.flatMap((layer): ComponentIntegrityIssue[] =>\n      getLayerReferenceIssue(page.name, layer, componentById),\n    ),\n  );\n}\n\nfunction getLayerReferenceIssue(\n  pageName: string,\n  layer: DesignLayer,\n  componentById: Map<string, DesignComponent>,\n): ComponentIntegrityIssue[] {\n  if (!layer.componentId) {\n    return [];\n  }\n\n  const component = componentById.get(layer.componentId);\n\n  if (!component) {\n    return [\n      {\n        id: `missing-component:${pageName}:${layer.id}`,\n        type: \"missing-component\",\n        severity: \"review\",\n        componentId: layer.componentId,\n        componentName: \"Missing component\",\n        pageName,\n        layerName: layer.name,\n        detail: \"Layer references a component id that is not in this file.\",\n      },\n    ];\n  }\n\n  if (\n    layer.componentVariantId &&\n    !(component.variants ?? []).some(\n      (variant) => variant.id === layer.componentVariantId,\n    )\n  ) {\n    return [\n      {\n        id: `missing-variant:${pageName}:${layer.id}`,\n        type: \"missing-variant\",\n        severity: \"review\",\n        componentId: component.id,\n        componentName: component.name,\n        pageName,\n        layerName: layer.name,\n        detail: \"Layer references a variant id that no longer exists.\",\n      },\n    ];\n  }\n\n  return [];\n}\n\nfunction sortIntegrityIssues(\n  first: ComponentIntegrityIssue,\n  second: ComponentIntegrityIssue,\n) {\n  const severityDifference =\n    getSeverityPriority(first.severity) - getSeverityPriority(second.severity);\n\n  if (severityDifference !== 0) {\n    return severityDifference;\n  }\n\n  return `${first.componentName} ${first.layerName ?? \"\"}`.localeCompare(\n    `${second.componentName} ${second.layerName ?? \"\"}`,\n  );\n}\n\nfunction getSeverityPriority(severity: ComponentIntegrityIssue[\"severity\"]) {\n  return severity === \"review\" ? 0 : 1;\n}\n\nfunction formatCsvCell(value: string | number) {\n  const text = String(value);\n\n  if (!/[\",\\n]/.test(text)) {\n    return text;\n  }\n\n  return `\"${text.replaceAll('\"', '\"\"')}\"`;\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/editor/component-integrity-review.ts",
  "chunk_output": ".dx/www/output/source-routes/share--token/modules/src-features-editor-component-integrity-review-ts-fbd7632489c1ed1c.mjs",
  "kind": "ts",
  "hash": "fbd7632489c1ed1c",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": false,
  "transform_kind": "metadata-only",
  "runtime_exports": [],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/features/editor/component-integrity-review.ts",
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
        "type_only": true
      },
      {
        "specifier": "@/features/editor/document-utils",
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
      "getComponentIntegrityReview",
      "getComponentIntegrityCsv",
      "getComponentReferenceRepairPatches"
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
