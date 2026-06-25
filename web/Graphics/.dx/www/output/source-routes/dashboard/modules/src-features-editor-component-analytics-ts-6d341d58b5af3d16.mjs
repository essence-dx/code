
export const dxSourceText = "import type {\n  DesignComponent,\n  DesignLayer,\n  DesignPage,\n} from \"@/features/editor/types\";\n\nexport type ComponentUsageAnalytics = {\n  componentId: string;\n  instanceCount: number;\n  instanceLayerCount: number;\n  variantUsage: Record<string, number>;\n};\n\nexport type ComponentAnalyticsSummary = {\n  componentCount: number;\n  instanceCount: number;\n  updateAvailableCount: number;\n  detachedLibraryCount: number;\n};\n\nexport function getComponentUsageAnalytics(\n  components: DesignComponent[],\n  pages: DesignPage[],\n) {\n  const analytics: Record<string, ComponentUsageAnalytics> = Object.fromEntries(\n    components.map((component) => [\n      component.id,\n      {\n        componentId: component.id,\n        instanceCount: 0,\n        instanceLayerCount: 0,\n        variantUsage: {},\n      } satisfies ComponentUsageAnalytics,\n    ]),\n  );\n  const seenInstanceKeys = new Set<string>();\n\n  pages.flatMap((page) => page.layers).forEach((layer) => {\n    if (!layer.componentId || !analytics[layer.componentId]) {\n      return;\n    }\n\n    const componentAnalytics = analytics[layer.componentId];\n    const instanceKey = getInstanceKey(layer);\n\n    componentAnalytics.instanceLayerCount += 1;\n\n    if (!seenInstanceKeys.has(instanceKey)) {\n      seenInstanceKeys.add(instanceKey);\n      componentAnalytics.instanceCount += 1;\n\n      if (layer.componentVariantId) {\n        componentAnalytics.variantUsage[layer.componentVariantId] =\n          (componentAnalytics.variantUsage[layer.componentVariantId] ?? 0) + 1;\n      }\n    }\n  });\n\n  return analytics;\n}\n\nexport function getComponentAnalyticsSummary(\n  components: DesignComponent[],\n  analytics: Record<string, ComponentUsageAnalytics>,\n): ComponentAnalyticsSummary {\n  return {\n    componentCount: components.length,\n    instanceCount: Object.values(analytics).reduce(\n      (count, item) => count + item.instanceCount,\n      0,\n    ),\n    updateAvailableCount: components.filter(\n      (component) => component.librarySource?.status === \"update-available\",\n    ).length,\n    detachedLibraryCount: components.filter(\n      (component) => component.librarySource?.status === \"detached\",\n    ).length,\n  };\n}\n\nfunction getInstanceKey(layer: DesignLayer) {\n  return `${layer.componentId}:${layer.componentVariantId ?? \"main\"}:${\n    layer.groupId ?? layer.id\n  }`;\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/editor/component-analytics.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-editor-component-analytics-ts-6d341d58b5af3d16.mjs",
  "kind": "ts",
  "hash": "6d341d58b5af3d16",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": false,
  "transform_kind": "metadata-only",
  "runtime_exports": [],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/features/editor/component-analytics.ts",
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
      "getComponentUsageAnalytics",
      "getComponentAnalyticsSummary"
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
