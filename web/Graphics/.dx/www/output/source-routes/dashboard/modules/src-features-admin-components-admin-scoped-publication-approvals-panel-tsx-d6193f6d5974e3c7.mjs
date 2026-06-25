import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-components-ui-badge-tsx-5f9c9bdbd1c68d30.mjs";
import { dxSourceModule as dep1, dxRuntimeExports as dep1Runtime } from "./src-components-ui-button-tsx-a045a54d4568e98d.mjs";
import { dxSourceModule as dep2, dxRuntimeExports as dep2Runtime } from "./src-components-ui-card-tsx-62d56c5e9cb9789f.mjs";
import { dxSourceModule as dep3, dxRuntimeExports as dep3Runtime } from "./src-features-admin-actions-ts-7a34f9e31ee697de.mjs";
import { dxSourceModule as dep4, dxRuntimeExports as dep4Runtime } from "./src-features-admin-admin-scoped-publication-approvals-export-ts-cd02b1a6e624e6d8.mjs";
import { dxSourceModule as dep5, dxRuntimeExports as dep5Runtime } from "./src-features-editor-components-library-release-panel-shared-tsx-185476f4669a07c8.mjs";
import { dxSourceModule as dep6, dxRuntimeExports as dep6Runtime } from "./src-lib-forge-icons-lucide-react-tsx-b9b0a8debf22abe8.mjs";
export const dxSourceText = "\"use client\";\n\nimport { useState, useTransition } from \"react\";\nimport { useRouter } from \"next/navigation\";\nimport {\n  CheckCircle2,\n  ClipboardCopy,\n  Download,\n  FileJson2,\n  GitPullRequestArrow,\n  ShieldCheck,\n  XCircle,\n} from \"lucide-react\";\nimport { Badge } from \"@/components/ui/badge\";\nimport { Button } from \"@/components/ui/button\";\nimport {\n  Card,\n  CardContent,\n  CardDescription,\n  CardHeader,\n  CardTitle,\n} from \"@/components/ui/card\";\nimport { saveScopedPublicationApproval } from \"@/features/admin/actions\";\nimport type {\n  ScopedPublicationApprovalReport,\n  ScopedPublicationApprovalScope,\n  ScopedPublicationStatus,\n} from \"@/features/admin/admin-scoped-publication-approvals\";\nimport {\n  getScopedPublicationApprovalCsv,\n  getScopedPublicationApprovalJson,\n  getScopedPublicationApprovalMarkdown,\n} from \"@/features/admin/admin-scoped-publication-approvals-export\";\nimport { downloadTextFile } from \"@/features/editor/components/library-release-panel-shared\";\n\ntype AdminScopedPublicationApprovalsPanelProps = {\n  report: ScopedPublicationApprovalReport;\n};\n\nexport function AdminScopedPublicationApprovalsPanel({\n  report,\n}: AdminScopedPublicationApprovalsPanelProps) {\n  const router = useRouter();\n  const [pendingScope, setPendingScope] = useState<string | null>(null);\n  const [actionError, setActionError] = useState<string | null>(null);\n  const [, startTransition] = useTransition();\n\n  function exportJson() {\n    downloadTextFile({\n      content: getScopedPublicationApprovalJson(report),\n      filename: \"scoped-publication-approvals.json\",\n      type: \"application/json;charset=utf-8\",\n    });\n  }\n\n  function exportCsv() {\n    downloadTextFile({\n      content: getScopedPublicationApprovalCsv(report),\n      filename: \"scoped-publication-approvals.csv\",\n      type: \"text/csv;charset=utf-8\",\n    });\n  }\n\n  function exportMarkdown() {\n    downloadTextFile({\n      content: getScopedPublicationApprovalMarkdown(report),\n      filename: \"scoped-publication-approvals.md\",\n      type: \"text/markdown;charset=utf-8\",\n    });\n  }\n\n  function copyMarkdown() {\n    void navigator.clipboard.writeText(\n      getScopedPublicationApprovalMarkdown(report),\n    );\n  }\n\n  function runDecision(\n    scope: ScopedPublicationApprovalScope,\n    decision: \"approved\" | \"changes-requested\",\n  ) {\n    setPendingScope(`${scope.scopeKey}-${decision}`);\n    setActionError(null);\n    startTransition(() => {\n      void saveScopedPublicationApproval({\n        blockerCount: scope.blockers.length,\n        channelCount: scope.channelCount,\n        decision,\n        evidenceDiffCount: scope.releaseEvidenceDiffCount,\n        note:\n          decision === \"approved\"\n            ? `Approved ${scope.scopeKey} publication evidence.`\n            : `Requested changes for ${scope.scopeKey} publication evidence.`,\n        projectName: scope.projectName,\n        rollbackAnchorCount: scope.rollbackAnchorCount,\n        scopeKey: scope.scopeKey,\n        slaDueAt: scope.slaDueAt,\n        teamName: scope.teamName,\n      })\n        .then(() => router.refresh())\n        .catch((error) => {\n          setActionError(\n            error instanceof Error\n              ? error.message\n              : \"Scoped publication decision failed.\",\n          );\n        })\n        .finally(() => setPendingScope(null));\n    });\n  }\n\n  return (\n    <Card>\n      <CardHeader className=\"gap-3 md:flex-row md:items-center md:justify-between\">\n        <div>\n          <CardTitle className=\"flex items-center gap-2\">\n            <GitPullRequestArrow className=\"size-4\" />\n            Scoped publication approvals\n          </CardTitle>\n          <CardDescription>\n            Team/project ownership, SLA state, rollback anchors, and release\n            evidence diffs before publication.\n          </CardDescription>\n        </div>\n        <div className=\"flex flex-wrap items-center gap-2\">\n          <Badge variant={getStatusVariant(report.status)}>\n            {report.status} {report.score}\n          </Badge>\n          <Badge variant=\"outline\">\n            <ShieldCheck className=\"size-3\" />\n            {report.approvedScopeCount}/{report.scopeCount} approved\n          </Badge>\n        </div>\n      </CardHeader>\n      <CardContent className=\"grid gap-4\">\n        <div className=\"grid gap-2 text-xs md:grid-cols-3 xl:grid-cols-6\">\n          <Metric label=\"Scopes\" value={report.scopeCount} />\n          <Metric label=\"Approved\" value={report.approvedScopeCount} />\n          <Metric label=\"Missing\" value={report.missingApprovalCount} />\n          <Metric label=\"Stale\" value={report.staleApprovalCount} />\n          <Metric label=\"Overdue\" value={report.overdueScopeCount} />\n          <Metric label=\"Diffs\" value={report.releaseEvidenceDiffCount} />\n        </div>\n\n        {actionError ? (\n          <div className=\"rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive\">\n            {actionError}\n          </div>\n        ) : null}\n\n        <div className=\"grid gap-3 xl:grid-cols-2\">\n          {report.scopes.slice(0, 8).map((scope) => (\n            <div\n              key={scope.scopeKey}\n              className=\"rounded-md border border-border bg-muted/20 p-3 text-sm\"\n            >\n              <div className=\"flex items-start justify-between gap-3\">\n                <div className=\"min-w-0\">\n                  <div className=\"truncate font-medium\">{scope.scopeKey}</div>\n                  <div className=\"mt-1 flex flex-wrap gap-1\">\n                    <Badge variant={getStatusVariant(scope.status)}>\n                      {scope.status}\n                    </Badge>\n                    <Badge variant=\"outline\">{scope.approvalState}</Badge>\n                    <Badge variant=\"outline\">SLA {scope.slaStatus}</Badge>\n                  </div>\n                </div>\n              </div>\n              <div className=\"mt-3 grid gap-2 text-xs md:grid-cols-4\">\n                <Info label=\"Files\" value={`${scope.fileCount}`} />\n                <Info\n                  label=\"Channels\"\n                  value={`${scope.readyChannelCount}/${scope.channelCount}`}\n                />\n                <Info label=\"Rollback\" value={`${scope.rollbackAnchorCount}`} />\n                <Info\n                  label=\"Diffs\"\n                  value={`${scope.releaseEvidenceDiffCount}`}\n                />\n              </div>\n              <p className=\"mt-3 text-xs text-muted-foreground\">\n                {scope.reviewerSummary}\n              </p>\n              <p className=\"mt-2 text-xs\">{scope.recommendation}</p>\n              {scope.slaDueAt ? (\n                <div className=\"mt-2 font-mono text-[10px] text-muted-foreground\">\n                  Due {formatDate(scope.slaDueAt)}\n                </div>\n              ) : null}\n              <div className=\"mt-3 flex flex-wrap gap-2\">\n                <Button\n                  type=\"button\"\n                  size=\"sm\"\n                  variant=\"secondary\"\n                  disabled={pendingScope !== null}\n                  onClick={() => runDecision(scope, \"approved\")}\n                >\n                  <CheckCircle2 className=\"size-3.5\" />\n                  {pendingScope === `${scope.scopeKey}-approved`\n                    ? \"Saving\"\n                    : \"Approve\"}\n                </Button>\n                <Button\n                  type=\"button\"\n                  size=\"sm\"\n                  variant=\"outline\"\n                  disabled={pendingScope !== null}\n                  onClick={() => runDecision(scope, \"changes-requested\")}\n                >\n                  <XCircle className=\"size-3.5\" />\n                  {pendingScope === `${scope.scopeKey}-changes-requested`\n                    ? \"Saving\"\n                    : \"Request changes\"}\n                </Button>\n              </div>\n            </div>\n          ))}\n        </div>\n\n        <div className=\"grid gap-2 md:grid-cols-4\">\n          <Button type=\"button\" size=\"sm\" variant=\"outline\" onClick={exportJson}>\n            <FileJson2 className=\"size-3.5\" />\n            JSON\n          </Button>\n          <Button type=\"button\" size=\"sm\" variant=\"outline\" onClick={exportCsv}>\n            <Download className=\"size-3.5\" />\n            CSV\n          </Button>\n          <Button\n            type=\"button\"\n            size=\"sm\"\n            variant=\"outline\"\n            onClick={exportMarkdown}\n          >\n            <Download className=\"size-3.5\" />\n            MD\n          </Button>\n          <Button\n            type=\"button\"\n            size=\"sm\"\n            variant=\"outline\"\n            onClick={copyMarkdown}\n          >\n            <ClipboardCopy className=\"size-3.5\" />\n            Copy\n          </Button>\n        </div>\n      </CardContent>\n    </Card>\n  );\n}\n\nfunction Metric({ label, value }: { label: string; value: number | string }) {\n  return (\n    <div className=\"rounded-md border border-border bg-muted/20 p-2\">\n      <div className=\"text-muted-foreground\">{label}</div>\n      <div className=\"mt-1 font-mono text-sm text-foreground\">{value}</div>\n    </div>\n  );\n}\n\nfunction Info({ label, value }: { label: string; value: string }) {\n  return (\n    <div className=\"rounded-md border border-border bg-background p-2\">\n      <div className=\"text-muted-foreground\">{label}</div>\n      <div className=\"mt-1 font-mono text-foreground\">{value}</div>\n    </div>\n  );\n}\n\nfunction formatDate(value: string) {\n  return new Intl.DateTimeFormat(undefined, {\n    dateStyle: \"medium\",\n    timeStyle: \"short\",\n  }).format(new Date(value));\n}\n\nfunction getStatusVariant(status: ScopedPublicationStatus) {\n  if (status === \"blocked\") {\n    return \"destructive\";\n  }\n\n  return status === \"review\" ? \"secondary\" : \"outline\";\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/components/admin-scoped-publication-approvals-panel.tsx",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-components-admin-scoped-publication-approvals-panel-tsx-d6193f6d5974e3c7.mjs",
  "kind": "tsx",
  "hash": "d6193f6d5974e3c7",
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
      "specifier": "@/features/admin/actions",
      "resolved_path": "src/features/admin/actions.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-actions-ts-7a34f9e31ee697de.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/admin/admin-scoped-publication-approvals-export",
      "resolved_path": "src/features/admin/admin-scoped-publication-approvals-export.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-scoped-publication-approvals-export-ts-cd02b1a6e624e6d8.mjs",
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
      "specifier": "next/navigation",
      "resolved_path": null,
      "chunk_output": null,
      "kind": "compiler-intrinsic",
      "resolver_source": "compiler-intrinsic",
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
    "source_path": "src/features/admin/components/admin-scoped-publication-approvals-panel.tsx",
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
        "specifier": "next/navigation",
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
        "specifier": "@/features/admin/actions",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/admin/admin-scoped-publication-approvals",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/admin/admin-scoped-publication-approvals-export",
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
      "AdminScopedPublicationApprovalsPanel"
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
