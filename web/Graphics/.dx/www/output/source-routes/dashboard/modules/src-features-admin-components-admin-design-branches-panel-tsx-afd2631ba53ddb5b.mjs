import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-components-ui-badge-tsx-5f9c9bdbd1c68d30.mjs";
import { dxSourceModule as dep1, dxRuntimeExports as dep1Runtime } from "./src-components-ui-button-tsx-a045a54d4568e98d.mjs";
import { dxSourceModule as dep2, dxRuntimeExports as dep2Runtime } from "./src-components-ui-card-tsx-62d56c5e9cb9789f.mjs";
import { dxSourceModule as dep3, dxRuntimeExports as dep3Runtime } from "./src-features-admin-admin-design-branches-ts-8cacfdfb6e7eec88.mjs";
import { dxSourceModule as dep4, dxRuntimeExports as dep4Runtime } from "./src-features-editor-components-library-release-panel-shared-tsx-185476f4669a07c8.mjs";
import { dxSourceModule as dep5, dxRuntimeExports as dep5Runtime } from "./src-lib-forge-icons-lucide-react-tsx-b9b0a8debf22abe8.mjs";
export const dxSourceText = "\"use client\";\n\nimport { GitBranch, Download } from \"lucide-react\";\nimport { Badge } from \"@/components/ui/badge\";\nimport { Button } from \"@/components/ui/button\";\nimport {\n  Card,\n  CardContent,\n  CardDescription,\n  CardHeader,\n  CardTitle,\n} from \"@/components/ui/card\";\nimport {\n  getAdminDesignBranchCsv,\n  getAdminDesignBranchJson,\n  getAdminDesignBranchMarkdown,\n  type AdminDesignBranchReport,\n  type AdminDesignBranchRow,\n  type AdminDesignBranchStatus,\n} from \"@/features/admin/admin-design-branches\";\nimport { downloadTextFile } from \"@/features/editor/components/library-release-panel-shared\";\n\ntype AdminDesignBranchesPanelProps = {\n  report: AdminDesignBranchReport;\n};\n\nexport function AdminDesignBranchesPanel({\n  report,\n}: AdminDesignBranchesPanelProps) {\n  function exportJson() {\n    downloadTextFile({\n      filename: \"design-branch-governance.json\",\n      content: getAdminDesignBranchJson(report),\n      type: \"application/json\",\n    });\n  }\n\n  function exportCsv() {\n    downloadTextFile({\n      filename: \"design-branch-governance.csv\",\n      content: getAdminDesignBranchCsv(report),\n      type: \"text/csv\",\n    });\n  }\n\n  function exportMarkdown() {\n    downloadTextFile({\n      filename: \"design-branch-governance.md\",\n      content: getAdminDesignBranchMarkdown(report),\n      type: \"text/markdown\",\n    });\n  }\n\n  return (\n    <Card>\n      <CardHeader className=\"gap-3 sm:flex-row sm:items-start sm:justify-between\">\n        <div>\n          <CardDescription>Multiplayer and branching</CardDescription>\n          <CardTitle className=\"flex items-center gap-2\">\n            <GitBranch className=\"size-5\" />\n            Design branch governance\n          </CardTitle>\n        </div>\n        <div className=\"flex flex-wrap gap-2\">\n          <Button type=\"button\" size=\"sm\" variant=\"outline\" onClick={exportJson}>\n            <Download className=\"size-4\" />\n            JSON\n          </Button>\n          <Button type=\"button\" size=\"sm\" variant=\"outline\" onClick={exportCsv}>\n            <Download className=\"size-4\" />\n            CSV\n          </Button>\n          <Button\n            type=\"button\"\n            size=\"sm\"\n            variant=\"outline\"\n            onClick={exportMarkdown}\n          >\n            <Download className=\"size-4\" />\n            Markdown\n          </Button>\n        </div>\n      </CardHeader>\n      <CardContent className=\"space-y-4\">\n        <div className=\"grid gap-3 md:grid-cols-5\">\n          <BranchMetric label=\"Score\" value={report.score} />\n          <BranchMetric label=\"Branches\" value={report.branchCount} />\n          <BranchMetric label=\"Active\" value={report.activeBranchCount} />\n          <BranchMetric label=\"Review intent\" value={report.reviewIntentCount} />\n          <BranchMetric label=\"Restore gaps\" value={report.missingRestorePointCount} />\n        </div>\n        <div className=\"grid gap-3 lg:grid-cols-2\">\n          {report.rows.slice(0, 8).map((row) => (\n            <BranchReviewCard key={row.id} row={row} />\n          ))}\n        </div>\n        {report.commands.length > 0 ? (\n          <div className=\"rounded-md border border-border bg-muted/30 p-3 text-sm\">\n            <div className=\"mb-2 font-medium\">Operator checklist</div>\n            <ul className=\"space-y-1 text-muted-foreground\">\n              {report.commands.map((command) => (\n                <li key={command}>{command}</li>\n              ))}\n            </ul>\n          </div>\n        ) : null}\n      </CardContent>\n    </Card>\n  );\n}\n\nfunction BranchMetric({ label, value }: { label: string; value: number }) {\n  return (\n    <div className=\"rounded-md border border-border bg-background p-3\">\n      <div className=\"text-xs text-muted-foreground\">{label}</div>\n      <div className=\"mt-1 font-mono text-2xl font-semibold\">{value}</div>\n    </div>\n  );\n}\n\nfunction BranchReviewCard({ row }: { row: AdminDesignBranchRow }) {\n  return (\n    <div className=\"rounded-md border border-border bg-background p-3\">\n      <div className=\"flex items-start justify-between gap-3\">\n        <div className=\"min-w-0\">\n          <div className=\"truncate font-medium\">{row.branchName}</div>\n          <div className=\"text-xs text-muted-foreground\">\n            {row.fileName} by {row.ownerEmail}\n          </div>\n        </div>\n        <Badge variant={getStatusVariant(row.status)}>{row.status}</Badge>\n      </div>\n      <div className=\"mt-3 text-sm\">{row.summary}</div>\n      <div className=\"mt-1 text-xs text-muted-foreground\">{row.detail}</div>\n      <div className=\"mt-3 rounded-md bg-muted/50 p-2 text-xs\">\n        {row.recommendation}\n      </div>\n    </div>\n  );\n}\n\nfunction getStatusVariant(status: AdminDesignBranchStatus) {\n  if (status === \"blocked\") {\n    return \"destructive\";\n  }\n\n  if (status === \"review\") {\n    return \"secondary\";\n  }\n\n  return \"default\";\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/components/admin-design-branches-panel.tsx",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-components-admin-design-branches-panel-tsx-afd2631ba53ddb5b.mjs",
  "kind": "tsx",
  "hash": "afd2631ba53ddb5b",
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
      "specifier": "@/features/admin/admin-design-branches",
      "resolved_path": "src/features/admin/admin-design-branches.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-design-branches-ts-8cacfdfb6e7eec88.mjs",
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
    "source_path": "src/features/admin/components/admin-design-branches-panel.tsx",
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
        "specifier": "@/features/admin/admin-design-branches",
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
      "AdminDesignBranchesPanel"
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
