import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-lib-utils-ts-cb488a6352482fc7.mjs";
import { dxSourceModule as dep1, dxRuntimeExports as dep1Runtime } from "./src-lib-forge-variants-class-variance-authority-ts-357cdf6d80c9f9e9.mjs";
import { dxSourceModule as dep2, dxRuntimeExports as dep2Runtime } from "./src-lib-forge-radix-ui-radix-ui-tsx-6774b7bf6fcb9322.mjs";
export const dxSourceText = "import * as React from \"react\"\nimport { cva, type VariantProps } from \"class-variance-authority\"\nimport { Slot } from \"radix-ui\"\n\nimport { cn } from \"@/lib/utils\"\n\nconst badgeVariants = cva(\n  \"group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!\",\n  {\n    variants: {\n      variant: {\n        default: \"bg-primary text-primary-foreground [a]:hover:bg-primary/80\",\n        secondary:\n          \"bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80\",\n        destructive:\n          \"bg-destructive/10 text-destructive focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive/20\",\n        outline:\n          \"border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground\",\n        ghost:\n          \"hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50\",\n        link: \"text-primary underline-offset-4 hover:underline\",\n      },\n    },\n    defaultVariants: {\n      variant: \"default\",\n    },\n  }\n)\n\nfunction Badge({\n  className,\n  variant = \"default\",\n  asChild = false,\n  ...props\n}: React.ComponentProps<\"span\"> &\n  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {\n  const Comp = asChild ? Slot.Root : \"span\"\n\n  return (\n    <Comp\n      data-slot=\"badge\"\n      data-variant={variant}\n      className={cn(badgeVariants({ variant }), className)}\n      {...props}\n    />\n  )\n}\n\nexport { Badge, badgeVariants }\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/components/ui/badge.tsx",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-components-ui-badge-tsx-5f9c9bdbd1c68d30.mjs",
  "kind": "tsx",
  "hash": "5f9c9bdbd1c68d30",
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
      "specifier": "radix-ui",
      "resolved_path": "src/lib/forge/radix-ui/radix-ui.tsx",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-lib-forge-radix-ui-radix-ui-tsx-6774b7bf6fcb9322.mjs",
      "kind": "tsx",
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
    "source_path": "src/components/ui/badge.tsx",
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
        "specifier": "radix-ui",
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
export const dxLinkedDependencies = Object.freeze([dep0, dep1, dep2]);
export default dxSourceModule;
