import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-features-editor-connector-review-ts-6a53618535017a08.mjs";
export const dxSourceText = "import { getConnectorReview } from \"@/features/editor/connector-review\";\nimport type {\n  DesignInkPresetKind,\n  DesignPage,\n  DesignStampKind,\n} from \"@/features/editor/types\";\n\nexport type CanvasAnnotationSummaryRow = {\n  id: string;\n  label: string;\n  detail: string;\n  status: \"ready\" | \"review\";\n};\n\nexport type CanvasAnnotationSummary = {\n  connectorCount: number;\n  readyConnectorCount: number;\n  brokenConnectorCount: number;\n  stampCount: number;\n  inkCount: number;\n  stampCounts: Array<{\n    kind: DesignStampKind;\n    label: string;\n    count: number;\n  }>;\n  inkCounts: Array<{\n    kind: DesignInkPresetKind;\n    label: string;\n    count: number;\n  }>;\n  rows: CanvasAnnotationSummaryRow[];\n};\n\nconst stampLabels: Record<DesignStampKind, string> = {\n  approved: \"Approved\",\n  question: \"Question\",\n  risk: \"Risk\",\n  decision: \"Decision\",\n};\n\nconst inkLabels: Record<DesignInkPresetKind, string> = {\n  marker: \"Marker\",\n  highlighter: \"Highlighter\",\n};\n\nexport function getCanvasAnnotationSummary(\n  page: DesignPage,\n): CanvasAnnotationSummary {\n  const connectorReview = getConnectorReview(page);\n  const stamps = page.layers.filter((layer) => layer.stamp);\n  const inkLayers = page.layers.filter((layer) => layer.inkPreset);\n\n  return {\n    connectorCount: connectorReview.connectorCount,\n    readyConnectorCount: connectorReview.readyCount,\n    brokenConnectorCount: connectorReview.brokenCount,\n    stampCount: stamps.length,\n    inkCount: inkLayers.length,\n    stampCounts: countByKind(stamps, \"stamp\", stampLabels),\n    inkCounts: countByKind(inkLayers, \"inkPreset\", inkLabels),\n    rows: [\n      ...connectorReview.rows.map((row) => ({\n        id: `connector-${row.id}`,\n        label: row.layerName,\n        detail: `${row.sourceLayerName} -> ${row.targetLayerName}`,\n        status: row.status === \"ready\" ? (\"ready\" as const) : (\"review\" as const),\n      })),\n      ...stamps.map((layer) => ({\n        id: `stamp-${layer.id}`,\n        label: `${stampLabels[layer.stamp?.kind ?? \"question\"]} stamp`,\n        detail: layer.name,\n        status: \"ready\" as const,\n      })),\n      ...inkLayers.map((layer) => ({\n        id: `ink-${layer.id}`,\n        label: `${inkLabels[layer.inkPreset?.kind ?? \"marker\"]} annotation`,\n        detail: `${layer.name} / ${layer.strokeWidth}px`,\n        status: \"ready\" as const,\n      })),\n    ],\n  };\n}\n\nfunction countByKind<\n  Property extends \"stamp\" | \"inkPreset\",\n  Kind extends DesignStampKind | DesignInkPresetKind,\n>(\n  layers: Array<{ [key in Property]?: { kind: Kind } }>,\n  property: Property,\n  labels: Record<Kind, string>,\n) {\n  return (Object.keys(labels) as Kind[])\n    .map((kind) => ({\n      kind,\n      label: labels[kind],\n      count: layers.filter((layer) => layer[property]?.kind === kind).length,\n    }))\n    .filter((item) => item.count > 0);\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/editor/canvas-annotation-summary.ts",
  "chunk_output": ".dx/www/output/source-routes/share--token/modules/src-features-editor-canvas-annotation-summary-ts-fc5320adc1c54bfc.mjs",
  "kind": "ts",
  "hash": "fc5320adc1c54bfc",
  "dependencies": [
    {
      "specifier": "@/features/editor/connector-review",
      "resolved_path": "src/features/editor/connector-review.ts",
      "chunk_output": ".dx/www/output/source-routes/share--token/modules/src-features-editor-connector-review-ts-6a53618535017a08.mjs",
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
    "source_path": "src/features/editor/canvas-annotation-summary.ts",
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
        "specifier": "@/features/editor/connector-review",
        "side_effect_only": false,
        "type_only": false
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
      "getCanvasAnnotationSummary"
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
export const dxLinkedDependencies = Object.freeze([dep0]);
export default dxSourceModule;
