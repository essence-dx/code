import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-components-tablecn-data-table-pagination-tsx-c158ad35e99f6b60.mjs";
import { dxSourceModule as dep1, dxRuntimeExports as dep1Runtime } from "./src-components-ui-table-tsx-723a47e2cdc85add.mjs";
import { dxSourceModule as dep2, dxRuntimeExports as dep2Runtime } from "./src-lib-tablecn-data-table-ts-9bf4c9e4016e109e.mjs";
import { dxSourceModule as dep3, dxRuntimeExports as dep3Runtime } from "./src-lib-utils-ts-cb488a6352482fc7.mjs";
import { dxSourceModule as dep4, dxRuntimeExports as dep4Runtime } from "./src-lib-forge-tanstack-react-table-ts-b5b6a0b0f37dee31.mjs";
export const dxSourceText = "\"use client\";\n\nimport { flexRender, type Table as TanstackTable } from \"@tanstack/react-table\";\nimport type * as React from \"react\";\n\nimport { DataTablePagination } from \"@/components/tablecn/data-table-pagination\";\nimport {\n  Table,\n  TableBody,\n  TableCell,\n  TableHead,\n  TableHeader,\n  TableRow,\n} from \"@/components/ui/table\";\nimport { getColumnPinningStyle } from \"@/lib/tablecn-data-table\";\nimport { cn } from \"@/lib/utils\";\n\ninterface DataTableProps<TData> extends React.ComponentProps<\"div\"> {\n  table: TanstackTable<TData>;\n  actionBar?: React.ReactNode;\n}\n\nexport function DataTable<TData>({\n  table,\n  actionBar,\n  children,\n  className,\n  ...props\n}: DataTableProps<TData>) {\n  return (\n    <div\n      className={cn(\"flex w-full flex-col gap-2.5 overflow-auto\", className)}\n      {...props}\n    >\n      {children}\n      <div className=\"overflow-hidden rounded-md border\">\n        <Table>\n          <TableHeader>\n            {table.getHeaderGroups().map((headerGroup) => (\n              <TableRow key={headerGroup.id}>\n                {headerGroup.headers.map((header) => (\n                  <TableHead\n                    key={header.id}\n                    colSpan={header.colSpan}\n                    style={{\n                      ...getColumnPinningStyle({ column: header.column }),\n                    }}\n                  >\n                    {header.isPlaceholder\n                      ? null\n                      : flexRender(\n                          header.column.columnDef.header,\n                          header.getContext(),\n                        )}\n                  </TableHead>\n                ))}\n              </TableRow>\n            ))}\n          </TableHeader>\n          <TableBody>\n            {table.getRowModel().rows.length ? (\n              table.getRowModel().rows.map((row) => (\n                <TableRow\n                  key={row.id}\n                  data-state={row.getIsSelected() && \"selected\"}\n                >\n                  {row.getVisibleCells().map((cell) => (\n                    <TableCell\n                      key={cell.id}\n                      style={{\n                        ...getColumnPinningStyle({ column: cell.column }),\n                      }}\n                    >\n                      {flexRender(\n                        cell.column.columnDef.cell,\n                        cell.getContext(),\n                      )}\n                    </TableCell>\n                  ))}\n                </TableRow>\n              ))\n            ) : (\n              <TableRow>\n                <TableCell\n                  colSpan={table.getAllColumns().length}\n                  className=\"h-24 text-center\"\n                >\n                  No results.\n                </TableCell>\n              </TableRow>\n            )}\n          </TableBody>\n        </Table>\n      </div>\n      <div className=\"flex flex-col gap-2.5\">\n        <DataTablePagination table={table} />\n        {actionBar &&\n        table.getFilteredSelectedRowModel().rows.length > 0\n          ? actionBar\n          : null}\n      </div>\n    </div>\n  );\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/components/tablecn/data-table.tsx",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-components-tablecn-data-table-tsx-185d9f07f1e5e5d8.mjs",
  "kind": "tsx",
  "hash": "185d9f07f1e5e5d8",
  "dependencies": [
    {
      "specifier": "@/components/tablecn/data-table-pagination",
      "resolved_path": "src/components/tablecn/data-table-pagination.tsx",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-components-tablecn-data-table-pagination-tsx-c158ad35e99f6b60.mjs",
      "kind": "tsx",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/components/ui/table",
      "resolved_path": "src/components/ui/table.tsx",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-components-ui-table-tsx-723a47e2cdc85add.mjs",
      "kind": "tsx",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/lib/tablecn-data-table",
      "resolved_path": "src/lib/tablecn-data-table.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-lib-tablecn-data-table-ts-9bf4c9e4016e109e.mjs",
      "kind": "ts",
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
      "specifier": "@tanstack/react-table",
      "resolved_path": "src/lib/forge/tanstack/react-table.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-lib-forge-tanstack-react-table-ts-b5b6a0b0f37dee31.mjs",
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
    "source_path": "src/components/tablecn/data-table.tsx",
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
        "specifier": "@tanstack/react-table",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "react",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/components/tablecn/data-table-pagination",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/components/ui/table",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/lib/tablecn-data-table",
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
      "DataTable"
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
export const dxLinkedDependencies = Object.freeze([dep0, dep1, dep2, dep3, dep4]);
export default dxSourceModule;
