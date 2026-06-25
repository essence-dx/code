import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-components-ui-badge-tsx-5f9c9bdbd1c68d30.mjs";
import { dxSourceModule as dep1, dxRuntimeExports as dep1Runtime } from "./src-components-ui-button-tsx-a045a54d4568e98d.mjs";
import { dxSourceModule as dep2, dxRuntimeExports as dep2Runtime } from "./src-components-ui-card-tsx-62d56c5e9cb9789f.mjs";
import { dxSourceModule as dep3, dxRuntimeExports as dep3Runtime } from "./src-components-ui-input-tsx-5c00dcef4bc2ae59.mjs";
import { dxSourceModule as dep4, dxRuntimeExports as dep4Runtime } from "./src-features-admin-admin-command-center-search-ts-18c872779332963b.mjs";
import { dxSourceModule as dep5, dxRuntimeExports as dep5Runtime } from "./src-features-editor-components-library-release-panel-shared-tsx-185476f4669a07c8.mjs";
import { dxSourceModule as dep6, dxRuntimeExports as dep6Runtime } from "./src-lib-forge-icons-lucide-react-tsx-b9b0a8debf22abe8.mjs";
export const dxSourceText = "\"use client\";\n\nimport { useMemo, useState } from \"react\";\nimport {\n  ClipboardCopy,\n  Download,\n  FileJson2,\n  Search,\n  ShieldCheck,\n} from \"lucide-react\";\nimport { Badge } from \"@/components/ui/badge\";\nimport { Button } from \"@/components/ui/button\";\nimport {\n  Card,\n  CardContent,\n  CardDescription,\n  CardHeader,\n  CardTitle,\n} from \"@/components/ui/card\";\nimport { Input } from \"@/components/ui/input\";\nimport type {\n  AdminCommandCenterSearchCategory,\n  AdminCommandCenterSearchReport,\n  AdminCommandCenterSearchStatus,\n} from \"@/features/admin/admin-command-center-search\";\nimport {\n  filterAdminCommandCenterSearchRows,\n  getAdminCommandCenterSearchCsv,\n  getAdminCommandCenterSearchJson,\n  getAdminCommandCenterSearchMarkdown,\n} from \"@/features/admin/admin-command-center-search\";\nimport { downloadTextFile } from \"@/features/editor/components/library-release-panel-shared\";\n\ntype AdminCommandCenterSearchPanelProps = {\n  report: AdminCommandCenterSearchReport;\n};\n\nconst categoryOptions: Array<AdminCommandCenterSearchCategory | \"all\"> = [\n  \"all\",\n  \"governance\",\n  \"release\",\n  \"runbook\",\n  \"evidence\",\n  \"user\",\n  \"file\",\n  \"share\",\n];\n\nconst statusOptions: Array<AdminCommandCenterSearchStatus | \"all\"> = [\n  \"all\",\n  \"blocked\",\n  \"review\",\n  \"ready\",\n];\n\nexport function AdminCommandCenterSearchPanel({\n  report,\n}: AdminCommandCenterSearchPanelProps) {\n  const [query, setQuery] = useState(\"\");\n  const [category, setCategory] =\n    useState<(typeof categoryOptions)[number]>(\"all\");\n  const [status, setStatus] = useState<(typeof statusOptions)[number]>(\"all\");\n  const rows = useMemo(\n    () =>\n      filterAdminCommandCenterSearchRows(report.rows, query, {\n        category,\n        status,\n      }).slice(0, 30),\n    [category, query, report.rows, status],\n  );\n\n  function exportJson() {\n    downloadTextFile({\n      content: getAdminCommandCenterSearchJson(report),\n      filename: \"admin-command-center-search.json\",\n      type: \"application/json;charset=utf-8\",\n    });\n  }\n\n  function exportCsv() {\n    downloadTextFile({\n      content: getAdminCommandCenterSearchCsv(report),\n      filename: \"admin-command-center-search.csv\",\n      type: \"text/csv;charset=utf-8\",\n    });\n  }\n\n  function exportMarkdown() {\n    downloadTextFile({\n      content: getAdminCommandCenterSearchMarkdown(report),\n      filename: \"admin-command-center-search.md\",\n      type: \"text/markdown;charset=utf-8\",\n    });\n  }\n\n  function copyMarkdown() {\n    void navigator.clipboard.writeText(\n      getAdminCommandCenterSearchMarkdown(report),\n    );\n  }\n\n  return (\n    <Card>\n      <CardHeader className=\"gap-3 md:flex-row md:items-center md:justify-between\">\n        <div>\n          <CardTitle className=\"flex items-center gap-2\">\n            <Search className=\"size-4\" />\n            Command-center search\n          </CardTitle>\n          <CardDescription>\n            Governance reports, operators, files, shares, runbooks, and evidence\n            bundles in one review index.\n          </CardDescription>\n        </div>\n        <div className=\"flex flex-wrap items-center gap-2\">\n          <Badge variant={getStatusVariant(report.status)}>\n            {report.status} {report.score}\n          </Badge>\n          <Badge variant=\"outline\">{report.rowCount} rows</Badge>\n          <Badge variant=\"outline\">{report.commandCount} commands</Badge>\n        </div>\n      </CardHeader>\n      <CardContent className=\"grid gap-4\">\n        <div className=\"grid gap-2 text-xs md:grid-cols-4\">\n          <Metric label=\"Blocked\" value={report.blockedCount} />\n          <Metric label=\"Review\" value={report.reviewCount} />\n          <Metric label=\"Ready\" value={report.readyCount} />\n          <Metric label=\"Sources\" value={report.summaries.length} />\n        </div>\n\n        <div className=\"grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]\">\n          <div className=\"relative\">\n            <Search className=\"pointer-events-none absolute left-2.5 top-2 size-4 text-muted-foreground\" />\n            <Input\n              value={query}\n              onChange={(event) => setQuery(event.target.value)}\n              placeholder=\"Search owner, file, DLP, route smoke, runbook, evidence bundle...\"\n              className=\"pl-8\"\n            />\n          </div>\n          <div className=\"grid grid-cols-4 gap-2\">\n            <Button type=\"button\" size=\"sm\" variant=\"outline\" onClick={exportJson}>\n              <FileJson2 className=\"size-3.5\" />\n              JSON\n            </Button>\n            <Button type=\"button\" size=\"sm\" variant=\"outline\" onClick={exportCsv}>\n              <Download className=\"size-3.5\" />\n              CSV\n            </Button>\n            <Button\n              type=\"button\"\n              size=\"sm\"\n              variant=\"outline\"\n              onClick={exportMarkdown}\n            >\n              <Download className=\"size-3.5\" />\n              MD\n            </Button>\n            <Button\n              type=\"button\"\n              size=\"sm\"\n              variant=\"outline\"\n              onClick={copyMarkdown}\n            >\n              <ClipboardCopy className=\"size-3.5\" />\n              Copy\n            </Button>\n          </div>\n        </div>\n\n        <div className=\"grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]\">\n          <FilterGroup\n            label=\"Categories\"\n            values={categoryOptions}\n            value={category}\n            onValueChange={setCategory}\n          />\n          <FilterGroup\n            label=\"Status\"\n            values={statusOptions}\n            value={status}\n            onValueChange={setStatus}\n          />\n        </div>\n\n        {report.suggestedQueries.length > 0 ? (\n          <div className=\"flex flex-wrap gap-2\">\n            {report.suggestedQueries.map((suggestion) => (\n              <Button\n                key={suggestion}\n                type=\"button\"\n                size=\"xs\"\n                variant=\"secondary\"\n                onClick={() => setQuery(suggestion)}\n              >\n                {suggestion}\n              </Button>\n            ))}\n          </div>\n        ) : null}\n\n        <div className=\"grid gap-2 text-xs md:grid-cols-2 xl:grid-cols-4\">\n          {report.summaries.map((summary) => (\n            <div\n              key={summary.category}\n              className=\"rounded-md border border-border bg-muted/20 p-2\"\n            >\n              <div className=\"flex items-center justify-between gap-2\">\n                <span className=\"font-medium capitalize\">{summary.category}</span>\n                <Badge variant=\"outline\">{summary.count}</Badge>\n              </div>\n              <div className=\"mt-1 text-muted-foreground\">\n                {summary.blockedCount} blocked / {summary.reviewCount} review\n              </div>\n            </div>\n          ))}\n        </div>\n\n        <div className=\"grid gap-2\">\n          <div className=\"flex items-center justify-between gap-2 text-xs\">\n            <div className=\"font-medium\">Matching command-center rows</div>\n            <Badge variant=\"outline\">{rows.length} shown</Badge>\n          </div>\n          {rows.length > 0 ? (\n            <div className=\"grid gap-2 xl:grid-cols-2\">\n              {rows.map((row) => (\n                <div\n                  key={row.id}\n                  className=\"rounded-md border border-border bg-muted/20 p-3 text-sm\"\n                >\n                  <div className=\"flex items-start justify-between gap-3\">\n                    <div className=\"min-w-0\">\n                      <div className=\"flex items-center gap-2 font-medium\">\n                        <ShieldCheck className=\"size-3.5 shrink-0 text-muted-foreground\" />\n                        <span className=\"truncate\">{row.label}</span>\n                      </div>\n                      <div className=\"mt-1 flex flex-wrap gap-1\">\n                        <Badge variant=\"outline\">{row.category}</Badge>\n                        <Badge variant={getStatusVariant(row.status)}>\n                          {row.status}\n                        </Badge>\n                        <Badge variant=\"outline\">{row.source}</Badge>\n                        {row.score !== null ? (\n                          <Badge variant=\"outline\">score {row.score}</Badge>\n                        ) : null}\n                      </div>\n                    </div>\n                  </div>\n                  <p className=\"mt-2 text-xs text-muted-foreground\">\n                    {row.detail}\n                  </p>\n                  <p className=\"mt-2 text-xs\">{row.evidence}</p>\n                  <div className=\"mt-2 flex flex-wrap gap-1\">\n                    <Badge variant=\"outline\">{row.owner}</Badge>\n                    {row.latestAt ? (\n                      <Badge variant=\"outline\">{formatDate(row.latestAt)}</Badge>\n                    ) : null}\n                  </div>\n                  {row.command ? (\n                    <div className=\"mt-2 rounded-md border border-border bg-background p-2 font-mono text-[11px] text-muted-foreground\">\n                      {row.command}\n                    </div>\n                  ) : null}\n                </div>\n              ))}\n            </div>\n          ) : (\n            <div className=\"rounded-md border border-border bg-muted/20 p-4 text-sm text-muted-foreground\">\n              No matching command-center rows.\n            </div>\n          )}\n        </div>\n      </CardContent>\n    </Card>\n  );\n}\n\nfunction FilterGroup<TValue extends string>({\n  label,\n  onValueChange,\n  value,\n  values,\n}: {\n  label: string;\n  onValueChange: (value: TValue) => void;\n  value: TValue;\n  values: TValue[];\n}) {\n  return (\n    <div className=\"rounded-md border border-border bg-muted/20 p-2\">\n      <div className=\"mb-2 text-xs font-medium text-muted-foreground\">\n        {label}\n      </div>\n      <div className=\"flex flex-wrap gap-1\">\n        {values.map((option) => (\n          <Button\n            key={option}\n            type=\"button\"\n            size=\"xs\"\n            variant={option === value ? \"default\" : \"ghost\"}\n            onClick={() => onValueChange(option)}\n          >\n            {option}\n          </Button>\n        ))}\n      </div>\n    </div>\n  );\n}\n\nfunction Metric({ label, value }: { label: string; value: number | string }) {\n  return (\n    <div className=\"rounded-md border border-border bg-muted/20 p-2\">\n      <div className=\"text-muted-foreground\">{label}</div>\n      <div className=\"mt-1 font-mono text-sm text-foreground\">{value}</div>\n    </div>\n  );\n}\n\nfunction getStatusVariant(status: AdminCommandCenterSearchStatus) {\n  if (status === \"blocked\") {\n    return \"destructive\";\n  }\n\n  return status === \"review\" ? \"secondary\" : \"outline\";\n}\n\nfunction formatDate(value: string) {\n  return new Intl.DateTimeFormat(undefined, {\n    dateStyle: \"medium\",\n    timeStyle: \"short\",\n  }).format(new Date(value));\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/components/admin-command-center-search-panel.tsx",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-components-admin-command-center-search-panel-tsx-05fd92b881d9beea.mjs",
  "kind": "tsx",
  "hash": "05fd92b881d9beea",
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
      "specifier": "@/components/ui/input",
      "resolved_path": "src/components/ui/input.tsx",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-components-ui-input-tsx-5c00dcef4bc2ae59.mjs",
      "kind": "tsx",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/admin/admin-command-center-search",
      "resolved_path": "src/features/admin/admin-command-center-search.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-command-center-search-ts-18c872779332963b.mjs",
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
    },
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
    "source_path": "src/features/admin/components/admin-command-center-search-panel.tsx",
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
        "type_only": false
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
        "specifier": "@/components/ui/input",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/admin/admin-command-center-search",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/admin/admin-command-center-search",
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
      "AdminCommandCenterSearchPanel"
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
export const dxLinkedDependencies = Object.freeze([dep0, dep1, dep2, dep3, dep4, dep5, dep6]);
export default dxSourceModule;
