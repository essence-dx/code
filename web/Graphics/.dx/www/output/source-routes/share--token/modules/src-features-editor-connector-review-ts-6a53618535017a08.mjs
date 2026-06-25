
export const dxSourceText = "import type { LayerPatch } from \"@/features/editor/document-utils\";\nimport type { DesignLayer, DesignPage } from \"@/features/editor/types\";\n\nexport type ConnectorReviewStatus = \"ready\" | \"broken\";\n\nexport type ConnectorReviewRow = {\n  id: string;\n  layerId: string;\n  layerName: string;\n  status: ConnectorReviewStatus;\n  sourceLayerName: string;\n  targetLayerName: string;\n  detail: string;\n};\n\nexport type ConnectorReviewReport = {\n  connectorCount: number;\n  readyCount: number;\n  brokenCount: number;\n  rows: ConnectorReviewRow[];\n};\n\nexport function getConnectorReview(page: DesignPage): ConnectorReviewReport {\n  const layerById = new Map(page.layers.map((layer) => [layer.id, layer]));\n  const rows = page.layers\n    .filter((layer) => layer.connector)\n    .map((layer) => createConnectorRow(layer, layerById));\n\n  return {\n    connectorCount: rows.length,\n    readyCount: rows.filter((row) => row.status === \"ready\").length,\n    brokenCount: rows.filter((row) => row.status === \"broken\").length,\n    rows: rows.sort((a, b) => {\n      if (a.status !== b.status) {\n        return a.status === \"broken\" ? -1 : 1;\n      }\n\n      return a.layerName.localeCompare(b.layerName);\n    }),\n  };\n}\n\nexport function getBrokenConnectorRepairPatches(page: DesignPage): LayerPatch[] {\n  const layerIds = new Set(page.layers.map((layer) => layer.id));\n\n  return page.layers\n    .filter((layer) => {\n      const connector = layer.connector;\n\n      return (\n        connector &&\n        (!layerIds.has(connector.sourceLayerId) ||\n          !layerIds.has(connector.targetLayerId))\n      );\n    })\n    .map((layer) => ({\n      layerId: layer.id,\n      patch: {\n        connector: undefined,\n        name: `${layer.name} (unlinked)`,\n      },\n    }));\n}\n\nexport function getConnectorReviewCsv(report: ConnectorReviewReport) {\n  return [\n    [\"status\", \"connector\", \"source\", \"target\", \"detail\"],\n    ...report.rows.map((row) => [\n      row.status,\n      row.layerName,\n      row.sourceLayerName,\n      row.targetLayerName,\n      row.detail,\n    ]),\n  ]\n    .map((row) => row.map(formatCsvCell).join(\",\"))\n    .join(\"\\n\");\n}\n\nfunction createConnectorRow(\n  layer: DesignLayer,\n  layerById: Map<string, DesignLayer>,\n): ConnectorReviewRow {\n  const connector = layer.connector;\n\n  if (!connector) {\n    return {\n      id: layer.id,\n      layerId: layer.id,\n      layerName: layer.name,\n      status: \"broken\",\n      sourceLayerName: \"Missing source\",\n      targetLayerName: \"Missing target\",\n      detail: \"Layer has no connector metadata.\",\n    };\n  }\n\n  const source = layerById.get(connector.sourceLayerId);\n  const target = layerById.get(connector.targetLayerId);\n  const status = source && target ? \"ready\" : \"broken\";\n\n  return {\n    id: layer.id,\n    layerId: layer.id,\n    layerName: layer.name,\n    status,\n    sourceLayerName: source?.name ?? `Missing ${connector.sourceLayerId}`,\n    targetLayerName: target?.name ?? `Missing ${connector.targetLayerId}`,\n    detail:\n      status === \"ready\"\n        ? \"Connector endpoints exist on this page.\"\n        : \"Connector points to a deleted or missing layer; repair or recreate it.\",\n  };\n}\n\nfunction formatCsvCell(value: string | number) {\n  const text = String(value);\n\n  if (!/[\",\\n]/.test(text)) {\n    return text;\n  }\n\n  return `\"${text.replaceAll('\"', '\"\"')}\"`;\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/editor/connector-review.ts",
  "chunk_output": ".dx/www/output/source-routes/share--token/modules/src-features-editor-connector-review-ts-6a53618535017a08.mjs",
  "kind": "ts",
  "hash": "6a53618535017a08",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": false,
  "transform_kind": "metadata-only",
  "runtime_exports": [],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/features/editor/connector-review.ts",
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
      "getConnectorReview",
      "getBrokenConnectorRepairPatches",
      "getConnectorReviewCsv"
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
