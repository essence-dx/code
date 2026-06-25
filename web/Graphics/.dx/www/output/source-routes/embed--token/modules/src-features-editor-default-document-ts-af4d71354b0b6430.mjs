import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-features-editor-shortcut-preferences-ts-56dec907d5414dec.mjs";
import { dxSourceModule as dep1, dxRuntimeExports as dep1Runtime } from "./src-features-editor-variable-bindings-ts-f3a3411dc696a830.mjs";
import { dxSourceModule as dep2, dxRuntimeExports as dep2Runtime } from "./src-lib-forge-utils-nanoid-ts-eb21cd53da2dc635.mjs";
export const dxSourceText = "import { nanoid } from \"nanoid\";\nimport { defaultToolShortcutPreferences } from \"@/features/editor/shortcut-preferences\";\nimport { defaultVariableCollections } from \"@/features/editor/variable-bindings\";\nimport type { DesignDocument, DesignLayer } from \"@/features/editor/types\";\n\nexport function createStarterDocument(ownerName: string): DesignDocument {\n  const pageId = nanoid();\n  const frameId = nanoid();\n\n  return {\n    version: 1,\n    activePageId: pageId,\n    variables: {\n      \"color/surface\": \"#18181b\",\n      \"color/accent\": \"#5eead4\",\n      \"radius/default\": \"8\",\n    },\n    activeVariableModeId: \"default\",\n    variableModes: [{ id: \"default\", name: \"Default\" }],\n    variableCollections: defaultVariableCollections,\n    variableDefinitions: {\n      \"color/surface\": {\n        id: \"color/surface\",\n        name: \"color/surface\",\n        type: \"color\",\n        collectionId: \"paint\",\n        values: { default: \"#18181b\" },\n        createdAt: new Date().toISOString(),\n        updatedAt: new Date().toISOString(),\n      },\n      \"color/accent\": {\n        id: \"color/accent\",\n        name: \"color/accent\",\n        type: \"color\",\n        collectionId: \"paint\",\n        values: { default: \"#5eead4\" },\n        createdAt: new Date().toISOString(),\n        updatedAt: new Date().toISOString(),\n      },\n      \"radius/default\": {\n        id: \"radius/default\",\n        name: \"radius/default\",\n        type: \"number\",\n        collectionId: \"layout\",\n        values: { default: \"8\" },\n        createdAt: new Date().toISOString(),\n        updatedAt: new Date().toISOString(),\n      },\n    },\n    components: {},\n    layoutGridStyles: {},\n    paintStyles: {},\n    textStyles: {},\n    effectStyles: {},\n    layoutPresetStyles: {},\n    activityEvents: [],\n    performanceBaselines: [],\n    workspaceSettings: {\n      version: 1,\n      toolShortcuts: defaultToolShortcutPreferences,\n      pluginGrants: {},\n      pluginApprovals: {},\n      pluginRunHistory: [],\n      updatedAt: new Date().toISOString(),\n      updatedBy: null,\n    },\n    commentNotificationPreferences: {\n      enabled: true,\n      newComments: true,\n      replies: true,\n      assignments: true,\n      mentions: true,\n      reactions: true,\n      acknowledgements: true,\n      mutedEmails: [],\n      updatedAt: new Date().toISOString(),\n    },\n    notificationDeliveries: [],\n    updatedAt: new Date().toISOString(),\n    pages: [\n      {\n        id: pageId,\n        name: \"Canvas\",\n        background: \"#0f0f10\",\n        comments: [],\n        layers: [\n          {\n            id: frameId,\n            type: \"frame\",\n            name: `${ownerName || \"Essence\"} Board`,\n            x: 160,\n            y: 120,\n            width: 960,\n            height: 560,\n            rotation: 0,\n            opacity: 1,\n            visible: true,\n            locked: false,\n            fill: \"#f6f7f9\",\n            stroke: \"#d4d4d8\",\n            strokeWidth: 1,\n            cornerRadius: 12,\n          },\n          createTextLayer(\"title\", \"Start designing\", 220, 178, 320, 48, 28),\n          createTextLayer(\n            \"note\",\n            \"Create layers, tune properties, and keep the workspace moving.\",\n            222,\n            232,\n            440,\n            34,\n            15,\n          ),\n        ],\n      },\n    ],\n  };\n}\n\nfunction createTextLayer(\n  id: string,\n  text: string,\n  x: number,\n  y: number,\n  width: number,\n  height: number,\n  fontSize: number,\n): DesignLayer {\n  return {\n    id,\n    type: \"text\",\n    name: text,\n    x,\n    y,\n    width,\n    height,\n    rotation: 0,\n    opacity: 1,\n    visible: true,\n    locked: false,\n    fill: \"transparent\",\n    stroke: \"transparent\",\n    strokeWidth: 0,\n    cornerRadius: 0,\n    text,\n    fontFamily: \"Inter, Arial, sans-serif\",\n    fontSize,\n    fontWeight: fontSize > 20 ? 700 : 400,\n    lineHeight: 1.2,\n    letterSpacing: 0,\n    textAlign: \"left\",\n    textColor: \"#18181b\",\n    textResizeMode: \"fixed\",\n  };\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/editor/default-document.ts",
  "chunk_output": ".dx/www/output/source-routes/embed--token/modules/src-features-editor-default-document-ts-af4d71354b0b6430.mjs",
  "kind": "ts",
  "hash": "af4d71354b0b6430",
  "dependencies": [
    {
      "specifier": "@/features/editor/shortcut-preferences",
      "resolved_path": "src/features/editor/shortcut-preferences.ts",
      "chunk_output": ".dx/www/output/source-routes/embed--token/modules/src-features-editor-shortcut-preferences-ts-56dec907d5414dec.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/editor/variable-bindings",
      "resolved_path": "src/features/editor/variable-bindings.ts",
      "chunk_output": ".dx/www/output/source-routes/embed--token/modules/src-features-editor-variable-bindings-ts-f3a3411dc696a830.mjs",
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
    "source_path": "src/features/editor/default-document.ts",
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
        "specifier": "@/features/editor/shortcut-preferences",
        "side_effect_only": false,
        "type_only": false
      },
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
      "createStarterDocument"
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
