import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-components-ui-badge-tsx-5f9c9bdbd1c68d30.mjs";
import { dxSourceModule as dep1, dxRuntimeExports as dep1Runtime } from "./src-components-ui-button-tsx-a045a54d4568e98d.mjs";
import { dxSourceModule as dep2, dxRuntimeExports as dep2Runtime } from "./src-components-ui-card-tsx-62d56c5e9cb9789f.mjs";
import { dxSourceModule as dep3, dxRuntimeExports as dep3Runtime } from "./src-features-admin-admin-embed-route-analytics-join-ts-0a6cab72d53f9d85.mjs";
import { dxSourceModule as dep4, dxRuntimeExports as dep4Runtime } from "./src-features-editor-components-library-release-panel-shared-tsx-185476f4669a07c8.mjs";
import { dxSourceModule as dep5, dxRuntimeExports as dep5Runtime } from "./src-lib-forge-icons-lucide-react-tsx-b9b0a8debf22abe8.mjs";
export const dxSourceText = "import {\n  BarChart3,\n  ClipboardCopy,\n  Download,\n  ExternalLink,\n  FileJson2,\n  GitFork,\n  ShieldCheck,\n} from \"lucide-react\";\nimport { Badge } from \"@/components/ui/badge\";\nimport { Button } from \"@/components/ui/button\";\nimport {\n  Card,\n  CardContent,\n  CardDescription,\n  CardHeader,\n  CardTitle,\n} from \"@/components/ui/card\";\nimport {\n  getAdminEmbedRouteAnalyticsJoinCsv,\n  getAdminEmbedRouteAnalyticsJoinJson,\n  getAdminEmbedRouteAnalyticsJoinMarkdown,\n  type AdminEmbedRouteAnalyticsJoinReport,\n  type AdminEmbedRouteAnalyticsJoinStatus,\n} from \"@/features/admin/admin-embed-route-analytics-join\";\nimport { downloadTextFile } from \"@/features/editor/components/library-release-panel-shared\";\n\ntype AdminEmbedRouteAnalyticsJoinPanelProps = {\n  report: AdminEmbedRouteAnalyticsJoinReport;\n};\n\nexport function AdminEmbedRouteAnalyticsJoinPanel({\n  report,\n}: AdminEmbedRouteAnalyticsJoinPanelProps) {\n  function exportJson() {\n    downloadTextFile({\n      filename: \"embed-route-analytics-join.json\",\n      content: getAdminEmbedRouteAnalyticsJoinJson(report),\n      type: \"application/json;charset=utf-8\",\n    });\n  }\n\n  function exportCsv() {\n    downloadTextFile({\n      filename: \"embed-route-analytics-join.csv\",\n      content: getAdminEmbedRouteAnalyticsJoinCsv(report),\n      type: \"text/csv;charset=utf-8\",\n    });\n  }\n\n  function exportMarkdown() {\n    downloadTextFile({\n      filename: \"embed-route-analytics-join.md\",\n      content: getAdminEmbedRouteAnalyticsJoinMarkdown(report),\n      type: \"text/markdown;charset=utf-8\",\n    });\n  }\n\n  function copyMarkdown() {\n    void navigator.clipboard.writeText(\n      getAdminEmbedRouteAnalyticsJoinMarkdown(report),\n    );\n  }\n\n  return (\n    <Card>\n      <CardHeader className=\"gap-3 md:flex-row md:items-center md:justify-between\">\n        <div>\n          <CardTitle className=\"flex items-center gap-2\">\n            <GitFork className=\"size-4\" />\n            Embed route analytics join\n          </CardTitle>\n          <CardDescription>\n            Joined route funnels, referrer health, public-link exposure, embed\n            host evidence, and admin exports for presentations and Sites routes.\n          </CardDescription>\n        </div>\n        <div className=\"flex flex-wrap items-center gap-2\">\n          <Badge variant={getStatusVariant(report.status)}>\n            {report.status} {report.score}\n          </Badge>\n          <Button type=\"button\" size=\"sm\" variant=\"outline\" onClick={exportJson}>\n            <FileJson2 className=\"size-3.5\" />\n            JSON\n          </Button>\n          <Button type=\"button\" size=\"sm\" variant=\"outline\" onClick={exportCsv}>\n            <Download className=\"size-3.5\" />\n            CSV\n          </Button>\n          <Button\n            type=\"button\"\n            size=\"sm\"\n            variant=\"outline\"\n            onClick={exportMarkdown}\n          >\n            <Download className=\"size-3.5\" />\n            MD\n          </Button>\n          <Button\n            type=\"button\"\n            size=\"sm\"\n            variant=\"outline\"\n            onClick={copyMarkdown}\n          >\n            <ClipboardCopy className=\"size-3.5\" />\n            Copy\n          </Button>\n        </div>\n      </CardHeader>\n      <CardContent className=\"grid gap-4\">\n        <div className=\"grid gap-2 md:grid-cols-3 xl:grid-cols-6\">\n          <Metric label=\"Funnels\" value={report.routeFunnelCount} />\n          <Metric label=\"Events\" value={report.totalRouteEventCount} />\n          <Metric label=\"External\" value={report.externalReferrerOriginCount} />\n          <Metric label=\"Blocked\" value={report.blockedObservedOriginCount} />\n          <Metric label=\"Exposure\" value={report.downloadExposureCount} />\n          <Metric label=\"Exports\" value={report.adminExportCount} />\n        </div>\n\n        <div className=\"grid gap-3 xl:grid-cols-[1.15fr_0.85fr]\">\n          <div className=\"grid gap-3\">\n            {report.routeFunnels.slice(0, 8).map((funnel) => (\n              <div\n                key={funnel.id}\n                className=\"rounded-md border border-border bg-muted/20 p-3\"\n              >\n                <div className=\"flex items-start justify-between gap-3\">\n                  <div className=\"min-w-0\">\n                    <div className=\"flex items-center gap-2 font-medium\">\n                      <BarChart3 className=\"size-4 shrink-0 text-muted-foreground\" />\n                      <span className=\"truncate\">{funnel.fileName}</span>\n                    </div>\n                    <div className=\"mt-2 flex flex-wrap gap-1\">\n                      <Badge variant={getStatusVariant(funnel.status)}>\n                        {funnel.status}\n                      </Badge>\n                      <Badge variant=\"outline\">\n                        share {funnel.shareEvents}\n                      </Badge>\n                      <Badge variant=\"outline\">\n                        prototype {funnel.prototypeEvents}\n                      </Badge>\n                      <Badge variant=\"outline\">embed {funnel.embedEvents}</Badge>\n                    </div>\n                  </div>\n                  <div className=\"text-right font-mono text-xs text-muted-foreground\">\n                    {funnel.latestAt ? formatDate(funnel.latestAt) : \"no events\"}\n                  </div>\n                </div>\n                <div className=\"mt-3 grid gap-2 text-xs md:grid-cols-3\">\n                  <Info\n                    label=\"Share to prototype\"\n                    value={`${funnel.shareToPrototypePercent}%`}\n                  />\n                  <Info\n                    label=\"Prototype to embed\"\n                    value={`${funnel.prototypeToEmbedPercent}%`}\n                  />\n                  <Info\n                    label=\"Missing\"\n                    value={funnel.missingRouteKinds.join(\", \") || \"none\"}\n                  />\n                </div>\n                <p className=\"mt-3 text-xs text-muted-foreground\">\n                  {funnel.recommendation}\n                </p>\n              </div>\n            ))}\n          </div>\n\n          <div className=\"grid content-start gap-3\">\n            {report.rows.slice(0, 9).map((row) => (\n              <div\n                key={row.id}\n                className=\"rounded-md border border-border bg-muted/20 p-3\"\n              >\n                <div className=\"flex items-center justify-between gap-2\">\n                  <div className=\"min-w-0 truncate text-sm font-medium\">\n                    {row.label}\n                  </div>\n                  <Badge variant={getStatusVariant(row.status)}>\n                    {row.status}\n                  </Badge>\n                </div>\n                <div className=\"mt-2 flex flex-wrap gap-1\">\n                  <Badge variant=\"outline\">{row.category}</Badge>\n                  <Badge variant=\"secondary\">{row.count}</Badge>\n                  {row.category === \"referrer-health\" ? (\n                    <Badge variant=\"outline\">\n                      <ExternalLink className=\"size-3\" />\n                      referrer\n                    </Badge>\n                  ) : null}\n                  {row.category === \"exposure-review\" ? (\n                    <Badge variant=\"outline\">\n                      <ShieldCheck className=\"size-3\" />\n                      exposure\n                    </Badge>\n                  ) : null}\n                </div>\n                <p className=\"mt-2 text-xs text-muted-foreground\">{row.detail}</p>\n                <p className=\"mt-2 text-xs\">{row.recommendation}</p>\n              </div>\n            ))}\n          </div>\n        </div>\n      </CardContent>\n    </Card>\n  );\n}\n\nfunction Metric({ label, value }: { label: string; value: number }) {\n  return (\n    <div className=\"rounded-md border border-border bg-muted/20 p-3\">\n      <div className=\"text-xs text-muted-foreground\">{label}</div>\n      <div className=\"mt-1 font-mono text-2xl font-semibold\">{value}</div>\n    </div>\n  );\n}\n\nfunction Info({ label, value }: { label: string; value: string }) {\n  return (\n    <div className=\"rounded-md border border-border bg-background p-2\">\n      <div className=\"text-muted-foreground\">{label}</div>\n      <div className=\"mt-1 truncate font-medium\">{value}</div>\n    </div>\n  );\n}\n\nfunction getStatusVariant(status: AdminEmbedRouteAnalyticsJoinStatus) {\n  if (status === \"blocked\") {\n    return \"destructive\";\n  }\n\n  return status === \"review\" ? \"secondary\" : \"outline\";\n}\n\nfunction formatDate(value: string) {\n  return new Intl.DateTimeFormat(undefined, {\n    dateStyle: \"medium\",\n    timeStyle: \"short\",\n  }).format(new Date(value));\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/components/admin-embed-route-analytics-join-panel.tsx",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-components-admin-embed-route-analytics-join-panel-tsx-f619a3fd2aea7d1b.mjs",
  "kind": "tsx",
  "hash": "f619a3fd2aea7d1b",
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
      "specifier": "@/features/admin/admin-embed-route-analytics-join",
      "resolved_path": "src/features/admin/admin-embed-route-analytics-join.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-embed-route-analytics-join-ts-0a6cab72d53f9d85.mjs",
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
    "source_path": "src/features/admin/components/admin-embed-route-analytics-join-panel.tsx",
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
        "specifier": "@/features/admin/admin-embed-route-analytics-join",
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
      "AdminEmbedRouteAnalyticsJoinPanel"
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
