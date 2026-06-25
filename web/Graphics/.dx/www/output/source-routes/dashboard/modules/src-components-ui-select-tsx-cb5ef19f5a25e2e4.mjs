import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-lib-utils-ts-cb488a6352482fc7.mjs";
import { dxSourceModule as dep1, dxRuntimeExports as dep1Runtime } from "./src-lib-forge-icons-lucide-react-tsx-b9b0a8debf22abe8.mjs";
import { dxSourceModule as dep2, dxRuntimeExports as dep2Runtime } from "./src-lib-forge-radix-ui-radix-ui-tsx-6774b7bf6fcb9322.mjs";
export const dxSourceText = "\"use client\"\n\nimport * as React from \"react\"\nimport { Select as SelectPrimitive } from \"radix-ui\"\n\nimport { cn } from \"@/lib/utils\"\nimport { ChevronDownIcon, CheckIcon, ChevronUpIcon } from \"lucide-react\"\n\nfunction Select({\n  ...props\n}: React.ComponentProps<typeof SelectPrimitive.Root>) {\n  return <SelectPrimitive.Root data-slot=\"select\" {...props} />\n}\n\nfunction SelectGroup({\n  className,\n  ...props\n}: React.ComponentProps<typeof SelectPrimitive.Group>) {\n  return (\n    <SelectPrimitive.Group\n      data-slot=\"select-group\"\n      className={cn(\"scroll-my-1 p-1\", className)}\n      {...props}\n    />\n  )\n}\n\nfunction SelectValue({\n  ...props\n}: React.ComponentProps<typeof SelectPrimitive.Value>) {\n  return <SelectPrimitive.Value data-slot=\"select-value\" {...props} />\n}\n\nfunction SelectTrigger({\n  className,\n  size = \"default\",\n  children,\n  ...props\n}: React.ComponentProps<typeof SelectPrimitive.Trigger> & {\n  size?: \"sm\" | \"default\"\n}) {\n  return (\n    <SelectPrimitive.Trigger\n      data-slot=\"select-trigger\"\n      data-size={size}\n      className={cn(\n        \"flex w-fit items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent py-2 pr-2 pl-2.5 text-sm whitespace-nowrap transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 data-placeholder:text-muted-foreground data-[size=default]:h-8 data-[size=sm]:h-7 data-[size=sm]:rounded-[min(var(--radius-md),10px)] *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-1.5 dark:bg-input/30 dark:hover:bg-input/50 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4\",\n        className\n      )}\n      {...props}\n    >\n      {children}\n      <SelectPrimitive.Icon asChild>\n        <ChevronDownIcon className=\"pointer-events-none size-4 text-muted-foreground\" />\n      </SelectPrimitive.Icon>\n    </SelectPrimitive.Trigger>\n  )\n}\n\nfunction SelectContent({\n  className,\n  children,\n  position = \"item-aligned\",\n  align = \"center\",\n  ...props\n}: React.ComponentProps<typeof SelectPrimitive.Content>) {\n  return (\n    <SelectPrimitive.Portal>\n      <SelectPrimitive.Content\n        data-slot=\"select-content\"\n        data-align-trigger={position === \"item-aligned\"}\n        className={cn(\"relative z-50 max-h-(--radix-select-content-available-height) min-w-36 origin-(--radix-select-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 data-[align-trigger=true]:animate-none data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95\", position ===\"popper\"&&\"data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1\", className )}\n        position={position}\n        align={align}\n        {...props}\n      >\n        <SelectScrollUpButton />\n        <SelectPrimitive.Viewport\n          data-position={position}\n          className={cn(\n            \"data-[position=popper]:h-(--radix-select-trigger-height) data-[position=popper]:w-full data-[position=popper]:min-w-(--radix-select-trigger-width)\",\n            position === \"popper\" && \"\"\n          )}\n        >\n          {children}\n        </SelectPrimitive.Viewport>\n        <SelectScrollDownButton />\n      </SelectPrimitive.Content>\n    </SelectPrimitive.Portal>\n  )\n}\n\nfunction SelectLabel({\n  className,\n  ...props\n}: React.ComponentProps<typeof SelectPrimitive.Label>) {\n  return (\n    <SelectPrimitive.Label\n      data-slot=\"select-label\"\n      className={cn(\"px-1.5 py-1 text-xs text-muted-foreground\", className)}\n      {...props}\n    />\n  )\n}\n\nfunction SelectItem({\n  className,\n  children,\n  ...props\n}: React.ComponentProps<typeof SelectPrimitive.Item>) {\n  return (\n    <SelectPrimitive.Item\n      data-slot=\"select-item\"\n      className={cn(\n        \"relative flex w-full cursor-default items-center gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2\",\n        className\n      )}\n      {...props}\n    >\n      <span className=\"pointer-events-none absolute right-2 flex size-4 items-center justify-center\">\n        <SelectPrimitive.ItemIndicator>\n          <CheckIcon className=\"pointer-events-none\" />\n        </SelectPrimitive.ItemIndicator>\n      </span>\n      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>\n    </SelectPrimitive.Item>\n  )\n}\n\nfunction SelectSeparator({\n  className,\n  ...props\n}: React.ComponentProps<typeof SelectPrimitive.Separator>) {\n  return (\n    <SelectPrimitive.Separator\n      data-slot=\"select-separator\"\n      className={cn(\"pointer-events-none -mx-1 my-1 h-px bg-border\", className)}\n      {...props}\n    />\n  )\n}\n\nfunction SelectScrollUpButton({\n  className,\n  ...props\n}: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {\n  return (\n    <SelectPrimitive.ScrollUpButton\n      data-slot=\"select-scroll-up-button\"\n      className={cn(\n        \"z-10 flex cursor-default items-center justify-center bg-popover py-1 [&_svg:not([class*='size-'])]:size-4\",\n        className\n      )}\n      {...props}\n    >\n      <ChevronUpIcon\n      />\n    </SelectPrimitive.ScrollUpButton>\n  )\n}\n\nfunction SelectScrollDownButton({\n  className,\n  ...props\n}: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {\n  return (\n    <SelectPrimitive.ScrollDownButton\n      data-slot=\"select-scroll-down-button\"\n      className={cn(\n        \"z-10 flex cursor-default items-center justify-center bg-popover py-1 [&_svg:not([class*='size-'])]:size-4\",\n        className\n      )}\n      {...props}\n    >\n      <ChevronDownIcon\n      />\n    </SelectPrimitive.ScrollDownButton>\n  )\n}\n\nexport {\n  Select,\n  SelectContent,\n  SelectGroup,\n  SelectItem,\n  SelectLabel,\n  SelectScrollDownButton,\n  SelectScrollUpButton,\n  SelectSeparator,\n  SelectTrigger,\n  SelectValue,\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/components/ui/select.tsx",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-components-ui-select-tsx-cb5ef19f5a25e2e4.mjs",
  "kind": "tsx",
  "hash": "cb5ef19f5a25e2e4",
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
      "specifier": "lucide-react",
      "resolved_path": "src/lib/forge/icons/lucide-react.tsx",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-lib-forge-icons-lucide-react-tsx-b9b0a8debf22abe8.mjs",
      "kind": "tsx",
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
    "source_path": "src/components/ui/select.tsx",
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
        "specifier": "radix-ui",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/lib/utils",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "lucide-react",
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
