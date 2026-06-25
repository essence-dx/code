
export const dxSourceText = "const alphabet =\n  \"0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz-\";\n\nexport function nanoid(size = 21) {\n  const bytes = new Uint8Array(Math.max(1, size));\n  crypto.getRandomValues(bytes);\n\n  return Array.from(bytes, (byte) => alphabet[byte & 63]).join(\"\");\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/lib/forge/utils/nanoid.ts",
  "chunk_output": ".dx/www/output/source-routes/share--token/modules/src-lib-forge-utils-nanoid-ts-eb21cd53da2dc635.mjs",
  "kind": "ts",
  "hash": "eb21cd53da2dc635",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": true,
  "transform_kind": "typescript-helper-runtime",
  "runtime_exports": [
    "nanoid"
  ],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/lib/forge/utils/nanoid.ts",
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
      "nanoid"
    ],
    "jsx": false,
    "top_level_await": false,
    "full_nextjs_parity": false,
    "analysis_boundary": "Uses vendored Turbopack ECMAScript and selected Next transform behavior as compatibility references while emitting DX-owned source graph receipts."
  },
  "node_modules_required": false
});
export const dxRuntimeModule = Object.freeze({
  transformed: true,
  transformKind: "typescript-helper-runtime",
  exportNames: ["nanoid"]
});
const alphabet =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz-";

export function nanoid(size = 21) {
  const bytes = new Uint8Array(Math.max(1, size));
  crypto.getRandomValues(bytes);

  return Array.from(bytes, (byte) => alphabet[byte & 63]).join("");
}
export const dxRuntimeExports = Object.freeze({ nanoid });
export const dxLinkedDependencies = Object.freeze([]);
export default dxSourceModule;
