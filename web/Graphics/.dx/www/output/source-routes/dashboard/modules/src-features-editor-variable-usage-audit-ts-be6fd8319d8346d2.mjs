import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-features-editor-variable-bindings-ts-f3a3411dc696a830.mjs";
export const dxSourceText = "import {\n  getFlatVariableMap,\n  variableBindableProperties,\n} from \"@/features/editor/variable-bindings\";\nimport type {\n  DesignDocument,\n  DesignLayer,\n  DesignVariableBindableProperty,\n} from \"@/features/editor/types\";\n\nexport type VariableUsageAuditRow = {\n  id: string;\n  pageId: string;\n  pageName: string;\n  layerId: string;\n  layerName: string;\n  rawProperties: string[];\n  matchingProperties: string[];\n};\n\nexport type VariableUsageAuditReport = {\n  totalLayers: number;\n  boundLayerCount: number;\n  rawLayerCount: number;\n  rawPropertyCount: number;\n  matchingPropertyCount: number;\n  rows: VariableUsageAuditRow[];\n};\n\nexport function getVariableUsageAudit(\n  document: DesignDocument,\n): VariableUsageAuditReport {\n  const tokenValues = new Set(\n    Object.values(getFlatVariableMap(document)).map(normalizeVariableValue),\n  );\n  const rows: VariableUsageAuditRow[] = [];\n  let totalLayers = 0;\n  let boundLayerCount = 0;\n  let rawPropertyCount = 0;\n  let matchingPropertyCount = 0;\n\n  for (const page of document.pages) {\n    for (const layer of page.layers) {\n      totalLayers += 1;\n\n      if (Object.keys(layer.variableBindings ?? {}).length > 0) {\n        boundLayerCount += 1;\n      }\n\n      const rawProperties = getRawVariableProperties(layer);\n      const matchingProperties = rawProperties.filter((property) => {\n        const value = getLayerVariablePropertyValue(layer, property);\n\n        return value !== null && tokenValues.has(normalizeVariableValue(value));\n      });\n\n      if (rawProperties.length === 0) {\n        continue;\n      }\n\n      rawPropertyCount += rawProperties.length;\n      matchingPropertyCount += matchingProperties.length;\n      rows.push({\n        id: `${page.id}:${layer.id}`,\n        pageId: page.id,\n        pageName: page.name,\n        layerId: layer.id,\n        layerName: layer.name,\n        rawProperties: rawProperties.map(getVariablePropertyLabel),\n        matchingProperties: matchingProperties.map(getVariablePropertyLabel),\n      });\n    }\n  }\n\n  return {\n    totalLayers,\n    boundLayerCount,\n    rawLayerCount: rows.length,\n    rawPropertyCount,\n    matchingPropertyCount,\n    rows,\n  };\n}\n\nfunction getRawVariableProperties(layer: DesignLayer) {\n  return variableBindableProperties\n    .map((item) => item.property)\n    .filter((property) => {\n      if (layer.variableBindings?.[property]) {\n        return false;\n      }\n\n      return getLayerVariablePropertyValue(layer, property) !== null;\n    });\n}\n\nexport function getLayerVariablePropertyValue(\n  layer: DesignLayer,\n  property: DesignVariableBindableProperty,\n) {\n  if (property === \"fill\") {\n    return isUsablePaint(layer.fill) ? layer.fill : null;\n  }\n\n  if (property === \"stroke\") {\n    return layer.strokeWidth > 0 && isUsablePaint(layer.stroke)\n      ? layer.stroke\n      : null;\n  }\n\n  if (property === \"textColor\") {\n    return layer.text !== undefined && layer.textColor\n      ? layer.textColor\n      : null;\n  }\n\n  if (property === \"text\") {\n    return layer.text?.trim() ? layer.text : null;\n  }\n\n  if (property === \"cornerRadius\") {\n    return layer.cornerRadius > 0 ? layer.cornerRadius : null;\n  }\n\n  if (property === \"strokeWidth\") {\n    return layer.strokeWidth > 0 ? layer.strokeWidth : null;\n  }\n\n  if (property === \"opacity\") {\n    return layer.opacity < 1 ? layer.opacity : null;\n  }\n\n  if (property === \"fontSize\") {\n    return layer.text !== undefined && layer.fontSize ? layer.fontSize : null;\n  }\n\n  if (property === \"lineHeight\") {\n    return layer.text !== undefined && layer.lineHeight\n      ? layer.lineHeight\n      : null;\n  }\n\n  if (property === \"letterSpacing\") {\n    return layer.text !== undefined && layer.letterSpacing\n      ? layer.letterSpacing\n      : null;\n  }\n\n  if (property === \"shadowColor\") {\n    return layer.shadowEnabled && layer.shadowColor ? layer.shadowColor : null;\n  }\n\n  if (property === \"shadowX\") {\n    return layer.shadowEnabled && layer.shadowX ? layer.shadowX : null;\n  }\n\n  if (property === \"shadowY\") {\n    return layer.shadowEnabled && layer.shadowY ? layer.shadowY : null;\n  }\n\n  if (property === \"shadowBlur\") {\n    return layer.shadowEnabled && layer.shadowBlur ? layer.shadowBlur : null;\n  }\n\n  if (property === \"shadowSpread\") {\n    return layer.shadowEnabled && layer.shadowSpread\n      ? layer.shadowSpread\n      : null;\n  }\n\n  if (property === \"layerBlur\") {\n    return layer.layerBlur ? layer.layerBlur : null;\n  }\n\n  if (property === \"backgroundBlur\") {\n    return layer.backgroundBlur ? layer.backgroundBlur : null;\n  }\n\n  if (property === \"autoLayoutGap\") {\n    return layer.autoLayout?.gap ?? null;\n  }\n\n  if (property === \"autoLayoutPaddingX\") {\n    return layer.autoLayout?.paddingX ?? null;\n  }\n\n  if (property === \"autoLayoutPaddingY\") {\n    return layer.autoLayout?.paddingY ?? null;\n  }\n\n  return null;\n}\n\nexport function getVariablePropertyLabel(\n  property: DesignVariableBindableProperty,\n) {\n  return (\n    variableBindableProperties.find((item) => item.property === property)\n      ?.label ?? property\n  );\n}\n\nfunction isUsablePaint(value: string) {\n  return value.trim() !== \"\" && value !== \"transparent\";\n}\n\nexport function normalizeVariableValue(value: string | number) {\n  return String(value).trim().toLowerCase();\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/editor/variable-usage-audit.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-editor-variable-usage-audit-ts-be6fd8319d8346d2.mjs",
  "kind": "ts",
  "hash": "be6fd8319d8346d2",
  "dependencies": [
    {
      "specifier": "@/features/editor/variable-bindings",
      "resolved_path": "src/features/editor/variable-bindings.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-editor-variable-bindings-ts-f3a3411dc696a830.mjs",
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
    "source_path": "src/features/editor/variable-usage-audit.ts",
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
        "specifier": "@/features/editor/variable-bindings",
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
      "getVariableUsageAudit",
      "getLayerVariablePropertyValue",
      "getVariablePropertyLabel",
      "normalizeVariableValue"
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
