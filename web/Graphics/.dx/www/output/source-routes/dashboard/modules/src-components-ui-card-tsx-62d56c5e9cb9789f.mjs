import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-lib-utils-ts-cb488a6352482fc7.mjs";
export const dxSourceText = "import * as React from \"react\";\n\nimport { cn } from \"@/lib/utils\";\n\nfunction Card({ className, ...props }: React.ComponentProps<\"div\">) {\n  return (\n    <div\n      data-slot=\"card\"\n      className={cn(\n        \"rounded-lg border border-border bg-card text-card-foreground shadow-sm\",\n        className,\n      )}\n      {...props}\n    />\n  );\n}\n\nfunction CardHeader({ className, ...props }: React.ComponentProps<\"div\">) {\n  return (\n    <div\n      data-slot=\"card-header\"\n      className={cn(\"flex flex-col gap-1.5 p-4\", className)}\n      {...props}\n    />\n  );\n}\n\nfunction CardTitle({ className, ...props }: React.ComponentProps<\"div\">) {\n  return (\n    <div\n      data-slot=\"card-title\"\n      className={cn(\"font-semibold leading-none tracking-normal\", className)}\n      {...props}\n    />\n  );\n}\n\nfunction CardDescription({\n  className,\n  ...props\n}: React.ComponentProps<\"div\">) {\n  return (\n    <div\n      data-slot=\"card-description\"\n      className={cn(\"text-sm text-muted-foreground\", className)}\n      {...props}\n    />\n  );\n}\n\nfunction CardContent({ className, ...props }: React.ComponentProps<\"div\">) {\n  return (\n    <div\n      data-slot=\"card-content\"\n      className={cn(\"p-4 pt-0\", className)}\n      {...props}\n    />\n  );\n}\n\nexport { Card, CardContent, CardDescription, CardHeader, CardTitle };\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/components/ui/card.tsx",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-components-ui-card-tsx-62d56c5e9cb9789f.mjs",
  "kind": "tsx",
  "hash": "62d56c5e9cb9789f",
  "dependencies": [
    {
      "specifier": "@/lib/utils",
      "resolved_path": "src/lib/utils.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-lib-utils-ts-cb488a6352482fc7.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "react",
      "resolved_path": null,
      "chunk_output": null,
      "kind": "compiler-intrinsic",
      "resolver_source": "compiler-intrinsic",
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
    "source_path": "src/components/ui/card.tsx",
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
    "directives": [],
    "static_imports": [
      {
        "specifier": "react",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/lib/utils",
        "side_effect_only": false,
        "type_only": false
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
    "export_names": [],
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
export const dxLinkedDependencies = Object.freeze([dep0]);
export default dxSourceModule;
