
export const dxSourceText = "\"use client\";\n\nexport function ReadinessMetric({\n  label,\n  value,\n}: {\n  label: string;\n  value: number;\n}) {\n  return (\n    <div className=\"rounded-sm bg-background px-2 py-1\">\n      <div className=\"text-[10px] text-muted-foreground\">{label}</div>\n      <div className=\"font-mono text-xs text-foreground\">{value}</div>\n    </div>\n  );\n}\n\nexport function downloadTextFile({\n  content,\n  filename,\n  type,\n}: {\n  content: string;\n  filename: string;\n  type: string;\n}) {\n  const blob = new Blob([content], { type });\n  const url = URL.createObjectURL(blob);\n  const link = document.createElement(\"a\");\n\n  link.href = url;\n  link.download = filename;\n  link.click();\n  URL.revokeObjectURL(url);\n}\n\nexport function toFilename(value: string) {\n  return (\n    value\n      .trim()\n      .toLowerCase()\n      .replace(/[^a-z0-9]+/g, \"-\")\n      .replace(/^-+|-+$/g, \"\") || \"release\"\n  );\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/editor/components/library-release-panel-shared.tsx",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-editor-components-library-release-panel-shared-tsx-185476f4669a07c8.mjs",
  "kind": "tsx",
  "hash": "185476f4669a07c8",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": false,
  "transform_kind": "metadata-only",
  "runtime_exports": [],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/features/editor/components/library-release-panel-shared.tsx",
    "source_kind": "tsx",
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
    "directives": [
      {
        "value": "use client",
        "scope": "module-prologue",
        "line": 1,
        "column": 1
      }
    ],
    "static_imports": [],
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
      "ReadinessMetric",
      "downloadTextFile",
      "toFilename"
    ],
    "jsx": true,
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
