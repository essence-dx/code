
export const dxSourceText = "import type {\n  AdminPublicRouteAnalyticsEvent,\n  AdminPublicRouteAnalyticsStatus,\n} from \"@/features/admin/admin-public-route-analytics-types\";\n\nexport const publicRouteAnalyticsStatusWeight: Record<\n  AdminPublicRouteAnalyticsStatus,\n  number\n> = {\n  blocked: 0,\n  review: 1,\n  ready: 2,\n};\n\nexport function getWorstPublicRouteAnalyticsStatus(\n  statuses: AdminPublicRouteAnalyticsStatus[],\n  fallback: AdminPublicRouteAnalyticsStatus = \"ready\",\n) {\n  return (\n    statuses.sort(\n      (left, right) =>\n        publicRouteAnalyticsStatusWeight[left] -\n        publicRouteAnalyticsStatusWeight[right],\n    )[0] ?? fallback\n  );\n}\n\nexport function getLatestPublicRouteAnalyticsIso(\n  left: string | null,\n  right: string | null,\n) {\n  if (!left) {\n    return right;\n  }\n\n  if (!right) {\n    return left;\n  }\n\n  return new Date(left).getTime() > new Date(right).getTime() ? left : right;\n}\n\nexport function getEarliestPublicRouteAnalyticsIso(\n  left: string | null,\n  right: string | null,\n) {\n  if (!left) {\n    return right;\n  }\n\n  if (!right) {\n    return left;\n  }\n\n  return new Date(left).getTime() < new Date(right).getTime() ? left : right;\n}\n\nexport function uniqueSortedPublicRouteValues(values: (string | null)[]) {\n  return Array.from(\n    new Set(values.map((value) => value?.trim()).filter(Boolean) as string[]),\n  ).sort((left, right) => left.localeCompare(right));\n}\n\nexport function getEventTime(event: AdminPublicRouteAnalyticsEvent) {\n  return new Date(event.createdAt).getTime();\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-public-route-analytics-utils.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-public-route-analytics-utils-ts-b09cb0ba7a5d7bf6.mjs",
  "kind": "ts",
  "hash": "b09cb0ba7a5d7bf6",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": false,
  "transform_kind": "metadata-only",
  "runtime_exports": [],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/features/admin/admin-public-route-analytics-utils.ts",
    "source_kind": "ts",
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
        "specifier": "@/features/admin/admin-public-route-analytics-types",
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
      "getWorstPublicRouteAnalyticsStatus",
      "getLatestPublicRouteAnalyticsIso",
      "getEarliestPublicRouteAnalyticsIso",
      "uniqueSortedPublicRouteValues",
      "getEventTime",
      "publicRouteAnalyticsStatusWeight"
    ],
    "jsx": false,
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
export const dxLinkedDependencies = Object.freeze([]);
export default dxSourceModule;
