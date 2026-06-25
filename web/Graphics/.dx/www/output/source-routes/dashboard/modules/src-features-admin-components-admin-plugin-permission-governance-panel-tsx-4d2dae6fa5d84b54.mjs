import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-components-ui-badge-tsx-5f9c9bdbd1c68d30.mjs";
import { dxSourceModule as dep1, dxRuntimeExports as dep1Runtime } from "./src-components-ui-button-tsx-a045a54d4568e98d.mjs";
import { dxSourceModule as dep2, dxRuntimeExports as dep2Runtime } from "./src-components-ui-card-tsx-62d56c5e9cb9789f.mjs";
import { dxSourceModule as dep3, dxRuntimeExports as dep3Runtime } from "./src-features-admin-admin-plugin-permission-governance-export-ts-f9383879366162ea.mjs";
import { dxSourceModule as dep4, dxRuntimeExports as dep4Runtime } from "./src-features-editor-components-library-release-panel-shared-tsx-185476f4669a07c8.mjs";
import { dxSourceModule as dep5, dxRuntimeExports as dep5Runtime } from "./src-lib-forge-icons-lucide-react-tsx-b9b0a8debf22abe8.mjs";
export const dxSourceText = "\"use client\";\n\nimport { ClipboardCopy, Download, FileJson2, PlugZap } from \"lucide-react\";\nimport { Badge } from \"@/components/ui/badge\";\nimport { Button } from \"@/components/ui/button\";\nimport {\n  Card,\n  CardContent,\n  CardDescription,\n  CardHeader,\n  CardTitle,\n} from \"@/components/ui/card\";\nimport type {\n  AdminPluginPermissionGovernanceReport,\n  AdminPluginPermissionGovernanceStatus,\n} from \"@/features/admin/admin-plugin-permission-governance\";\nimport {\n  getAdminPluginPermissionGovernanceCsv,\n  getAdminPluginPermissionGovernanceJson,\n  getAdminPluginPermissionGovernanceMarkdown,\n} from \"@/features/admin/admin-plugin-permission-governance-export\";\nimport { downloadTextFile } from \"@/features/editor/components/library-release-panel-shared\";\n\ntype AdminPluginPermissionGovernancePanelProps = {\n  report: AdminPluginPermissionGovernanceReport;\n};\n\nexport function AdminPluginPermissionGovernancePanel({\n  report,\n}: AdminPluginPermissionGovernancePanelProps) {\n  const rows = report.rows\n    .filter((row) => row.status !== \"ready\")\n    .concat(report.rows.filter((row) => row.status === \"ready\"));\n\n  function exportJson() {\n    downloadTextFile({\n      content: getAdminPluginPermissionGovernanceJson(report),\n      filename: \"plugin-permission-governance.json\",\n      type: \"application/json;charset=utf-8\",\n    });\n  }\n\n  function exportCsv() {\n    downloadTextFile({\n      content: getAdminPluginPermissionGovernanceCsv(report),\n      filename: \"plugin-permission-governance.csv\",\n      type: \"text/csv;charset=utf-8\",\n    });\n  }\n\n  function exportMarkdown() {\n    downloadTextFile({\n      content: getAdminPluginPermissionGovernanceMarkdown(report),\n      filename: \"plugin-permission-governance.md\",\n      type: \"text/markdown;charset=utf-8\",\n    });\n  }\n\n  function copyMarkdown() {\n    void navigator.clipboard.writeText(\n      getAdminPluginPermissionGovernanceMarkdown(report),\n    );\n  }\n\n  return (\n    <Card>\n      <CardHeader className=\"gap-3 md:flex-row md:items-center md:justify-between\">\n        <div>\n          <CardTitle className=\"flex items-center gap-2\">\n            <PlugZap className=\"size-4\" />\n            Plugin permission governance\n          </CardTitle>\n          <CardDescription>\n            Installed extensions, capability grants, write-capable activity, and\n            stale approvals from design activity evidence.\n          </CardDescription>\n        </div>\n        <Badge variant={getStatusVariant(report.status)}>\n          {report.status} {report.score}\n        </Badge>\n      </CardHeader>\n      <CardContent className=\"grid gap-4\">\n        <div className=\"grid gap-2 text-xs md:grid-cols-3 xl:grid-cols-6\">\n          <Metric label=\"Extensions\" value={report.manifestCount} />\n          <Metric label=\"Permissions\" value={report.permissionCount} />\n          <Metric label=\"Write\" value={report.writePermissionCount} />\n          <Metric label=\"Grants\" value={report.grantActivityCount} />\n          <Metric label=\"Runs\" value={report.runActivityCount} />\n          <Metric label=\"Unknown\" value={report.unknownActivityCount} />\n        </div>\n\n        <div className=\"grid gap-2 lg:grid-cols-2\">\n          {rows.map((row) => (\n            <div\n              key={row.id}\n              className=\"rounded-md border border-border bg-muted/20 p-3 text-sm\"\n            >\n              <div className=\"flex items-start justify-between gap-3\">\n                <div className=\"min-w-0\">\n                  <div className=\"truncate font-medium\">{row.label}</div>\n                  <div className=\"mt-1 flex flex-wrap gap-1\">\n                    <Badge variant=\"outline\">{row.kind}</Badge>\n                    <Badge variant={getStatusVariant(row.status)}>\n                      {row.status}\n                    </Badge>\n                    <Badge variant=\"outline\">{row.value}</Badge>\n                    {row.latestAt ? (\n                      <Badge variant=\"outline\">{formatDate(row.latestAt)}</Badge>\n                    ) : null}\n                  </div>\n                </div>\n              </div>\n              <p className=\"mt-2 text-xs text-muted-foreground\">{row.detail}</p>\n              <p className=\"mt-2 text-xs\">{row.recommendation}</p>\n              {row.target ? (\n                <div className=\"mt-2 truncate font-mono text-[10px] text-muted-foreground\">\n                  {row.target}\n                </div>\n              ) : null}\n            </div>\n          ))}\n        </div>\n\n        <div className=\"grid gap-2 text-xs\">\n          <div className=\"flex flex-wrap items-center justify-between gap-2\">\n            <div className=\"font-medium\">Recent extension activity</div>\n            <Badge variant=\"outline\">\n              {report.activities.length} visible events\n            </Badge>\n          </div>\n          {report.activities.length === 0 ? (\n            <div className=\"rounded-md border border-dashed border-border p-4 text-muted-foreground\">\n              No extension activity is loaded for this governance report.\n            </div>\n          ) : (\n            <div className=\"grid gap-2 lg:grid-cols-2\">\n              {report.activities.slice(0, 8).map((activity) => (\n                <div\n                  key={activity.id}\n                  className=\"rounded-md border border-border bg-muted/20 p-3\"\n                >\n                  <div className=\"truncate font-medium\">{activity.label}</div>\n                  <div className=\"mt-1 truncate text-muted-foreground\">\n                    {activity.fileName} / {activity.actorName}\n                  </div>\n                  {activity.detail ? (\n                    <div className=\"mt-1 line-clamp-2 text-muted-foreground\">\n                      {activity.detail}\n                    </div>\n                  ) : null}\n                  <div className=\"mt-1 font-mono text-[10px] text-muted-foreground\">\n                    {formatDate(activity.createdAt)}\n                  </div>\n                </div>\n              ))}\n            </div>\n          )}\n        </div>\n\n        <div className=\"grid grid-cols-4 gap-2\">\n          <Button type=\"button\" size=\"sm\" variant=\"outline\" onClick={exportJson}>\n            <FileJson2 className=\"size-3.5\" />\n            JSON\n          </Button>\n          <Button type=\"button\" size=\"sm\" variant=\"outline\" onClick={exportCsv}>\n            <Download className=\"size-3.5\" />\n            CSV\n          </Button>\n          <Button\n            type=\"button\"\n            size=\"sm\"\n            variant=\"outline\"\n            onClick={exportMarkdown}\n          >\n            <Download className=\"size-3.5\" />\n            MD\n          </Button>\n          <Button\n            type=\"button\"\n            size=\"sm\"\n            variant=\"outline\"\n            onClick={copyMarkdown}\n          >\n            <ClipboardCopy className=\"size-3.5\" />\n            Copy\n          </Button>\n        </div>\n      </CardContent>\n    </Card>\n  );\n}\n\nfunction Metric({ label, value }: { label: string; value: number | string }) {\n  return (\n    <div className=\"rounded-md border border-border bg-muted/20 p-2\">\n      <div className=\"text-muted-foreground\">{label}</div>\n      <div className=\"mt-1 font-mono text-sm text-foreground\">{value}</div>\n    </div>\n  );\n}\n\nfunction getStatusVariant(status: AdminPluginPermissionGovernanceStatus) {\n  if (status === \"blocked\") {\n    return \"destructive\";\n  }\n\n  return status === \"review\" ? \"secondary\" : \"outline\";\n}\n\nfunction formatDate(value: string) {\n  return new Intl.DateTimeFormat(undefined, {\n    dateStyle: \"medium\",\n    timeStyle: \"short\",\n  }).format(new Date(value));\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/components/admin-plugin-permission-governance-panel.tsx",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-components-admin-plugin-permission-governance-panel-tsx-4d2dae6fa5d84b54.mjs",
  "kind": "tsx",
  "hash": "4d2dae6fa5d84b54",
  "dependencies": [
    {
      "specifier": "@/components/ui/badge",
      "resolved_path": "src/components/ui/badge.tsx",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-components-ui-badge-tsx-5f9c9bdbd1c68d30.mjs",
      "kind": "tsx",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/components/ui/button",
      "resolved_path": "src/components/ui/button.tsx",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-components-ui-button-tsx-a045a54d4568e98d.mjs",
      "kind": "tsx",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/components/ui/card",
      "resolved_path": "src/components/ui/card.tsx",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-components-ui-card-tsx-62d56c5e9cb9789f.mjs",
      "kind": "tsx",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/admin/admin-plugin-permission-governance-export",
      "resolved_path": "src/features/admin/admin-plugin-permission-governance-export.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-plugin-permission-governance-export-ts-f9383879366162ea.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/editor/components/library-release-panel-shared",
      "resolved_path": "src/features/editor/components/library-release-panel-shared.tsx",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-editor-components-library-release-panel-shared-tsx-185476f4669a07c8.mjs",
      "kind": "tsx",
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
    "source_path": "src/features/admin/components/admin-plugin-permission-governance-panel.tsx",
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
        "specifier": "lucide-react",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/components/ui/badge",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/components/ui/button",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/components/ui/card",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/admin/admin-plugin-permission-governance",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/admin/admin-plugin-permission-governance-export",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/editor/components/library-release-panel-shared",
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
      "AdminPluginPermissionGovernancePanel"
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
export const dxLinkedDependencies = Object.freeze([dep0, dep1, dep2, dep3, dep4, dep5]);
export default dxSourceModule;
