import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-components-ui-badge-tsx-5f9c9bdbd1c68d30.mjs";
import { dxSourceModule as dep1, dxRuntimeExports as dep1Runtime } from "./src-components-ui-button-tsx-a045a54d4568e98d.mjs";
import { dxSourceModule as dep2, dxRuntimeExports as dep2Runtime } from "./src-components-ui-card-tsx-62d56c5e9cb9789f.mjs";
import { dxSourceModule as dep3, dxRuntimeExports as dep3Runtime } from "./src-features-admin-admin-external-comment-notification-workflows-ts-87f29566aee9e5d9.mjs";
import { dxSourceModule as dep4, dxRuntimeExports as dep4Runtime } from "./src-features-editor-components-library-release-panel-shared-tsx-185476f4669a07c8.mjs";
import { dxSourceModule as dep5, dxRuntimeExports as dep5Runtime } from "./src-lib-forge-icons-lucide-react-tsx-b9b0a8debf22abe8.mjs";
export const dxSourceText = "\"use client\";\n\nimport type { ReactNode } from \"react\";\nimport {\n  BellRing,\n  ClipboardCopy,\n  Download,\n  FileJson2,\n  MailWarning,\n  MessageSquareText,\n  RotateCcw,\n  ShieldOff,\n} from \"lucide-react\";\nimport { Badge } from \"@/components/ui/badge\";\nimport { Button } from \"@/components/ui/button\";\nimport {\n  Card,\n  CardContent,\n  CardDescription,\n  CardHeader,\n  CardTitle,\n} from \"@/components/ui/card\";\nimport type {\n  AdminExternalCommentNotificationWorkflowStatus,\n  AdminExternalCommentNotificationWorkflowsReport,\n} from \"@/features/admin/admin-external-comment-notification-workflows\";\nimport {\n  getAdminExternalCommentNotificationWorkflowsCsv,\n  getAdminExternalCommentNotificationWorkflowsJson,\n  getAdminExternalCommentNotificationWorkflowsMarkdown,\n} from \"@/features/admin/admin-external-comment-notification-workflows\";\nimport { downloadTextFile } from \"@/features/editor/components/library-release-panel-shared\";\n\ntype AdminExternalCommentNotificationWorkflowsPanelProps = {\n  report: AdminExternalCommentNotificationWorkflowsReport;\n};\n\nexport function AdminExternalCommentNotificationWorkflowsPanel({\n  report,\n}: AdminExternalCommentNotificationWorkflowsPanelProps) {\n  function exportJson() {\n    downloadTextFile({\n      content: getAdminExternalCommentNotificationWorkflowsJson(report),\n      filename: \"admin-external-comment-notification-workflows.json\",\n      type: \"application/json;charset=utf-8\",\n    });\n  }\n\n  function exportCsv() {\n    downloadTextFile({\n      content: getAdminExternalCommentNotificationWorkflowsCsv(report),\n      filename: \"admin-external-comment-notification-workflows.csv\",\n      type: \"text/csv;charset=utf-8\",\n    });\n  }\n\n  function exportMarkdown() {\n    downloadTextFile({\n      content: getAdminExternalCommentNotificationWorkflowsMarkdown(report),\n      filename: \"admin-external-comment-notification-workflows.md\",\n      type: \"text/markdown;charset=utf-8\",\n    });\n  }\n\n  function copyMarkdown() {\n    void navigator.clipboard.writeText(\n      getAdminExternalCommentNotificationWorkflowsMarkdown(report),\n    );\n  }\n\n  return (\n    <Card>\n      <CardHeader className=\"gap-3 md:flex-row md:items-center md:justify-between\">\n        <div>\n          <CardTitle className=\"flex items-center gap-2\">\n            <BellRing className=\"size-4\" />\n            External comment notification workflows\n          </CardTitle>\n          <CardDescription>\n            Delivery retry queues, digest previews, mention routing, and\n            suppression review for external comment recipients.\n          </CardDescription>\n        </div>\n        <div className=\"flex flex-wrap items-center gap-2\">\n          <Badge variant={getStatusVariant(report.status)}>\n            {report.status} {report.score}\n          </Badge>\n          <Button type=\"button\" size=\"sm\" variant=\"outline\" onClick={exportJson}>\n            <FileJson2 className=\"size-3.5\" />\n            JSON\n          </Button>\n          <Button type=\"button\" size=\"sm\" variant=\"outline\" onClick={exportCsv}>\n            <Download className=\"size-3.5\" />\n            CSV\n          </Button>\n          <Button\n            type=\"button\"\n            size=\"sm\"\n            variant=\"outline\"\n            onClick={exportMarkdown}\n          >\n            <Download className=\"size-3.5\" />\n            MD\n          </Button>\n          <Button\n            type=\"button\"\n            size=\"sm\"\n            variant=\"outline\"\n            onClick={copyMarkdown}\n          >\n            <ClipboardCopy className=\"size-3.5\" />\n            Copy\n          </Button>\n        </div>\n      </CardHeader>\n      <CardContent className=\"grid gap-4\">\n        <div className=\"grid gap-2 text-xs md:grid-cols-3 xl:grid-cols-6\">\n          <Metric label=\"Deliveries\" value={report.deliveryCount} />\n          <Metric label=\"Failed\" value={report.failedDeliveryCount} />\n          <Metric label=\"Retries\" value={report.retryQueueCount} />\n          <Metric label=\"Digest previews\" value={report.digestPreviewCount} />\n          <Metric label=\"Unrouted\" value={report.unroutedMentionCount} />\n          <Metric label=\"Suppressed\" value={report.suppressedRecipientCount} />\n        </div>\n\n        <div className=\"grid gap-2 lg:grid-cols-2\">\n          {report.rows.map((row) => (\n            <div\n              key={row.id}\n              className=\"rounded-md border border-border bg-muted/20 p-3 text-sm\"\n            >\n              <div className=\"flex flex-wrap items-start justify-between gap-2\">\n                <div>\n                  <div className=\"font-medium\">{row.label}</div>\n                  <p className=\"mt-1 text-xs text-muted-foreground\">\n                    {row.detail}\n                  </p>\n                </div>\n                <Badge variant={getStatusVariant(row.status)}>{row.status}</Badge>\n              </div>\n              <div className=\"mt-3 flex flex-wrap gap-1\">\n                <Badge variant=\"outline\">{row.value}</Badge>\n                {row.target ? <Badge variant=\"outline\">{row.target}</Badge> : null}\n              </div>\n              <p className=\"mt-2 text-xs text-muted-foreground\">\n                {row.recommendation}\n              </p>\n            </div>\n          ))}\n        </div>\n\n        <div className=\"grid gap-3 xl:grid-cols-[1fr_1fr]\">\n          <QueueCard\n            icon={<RotateCcw className=\"size-4\" />}\n            title=\"Retry queue\"\n            count={report.retryQueue.length}\n          >\n            {report.retryQueue.slice(0, 6).map((item) => (\n              <EvidenceRow\n                key={item.id}\n                status={item.status}\n                title={`${item.kind} to ${item.recipientEmail}`}\n                detail={`${item.fileName} has ${item.attemptCount} failed attempt${item.attemptCount === 1 ? \"\" : \"s\"}: ${item.lastReason}`}\n              />\n            ))}\n          </QueueCard>\n\n          <QueueCard\n            icon={<MessageSquareText className=\"size-4\" />}\n            title=\"Mention routing\"\n            count={report.mentionRoutes.length}\n          >\n            {report.mentionRoutes.slice(0, 6).map((route) => (\n              <EvidenceRow\n                key={route.id}\n                status={route.status}\n                title={`${route.mentionedEmail} / ${route.deliveryStatus}`}\n                detail={`${route.fileName}: ${route.recommendation}`}\n              />\n            ))}\n          </QueueCard>\n        </div>\n\n        <div className=\"grid gap-3 xl:grid-cols-[1fr_1fr]\">\n          <QueueCard\n            icon={<MailWarning className=\"size-4\" />}\n            title=\"Digest previews\"\n            count={report.digestPreviews.length}\n          >\n            {report.digestPreviews.slice(0, 4).map((preview) => (\n              <EvidenceRow\n                key={preview.id}\n                status={preview.status}\n                title={preview.subject}\n                detail={`${preview.recipientEmail}: ${preview.signalCount} signals`}\n              />\n            ))}\n          </QueueCard>\n\n          <QueueCard\n            icon={<ShieldOff className=\"size-4\" />}\n            title=\"Suppression controls\"\n            count={report.suppressionControls.length}\n          >\n            {report.suppressionControls.slice(0, 6).map((control) => (\n              <EvidenceRow\n                key={control.id}\n                status={control.status}\n                title={control.mutedEmail ?? \"File-level notifications\"}\n                detail={`${control.fileName}: ${control.reason}`}\n              />\n            ))}\n          </QueueCard>\n        </div>\n      </CardContent>\n    </Card>\n  );\n}\n\nfunction QueueCard({\n  children,\n  count,\n  icon,\n  title,\n}: {\n  children: ReactNode;\n  count: number;\n  icon: ReactNode;\n  title: string;\n}) {\n  return (\n    <div className=\"rounded-md border border-border bg-background p-3\">\n      <div className=\"flex items-center justify-between gap-2 text-sm font-medium\">\n        <div className=\"flex items-center gap-2\">\n          {icon}\n          <span>{title}</span>\n        </div>\n        <Badge variant=\"outline\">{count}</Badge>\n      </div>\n      <div className=\"mt-3 grid gap-2\">{children}</div>\n    </div>\n  );\n}\n\nfunction EvidenceRow({\n  detail,\n  status,\n  title,\n}: {\n  detail: string;\n  status: AdminExternalCommentNotificationWorkflowStatus;\n  title: string;\n}) {\n  return (\n    <div className=\"rounded-md border border-border bg-muted/20 p-2 text-xs\">\n      <div className=\"flex flex-wrap items-start justify-between gap-2\">\n        <div className=\"font-medium\">{title}</div>\n        <Badge variant={getStatusVariant(status)}>{status}</Badge>\n      </div>\n      <p className=\"mt-1 text-muted-foreground\">{detail}</p>\n    </div>\n  );\n}\n\nfunction Metric({ label, value }: { label: string; value: number | string }) {\n  return (\n    <div className=\"rounded-md border border-border bg-muted/20 p-2\">\n      <div className=\"text-muted-foreground\">{label}</div>\n      <div className=\"mt-1 font-mono text-sm text-foreground\">{value}</div>\n    </div>\n  );\n}\n\nfunction getStatusVariant(\n  status: AdminExternalCommentNotificationWorkflowStatus,\n) {\n  if (status === \"blocked\") {\n    return \"destructive\";\n  }\n\n  return status === \"review\" ? \"secondary\" : \"outline\";\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/components/admin-external-comment-notification-workflows-panel.tsx",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-components-admin-external-comment-notification-workflows-panel-tsx-45414173b5c85a51.mjs",
  "kind": "tsx",
  "hash": "45414173b5c85a51",
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
      "specifier": "@/features/admin/admin-external-comment-notification-workflows",
      "resolved_path": "src/features/admin/admin-external-comment-notification-workflows.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-external-comment-notification-workflows-ts-87f29566aee9e5d9.mjs",
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
    "source_path": "src/features/admin/components/admin-external-comment-notification-workflows-panel.tsx",
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
        "specifier": "@/features/admin/admin-external-comment-notification-workflows",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/admin/admin-external-comment-notification-workflows",
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
      "AdminExternalCommentNotificationWorkflowsPanel"
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
