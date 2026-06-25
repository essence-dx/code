import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-components-ui-badge-tsx-5f9c9bdbd1c68d30.mjs";
import { dxSourceModule as dep1, dxRuntimeExports as dep1Runtime } from "./src-components-ui-button-tsx-a045a54d4568e98d.mjs";
import { dxSourceModule as dep2, dxRuntimeExports as dep2Runtime } from "./src-components-ui-card-tsx-62d56c5e9cb9789f.mjs";
import { dxSourceModule as dep3, dxRuntimeExports as dep3Runtime } from "./src-components-ui-select-tsx-cb5ef19f5a25e2e4.mjs";
import { dxSourceModule as dep4, dxRuntimeExports as dep4Runtime } from "./src-features-admin-admin-support-bundle-ts-2a29f1c66a1cb4bf.mjs";
import { dxSourceModule as dep5, dxRuntimeExports as dep5Runtime } from "./src-features-admin-admin-support-bundle-export-ts-3bfd84759f23cb09.mjs";
import { dxSourceModule as dep6, dxRuntimeExports as dep6Runtime } from "./src-features-editor-components-library-release-panel-shared-tsx-185476f4669a07c8.mjs";
import { dxSourceModule as dep7, dxRuntimeExports as dep7Runtime } from "./src-lib-forge-icons-lucide-react-tsx-b9b0a8debf22abe8.mjs";
export const dxSourceText = "\"use client\";\n\nimport { useMemo, useState } from \"react\";\nimport type { ReactNode } from \"react\";\nimport {\n  ClipboardCopy,\n  Download,\n  FileArchive,\n  FileJson2,\n  LifeBuoy,\n} from \"lucide-react\";\nimport { Badge } from \"@/components/ui/badge\";\nimport { Button } from \"@/components/ui/button\";\nimport {\n  Card,\n  CardContent,\n  CardDescription,\n  CardHeader,\n  CardTitle,\n} from \"@/components/ui/card\";\nimport {\n  Select,\n  SelectContent,\n  SelectItem,\n  SelectTrigger,\n  SelectValue,\n} from \"@/components/ui/select\";\nimport {\n  adminSupportBundleScopes,\n  createAdminSupportBundleFromDashboard,\n  type AdminSupportBundleScope,\n} from \"@/features/admin/admin-support-bundle\";\nimport {\n  getAdminSupportBundleCsv,\n  getAdminSupportBundleJson,\n  getAdminSupportBundleMarkdown,\n} from \"@/features/admin/admin-support-bundle-export\";\nimport type { AdminDashboardData } from \"@/features/admin/admin-data\";\nimport { downloadTextFile } from \"@/features/editor/components/library-release-panel-shared\";\n\ntype AdminSupportBundlePanelProps = {\n  data: AdminDashboardData;\n};\n\nconst scopeLabels: Record<AdminSupportBundleScope, string> = {\n  workspace: \"Workspace\",\n  user: \"Selected user\",\n  file: \"Selected file\",\n  share: \"Selected share\",\n};\n\nexport function AdminSupportBundlePanel({\n  data,\n}: AdminSupportBundlePanelProps) {\n  const [scope, setScope] =\n    useState<AdminSupportBundleScope>(\"workspace\");\n  const [selectedUserId, setSelectedUserId] = useState(\n    data.users[0]?.id ?? \"none\",\n  );\n  const [selectedFileId, setSelectedFileId] = useState(\n    data.files[0]?.id ?? \"none\",\n  );\n  const [selectedShareId, setSelectedShareId] = useState(\n    data.shares[0]?.id ?? \"none\",\n  );\n  const bundle = useMemo(\n    () =>\n      createAdminSupportBundleFromDashboard({\n        data,\n        scope,\n        selectedFileId: selectedFileId === \"none\" ? undefined : selectedFileId,\n        selectedShareId:\n          selectedShareId === \"none\" ? undefined : selectedShareId,\n        selectedUserId: selectedUserId === \"none\" ? undefined : selectedUserId,\n      }),\n    [data, scope, selectedFileId, selectedShareId, selectedUserId],\n  );\n  const sortedFindings = bundle.findings\n    .filter((finding) => finding.status !== \"ready\")\n    .concat(bundle.findings.filter((finding) => finding.status === \"ready\"));\n\n  function exportJson() {\n    downloadTextFile({\n      content: getAdminSupportBundleJson(bundle),\n      filename: getBundleFilename(bundle.target.label, \"json\"),\n      type: \"application/json;charset=utf-8\",\n    });\n  }\n\n  function exportCsv() {\n    downloadTextFile({\n      content: getAdminSupportBundleCsv(bundle),\n      filename: getBundleFilename(bundle.target.label, \"csv\"),\n      type: \"text/csv;charset=utf-8\",\n    });\n  }\n\n  function exportMarkdown() {\n    downloadTextFile({\n      content: getAdminSupportBundleMarkdown(bundle),\n      filename: getBundleFilename(bundle.target.label, \"md\"),\n      type: \"text/markdown;charset=utf-8\",\n    });\n  }\n\n  function copyMarkdown() {\n    void navigator.clipboard.writeText(getAdminSupportBundleMarkdown(bundle));\n  }\n\n  return (\n    <Card>\n      <CardHeader className=\"gap-3 md:flex-row md:items-start md:justify-between\">\n        <div>\n          <CardTitle className=\"flex items-center gap-2\">\n            <LifeBuoy className=\"size-4\" />\n            Support bundle\n          </CardTitle>\n          <CardDescription>\n            Export selected workspace evidence for account, file, share, auth,\n            notification, audit, and rollback reviews.\n          </CardDescription>\n        </div>\n        <Badge variant={getStatusVariant(bundle.status)}>\n          {bundle.score}/100 {bundle.status}\n        </Badge>\n      </CardHeader>\n      <CardContent className=\"grid gap-4\">\n        <div className=\"grid gap-3 lg:grid-cols-4\">\n          <ControlCard label=\"Scope\">\n            <Select\n              value={scope}\n              onValueChange={(value) =>\n                setScope(value as AdminSupportBundleScope)\n              }\n            >\n              <SelectTrigger className=\"w-full\">\n                <SelectValue />\n              </SelectTrigger>\n              <SelectContent>\n                {adminSupportBundleScopes.map((option) => (\n                  <SelectItem key={option} value={option}>\n                    {scopeLabels[option]}\n                  </SelectItem>\n                ))}\n              </SelectContent>\n            </Select>\n          </ControlCard>\n\n          <ControlCard label=\"User\">\n            <Select\n              value={selectedUserId}\n              onValueChange={setSelectedUserId}\n              disabled={scope !== \"user\" || data.users.length === 0}\n            >\n              <SelectTrigger className=\"w-full\">\n                <SelectValue />\n              </SelectTrigger>\n              <SelectContent>\n                {data.users.length === 0 ? (\n                  <SelectItem value=\"none\">No users</SelectItem>\n                ) : (\n                  data.users.map((user) => (\n                    <SelectItem key={user.id} value={user.id}>\n                      {user.email}\n                    </SelectItem>\n                  ))\n                )}\n              </SelectContent>\n            </Select>\n          </ControlCard>\n\n          <ControlCard label=\"File\">\n            <Select\n              value={selectedFileId}\n              onValueChange={setSelectedFileId}\n              disabled={scope !== \"file\" || data.files.length === 0}\n            >\n              <SelectTrigger className=\"w-full\">\n                <SelectValue />\n              </SelectTrigger>\n              <SelectContent>\n                {data.files.length === 0 ? (\n                  <SelectItem value=\"none\">No files</SelectItem>\n                ) : (\n                  data.files.map((file) => (\n                    <SelectItem key={file.id} value={file.id}>\n                      {file.name}\n                    </SelectItem>\n                  ))\n                )}\n              </SelectContent>\n            </Select>\n          </ControlCard>\n\n          <ControlCard label=\"Share\">\n            <Select\n              value={selectedShareId}\n              onValueChange={setSelectedShareId}\n              disabled={scope !== \"share\" || data.shares.length === 0}\n            >\n              <SelectTrigger className=\"w-full\">\n                <SelectValue />\n              </SelectTrigger>\n              <SelectContent>\n                {data.shares.length === 0 ? (\n                  <SelectItem value=\"none\">No shares</SelectItem>\n                ) : (\n                  data.shares.map((share) => (\n                    <SelectItem key={share.id} value={share.id}>\n                      {share.fileName} / {share.permissionPreset}\n                    </SelectItem>\n                  ))\n                )}\n              </SelectContent>\n            </Select>\n          </ControlCard>\n        </div>\n\n        <div className=\"grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8\">\n          <Metric label=\"Users\" value={bundle.summary.users} />\n          <Metric label=\"Files\" value={bundle.summary.files} />\n          <Metric label=\"Shares\" value={bundle.summary.shares} />\n          <Metric label=\"Sessions\" value={bundle.summary.sessions} />\n          <Metric label=\"Audits\" value={bundle.summary.auditEvents} />\n          <Metric\n            label=\"Notifications\"\n            value={bundle.summary.notificationDeliveries}\n          />\n          <Metric label=\"Failed email\" value={bundle.summary.failedNotifications} />\n          <Metric label=\"Rollback\" value={bundle.summary.rollbackRows} />\n        </div>\n\n        <div className=\"rounded-md border border-border bg-muted/20 p-3 text-xs text-muted-foreground\">\n          <div className=\"flex flex-wrap items-center gap-2\">\n            <Badge variant=\"outline\">Privacy {bundle.privacy.mode}</Badge>\n            <Badge variant={bundle.privacy.emailsRedacted ? \"secondary\" : \"outline\"}>\n              {bundle.privacy.emailsRedacted ? \"emails masked\" : \"emails visible\"}\n            </Badge>\n            <Badge variant={bundle.privacy.networkDetailsIncluded ? \"outline\" : \"secondary\"}>\n              {bundle.privacy.networkDetailsIncluded\n                ? \"network included\"\n                : \"network redacted\"}\n            </Badge>\n            <Badge variant=\"outline\">{bundle.privacy.retentionDays} day lifetime</Badge>\n          </div>\n        </div>\n\n        <div className=\"grid gap-2 lg:grid-cols-2\">\n          {sortedFindings.map((finding) => (\n            <div\n              key={finding.id}\n              className=\"rounded-md border border-border bg-muted/20 p-3 text-sm\"\n            >\n              <div className=\"flex items-center justify-between gap-3\">\n                <div className=\"font-medium\">{finding.label}</div>\n                <Badge variant={getStatusVariant(finding.status)}>\n                  {finding.status}\n                </Badge>\n              </div>\n              <div className=\"mt-1 text-xs text-muted-foreground\">\n                {finding.value}\n              </div>\n              <p className=\"mt-2 text-xs leading-5 text-muted-foreground\">\n                {finding.detail}\n              </p>\n            </div>\n          ))}\n        </div>\n\n        <div className=\"grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center\">\n          <div className=\"rounded-md border border-border bg-muted/20 p-3 text-xs text-muted-foreground\">\n            <div className=\"font-medium text-foreground\">\n              {bundle.target.label}\n            </div>\n            <div className=\"mt-1\">\n              Includes matching user records, design files, public share links,\n              sessions, audit events, notification deliveries, and rollback\n              readiness evidence.\n            </div>\n          </div>\n          <div className=\"grid grid-cols-4 gap-2\">\n            <Button type=\"button\" size=\"sm\" variant=\"outline\" onClick={exportJson}>\n              <FileJson2 className=\"size-3.5\" />\n              JSON\n            </Button>\n            <Button type=\"button\" size=\"sm\" variant=\"outline\" onClick={exportCsv}>\n              <Download className=\"size-3.5\" />\n              CSV\n            </Button>\n            <Button\n              type=\"button\"\n              size=\"sm\"\n              variant=\"outline\"\n              onClick={exportMarkdown}\n            >\n              <FileArchive className=\"size-3.5\" />\n              MD\n            </Button>\n            <Button\n              type=\"button\"\n              size=\"sm\"\n              variant=\"outline\"\n              onClick={copyMarkdown}\n            >\n              <ClipboardCopy className=\"size-3.5\" />\n              Copy\n            </Button>\n          </div>\n        </div>\n      </CardContent>\n    </Card>\n  );\n}\n\nfunction ControlCard({\n  children,\n  label,\n}: {\n  children: ReactNode;\n  label: string;\n}) {\n  return (\n    <div className=\"grid gap-2 rounded-md border border-border bg-muted/20 p-3\">\n      <div className=\"text-xs font-medium text-muted-foreground\">{label}</div>\n      {children}\n    </div>\n  );\n}\n\nfunction Metric({ label, value }: { label: string; value: number }) {\n  return (\n    <div className=\"rounded-md border border-border bg-muted/20 p-2 text-xs\">\n      <div className=\"text-muted-foreground\">{label}</div>\n      <div className=\"mt-1 font-mono text-sm text-foreground\">{value}</div>\n    </div>\n  );\n}\n\nfunction getStatusVariant(status: \"ready\" | \"review\" | \"blocked\") {\n  if (status === \"blocked\") {\n    return \"destructive\";\n  }\n\n  return status === \"ready\" ? \"secondary\" : \"outline\";\n}\n\nfunction getBundleFilename(label: string, extension: string) {\n  const slug =\n    label\n      .trim()\n      .toLowerCase()\n      .replace(/[^a-z0-9]+/g, \"-\")\n      .replace(/^-+|-+$/g, \"\") || \"workspace\";\n\n  return `essence-support-${slug}.${extension}`;\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/components/admin-support-bundle-panel.tsx",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-components-admin-support-bundle-panel-tsx-b9e9be46bc4d4785.mjs",
  "kind": "tsx",
  "hash": "b9e9be46bc4d4785",
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
      "specifier": "@/components/ui/select",
      "resolved_path": "src/components/ui/select.tsx",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-components-ui-select-tsx-cb5ef19f5a25e2e4.mjs",
      "kind": "tsx",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/admin/admin-support-bundle",
      "resolved_path": "src/features/admin/admin-support-bundle.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-support-bundle-ts-2a29f1c66a1cb4bf.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/admin/admin-support-bundle-export",
      "resolved_path": "src/features/admin/admin-support-bundle-export.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-support-bundle-export-ts-3bfd84759f23cb09.mjs",
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
    "source_path": "src/features/admin/components/admin-support-bundle-panel.tsx",
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
        "specifier": "@/components/ui/select",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/admin/admin-support-bundle",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/admin/admin-support-bundle-export",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/admin/admin-data",
        "side_effect_only": false,
        "type_only": true
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
      "AdminSupportBundlePanel"
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
export const dxLinkedDependencies = Object.freeze([dep0, dep1, dep2, dep3, dep4, dep5, dep6, dep7]);
export default dxSourceModule;
