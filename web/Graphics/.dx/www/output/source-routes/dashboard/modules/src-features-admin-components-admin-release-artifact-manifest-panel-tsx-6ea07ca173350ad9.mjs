import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-components-ui-badge-tsx-5f9c9bdbd1c68d30.mjs";
import { dxSourceModule as dep1, dxRuntimeExports as dep1Runtime } from "./src-components-ui-button-tsx-a045a54d4568e98d.mjs";
import { dxSourceModule as dep2, dxRuntimeExports as dep2Runtime } from "./src-components-ui-card-tsx-62d56c5e9cb9789f.mjs";
import { dxSourceModule as dep3, dxRuntimeExports as dep3Runtime } from "./src-features-admin-admin-release-artifact-manifest-export-ts-128db9274d09b79d.mjs";
import { dxSourceModule as dep4, dxRuntimeExports as dep4Runtime } from "./src-features-editor-components-library-release-panel-shared-tsx-185476f4669a07c8.mjs";
import { dxSourceModule as dep5, dxRuntimeExports as dep5Runtime } from "./src-lib-forge-icons-lucide-react-tsx-b9b0a8debf22abe8.mjs";
export const dxSourceText = "\"use client\";\n\nimport {\n  ClipboardCopy,\n  Download,\n  FileCheck2,\n  FileJson2,\n  KeyRound,\n  ShieldCheck,\n} from \"lucide-react\";\nimport { Badge } from \"@/components/ui/badge\";\nimport { Button } from \"@/components/ui/button\";\nimport {\n  Card,\n  CardContent,\n  CardDescription,\n  CardHeader,\n  CardTitle,\n} from \"@/components/ui/card\";\nimport type {\n  AdminReleaseArtifactKind,\n  AdminReleaseArtifactManifestReport,\n  AdminReleaseArtifactManifestStatus,\n} from \"@/features/admin/admin-release-artifact-manifest\";\nimport {\n  getAdminReleaseArtifactManifestCsv,\n  getAdminReleaseArtifactManifestJson,\n  getAdminReleaseArtifactManifestMarkdown,\n} from \"@/features/admin/admin-release-artifact-manifest-export\";\nimport { downloadTextFile } from \"@/features/editor/components/library-release-panel-shared\";\n\ntype AdminReleaseArtifactManifestPanelProps = {\n  report: AdminReleaseArtifactManifestReport;\n};\n\nexport function AdminReleaseArtifactManifestPanel({\n  report,\n}: AdminReleaseArtifactManifestPanelProps) {\n  const sortedRows = report.rows\n    .filter((row) => row.status !== \"ready\")\n    .concat(report.rows.filter((row) => row.status === \"ready\"));\n  const sortedArtifacts = report.artifacts\n    .filter((artifact) => artifact.status !== \"ready\")\n    .concat(report.artifacts.filter((artifact) => artifact.status === \"ready\"));\n\n  function exportJson() {\n    downloadTextFile({\n      content: getAdminReleaseArtifactManifestJson(report),\n      filename: `${report.manifestId}.json`,\n      type: \"application/json;charset=utf-8\",\n    });\n  }\n\n  function exportCsv() {\n    downloadTextFile({\n      content: getAdminReleaseArtifactManifestCsv(report),\n      filename: `${report.manifestId}.csv`,\n      type: \"text/csv;charset=utf-8\",\n    });\n  }\n\n  function exportMarkdown() {\n    downloadTextFile({\n      content: getAdminReleaseArtifactManifestMarkdown(report),\n      filename: `${report.manifestId}.md`,\n      type: \"text/markdown;charset=utf-8\",\n    });\n  }\n\n  function copyMarkdown() {\n    void navigator.clipboard.writeText(\n      getAdminReleaseArtifactManifestMarkdown(report),\n    );\n  }\n\n  return (\n    <Card>\n      <CardHeader className=\"gap-3 md:flex-row md:items-start md:justify-between\">\n        <div>\n          <CardTitle className=\"flex items-center gap-2\">\n            <FileCheck2 className=\"size-4\" />\n            Signed artifact manifest\n          </CardTitle>\n          <CardDescription>\n            Web, desktop, self-hosted, offline vault, and support bundle\n            artifacts with checksums and release signatures.\n          </CardDescription>\n        </div>\n        <Badge variant={getStatusVariant(report.status)}>\n          {report.status} {report.score}\n        </Badge>\n      </CardHeader>\n      <CardContent className=\"grid gap-4\">\n        <div className=\"grid gap-2 text-xs md:grid-cols-3 xl:grid-cols-6\">\n          <Metric label=\"Artifacts\" value={report.artifactCount} />\n          <Metric label=\"Signed\" value={report.signedArtifactCount} />\n          <Metric label=\"Unsigned\" value={report.unsignedArtifactCount} />\n          <Metric label=\"Blocked\" value={report.blockedArtifactCount} />\n          <Metric label=\"Bytes\" value={formatBytes(report.totalByteSize)} />\n          <Metric label=\"Key\" value={report.signing.configured ? \"set\" : \"missing\"} />\n        </div>\n\n        <div className=\"rounded-md border border-border bg-muted/20 p-3 text-xs\">\n          <div className=\"flex flex-wrap items-center gap-2\">\n            <Badge variant={report.signing.configured ? \"secondary\" : \"outline\"}>\n              <KeyRound className=\"size-3\" />\n              {report.signing.keyId}\n            </Badge>\n            <Badge variant=\"outline\">{report.checksum}</Badge>\n            <Badge variant={report.signature ? \"secondary\" : \"outline\"}>\n              <ShieldCheck className=\"size-3\" />\n              {report.signature ?? \"checksum-only\"}\n            </Badge>\n          </div>\n        </div>\n\n        <div className=\"grid gap-2 lg:grid-cols-2\">\n          {sortedRows.map((row) => (\n            <div\n              key={row.id}\n              className=\"rounded-md border border-border bg-muted/20 p-3 text-sm\"\n            >\n              <div className=\"flex items-start justify-between gap-3\">\n                <div className=\"font-medium\">{row.label}</div>\n                <Badge variant={getStatusVariant(row.status)}>\n                  {row.status}\n                </Badge>\n              </div>\n              <div className=\"mt-1 text-xs text-muted-foreground\">\n                {row.value}\n              </div>\n              <p className=\"mt-2 text-xs text-muted-foreground\">{row.detail}</p>\n              <p className=\"mt-2 text-xs\">{row.recommendation}</p>\n            </div>\n          ))}\n        </div>\n\n        <div className=\"grid gap-2 xl:grid-cols-5\">\n          {sortedArtifacts.map((artifact) => (\n            <div\n              key={artifact.id}\n              className=\"rounded-md border border-border bg-muted/20 p-3 text-xs\"\n            >\n              <div className=\"flex items-start justify-between gap-2\">\n                <div className=\"min-w-0\">\n                  <div className=\"truncate font-medium\">{artifact.label}</div>\n                  <div className=\"mt-1 flex flex-wrap gap-1\">\n                    <Badge variant=\"outline\">{formatKind(artifact.kind)}</Badge>\n                    <Badge variant={getStatusVariant(artifact.status)}>\n                      {artifact.status}\n                    </Badge>\n                  </div>\n                </div>\n              </div>\n              <div className=\"mt-2 grid gap-1 text-muted-foreground\">\n                <span className=\"truncate\">{artifact.fileName}</span>\n                <span>{formatBytes(artifact.byteSize)}</span>\n                <span className=\"truncate\">{artifact.checksum}</span>\n                <span>{artifact.signatureStatus}</span>\n              </div>\n            </div>\n          ))}\n        </div>\n\n        <div className=\"grid grid-cols-4 gap-2\">\n          <Button type=\"button\" size=\"sm\" variant=\"outline\" onClick={exportJson}>\n            <FileJson2 className=\"size-3.5\" />\n            JSON\n          </Button>\n          <Button type=\"button\" size=\"sm\" variant=\"outline\" onClick={exportCsv}>\n            <Download className=\"size-3.5\" />\n            CSV\n          </Button>\n          <Button\n            type=\"button\"\n            size=\"sm\"\n            variant=\"outline\"\n            onClick={exportMarkdown}\n          >\n            <Download className=\"size-3.5\" />\n            MD\n          </Button>\n          <Button\n            type=\"button\"\n            size=\"sm\"\n            variant=\"outline\"\n            onClick={copyMarkdown}\n          >\n            <ClipboardCopy className=\"size-3.5\" />\n            Copy\n          </Button>\n        </div>\n      </CardContent>\n    </Card>\n  );\n}\n\nfunction Metric({ label, value }: { label: string; value: number | string }) {\n  return (\n    <div className=\"rounded-md border border-border bg-muted/20 p-2\">\n      <div className=\"text-muted-foreground\">{label}</div>\n      <div className=\"mt-1 truncate font-mono text-sm text-foreground\">\n        {value}\n      </div>\n    </div>\n  );\n}\n\nfunction formatBytes(value: number) {\n  if (value < 1024) {\n    return `${value} B`;\n  }\n\n  if (value < 1024 * 1024) {\n    return `${(value / 1024).toFixed(1)} KB`;\n  }\n\n  return `${(value / 1024 / 1024).toFixed(1)} MB`;\n}\n\nfunction formatKind(kind: AdminReleaseArtifactKind) {\n  return kind.replace(\"-\", \" \");\n}\n\nfunction getStatusVariant(status: AdminReleaseArtifactManifestStatus) {\n  if (status === \"blocked\") {\n    return \"destructive\";\n  }\n\n  return status === \"review\" ? \"secondary\" : \"outline\";\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/components/admin-release-artifact-manifest-panel.tsx",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-components-admin-release-artifact-manifest-panel-tsx-6ea07ca173350ad9.mjs",
  "kind": "tsx",
  "hash": "6ea07ca173350ad9",
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
      "specifier": "@/features/admin/admin-release-artifact-manifest-export",
      "resolved_path": "src/features/admin/admin-release-artifact-manifest-export.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-release-artifact-manifest-export-ts-128db9274d09b79d.mjs",
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
    "source_path": "src/features/admin/components/admin-release-artifact-manifest-panel.tsx",
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
        "specifier": "@/features/admin/admin-release-artifact-manifest",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/admin/admin-release-artifact-manifest-export",
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
      "AdminReleaseArtifactManifestPanel"
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
