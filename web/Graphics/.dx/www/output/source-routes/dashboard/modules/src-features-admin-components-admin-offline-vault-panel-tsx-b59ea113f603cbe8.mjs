import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-components-ui-alert-tsx-2d34801893b59373.mjs";
import { dxSourceModule as dep1, dxRuntimeExports as dep1Runtime } from "./src-components-ui-badge-tsx-5f9c9bdbd1c68d30.mjs";
import { dxSourceModule as dep2, dxRuntimeExports as dep2Runtime } from "./src-components-ui-button-tsx-a045a54d4568e98d.mjs";
import { dxSourceModule as dep3, dxRuntimeExports as dep3Runtime } from "./src-components-ui-card-tsx-62d56c5e9cb9789f.mjs";
import { dxSourceModule as dep4, dxRuntimeExports as dep4Runtime } from "./src-features-admin-admin-offline-vault-ts-541ad33debff3ec5.mjs";
import { dxSourceModule as dep5, dxRuntimeExports as dep5Runtime } from "./src-features-admin-admin-offline-vault-export-ts-c5a449b3c1264f75.mjs";
import { dxSourceModule as dep6, dxRuntimeExports as dep6Runtime } from "./src-features-admin-admin-support-bundle-ts-2a29f1c66a1cb4bf.mjs";
import { dxSourceModule as dep7, dxRuntimeExports as dep7Runtime } from "./src-features-editor-components-library-release-panel-shared-tsx-185476f4669a07c8.mjs";
import { dxSourceModule as dep8, dxRuntimeExports as dep8Runtime } from "./src-lib-forge-icons-lucide-react-tsx-b9b0a8debf22abe8.mjs";
export const dxSourceText = "\"use client\";\n\nimport { useMemo, useRef, useState, type ChangeEvent } from \"react\";\nimport {\n  ClipboardCopy,\n  Download,\n  FileArchive,\n  FileJson2,\n  HardDriveDownload,\n  Upload,\n} from \"lucide-react\";\nimport { Alert, AlertDescription } from \"@/components/ui/alert\";\nimport { Badge } from \"@/components/ui/badge\";\nimport { Button } from \"@/components/ui/button\";\nimport {\n  Card,\n  CardContent,\n  CardDescription,\n  CardHeader,\n  CardTitle,\n} from \"@/components/ui/card\";\nimport type { AdminDashboardData } from \"@/features/admin/admin-data\";\nimport {\n  createAdminOfflineVaultPackage,\n  validateAdminOfflineVaultPackage,\n  type AdminOfflineVaultImportReport,\n} from \"@/features/admin/admin-offline-vault\";\nimport {\n  getAdminOfflineVaultCsv,\n  getAdminOfflineVaultJson,\n  getAdminOfflineVaultMarkdown,\n} from \"@/features/admin/admin-offline-vault-export\";\nimport { createAdminSupportBundleFromDashboard } from \"@/features/admin/admin-support-bundle\";\nimport { downloadTextFile } from \"@/features/editor/components/library-release-panel-shared\";\n\ntype AdminOfflineVaultPanelProps = {\n  data: AdminDashboardData;\n};\n\nexport function AdminOfflineVaultPanel({ data }: AdminOfflineVaultPanelProps) {\n  const fileInputRef = useRef<HTMLInputElement | null>(null);\n  const [importReport, setImportReport] =\n    useState<AdminOfflineVaultImportReport | null>(null);\n  const [importError, setImportError] = useState<string | null>(null);\n  const generatedAt = data.selfHostedBackupReadiness.generatedAt;\n  const packageId = useMemo(\n    () => `vault-${generatedAt.replace(/[^0-9a-z]/gi, \"\").toLowerCase()}`,\n    [generatedAt],\n  );\n  const supportBundle = useMemo(\n    () =>\n      createAdminSupportBundleFromDashboard({\n        data,\n        generatedAt,\n        scope: \"workspace\",\n      }),\n    [data, generatedAt],\n  );\n  const vault = useMemo(\n    () =>\n      createAdminOfflineVaultPackage({\n        backupSnapshot: {\n          productionDeploySmoke: data.productionDeploySmoke,\n          releaseApprovalSnapshots: data.releaseApprovalSnapshots,\n          retentionPrivacy: data.retentionPrivacy,\n          rollbackReadiness: data.rollbackReadiness,\n          selfHostedBackupReadiness: data.selfHostedBackupReadiness,\n        },\n        designFiles: data.offlineVaultDesignFiles,\n        exportedBy: data.currentUser.email,\n        generatedAt,\n        packageId,\n        supportBundle,\n      }),\n    [\n      data.currentUser.email,\n      data.offlineVaultDesignFiles,\n      data.productionDeploySmoke,\n      data.releaseApprovalSnapshots,\n      data.retentionPrivacy,\n      data.rollbackReadiness,\n      data.selfHostedBackupReadiness,\n      generatedAt,\n      packageId,\n      supportBundle,\n    ],\n  );\n  const vaultReport = useMemo(\n    () => validateAdminOfflineVaultPackage(vault),\n    [vault],\n  );\n  const visibleRows = vaultReport.rows\n    .filter((row) => row.status !== \"ready\")\n    .concat(vaultReport.rows.filter((row) => row.status === \"ready\"));\n\n  function exportJson() {\n    downloadTextFile({\n      content: getAdminOfflineVaultJson(vault),\n      filename: `${packageId}.json`,\n      type: \"application/json;charset=utf-8\",\n    });\n  }\n\n  function exportCsv() {\n    downloadTextFile({\n      content: getAdminOfflineVaultCsv(vault),\n      filename: `${packageId}.csv`,\n      type: \"text/csv;charset=utf-8\",\n    });\n  }\n\n  function exportMarkdown() {\n    downloadTextFile({\n      content: getAdminOfflineVaultMarkdown(vault),\n      filename: `${packageId}.md`,\n      type: \"text/markdown;charset=utf-8\",\n    });\n  }\n\n  function copyMarkdown() {\n    void navigator.clipboard.writeText(getAdminOfflineVaultMarkdown(vault));\n  }\n\n  async function importJson(event: ChangeEvent<HTMLInputElement>) {\n    const file = event.target.files?.[0];\n\n    setImportError(null);\n    setImportReport(null);\n\n    if (!file) {\n      return;\n    }\n\n    try {\n      const packageText = await file.text();\n      setImportReport(validateAdminOfflineVaultPackage(JSON.parse(packageText)));\n    } catch (error) {\n      setImportError(\n        error instanceof Error\n          ? error.message\n          : \"The selected vault package could not be parsed.\",\n      );\n    } finally {\n      event.target.value = \"\";\n    }\n  }\n\n  return (\n    <Card>\n      <CardHeader className=\"gap-3 md:flex-row md:items-start md:justify-between\">\n        <div>\n          <CardTitle className=\"flex items-center gap-2\">\n            <HardDriveDownload className=\"size-4\" />\n            Offline vault\n          </CardTitle>\n          <CardDescription>\n            Export design files with support, backup, rollback, deploy smoke,\n            release, and privacy snapshots for desktop or self-hosted recovery.\n          </CardDescription>\n        </div>\n        <Badge variant={getStatusVariant(vaultReport.status)}>\n          {vaultReport.score}/100 {vaultReport.status}\n        </Badge>\n      </CardHeader>\n      <CardContent className=\"grid gap-4\">\n        <div className=\"grid gap-2 sm:grid-cols-2 lg:grid-cols-5\">\n          <Metric\n            label=\"Files\"\n            value={String(vault.manifest.designFileCount)}\n            detail={`${vault.manifest.activeDesignFileCount} active`}\n          />\n          <Metric\n            label=\"Pages\"\n            value={String(vault.manifest.pageCount)}\n            detail={`${vault.manifest.layerCount} layers`}\n          />\n          <Metric\n            label=\"Support\"\n            value={`${vault.manifest.supportBundleScore}/100`}\n            detail={supportBundle.status}\n          />\n          <Metric\n            label=\"Backup\"\n            value={`${vault.manifest.backupReadinessScore}/100`}\n            detail={data.selfHostedBackupReadiness.status}\n          />\n          <Metric\n            label=\"Checksum\"\n            value={vault.manifest.checksum}\n            detail={formatBytes(vault.manifest.estimatedBytes)}\n          />\n        </div>\n\n        <div className=\"grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center\">\n          <div className=\"rounded-md border border-border bg-muted/20 p-3 text-xs text-muted-foreground\">\n            <div className=\"font-medium text-foreground\">{packageId}</div>\n            <div className=\"mt-1\">\n              Generated from the latest admin dashboard data at {generatedAt}.\n            </div>\n          </div>\n          <div className=\"grid grid-cols-2 gap-2 sm:grid-cols-5\">\n            <Button type=\"button\" size=\"sm\" variant=\"outline\" onClick={exportJson}>\n              <FileJson2 className=\"size-3.5\" />\n              JSON\n            </Button>\n            <Button type=\"button\" size=\"sm\" variant=\"outline\" onClick={exportCsv}>\n              <Download className=\"size-3.5\" />\n              CSV\n            </Button>\n            <Button\n              type=\"button\"\n              size=\"sm\"\n              variant=\"outline\"\n              onClick={exportMarkdown}\n            >\n              <FileArchive className=\"size-3.5\" />\n              MD\n            </Button>\n            <Button\n              type=\"button\"\n              size=\"sm\"\n              variant=\"outline\"\n              onClick={copyMarkdown}\n            >\n              <ClipboardCopy className=\"size-3.5\" />\n              Copy\n            </Button>\n            <Button\n              type=\"button\"\n              size=\"sm\"\n              variant=\"secondary\"\n              onClick={() => fileInputRef.current?.click()}\n            >\n              <Upload className=\"size-3.5\" />\n              Import\n            </Button>\n          </div>\n        </div>\n\n        <input\n          ref={fileInputRef}\n          type=\"file\"\n          accept=\"application/json,.json\"\n          className=\"hidden\"\n          onChange={importJson}\n        />\n\n        {importError ? (\n          <Alert variant=\"destructive\">\n            <AlertDescription>{importError}</AlertDescription>\n          </Alert>\n        ) : null}\n\n        {importReport ? (\n          <Alert>\n            <AlertDescription>\n              Imported {importReport.packageId ?? \"unknown package\"}:{\" \"}\n              {importReport.score}/100 {importReport.status},{\" \"}\n              {importReport.designFileCount} files,{\" \"}\n              {formatBytes(importReport.estimatedBytes)}.\n            </AlertDescription>\n          </Alert>\n        ) : null}\n\n        <div className=\"grid gap-2 lg:grid-cols-2\">\n          {visibleRows.map((row) => (\n            <div\n              key={row.id}\n              className=\"rounded-md border border-border bg-muted/20 p-3 text-sm\"\n            >\n              <div className=\"flex items-center justify-between gap-3\">\n                <div className=\"font-medium\">{row.label}</div>\n                <Badge variant={getStatusVariant(row.status)}>\n                  {row.status}\n                </Badge>\n              </div>\n              <div className=\"mt-1 text-xs text-muted-foreground\">\n                {row.value}\n              </div>\n              <p className=\"mt-2 text-xs leading-5 text-muted-foreground\">\n                {row.detail}\n              </p>\n              <p className=\"mt-2 text-xs font-medium\">\n                {row.recommendation}\n              </p>\n            </div>\n          ))}\n        </div>\n      </CardContent>\n    </Card>\n  );\n}\n\nfunction Metric({\n  detail,\n  label,\n  value,\n}: {\n  detail: string;\n  label: string;\n  value: string;\n}) {\n  return (\n    <div className=\"rounded-md border border-border bg-muted/20 p-3 text-xs\">\n      <div className=\"text-muted-foreground\">{label}</div>\n      <div className=\"mt-1 break-all font-mono text-sm text-foreground\">\n        {value}\n      </div>\n      <div className=\"mt-1 text-muted-foreground\">{detail}</div>\n    </div>\n  );\n}\n\nfunction getStatusVariant(status: \"ready\" | \"review\" | \"blocked\") {\n  if (status === \"blocked\") {\n    return \"destructive\";\n  }\n\n  return status === \"ready\" ? \"secondary\" : \"outline\";\n}\n\nfunction formatBytes(bytes: number) {\n  if (bytes < 1024) {\n    return `${bytes} B`;\n  }\n\n  if (bytes < 1024 * 1024) {\n    return `${(bytes / 1024).toFixed(1)} KB`;\n  }\n\n  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/components/admin-offline-vault-panel.tsx",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-components-admin-offline-vault-panel-tsx-b59ea113f603cbe8.mjs",
  "kind": "tsx",
  "hash": "b59ea113f603cbe8",
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
      "specifier": "@/features/admin/admin-offline-vault",
      "resolved_path": "src/features/admin/admin-offline-vault.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-offline-vault-ts-541ad33debff3ec5.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/admin/admin-offline-vault-export",
      "resolved_path": "src/features/admin/admin-offline-vault-export.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-offline-vault-export-ts-c5a449b3c1264f75.mjs",
      "kind": "ts",
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
    "source_path": "src/features/admin/components/admin-offline-vault-panel.tsx",
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
        "specifier": "@/features/admin/admin-data",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/admin/admin-offline-vault",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/admin/admin-offline-vault-export",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/admin/admin-support-bundle",
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
      "AdminOfflineVaultPanel"
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
export const dxLinkedDependencies = Object.freeze([dep0, dep1, dep2, dep3, dep4, dep5, dep6, dep7, dep8]);
export default dxSourceModule;
