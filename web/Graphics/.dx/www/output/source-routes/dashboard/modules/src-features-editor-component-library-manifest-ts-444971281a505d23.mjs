
export const dxSourceText = "import type {\n  DesignComponent,\n  DesignDocument,\n  DesignLayer,\n  DesignLibraryMetadata,\n} from \"@/features/editor/types\";\n\nexport const componentLibraryManifestType = \"essence.component-library\";\n\nexport type ComponentLibraryManifest = {\n  type: typeof componentLibraryManifestType;\n  version: 1;\n  library: DesignLibraryMetadata;\n  components: DesignComponent[];\n  exportedAt: string;\n};\n\nexport type LocalLibraryStatus = {\n  componentCount: number;\n  changedCount: number;\n  pendingUpdateCount: number;\n  detachedCount: number;\n};\n\nexport function createComponentLibraryManifest(\n  document: DesignDocument,\n): ComponentLibraryManifest {\n  const components = Object.values(document.components ?? {});\n  const library = normalizeLibraryMetadata(\n    document.libraryMetadata,\n    components,\n  );\n\n  return {\n    type: componentLibraryManifestType,\n    version: 1,\n    library: {\n      ...library,\n      componentCount: components.length,\n      componentSignatures: getComponentSignatureMap(components),\n      updatedAt: new Date().toISOString(),\n    },\n    components: components.map(stripComponentLibraryState),\n    exportedAt: new Date().toISOString(),\n  };\n}\n\nexport function parseComponentLibraryManifest(\n  source: string,\n): ComponentLibraryManifest {\n  const parsed: unknown = JSON.parse(source);\n\n  if (!isComponentLibraryManifest(parsed)) {\n    throw new Error(\"The selected file is not an Essence component library.\");\n  }\n\n  return parsed;\n}\n\nexport function normalizeLibraryMetadata(\n  metadata: DesignLibraryMetadata | undefined,\n  components: DesignComponent[],\n): DesignLibraryMetadata {\n  const now = new Date().toISOString();\n\n  return {\n    id: metadata?.id ?? \"local-library\",\n    name: metadata?.name?.trim() || \"Essence Component Library\",\n    teamName: metadata?.teamName?.trim() || \"Personal\",\n    description: metadata?.description,\n    version: metadata?.version ?? 0,\n    componentCount: components.length,\n    componentSignatures: metadata?.componentSignatures,\n    publishedAt: metadata?.publishedAt,\n    updatedAt: metadata?.updatedAt ?? now,\n  };\n}\n\nexport function getLocalLibraryStatus(\n  document: DesignDocument,\n): LocalLibraryStatus {\n  const components = Object.values(document.components ?? {});\n  const signatures = document.libraryMetadata?.componentSignatures ?? {};\n\n  return {\n    componentCount: components.length,\n    changedCount: components.filter((component) => {\n      const publishedSignature = signatures[component.id];\n\n      return (\n        !publishedSignature ||\n        publishedSignature !== getComponentLibrarySignature(component)\n      );\n    }).length,\n    pendingUpdateCount: Object.keys(\n      document.pendingLibraryComponentUpdates ?? {},\n    ).length,\n    detachedCount: components.filter(\n      (component) => component.librarySource?.status === \"detached\",\n    ).length,\n  };\n}\n\nexport function getComponentSignatureMap(components: DesignComponent[]) {\n  return Object.fromEntries(\n    components.map((component) => [\n      component.id,\n      getComponentLibrarySignature(component),\n    ]),\n  );\n}\n\nexport function getComponentLibrarySignature(component: DesignComponent) {\n  return stableStringify(stripComponentLibraryState(component));\n}\n\nexport function stripComponentLibraryState(\n  component: DesignComponent,\n): DesignComponent {\n  const { librarySource: _librarySource, ...componentWithoutLibraryState } =\n    component;\n\n  return componentWithoutLibraryState;\n}\n\nfunction isComponentLibraryManifest(\n  value: unknown,\n): value is ComponentLibraryManifest {\n  if (!isRecord(value)) {\n    return false;\n  }\n\n  return (\n    value.type === componentLibraryManifestType &&\n    value.version === 1 &&\n    isLibraryMetadata(value.library) &&\n    Array.isArray(value.components) &&\n    value.components.every(isComponentLike) &&\n    typeof value.exportedAt === \"string\"\n  );\n}\n\nfunction isLibraryMetadata(value: unknown): value is DesignLibraryMetadata {\n  if (!isRecord(value)) {\n    return false;\n  }\n\n  return (\n    typeof value.id === \"string\" &&\n    typeof value.name === \"string\" &&\n    typeof value.teamName === \"string\" &&\n    typeof value.version === \"number\" &&\n    typeof value.componentCount === \"number\" &&\n    typeof value.updatedAt === \"string\"\n  );\n}\n\nfunction isComponentLike(value: unknown): value is DesignComponent {\n  if (!isRecord(value)) {\n    return false;\n  }\n\n  return (\n    typeof value.id === \"string\" &&\n    typeof value.name === \"string\" &&\n    typeof value.width === \"number\" &&\n    typeof value.height === \"number\" &&\n    Array.isArray(value.layers) &&\n    value.layers.every(isLayerLike) &&\n    typeof value.createdAt === \"string\" &&\n    typeof value.updatedAt === \"string\"\n  );\n}\n\nfunction isLayerLike(value: unknown): value is DesignLayer {\n  if (!isRecord(value)) {\n    return false;\n  }\n\n  return (\n    typeof value.id === \"string\" &&\n    typeof value.type === \"string\" &&\n    typeof value.name === \"string\" &&\n    typeof value.x === \"number\" &&\n    typeof value.y === \"number\" &&\n    typeof value.width === \"number\" &&\n    typeof value.height === \"number\"\n  );\n}\n\nfunction stableStringify(value: unknown): string {\n  if (Array.isArray(value)) {\n    return `[${value.map(stableStringify).join(\",\")}]`;\n  }\n\n  if (isRecord(value)) {\n    return `{${Object.keys(value)\n      .sort()\n      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)\n      .join(\",\")}}`;\n  }\n\n  return JSON.stringify(value);\n}\n\nfunction isRecord(value: unknown): value is Record<string, unknown> {\n  return Boolean(value) && typeof value === \"object\" && !Array.isArray(value);\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/editor/component-library-manifest.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-editor-component-library-manifest-ts-444971281a505d23.mjs",
  "kind": "ts",
  "hash": "444971281a505d23",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": false,
  "transform_kind": "metadata-only",
  "runtime_exports": [],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/features/editor/component-library-manifest.ts",
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
      "createComponentLibraryManifest",
      "parseComponentLibraryManifest",
      "normalizeLibraryMetadata",
      "getLocalLibraryStatus",
      "getComponentSignatureMap",
      "getComponentLibrarySignature",
      "stripComponentLibraryState",
      "componentLibraryManifestType"
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
