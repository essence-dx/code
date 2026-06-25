
export const dxSourceText = "  | string\n  | number\n  | boolean\n  | null\n  | undefined\n  | ClassValue[]\n  | Record<string, unknown>;\n\nfunction appendClass(value: ClassValue, output: string[]) {\n  if (!value) {\n    return;\n  }\n\n  if (typeof value === \"string\" || typeof value === \"number\") {\n    output.push(String(value));\n    return;\n  }\n\n  if (Array.isArray(value)) {\n    value.forEach((item) => appendClass(item, output));\n    return;\n  }\n\n  if (typeof value === \"object\") {\n    for (const [className, enabled] of Object.entries(value)) {\n      if (enabled) {\n        output.push(className);\n      }\n    }\n  }\n}\n\nexport function clsx(...values) {\n  const output: string[] = [];\n  values.forEach((value) => appendClass(value, output));\n  return output.join(\" \");\n}\n\nexport default clsx;\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/lib/forge/utils/clsx.ts",
  "chunk_output": ".dx/www/output/source-routes/share--token/modules/src-lib-forge-utils-clsx-ts-6507f063f69574a3.mjs",
  "kind": "ts",
  "hash": "6507f063f69574a3",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": true,
  "transform_kind": "typescript-helper-runtime",
  "runtime_exports": [
    "clsx"
  ],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/lib/forge/utils/clsx.ts",
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
      "clsx"
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
  exportNames: ["clsx"]
});
  | string
  | number
  | boolean
  | null
  | undefined
  | ClassValue[]
  | Record<string, unknown>;

function appendClass(value: ClassValue, output: string[]) {
  if (!value) {
    return;
  }

  if (typeof value === "string" || typeof value === "number") {
    output.push(String(value));
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => appendClass(item, output));
    return;
  }

  if (typeof value === "object") {
    for (const [className, enabled] of Object.entries(value)) {
      if (enabled) {
        output.push(className);
      }
    }
  }
}

export function clsx(...values) {
  const output: string[] = [];
  values.forEach((value) => appendClass(value, output));
  return output.join(" ");
}

export default clsx;
export const dxRuntimeExports = Object.freeze({ clsx });
export const dxLinkedDependencies = Object.freeze([]);
export default dxSourceModule;
