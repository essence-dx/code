
export const dxSourceText = "import type { CSSProperties } from \"react\";\nimport type { Column } from \"@tanstack/react-table\";\n\nexport function getColumnPinningStyle<TData>({\n  column,\n  withBorder = false,\n}: {\n  column: Column<TData>;\n  withBorder?: boolean;\n}): CSSProperties {\n  const isPinned = column.getIsPinned();\n  const isLastLeftPinnedColumn =\n    isPinned === \"left\" && column.getIsLastColumn(\"left\");\n  const isFirstRightPinnedColumn =\n    isPinned === \"right\" && column.getIsFirstColumn(\"right\");\n\n  return {\n    boxShadow: withBorder\n      ? isLastLeftPinnedColumn\n        ? \"-4px 0 4px -4px var(--border) inset\"\n        : isFirstRightPinnedColumn\n          ? \"4px 0 4px -4px var(--border) inset\"\n          : undefined\n      : undefined,\n    left: isPinned === \"left\" ? `${column.getStart(\"left\")}px` : undefined,\n    right: isPinned === \"right\" ? `${column.getAfter(\"right\")}px` : undefined,\n    opacity: isPinned ? 0.97 : 1,\n    position: isPinned ? \"sticky\" : \"relative\",\n    background: \"var(--background)\",\n    width: column.getSize(),\n    zIndex: isPinned ? 1 : undefined,\n  };\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/lib/tablecn-data-table.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-lib-tablecn-data-table-ts-9bf4c9e4016e109e.mjs",
  "kind": "ts",
  "hash": "9bf4c9e4016e109e",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": false,
  "transform_kind": "metadata-only",
  "runtime_exports": [],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/lib/tablecn-data-table.ts",
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
        "specifier": "react",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@tanstack/react-table",
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
      "getColumnPinningStyle"
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
