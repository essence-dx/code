import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-lib-utils-ts-cb488a6352482fc7.mjs";
import { dxSourceModule as dep1, dxRuntimeExports as dep1Runtime } from "./src-lib-forge-variants-class-variance-authority-ts-357cdf6d80c9f9e9.mjs";
import { dxSourceModule as dep2, dxRuntimeExports as dep2Runtime } from "./src-lib-forge-radix-ui-radix-ui-tsx-6774b7bf6fcb9322.mjs";
export const dxSourceText = "import * as React from \"react\"\nimport { cva, type VariantProps } from \"class-variance-authority\"\nimport { Slot } from \"radix-ui\"\n\nimport { cn } from \"@/lib/utils\"\n\nconst buttonVariants = cva(\n  \"group/button inline-flex shrink-0 cursor-pointer items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4\",\n  {\n    variants: {\n      variant: {\n        default: \"bg-primary text-primary-foreground [a]:hover:bg-primary/80\",\n        outline:\n          \"border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50\",\n        secondary:\n          \"bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground\",\n        ghost:\n          \"hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50\",\n        destructive:\n          \"bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40\",\n        link: \"text-primary underline-offset-4 hover:underline\",\n      },\n      size: {\n        default:\n          \"h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2\",\n        xs: \"h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3\",\n        sm: \"h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5\",\n        lg: \"h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2\",\n        icon: \"size-8\",\n        \"icon-xs\":\n          \"size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3\",\n        \"icon-sm\":\n          \"size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg\",\n        \"icon-lg\": \"size-9\",\n      },\n    },\n    defaultVariants: {\n      variant: \"default\",\n      size: \"default\",\n    },\n  }\n)\n\nfunction Button({\n  className,\n  variant = \"default\",\n  size = \"default\",\n  asChild = false,\n  ...props\n}: React.ComponentProps<\"button\"> &\n  VariantProps<typeof buttonVariants> & {\n    asChild?: boolean\n  }) {\n  const Comp = asChild ? Slot.Root : \"button\"\n\n  return (\n    <Comp\n      data-slot=\"button\"\n      data-variant={variant}\n      data-size={size}\n      className={cn(buttonVariants({ variant, size, className }))}\n      {...props}\n    />\n  )\n}\n\nexport { Button, buttonVariants }\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/components/ui/button.tsx",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-components-ui-button-tsx-a045a54d4568e98d.mjs",
  "kind": "tsx",
  "hash": "a045a54d4568e98d",
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
    "source_path": "src/components/ui/button.tsx",
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
