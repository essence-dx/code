import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-components-ui-badge-tsx-5f9c9bdbd1c68d30.mjs";
import { dxSourceModule as dep1, dxRuntimeExports as dep1Runtime } from "./src-components-ui-button-tsx-a045a54d4568e98d.mjs";
import { dxSourceModule as dep2, dxRuntimeExports as dep2Runtime } from "./src-components-ui-card-tsx-62d56c5e9cb9789f.mjs";
import { dxSourceModule as dep3, dxRuntimeExports as dep3Runtime } from "./src-features-admin-admin-desktop-update-channel-export-ts-34b6b151ecd26928.mjs";
import { dxSourceModule as dep4, dxRuntimeExports as dep4Runtime } from "./src-features-editor-components-library-release-panel-shared-tsx-185476f4669a07c8.mjs";
import { dxSourceModule as dep5, dxRuntimeExports as dep5Runtime } from "./src-lib-forge-icons-lucide-react-tsx-b9b0a8debf22abe8.mjs";
export const dxSourceText = "\"use client\";\n\nimport {\n  ClipboardCopy,\n  Download,\n  FileJson2,\n  Gauge,\n  MonitorDown,\n  PauseCircle,\n  RadioTower,\n} from \"lucide-react\";\nimport { Badge } from \"@/components/ui/badge\";\nimport { Button } from \"@/components/ui/button\";\nimport {\n  Card,\n  CardContent,\n  CardDescription,\n  CardHeader,\n  CardTitle,\n} from \"@/components/ui/card\";\nimport type {\n  AdminDesktopUpdateChannelKind,\n  AdminDesktopUpdateChannelPackage,\n  AdminDesktopUpdateChannelReport,\n  AdminDesktopUpdateChannelStatus,\n} from \"@/features/admin/admin-desktop-update-channel\";\nimport {\n  getAdminDesktopUpdateChannelCsv,\n  getAdminDesktopUpdateChannelJson,\n  getAdminDesktopUpdateChannelMarkdown,\n} from \"@/features/admin/admin-desktop-update-channel-export\";\nimport { downloadTextFile } from \"@/features/editor/components/library-release-panel-shared\";\n\ntype AdminDesktopUpdateChannelPanelProps = {\n  report: AdminDesktopUpdateChannelReport;\n};\n\nexport function AdminDesktopUpdateChannelPanel({\n  report,\n}: AdminDesktopUpdateChannelPanelProps) {\n  const sortedPackages = report.packages\n    .filter((updatePackage) => updatePackage.channel === report.activeChannel)\n    .concat(\n      report.packages.filter(\n        (updatePackage) => updatePackage.channel !== report.activeChannel,\n      ),\n    );\n\n  function exportJson() {\n    downloadTextFile({\n      content: getAdminDesktopUpdateChannelJson(report),\n      filename: \"admin-desktop-update-channel.json\",\n      type: \"application/json;charset=utf-8\",\n    });\n  }\n\n  function exportCsv() {\n    downloadTextFile({\n      content: getAdminDesktopUpdateChannelCsv(report),\n      filename: \"admin-desktop-update-channel.csv\",\n      type: \"text/csv;charset=utf-8\",\n    });\n  }\n\n  function exportMarkdown() {\n    downloadTextFile({\n      content: getAdminDesktopUpdateChannelMarkdown(report),\n      filename: \"admin-desktop-update-channel.md\",\n      type: \"text/markdown;charset=utf-8\",\n    });\n  }\n\n  function copyMarkdown() {\n    void navigator.clipboard.writeText(\n      getAdminDesktopUpdateChannelMarkdown(report),\n    );\n  }\n\n  return (\n    <Card>\n      <CardHeader className=\"gap-3 md:flex-row md:items-center md:justify-between\">\n        <div>\n          <CardTitle className=\"flex items-center gap-2\">\n            <RadioTower className=\"size-4\" />\n            Desktop update channels\n          </CardTitle>\n          <CardDescription>\n            Stable, beta, and canary desktop update readiness with version\n            parity, rollout exposure, holds, package evidence, and feed status.\n          </CardDescription>\n        </div>\n        <Badge variant={getStatusVariant(report.status)}>\n          {report.status} {report.score}\n        </Badge>\n      </CardHeader>\n      <CardContent className=\"grid gap-4\">\n        <div className=\"grid gap-2 text-xs md:grid-cols-3 xl:grid-cols-6\">\n          <Metric label=\"Active\" value={report.activeChannel} />\n          <Metric label=\"Current\" value={report.currentVersion} />\n          <Metric label=\"Target\" value={report.targetVersion} />\n          <Metric label=\"Minimum\" value={report.minimumVersion} />\n          <Metric label=\"Rollout\" value={`${report.rolloutPercent}%`} />\n          <Metric label=\"Commands\" value={report.commandCount} />\n        </div>\n\n        <div className=\"grid gap-3 xl:grid-cols-3\">\n          {sortedPackages.map((updatePackage) => (\n            <UpdatePackageCard\n              key={updatePackage.channel}\n              active={updatePackage.channel === report.activeChannel}\n              updatePackage={updatePackage}\n            />\n          ))}\n        </div>\n\n        <div className=\"grid gap-2 text-xs\">\n          <div className=\"flex flex-wrap items-center justify-between gap-2\">\n            <div className=\"font-medium\">Update commands</div>\n            <Badge variant=\"outline\">{report.commands.length} commands</Badge>\n          </div>\n          <div className=\"grid gap-2 lg:grid-cols-2\">\n            {report.commands.map((command) => (\n              <div\n                key={command}\n                className=\"rounded-md border border-border bg-muted/20 p-3 font-mono text-[11px] text-muted-foreground\"\n              >\n                {command}\n              </div>\n            ))}\n          </div>\n        </div>\n\n        <div className=\"grid grid-cols-2 gap-2 sm:grid-cols-4\">\n          <Button type=\"button\" size=\"sm\" variant=\"outline\" onClick={exportJson}>\n            <FileJson2 className=\"size-3.5\" />\n            JSON\n          </Button>\n          <Button type=\"button\" size=\"sm\" variant=\"outline\" onClick={exportCsv}>\n            <Download className=\"size-3.5\" />\n            CSV\n          </Button>\n          <Button\n            type=\"button\"\n            size=\"sm\"\n            variant=\"outline\"\n            onClick={exportMarkdown}\n          >\n            <Download className=\"size-3.5\" />\n            MD\n          </Button>\n          <Button\n            type=\"button\"\n            size=\"sm\"\n            variant=\"outline\"\n            onClick={copyMarkdown}\n          >\n            <ClipboardCopy className=\"size-3.5\" />\n            Copy\n          </Button>\n        </div>\n      </CardContent>\n    </Card>\n  );\n}\n\nfunction UpdatePackageCard({\n  active,\n  updatePackage,\n}: {\n  active: boolean;\n  updatePackage: AdminDesktopUpdateChannelPackage;\n}) {\n  const sortedRows = updatePackage.rows\n    .filter((row) => row.status !== \"ready\")\n    .concat(updatePackage.rows.filter((row) => row.status === \"ready\"));\n\n  return (\n    <div className=\"rounded-md border border-border bg-muted/20 p-3 text-sm\">\n      <div className=\"flex items-start justify-between gap-3\">\n        <div className=\"min-w-0\">\n          <div className=\"flex items-center gap-2 font-medium\">\n            <MonitorDown className=\"size-4\" />\n            <span className=\"truncate\">{updatePackage.label}</span>\n          </div>\n          <div className=\"mt-1 flex flex-wrap gap-1 text-xs\">\n            {active ? <Badge variant=\"secondary\">active</Badge> : null}\n            <Badge variant=\"outline\">{formatChannel(updatePackage.channel)}</Badge>\n            <Badge variant={getStatusVariant(updatePackage.status)}>\n              {updatePackage.status}\n            </Badge>\n          </div>\n        </div>\n        <Badge variant=\"outline\">{updatePackage.score}/100</Badge>\n      </div>\n\n      <div className=\"mt-3 grid grid-cols-2 gap-2 text-xs\">\n        <Metric label=\"Target\" value={updatePackage.targetVersion} />\n        <Metric label=\"Minimum\" value={updatePackage.minimumVersion} />\n        <Metric label=\"Rollout\" value={`${updatePackage.rolloutPercent}%`} />\n        <Metric\n          label=\"Feed\"\n          value={updatePackage.feedUrl ? \"configured\" : \"manual\"}\n        />\n      </div>\n\n      <div className=\"mt-3 flex flex-wrap gap-1 text-xs\">\n        <Badge variant={updatePackage.hold.active ? \"secondary\" : \"outline\"}>\n          <PauseCircle className=\"size-3\" />\n          {updatePackage.hold.active\n            ? updatePackage.hold.reason ?? \"held\"\n            : \"no hold\"}\n        </Badge>\n        <Badge variant=\"outline\">\n          <Gauge className=\"size-3\" />\n          {updatePackage.rows.length} checks\n        </Badge>\n      </div>\n\n      <div className=\"mt-3 grid gap-2\">\n        {sortedRows.map((row) => (\n          <div\n            key={row.id}\n            className=\"rounded-md border border-border bg-background/70 p-3 text-xs\"\n          >\n            <div className=\"flex flex-wrap items-center justify-between gap-2\">\n              <div className=\"font-medium\">{row.label}</div>\n              <Badge variant={getStatusVariant(row.status)}>{row.status}</Badge>\n            </div>\n            <div className=\"mt-1 text-muted-foreground\">{row.value}</div>\n            <p className=\"mt-2 text-muted-foreground\">{row.detail}</p>\n            <p className=\"mt-2\">{row.recommendation}</p>\n          </div>\n        ))}\n      </div>\n    </div>\n  );\n}\n\nfunction Metric({ label, value }: { label: string; value: number | string }) {\n  return (\n    <div className=\"rounded-md border border-border bg-background/70 p-2\">\n      <div className=\"text-muted-foreground\">{label}</div>\n      <div className=\"mt-1 truncate font-mono text-sm text-foreground\">\n        {value}\n      </div>\n    </div>\n  );\n}\n\nfunction formatChannel(channel: AdminDesktopUpdateChannelKind) {\n  return channel.charAt(0).toUpperCase() + channel.slice(1);\n}\n\nfunction getStatusVariant(status: AdminDesktopUpdateChannelStatus) {\n  if (status === \"blocked\") {\n    return \"destructive\";\n  }\n\n  return status === \"review\" ? \"secondary\" : \"outline\";\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/components/admin-desktop-update-channel-panel.tsx",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-components-admin-desktop-update-channel-panel-tsx-c8a5db3bc0c5f9cf.mjs",
  "kind": "tsx",
  "hash": "c8a5db3bc0c5f9cf",
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
      "specifier": "@/features/admin/admin-desktop-update-channel-export",
      "resolved_path": "src/features/admin/admin-desktop-update-channel-export.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-desktop-update-channel-export-ts-34b6b151ecd26928.mjs",
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
    "source_path": "src/features/admin/components/admin-desktop-update-channel-panel.tsx",
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
        "specifier": "@/features/admin/admin-desktop-update-channel",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/admin/admin-desktop-update-channel-export",
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
      "AdminDesktopUpdateChannelPanel"
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
