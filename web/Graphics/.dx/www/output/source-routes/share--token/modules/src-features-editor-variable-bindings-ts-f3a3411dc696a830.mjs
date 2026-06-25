import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-features-editor-auto-layout-ts-a5e7e051e98c177e.mjs";
export const dxSourceText = "import type {\n  DesignDocument,\n  DesignLayer,\n  DesignVariableBindableProperty,\n  DesignVariableCollection,\n  DesignVariableDefinition,\n  DesignVariableMode,\n  DesignVariableScope,\n  DesignVariableType,\n} from \"@/features/editor/types\";\nimport { defaultAutoLayout } from \"@/features/editor/auto-layout\";\n\nexport const defaultVariableMode: DesignVariableMode = {\n  id: \"default\",\n  name: \"Default\",\n};\n\nexport const variableScopeOptions = [\n  { value: \"paint\", label: \"Paint\" },\n  { value: \"text\", label: \"Text\" },\n  { value: \"layout\", label: \"Layout\" },\n  { value: \"effect\", label: \"Effects\" },\n  { value: \"component\", label: \"Components\" },\n  { value: \"prototype\", label: \"Prototype\" },\n  { value: \"dev\", label: \"Dev Mode\" },\n] as const satisfies ReadonlyArray<{\n  value: DesignVariableScope;\n  label: string;\n}>;\n\nexport const defaultVariableCollections: Record<\n  string,\n  DesignVariableCollection\n> = {\n  paint: {\n    id: \"paint\",\n    name: \"Paint\",\n    scope: \"paint\",\n    createdAt: \"2026-05-14T00:00:00.000Z\",\n    updatedAt: \"2026-05-14T00:00:00.000Z\",\n  },\n  text: {\n    id: \"text\",\n    name: \"Text\",\n    scope: \"text\",\n    createdAt: \"2026-05-14T00:00:00.000Z\",\n    updatedAt: \"2026-05-14T00:00:00.000Z\",\n  },\n  layout: {\n    id: \"layout\",\n    name: \"Layout\",\n    scope: \"layout\",\n    createdAt: \"2026-05-14T00:00:00.000Z\",\n    updatedAt: \"2026-05-14T00:00:00.000Z\",\n  },\n  effects: {\n    id: \"effects\",\n    name: \"Effects\",\n    scope: \"effect\",\n    createdAt: \"2026-05-14T00:00:00.000Z\",\n    updatedAt: \"2026-05-14T00:00:00.000Z\",\n  },\n};\n\nexport const variableBindableProperties = [\n  { property: \"fill\", label: \"Fill\", type: \"color\" },\n  { property: \"stroke\", label: \"Stroke\", type: \"color\" },\n  { property: \"shadowColor\", label: \"Shadow\", type: \"color\" },\n  { property: \"textColor\", label: \"Text color\", type: \"color\" },\n  { property: \"text\", label: \"Text content\", type: \"text\" },\n  { property: \"cornerRadius\", label: \"Radius\", type: \"number\" },\n  { property: \"strokeWidth\", label: \"Stroke width\", type: \"number\" },\n  { property: \"opacity\", label: \"Opacity\", type: \"number\" },\n  { property: \"fontSize\", label: \"Font size\", type: \"number\" },\n  { property: \"lineHeight\", label: \"Line height\", type: \"number\" },\n  { property: \"letterSpacing\", label: \"Tracking\", type: \"number\" },\n  { property: \"shadowX\", label: \"Shadow X\", type: \"number\" },\n  { property: \"shadowY\", label: \"Shadow Y\", type: \"number\" },\n  { property: \"shadowBlur\", label: \"Shadow blur\", type: \"number\" },\n  { property: \"shadowSpread\", label: \"Shadow spread\", type: \"number\" },\n  { property: \"layerBlur\", label: \"Layer blur\", type: \"number\" },\n  { property: \"backgroundBlur\", label: \"Background blur\", type: \"number\" },\n  { property: \"autoLayoutGap\", label: \"Layout gap\", type: \"number\" },\n  { property: \"autoLayoutPaddingX\", label: \"Padding X\", type: \"number\" },\n  { property: \"autoLayoutPaddingY\", label: \"Padding Y\", type: \"number\" },\n] as const satisfies ReadonlyArray<{\n  property: DesignVariableBindableProperty;\n  label: string;\n  type: DesignVariableType;\n}>;\n\nexport function getVariableModes(document: Pick<DesignDocument, \"variableModes\">) {\n  return document.variableModes?.length ? document.variableModes : [defaultVariableMode];\n}\n\nexport function getVariableCollections(\n  document: Pick<DesignDocument, \"variableCollections\">,\n) {\n  return Object.keys(document.variableCollections ?? {}).length\n    ? document.variableCollections ?? {}\n    : defaultVariableCollections;\n}\n\nexport function getActiveVariableModeId(\n  document: Pick<DesignDocument, \"activeVariableModeId\" | \"variableModes\">,\n) {\n  const modes = getVariableModes(document);\n\n  return (\n    document.activeVariableModeId && modes.some((mode) => mode.id === document.activeVariableModeId)\n      ? document.activeVariableModeId\n      : modes[0].id\n  );\n}\n\nexport function resolveVariableValue(\n  variableId: string,\n  document: Pick<\n    DesignDocument,\n    \"activeVariableModeId\" | \"variableDefinitions\" | \"variableModes\"\n  >,\n  visited = new Set<string>(),\n): string | null {\n  const variable = document.variableDefinitions?.[variableId];\n\n  if (!variable || visited.has(variableId)) {\n    return null;\n  }\n\n  if (variable.aliasOf) {\n    visited.add(variableId);\n    return resolveVariableValue(variable.aliasOf, document, visited);\n  }\n\n  const modeId = getActiveVariableModeId(document);\n\n  return variable.values[modeId] ?? variable.values[defaultVariableMode.id] ?? null;\n}\n\nexport function getVariableDefinitionSignature(\n  definitions?: Record<string, DesignVariableDefinition>,\n) {\n  return Object.values(definitions ?? {})\n    .map((variable) =>\n      [\n        variable.name,\n        variable.type,\n        variable.collectionId ?? \"\",\n        variable.aliasOf ?? \"\",\n        Object.entries(variable.values)\n          .sort(([first], [second]) => first.localeCompare(second))\n          .map(([modeId, value]) => `${modeId}:${value}`)\n          .join(\",\"),\n      ].join(\":\"),\n    )\n    .sort()\n    .join(\"|\");\n}\n\nexport function getVariableCollectionSignature(\n  collections?: Record<string, DesignVariableCollection>,\n) {\n  return Object.values(collections ?? {})\n    .map((collection) =>\n      [\n        collection.id,\n        collection.name,\n        collection.scope,\n        collection.updatedAt,\n      ].join(\":\"),\n    )\n    .sort()\n    .join(\"|\");\n}\n\nexport function getLayerVariableBindingSignature(layer: DesignLayer) {\n  return Object.entries(layer.variableBindings ?? {})\n    .sort(([first], [second]) => first.localeCompare(second))\n    .map(([property, variableId]) => `${property}:${variableId}`)\n    .join(\"|\");\n}\n\nexport function getFlatVariableMap(\n  document: Pick<\n    DesignDocument,\n    \"activeVariableModeId\" | \"variableDefinitions\" | \"variableModes\"\n  >,\n) {\n  return Object.fromEntries(\n    Object.values(document.variableDefinitions ?? {})\n      .map((variable) => [variable.name, resolveVariableValue(variable.id, document)])\n      .filter((entry): entry is [string, string] => entry[1] !== null),\n  );\n}\n\nexport function applyVariableBindingsToLayer(\n  layer: DesignLayer,\n  document: Pick<\n    DesignDocument,\n    \"activeVariableModeId\" | \"variableDefinitions\" | \"variableModes\"\n  >,\n) {\n  const bindings = layer.variableBindings;\n\n  if (!bindings) {\n    return layer;\n  }\n\n  const patch: Partial<DesignLayer> = {};\n\n  variableBindableProperties.forEach(({ property, type }) => {\n    const variableId = bindings[property];\n    const variable = variableId ? document.variableDefinitions?.[variableId] : null;\n    const value = variableId ? resolveVariableValue(variableId, document) : null;\n\n    if (!variable || value === null || variable.type !== type) {\n      return;\n    }\n\n    if (type === \"number\") {\n      const numericValue = Number(value);\n\n      if (Number.isFinite(numericValue)) {\n        Object.assign(\n          patch,\n          getVariableBindingLayerPatch(layer, property, numericValue),\n        );\n      }\n      return;\n    }\n\n    Object.assign(patch, getVariableBindingLayerPatch(layer, property, value));\n  });\n\n  return Object.keys(patch).length > 0 ? { ...layer, ...patch } : layer;\n}\n\nexport function getVariableBindingLayerPatch(\n  layer: DesignLayer,\n  property: DesignVariableBindableProperty,\n  value: number | string,\n) {\n  if (\n    property === \"autoLayoutGap\" ||\n    property === \"autoLayoutPaddingX\" ||\n    property === \"autoLayoutPaddingY\"\n  ) {\n    const numericValue = Number(value);\n    const autoLayout = {\n      ...defaultAutoLayout,\n      ...layer.autoLayout,\n    };\n\n    if (property === \"autoLayoutGap\") {\n      autoLayout.gap = Math.max(0, Math.round(numericValue));\n    }\n\n    if (property === \"autoLayoutPaddingX\") {\n      autoLayout.paddingX = Math.max(0, Math.round(numericValue));\n    }\n\n    if (property === \"autoLayoutPaddingY\") {\n      autoLayout.paddingY = Math.max(0, Math.round(numericValue));\n    }\n\n    return { autoLayout } satisfies Partial<DesignLayer>;\n  }\n\n  return { [property]: value } as Partial<DesignLayer>;\n}\n\nexport function applyVariableBindingsToDocument(document: DesignDocument) {\n  return {\n    ...document,\n    pages: document.pages.map((page) => ({\n      ...page,\n      layers: page.layers.map((layer) =>\n        applyVariableBindingsToLayer(layer, document),\n      ),\n    })),\n    updatedAt: new Date().toISOString(),\n  };\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/editor/variable-bindings.ts",
  "chunk_output": ".dx/www/output/source-routes/share--token/modules/src-features-editor-variable-bindings-ts-f3a3411dc696a830.mjs",
  "kind": "ts",
  "hash": "f3a3411dc696a830",
  "dependencies": [
    {
      "specifier": "@/features/editor/auto-layout",
      "resolved_path": "src/features/editor/auto-layout.ts",
      "chunk_output": ".dx/www/output/source-routes/share--token/modules/src-features-editor-auto-layout-ts-a5e7e051e98c177e.mjs",
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
    "source_path": "src/features/editor/variable-bindings.ts",
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
      },
      {
        "specifier": "@/features/editor/auto-layout",
        "side_effect_only": false,
        "type_only": false
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
      "getVariableModes",
      "getVariableCollections",
      "getActiveVariableModeId",
      "resolveVariableValue",
      "getVariableDefinitionSignature",
      "getVariableCollectionSignature",
      "getLayerVariableBindingSignature",
      "getFlatVariableMap",
      "applyVariableBindingsToLayer",
      "getVariableBindingLayerPatch",
      "applyVariableBindingsToDocument",
      "defaultVariableMode",
      "variableScopeOptions",
      "defaultVariableCollections",
      "variableBindableProperties"
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
