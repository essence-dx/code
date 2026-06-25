import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-features-editor-component-slots-ts-6b9558251016056a.mjs";
export const dxSourceText = "import type {\n  DesignComponent,\n  DesignComponentPropertyDefinition,\n  DesignComponentVariant,\n  DesignLayer,\n} from \"@/features/editor/types\";\nimport { getComponentSlotName } from \"@/features/editor/component-slots\";\n\nexport const defaultVariantPropertyId = \"variant\";\nexport const defaultVariantPropertyName = \"Variant\";\nexport const defaultVariantPropertyValue = \"Default\";\nexport const textComponentPropertyIdPrefix = \"text:\";\nexport const componentPropertyTypes = [\n  \"variant\",\n  \"text\",\n  \"boolean\",\n  \"number\",\n] as const;\n\nexport function createDefaultComponentPropertyDefinitions(\n  now = new Date().toISOString(),\n) {\n  return {\n    [defaultVariantPropertyId]: {\n      id: defaultVariantPropertyId,\n      name: defaultVariantPropertyName,\n      type: \"variant\",\n      defaultValue: defaultVariantPropertyValue,\n      options: [defaultVariantPropertyValue],\n      createdAt: now,\n      updatedAt: now,\n    },\n  } satisfies Record<string, DesignComponentPropertyDefinition>;\n}\n\nexport function createComponentPropertyDefinitionsForLayers(\n  layers: DesignLayer[],\n  now = new Date().toISOString(),\n) {\n  const definitions: Record<string, DesignComponentPropertyDefinition> =\n    createDefaultComponentPropertyDefinitions(now);\n  const usedNames = new Set(\n    Object.values(definitions).map((definition) => definition.name),\n  );\n\n  layers.forEach((layer) => {\n    if (layer.text === undefined) {\n      return;\n    }\n\n    const name = getUniqueComponentPropertyName(\n      getComponentSlotName(layer),\n      usedNames,\n    );\n\n    definitions[getComponentTextPropertyId(layer.id)] = {\n      id: getComponentTextPropertyId(layer.id),\n      name,\n      type: \"text\",\n      defaultValue: layer.text,\n      createdAt: now,\n      updatedAt: now,\n    };\n    usedNames.add(name);\n  });\n\n  return definitions;\n}\n\nexport function getComponentPropertyDefinitions(component: DesignComponent) {\n  return Object.keys(component.propertyDefinitions ?? {}).length\n    ? component.propertyDefinitions ?? {}\n    : createDefaultComponentPropertyDefinitions(component.createdAt);\n}\n\nexport function getComponentInstancePropertyValues(\n  component: DesignComponent,\n  variant?: DesignComponentVariant,\n) {\n  const definitions = getComponentPropertyDefinitions(component);\n\n  return {\n    ...Object.fromEntries(\n      Object.values(definitions).map((definition) => [\n        definition.name,\n        definition.defaultValue,\n      ]),\n    ),\n    ...(variant?.properties ?? {}),\n  };\n}\n\nexport function getVariantForComponentProperties(\n  component: DesignComponent,\n  values: Record<string, string>,\n) {\n  return (component.variants ?? []).find((variant) =>\n    Object.entries(variant.properties).every(\n      ([propertyName, value]) => values[propertyName] === value,\n    ),\n  );\n}\n\nexport function getComponentTextPropertyId(sourceLayerId: string) {\n  return `${textComponentPropertyIdPrefix}${sourceLayerId}`;\n}\n\nexport function getComponentTextPropertyNameForLayer(\n  component: DesignComponent,\n  sourceLayerId?: string,\n  slotName?: string,\n) {\n  const definitions = Object.values(getComponentPropertyDefinitions(component));\n  const exactMatch = sourceLayerId\n    ? definitions.find(\n        (definition) =>\n          definition.type === \"text\" &&\n          definition.id === getComponentTextPropertyId(sourceLayerId),\n      )\n    : null;\n\n  if (exactMatch) {\n    return exactMatch.name;\n  }\n\n  return (\n    definitions.find(\n      (definition) =>\n        definition.type === \"text\" &&\n        Boolean(slotName) &&\n        definition.name === slotName,\n    )?.name ?? null\n  );\n}\n\nexport function getComponentVariantPropertyNames(component: DesignComponent) {\n  return Object.values(getComponentPropertyDefinitions(component))\n    .filter((definition) => definition.type === \"variant\")\n    .map((definition) => definition.name);\n}\n\nexport function withVariantPropertyOption(\n  component: DesignComponent,\n  option: string,\n) {\n  const now = new Date().toISOString();\n  const definitions = getComponentPropertyDefinitions(component);\n  const variantDefinition =\n    definitions[defaultVariantPropertyId] ??\n    createDefaultComponentPropertyDefinitions(now)[defaultVariantPropertyId];\n  const options = Array.from(\n    new Set([...(variantDefinition.options ?? []), option]),\n  );\n\n  return {\n    ...definitions,\n    [defaultVariantPropertyId]: {\n      ...variantDefinition,\n      options,\n      updatedAt: now,\n    },\n  };\n}\n\nexport function getComponentPropertyDefinitionSignature(\n  component: DesignComponent,\n) {\n  return Object.values(getComponentPropertyDefinitions(component))\n    .map((definition) =>\n      [\n        definition.name,\n        definition.type,\n        definition.defaultValue,\n        ...(definition.options ?? []),\n      ].join(\":\"),\n    )\n    .sort()\n    .join(\"|\");\n}\n\nfunction getUniqueComponentPropertyName(\n  baseName: string,\n  usedNames: Set<string>,\n) {\n  const fallbackName = baseName.trim() || \"Content\";\n  let name = fallbackName;\n  let index = 2;\n\n  while (usedNames.has(name)) {\n    name = `${fallbackName} ${index}`;\n    index += 1;\n  }\n\n  return name;\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/editor/component-properties.ts",
  "chunk_output": ".dx/www/output/source-routes/share--token-prototype/modules/src-features-editor-component-properties-ts-dd9412b976db9b22.mjs",
  "kind": "ts",
  "hash": "dd9412b976db9b22",
  "dependencies": [
    {
      "specifier": "@/features/editor/component-slots",
      "resolved_path": "src/features/editor/component-slots.ts",
      "chunk_output": ".dx/www/output/source-routes/share--token-prototype/modules/src-features-editor-component-slots-ts-6b9558251016056a.mjs",
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
    "source_path": "src/features/editor/component-properties.ts",
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
        "specifier": "@/features/editor/component-slots",
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
      "createDefaultComponentPropertyDefinitions",
      "createComponentPropertyDefinitionsForLayers",
      "getComponentPropertyDefinitions",
      "getComponentInstancePropertyValues",
      "getVariantForComponentProperties",
      "getComponentTextPropertyId",
      "getComponentTextPropertyNameForLayer",
      "getComponentVariantPropertyNames",
      "withVariantPropertyOption",
      "getComponentPropertyDefinitionSignature",
      "defaultVariantPropertyId",
      "defaultVariantPropertyName",
      "defaultVariantPropertyValue",
      "textComponentPropertyIdPrefix",
      "componentPropertyTypes"
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
