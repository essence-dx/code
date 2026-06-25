import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-components-ui-badge-tsx-5f9c9bdbd1c68d30.mjs";
import { dxSourceModule as dep1, dxRuntimeExports as dep1Runtime } from "./src-components-ui-button-tsx-a045a54d4568e98d.mjs";
import { dxSourceModule as dep2, dxRuntimeExports as dep2Runtime } from "./src-components-ui-card-tsx-62d56c5e9cb9789f.mjs";
import { dxSourceModule as dep3, dxRuntimeExports as dep3Runtime } from "./src-features-admin-admin-public-route-analytics-export-ts-2d48d72171057efd.mjs";
import { dxSourceModule as dep4, dxRuntimeExports as dep4Runtime } from "./src-features-editor-components-library-release-panel-shared-tsx-185476f4669a07c8.mjs";
import { dxSourceModule as dep5, dxRuntimeExports as dep5Runtime } from "./src-lib-forge-icons-lucide-react-tsx-b9b0a8debf22abe8.mjs";
export const dxSourceText = "import {\n  BarChart3,\n  ClipboardCopy,\n  Download,\n  ExternalLink,\n  FileJson2,\n  Globe2,\n  ShieldCheck,\n} from \"lucide-react\";\nimport { Badge } from \"@/components/ui/badge\";\nimport { Button } from \"@/components/ui/button\";\nimport {\n  Card,\n  CardContent,\n  CardDescription,\n  CardHeader,\n  CardTitle,\n} from \"@/components/ui/card\";\nimport type {\n  AdminPublicRouteAnalyticsReport,\n  AdminPublicRouteAnalyticsStatus,\n} from \"@/features/admin/admin-public-route-analytics\";\nimport {\n  getAdminPublicRouteAnalyticsCsv,\n  getAdminPublicRouteAnalyticsJson,\n  getAdminPublicRouteAnalyticsMarkdown,\n} from \"@/features/admin/admin-public-route-analytics-export\";\nimport { downloadTextFile } from \"@/features/editor/components/library-release-panel-shared\";\n\ntype AdminPublicRouteAnalyticsPanelProps = {\n  report: AdminPublicRouteAnalyticsReport;\n};\n\nexport function AdminPublicRouteAnalyticsPanel({\n  report,\n}: AdminPublicRouteAnalyticsPanelProps) {\n  function exportJson() {\n    downloadTextFile({\n      filename: \"public-route-analytics.json\",\n      content: getAdminPublicRouteAnalyticsJson(report),\n      type: \"application/json;charset=utf-8\",\n    });\n  }\n\n  function exportCsv() {\n    downloadTextFile({\n      filename: \"public-route-analytics.csv\",\n      content: getAdminPublicRouteAnalyticsCsv(report),\n      type: \"text/csv;charset=utf-8\",\n    });\n  }\n\n  function exportMarkdown() {\n    downloadTextFile({\n      filename: \"public-route-analytics.md\",\n      content: getAdminPublicRouteAnalyticsMarkdown(report),\n      type: \"text/markdown;charset=utf-8\",\n    });\n  }\n\n  function copyMarkdown() {\n    void navigator.clipboard.writeText(\n      getAdminPublicRouteAnalyticsMarkdown(report),\n    );\n  }\n\n  return (\n    <Card>\n      <CardHeader className=\"gap-3 md:flex-row md:items-center md:justify-between\">\n        <div>\n          <CardTitle className=\"flex items-center gap-2\">\n            <BarChart3 className=\"size-4\" />\n            Public route analytics\n          </CardTitle>\n          <CardDescription>\n            Privacy-safe share, prototype, and embed visits with referrer\n            origins, user-agent families, token scopes, retention windows, and\n            release evidence exports.\n          </CardDescription>\n        </div>\n        <div className=\"flex flex-wrap items-center gap-2\">\n          <Badge variant={getStatusVariant(report.status)}>\n            {report.status} {report.score}\n          </Badge>\n          <Badge variant={report.storageAvailable ? \"outline\" : \"destructive\"}>\n            {report.storageAvailable ? \"storage ready\" : \"storage blocked\"}\n          </Badge>\n          <Button type=\"button\" size=\"sm\" variant=\"outline\" onClick={exportJson}>\n            <FileJson2 className=\"size-3.5\" />\n            JSON\n          </Button>\n          <Button type=\"button\" size=\"sm\" variant=\"outline\" onClick={exportCsv}>\n            <Download className=\"size-3.5\" />\n            CSV\n          </Button>\n          <Button\n            type=\"button\"\n            size=\"sm\"\n            variant=\"outline\"\n            onClick={exportMarkdown}\n          >\n            <Download className=\"size-3.5\" />\n            MD\n          </Button>\n          <Button\n            type=\"button\"\n            size=\"sm\"\n            variant=\"outline\"\n            onClick={copyMarkdown}\n          >\n            <ClipboardCopy className=\"size-3.5\" />\n            Copy\n          </Button>\n        </div>\n      </CardHeader>\n      <CardContent className=\"grid gap-4\">\n        <div className=\"grid gap-2 md:grid-cols-3 xl:grid-cols-6\">\n          <Metric label=\"Events\" value={report.eventCount} />\n          <Metric label=\"Last 24h\" value={report.last24hEventCount} />\n          <Metric label=\"Last 7d\" value={report.last7dEventCount} />\n          <Metric label=\"Missing\" value={report.missingCoverageCount} />\n          <Metric label=\"External\" value={report.externalReferrerCount} />\n          <Metric label=\"Expired\" value={report.retentionExpiredCount} />\n        </div>\n\n        <div className=\"grid gap-3 xl:grid-cols-[1.2fr_0.8fr]\">\n          <div className=\"grid gap-3\">\n            {report.routes.slice(0, 9).map((route) => (\n              <div\n                key={route.id}\n                className=\"rounded-md border border-border bg-muted/20 p-3\"\n              >\n                <div className=\"flex items-start justify-between gap-3\">\n                  <div className=\"min-w-0\">\n                    <div className=\"flex items-center gap-2 font-medium\">\n                      {route.referrerKinds.includes(\"external\") ? (\n                        <ExternalLink className=\"size-4 shrink-0 text-muted-foreground\" />\n                      ) : (\n                        <Globe2 className=\"size-4 shrink-0 text-muted-foreground\" />\n                      )}\n                      <span className=\"truncate\">{route.fileName}</span>\n                    </div>\n                    <div className=\"mt-2 flex flex-wrap gap-1\">\n                      <Badge variant=\"outline\">{route.routeKind}</Badge>\n                      <Badge variant={getStatusVariant(route.status)}>\n                        {route.status}\n                      </Badge>\n                      <Badge variant=\"secondary\">{route.eventCount} events</Badge>\n                      <Badge variant=\"outline\">\n                        <ShieldCheck className=\"size-3\" />\n                        {route.tokenScope}\n                      </Badge>\n                    </div>\n                  </div>\n                  <div className=\"text-right font-mono text-xs text-muted-foreground\">\n                    {route.latestAt ? formatDate(route.latestAt) : \"no events\"}\n                  </div>\n                </div>\n                <div className=\"mt-3 grid gap-2 text-xs md:grid-cols-4\">\n                  <Info label=\"24h\" value={`${route.last24hCount}`} />\n                  <Info label=\"7d\" value={`${route.last7dCount}`} />\n                  <Info\n                    label=\"Referrers\"\n                    value={route.referrerKinds.join(\", \") || \"none\"}\n                  />\n                  <Info\n                    label=\"Agents\"\n                    value={route.userAgentFamilies.join(\", \") || \"none\"}\n                  />\n                </div>\n                <p className=\"mt-3 text-xs text-muted-foreground\">\n                  {route.recommendation}\n                </p>\n              </div>\n            ))}\n          </div>\n\n          <div className=\"grid content-start gap-3\">\n            {report.rows.slice(0, 9).map((row) => (\n              <div\n                key={row.id}\n                className=\"rounded-md border border-border bg-muted/20 p-3\"\n              >\n                <div className=\"flex items-center justify-between gap-2\">\n                  <div className=\"min-w-0 truncate text-sm font-medium\">\n                    {row.label}\n                  </div>\n                  <Badge variant={getStatusVariant(row.status)}>\n                    {row.status}\n                  </Badge>\n                </div>\n                <div className=\"mt-2 flex flex-wrap gap-1\">\n                  <Badge variant=\"outline\">{row.category}</Badge>\n                  <Badge variant=\"secondary\">{row.count}</Badge>\n                </div>\n                <p className=\"mt-2 text-xs text-muted-foreground\">{row.detail}</p>\n                <p className=\"mt-2 text-xs\">{row.recommendation}</p>\n              </div>\n            ))}\n          </div>\n        </div>\n      </CardContent>\n    </Card>\n  );\n}\n\nfunction Metric({ label, value }: { label: string; value: number }) {\n  return (\n    <div className=\"rounded-md border border-border bg-muted/20 p-3\">\n      <div className=\"text-xs text-muted-foreground\">{label}</div>\n      <div className=\"mt-1 font-mono text-2xl font-semibold\">{value}</div>\n    </div>\n  );\n}\n\nfunction Info({ label, value }: { label: string; value: string }) {\n  return (\n    <div className=\"rounded-md border border-border bg-background p-2\">\n      <div className=\"text-muted-foreground\">{label}</div>\n      <div className=\"mt-1 truncate font-medium\">{value}</div>\n    </div>\n  );\n}\n\nfunction getStatusVariant(status: AdminPublicRouteAnalyticsStatus) {\n  if (status === \"blocked\") {\n    return \"destructive\";\n  }\n\n  return status === \"review\" ? \"secondary\" : \"outline\";\n}\n\nfunction formatDate(value: string) {\n  return new Intl.DateTimeFormat(undefined, {\n    dateStyle: \"medium\",\n    timeStyle: \"short\",\n  }).format(new Date(value));\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/components/admin-public-route-analytics-panel.tsx",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-components-admin-public-route-analytics-panel-tsx-ea53681259de33a5.mjs",
  "kind": "tsx",
  "hash": "ea53681259de33a5",
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
      "specifier": "@/features/admin/admin-public-route-analytics-export",
      "resolved_path": "src/features/admin/admin-public-route-analytics-export.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-public-route-analytics-export-ts-2d48d72171057efd.mjs",
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
    "source_path": "src/features/admin/components/admin-public-route-analytics-panel.tsx",
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
        "specifier": "@/features/admin/admin-public-route-analytics",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/admin/admin-public-route-analytics-export",
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
      "AdminPublicRouteAnalyticsPanel"
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
