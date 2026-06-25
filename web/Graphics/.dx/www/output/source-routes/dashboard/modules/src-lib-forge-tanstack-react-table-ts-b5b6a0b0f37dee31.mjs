
export const dxSourceText = "import * as React from \"react\"\n\nexport type SortingState = Array<{ id: string; desc?: boolean }>\nexport type PaginationState = { pageIndex: number; pageSize: number }\nexport type OnChangeFn<TValue> = (updater: TValue | ((current: TValue) => TValue)) => void\n\nexport type ColumnDef<TData, TValue = unknown> = {\n  id?: string\n  accessorFn?: (row: TData) => TValue\n  cell?: React.ReactNode | ((context: CellContext<TData, TValue>) => React.ReactNode)\n  enableHiding?: boolean\n  enableSorting?: boolean\n  header?: React.ReactNode | ((context: HeaderContext<TData, TValue>) => React.ReactNode)\n}\n\nexport type HeaderContext<TData, TValue = unknown> = {\n  column: Column<TData, TValue>\n}\n\nexport type CellContext<TData, TValue = unknown> = {\n  cell: Cell<TData, TValue>\n  column: Column<TData, TValue>\n  row: Row<TData>\n  getValue: () => TValue\n}\n\nexport type Column<TData, TValue = unknown> = {\n  id: string\n  columnDef: ColumnDef<TData, TValue>\n  clearSorting: () => void\n  getAfter: (_position?: \"left\" | \"right\") => number\n  getCanHide: () => boolean\n  getCanSort: () => boolean\n  getIsFirstColumn: (_position?: \"left\" | \"right\") => boolean\n  getIsLastColumn: (_position?: \"left\" | \"right\") => boolean\n  getIsPinned: () => false | \"left\" | \"right\"\n  getIsSorted: () => false | \"asc\" | \"desc\"\n  getIsVisible: () => boolean\n  getSize: () => number\n  getStart: (_position?: \"left\" | \"right\") => number\n  toggleSorting: (desc?: boolean) => void\n  toggleVisibility: (_visible?: boolean) => void\n}\n\nexport type Row<TData> = {\n  id: string\n  index: number\n  original: TData\n  getIsSelected: () => boolean\n  getVisibleCells: () => Cell<TData>[]\n}\n\nexport type Cell<TData, TValue = unknown> = {\n  id: string\n  column: Column<TData, TValue>\n  getContext: () => CellContext<TData, TValue>\n  getValue: () => TValue\n  row: Row<TData>\n}\n\nexport type Header<TData, TValue = unknown> = {\n  id: string\n  colSpan: number\n  column: Column<TData, TValue>\n  getContext: () => HeaderContext<TData, TValue>\n  isPlaceholder: boolean\n}\n\nexport type HeaderGroup<TData> = {\n  id: string\n  headers: Header<TData>[]\n}\n\nexport type RowModel<TData> = {\n  rows: Row<TData>[]\n}\n\nexport type Table<TData> = {\n  getAllColumns: () => Column<TData>[]\n  getCanNextPage: () => boolean\n  getCanPreviousPage: () => boolean\n  getFilteredRowModel: () => RowModel<TData>\n  getFilteredSelectedRowModel: () => RowModel<TData>\n  getHeaderGroups: () => HeaderGroup<TData>[]\n  getPageCount: () => number\n  getRowModel: () => RowModel<TData>\n  getState: () => {\n    globalFilter?: unknown\n    pagination: PaginationState\n    sorting: SortingState\n  }\n  nextPage: () => void\n  previousPage: () => void\n  setPageIndex: (pageIndex: number) => void\n  setPageSize: (pageSize: number) => void\n}\n\ntype TableOptions<TData> = {\n  columns: ColumnDef<TData>[]\n  data: TData[]\n  globalFilterFn?: (row: Row<TData>, columnId: string, filterValue: unknown) => boolean\n  onGlobalFilterChange?: OnChangeFn<unknown>\n  onPaginationChange?: OnChangeFn<PaginationState>\n  onSortingChange?: OnChangeFn<SortingState>\n  state?: {\n    globalFilter?: unknown\n    pagination?: PaginationState\n    sorting?: SortingState\n  }\n}\n\nexport function flexRender<TProps>(\n  renderer: React.ReactNode | ((props: TProps) => React.ReactNode),\n  props: TProps\n) {\n  return typeof renderer === \"function\" ? renderer(props) : renderer\n}\n\nexport function getCoreRowModel() {\n  return identityRowModel\n}\n\nexport function getFilteredRowModel() {\n  return identityRowModel\n}\n\nexport function getPaginationRowModel() {\n  return identityRowModel\n}\n\nexport function getSortedRowModel() {\n  return identityRowModel\n}\n\nexport function useReactTable<TData>(options: TableOptions<TData>): Table<TData> {\n  const sorting = options.state?.sorting ?? []\n  const pagination = options.state?.pagination ?? { pageIndex: 0, pageSize: options.data.length || 1 }\n  const globalFilter = options.state?.globalFilter\n\n  return React.useMemo(() => {\n    const setSorting = (updater: SortingState | ((current: SortingState) => SortingState)) =>\n      options.onSortingChange?.(resolveUpdater(updater, sorting))\n    const setPagination = (updater: PaginationState | ((current: PaginationState) => PaginationState)) =>\n      options.onPaginationChange?.(resolveUpdater(updater, pagination))\n\n    const columns = options.columns.map((columnDef, index) =>\n      createColumn({\n        columnDef,\n        index,\n        sorting,\n        setSorting,\n      })\n    )\n    const filteredRows = createRows(options.data, columns).filter((row) =>\n      globalFilter && options.globalFilterFn\n        ? options.globalFilterFn(row, columns[0]?.id ?? \"\", globalFilter)\n        : true\n    )\n    const sortedRows = sortRows(filteredRows, columns, sorting)\n    const pageCount = Math.max(1, Math.ceil(sortedRows.length / pagination.pageSize))\n    const pageIndex = Math.min(Math.max(pagination.pageIndex, 0), pageCount - 1)\n    const pagedRows = sortedRows.slice(\n      pageIndex * pagination.pageSize,\n      pageIndex * pagination.pageSize + pagination.pageSize\n    )\n\n    return {\n      getAllColumns: () => columns,\n      getCanNextPage: () => pageIndex < pageCount - 1,\n      getCanPreviousPage: () => pageIndex > 0,\n      getFilteredRowModel: () => ({ rows: sortedRows }),\n      getFilteredSelectedRowModel: () => ({ rows: [] }),\n      getHeaderGroups: () => [\n        {\n          id: \"headers\",\n          headers: columns.map((column) => ({\n            id: column.id,\n            colSpan: 1,\n            column,\n            getContext: () => ({ column }),\n            isPlaceholder: false,\n          })),\n        },\n      ],\n      getPageCount: () => pageCount,\n      getRowModel: () => ({ rows: pagedRows }),\n      getState: () => ({ globalFilter, pagination: { ...pagination, pageIndex }, sorting }),\n      nextPage: () => setPagination({ ...pagination, pageIndex: Math.min(pageIndex + 1, pageCount - 1) }),\n      previousPage: () => setPagination({ ...pagination, pageIndex: Math.max(pageIndex - 1, 0) }),\n      setPageIndex: (nextPageIndex: number) =>\n        setPagination({ ...pagination, pageIndex: Math.min(Math.max(nextPageIndex, 0), pageCount - 1) }),\n      setPageSize: (pageSize: number) => setPagination({ pageIndex: 0, pageSize }),\n    }\n  }, [globalFilter, options, pagination, sorting])\n}\n\nfunction createColumn<TData>({\n  columnDef,\n  index,\n  sorting,\n  setSorting,\n}: {\n  columnDef: ColumnDef<TData>\n  index: number\n  sorting: SortingState\n  setSorting: (updater: SortingState | ((current: SortingState) => SortingState)) => void\n}): Column<TData> {\n  const id = columnDef.id ?? String(index)\n\n  return {\n    id,\n    columnDef,\n    clearSorting: () => setSorting(sorting.filter((sort) => sort.id !== id)),\n    getAfter: () => 0,\n    getCanHide: () => columnDef.enableHiding ?? true,\n    getCanSort: () => columnDef.enableSorting ?? true,\n    getIsFirstColumn: () => index === 0,\n    getIsLastColumn: () => false,\n    getIsPinned: () => false,\n    getIsSorted: () => {\n      const entry = sorting.find((sort) => sort.id === id)\n      return entry ? (entry.desc ? \"desc\" : \"asc\") : false\n    },\n    getIsVisible: () => true,\n    getSize: () => 160,\n    getStart: () => 0,\n    toggleSorting: (desc = false) => setSorting([{ id, desc }]),\n    toggleVisibility: () => undefined,\n  }\n}\n\nfunction createRows<TData>(data: TData[], columns: Column<TData>[]): Row<TData>[] {\n  return data.map((original, index) => {\n    const row = {\n      id: String(index),\n      index,\n      original,\n      getIsSelected: () => false,\n      getVisibleCells: () =>\n        columns.map((column) => {\n          const getValue = () => column.columnDef.accessorFn?.(original) as unknown\n          const cell = {\n            id: `${index}:${column.id}`,\n            column,\n            getContext: () => ({ cell, column, row, getValue }),\n            getValue,\n            row,\n          }\n          return cell\n        }),\n    } satisfies Row<TData>\n\n    return row\n  })\n}\n\nfunction sortRows<TData>(rows: Row<TData>[], columns: Column<TData>[], sorting: SortingState) {\n  const sort = sorting[0]\n\n  if (!sort) {\n    return rows\n  }\n\n  const column = columns.find((candidate) => candidate.id === sort.id)\n\n  if (!column?.columnDef.accessorFn) {\n    return rows\n  }\n\n  return [...rows].sort((left, right) => {\n    const leftValue = column.columnDef.accessorFn?.(left.original)\n    const rightValue = column.columnDef.accessorFn?.(right.original)\n    const order = String(leftValue ?? \"\").localeCompare(String(rightValue ?? \"\"), undefined, {\n      numeric: true,\n      sensitivity: \"base\",\n    })\n\n    return sort.desc ? -order : order\n  })\n}\n\nfunction resolveUpdater<TValue>(updater: TValue | ((current: TValue) => TValue), current: TValue) {\n  return typeof updater === \"function\" ? (updater as (current: TValue) => TValue)(current) : updater\n}\n\nfunction identityRowModel<TData>() {\n  return { rows: [] as Row<TData>[] }\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/lib/forge/tanstack/react-table.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-lib-forge-tanstack-react-table-ts-b5b6a0b0f37dee31.mjs",
  "kind": "ts",
  "hash": "b5b6a0b0f37dee31",
  "dependencies": [
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
    "source_path": "src/lib/forge/tanstack/react-table.ts",
    "source_kind": "ts",
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
      "flexRender",
      "getCoreRowModel",
      "getFilteredRowModel",
      "getPaginationRowModel",
      "getSortedRowModel",
      "useReactTable"
    ],
    "jsx": false,
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
export const dxLinkedDependencies = Object.freeze([]);
export default dxSourceModule;
