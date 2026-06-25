import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-lib-utils-ts-cb488a6352482fc7.mjs";
export const dxSourceText = "\"use client\";\n\nimport type * as React from \"react\";\n\nimport { cn } from \"@/lib/utils\";\n\nfunction Table({ className, ...props }: React.ComponentProps<\"table\">) {\n  return (\n    <div\n      data-slot=\"table-container\"\n      className=\"relative w-full overflow-x-auto\"\n    >\n      <table\n        data-slot=\"table\"\n        className={cn(\"w-full caption-bottom text-sm\", className)}\n        {...props}\n      />\n    </div>\n  );\n}\n\nfunction TableHeader({ className, ...props }: React.ComponentProps<\"thead\">) {\n  return (\n    <thead\n      data-slot=\"table-header\"\n      className={cn(\"[&_tr]:border-b\", className)}\n      {...props}\n    />\n  );\n}\n\nfunction TableBody({ className, ...props }: React.ComponentProps<\"tbody\">) {\n  return (\n    <tbody\n      data-slot=\"table-body\"\n      className={cn(\"[&_tr:last-child]:border-0\", className)}\n      {...props}\n    />\n  );\n}\n\nfunction TableFooter({ className, ...props }: React.ComponentProps<\"tfoot\">) {\n  return (\n    <tfoot\n      data-slot=\"table-footer\"\n      className={cn(\n        \"border-t bg-muted/50 font-medium [&>tr]:last:border-b-0\",\n        className,\n      )}\n      {...props}\n    />\n  );\n}\n\nfunction TableRow({ className, ...props }: React.ComponentProps<\"tr\">) {\n  return (\n    <tr\n      data-slot=\"table-row\"\n      className={cn(\n        \"border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted\",\n        className,\n      )}\n      {...props}\n    />\n  );\n}\n\nfunction TableHead({ className, ...props }: React.ComponentProps<\"th\">) {\n  return (\n    <th\n      data-slot=\"table-head\"\n      className={cn(\n        \"h-10 whitespace-nowrap px-2 text-left align-middle font-medium text-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]\",\n        className,\n      )}\n      {...props}\n    />\n  );\n}\n\nfunction TableCell({ className, ...props }: React.ComponentProps<\"td\">) {\n  return (\n    <td\n      data-slot=\"table-cell\"\n      className={cn(\n        \"whitespace-nowrap p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]\",\n        className,\n      )}\n      {...props}\n    />\n  );\n}\n\nfunction TableCaption({\n  className,\n  ...props\n}: React.ComponentProps<\"caption\">) {\n  return (\n    <caption\n      data-slot=\"table-caption\"\n      className={cn(\"mt-4 text-sm text-muted-foreground\", className)}\n      {...props}\n    />\n  );\n}\n\nexport {\n  Table,\n  TableBody,\n  TableCaption,\n  TableCell,\n  TableFooter,\n  TableHead,\n  TableHeader,\n  TableRow,\n};\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/components/ui/table.tsx",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-components-ui-table-tsx-723a47e2cdc85add.mjs",
  "kind": "tsx",
  "hash": "723a47e2cdc85add",
  "dependencies": [
    {
      "specifier": "@/lib/utils",
      "resolved_path": "src/lib/utils.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-lib-utils-ts-cb488a6352482fc7.mjs",
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
    "source_path": "src/components/ui/table.tsx",
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
    "static_imports": [
      {
        "specifier": "react",
        "side_effect_only": false,
        "type_only": true
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
