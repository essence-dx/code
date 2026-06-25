import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-features-editor-variable-bindings-ts-f3a3411dc696a830.mjs";
import { dxSourceModule as dep1, dxRuntimeExports as dep1Runtime } from "./src-features-editor-variable-usage-audit-ts-be6fd8319d8346d2.mjs";
export const dxSourceText = "import {\n  getFlatVariableMap,\n  resolveVariableValue,\n  variableBindableProperties,\n} from \"@/features/editor/variable-bindings\";\nimport {\n  getLayerVariablePropertyValue,\n  getVariablePropertyLabel,\n  normalizeVariableValue,\n} from \"@/features/editor/variable-usage-audit\";\nimport type {\n  DesignComponent,\n  DesignDocument,\n  DesignLayer,\n  DesignVariableBindableProperty,\n  DesignVariableType,\n} from \"@/features/editor/types\";\n\nexport type ComponentVariableCoverageStatus = \"ready\" | \"review\" | \"missing\";\n\nexport type ComponentVariableCoverageRow = {\n  componentId: string;\n  componentName: string;\n  sourceLayerCount: number;\n  bindablePropertyCount: number;\n  boundPropertyCount: number;\n  matchingRawPropertyCount: number;\n  coveragePercent: number;\n  status: ComponentVariableCoverageStatus;\n  missingProperties: string[];\n  matchingProperties: string[];\n  detail: string;\n};\n\nexport type ComponentVariableCoverageReport = {\n  componentCount: number;\n  sourceLayerCount: number;\n  bindablePropertyCount: number;\n  boundPropertyCount: number;\n  matchingRawPropertyCount: number;\n  coveragePercent: number;\n  readyComponentCount: number;\n  reviewComponentCount: number;\n  missingComponentCount: number;\n  rows: ComponentVariableCoverageRow[];\n};\n\nexport function getComponentVariableCoverageReport(\n  document: DesignDocument,\n  components: DesignComponent[],\n): ComponentVariableCoverageReport {\n  const tokenValues = new Set(\n    Object.values(getFlatVariableMap(document)).map(normalizeVariableValue),\n  );\n  const rows = components.map((component) =>\n    getComponentVariableCoverageRow(component, tokenValues),\n  );\n  const bindablePropertyCount = rows.reduce(\n    (count, row) => count + row.bindablePropertyCount,\n    0,\n  );\n  const boundPropertyCount = rows.reduce(\n    (count, row) => count + row.boundPropertyCount,\n    0,\n  );\n  const matchingRawPropertyCount = rows.reduce(\n    (count, row) => count + row.matchingRawPropertyCount,\n    0,\n  );\n\n  return {\n    componentCount: components.length,\n    sourceLayerCount: rows.reduce((count, row) => count + row.sourceLayerCount, 0),\n    bindablePropertyCount,\n    boundPropertyCount,\n    matchingRawPropertyCount,\n    coveragePercent: getCoveragePercent(boundPropertyCount, bindablePropertyCount),\n    readyComponentCount: rows.filter((row) => row.status === \"ready\").length,\n    reviewComponentCount: rows.filter((row) => row.status === \"review\").length,\n    missingComponentCount: rows.filter((row) => row.status === \"missing\").length,\n    rows: rows.sort(sortCoverageRows),\n  };\n}\n\nexport function getComponentVariableCoverageCsv(\n  report: ComponentVariableCoverageReport,\n) {\n  return [\n    [\n      \"status\",\n      \"component\",\n      \"sourceLayerCount\",\n      \"bindablePropertyCount\",\n      \"boundPropertyCount\",\n      \"matchingRawPropertyCount\",\n      \"coveragePercent\",\n      \"missingProperties\",\n      \"matchingProperties\",\n      \"detail\",\n    ],\n    ...report.rows.map((row) => [\n      row.status,\n      row.componentName,\n      row.sourceLayerCount,\n      row.bindablePropertyCount,\n      row.boundPropertyCount,\n      row.matchingRawPropertyCount,\n      row.coveragePercent,\n      row.missingProperties.join(\"; \"),\n      row.matchingProperties.join(\"; \"),\n      row.detail,\n    ]),\n  ]\n    .map((row) => row.map(formatCsvCell).join(\",\"))\n    .join(\"\\n\");\n}\n\nexport function bindMatchingComponentVariablesInDocument(\n  document: DesignDocument,\n): DesignDocument {\n  const candidates = getVariableCandidates(document);\n\n  if (candidates.length === 0 || !document.components) {\n    return document;\n  }\n\n  const now = new Date().toISOString();\n  let changed = false;\n  const components = Object.fromEntries(\n    Object.entries(document.components).map(([componentId, component]) => {\n      const result = bindMatchingLayerVariables(component.layers, candidates);\n\n      if (!result.changed) {\n        return [componentId, component];\n      }\n\n      changed = true;\n\n      return [\n        componentId,\n        {\n          ...component,\n          layers: result.layers,\n          updatedAt: now,\n        },\n      ];\n    }),\n  );\n\n  return changed\n    ? {\n        ...document,\n        components,\n        updatedAt: now,\n      }\n    : document;\n}\n\nfunction getComponentVariableCoverageRow(\n  component: DesignComponent,\n  tokenValues: Set<string>,\n): ComponentVariableCoverageRow {\n  const layerProperties = component.layers.flatMap((layer) =>\n    variableBindableProperties.flatMap(({ property }) => {\n      const value = getLayerVariablePropertyValue(layer, property);\n\n      if (value === null) {\n        return [];\n      }\n\n      return [\n        {\n          property,\n          label: getVariablePropertyLabel(property),\n          bound: Boolean(layer.variableBindings?.[property]),\n          matchesToken: tokenValues.has(normalizeVariableValue(value)),\n        },\n      ];\n    }),\n  );\n  const bindablePropertyCount = layerProperties.length;\n  const boundProperties = layerProperties.filter((item) => item.bound);\n  const missingProperties = layerProperties.filter((item) => !item.bound);\n  const matchingProperties = missingProperties.filter((item) => item.matchesToken);\n  const coveragePercent = getCoveragePercent(\n    boundProperties.length,\n    bindablePropertyCount,\n  );\n  const status = getCoverageStatus(bindablePropertyCount, coveragePercent);\n\n  return {\n    componentId: component.id,\n    componentName: component.name,\n    sourceLayerCount: component.layers.length,\n    bindablePropertyCount,\n    boundPropertyCount: boundProperties.length,\n    matchingRawPropertyCount: matchingProperties.length,\n    coveragePercent,\n    status,\n    missingProperties: getUniqueLabels(missingProperties),\n    matchingProperties: getUniqueLabels(matchingProperties),\n    detail: getCoverageDetail(status, coveragePercent, matchingProperties.length),\n  };\n}\n\nfunction bindMatchingLayerVariables(\n  layers: DesignLayer[],\n  candidates: VariableCandidate[],\n) {\n  let changed = false;\n  const nextLayers = layers.map((layer) => {\n    const bindings = { ...(layer.variableBindings ?? {}) };\n\n    variableBindableProperties.forEach(({ property, type }) => {\n      if (bindings[property]) {\n        return;\n      }\n\n      const value = getLayerVariablePropertyValue(layer, property);\n      const candidate = value\n        ? findVariableCandidate(candidates, type, value)\n        : undefined;\n\n      if (candidate) {\n        bindings[property] = candidate.id;\n      }\n    });\n\n    if (Object.keys(bindings).length === Object.keys(layer.variableBindings ?? {}).length) {\n      return layer;\n    }\n\n    changed = true;\n\n    return {\n      ...layer,\n      variableBindings: bindings,\n    };\n  });\n\n  return {\n    changed,\n    layers: nextLayers,\n  };\n}\n\ntype VariableCandidate = {\n  id: string;\n  type: DesignVariableType;\n  normalizedValue: string;\n};\n\nfunction getVariableCandidates(document: DesignDocument): VariableCandidate[] {\n  return Object.values(document.variableDefinitions ?? {}).flatMap((variable) => {\n    const value = resolveVariableValue(variable.id, document);\n\n    if (value === null) {\n      return [];\n    }\n\n    return [\n      {\n        id: variable.id,\n        type: variable.type,\n        normalizedValue: normalizeVariableValue(value),\n      },\n    ];\n  });\n}\n\nfunction findVariableCandidate(\n  candidates: VariableCandidate[],\n  type: DesignVariableType,\n  value: string | number,\n) {\n  const normalizedValue = normalizeVariableValue(value);\n\n  return candidates.find(\n    (candidate) =>\n      candidate.type === type && candidate.normalizedValue === normalizedValue,\n  );\n}\n\nfunction getCoverageStatus(\n  bindablePropertyCount: number,\n  coveragePercent: number,\n): ComponentVariableCoverageStatus {\n  if (bindablePropertyCount === 0 || coveragePercent >= 80) {\n    return \"ready\";\n  }\n\n  if (coveragePercent > 0) {\n    return \"review\";\n  }\n\n  return \"missing\";\n}\n\nfunction getCoverageDetail(\n  status: ComponentVariableCoverageStatus,\n  coveragePercent: number,\n  matchingRawPropertyCount: number,\n) {\n  if (status === \"ready\") {\n    return `Variable coverage is ${coveragePercent}%.`;\n  }\n\n  if (matchingRawPropertyCount > 0) {\n    return `${matchingRawPropertyCount} raw properties already match existing variable values.`;\n  }\n\n  return \"Bind reusable visual properties to document variables before publishing.\";\n}\n\nfunction getCoveragePercent(boundCount: number, totalCount: number) {\n  if (totalCount === 0) {\n    return 100;\n  }\n\n  return Math.round((boundCount / totalCount) * 100);\n}\n\nfunction getUniqueLabels(items: Array<{ property: DesignVariableBindableProperty; label: string }>) {\n  return Array.from(new Set(items.map((item) => item.label))).sort((a, b) =>\n    a.localeCompare(b),\n  );\n}\n\nfunction sortCoverageRows(\n  first: ComponentVariableCoverageRow,\n  second: ComponentVariableCoverageRow,\n) {\n  const statusDifference =\n    getStatusPriority(first.status) - getStatusPriority(second.status);\n\n  if (statusDifference !== 0) {\n    return statusDifference;\n  }\n\n  return first.coveragePercent - second.coveragePercent ||\n    first.componentName.localeCompare(second.componentName);\n}\n\nfunction getStatusPriority(status: ComponentVariableCoverageStatus) {\n  if (status === \"missing\") {\n    return 0;\n  }\n\n  if (status === \"review\") {\n    return 1;\n  }\n\n  return 2;\n}\n\nfunction formatCsvCell(value: string | number) {\n  const text = String(value);\n\n  if (!/[\",\\n]/.test(text)) {\n    return text;\n  }\n\n  return `\"${text.replaceAll('\"', '\"\"')}\"`;\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/editor/component-variable-coverage.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-editor-component-variable-coverage-ts-dfe8b461570365ce.mjs",
  "kind": "ts",
  "hash": "dfe8b461570365ce",
  "dependencies": [
    {
      "specifier": "@/features/editor/variable-bindings",
      "resolved_path": "src/features/editor/variable-bindings.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-editor-variable-bindings-ts-f3a3411dc696a830.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/editor/variable-usage-audit",
      "resolved_path": "src/features/editor/variable-usage-audit.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-editor-variable-usage-audit-ts-be6fd8319d8346d2.mjs",
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
    "source_path": "src/features/editor/component-variable-coverage.ts",
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
        "specifier": "@/features/editor/variable-usage-audit",
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
      "getComponentVariableCoverageReport",
      "getComponentVariableCoverageCsv",
      "bindMatchingComponentVariablesInDocument"
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
