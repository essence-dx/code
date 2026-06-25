
export const dxSourceText = "import type { EditorTool } from \"@/features/editor/types\";\n\nexport type ToolShortcutPreferences = Record<EditorTool, string>;\n\nexport const defaultToolShortcutPreferences: ToolShortcutPreferences = {\n  select: \"v\",\n  hand: \"h\",\n  pen: \"p\",\n  pencil: \"b\",\n  cutter: \"x\",\n  measure: \"m\",\n  frame: \"f\",\n  rectangle: \"r\",\n  ellipse: \"o\",\n  text: \"t\",\n  sticky: \"n\",\n  comment: \"c\",\n};\n\nexport function normalizeShortcutKey(value: string) {\n  return value.trim().slice(0, 1).toLowerCase();\n}\n\nexport function normalizeToolShortcutPreferences(\n  input: unknown,\n  fallback: ToolShortcutPreferences = defaultToolShortcutPreferences,\n): ToolShortcutPreferences {\n  const next = { ...fallback };\n\n  if (!isRecord(input)) {\n    return next;\n  }\n\n  for (const tool of Object.keys(defaultToolShortcutPreferences) as EditorTool[]) {\n    const rawShortcut = input[tool];\n\n    if (typeof rawShortcut !== \"string\") {\n      continue;\n    }\n\n    const normalizedShortcut = normalizeShortcutKey(rawShortcut);\n\n    if (normalizedShortcut) {\n      next[tool] = normalizedShortcut;\n    }\n  }\n\n  return next;\n}\n\nexport function getToolForShortcut(\n  shortcuts: ToolShortcutPreferences,\n  key: string,\n) {\n  const normalizedKey = normalizeShortcutKey(key);\n  const entry = Object.entries(shortcuts).find(\n    ([, shortcut]) => normalizeShortcutKey(shortcut) === normalizedKey,\n  );\n\n  return entry?.[0] as EditorTool | undefined;\n}\n\nfunction isRecord(value: unknown): value is Record<string, unknown> {\n  return Boolean(value) && typeof value === \"object\" && !Array.isArray(value);\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/editor/shortcut-preferences.ts",
  "chunk_output": ".dx/www/output/source-routes/share--token/modules/src-features-editor-shortcut-preferences-ts-56dec907d5414dec.mjs",
  "kind": "ts",
  "hash": "56dec907d5414dec",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": false,
  "transform_kind": "metadata-only",
  "runtime_exports": [],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/features/editor/shortcut-preferences.ts",
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
      "normalizeShortcutKey",
      "normalizeToolShortcutPreferences",
      "getToolForShortcut",
      "defaultToolShortcutPreferences"
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
