import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-features-editor-components-prototype-preview-tsx-bdd4ceabc69abdbb.mjs";
import { dxSourceModule as dep1, dxRuntimeExports as dep1Runtime } from "./src-features-editor-prototype-preview-ts-703337c4f24faf12.mjs";
import { dxSourceModule as dep2, dxRuntimeExports as dep2Runtime } from "./src-features-files-actions-ts-61b6d2d04803c056.mjs";
import { dxSourceModule as dep3, dxRuntimeExports as dep3Runtime } from "./src-features-public-route-analytics-components-public-route-analytics-beacon-tsx-e625d5faf9617e0a.mjs";
export const dxSourceText = "import { notFound } from \"next/navigation\";\nimport { PrototypePreview } from \"@/features/editor/components/prototype-preview\";\nimport { getPrototypePreviewModel } from \"@/features/editor/prototype-preview\";\nimport { getSharedDesignFile } from \"@/features/files/actions\";\nimport { PublicRouteAnalyticsBeacon } from \"@/features/public-route-analytics/components/public-route-analytics-beacon\";\n\ntype SharedPrototypePageProps = {\n  params: Promise<{\n    token: string;\n  }>;\n};\n\nexport default async function SharedPrototypePage({\n  params,\n}: SharedPrototypePageProps) {\n  const { token } = await params;\n  const file = await getSharedDesignFile(token);\n\n  if (!file) {\n    notFound();\n  }\n\n  return (\n    <>\n      <PublicRouteAnalyticsBeacon routeKind=\"prototype\" token={token} />\n      <PrototypePreview\n        fileName={file.name}\n        model={getPrototypePreviewModel(file.document)}\n      />\n    </>\n  );\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/app/share/[token]/prototype/page.tsx",
  "chunk_output": ".dx/www/output/source-routes/share--token-prototype/modules/src-app-share--token--prototype-page-tsx-52ad4d87acdf954a.mjs",
  "kind": "tsx",
  "hash": "52ad4d87acdf954a",
  "dependencies": [
    {
      "specifier": "@/features/editor/components/prototype-preview",
      "resolved_path": "src/features/editor/components/prototype-preview.tsx",
      "chunk_output": ".dx/www/output/source-routes/share--token-prototype/modules/src-features-editor-components-prototype-preview-tsx-bdd4ceabc69abdbb.mjs",
      "kind": "tsx",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/editor/prototype-preview",
      "resolved_path": "src/features/editor/prototype-preview.ts",
      "chunk_output": ".dx/www/output/source-routes/share--token-prototype/modules/src-features-editor-prototype-preview-ts-703337c4f24faf12.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/files/actions",
      "resolved_path": "src/features/files/actions.ts",
      "chunk_output": ".dx/www/output/source-routes/share--token-prototype/modules/src-features-files-actions-ts-61b6d2d04803c056.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/public-route-analytics/components/public-route-analytics-beacon",
      "resolved_path": "src/features/public-route-analytics/components/public-route-analytics-beacon.tsx",
      "chunk_output": ".dx/www/output/source-routes/share--token-prototype/modules/src-features-public-route-analytics-components-public-route-analytics-beacon-tsx-e625d5faf9617e0a.mjs",
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
    "source_path": "src/app/share/[token]/prototype/page.tsx",
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
        "specifier": "@/features/editor/components/prototype-preview",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/editor/prototype-preview",
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
export const dxLinkedDependencies = Object.freeze([dep0, dep1, dep2, dep3]);
export default dxSourceModule;
