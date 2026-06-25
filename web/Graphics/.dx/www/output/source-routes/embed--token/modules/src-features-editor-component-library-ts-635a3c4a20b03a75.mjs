import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-features-editor-component-properties-ts-dd9412b976db9b22.mjs";
import { dxSourceModule as dep1, dxRuntimeExports as dep1Runtime } from "./src-features-editor-component-slots-ts-6b9558251016056a.mjs";
import { dxSourceModule as dep2, dxRuntimeExports as dep2Runtime } from "./src-lib-forge-utils-nanoid-ts-eb21cd53da2dc635.mjs";
export const dxSourceText = "import { nanoid } from \"nanoid\";\nimport {\n  createComponentPropertyDefinitionsForLayers,\n  defaultVariantPropertyName,\n  getComponentInstancePropertyValues,\n} from \"@/features/editor/component-properties\";\nimport {\n  getComponentSlotMetadata,\n  withUniqueComponentSlotNames,\n} from \"@/features/editor/component-slots\";\nimport type {\n  DesignComponent,\n  DesignComponentVariant,\n  DesignGroup,\n  DesignLayer,\n} from \"@/features/editor/types\";\n\nexport function createDesignComponent(\n  layers: DesignLayer[],\n  name: string,\n): DesignComponent | null {\n  if (layers.length === 0) {\n    return null;\n  }\n\n  const bounds = getLayerBounds(layers);\n  const now = new Date().toISOString();\n  const componentLayers = withUniqueComponentSlotNames(\n    layers.map((layer) => normalizeComponentLayer(layer, bounds)),\n  );\n\n  return {\n    id: nanoid(),\n    name,\n    width: bounds.width,\n    height: bounds.height,\n    layers: componentLayers,\n    propertyDefinitions: createComponentPropertyDefinitionsForLayers(\n      componentLayers,\n      now,\n    ),\n    createdAt: now,\n    updatedAt: now,\n  };\n}\n\nexport function createDesignComponentVariant(\n  layers: DesignLayer[],\n  name: string,\n): DesignComponentVariant | null {\n  if (layers.length === 0) {\n    return null;\n  }\n\n  const bounds = getLayerBounds(layers);\n  const now = new Date().toISOString();\n\n  return {\n    id: nanoid(),\n    name,\n    properties: {\n      [defaultVariantPropertyName]: name,\n    },\n    width: bounds.width,\n    height: bounds.height,\n    layers: withUniqueComponentSlotNames(\n      layers.map((layer) => normalizeComponentLayer(layer, bounds)),\n    ),\n    createdAt: now,\n    updatedAt: now,\n  };\n}\n\nexport function createComponentInstance(\n  component: DesignComponent,\n  point: { x: number; y: number },\n  variantId?: string,\n): { layers: DesignLayer[]; group: DesignGroup | null } {\n  const variant = component.variants?.find((item) => item.id === variantId);\n  const source = variant ?? component;\n  const componentProperties = getComponentInstancePropertyValues(\n    component,\n    variant,\n  );\n  const groupId = source.layers.length > 1 ? nanoid() : undefined;\n  const now = new Date().toISOString();\n  const layers = source.layers.map((layer) => ({\n    ...layer,\n    id: nanoid(),\n    name: layer.name.endsWith(\" Instance\")\n      ? layer.name\n      : `${layer.name} Instance`,\n    groupId,\n    componentId: component.id,\n    componentVariantId: variant?.id,\n    componentLayerId: layer.id,\n    componentProperties,\n    x: Math.round(point.x + layer.x),\n    y: Math.round(point.y + layer.y),\n  }));\n\n  return {\n    layers,\n    group: groupId\n      ? {\n          id: groupId,\n          name: variant\n            ? `${component.name} / ${variant.name} Instance`\n            : `${component.name} Instance`,\n          layerIds: layers.map((layer) => layer.id),\n          createdAt: now,\n          updatedAt: now,\n        }\n      : null,\n  };\n}\n\nfunction normalizeComponentLayer(\n  layer: DesignLayer,\n  bounds: ReturnType<typeof getLayerBounds>,\n): DesignLayer {\n  const {\n    componentId: _componentId,\n    componentVariantId: _componentVariantId,\n    componentLayerId: _componentLayerId,\n    componentProperties: _componentProperties,\n    groupId: _groupId,\n    ...layerWithoutRuntimeRefs\n  } = layer;\n\n  return {\n    ...layerWithoutRuntimeRefs,\n    ...getComponentSlotMetadata(layerWithoutRuntimeRefs),\n    id: nanoid(),\n    x: Math.round(layer.x - bounds.left),\n    y: Math.round(layer.y - bounds.top),\n  };\n}\n\nfunction getLayerBounds(layers: DesignLayer[]) {\n  const left = Math.min(...layers.map((layer) => layer.x));\n  const top = Math.min(...layers.map((layer) => layer.y));\n  const right = Math.max(...layers.map((layer) => layer.x + layer.width));\n  const bottom = Math.max(...layers.map((layer) => layer.y + layer.height));\n\n  return {\n    left,\n    top,\n    width: Math.max(1, Math.round(right - left)),\n    height: Math.max(1, Math.round(bottom - top)),\n  };\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/editor/component-library.ts",
  "chunk_output": ".dx/www/output/source-routes/embed--token/modules/src-features-editor-component-library-ts-635a3c4a20b03a75.mjs",
  "kind": "ts",
  "hash": "635a3c4a20b03a75",
  "dependencies": [
    {
      "specifier": "@/features/editor/component-properties",
      "resolved_path": "src/features/editor/component-properties.ts",
      "chunk_output": ".dx/www/output/source-routes/embed--token/modules/src-features-editor-component-properties-ts-dd9412b976db9b22.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/editor/component-slots",
      "resolved_path": "src/features/editor/component-slots.ts",
      "chunk_output": ".dx/www/output/source-routes/embed--token/modules/src-features-editor-component-slots-ts-6b9558251016056a.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "nanoid",
      "resolved_path": "src/lib/forge/utils/nanoid.ts",
      "chunk_output": ".dx/www/output/source-routes/embed--token/modules/src-lib-forge-utils-nanoid-ts-eb21cd53da2dc635.mjs",
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
    "source_path": "src/features/editor/component-library.ts",
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
        "specifier": "nanoid",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/editor/component-properties",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/editor/component-slots",
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
      "createDesignComponent",
      "createDesignComponentVariant",
      "createComponentInstance"
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
export const dxLinkedDependencies = Object.freeze([dep0, dep1, dep2]);
export default dxSourceModule;
