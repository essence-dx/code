import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-components-tablecn-data-table-column-header-tsx-10eec5622bbe153a.mjs";
import { dxSourceModule as dep1, dxRuntimeExports as dep1Runtime } from "./src-components-ui-badge-tsx-5f9c9bdbd1c68d30.mjs";
export const dxSourceText = "\"use client\";\n\nimport type { ColumnDef } from \"@tanstack/react-table\";\nimport { Badge } from \"@/components/ui/badge\";\nimport { DataTableColumnHeader } from \"@/components/tablecn/data-table-column-header\";\nimport type { AdminNotificationDeliveryRow } from \"@/features/admin/admin-data\";\n\nexport function getNotificationColumns(\n  formatDate: (value: string) => string,\n): ColumnDef<AdminNotificationDeliveryRow>[] {\n  return [\n    {\n      accessorKey: \"fileName\",\n      header: ({ column }) => (\n        <DataTableColumnHeader column={column} label=\"File\" />\n      ),\n      cell: ({ row }) => (\n        <div>\n          <div className=\"font-medium\">{row.original.fileName}</div>\n          <div className=\"text-xs text-muted-foreground\">\n            {row.original.ownerEmail}\n          </div>\n        </div>\n      ),\n    },\n    {\n      accessorKey: \"kind\",\n      header: ({ column }) => (\n        <DataTableColumnHeader column={column} label=\"Event\" />\n      ),\n      cell: ({ row }) => formatNotificationKind(row.original.kind),\n    },\n    {\n      accessorKey: \"recipientEmail\",\n      header: ({ column }) => (\n        <DataTableColumnHeader column={column} label=\"Recipient\" />\n      ),\n      cell: ({ row }) => (\n        <div>\n          <div>{row.original.recipientEmail}</div>\n          <div className=\"text-xs text-muted-foreground\">\n            {row.original.actorName} / {row.original.pageName}\n          </div>\n        </div>\n      ),\n    },\n    {\n      accessorKey: \"status\",\n      header: ({ column }) => (\n        <DataTableColumnHeader column={column} label=\"Status\" />\n      ),\n      cell: ({ row }) =>\n        row.original.status === \"sent\" ? (\n          <Badge variant=\"secondary\">Sent</Badge>\n        ) : (\n          <div className=\"space-y-1\">\n            <Badge variant=\"destructive\">Failed</Badge>\n            {row.original.reason ? (\n              <div className=\"max-w-60 text-xs text-muted-foreground\">\n                {row.original.reason}\n              </div>\n            ) : null}\n          </div>\n        ),\n    },\n    {\n      accessorKey: \"createdAt\",\n      header: ({ column }) => (\n        <DataTableColumnHeader column={column} label=\"Time\" />\n      ),\n      cell: ({ row }) => formatDate(row.original.createdAt),\n    },\n  ];\n}\n\nfunction formatNotificationKind(value: AdminNotificationDeliveryRow[\"kind\"]) {\n  const labels: Record<AdminNotificationDeliveryRow[\"kind\"], string> = {\n    \"new-comment\": \"New comment\",\n    \"new-reply\": \"New reply\",\n    assignment: \"Assignment\",\n    mention: \"Mention\",\n    reaction: \"Reaction\",\n    acknowledgement: \"Acknowledgement\",\n  };\n\n  return labels[value];\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/components/admin-notification-columns.tsx",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-components-admin-notification-columns-tsx-385f5b085dd510b9.mjs",
  "kind": "tsx",
  "hash": "385f5b085dd510b9",
  "dependencies": [
    {
      "specifier": "@/components/tablecn/data-table-column-header",
      "resolved_path": "src/components/tablecn/data-table-column-header.tsx",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-components-tablecn-data-table-column-header-tsx-10eec5622bbe153a.mjs",
      "kind": "tsx",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/components/ui/badge",
      "resolved_path": "src/components/ui/badge.tsx",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-components-ui-badge-tsx-5f9c9bdbd1c68d30.mjs",
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
    "source_path": "src/features/admin/components/admin-notification-columns.tsx",
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
        "type_only": true
      },
      {
        "specifier": "@/components/ui/badge",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/components/tablecn/data-table-column-header",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/admin/admin-data",
        "side_effect_only": false,
        "type_only": true
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
      "getNotificationColumns"
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
export const dxLinkedDependencies = Object.freeze([dep0, dep1]);
export default dxSourceModule;
