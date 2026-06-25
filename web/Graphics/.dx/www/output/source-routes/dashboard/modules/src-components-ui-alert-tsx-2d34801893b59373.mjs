import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-lib-utils-ts-cb488a6352482fc7.mjs";
import { dxSourceModule as dep1, dxRuntimeExports as dep1Runtime } from "./src-lib-forge-variants-class-variance-authority-ts-357cdf6d80c9f9e9.mjs";
export const dxSourceText = "import * as React from \"react\"\nimport { cva, type VariantProps } from \"class-variance-authority\"\n\nimport { cn } from \"@/lib/utils\"\n\nconst alertVariants = cva(\n  \"group/alert relative grid w-full gap-0.5 rounded-lg border px-2.5 py-2 text-left text-sm has-data-[slot=alert-action]:relative has-data-[slot=alert-action]:pr-18 has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:gap-x-2 *:[svg]:row-span-2 *:[svg]:translate-y-0.5 *:[svg]:text-current *:[svg:not([class*='size-'])]:size-4\",\n  {\n    variants: {\n      variant: {\n        default: \"bg-card text-card-foreground\",\n        destructive:\n          \"bg-card text-destructive *:data-[slot=alert-description]:text-destructive/90 *:[svg]:text-current\",\n      },\n    },\n    defaultVariants: {\n      variant: \"default\",\n    },\n  }\n)\n\nfunction Alert({\n  className,\n  variant,\n  ...props\n}: React.ComponentProps<\"div\"> & VariantProps<typeof alertVariants>) {\n  return (\n    <div\n      data-slot=\"alert\"\n      role=\"alert\"\n      className={cn(alertVariants({ variant }), className)}\n      {...props}\n    />\n  )\n}\n\nfunction AlertTitle({ className, ...props }: React.ComponentProps<\"div\">) {\n  return (\n    <div\n      data-slot=\"alert-title\"\n      className={cn(\n        \"font-medium group-has-[>svg]/alert:col-start-2 [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground\",\n        className\n      )}\n      {...props}\n    />\n  )\n}\n\nfunction AlertDescription({\n  className,\n  ...props\n}: React.ComponentProps<\"div\">) {\n  return (\n    <div\n      data-slot=\"alert-description\"\n      className={cn(\n        \"text-sm text-balance text-muted-foreground md:text-pretty [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground [&_p:not(:last-child)]:mb-4\",\n        className\n      )}\n      {...props}\n    />\n  )\n}\n\nfunction AlertAction({ className, ...props }: React.ComponentProps<\"div\">) {\n  return (\n    <div\n      data-slot=\"alert-action\"\n      className={cn(\"absolute top-2 right-2\", className)}\n      {...props}\n    />\n  )\n}\n\nexport { Alert, AlertTitle, AlertDescription, AlertAction }\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/components/ui/alert.tsx",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-components-ui-alert-tsx-2d34801893b59373.mjs",
  "kind": "tsx",
  "hash": "2d34801893b59373",
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
      "specifier": "class-variance-authority",
      "resolved_path": "src/lib/forge/variants/class-variance-authority.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-lib-forge-variants-class-variance-authority-ts-357cdf6d80c9f9e9.mjs",
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
    "source_path": "src/components/ui/alert.tsx",
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
        "specifier": "class-variance-authority",
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
export const dxLinkedDependencies = Object.freeze([dep0, dep1]);
export default dxSourceModule;
