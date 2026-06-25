import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-features-editor-document-stats-ts-a755d567b350cb73.mjs";
import { dxSourceModule as dep1, dxRuntimeExports as dep1Runtime } from "./src-features-editor-exporters-svg-exporter-ts-efc4c8cf16561b46.mjs";
import { dxSourceModule as dep2, dxRuntimeExports as dep2Runtime } from "./src-features-files-actions-ts-61b6d2d04803c056.mjs";
import { dxSourceModule as dep3, dxRuntimeExports as dep3Runtime } from "./src-features-public-route-analytics-components-public-route-analytics-beacon-tsx-e625d5faf9617e0a.mjs";
import { dxSourceModule as dep4, dxRuntimeExports as dep4Runtime } from "./src-lib-forge-icons-lucide-react-tsx-b9b0a8debf22abe8.mjs";
export const dxSourceText = "import { notFound } from \"next/navigation\";\nimport { FileText, Layers3, Play } from \"lucide-react\";\nimport { exportDocumentToSvg } from \"@/features/editor/exporters/svg-exporter\";\nimport { getDocumentStats } from \"@/features/editor/document-stats\";\nimport { getSharedDesignFile } from \"@/features/files/actions\";\nimport { PublicRouteAnalyticsBeacon } from \"@/features/public-route-analytics/components/public-route-analytics-beacon\";\n\ntype EmbedPageProps = {\n  params: Promise<{\n    token: string;\n  }>;\n};\n\nexport default async function EmbedPage({ params }: EmbedPageProps) {\n  const { token } = await params;\n  const file = await getSharedDesignFile(token);\n\n  if (!file) {\n    notFound();\n  }\n\n  const svg = exportDocumentToSvg(file.document);\n  const stats = getDocumentStats(file.document);\n\n  return (\n    <main className=\"min-h-screen bg-background text-foreground\">\n      <PublicRouteAnalyticsBeacon routeKind=\"embed\" token={token} />\n      <div className=\"grid min-h-screen grid-rows-[minmax(0,1fr)_auto]\">\n        <section className=\"grid min-h-0 overflow-auto p-3\">\n          <div\n            className=\"m-auto max-h-full max-w-full overflow-auto rounded-md border border-border bg-card p-3 shadow-sm\"\n            dangerouslySetInnerHTML={{ __html: svg }}\n          />\n        </section>\n        <footer className=\"flex min-h-10 items-center justify-between gap-3 border-t border-border bg-card/95 px-3 py-2 text-xs\">\n          <div className=\"min-w-0\">\n            <div className=\"truncate font-medium\">{file.name}</div>\n            <div className=\"text-muted-foreground\">{stats.activePage.name}</div>\n          </div>\n          <div className=\"flex shrink-0 items-center gap-2 text-muted-foreground\">\n            <span className=\"inline-flex items-center gap-1\">\n              <FileText className=\"size-3.5\" />\n              {stats.pageCount}\n            </span>\n            <span className=\"inline-flex items-center gap-1\">\n              <Layers3 className=\"size-3.5\" />\n              {stats.layerCount}\n            </span>\n            <a\n              href={`/share/${token}/prototype`}\n              className=\"inline-flex items-center gap-1 rounded-sm border border-border px-2 py-1 text-foreground\"\n              target=\"_blank\"\n              rel=\"noreferrer\"\n            >\n              <Play className=\"size-3.5\" />\n              Prototype\n            </a>\n          </div>\n        </footer>\n      </div>\n    </main>\n  );\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/app/embed/[token]/page.tsx",
  "chunk_output": ".dx/www/output/source-routes/embed--token/modules/src-app-embed--token--page-tsx-b3d1f0542b0529be.mjs",
  "kind": "tsx",
  "hash": "b3d1f0542b0529be",
  "dependencies": [
    {
      "specifier": "@/features/editor/document-stats",
      "resolved_path": "src/features/editor/document-stats.ts",
      "chunk_output": ".dx/www/output/source-routes/embed--token/modules/src-features-editor-document-stats-ts-a755d567b350cb73.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/editor/exporters/svg-exporter",
      "resolved_path": "src/features/editor/exporters/svg-exporter.ts",
      "chunk_output": ".dx/www/output/source-routes/embed--token/modules/src-features-editor-exporters-svg-exporter-ts-efc4c8cf16561b46.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/files/actions",
      "resolved_path": "src/features/files/actions.ts",
      "chunk_output": ".dx/www/output/source-routes/embed--token/modules/src-features-files-actions-ts-61b6d2d04803c056.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/public-route-analytics/components/public-route-analytics-beacon",
      "resolved_path": "src/features/public-route-analytics/components/public-route-analytics-beacon.tsx",
      "chunk_output": ".dx/www/output/source-routes/embed--token/modules/src-features-public-route-analytics-components-public-route-analytics-beacon-tsx-e625d5faf9617e0a.mjs",
      "kind": "tsx",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "lucide-react",
      "resolved_path": "src/lib/forge/icons/lucide-react.tsx",
      "chunk_output": ".dx/www/output/source-routes/embed--token/modules/src-lib-forge-icons-lucide-react-tsx-b9b0a8debf22abe8.mjs",
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
    }
  ],
  "browser_executable": true,
  "source_transformed": false,
  "transform_kind": "metadata-only",
  "runtime_exports": [],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/app/embed/[token]/page.tsx",
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
    "directives": [],
    "static_imports": [
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
        "specifier": "@/features/editor/exporters/svg-exporter",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/editor/document-stats",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/files/actions",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/public-route-analytics/components/public-route-analytics-beacon",
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
    "export_names": [],
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
export const dxLinkedDependencies = Object.freeze([dep0, dep1, dep2, dep3, dep4]);
export default dxSourceModule;
