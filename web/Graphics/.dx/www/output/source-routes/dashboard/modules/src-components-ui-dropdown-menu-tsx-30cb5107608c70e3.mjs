import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-lib-utils-ts-cb488a6352482fc7.mjs";
import { dxSourceModule as dep1, dxRuntimeExports as dep1Runtime } from "./src-lib-forge-icons-lucide-react-tsx-b9b0a8debf22abe8.mjs";
import { dxSourceModule as dep2, dxRuntimeExports as dep2Runtime } from "./src-lib-forge-radix-ui-radix-ui-tsx-6774b7bf6fcb9322.mjs";
export const dxSourceText = "\"use client\"\n\nimport * as React from \"react\"\nimport { DropdownMenu as DropdownMenuPrimitive } from \"radix-ui\"\n\nimport { cn } from \"@/lib/utils\"\nimport { CheckIcon, ChevronRightIcon } from \"lucide-react\"\n\nfunction DropdownMenu({\n  ...props\n}: React.ComponentProps<typeof DropdownMenuPrimitive.Root>) {\n  return <DropdownMenuPrimitive.Root data-slot=\"dropdown-menu\" {...props} />\n}\n\nfunction DropdownMenuPortal({\n  ...props\n}: React.ComponentProps<typeof DropdownMenuPrimitive.Portal>) {\n  return (\n    <DropdownMenuPrimitive.Portal data-slot=\"dropdown-menu-portal\" {...props} />\n  )\n}\n\nfunction DropdownMenuTrigger({\n  ...props\n}: React.ComponentProps<typeof DropdownMenuPrimitive.Trigger>) {\n  return (\n    <DropdownMenuPrimitive.Trigger\n      data-slot=\"dropdown-menu-trigger\"\n      {...props}\n    />\n  )\n}\n\nfunction DropdownMenuContent({\n  className,\n  align = \"start\",\n  sideOffset = 4,\n  ...props\n}: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {\n  return (\n    <DropdownMenuPrimitive.Portal>\n      <DropdownMenuPrimitive.Content\n        data-slot=\"dropdown-menu-content\"\n        sideOffset={sideOffset}\n        align={align}\n        className={cn(\"z-50 max-h-(--radix-dropdown-menu-content-available-height) w-(--radix-dropdown-menu-trigger-width) min-w-32 origin-(--radix-dropdown-menu-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:overflow-hidden data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95\", className )}\n        {...props}\n      />\n    </DropdownMenuPrimitive.Portal>\n  )\n}\n\nfunction DropdownMenuGroup({\n  ...props\n}: React.ComponentProps<typeof DropdownMenuPrimitive.Group>) {\n  return (\n    <DropdownMenuPrimitive.Group data-slot=\"dropdown-menu-group\" {...props} />\n  )\n}\n\nfunction DropdownMenuItem({\n  className,\n  inset,\n  variant = \"default\",\n  ...props\n}: React.ComponentProps<typeof DropdownMenuPrimitive.Item> & {\n  inset?: boolean\n  variant?: \"default\" | \"destructive\"\n}) {\n  return (\n    <DropdownMenuPrimitive.Item\n      data-slot=\"dropdown-menu-item\"\n      data-inset={inset}\n      data-variant={variant}\n      className={cn(\n        \"group/dropdown-menu-item relative flex cursor-default items-center gap-1.5 rounded-md px-1.5 py-1 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground data-inset:pl-7 data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 data-[variant=destructive]:focus:text-destructive dark:data-[variant=destructive]:focus:bg-destructive/20 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 data-[variant=destructive]:*:[svg]:text-destructive\",\n        className\n      )}\n      {...props}\n    />\n  )\n}\n\nfunction DropdownMenuCheckboxItem({\n  className,\n  children,\n  checked,\n  inset,\n  ...props\n}: React.ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem> & {\n  inset?: boolean\n}) {\n  return (\n    <DropdownMenuPrimitive.CheckboxItem\n      data-slot=\"dropdown-menu-checkbox-item\"\n      data-inset={inset}\n      className={cn(\n        \"relative flex cursor-default items-center gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground focus:**:text-accent-foreground data-inset:pl-7 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4\",\n        className\n      )}\n      checked={checked}\n      {...props}\n    >\n      <span\n        className=\"pointer-events-none absolute right-2 flex items-center justify-center\"\n        data-slot=\"dropdown-menu-checkbox-item-indicator\"\n      >\n        <DropdownMenuPrimitive.ItemIndicator>\n          <CheckIcon\n          />\n        </DropdownMenuPrimitive.ItemIndicator>\n      </span>\n      {children}\n    </DropdownMenuPrimitive.CheckboxItem>\n  )\n}\n\nfunction DropdownMenuRadioGroup({\n  ...props\n}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioGroup>) {\n  return (\n    <DropdownMenuPrimitive.RadioGroup\n      data-slot=\"dropdown-menu-radio-group\"\n      {...props}\n    />\n  )\n}\n\nfunction DropdownMenuRadioItem({\n  className,\n  children,\n  inset,\n  ...props\n}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioItem> & {\n  inset?: boolean\n}) {\n  return (\n    <DropdownMenuPrimitive.RadioItem\n      data-slot=\"dropdown-menu-radio-item\"\n      data-inset={inset}\n      className={cn(\n        \"relative flex cursor-default items-center gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground focus:**:text-accent-foreground data-inset:pl-7 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4\",\n        className\n      )}\n      {...props}\n    >\n      <span\n        className=\"pointer-events-none absolute right-2 flex items-center justify-center\"\n        data-slot=\"dropdown-menu-radio-item-indicator\"\n      >\n        <DropdownMenuPrimitive.ItemIndicator>\n          <CheckIcon\n          />\n        </DropdownMenuPrimitive.ItemIndicator>\n      </span>\n      {children}\n    </DropdownMenuPrimitive.RadioItem>\n  )\n}\n\nfunction DropdownMenuLabel({\n  className,\n  inset,\n  ...props\n}: React.ComponentProps<typeof DropdownMenuPrimitive.Label> & {\n  inset?: boolean\n}) {\n  return (\n    <DropdownMenuPrimitive.Label\n      data-slot=\"dropdown-menu-label\"\n      data-inset={inset}\n      className={cn(\n        \"px-1.5 py-1 text-xs font-medium text-muted-foreground data-inset:pl-7\",\n        className\n      )}\n      {...props}\n    />\n  )\n}\n\nfunction DropdownMenuSeparator({\n  className,\n  ...props\n}: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) {\n  return (\n    <DropdownMenuPrimitive.Separator\n      data-slot=\"dropdown-menu-separator\"\n      className={cn(\"-mx-1 my-1 h-px bg-border\", className)}\n      {...props}\n    />\n  )\n}\n\nfunction DropdownMenuShortcut({\n  className,\n  ...props\n}: React.ComponentProps<\"span\">) {\n  return (\n    <span\n      data-slot=\"dropdown-menu-shortcut\"\n      className={cn(\n        \"ml-auto text-xs tracking-widest text-muted-foreground group-focus/dropdown-menu-item:text-accent-foreground\",\n        className\n      )}\n      {...props}\n    />\n  )\n}\n\nfunction DropdownMenuSub({\n  ...props\n}: React.ComponentProps<typeof DropdownMenuPrimitive.Sub>) {\n  return <DropdownMenuPrimitive.Sub data-slot=\"dropdown-menu-sub\" {...props} />\n}\n\nfunction DropdownMenuSubTrigger({\n  className,\n  inset,\n  children,\n  ...props\n}: React.ComponentProps<typeof DropdownMenuPrimitive.SubTrigger> & {\n  inset?: boolean\n}) {\n  return (\n    <DropdownMenuPrimitive.SubTrigger\n      data-slot=\"dropdown-menu-sub-trigger\"\n      data-inset={inset}\n      className={cn(\n        \"flex cursor-default items-center gap-1.5 rounded-md px-1.5 py-1 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground data-inset:pl-7 data-open:bg-accent data-open:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4\",\n        className\n      )}\n      {...props}\n    >\n      {children}\n      <ChevronRightIcon className=\"ml-auto\" />\n    </DropdownMenuPrimitive.SubTrigger>\n  )\n}\n\nfunction DropdownMenuSubContent({\n  className,\n  ...props\n}: React.ComponentProps<typeof DropdownMenuPrimitive.SubContent>) {\n  return (\n    <DropdownMenuPrimitive.SubContent\n      data-slot=\"dropdown-menu-sub-content\"\n      className={cn(\"z-50 min-w-[96px] origin-(--radix-dropdown-menu-content-transform-origin) overflow-hidden rounded-lg bg-popover p-1 text-popover-foreground shadow-lg ring-1 ring-foreground/10 duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95\", className )}\n      {...props}\n    />\n  )\n}\n\nexport {\n  DropdownMenu,\n  DropdownMenuPortal,\n  DropdownMenuTrigger,\n  DropdownMenuContent,\n  DropdownMenuGroup,\n  DropdownMenuLabel,\n  DropdownMenuItem,\n  DropdownMenuCheckboxItem,\n  DropdownMenuRadioGroup,\n  DropdownMenuRadioItem,\n  DropdownMenuSeparator,\n  DropdownMenuShortcut,\n  DropdownMenuSub,\n  DropdownMenuSubTrigger,\n  DropdownMenuSubContent,\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/components/ui/dropdown-menu.tsx",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-components-ui-dropdown-menu-tsx-30cb5107608c70e3.mjs",
  "kind": "tsx",
  "hash": "30cb5107608c70e3",
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
    "source_path": "src/components/ui/dropdown-menu.tsx",
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
