import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-components-ui-badge-tsx-5f9c9bdbd1c68d30.mjs";
import { dxSourceModule as dep1, dxRuntimeExports as dep1Runtime } from "./src-components-ui-button-tsx-a045a54d4568e98d.mjs";
import { dxSourceModule as dep2, dxRuntimeExports as dep2Runtime } from "./src-components-ui-card-tsx-62d56c5e9cb9789f.mjs";
import { dxSourceModule as dep3, dxRuntimeExports as dep3Runtime } from "./src-features-admin-admin-branch-review-inbox-export-ts-8fb27bb65d43f5f8.mjs";
import { dxSourceModule as dep4, dxRuntimeExports as dep4Runtime } from "./src-features-editor-components-library-release-panel-shared-tsx-185476f4669a07c8.mjs";
import { dxSourceModule as dep5, dxRuntimeExports as dep5Runtime } from "./src-lib-forge-icons-lucide-react-tsx-b9b0a8debf22abe8.mjs";
export const dxSourceText = "\"use client\";\n\nimport {\n  ClipboardCopy,\n  Clock3,\n  Download,\n  FileJson2,\n  GitPullRequest,\n  ShieldAlert,\n  UserCheck,\n} from \"lucide-react\";\nimport { Badge } from \"@/components/ui/badge\";\nimport { Button } from \"@/components/ui/button\";\nimport {\n  Card,\n  CardContent,\n  CardDescription,\n  CardHeader,\n  CardTitle,\n} from \"@/components/ui/card\";\nimport type {\n  AdminBranchReviewInboxReport,\n  AdminBranchReviewInboxStatus,\n} from \"@/features/admin/admin-branch-review-inbox\";\nimport {\n  getAdminBranchReviewInboxCsv,\n  getAdminBranchReviewInboxJson,\n  getAdminBranchReviewInboxMarkdown,\n} from \"@/features/admin/admin-branch-review-inbox-export\";\nimport { downloadTextFile } from \"@/features/editor/components/library-release-panel-shared\";\n\ntype AdminBranchReviewInboxPanelProps = {\n  report: AdminBranchReviewInboxReport;\n};\n\nexport function AdminBranchReviewInboxPanel({\n  report,\n}: AdminBranchReviewInboxPanelProps) {\n  function exportJson() {\n    downloadTextFile({\n      filename: \"branch-review-inbox.json\",\n      content: getAdminBranchReviewInboxJson(report),\n      type: \"application/json;charset=utf-8\",\n    });\n  }\n\n  function exportCsv() {\n    downloadTextFile({\n      filename: \"branch-review-inbox.csv\",\n      content: getAdminBranchReviewInboxCsv(report),\n      type: \"text/csv;charset=utf-8\",\n    });\n  }\n\n  function exportMarkdown() {\n    downloadTextFile({\n      filename: \"branch-review-inbox.md\",\n      content: getAdminBranchReviewInboxMarkdown(report),\n      type: \"text/markdown;charset=utf-8\",\n    });\n  }\n\n  function copyMarkdown() {\n    void navigator.clipboard.writeText(\n      getAdminBranchReviewInboxMarkdown(report),\n    );\n  }\n\n  return (\n    <Card>\n      <CardHeader className=\"gap-3 md:flex-row md:items-center md:justify-between\">\n        <div>\n          <CardTitle className=\"flex items-center gap-2\">\n            <GitPullRequest className=\"size-4\" />\n            Branch review inbox\n          </CardTitle>\n          <CardDescription>\n            Reviewer ownership, SLA state, merge readiness, blockers, and\n            release evidence for active design branches.\n          </CardDescription>\n        </div>\n        <div className=\"flex flex-wrap items-center gap-2\">\n          <Badge variant={getStatusVariant(report.status)}>\n            {report.status} {report.score}\n          </Badge>\n          <Button type=\"button\" size=\"sm\" variant=\"outline\" onClick={exportJson}>\n            <FileJson2 className=\"size-3.5\" />\n            JSON\n          </Button>\n          <Button type=\"button\" size=\"sm\" variant=\"outline\" onClick={exportCsv}>\n            <Download className=\"size-3.5\" />\n            CSV\n          </Button>\n          <Button\n            type=\"button\"\n            size=\"sm\"\n            variant=\"outline\"\n            onClick={exportMarkdown}\n          >\n            <Download className=\"size-3.5\" />\n            MD\n          </Button>\n          <Button\n            type=\"button\"\n            size=\"sm\"\n            variant=\"outline\"\n            onClick={copyMarkdown}\n          >\n            <ClipboardCopy className=\"size-3.5\" />\n            Copy\n          </Button>\n        </div>\n      </CardHeader>\n      <CardContent className=\"grid gap-4\">\n        <div className=\"grid gap-2 md:grid-cols-3 xl:grid-cols-6\">\n          <Metric label=\"Requests\" value={report.requestCount} />\n          <Metric label=\"Reviewers\" value={report.reviewerCount} />\n          <Metric label=\"Overdue\" value={report.overdueCount} />\n          <Metric label=\"Due soon\" value={report.dueSoonCount} />\n          <Metric label=\"Merge ready\" value={report.mergeReadyCount} />\n          <Metric label=\"Blockers\" value={report.blockerCount} />\n        </div>\n\n        <div className=\"grid gap-3 xl:grid-cols-2\">\n          {report.requests.length === 0 ? (\n            <div className=\"rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground\">\n              No active branch review requests are loaded yet.\n            </div>\n          ) : (\n            report.requests.slice(0, 8).map((request) => (\n              <div\n                key={request.id}\n                className=\"rounded-md border border-border bg-muted/20 p-3\"\n              >\n                <div className=\"flex items-start justify-between gap-3\">\n                  <div className=\"min-w-0\">\n                    <div className=\"truncate font-medium\">\n                      {request.branchName}\n                    </div>\n                    <div className=\"mt-1 flex flex-wrap gap-1\">\n                      <Badge variant=\"outline\">{request.mergeIntent}</Badge>\n                      <Badge variant={getStatusVariant(request.status)}>\n                        {request.status}\n                      </Badge>\n                      <Badge variant={getStatusVariant(request.mergeReadiness)}>\n                        merge {request.mergeReadiness}\n                      </Badge>\n                    </div>\n                  </div>\n                  <Badge variant={getStatusVariant(toSlaStatus(request.slaStatus))}>\n                    {request.slaStatus}\n                  </Badge>\n                </div>\n\n                <div className=\"mt-3 grid gap-2 text-xs md:grid-cols-3\">\n                  <Info\n                    icon={UserCheck}\n                    label=\"Reviewers\"\n                    value={request.reviewerSummary}\n                  />\n                  <Info\n                    icon={Clock3}\n                    label=\"Due\"\n                    value={request.dueDate ? formatDate(request.dueDate) : \"None\"}\n                  />\n                  <Info\n                    icon={ShieldAlert}\n                    label=\"Evidence\"\n                    value={`${request.releaseEvidenceCount} anchors`}\n                  />\n                </div>\n\n                <p className=\"mt-3 text-sm text-muted-foreground\">\n                  {request.openCommentCount} open comments,{\" \"}\n                  {request.mergeReviewCount} merge reviews,{\" \"}\n                  {request.blockerCount} blockers.\n                </p>\n                <p className=\"mt-2 text-xs\">{request.recommendation}</p>\n                {request.blockers.length > 0 ? (\n                  <div className=\"mt-2 flex flex-wrap gap-1\">\n                    {request.blockers.slice(0, 3).map((blocker) => (\n                      <Badge key={blocker} variant=\"secondary\">\n                        {blocker}\n                      </Badge>\n                    ))}\n                  </div>\n                ) : null}\n              </div>\n            ))\n          )}\n        </div>\n      </CardContent>\n    </Card>\n  );\n}\n\nfunction Metric({ label, value }: { label: string; value: number }) {\n  return (\n    <div className=\"rounded-md border border-border bg-muted/20 p-3\">\n      <div className=\"text-xs text-muted-foreground\">{label}</div>\n      <div className=\"mt-1 font-mono text-2xl font-semibold\">{value}</div>\n    </div>\n  );\n}\n\nfunction Info({\n  icon: Icon,\n  label,\n  value,\n}: {\n  icon: typeof UserCheck;\n  label: string;\n  value: string;\n}) {\n  return (\n    <div className=\"rounded-md border border-border bg-background p-2\">\n      <div className=\"flex items-center gap-1 text-muted-foreground\">\n        <Icon className=\"size-3.5\" />\n        {label}\n      </div>\n      <div className=\"mt-1 truncate font-medium\">{value}</div>\n    </div>\n  );\n}\n\nfunction getStatusVariant(status: AdminBranchReviewInboxStatus) {\n  if (status === \"blocked\") {\n    return \"destructive\";\n  }\n\n  return status === \"review\" ? \"secondary\" : \"outline\";\n}\n\nfunction toSlaStatus(status: string): AdminBranchReviewInboxStatus {\n  if (status === \"overdue\" || status === \"unassigned\") {\n    return \"blocked\";\n  }\n\n  return status === \"clear\" ? \"ready\" : \"review\";\n}\n\nfunction formatDate(value: string) {\n  return new Intl.DateTimeFormat(undefined, {\n    dateStyle: \"medium\",\n  }).format(new Date(value));\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/components/admin-branch-review-inbox-panel.tsx",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-components-admin-branch-review-inbox-panel-tsx-68bbf78a2ca517db.mjs",
  "kind": "tsx",
  "hash": "68bbf78a2ca517db",
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
      "specifier": "@/features/admin/admin-branch-review-inbox-export",
      "resolved_path": "src/features/admin/admin-branch-review-inbox-export.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-branch-review-inbox-export-ts-8fb27bb65d43f5f8.mjs",
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
    "source_path": "src/features/admin/components/admin-branch-review-inbox-panel.tsx",
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
        "specifier": "@/features/admin/admin-branch-review-inbox",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/admin/admin-branch-review-inbox-export",
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
      "AdminBranchReviewInboxPanel"
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
