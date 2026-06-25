import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-components-ui-alert-tsx-2d34801893b59373.mjs";
import { dxSourceModule as dep1, dxRuntimeExports as dep1Runtime } from "./src-components-ui-badge-tsx-5f9c9bdbd1c68d30.mjs";
import { dxSourceModule as dep2, dxRuntimeExports as dep2Runtime } from "./src-components-ui-button-tsx-a045a54d4568e98d.mjs";
import { dxSourceModule as dep3, dxRuntimeExports as dep3Runtime } from "./src-components-ui-card-tsx-62d56c5e9cb9789f.mjs";
import { dxSourceModule as dep4, dxRuntimeExports as dep4Runtime } from "./src-components-ui-label-tsx-e0903213582531e3.mjs";
import { dxSourceModule as dep5, dxRuntimeExports as dep5Runtime } from "./src-components-ui-number-input-tsx-3171f8b602462d96.mjs";
import { dxSourceModule as dep6, dxRuntimeExports as dep6Runtime } from "./src-components-ui-select-tsx-cb5ef19f5a25e2e4.mjs";
import { dxSourceModule as dep7, dxRuntimeExports as dep7Runtime } from "./src-features-admin-actions-ts-7a34f9e31ee697de.mjs";
import { dxSourceModule as dep8, dxRuntimeExports as dep8Runtime } from "./src-features-admin-admin-retention-privacy-ts-ba9ee2978fb1a8ec.mjs";
import { dxSourceModule as dep9, dxRuntimeExports as dep9Runtime } from "./src-features-admin-admin-retention-privacy-export-ts-ef90e0f4e6be7dda.mjs";
import { dxSourceModule as dep10, dxRuntimeExports as dep10Runtime } from "./src-features-editor-components-library-release-panel-shared-tsx-185476f4669a07c8.mjs";
import { dxSourceModule as dep11, dxRuntimeExports as dep11Runtime } from "./src-lib-forge-icons-lucide-react-tsx-b9b0a8debf22abe8.mjs";
export const dxSourceText = "\"use client\";\n\nimport { useMemo, useState, useTransition, type ReactNode } from \"react\";\nimport { useRouter } from \"next/navigation\";\nimport {\n  CheckCircle2,\n  ClipboardCopy,\n  Download,\n  FileJson2,\n  ShieldAlert,\n  ShieldCheck,\n} from \"lucide-react\";\nimport { Alert, AlertDescription } from \"@/components/ui/alert\";\nimport { Badge } from \"@/components/ui/badge\";\nimport { Button } from \"@/components/ui/button\";\nimport {\n  Card,\n  CardContent,\n  CardDescription,\n  CardHeader,\n  CardTitle,\n} from \"@/components/ui/card\";\nimport { Label } from \"@/components/ui/label\";\nimport { NumberInput } from \"@/components/ui/number-input\";\nimport {\n  Select,\n  SelectContent,\n  SelectItem,\n  SelectTrigger,\n  SelectValue,\n} from \"@/components/ui/select\";\nimport { updateAdminRetentionPrivacy } from \"@/features/admin/actions\";\nimport type {\n  RetentionPrivacyMode,\n  RetentionPrivacyReport,\n  RetentionPrivacySettings,\n  RetentionPrivacyStatus,\n} from \"@/features/admin/admin-retention-privacy\";\nimport { retentionPrivacyModes } from \"@/features/admin/admin-retention-privacy\";\nimport {\n  getRetentionPrivacyCsv,\n  getRetentionPrivacyJson,\n  getRetentionPrivacyMarkdown,\n} from \"@/features/admin/admin-retention-privacy-export\";\nimport { downloadTextFile } from \"@/features/editor/components/library-release-panel-shared\";\n\ntype AdminRetentionPrivacyPanelProps = {\n  report: RetentionPrivacyReport;\n};\n\nexport function AdminRetentionPrivacyPanel({\n  report,\n}: AdminRetentionPrivacyPanelProps) {\n  const router = useRouter();\n  const [settings, setSettings] = useState(report.settings);\n  const [message, setMessage] = useState<string | null>(null);\n  const [error, setError] = useState<string | null>(null);\n  const [isPending, startTransition] = useTransition();\n  const rows = useMemo(\n    () =>\n      report.rows\n        .filter((row) => row.status !== \"ready\")\n        .concat(report.rows.filter((row) => row.status === \"ready\")),\n    [report.rows],\n  );\n  const savedAtLabel = report.settings.updatedAt\n    ? new Intl.DateTimeFormat(undefined, {\n        dateStyle: \"medium\",\n        timeStyle: \"short\",\n      }).format(new Date(report.settings.updatedAt))\n    : \"Not saved yet\";\n\n  function updateSetting<Key extends keyof RetentionPrivacySettings>(\n    key: Key,\n    value: RetentionPrivacySettings[Key],\n  ) {\n    setSettings((current) => ({ ...current, [key]: value }));\n  }\n\n  function savePolicy() {\n    setMessage(null);\n    setError(null);\n    startTransition(async () => {\n      try {\n        await updateAdminRetentionPrivacy({\n          auditLogRetentionDays: settings.auditLogRetentionDays,\n          collaborationPresenceRetentionDays:\n            settings.collaborationPresenceRetentionDays,\n          notificationDeliveryRetentionDays:\n            settings.notificationDeliveryRetentionDays,\n          supportBundleRetentionDays: settings.supportBundleRetentionDays,\n          supportBundlePrivacyMode: settings.supportBundlePrivacyMode,\n          includeSupportBundleNetworkDetails:\n            settings.includeSupportBundleNetworkDetails,\n          includeSupportBundleNotificationReasons:\n            settings.includeSupportBundleNotificationReasons,\n          includeSupportBundleAuditMetadata:\n            settings.includeSupportBundleAuditMetadata,\n        });\n        setMessage(\"Retention and privacy controls saved.\");\n        router.refresh();\n      } catch (saveError) {\n        setError(\n          saveError instanceof Error\n            ? saveError.message\n            : \"Retention and privacy controls could not be saved.\",\n        );\n      }\n    });\n  }\n\n  function exportJson() {\n    downloadTextFile({\n      content: getRetentionPrivacyJson(report),\n      filename: \"retention-privacy-controls.json\",\n      type: \"application/json;charset=utf-8\",\n    });\n  }\n\n  function exportCsv() {\n    downloadTextFile({\n      content: getRetentionPrivacyCsv(report),\n      filename: \"retention-privacy-controls.csv\",\n      type: \"text/csv;charset=utf-8\",\n    });\n  }\n\n  function exportMarkdown() {\n    downloadTextFile({\n      content: getRetentionPrivacyMarkdown(report),\n      filename: \"retention-privacy-controls.md\",\n      type: \"text/markdown;charset=utf-8\",\n    });\n  }\n\n  function copyMarkdown() {\n    void navigator.clipboard.writeText(getRetentionPrivacyMarkdown(report));\n  }\n\n  return (\n    <Card>\n      <CardHeader className=\"gap-3 md:flex-row md:items-start md:justify-between\">\n        <div>\n          <CardTitle className=\"flex items-center gap-2\">\n            <ShieldCheck className=\"size-4\" />\n            Retention and privacy controls\n          </CardTitle>\n          <CardDescription>\n            Audit logs, collaboration presence, notification delivery records,\n            and support bundle redaction policy.\n          </CardDescription>\n        </div>\n        <Badge variant={getStatusVariant(report.status)}>\n          {report.status} {report.score}\n        </Badge>\n      </CardHeader>\n      <CardContent className=\"grid gap-4\">\n        {message ? (\n          <Alert>\n            <CheckCircle2 className=\"size-4\" />\n            <AlertDescription>{message}</AlertDescription>\n          </Alert>\n        ) : null}\n\n        {error ? (\n          <Alert variant=\"destructive\">\n            <ShieldAlert className=\"size-4\" />\n            <AlertDescription>{error}</AlertDescription>\n          </Alert>\n        ) : null}\n\n        <div className=\"grid gap-2 text-xs md:grid-cols-3 xl:grid-cols-6\">\n          <Metric label=\"Audit\" value={report.auditEventsEligibleForCleanup} />\n          <Metric\n            label=\"Presence\"\n            value={report.collaborationRecordsEligibleForCleanup}\n          />\n          <Metric\n            label=\"Email rows\"\n            value={report.notificationDeliveriesEligibleForCleanup}\n          />\n          <Metric\n            label=\"Sensitive sessions\"\n            value={report.supportBundleSensitiveSessionCount}\n          />\n          <Metric\n            label=\"Sensitive audit\"\n            value={report.supportBundleSensitiveAuditMetadataCount}\n          />\n          <Metric label=\"Saved\" value={savedAtLabel} />\n        </div>\n\n        <div className=\"grid gap-4 lg:grid-cols-2\">\n          <Field label=\"Audit logs\" detail=\"Loaded audit events older than this window are marked for cleanup review.\">\n            <NumberInput\n              value={settings.auditLogRetentionDays}\n              min={7}\n              max={730}\n              step={1}\n              onChange={(value) =>\n                updateSetting(\"auditLogRetentionDays\", value)\n              }\n              aria-label=\"Audit log retention days\"\n            />\n          </Field>\n\n          <Field label=\"Collaboration presence\" detail=\"Durable room chat and presence records older than this window are marked for cleanup.\">\n            <NumberInput\n              value={settings.collaborationPresenceRetentionDays}\n              min={1}\n              max={365}\n              step={1}\n              onChange={(value) =>\n                updateSetting(\"collaborationPresenceRetentionDays\", value)\n              }\n              aria-label=\"Collaboration presence retention days\"\n            />\n          </Field>\n\n          <Field label=\"Notification delivery\" detail=\"Comment email delivery evidence older than this window is marked for cleanup.\">\n            <NumberInput\n              value={settings.notificationDeliveryRetentionDays}\n              min={7}\n              max={365}\n              step={1}\n              onChange={(value) =>\n                updateSetting(\"notificationDeliveryRetentionDays\", value)\n              }\n              aria-label=\"Notification delivery retention days\"\n            />\n          </Field>\n\n          <Field label=\"Support bundle lifetime\" detail=\"Maximum intended lifetime for generated support bundle artifacts.\">\n            <NumberInput\n              value={settings.supportBundleRetentionDays}\n              min={1}\n              max={90}\n              step={1}\n              onChange={(value) =>\n                updateSetting(\"supportBundleRetentionDays\", value)\n              }\n              aria-label=\"Support bundle retention days\"\n            />\n          </Field>\n\n          <Field label=\"Bundle privacy mode\" detail=\"Diagnostic keeps direct evidence; redacted masks identities; minimal strips extra context.\">\n            <Select\n              value={settings.supportBundlePrivacyMode}\n              onValueChange={(value) =>\n                updateSetting(\n                  \"supportBundlePrivacyMode\",\n                  value as RetentionPrivacyMode,\n                )\n              }\n            >\n              <SelectTrigger className=\"w-full\">\n                <SelectValue />\n              </SelectTrigger>\n              <SelectContent>\n                {retentionPrivacyModes.map((mode) => (\n                  <SelectItem key={mode} value={mode}>\n                    {formatOption(mode)}\n                  </SelectItem>\n                ))}\n              </SelectContent>\n            </Select>\n          </Field>\n\n          <Field label=\"Support bundle fields\" detail=\"Control sensitive details included in generated support exports.\">\n            <div className=\"grid gap-2 sm:grid-cols-3\">\n              <BooleanButton\n                active={settings.includeSupportBundleNetworkDetails}\n                label=\"Network\"\n                onClick={() =>\n                  updateSetting(\n                    \"includeSupportBundleNetworkDetails\",\n                    !settings.includeSupportBundleNetworkDetails,\n                  )\n                }\n              />\n              <BooleanButton\n                active={settings.includeSupportBundleNotificationReasons}\n                label=\"Reasons\"\n                onClick={() =>\n                  updateSetting(\n                    \"includeSupportBundleNotificationReasons\",\n                    !settings.includeSupportBundleNotificationReasons,\n                  )\n                }\n              />\n              <BooleanButton\n                active={settings.includeSupportBundleAuditMetadata}\n                label=\"Metadata\"\n                onClick={() =>\n                  updateSetting(\n                    \"includeSupportBundleAuditMetadata\",\n                    !settings.includeSupportBundleAuditMetadata,\n                  )\n                }\n              />\n            </div>\n          </Field>\n        </div>\n\n        <div className=\"grid gap-2 lg:grid-cols-2\">\n          {rows.map((row) => (\n            <div\n              key={row.id}\n              className=\"rounded-md border border-border bg-muted/20 p-3 text-sm\"\n            >\n              <div className=\"flex items-start justify-between gap-3\">\n                <div className=\"min-w-0\">\n                  <div className=\"truncate font-medium\">{row.label}</div>\n                  <div className=\"mt-1 flex flex-wrap gap-1\">\n                    <Badge variant=\"outline\">{row.kind}</Badge>\n                    <Badge variant={getStatusVariant(row.status)}>\n                      {row.status}\n                    </Badge>\n                    <Badge variant=\"outline\">\n                      {row.eligibleForCleanupCount} cleanup\n                    </Badge>\n                  </div>\n                </div>\n                <Badge variant=\"outline\">{row.value}</Badge>\n              </div>\n              <p className=\"mt-2 text-xs text-muted-foreground\">{row.detail}</p>\n              <p className=\"mt-2 text-xs\">{row.recommendation}</p>\n            </div>\n          ))}\n        </div>\n\n        <div className=\"grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center\">\n          <Badge variant=\"outline\">\n            {report.settings.updatedBy ?? \"Defaults\"} / {savedAtLabel}\n          </Badge>\n          <div className=\"grid grid-cols-5 gap-2\">\n            <Button type=\"button\" onClick={savePolicy} disabled={isPending}>\n              {isPending ? \"Saving...\" : \"Save\"}\n            </Button>\n            <Button type=\"button\" size=\"sm\" variant=\"outline\" onClick={exportJson}>\n              <FileJson2 className=\"size-3.5\" />\n              JSON\n            </Button>\n            <Button type=\"button\" size=\"sm\" variant=\"outline\" onClick={exportCsv}>\n              <Download className=\"size-3.5\" />\n              CSV\n            </Button>\n            <Button\n              type=\"button\"\n              size=\"sm\"\n              variant=\"outline\"\n              onClick={exportMarkdown}\n            >\n              <Download className=\"size-3.5\" />\n              MD\n            </Button>\n            <Button\n              type=\"button\"\n              size=\"sm\"\n              variant=\"outline\"\n              onClick={copyMarkdown}\n            >\n              <ClipboardCopy className=\"size-3.5\" />\n              Copy\n            </Button>\n          </div>\n        </div>\n      </CardContent>\n    </Card>\n  );\n}\n\nfunction Field({\n  children,\n  detail,\n  label,\n}: {\n  children: ReactNode;\n  detail: string;\n  label: string;\n}) {\n  return (\n    <div className=\"rounded-md border border-border bg-muted/20 p-3\">\n      <Label>{label}</Label>\n      <p className=\"mt-1 text-xs text-muted-foreground\">{detail}</p>\n      <div className=\"mt-3\">{children}</div>\n    </div>\n  );\n}\n\nfunction BooleanButton({\n  active,\n  label,\n  onClick,\n}: {\n  active: boolean;\n  label: string;\n  onClick: () => void;\n}) {\n  return (\n    <Button\n      type=\"button\"\n      size=\"sm\"\n      variant={active ? \"secondary\" : \"outline\"}\n      aria-pressed={active}\n      onClick={onClick}\n      className=\"justify-start\"\n    >\n      {active ? <CheckCircle2 className=\"size-3.5\" /> : null}\n      {label}\n    </Button>\n  );\n}\n\nfunction Metric({ label, value }: { label: string; value: number | string }) {\n  return (\n    <div className=\"rounded-md border border-border bg-muted/20 p-2\">\n      <div className=\"text-muted-foreground\">{label}</div>\n      <div className=\"mt-1 truncate font-mono text-sm text-foreground\">\n        {value}\n      </div>\n    </div>\n  );\n}\n\nfunction getStatusVariant(status: RetentionPrivacyStatus) {\n  if (status === \"blocked\") {\n    return \"destructive\";\n  }\n\n  return status === \"review\" ? \"secondary\" : \"outline\";\n}\n\nfunction formatOption(value: string) {\n  return value.charAt(0).toUpperCase() + value.slice(1);\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/components/admin-retention-privacy-panel.tsx",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-components-admin-retention-privacy-panel-tsx-7c3bbc08376598f3.mjs",
  "kind": "tsx",
  "hash": "7c3bbc08376598f3",
  "dependencies": [
    {
      "specifier": "@/components/ui/alert",
      "resolved_path": "src/components/ui/alert.tsx",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-components-ui-alert-tsx-2d34801893b59373.mjs",
      "kind": "tsx",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
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
      "specifier": "@/components/ui/label",
      "resolved_path": "src/components/ui/label.tsx",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-components-ui-label-tsx-e0903213582531e3.mjs",
      "kind": "tsx",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/components/ui/number-input",
      "resolved_path": "src/components/ui/number-input.tsx",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-components-ui-number-input-tsx-3171f8b602462d96.mjs",
      "kind": "tsx",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/components/ui/select",
      "resolved_path": "src/components/ui/select.tsx",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-components-ui-select-tsx-cb5ef19f5a25e2e4.mjs",
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
      "specifier": "@/features/admin/admin-retention-privacy",
      "resolved_path": "src/features/admin/admin-retention-privacy.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-retention-privacy-ts-ba9ee2978fb1a8ec.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/admin/admin-retention-privacy-export",
      "resolved_path": "src/features/admin/admin-retention-privacy-export.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-retention-privacy-export-ts-ef90e0f4e6be7dda.mjs",
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
    "source_path": "src/features/admin/components/admin-retention-privacy-panel.tsx",
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
        "specifier": "@/components/ui/alert",
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
        "specifier": "@/components/ui/label",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/components/ui/number-input",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/components/ui/select",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/admin/actions",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/admin/admin-retention-privacy",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/admin/admin-retention-privacy",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/admin/admin-retention-privacy-export",
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
      "AdminRetentionPrivacyPanel"
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
export const dxLinkedDependencies = Object.freeze([dep0, dep1, dep2, dep3, dep4, dep5, dep6, dep7, dep8, dep9, dep10, dep11]);
export default dxSourceModule;
