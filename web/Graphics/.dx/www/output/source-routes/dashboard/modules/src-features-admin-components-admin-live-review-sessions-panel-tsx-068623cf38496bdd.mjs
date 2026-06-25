import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-components-ui-badge-tsx-5f9c9bdbd1c68d30.mjs";
import { dxSourceModule as dep1, dxRuntimeExports as dep1Runtime } from "./src-components-ui-button-tsx-a045a54d4568e98d.mjs";
import { dxSourceModule as dep2, dxRuntimeExports as dep2Runtime } from "./src-components-ui-card-tsx-62d56c5e9cb9789f.mjs";
import { dxSourceModule as dep3, dxRuntimeExports as dep3Runtime } from "./src-features-admin-admin-live-review-sessions-ts-13d45ddcedb31b04.mjs";
import { dxSourceModule as dep4, dxRuntimeExports as dep4Runtime } from "./src-features-editor-components-library-release-panel-shared-tsx-185476f4669a07c8.mjs";
import { dxSourceModule as dep5, dxRuntimeExports as dep5Runtime } from "./src-lib-forge-icons-lucide-react-tsx-b9b0a8debf22abe8.mjs";
export const dxSourceText = "\"use client\";\n\nimport type { ReactNode } from \"react\";\nimport {\n  CalendarCheck2,\n  ClipboardCopy,\n  Download,\n  FileJson2,\n  GitPullRequest,\n  ListChecks,\n  MessagesSquare,\n  Share2,\n} from \"lucide-react\";\nimport { Badge } from \"@/components/ui/badge\";\nimport { Button } from \"@/components/ui/button\";\nimport {\n  Card,\n  CardContent,\n  CardDescription,\n  CardHeader,\n  CardTitle,\n} from \"@/components/ui/card\";\nimport type {\n  AdminLiveReviewSessionsReport,\n  AdminLiveReviewSessionStatus,\n} from \"@/features/admin/admin-live-review-sessions\";\nimport {\n  getAdminLiveReviewSessionsCsv,\n  getAdminLiveReviewSessionsJson,\n  getAdminLiveReviewSessionsMarkdown,\n} from \"@/features/admin/admin-live-review-sessions\";\nimport { downloadTextFile } from \"@/features/editor/components/library-release-panel-shared\";\n\ntype AdminLiveReviewSessionsPanelProps = {\n  report: AdminLiveReviewSessionsReport;\n};\n\nexport function AdminLiveReviewSessionsPanel({\n  report,\n}: AdminLiveReviewSessionsPanelProps) {\n  function exportJson() {\n    downloadTextFile({\n      content: getAdminLiveReviewSessionsJson(report),\n      filename: \"admin-live-review-sessions.json\",\n      type: \"application/json;charset=utf-8\",\n    });\n  }\n\n  function exportCsv() {\n    downloadTextFile({\n      content: getAdminLiveReviewSessionsCsv(report),\n      filename: \"admin-live-review-sessions.csv\",\n      type: \"text/csv;charset=utf-8\",\n    });\n  }\n\n  function exportMarkdown() {\n    downloadTextFile({\n      content: getAdminLiveReviewSessionsMarkdown(report),\n      filename: \"admin-live-review-sessions.md\",\n      type: \"text/markdown;charset=utf-8\",\n    });\n  }\n\n  function copyMarkdown() {\n    void navigator.clipboard.writeText(\n      getAdminLiveReviewSessionsMarkdown(report),\n    );\n  }\n\n  return (\n    <Card>\n      <CardHeader className=\"gap-3 md:flex-row md:items-center md:justify-between\">\n        <div>\n          <CardTitle className=\"flex items-center gap-2\">\n            <CalendarCheck2 className=\"size-4\" />\n            Live review sessions\n          </CardTitle>\n          <CardDescription>\n            Agendas, minutes, branch links, comments, approvals, public shares,\n            owners, and action items for production design reviews.\n          </CardDescription>\n        </div>\n        <div className=\"flex flex-wrap items-center gap-2\">\n          <Badge variant={getStatusVariant(report.status)}>\n            {report.status} {report.score}\n          </Badge>\n          <Button type=\"button\" size=\"sm\" variant=\"outline\" onClick={exportJson}>\n            <FileJson2 className=\"size-3.5\" />\n            JSON\n          </Button>\n          <Button type=\"button\" size=\"sm\" variant=\"outline\" onClick={exportCsv}>\n            <Download className=\"size-3.5\" />\n            CSV\n          </Button>\n          <Button\n            type=\"button\"\n            size=\"sm\"\n            variant=\"outline\"\n            onClick={exportMarkdown}\n          >\n            <Download className=\"size-3.5\" />\n            MD\n          </Button>\n          <Button\n            type=\"button\"\n            size=\"sm\"\n            variant=\"outline\"\n            onClick={copyMarkdown}\n          >\n            <ClipboardCopy className=\"size-3.5\" />\n            Copy\n          </Button>\n        </div>\n      </CardHeader>\n      <CardContent className=\"grid gap-4\">\n        <div className=\"grid gap-2 text-xs md:grid-cols-3 xl:grid-cols-6\">\n          <Metric label=\"Sessions\" value={report.sessionCount} />\n          <Metric label=\"Agenda\" value={report.agendaItemCount} />\n          <Metric label=\"Minutes\" value={report.minutesItemCount} />\n          <Metric label=\"Actions\" value={report.actionItemCount} />\n          <Metric label=\"Owners\" value={report.missingOwnerCount} />\n          <Metric label=\"Shares\" value={report.linkedPublicShareCount} />\n        </div>\n\n        <div className=\"grid gap-2 lg:grid-cols-2\">\n          {report.rows.map((row) => (\n            <div\n              key={row.id}\n              className=\"rounded-md border border-border bg-muted/20 p-3 text-sm\"\n            >\n              <div className=\"flex flex-wrap items-start justify-between gap-2\">\n                <div>\n                  <div className=\"font-medium\">{row.label}</div>\n                  <p className=\"mt-1 text-xs text-muted-foreground\">\n                    {row.detail}\n                  </p>\n                </div>\n                <Badge variant={getStatusVariant(row.status)}>{row.status}</Badge>\n              </div>\n              <div className=\"mt-3 flex flex-wrap gap-1\">\n                <Badge variant=\"outline\">{row.value}</Badge>\n                {row.target ? <Badge variant=\"outline\">{row.target}</Badge> : null}\n              </div>\n              <p className=\"mt-2 text-xs text-muted-foreground\">\n                {row.recommendation}\n              </p>\n            </div>\n          ))}\n        </div>\n\n        <div className=\"grid gap-3 xl:grid-cols-2\">\n          {report.sessions.slice(0, 8).map((session) => (\n            <div\n              key={session.id}\n              className=\"rounded-md border border-border bg-background p-3\"\n            >\n              <div className=\"flex flex-wrap items-start justify-between gap-2\">\n                <div className=\"min-w-0\">\n                  <div className=\"font-medium\">{session.fileName}</div>\n                  <p className=\"mt-1 truncate text-xs text-muted-foreground\">\n                    {session.branchName}\n                  </p>\n                </div>\n                <Badge variant={getStatusVariant(session.status)}>\n                  {session.status}\n                </Badge>\n              </div>\n              <div className=\"mt-3 grid gap-2 text-xs sm:grid-cols-4\">\n                <Info\n                  icon={<GitPullRequest className=\"size-3.5\" />}\n                  label=\"Comments\"\n                  value={`${session.openCommentCount}`}\n                />\n                <Info\n                  icon={<MessagesSquare className=\"size-3.5\" />}\n                  label=\"Agenda\"\n                  value={`${session.agendaItemCount}`}\n                />\n                <Info\n                  icon={<ListChecks className=\"size-3.5\" />}\n                  label=\"Actions\"\n                  value={`${session.actionItemCount}`}\n                />\n                <Info\n                  icon={<Share2 className=\"size-3.5\" />}\n                  label=\"Shares\"\n                  value={`${session.publicShareCount}`}\n                />\n              </div>\n              <p className=\"mt-3 text-xs text-muted-foreground\">\n                {session.recommendation}\n              </p>\n            </div>\n          ))}\n        </div>\n      </CardContent>\n    </Card>\n  );\n}\n\nfunction Metric({ label, value }: { label: string; value: number | string }) {\n  return (\n    <div className=\"rounded-md border border-border bg-muted/20 p-2\">\n      <div className=\"text-muted-foreground\">{label}</div>\n      <div className=\"mt-1 font-mono text-sm text-foreground\">{value}</div>\n    </div>\n  );\n}\n\nfunction Info({\n  icon,\n  label,\n  value,\n}: {\n  icon: ReactNode;\n  label: string;\n  value: string;\n}) {\n  return (\n    <div className=\"rounded-md border border-border bg-muted/20 p-2\">\n      <div className=\"flex items-center gap-1 text-muted-foreground\">\n        {icon}\n        <span>{label}</span>\n      </div>\n      <div className=\"mt-1 font-mono text-foreground\">{value}</div>\n    </div>\n  );\n}\n\nfunction getStatusVariant(status: AdminLiveReviewSessionStatus) {\n  if (status === \"blocked\") {\n    return \"destructive\";\n  }\n\n  return status === \"review\" ? \"secondary\" : \"outline\";\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/components/admin-live-review-sessions-panel.tsx",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-components-admin-live-review-sessions-panel-tsx-068623cf38496bdd.mjs",
  "kind": "tsx",
  "hash": "068623cf38496bdd",
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
      "specifier": "@/features/admin/admin-live-review-sessions",
      "resolved_path": "src/features/admin/admin-live-review-sessions.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-live-review-sessions-ts-13d45ddcedb31b04.mjs",
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
    "source_path": "src/features/admin/components/admin-live-review-sessions-panel.tsx",
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
        "specifier": "@/features/admin/admin-live-review-sessions",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/admin/admin-live-review-sessions",
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
      "AdminLiveReviewSessionsPanel"
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
