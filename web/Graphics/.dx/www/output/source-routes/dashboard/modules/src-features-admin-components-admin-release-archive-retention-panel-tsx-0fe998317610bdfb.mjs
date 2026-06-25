import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-components-ui-badge-tsx-5f9c9bdbd1c68d30.mjs";
import { dxSourceModule as dep1, dxRuntimeExports as dep1Runtime } from "./src-components-ui-button-tsx-a045a54d4568e98d.mjs";
import { dxSourceModule as dep2, dxRuntimeExports as dep2Runtime } from "./src-components-ui-card-tsx-62d56c5e9cb9789f.mjs";
import { dxSourceModule as dep3, dxRuntimeExports as dep3Runtime } from "./src-components-ui-input-tsx-5c00dcef4bc2ae59.mjs";
import { dxSourceModule as dep4, dxRuntimeExports as dep4Runtime } from "./src-features-admin-admin-release-archive-retention-export-ts-c12d2c97ffeb7d54.mjs";
import { dxSourceModule as dep5, dxRuntimeExports as dep5Runtime } from "./src-features-editor-components-library-release-panel-shared-tsx-185476f4669a07c8.mjs";
import { dxSourceModule as dep6, dxRuntimeExports as dep6Runtime } from "./src-lib-forge-icons-lucide-react-tsx-b9b0a8debf22abe8.mjs";
export const dxSourceText = "\"use client\";\n\nimport { useMemo, useState } from \"react\";\nimport {\n  Archive,\n  ClipboardCopy,\n  Download,\n  FileJson2,\n  Search,\n} from \"lucide-react\";\nimport { Badge } from \"@/components/ui/badge\";\nimport { Button } from \"@/components/ui/button\";\nimport {\n  Card,\n  CardContent,\n  CardDescription,\n  CardHeader,\n  CardTitle,\n} from \"@/components/ui/card\";\nimport { Input } from \"@/components/ui/input\";\nimport type {\n  AdminReleaseArchiveItem,\n  AdminReleaseArchiveItemKind,\n  AdminReleaseArchivePackage,\n  AdminReleaseArchiveRetentionReport,\n  AdminReleaseArchiveRetentionStatus,\n} from \"@/features/admin/admin-release-archive-retention\";\nimport {\n  getAdminReleaseArchiveRetentionCsv,\n  getAdminReleaseArchiveRetentionJson,\n  getAdminReleaseArchiveRetentionMarkdown,\n} from \"@/features/admin/admin-release-archive-retention-export\";\nimport { downloadTextFile } from \"@/features/editor/components/library-release-panel-shared\";\n\ntype AdminReleaseArchiveRetentionPanelProps = {\n  report: AdminReleaseArchiveRetentionReport;\n};\n\nexport function AdminReleaseArchiveRetentionPanel({\n  report,\n}: AdminReleaseArchiveRetentionPanelProps) {\n  const [query, setQuery] = useState(\"\");\n  const filteredPackages = useMemo(\n    () => filterPackages(report.packages, query),\n    [query, report.packages],\n  );\n  const visibleItemCount = filteredPackages.reduce(\n    (total, archivePackage) => total + archivePackage.items.length,\n    0,\n  );\n\n  function exportJson() {\n    downloadTextFile({\n      content: getAdminReleaseArchiveRetentionJson(report),\n      filename: \"admin-release-archive-retention.json\",\n      type: \"application/json;charset=utf-8\",\n    });\n  }\n\n  function exportCsv() {\n    downloadTextFile({\n      content: getAdminReleaseArchiveRetentionCsv(report),\n      filename: \"admin-release-archive-retention.csv\",\n      type: \"text/csv;charset=utf-8\",\n    });\n  }\n\n  function exportMarkdown() {\n    downloadTextFile({\n      content: getAdminReleaseArchiveRetentionMarkdown(report),\n      filename: \"admin-release-archive-retention.md\",\n      type: \"text/markdown;charset=utf-8\",\n    });\n  }\n\n  function copyMarkdown() {\n    void navigator.clipboard.writeText(\n      getAdminReleaseArchiveRetentionMarkdown(report),\n    );\n  }\n\n  return (\n    <Card>\n      <CardHeader className=\"gap-3 md:flex-row md:items-center md:justify-between\">\n        <div>\n          <CardTitle className=\"flex items-center gap-2\">\n            <Archive className=\"size-4\" />\n            Release archive retention\n          </CardTitle>\n          <CardDescription>\n            Searchable release packages for approvals, smoke reports, privacy\n            checklists, signed manifests, desktop updates, and rollback bundles.\n          </CardDescription>\n        </div>\n        <Badge variant={getStatusVariant(report.status)}>\n          {report.status} {report.score}\n        </Badge>\n      </CardHeader>\n      <CardContent className=\"grid gap-4\">\n        <div className=\"grid gap-2 text-xs md:grid-cols-3 xl:grid-cols-6\">\n          <Metric label=\"Packages\" value={report.packageCount} />\n          <Metric label=\"Items\" value={report.itemCount} />\n          <Metric label=\"Searchable\" value={report.searchableCount} />\n          <Metric label=\"Retention\" value={`${report.retentionDays}d`} />\n          <Metric label=\"Review\" value={report.reviewCount} />\n          <Metric label=\"Blocked\" value={report.blockedCount} />\n        </div>\n\n        <div className=\"relative\">\n          <Search className=\"pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground\" />\n          <Input\n            className=\"pl-9\"\n            value={query}\n            onChange={(event) => setQuery(event.target.value)}\n            placeholder=\"Search release label, commit, package, deployment URL, smoke artifact, privacy surface, or rollback note\"\n          />\n        </div>\n\n        <div className=\"flex flex-wrap items-center justify-between gap-2 text-xs\">\n          <Badge variant=\"outline\">\n            {filteredPackages.length} packages shown\n          </Badge>\n          <Badge variant=\"outline\">{visibleItemCount} items shown</Badge>\n        </div>\n\n        <div className=\"grid gap-3 xl:grid-cols-2\">\n          {filteredPackages.map((archivePackage) => (\n            <ArchivePackageCard\n              key={archivePackage.id}\n              archivePackage={archivePackage}\n            />\n          ))}\n        </div>\n\n        <div className=\"grid gap-2 text-xs\">\n          <div className=\"font-medium\">Archive commands</div>\n          <div className=\"grid gap-2 lg:grid-cols-2\">\n            {report.commands.map((command) => (\n              <div\n                key={command}\n                className=\"rounded-md border border-border bg-muted/20 p-3 text-muted-foreground\"\n              >\n                {command}\n              </div>\n            ))}\n          </div>\n        </div>\n\n        <div className=\"grid grid-cols-2 gap-2 sm:grid-cols-4\">\n          <Button type=\"button\" size=\"sm\" variant=\"outline\" onClick={exportJson}>\n            <FileJson2 className=\"size-3.5\" />\n            JSON\n          </Button>\n          <Button type=\"button\" size=\"sm\" variant=\"outline\" onClick={exportCsv}>\n            <Download className=\"size-3.5\" />\n            CSV\n          </Button>\n          <Button\n            type=\"button\"\n            size=\"sm\"\n            variant=\"outline\"\n            onClick={exportMarkdown}\n          >\n            <Download className=\"size-3.5\" />\n            MD\n          </Button>\n          <Button\n            type=\"button\"\n            size=\"sm\"\n            variant=\"outline\"\n            onClick={copyMarkdown}\n          >\n            <ClipboardCopy className=\"size-3.5\" />\n            Copy\n          </Button>\n        </div>\n      </CardContent>\n    </Card>\n  );\n}\n\nfunction ArchivePackageCard({\n  archivePackage,\n}: {\n  archivePackage: AdminReleaseArchivePackage;\n}) {\n  const sortedItems = archivePackage.items\n    .filter((item) => item.status !== \"ready\")\n    .concat(archivePackage.items.filter((item) => item.status === \"ready\"));\n\n  return (\n    <div className=\"rounded-md border border-border bg-muted/20 p-3 text-sm\">\n      <div className=\"flex items-start justify-between gap-3\">\n        <div className=\"min-w-0\">\n          <div className=\"truncate font-medium\">{archivePackage.label}</div>\n          <div className=\"mt-1 text-xs text-muted-foreground\">\n            Retain until {formatDate(archivePackage.retentionUntil)}\n          </div>\n        </div>\n        <Badge variant={getStatusVariant(archivePackage.status)}>\n          {archivePackage.status}\n        </Badge>\n      </div>\n      <div className=\"mt-3 grid grid-cols-2 gap-2 text-xs md:grid-cols-4\">\n        <Metric label=\"Score\" value={archivePackage.score} />\n        <Metric label=\"Items\" value={archivePackage.itemCount} />\n        <Metric label=\"Created\" value={formatShortDate(archivePackage.createdAt)} />\n        <Metric label=\"Release\" value={archivePackage.releaseLabel} />\n      </div>\n      <div className=\"mt-3 grid gap-2\">\n        {sortedItems.map((item) => (\n          <ArchiveItemRow key={item.id} item={item} />\n        ))}\n      </div>\n    </div>\n  );\n}\n\nfunction ArchiveItemRow({ item }: { item: AdminReleaseArchiveItem }) {\n  return (\n    <div className=\"rounded-md border border-border bg-background/70 p-3 text-xs\">\n      <div className=\"flex flex-wrap items-center justify-between gap-2\">\n        <div className=\"font-medium\">{item.label}</div>\n        <div className=\"flex flex-wrap gap-1\">\n          <Badge variant=\"outline\">{formatKind(item.kind)}</Badge>\n          <Badge variant={getStatusVariant(item.status)}>{item.status}</Badge>\n        </div>\n      </div>\n      <p className=\"mt-2 text-muted-foreground\">{item.summary}</p>\n      <p className=\"mt-2\">{item.recommendation}</p>\n      <div className=\"mt-2 flex flex-wrap gap-1\">\n        <Badge variant=\"outline\">{item.artifactCount} artifacts</Badge>\n        <Badge variant=\"outline\">until {formatShortDate(item.retentionUntil)}</Badge>\n      </div>\n    </div>\n  );\n}\n\nfunction Metric({ label, value }: { label: string; value: number | string }) {\n  return (\n    <div className=\"rounded-md border border-border bg-background/70 p-2\">\n      <div className=\"text-muted-foreground\">{label}</div>\n      <div className=\"mt-1 truncate font-mono text-sm text-foreground\">\n        {value}\n      </div>\n    </div>\n  );\n}\n\nfunction filterPackages(\n  packages: AdminReleaseArchivePackage[],\n  query: string,\n) {\n  const normalizedQuery = query.trim().toLowerCase();\n\n  if (!normalizedQuery) {\n    return packages;\n  }\n\n  return packages\n    .map((archivePackage) => ({\n      ...archivePackage,\n      items: archivePackage.items.filter((item) =>\n        `${archivePackage.searchableText} ${item.searchableText}`\n          .toLowerCase()\n          .includes(normalizedQuery),\n      ),\n    }))\n    .filter(\n      (archivePackage) =>\n        archivePackage.items.length > 0 ||\n        archivePackage.searchableText.toLowerCase().includes(normalizedQuery),\n    );\n}\n\nfunction formatKind(kind: AdminReleaseArchiveItemKind) {\n  return kind.replace(\"-\", \" \");\n}\n\nfunction getStatusVariant(status: AdminReleaseArchiveRetentionStatus) {\n  if (status === \"blocked\") {\n    return \"destructive\";\n  }\n\n  return status === \"review\" ? \"secondary\" : \"outline\";\n}\n\nfunction formatDate(value: string) {\n  return new Intl.DateTimeFormat(undefined, {\n    dateStyle: \"medium\",\n    timeStyle: \"short\",\n  }).format(new Date(value));\n}\n\nfunction formatShortDate(value: string) {\n  return new Intl.DateTimeFormat(undefined, {\n    month: \"short\",\n    day: \"numeric\",\n    year: \"2-digit\",\n  }).format(new Date(value));\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/components/admin-release-archive-retention-panel.tsx",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-components-admin-release-archive-retention-panel-tsx-0fe998317610bdfb.mjs",
  "kind": "tsx",
  "hash": "0fe998317610bdfb",
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
      "specifier": "@/components/ui/input",
      "resolved_path": "src/components/ui/input.tsx",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-components-ui-input-tsx-5c00dcef4bc2ae59.mjs",
      "kind": "tsx",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/admin/admin-release-archive-retention-export",
      "resolved_path": "src/features/admin/admin-release-archive-retention-export.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-release-archive-retention-export-ts-c12d2c97ffeb7d54.mjs",
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
    "source_path": "src/features/admin/components/admin-release-archive-retention-panel.tsx",
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
        "specifier": "@/components/ui/input",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/admin/admin-release-archive-retention",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/admin/admin-release-archive-retention-export",
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
      "AdminReleaseArchiveRetentionPanel"
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
