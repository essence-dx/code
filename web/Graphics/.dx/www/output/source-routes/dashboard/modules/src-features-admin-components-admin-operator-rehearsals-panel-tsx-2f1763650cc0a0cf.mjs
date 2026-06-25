import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-components-ui-badge-tsx-5f9c9bdbd1c68d30.mjs";
import { dxSourceModule as dep1, dxRuntimeExports as dep1Runtime } from "./src-components-ui-button-tsx-a045a54d4568e98d.mjs";
import { dxSourceModule as dep2, dxRuntimeExports as dep2Runtime } from "./src-components-ui-card-tsx-62d56c5e9cb9789f.mjs";
import { dxSourceModule as dep3, dxRuntimeExports as dep3Runtime } from "./src-features-admin-admin-operator-rehearsals-export-ts-ccb10d61b84e3480.mjs";
import { dxSourceModule as dep4, dxRuntimeExports as dep4Runtime } from "./src-features-editor-components-library-release-panel-shared-tsx-185476f4669a07c8.mjs";
import { dxSourceModule as dep5, dxRuntimeExports as dep5Runtime } from "./src-lib-forge-icons-lucide-react-tsx-b9b0a8debf22abe8.mjs";
export const dxSourceText = "\"use client\";\n\nimport {\n  ClipboardCheck,\n  ClipboardCopy,\n  Download,\n  FileJson2,\n  MonitorDown,\n  RotateCcw,\n  ServerCog,\n  ShieldCheck,\n  Upload,\n} from \"lucide-react\";\nimport { Badge } from \"@/components/ui/badge\";\nimport { Button } from \"@/components/ui/button\";\nimport {\n  Card,\n  CardContent,\n  CardDescription,\n  CardHeader,\n  CardTitle,\n} from \"@/components/ui/card\";\nimport type {\n  AdminOperatorRehearsalKind,\n  AdminOperatorRehearsalReport,\n  AdminOperatorRehearsalRun,\n  AdminOperatorRehearsalStatus,\n} from \"@/features/admin/admin-operator-rehearsals\";\nimport {\n  getAdminOperatorRehearsalsCsv,\n  getAdminOperatorRehearsalsJson,\n  getAdminOperatorRehearsalsMarkdown,\n} from \"@/features/admin/admin-operator-rehearsals-export\";\nimport { downloadTextFile } from \"@/features/editor/components/library-release-panel-shared\";\n\ntype AdminOperatorRehearsalsPanelProps = {\n  report: AdminOperatorRehearsalReport;\n};\n\nexport function AdminOperatorRehearsalsPanel({\n  report,\n}: AdminOperatorRehearsalsPanelProps) {\n  const sortedRuns = report.runs\n    .filter((run) => run.status !== \"ready\")\n    .concat(report.runs.filter((run) => run.status === \"ready\"));\n\n  function exportJson() {\n    downloadTextFile({\n      content: getAdminOperatorRehearsalsJson(report),\n      filename: \"admin-operator-rehearsals.json\",\n      type: \"application/json;charset=utf-8\",\n    });\n  }\n\n  function exportCsv() {\n    downloadTextFile({\n      content: getAdminOperatorRehearsalsCsv(report),\n      filename: \"admin-operator-rehearsals.csv\",\n      type: \"text/csv;charset=utf-8\",\n    });\n  }\n\n  function exportMarkdown() {\n    downloadTextFile({\n      content: getAdminOperatorRehearsalsMarkdown(report),\n      filename: \"admin-operator-rehearsals.md\",\n      type: \"text/markdown;charset=utf-8\",\n    });\n  }\n\n  function copyMarkdown() {\n    void navigator.clipboard.writeText(getAdminOperatorRehearsalsMarkdown(report));\n  }\n\n  return (\n    <Card>\n      <CardHeader className=\"gap-3 md:flex-row md:items-center md:justify-between\">\n        <div>\n          <CardTitle className=\"flex items-center gap-2\">\n            <ClipboardCheck className=\"size-4\" />\n            Operator rehearsals\n          </CardTitle>\n          <CardDescription>\n            Restore, import/export, public share privacy, desktop handoff, and\n            self-hosted recovery drills with repeatable evidence and commands.\n          </CardDescription>\n        </div>\n        <Badge variant={getStatusVariant(report.status)}>\n          {report.status} {report.score}\n        </Badge>\n      </CardHeader>\n      <CardContent className=\"grid gap-4\">\n        <div className=\"grid gap-2 text-xs md:grid-cols-3 xl:grid-cols-6\">\n          <Metric label=\"Runs\" value={report.runCount} />\n          <Metric label=\"Ready\" value={report.readyRunCount} />\n          <Metric label=\"Review\" value={report.reviewRunCount} />\n          <Metric label=\"Blocked\" value={report.blockedRunCount} />\n          <Metric label=\"Steps\" value={report.stepCount} />\n          <Metric label=\"Commands\" value={report.commandCount} />\n        </div>\n\n        <div className=\"grid gap-3 xl:grid-cols-2\">\n          {sortedRuns.map((run) => (\n            <RehearsalRunCard key={run.id} run={run} />\n          ))}\n        </div>\n\n        <div className=\"grid gap-2 text-xs\">\n          <div className=\"flex flex-wrap items-center justify-between gap-2\">\n            <div className=\"font-medium\">Rehearsal commands</div>\n            <Badge variant=\"outline\">{report.commands.length} commands</Badge>\n          </div>\n          <div className=\"grid gap-2 lg:grid-cols-2\">\n            {report.commands.slice(0, 10).map((command) => (\n              <div\n                key={command}\n                className=\"rounded-md border border-border bg-muted/20 p-3 font-mono text-[11px] text-muted-foreground\"\n              >\n                {command}\n              </div>\n            ))}\n          </div>\n        </div>\n\n        <div className=\"grid grid-cols-2 gap-2 sm:grid-cols-4\">\n          <Button type=\"button\" size=\"sm\" variant=\"outline\" onClick={exportJson}>\n            <FileJson2 className=\"size-3.5\" />\n            JSON\n          </Button>\n          <Button type=\"button\" size=\"sm\" variant=\"outline\" onClick={exportCsv}>\n            <Download className=\"size-3.5\" />\n            CSV\n          </Button>\n          <Button\n            type=\"button\"\n            size=\"sm\"\n            variant=\"outline\"\n            onClick={exportMarkdown}\n          >\n            <Download className=\"size-3.5\" />\n            MD\n          </Button>\n          <Button\n            type=\"button\"\n            size=\"sm\"\n            variant=\"outline\"\n            onClick={copyMarkdown}\n          >\n            <ClipboardCopy className=\"size-3.5\" />\n            Copy\n          </Button>\n        </div>\n      </CardContent>\n    </Card>\n  );\n}\n\nfunction RehearsalRunCard({ run }: { run: AdminOperatorRehearsalRun }) {\n  const Icon = getRunIcon(run.kind);\n  const sortedSteps = run.steps\n    .filter((step) => step.status !== \"ready\")\n    .concat(run.steps.filter((step) => step.status === \"ready\"));\n\n  return (\n    <div className=\"rounded-md border border-border bg-muted/20 p-3 text-sm\">\n      <div className=\"flex items-start justify-between gap-3\">\n        <div className=\"min-w-0\">\n          <div className=\"flex items-center gap-2 font-medium\">\n            <Icon className=\"size-4\" />\n            <span className=\"truncate\">{run.label}</span>\n          </div>\n          <p className=\"mt-1 text-xs text-muted-foreground\">{run.objective}</p>\n        </div>\n        <Badge variant={getStatusVariant(run.status)}>{run.status}</Badge>\n      </div>\n\n      <div className=\"mt-3 grid grid-cols-2 gap-2 text-xs md:grid-cols-4\">\n        <Metric label=\"Score\" value={run.score} />\n        <Metric label=\"Ready\" value={run.readyStepCount} />\n        <Metric label=\"Review\" value={run.reviewStepCount} />\n        <Metric label=\"Blocked\" value={run.blockedStepCount} />\n      </div>\n\n      <div className=\"mt-3 flex flex-wrap gap-1 text-xs\">\n        <Badge variant=\"outline\">{run.ownerRole}</Badge>\n        <Badge variant=\"outline\">{run.cadence}</Badge>\n        <Badge variant=\"outline\">{run.commandCount} commands</Badge>\n      </div>\n\n      <div className=\"mt-3 grid gap-2\">\n        {sortedSteps.map((step) => (\n          <div\n            key={step.id}\n            className=\"rounded-md border border-border bg-background/70 p-3 text-xs\"\n          >\n            <div className=\"flex flex-wrap items-center justify-between gap-2\">\n              <div className=\"font-medium\">{step.label}</div>\n              <Badge variant={getStatusVariant(step.status)}>{step.status}</Badge>\n            </div>\n            <p className=\"mt-2 text-muted-foreground\">{step.evidence}</p>\n            <p className=\"mt-2\">{step.expectedResult}</p>\n            {step.command ? (\n              <div className=\"mt-2 rounded-md bg-muted px-2 py-1 font-mono text-[11px] text-muted-foreground\">\n                {step.command}\n              </div>\n            ) : null}\n          </div>\n        ))}\n      </div>\n    </div>\n  );\n}\n\nfunction Metric({ label, value }: { label: string; value: number | string }) {\n  return (\n    <div className=\"rounded-md border border-border bg-background/70 p-2\">\n      <div className=\"text-muted-foreground\">{label}</div>\n      <div className=\"mt-1 font-mono text-sm text-foreground\">{value}</div>\n    </div>\n  );\n}\n\nfunction getRunIcon(kind: AdminOperatorRehearsalKind) {\n  if (kind === \"restore\") {\n    return RotateCcw;\n  }\n\n  if (kind === \"import-export\") {\n    return Upload;\n  }\n\n  if (kind === \"desktop-handoff\") {\n    return MonitorDown;\n  }\n\n  if (kind === \"self-hosted-recovery\") {\n    return ServerCog;\n  }\n\n  return ShieldCheck;\n}\n\nfunction getStatusVariant(status: AdminOperatorRehearsalStatus) {\n  if (status === \"blocked\") {\n    return \"destructive\";\n  }\n\n  return status === \"review\" ? \"secondary\" : \"outline\";\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/components/admin-operator-rehearsals-panel.tsx",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-components-admin-operator-rehearsals-panel-tsx-2f1763650cc0a0cf.mjs",
  "kind": "tsx",
  "hash": "2f1763650cc0a0cf",
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
      "specifier": "@/features/admin/admin-operator-rehearsals-export",
      "resolved_path": "src/features/admin/admin-operator-rehearsals-export.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-operator-rehearsals-export-ts-ccb10d61b84e3480.mjs",
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
    "source_path": "src/features/admin/components/admin-operator-rehearsals-panel.tsx",
    "source_kind": "tsx",
    "parser_backend": "oxc-parser",
    "diagnostics": 1,
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
        "specifier": "@/features/admin/admin-operator-rehearsals",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/admin/admin-operator-rehearsals-export",
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
      "AdminOperatorRehearsalsPanel"
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
