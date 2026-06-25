
export const dxSourceText = "const defaultRetentionDays = 30;\nconst maxRetentionDays = 365;\n\nexport function getPublicRouteAnalyticsRetentionDays(\n  env= process.env,\n) {\n  const value = Number(env.ESSENCE_PUBLIC_ROUTE_ANALYTICS_RETENTION_DAYS);\n\n  if (!Number.isFinite(value) || value <= 0) {\n    return defaultRetentionDays;\n  }\n\n  return Math.min(Math.round(value), maxRetentionDays);\n}\n\nexport function getPublicRouteAnalyticsRetentionDate(\n  createdAt,\n  retentionDays,\n) {\n  return new Date(createdAt.getTime() + retentionDays * 24 * 60 * 60 * 1000);\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/public-route-analytics/retention.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-public-route-analytics-retention-ts-a6d4fe8b428fb7a8.mjs",
  "kind": "ts",
  "hash": "a6d4fe8b428fb7a8",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": true,
  "transform_kind": "typescript-helper-runtime",
  "runtime_exports": [
    "getPublicRouteAnalyticsRetentionDays",
    "getPublicRouteAnalyticsRetentionDate"
  ],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/features/public-route-analytics/retention.ts",
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
    "static_imports": [],
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
      "getPublicRouteAnalyticsRetentionDays",
      "getPublicRouteAnalyticsRetentionDate"
    ],
    "jsx": false,
    "top_level_await": false,
    "full_nextjs_parity": false,
    "analysis_boundary": "Uses vendored Turbopack ECMAScript and selected Next transform behavior as compatibility references while emitting DX-owned source graph receipts."
  },
  "node_modules_required": false
});
export const dxRuntimeModule = Object.freeze({
  transformed: true,
  transformKind: "typescript-helper-runtime",
  exportNames: ["getPublicRouteAnalyticsRetentionDays","getPublicRouteAnalyticsRetentionDate"]
});
const defaultRetentionDays = 30;
const maxRetentionDays = 365;

export function getPublicRouteAnalyticsRetentionDays(
  env= process.env,
) {
  const value = Number(env.ESSENCE_PUBLIC_ROUTE_ANALYTICS_RETENTION_DAYS);

  if (!Number.isFinite(value) || value <= 0) {
    return defaultRetentionDays;
  }

  return Math.min(Math.round(value), maxRetentionDays);
}

export function getPublicRouteAnalyticsRetentionDate(
  createdAt,
  retentionDays,
) {
  return new Date(createdAt.getTime() + retentionDays * 24 * 60 * 60 * 1000);
}
export const dxRuntimeExports = Object.freeze({ getPublicRouteAnalyticsRetentionDays, getPublicRouteAnalyticsRetentionDate });
export const dxLinkedDependencies = Object.freeze([]);
export default dxSourceModule;
