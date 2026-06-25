import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-components-ui-badge-tsx-5f9c9bdbd1c68d30.mjs";
import { dxSourceModule as dep1, dxRuntimeExports as dep1Runtime } from "./src-components-ui-button-tsx-a045a54d4568e98d.mjs";
import { dxSourceModule as dep2, dxRuntimeExports as dep2Runtime } from "./src-components-ui-card-tsx-62d56c5e9cb9789f.mjs";
import { dxSourceModule as dep3, dxRuntimeExports as dep3Runtime } from "./src-features-admin-actions-ts-7a34f9e31ee697de.mjs";
import { dxSourceModule as dep4, dxRuntimeExports as dep4Runtime } from "./src-features-admin-admin-collaboration-event-ingestion-export-ts-506603c07997fb6f.mjs";
import { dxSourceModule as dep5, dxRuntimeExports as dep5Runtime } from "./src-features-editor-components-library-release-panel-shared-tsx-185476f4669a07c8.mjs";
import { dxSourceModule as dep6, dxRuntimeExports as dep6Runtime } from "./src-lib-forge-icons-lucide-react-tsx-b9b0a8debf22abe8.mjs";
export const dxSourceText = "\"use client\";\n\nimport { useState, useTransition } from \"react\";\nimport { useRouter } from \"next/navigation\";\nimport {\n  ClipboardCopy,\n  DatabaseZap,\n  Download,\n  Eraser,\n  FileJson2,\n  ShieldCheck,\n} from \"lucide-react\";\nimport { Badge } from \"@/components/ui/badge\";\nimport { Button } from \"@/components/ui/button\";\nimport {\n  Card,\n  CardContent,\n  CardDescription,\n  CardHeader,\n  CardTitle,\n} from \"@/components/ui/card\";\nimport { purgeCollaborationEventReplay } from \"@/features/admin/actions\";\nimport type {\n  AdminCollaborationEventIngestionReport,\n  AdminCollaborationEventStatus,\n} from \"@/features/admin/admin-collaboration-event-ingestion\";\nimport {\n  getAdminCollaborationEventIngestionCsv,\n  getAdminCollaborationEventIngestionJson,\n  getAdminCollaborationEventIngestionMarkdown,\n} from \"@/features/admin/admin-collaboration-event-ingestion-export\";\nimport { downloadTextFile } from \"@/features/editor/components/library-release-panel-shared\";\n\ntype AdminCollaborationEventIngestionPanelProps = {\n  report: AdminCollaborationEventIngestionReport;\n};\n\nexport function AdminCollaborationEventIngestionPanel({\n  report,\n}: AdminCollaborationEventIngestionPanelProps) {\n  const router = useRouter();\n  const [pending, startTransition] = useTransition();\n  const [actionError, setActionError] = useState<string | null>(null);\n\n  function exportJson() {\n    downloadTextFile({\n      content: getAdminCollaborationEventIngestionJson(report),\n      filename: \"collaboration-event-ingestion.json\",\n      type: \"application/json;charset=utf-8\",\n    });\n  }\n\n  function exportCsv() {\n    downloadTextFile({\n      content: getAdminCollaborationEventIngestionCsv(report),\n      filename: \"collaboration-event-ingestion.csv\",\n      type: \"text/csv;charset=utf-8\",\n    });\n  }\n\n  function exportMarkdown() {\n    downloadTextFile({\n      content: getAdminCollaborationEventIngestionMarkdown(report),\n      filename: \"collaboration-event-ingestion.md\",\n      type: \"text/markdown;charset=utf-8\",\n    });\n  }\n\n  function copyMarkdown() {\n    void navigator.clipboard.writeText(\n      getAdminCollaborationEventIngestionMarkdown(report),\n    );\n  }\n\n  function purgeReplay() {\n    setActionError(null);\n    startTransition(() => {\n      void purgeCollaborationEventReplay({\n        retentionDays: report.retentionDays,\n        note: `Purged stale collaboration replay payloads older than ${report.retentionDays} days after exporting event ingestion evidence.`,\n      })\n        .then(() => router.refresh())\n        .catch((error) => {\n          setActionError(\n            error instanceof Error ? error.message : \"Replay purge failed.\",\n          );\n        });\n    });\n  }\n\n  return (\n    <Card>\n      <CardHeader className=\"gap-3 md:flex-row md:items-center md:justify-between\">\n        <div>\n          <CardTitle className=\"flex items-center gap-2\">\n            <DatabaseZap className=\"size-4\" />\n            Collaboration event ingestion\n          </CardTitle>\n          <CardDescription>\n            Privacy-safe durable event ledger, replay windows, incident\n            retention, and workspace purge controls.\n          </CardDescription>\n        </div>\n        <div className=\"flex flex-wrap items-center gap-2\">\n          <Badge variant={getStatusVariant(report.status)}>\n            {report.status} {report.score}\n          </Badge>\n          <Badge variant=\"outline\">\n            <ShieldCheck className=\"size-3\" />\n            {report.redactedEventCount}/{report.durableEventCount} redacted\n          </Badge>\n        </div>\n      </CardHeader>\n      <CardContent className=\"grid gap-4\">\n        <div className=\"grid gap-2 text-xs md:grid-cols-3 xl:grid-cols-6\">\n          <Metric label=\"Events\" value={report.durableEventCount} />\n          <Metric label=\"Presence\" value={report.presenceEventCount} />\n          <Metric label=\"Chat\" value={report.chatEventCount} />\n          <Metric label=\"Activity\" value={report.activityEventCount} />\n          <Metric label=\"Room actions\" value={report.roomActionEventCount} />\n          <Metric label=\"Purge queue\" value={report.purgeCandidateCount} />\n        </div>\n\n        {actionError ? (\n          <div className=\"rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive\">\n            {actionError}\n          </div>\n        ) : null}\n\n        <div className=\"grid gap-3 xl:grid-cols-[1fr_0.85fr]\">\n          <div className=\"grid gap-2\">\n            {report.incidents.map((incident) => (\n              <div\n                key={incident.id}\n                className=\"rounded-md border border-border bg-muted/20 p-3 text-sm\"\n              >\n                <div className=\"flex items-start justify-between gap-3\">\n                  <div className=\"min-w-0\">\n                    <div className=\"truncate font-medium\">{incident.label}</div>\n                    <div className=\"mt-1 flex flex-wrap gap-1\">\n                      <Badge variant={getStatusVariant(incident.status)}>\n                        {incident.status}\n                      </Badge>\n                      <Badge variant=\"outline\">{incident.category}</Badge>\n                      <Badge variant=\"outline\">{incident.value}</Badge>\n                    </div>\n                  </div>\n                </div>\n                <p className=\"mt-2 text-xs text-muted-foreground\">\n                  {incident.detail}\n                </p>\n                <p className=\"mt-2 text-xs\">{incident.recommendation}</p>\n              </div>\n            ))}\n          </div>\n\n          <div className=\"grid gap-2\">\n            {report.replayWindows.slice(0, 6).map((window) => (\n              <div\n                key={window.fileId}\n                className=\"rounded-md border border-border bg-background p-3 text-xs\"\n              >\n                <div className=\"flex items-center justify-between gap-2\">\n                  <div className=\"truncate font-medium\">{window.fileName}</div>\n                  <Badge variant={getStatusVariant(window.status)}>\n                    {window.status}\n                  </Badge>\n                </div>\n                <div className=\"mt-2 grid grid-cols-2 gap-2\">\n                  <Info label=\"Events\" value={`${window.eventCount}`} />\n                  <Info\n                    label=\"Expires\"\n                    value={formatShortDate(window.retentionExpiresAt)}\n                  />\n                  <Info label=\"Chat\" value={`${window.chatCount}`} />\n                  <Info label=\"Presence\" value={`${window.presenceCount}`} />\n                </div>\n                <p className=\"mt-2 text-muted-foreground\">\n                  {window.recommendation}\n                </p>\n              </div>\n            ))}\n          </div>\n        </div>\n\n        <div className=\"grid gap-2 md:grid-cols-5\">\n          <Button type=\"button\" size=\"sm\" variant=\"outline\" onClick={exportJson}>\n            <FileJson2 className=\"size-3.5\" />\n            JSON\n          </Button>\n          <Button type=\"button\" size=\"sm\" variant=\"outline\" onClick={exportCsv}>\n            <Download className=\"size-3.5\" />\n            CSV\n          </Button>\n          <Button\n            type=\"button\"\n            size=\"sm\"\n            variant=\"outline\"\n            onClick={exportMarkdown}\n          >\n            <Download className=\"size-3.5\" />\n            MD\n          </Button>\n          <Button\n            type=\"button\"\n            size=\"sm\"\n            variant=\"outline\"\n            onClick={copyMarkdown}\n          >\n            <ClipboardCopy className=\"size-3.5\" />\n            Copy\n          </Button>\n          <Button\n            type=\"button\"\n            size=\"sm\"\n            variant=\"secondary\"\n            disabled={pending || report.purgeCandidateCount === 0}\n            onClick={purgeReplay}\n          >\n            <Eraser className=\"size-3.5\" />\n            {pending ? \"Purging\" : \"Purge stale\"}\n          </Button>\n        </div>\n      </CardContent>\n    </Card>\n  );\n}\n\nfunction Metric({ label, value }: { label: string; value: number | string }) {\n  return (\n    <div className=\"rounded-md border border-border bg-muted/20 p-2\">\n      <div className=\"text-muted-foreground\">{label}</div>\n      <div className=\"mt-1 font-mono text-sm text-foreground\">{value}</div>\n    </div>\n  );\n}\n\nfunction Info({ label, value }: { label: string; value: string }) {\n  return (\n    <div className=\"rounded-md border border-border bg-muted/20 p-2\">\n      <div className=\"text-muted-foreground\">{label}</div>\n      <div className=\"mt-1 font-mono text-foreground\">{value}</div>\n    </div>\n  );\n}\n\nfunction formatShortDate(value: string | null) {\n  if (!value) {\n    return \"none\";\n  }\n\n  return new Intl.DateTimeFormat(undefined, {\n    dateStyle: \"medium\",\n  }).format(new Date(value));\n}\n\nfunction getStatusVariant(status: AdminCollaborationEventStatus) {\n  if (status === \"blocked\") {\n    return \"destructive\";\n  }\n\n  return status === \"review\" ? \"secondary\" : \"outline\";\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/components/admin-collaboration-event-ingestion-panel.tsx",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-components-admin-collaboration-event-ingestion-panel-tsx-3b86ef06fd47f79e.mjs",
  "kind": "tsx",
  "hash": "3b86ef06fd47f79e",
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
      "specifier": "@/features/admin/admin-collaboration-event-ingestion-export",
      "resolved_path": "src/features/admin/admin-collaboration-event-ingestion-export.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-collaboration-event-ingestion-export-ts-506603c07997fb6f.mjs",
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
    "source_path": "src/features/admin/components/admin-collaboration-event-ingestion-panel.tsx",
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
        "specifier": "@/features/admin/admin-collaboration-event-ingestion",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/admin/admin-collaboration-event-ingestion-export",
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
      "AdminCollaborationEventIngestionPanel"
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
