import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-lib-utils-ts-cb488a6352482fc7.mjs";
import { dxSourceModule as dep1, dxRuntimeExports as dep1Runtime } from "./src-lib-forge-variants-class-variance-authority-ts-357cdf6d80c9f9e9.mjs";
import { dxSourceModule as dep2, dxRuntimeExports as dep2Runtime } from "./src-lib-forge-radix-ui-radix-ui-tsx-6774b7bf6fcb9322.mjs";
export const dxSourceText = "\"use client\"\n\nimport * as React from \"react\"\nimport { cva, type VariantProps } from \"class-variance-authority\"\nimport { Tabs as TabsPrimitive } from \"radix-ui\"\n\nimport { cn } from \"@/lib/utils\"\n\nfunction Tabs({\n  className,\n  orientation = \"horizontal\",\n  ...props\n}: React.ComponentProps<typeof TabsPrimitive.Root>) {\n  return (\n    <TabsPrimitive.Root\n      data-slot=\"tabs\"\n      data-orientation={orientation}\n      className={cn(\n        \"group/tabs flex gap-2 data-horizontal:flex-col\",\n        className\n      )}\n      {...props}\n    />\n  )\n}\n\nconst tabsListVariants = cva(\n  \"group/tabs-list inline-flex w-fit items-center justify-center rounded-lg p-[3px] text-muted-foreground group-data-horizontal/tabs:h-8 group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col data-[variant=line]:rounded-none\",\n  {\n    variants: {\n      variant: {\n        default: \"bg-muted\",\n        line: \"gap-1 bg-transparent\",\n      },\n    },\n    defaultVariants: {\n      variant: \"default\",\n    },\n  }\n)\n\nfunction TabsList({\n  className,\n  variant = \"default\",\n  ...props\n}: React.ComponentProps<typeof TabsPrimitive.List> &\n  VariantProps<typeof tabsListVariants>) {\n  return (\n    <TabsPrimitive.List\n      data-slot=\"tabs-list\"\n      data-variant={variant}\n      className={cn(tabsListVariants({ variant }), className)}\n      {...props}\n    />\n  )\n}\n\nfunction TabsTrigger({\n  className,\n  ...props\n}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {\n  return (\n    <TabsPrimitive.Trigger\n      data-slot=\"tabs-trigger\"\n      className={cn(\n        \"relative inline-flex h-[calc(100%-1px)] flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-transparent px-1.5 py-0.5 text-sm font-medium whitespace-nowrap text-foreground/60 transition-all group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 has-data-[icon=inline-end]:pr-1 has-data-[icon=inline-start]:pl-1 dark:text-muted-foreground dark:hover:text-foreground group-data-[variant=default]/tabs-list:data-active:shadow-sm group-data-[variant=line]/tabs-list:data-active:shadow-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4\",\n        \"group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:data-active:bg-transparent dark:group-data-[variant=line]/tabs-list:data-active:border-transparent dark:group-data-[variant=line]/tabs-list:data-active:bg-transparent\",\n        \"data-active:bg-background data-active:text-foreground dark:data-active:border-input dark:data-active:bg-input/30 dark:data-active:text-foreground\",\n        \"after:absolute after:bg-foreground after:opacity-0 after:transition-opacity group-data-horizontal/tabs:after:inset-x-0 group-data-horizontal/tabs:after:bottom-[-5px] group-data-horizontal/tabs:after:h-0.5 group-data-vertical/tabs:after:inset-y-0 group-data-vertical/tabs:after:-right-1 group-data-vertical/tabs:after:w-0.5 group-data-[variant=line]/tabs-list:data-active:after:opacity-100\",\n        className\n      )}\n      {...props}\n    />\n  )\n}\n\nfunction TabsContent({\n  className,\n  ...props\n}: React.ComponentProps<typeof TabsPrimitive.Content>) {\n  return (\n    <TabsPrimitive.Content\n      data-slot=\"tabs-content\"\n      className={cn(\"flex-1 text-sm outline-none\", className)}\n      {...props}\n    />\n  )\n}\n\nexport { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/components/ui/tabs.tsx",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-components-ui-tabs-tsx-fdd301abce49d992.mjs",
  "kind": "tsx",
  "hash": "fdd301abce49d992",
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
    "source_path": "src/components/ui/tabs.tsx",
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
