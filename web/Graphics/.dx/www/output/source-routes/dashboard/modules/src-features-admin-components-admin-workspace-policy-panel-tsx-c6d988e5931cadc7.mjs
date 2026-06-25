import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-components-ui-alert-tsx-2d34801893b59373.mjs";
import { dxSourceModule as dep1, dxRuntimeExports as dep1Runtime } from "./src-components-ui-badge-tsx-5f9c9bdbd1c68d30.mjs";
import { dxSourceModule as dep2, dxRuntimeExports as dep2Runtime } from "./src-components-ui-button-tsx-a045a54d4568e98d.mjs";
import { dxSourceModule as dep3, dxRuntimeExports as dep3Runtime } from "./src-components-ui-card-tsx-62d56c5e9cb9789f.mjs";
import { dxSourceModule as dep4, dxRuntimeExports as dep4Runtime } from "./src-components-ui-label-tsx-e0903213582531e3.mjs";
import { dxSourceModule as dep5, dxRuntimeExports as dep5Runtime } from "./src-components-ui-number-input-tsx-3171f8b602462d96.mjs";
import { dxSourceModule as dep6, dxRuntimeExports as dep6Runtime } from "./src-components-ui-select-tsx-cb5ef19f5a25e2e4.mjs";
import { dxSourceModule as dep7, dxRuntimeExports as dep7Runtime } from "./src-features-admin-actions-ts-7a34f9e31ee697de.mjs";
import { dxSourceModule as dep8, dxRuntimeExports as dep8Runtime } from "./src-features-admin-workspace-policy-export-ts-fd3e1bc77834564e.mjs";
import { dxSourceModule as dep9, dxRuntimeExports as dep9Runtime } from "./src-lib-forge-icons-lucide-react-tsx-b9b0a8debf22abe8.mjs";
export const dxSourceText = "\"use client\";\n\nimport { useMemo, useState, useTransition } from \"react\";\nimport type { ReactNode } from \"react\";\nimport { useRouter } from \"next/navigation\";\nimport {\n  CheckCircle2,\n  Download,\n  FileJson,\n  FileText,\n  ShieldAlert,\n} from \"lucide-react\";\nimport { Alert, AlertDescription } from \"@/components/ui/alert\";\nimport { Badge } from \"@/components/ui/badge\";\nimport { Button } from \"@/components/ui/button\";\nimport {\n  Card,\n  CardContent,\n  CardDescription,\n  CardHeader,\n  CardTitle,\n} from \"@/components/ui/card\";\nimport { Label } from \"@/components/ui/label\";\nimport { NumberInput } from \"@/components/ui/number-input\";\nimport {\n  Select,\n  SelectContent,\n  SelectItem,\n  SelectTrigger,\n  SelectValue,\n} from \"@/components/ui/select\";\nimport { updateAdminWorkspacePolicy } from \"@/features/admin/actions\";\nimport {\n  createWorkspacePolicyCsv,\n  createWorkspacePolicyJson,\n  createWorkspacePolicyMarkdown,\n} from \"@/features/admin/workspace-policy-export\";\nimport type {\n  WorkspacePolicyInviteMode,\n  WorkspacePolicyReviewReport,\n  WorkspacePolicySessionMode,\n  WorkspacePolicySettings,\n} from \"@/features/admin/workspace-policy\";\nimport type { CollaboratorRole } from \"@/features/files/permissions\";\n\ntype AdminWorkspacePolicyPanelProps = {\n  report: WorkspacePolicyReviewReport;\n};\n\nconst booleanOptions = [\n  { value: \"true\", label: \"Allow\" },\n  { value: \"false\", label: \"Block\" },\n] as const;\n\nconst inviteModeOptions: Array<{\n  value: WorkspacePolicyInviteMode;\n  label: string;\n}> = [\n  { value: \"any-existing-user\", label: \"Any registered user\" },\n  { value: \"same-domain-only\", label: \"Same email domain\" },\n  { value: \"admins-only\", label: \"Administrators only\" },\n];\n\nconst roleOptions: Array<{ value: CollaboratorRole; label: string }> = [\n  { value: \"viewer\", label: \"Can view\" },\n  { value: \"commenter\", label: \"Can comment\" },\n  { value: \"editor\", label: \"Can edit\" },\n];\n\nconst sessionModeOptions: Array<{\n  value: WorkspacePolicySessionMode;\n  label: string;\n}> = [\n  { value: \"monitor\", label: \"Monitor only\" },\n  { value: \"review-stale\", label: \"Review stale sessions\" },\n  { value: \"revoke-expired\", label: \"Revoke expired sessions\" },\n];\n\nexport function AdminWorkspacePolicyPanel({\n  report,\n}: AdminWorkspacePolicyPanelProps) {\n  const router = useRouter();\n  const [settings, setSettings] = useState(report.settings);\n  const [message, setMessage] = useState<string | null>(null);\n  const [error, setError] = useState<string | null>(null);\n  const [isPending, startTransition] = useTransition();\n  const savedAtLabel = useMemo(\n    () =>\n      report.settings.updatedAt\n        ? new Intl.DateTimeFormat(undefined, {\n            dateStyle: \"medium\",\n            timeStyle: \"short\",\n          }).format(new Date(report.settings.updatedAt))\n        : \"Not saved yet\",\n    [report.settings.updatedAt],\n  );\n\n  function updateSetting<Key extends keyof WorkspacePolicySettings>(\n    key: Key,\n    value: WorkspacePolicySettings[Key],\n  ) {\n    setSettings((current) => ({ ...current, [key]: value }));\n  }\n\n  function savePolicy() {\n    setMessage(null);\n    setError(null);\n    startTransition(async () => {\n      try {\n        await updateAdminWorkspacePolicy({\n          defaultShareExpiryDays: settings.defaultShareExpiryDays,\n          allowPublicDownloads: settings.allowPublicDownloads,\n          allowPublicComments: settings.allowPublicComments,\n          inviteMode: settings.inviteMode,\n          maxInviteRole: settings.maxInviteRole,\n          sessionMode: settings.sessionMode,\n          staleSessionDays: settings.staleSessionDays,\n        });\n        setMessage(\"Workspace policy saved and applied to new shares and invites.\");\n        router.refresh();\n      } catch (saveError) {\n        setError(\n          saveError instanceof Error\n            ? saveError.message\n            : \"Workspace policy could not be saved.\",\n        );\n      }\n    });\n  }\n\n  return (\n    <div className=\"grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]\">\n      <div className=\"space-y-4\">\n        {message ? (\n          <Alert>\n            <CheckCircle2 className=\"size-4\" />\n            <AlertDescription>{message}</AlertDescription>\n          </Alert>\n        ) : null}\n\n        {error ? (\n          <Alert variant=\"destructive\">\n            <ShieldAlert className=\"size-4\" />\n            <AlertDescription>{error}</AlertDescription>\n          </Alert>\n        ) : null}\n\n        <Card>\n          <CardHeader className=\"gap-3 md:flex-row md:items-start md:justify-between\">\n            <div>\n              <CardTitle>Workspace policy controls</CardTitle>\n              <CardDescription>\n                Defaults for public links, collaborator invites, and session review.\n              </CardDescription>\n            </div>\n            <Badge variant={getStatusVariant(report.status)}>\n              {report.score}/100 {report.status}\n            </Badge>\n          </CardHeader>\n          <CardContent className=\"grid gap-4 md:grid-cols-2\">\n            <PolicyField\n              label=\"Default share expiry\"\n              detail=\"Use 0 when links should stay live until manually revoked.\"\n            >\n              <NumberInput\n                value={settings.defaultShareExpiryDays}\n                min={0}\n                max={365}\n                step={1}\n                onChange={(value) =>\n                  updateSetting(\"defaultShareExpiryDays\", value)\n                }\n                aria-label=\"Default share expiry in days\"\n              />\n            </PolicyField>\n\n            <PolicyField\n              label=\"Public downloads\"\n              detail=\"Controls whether new handoff links can expose downloadable assets.\"\n            >\n              <BooleanSelect\n                value={settings.allowPublicDownloads}\n                onValueChange={(value) =>\n                  updateSetting(\"allowPublicDownloads\", value)\n                }\n              />\n            </PolicyField>\n\n            <PolicyField\n              label=\"Public comments\"\n              detail=\"Controls whether new review links can collect comments.\"\n            >\n              <BooleanSelect\n                value={settings.allowPublicComments}\n                onValueChange={(value) =>\n                  updateSetting(\"allowPublicComments\", value)\n                }\n              />\n            </PolicyField>\n\n            <PolicyField\n              label=\"Invite restriction\"\n              detail=\"Limits who file owners can invite to private files.\"\n            >\n              <Select\n                value={settings.inviteMode}\n                onValueChange={(value) =>\n                  updateSetting(\n                    \"inviteMode\",\n                    value as WorkspacePolicyInviteMode,\n                  )\n                }\n              >\n                <SelectTrigger className=\"w-full\">\n                  <SelectValue />\n                </SelectTrigger>\n                <SelectContent>\n                  {inviteModeOptions.map((option) => (\n                    <SelectItem key={option.value} value={option.value}>\n                      {option.label}\n                    </SelectItem>\n                  ))}\n                </SelectContent>\n              </Select>\n            </PolicyField>\n\n            <PolicyField\n              label=\"Maximum invite role\"\n              detail=\"Prevents file owners from granting stronger roles than approved.\"\n            >\n              <Select\n                value={settings.maxInviteRole}\n                onValueChange={(value) =>\n                  updateSetting(\"maxInviteRole\", value as CollaboratorRole)\n                }\n              >\n                <SelectTrigger className=\"w-full\">\n                  <SelectValue />\n                </SelectTrigger>\n                <SelectContent>\n                  {roleOptions.map((option) => (\n                    <SelectItem key={option.value} value={option.value}>\n                      {option.label}\n                    </SelectItem>\n                  ))}\n                </SelectContent>\n              </Select>\n            </PolicyField>\n\n            <PolicyField\n              label=\"Session hygiene\"\n              detail=\"Sets the expected admin posture for stale and expired sessions.\"\n            >\n              <Select\n                value={settings.sessionMode}\n                onValueChange={(value) =>\n                  updateSetting(\n                    \"sessionMode\",\n                    value as WorkspacePolicySessionMode,\n                  )\n                }\n              >\n                <SelectTrigger className=\"w-full\">\n                  <SelectValue />\n                </SelectTrigger>\n                <SelectContent>\n                  {sessionModeOptions.map((option) => (\n                    <SelectItem key={option.value} value={option.value}>\n                      {option.label}\n                    </SelectItem>\n                  ))}\n                </SelectContent>\n              </Select>\n            </PolicyField>\n\n            <PolicyField\n              label=\"Stale session age\"\n              detail=\"Sessions older than this review window are flagged.\"\n            >\n              <NumberInput\n                value={settings.staleSessionDays}\n                min={1}\n                max={365}\n                step={1}\n                onChange={(value) => updateSetting(\"staleSessionDays\", value)}\n                aria-label=\"Stale session age in days\"\n              />\n            </PolicyField>\n\n            <div className=\"flex flex-col justify-end gap-2 md:items-end\">\n              <div className=\"text-xs text-muted-foreground\">\n                Last saved by {report.settings.updatedBy ?? \"workspace default\"} ·{\" \"}\n                {savedAtLabel}\n              </div>\n              <Button type=\"button\" onClick={savePolicy} disabled={isPending}>\n                {isPending ? \"Saving...\" : \"Save policy\"}\n              </Button>\n            </div>\n          </CardContent>\n        </Card>\n\n        <Card>\n          <CardHeader>\n            <CardTitle>Policy review</CardTitle>\n            <CardDescription>\n              Current workspace exposure compared with the saved policy.\n            </CardDescription>\n          </CardHeader>\n          <CardContent className=\"grid gap-3 md:grid-cols-2\">\n            {report.findings.map((finding) => (\n              <div\n                key={finding.id}\n                className=\"rounded-md border border-border bg-muted/30 p-3\"\n              >\n                <div className=\"flex items-center justify-between gap-3\">\n                  <div className=\"font-medium\">{finding.label}</div>\n                  <Badge variant={getStatusVariant(finding.status)}>\n                    {finding.status}\n                  </Badge>\n                </div>\n                <div className=\"mt-1 text-sm text-muted-foreground\">\n                  {finding.value}\n                </div>\n                <p className=\"mt-2 text-xs leading-5 text-muted-foreground\">\n                  {finding.detail}\n                </p>\n              </div>\n            ))}\n          </CardContent>\n        </Card>\n      </div>\n\n      <Card className=\"self-start\">\n        <CardHeader>\n          <CardTitle>Governance export</CardTitle>\n          <CardDescription>\n            Capture the current policy, findings, and review counts for support.\n          </CardDescription>\n        </CardHeader>\n        <CardContent className=\"grid gap-3\">\n          <MetricRow label=\"Active shares\" value={report.activeShareCount} />\n          <MetricRow label=\"Download links\" value={report.downloadShareCount} />\n          <MetricRow label=\"Comment links\" value={report.commentShareCount} />\n          <MetricRow label=\"Expired links\" value={report.expiredShareCount} />\n          <MetricRow label=\"Stale sessions\" value={report.staleSessionCount} />\n          <MetricRow label=\"Expired sessions\" value={report.expiredSessionCount} />\n          <div className=\"grid gap-2 pt-2\">\n            <Button\n              type=\"button\"\n              variant=\"outline\"\n              onClick={() =>\n                downloadText(\n                  \"essence-workspace-policy.json\",\n                  createWorkspacePolicyJson(report),\n                  \"application/json;charset=utf-8\",\n                )\n              }\n            >\n              <FileJson className=\"size-4\" />\n              Export JSON\n            </Button>\n            <Button\n              type=\"button\"\n              variant=\"outline\"\n              onClick={() =>\n                downloadText(\n                  \"essence-workspace-policy.csv\",\n                  createWorkspacePolicyCsv(report),\n                  \"text/csv;charset=utf-8\",\n                )\n              }\n            >\n              <Download className=\"size-4\" />\n              Export CSV\n            </Button>\n            <Button\n              type=\"button\"\n              variant=\"outline\"\n              onClick={() =>\n                downloadText(\n                  \"essence-workspace-policy.md\",\n                  createWorkspacePolicyMarkdown(report),\n                  \"text/markdown;charset=utf-8\",\n                )\n              }\n            >\n              <FileText className=\"size-4\" />\n              Export Markdown\n            </Button>\n          </div>\n        </CardContent>\n      </Card>\n    </div>\n  );\n}\n\nfunction PolicyField({\n  children,\n  detail,\n  label,\n}: {\n  children: ReactNode;\n  detail: string;\n  label: string;\n}) {\n  return (\n    <div className=\"grid gap-2 rounded-md border border-border bg-muted/20 p-3\">\n      <Label>{label}</Label>\n      <p className=\"text-xs leading-5 text-muted-foreground\">{detail}</p>\n      {children}\n    </div>\n  );\n}\n\nfunction BooleanSelect({\n  onValueChange,\n  value,\n}: {\n  onValueChange: (value: boolean) => void;\n  value: boolean;\n}) {\n  return (\n    <Select\n      value={String(value)}\n      onValueChange={(nextValue) => onValueChange(nextValue === \"true\")}\n    >\n      <SelectTrigger className=\"w-full\">\n        <SelectValue />\n      </SelectTrigger>\n      <SelectContent>\n        {booleanOptions.map((option) => (\n          <SelectItem key={option.value} value={option.value}>\n            {option.label}\n          </SelectItem>\n        ))}\n      </SelectContent>\n    </Select>\n  );\n}\n\nfunction MetricRow({ label, value }: { label: string; value: number }) {\n  return (\n    <div className=\"flex items-center justify-between gap-3 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm\">\n      <span className=\"text-muted-foreground\">{label}</span>\n      <span className=\"font-mono font-medium\">{value}</span>\n    </div>\n  );\n}\n\nfunction getStatusVariant(status: WorkspacePolicyReviewReport[\"status\"]) {\n  if (status === \"blocked\") {\n    return \"destructive\";\n  }\n\n  return status === \"ready\" ? \"secondary\" : \"outline\";\n}\n\nfunction downloadText(fileName: string, content: string, type: string) {\n  const blob = new Blob([content], { type });\n  const url = URL.createObjectURL(blob);\n  const link = document.createElement(\"a\");\n\n  link.href = url;\n  link.download = fileName;\n  link.click();\n  URL.revokeObjectURL(url);\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/components/admin-workspace-policy-panel.tsx",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-components-admin-workspace-policy-panel-tsx-c6d988e5931cadc7.mjs",
  "kind": "tsx",
  "hash": "c6d988e5931cadc7",
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
      "specifier": "@/features/admin/workspace-policy-export",
      "resolved_path": "src/features/admin/workspace-policy-export.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-workspace-policy-export-ts-fd3e1bc77834564e.mjs",
      "kind": "ts",
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
    "source_path": "src/features/admin/components/admin-workspace-policy-panel.tsx",
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
        "specifier": "react",
        "side_effect_only": false,
        "type_only": true
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
        "specifier": "@/features/admin/workspace-policy-export",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/admin/workspace-policy",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/files/permissions",
        "side_effect_only": false,
        "type_only": true
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
      "AdminWorkspacePolicyPanel"
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
export const dxLinkedDependencies = Object.freeze([dep0, dep1, dep2, dep3, dep4, dep5, dep6, dep7, dep8, dep9]);
export default dxSourceModule;
