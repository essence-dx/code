
export const dxSourceText = "const dxCreateElement = (tag, props = {}, ...children) => Object.freeze({ kind: \"dx.element\", tag, props: Object.freeze(props), children: Object.freeze(children) });\nexport function PublicRouteAnalyticsBeacon({\n  routeKind,\n  token,\n}) {\n  return \"null\";\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/public-route-analytics/components/public-route-analytics-beacon.tsx",
  "chunk_output": ".dx/www/output/source-routes/share--token-prototype/modules/src-features-public-route-analytics-components-public-route-analytics-beacon-tsx-e625d5faf9617e0a.mjs",
  "kind": "tsx",
  "hash": "e625d5faf9617e0a",
  "dependencies": [
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
  "source_transformed": true,
  "transform_kind": "tsx-component-runtime",
  "runtime_exports": [
    "PublicRouteAnalyticsBeacon"
  ],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/features/public-route-analytics/components/public-route-analytics-beacon.tsx",
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
        "specifier": "@/features/public-route-analytics/types",
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
      "PublicRouteAnalyticsBeacon"
    ],
    "jsx": true,
    "top_level_await": false,
    "full_nextjs_parity": false,
    "analysis_boundary": "Uses vendored Turbopack ECMAScript and selected Next transform behavior as compatibility references while emitting DX-owned source graph receipts."
  },
  "node_modules_required": false
});
export const dxRuntimeModule = Object.freeze({
  transformed: true,
  transformKind: "tsx-component-runtime",
  exportNames: ["PublicRouteAnalyticsBeacon"]
});
const dxCreateElement = (tag, props = {}, ...children) => Object.freeze({ kind: "dx.element", tag, props: Object.freeze(props), children: Object.freeze(children) });
export function PublicRouteAnalyticsBeacon({
  routeKind,
  token,
}) {
  return "null";
}
export const dxRuntimeExports = Object.freeze({ PublicRouteAnalyticsBeacon });
export const dxLinkedDependencies = Object.freeze([]);
export default dxSourceModule;
