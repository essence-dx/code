import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-components-ui-dropdown-menu-tsx-30cb5107608c70e3.mjs";
import { dxSourceModule as dep1, dxRuntimeExports as dep1Runtime } from "./src-lib-utils-ts-cb488a6352482fc7.mjs";
import { dxSourceModule as dep2, dxRuntimeExports as dep2Runtime } from "./src-lib-forge-icons-lucide-react-tsx-b9b0a8debf22abe8.mjs";
export const dxSourceText = "\"use client\";\n\nimport type * as React from \"react\";\nimport type { Column } from \"@tanstack/react-table\";\nimport {\n  ChevronDown,\n  ChevronsUpDown,\n  ChevronUp,\n  EyeOff,\n  X,\n} from \"lucide-react\";\n\nimport {\n  DropdownMenu,\n  DropdownMenuCheckboxItem,\n  DropdownMenuContent,\n  DropdownMenuItem,\n  DropdownMenuTrigger,\n} from \"@/components/ui/dropdown-menu\";\nimport { cn } from \"@/lib/utils\";\n\ninterface DataTableColumnHeaderProps<TData, TValue>\n  extends React.ComponentProps<typeof DropdownMenuTrigger> {\n  column: Column<TData, TValue>;\n  label: string;\n}\n\nexport function DataTableColumnHeader<TData, TValue>({\n  column,\n  label,\n  className,\n  ...props\n}: DataTableColumnHeaderProps<TData, TValue>) {\n  if (!column.getCanSort() && !column.getCanHide()) {\n    return <div className={cn(className)}>{label}</div>;\n  }\n\n  return (\n    <DropdownMenu>\n      <DropdownMenuTrigger\n        className={cn(\n          \"-ml-1.5 flex h-8 items-center gap-1.5 rounded-md px-2 py-1.5 hover:bg-accent focus:outline-none focus:ring-1 focus:ring-ring data-[state=open]:bg-accent [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground\",\n          className,\n        )}\n        {...props}\n      >\n        {label}\n        {column.getCanSort() &&\n          (column.getIsSorted() === \"desc\" ? (\n            <ChevronDown />\n          ) : column.getIsSorted() === \"asc\" ? (\n            <ChevronUp />\n          ) : (\n            <ChevronsUpDown />\n          ))}\n      </DropdownMenuTrigger>\n      <DropdownMenuContent align=\"start\" className=\"w-28\">\n        {column.getCanSort() ? (\n          <>\n            <DropdownMenuCheckboxItem\n              className=\"relative pr-8 pl-2 [&>span:first-child]:right-2 [&>span:first-child]:left-auto [&_svg]:text-muted-foreground\"\n              checked={column.getIsSorted() === \"asc\"}\n              onClick={() => column.toggleSorting(false)}\n            >\n              <ChevronUp />\n              Asc\n            </DropdownMenuCheckboxItem>\n            <DropdownMenuCheckboxItem\n              className=\"relative pr-8 pl-2 [&>span:first-child]:right-2 [&>span:first-child]:left-auto [&_svg]:text-muted-foreground\"\n              checked={column.getIsSorted() === \"desc\"}\n              onClick={() => column.toggleSorting(true)}\n            >\n              <ChevronDown />\n              Desc\n            </DropdownMenuCheckboxItem>\n            {column.getIsSorted() ? (\n              <DropdownMenuItem\n                className=\"pl-2 [&_svg]:text-muted-foreground\"\n                onClick={() => column.clearSorting()}\n              >\n                <X />\n                Reset\n              </DropdownMenuItem>\n            ) : null}\n          </>\n        ) : null}\n        {column.getCanHide() ? (\n          <DropdownMenuCheckboxItem\n            className=\"relative pr-8 pl-2 [&>span:first-child]:right-2 [&>span:first-child]:left-auto [&_svg]:text-muted-foreground\"\n            checked={!column.getIsVisible()}\n            onClick={() => column.toggleVisibility(false)}\n          >\n            <EyeOff />\n            Hide\n          </DropdownMenuCheckboxItem>\n        ) : null}\n      </DropdownMenuContent>\n    </DropdownMenu>\n  );\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/components/tablecn/data-table-column-header.tsx",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-components-tablecn-data-table-column-header-tsx-10eec5622bbe153a.mjs",
  "kind": "tsx",
  "hash": "10eec5622bbe153a",
  "dependencies": [
    {
      "specifier": "@/components/ui/dropdown-menu",
      "resolved_path": "src/components/ui/dropdown-menu.tsx",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-components-ui-dropdown-menu-tsx-30cb5107608c70e3.mjs",
      "kind": "tsx",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
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
    }
  ],
  "browser_executable": true,
  "source_transformed": false,
  "transform_kind": "metadata-only",
  "runtime_exports": [],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/components/tablecn/data-table-column-header.tsx",
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
        "specifier": "@tanstack/react-table",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "lucide-react",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/components/ui/dropdown-menu",
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
    "export_names": [
      "DataTableColumnHeader"
    ],
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
