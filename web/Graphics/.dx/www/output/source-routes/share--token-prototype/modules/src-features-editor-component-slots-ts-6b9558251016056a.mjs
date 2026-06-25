
export const dxSourceText = "import type {\n  DesignComponent,\n  DesignComponentSlotType,\n  DesignComponentVariant,\n  DesignLayer,\n} from \"@/features/editor/types\";\n\nexport const componentSlotTypeLabels: Record<DesignComponentSlotType, string> =\n  {\n    content: \"Content\",\n    media: \"Media\",\n    container: \"Container\",\n    shape: \"Shape\",\n  };\n\nexport const componentSlotTypes = [\n  \"content\",\n  \"media\",\n  \"container\",\n  \"shape\",\n] as const satisfies DesignComponentSlotType[];\n\nexport type ComponentInstanceSlotRow = {\n  layer: DesignLayer;\n  sourceLayer: DesignLayer | null;\n  slotName: string;\n  slotType: DesignComponentSlotType;\n};\n\nexport function getComponentSlotMetadata(layer: DesignLayer) {\n  return {\n    componentSlotName: getComponentSlotName(layer),\n    componentSlotType: getComponentSlotType(layer),\n  } satisfies Pick<DesignLayer, \"componentSlotName\" | \"componentSlotType\">;\n}\n\nexport function withUniqueComponentSlotNames(layers: DesignLayer[]) {\n  const usedNames = new Set<string>();\n\n  return layers.map((layer) => {\n    const slotName = getUniqueComponentSlotName(\n      getComponentSlotName(layer),\n      usedNames,\n    );\n\n    usedNames.add(slotName);\n\n    return {\n      ...layer,\n      componentSlotName: slotName,\n      componentSlotType: getComponentSlotType(layer),\n    };\n  });\n}\n\nexport function getComponentSlotName(layer: DesignLayer) {\n  const explicitName = layer.componentSlotName?.trim();\n\n  if (explicitName) {\n    return explicitName;\n  }\n\n  return layer.name.replace(/\\s+Instance$/i, \"\").trim() || \"Layer\";\n}\n\nexport function getComponentSlotType(\n  layer: DesignLayer,\n): DesignComponentSlotType {\n  if (layer.componentSlotType) {\n    return layer.componentSlotType;\n  }\n\n  if (layer.type === \"text\" || layer.type === \"sticky\") {\n    return \"content\";\n  }\n\n  if (layer.type === \"image\") {\n    return \"media\";\n  }\n\n  if (layer.type === \"frame\") {\n    return \"container\";\n  }\n\n  return \"shape\";\n}\n\nexport function getComponentSlotCount(layers: DesignLayer[]) {\n  return layers.filter((layer) => Boolean(getComponentSlotName(layer))).length;\n}\n\nexport function getComponentInstanceSlotRows(\n  layers: DesignLayer[],\n  targetLayer: DesignLayer,\n  component: DesignComponent,\n): ComponentInstanceSlotRow[] {\n  const sourceLayers = getComponentSourceLayers(\n    component,\n    targetLayer.componentVariantId,\n  );\n  const sourceById = new Map(sourceLayers.map((layer) => [layer.id, layer]));\n\n  return getComponentInstanceScope(layers, targetLayer).map((layer, index) => {\n    const sourceLayer =\n      sourceById.get(layer.componentLayerId ?? \"\") ??\n      sourceLayers[index] ??\n      null;\n    const slotSource = sourceLayer ?? layer;\n\n    return {\n      layer,\n      sourceLayer,\n      slotName: getComponentSlotName(slotSource),\n      slotType: getComponentSlotType(slotSource),\n    };\n  });\n}\n\nexport function getComponentInstanceScope(\n  layers: DesignLayer[],\n  targetLayer: DesignLayer,\n) {\n  if (!targetLayer.componentId) {\n    return [];\n  }\n\n  if (!targetLayer.groupId) {\n    return [targetLayer];\n  }\n\n  const scopedLayers = layers.filter(\n    (layer) =>\n      layer.groupId === targetLayer.groupId &&\n      layer.componentId === targetLayer.componentId &&\n      layer.componentVariantId === targetLayer.componentVariantId,\n  );\n\n  return scopedLayers.length > 0 ? scopedLayers : [targetLayer];\n}\n\nexport function getComponentSourceLayers(\n  component: DesignComponent,\n  variantId?: string,\n): DesignLayer[] {\n  return getComponentSource(component, variantId).layers;\n}\n\nexport function getComponentSource(\n  component: DesignComponent,\n  variantId?: string,\n): DesignComponent | DesignComponentVariant {\n  return (\n    component.variants?.find((variant) => variant.id === variantId) ??\n    component\n  );\n}\n\nexport function getComponentSlotSignature(layer: DesignLayer) {\n  return [layer.componentSlotName ?? \"\", layer.componentSlotType ?? \"\"].join(\n    \":\",\n  );\n}\n\nfunction getUniqueComponentSlotName(baseName: string, usedNames: Set<string>) {\n  const fallbackName = baseName.trim() || \"Layer\";\n  let name = fallbackName;\n  let index = 2;\n\n  while (usedNames.has(name)) {\n    name = `${fallbackName} ${index}`;\n    index += 1;\n  }\n\n  return name;\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/editor/component-slots.ts",
  "chunk_output": ".dx/www/output/source-routes/share--token-prototype/modules/src-features-editor-component-slots-ts-6b9558251016056a.mjs",
  "kind": "ts",
  "hash": "6b9558251016056a",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": false,
  "transform_kind": "metadata-only",
  "runtime_exports": [],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/features/editor/component-slots.ts",
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
      "getComponentSlotMetadata",
      "withUniqueComponentSlotNames",
      "getComponentSlotName",
      "getComponentSlotType",
      "getComponentSlotCount",
      "getComponentInstanceSlotRows",
      "getComponentInstanceScope",
      "getComponentSourceLayers",
      "getComponentSource",
      "getComponentSlotSignature",
      "componentSlotTypeLabels",
      "componentSlotTypes"
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
