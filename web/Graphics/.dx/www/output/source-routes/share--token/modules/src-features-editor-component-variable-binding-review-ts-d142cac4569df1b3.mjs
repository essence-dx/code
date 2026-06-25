import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-features-editor-variable-bindings-ts-f3a3411dc696a830.mjs";
export const dxSourceText = "import { variableBindableProperties } from \"@/features/editor/variable-bindings\";\nimport type {\n  DesignComponent,\n  DesignDocument,\n  DesignLayer,\n  DesignVariableBindableProperty,\n  DesignVariableType,\n} from \"@/features/editor/types\";\n\nexport type ComponentVariableBindingIssueType =\n  | \"missing-variable\"\n  | \"type-mismatch\";\n\nexport type ComponentVariableBindingIssue = {\n  id: string;\n  type: ComponentVariableBindingIssueType;\n  componentId: string;\n  componentName: string;\n  layerId: string;\n  layerName: string;\n  property: DesignVariableBindableProperty;\n  propertyLabel: string;\n  variableId: string;\n  detail: string;\n};\n\nexport type ComponentVariableBindingReview = {\n  bindingCount: number;\n  readyBindingCount: number;\n  issueCount: number;\n  missingVariableCount: number;\n  typeMismatchCount: number;\n  issues: ComponentVariableBindingIssue[];\n};\n\nconst propertyTypeByName = new Map(\n  variableBindableProperties.map((item) => [item.property, item.type]),\n);\nconst propertyLabelByName = new Map(\n  variableBindableProperties.map((item) => [item.property, item.label]),\n);\n\nexport function getComponentVariableBindingReview(\n  document: DesignDocument,\n  components: DesignComponent[],\n): ComponentVariableBindingReview {\n  let bindingCount = 0;\n  const issues: ComponentVariableBindingIssue[] = [];\n\n  components.forEach((component) => {\n    component.layers.forEach((layer) => {\n      Object.entries(layer.variableBindings ?? {}).forEach(\n        ([property, variableId]) => {\n          bindingCount += 1;\n          const issue = getBindingIssue(\n            document,\n            component,\n            layer,\n            property as DesignVariableBindableProperty,\n            variableId,\n          );\n\n          if (issue) {\n            issues.push(issue);\n          }\n        },\n      );\n    });\n  });\n\n  return {\n    bindingCount,\n    readyBindingCount: bindingCount - issues.length,\n    issueCount: issues.length,\n    missingVariableCount: issues.filter((issue) => issue.type === \"missing-variable\")\n      .length,\n    typeMismatchCount: issues.filter((issue) => issue.type === \"type-mismatch\")\n      .length,\n    issues: issues.sort(sortBindingIssues),\n  };\n}\n\nexport function removeStaleComponentVariableBindingsInDocument(\n  document: DesignDocument,\n): DesignDocument {\n  if (!document.components) {\n    return document;\n  }\n\n  const now = new Date().toISOString();\n  let changed = false;\n  const components = Object.fromEntries(\n    Object.entries(document.components).map(([componentId, component]) => {\n      const result = removeStaleBindingsFromLayers(document, component.layers);\n\n      if (!result.changed) {\n        return [componentId, component];\n      }\n\n      changed = true;\n\n      return [\n        componentId,\n        {\n          ...component,\n          layers: result.layers,\n          updatedAt: now,\n        },\n      ];\n    }),\n  );\n\n  return changed\n    ? {\n        ...document,\n        components,\n        updatedAt: now,\n      }\n    : document;\n}\n\nfunction getBindingIssue(\n  document: DesignDocument,\n  component: DesignComponent,\n  layer: DesignLayer,\n  property: DesignVariableBindableProperty,\n  variableId: string,\n): ComponentVariableBindingIssue | null {\n  const variable = document.variableDefinitions?.[variableId];\n  const expectedType = propertyTypeByName.get(property);\n  const propertyLabel = propertyLabelByName.get(property) ?? property;\n\n  if (!variable) {\n    return {\n      id: `${component.id}:${layer.id}:${property}:missing`,\n      type: \"missing-variable\",\n      componentId: component.id,\n      componentName: component.name,\n      layerId: layer.id,\n      layerName: layer.name,\n      property,\n      propertyLabel,\n      variableId,\n      detail: \"Binding points to a deleted or unavailable variable.\",\n    };\n  }\n\n  if (expectedType && variable.type !== expectedType) {\n    return {\n      id: `${component.id}:${layer.id}:${property}:type`,\n      type: \"type-mismatch\",\n      componentId: component.id,\n      componentName: component.name,\n      layerId: layer.id,\n      layerName: layer.name,\n      property,\n      propertyLabel,\n      variableId,\n      detail: `Binding expects a ${expectedType} variable but points to ${variable.type}.`,\n    };\n  }\n\n  return null;\n}\n\nfunction removeStaleBindingsFromLayers(\n  document: DesignDocument,\n  layers: DesignLayer[],\n) {\n  let changed = false;\n  const nextLayers = layers.map((layer) => {\n    const bindings = layer.variableBindings;\n\n    if (!bindings) {\n      return layer;\n    }\n\n    const nextBindings = Object.fromEntries(\n      Object.entries(bindings).filter(([property, variableId]) => {\n        const expectedType = propertyTypeByName.get(\n          property as DesignVariableBindableProperty,\n        );\n        const variable = document.variableDefinitions?.[variableId];\n\n        return Boolean(variable && (!expectedType || variable.type === expectedType));\n      }),\n    );\n\n    if (Object.keys(nextBindings).length === Object.keys(bindings).length) {\n      return layer;\n    }\n\n    changed = true;\n\n    return {\n      ...layer,\n      variableBindings:\n        Object.keys(nextBindings).length > 0 ? nextBindings : undefined,\n    };\n  });\n\n  return {\n    changed,\n    layers: nextLayers,\n  };\n}\n\nfunction sortBindingIssues(\n  first: ComponentVariableBindingIssue,\n  second: ComponentVariableBindingIssue,\n) {\n  const typeDifference =\n    getIssuePriority(first.type) - getIssuePriority(second.type);\n\n  if (typeDifference !== 0) {\n    return typeDifference;\n  }\n\n  return `${first.componentName} ${first.layerName}`.localeCompare(\n    `${second.componentName} ${second.layerName}`,\n  );\n}\n\nfunction getIssuePriority(type: ComponentVariableBindingIssueType) {\n  return type === \"missing-variable\" ? 0 : 1;\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/editor/component-variable-binding-review.ts",
  "chunk_output": ".dx/www/output/source-routes/share--token/modules/src-features-editor-component-variable-binding-review-ts-d142cac4569df1b3.mjs",
  "kind": "ts",
  "hash": "d142cac4569df1b3",
  "dependencies": [
    {
      "specifier": "@/features/editor/variable-bindings",
      "resolved_path": "src/features/editor/variable-bindings.ts",
      "chunk_output": ".dx/www/output/source-routes/share--token/modules/src-features-editor-variable-bindings-ts-f3a3411dc696a830.mjs",
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
    "source_path": "src/features/editor/component-variable-binding-review.ts",
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
      "getComponentVariableBindingReview",
      "removeStaleComponentVariableBindingsInDocument"
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
