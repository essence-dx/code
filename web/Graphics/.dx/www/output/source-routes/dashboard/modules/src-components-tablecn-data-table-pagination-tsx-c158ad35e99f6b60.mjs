import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-components-ui-button-tsx-a045a54d4568e98d.mjs";
import { dxSourceModule as dep1, dxRuntimeExports as dep1Runtime } from "./src-components-ui-select-tsx-cb5ef19f5a25e2e4.mjs";
import { dxSourceModule as dep2, dxRuntimeExports as dep2Runtime } from "./src-lib-utils-ts-cb488a6352482fc7.mjs";
import { dxSourceModule as dep3, dxRuntimeExports as dep3Runtime } from "./src-lib-forge-icons-lucide-react-tsx-b9b0a8debf22abe8.mjs";
export const dxSourceText = "\"use client\";\n\nimport type * as React from \"react\";\nimport type { Table } from \"@tanstack/react-table\";\nimport {\n  ChevronLeft,\n  ChevronRight,\n  ChevronsLeft,\n  ChevronsRight,\n} from \"lucide-react\";\n\nimport { Button } from \"@/components/ui/button\";\nimport {\n  Select,\n  SelectContent,\n  SelectItem,\n  SelectTrigger,\n  SelectValue,\n} from \"@/components/ui/select\";\nimport { cn } from \"@/lib/utils\";\n\ninterface DataTablePaginationProps<TData> extends React.ComponentProps<\"div\"> {\n  table: Table<TData>;\n  pageSizeOptions?: number[];\n}\n\nexport function DataTablePagination<TData>({\n  table,\n  pageSizeOptions = [10, 20, 30, 40, 50],\n  className,\n  ...props\n}: DataTablePaginationProps<TData>) {\n  return (\n    <div\n      className={cn(\n        \"flex w-full flex-col-reverse items-center justify-between gap-4 overflow-auto p-1 sm:flex-row sm:gap-8\",\n        className,\n      )}\n      {...props}\n    >\n      <div className=\"flex-1 whitespace-nowrap text-sm text-muted-foreground\">\n        {table.getFilteredSelectedRowModel().rows.length} of{\" \"}\n        {table.getFilteredRowModel().rows.length} row(s) selected.\n      </div>\n      <div className=\"flex flex-col-reverse items-center gap-4 sm:flex-row sm:gap-6 lg:gap-8\">\n        <div className=\"flex items-center space-x-2\">\n          <p className=\"whitespace-nowrap text-sm font-medium\">Rows per page</p>\n          <Select\n            value={`${table.getState().pagination.pageSize}`}\n            onValueChange={(value) => {\n              table.setPageSize(Number(value));\n            }}\n          >\n            <SelectTrigger className=\"h-8 w-18 data-size:h-8\">\n              <SelectValue placeholder={table.getState().pagination.pageSize} />\n            </SelectTrigger>\n            <SelectContent side=\"top\">\n              {pageSizeOptions.map((pageSize) => (\n                <SelectItem key={pageSize} value={`${pageSize}`}>\n                  {pageSize}\n                </SelectItem>\n              ))}\n            </SelectContent>\n          </Select>\n        </div>\n        <div className=\"flex items-center justify-center text-sm font-medium\">\n          Page {table.getState().pagination.pageIndex + 1} of{\" \"}\n          {Math.max(table.getPageCount(), 1)}\n        </div>\n        <div className=\"flex items-center space-x-2\">\n          <Button\n            aria-label=\"Go to first page\"\n            variant=\"outline\"\n            size=\"icon\"\n            className=\"hidden size-8 lg:flex\"\n            onClick={() => table.setPageIndex(0)}\n            disabled={!table.getCanPreviousPage()}\n          >\n            <ChevronsLeft />\n          </Button>\n          <Button\n            aria-label=\"Go to previous page\"\n            variant=\"outline\"\n            size=\"icon\"\n            className=\"size-8\"\n            onClick={() => table.previousPage()}\n            disabled={!table.getCanPreviousPage()}\n          >\n            <ChevronLeft />\n          </Button>\n          <Button\n            aria-label=\"Go to next page\"\n            variant=\"outline\"\n            size=\"icon\"\n            className=\"size-8\"\n            onClick={() => table.nextPage()}\n            disabled={!table.getCanNextPage()}\n          >\n            <ChevronRight />\n          </Button>\n          <Button\n            aria-label=\"Go to last page\"\n            variant=\"outline\"\n            size=\"icon\"\n            className=\"hidden size-8 lg:flex\"\n            onClick={() => table.setPageIndex(table.getPageCount() - 1)}\n            disabled={!table.getCanNextPage()}\n          >\n            <ChevronsRight />\n          </Button>\n        </div>\n      </div>\n    </div>\n  );\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/components/tablecn/data-table-pagination.tsx",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-components-tablecn-data-table-pagination-tsx-c158ad35e99f6b60.mjs",
  "kind": "tsx",
  "hash": "c158ad35e99f6b60",
  "dependencies": [
    {
      "specifier": "@/components/ui/button",
      "resolved_path": "src/components/ui/button.tsx",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-components-ui-button-tsx-a045a54d4568e98d.mjs",
      "kind": "tsx",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/components/ui/select",
      "resolved_path": "src/components/ui/select.tsx",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-components-ui-select-tsx-cb5ef19f5a25e2e4.mjs",
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
    "source_path": "src/components/tablecn/data-table-pagination.tsx",
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
        "specifier": "@/components/ui/button",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/components/ui/select",
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
      "DataTablePagination"
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
export const dxLinkedDependencies = Object.freeze([dep0, dep1, dep2, dep3]);
export default dxSourceModule;
