import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-features-admin-admin-publish-channel-manager-builders-ts-fdd67abfdb04aad9.mjs";
export const dxSourceText = "import { getStatusFromApproval } from \"@/features/admin/admin-publish-channel-manager-builders\";\nimport type {\n  AdminPublishChannel,\n  AdminPublishChannelRow,\n} from \"@/features/admin/admin-publish-channel-manager-types\";\n\nexport function toPublishChannelRows(\n  channel: AdminPublishChannel,\n): AdminPublishChannelRow[] {\n  return [\n    {\n      id: `${channel.id}-target`,\n      channelId: channel.id,\n      kind: channel.kind,\n      status: channel.status,\n      category: \"target\",\n      label: `${channel.label} target`,\n      targetUrl: channel.targetUrl,\n      detail: `Channel points to ${channel.targetUrl}.`,\n      recommendation: channel.recommendation,\n      latestAt: channel.latestAt,\n    },\n    {\n      id: `${channel.id}-smoke`,\n      channelId: channel.id,\n      kind: channel.kind,\n      status: channel.routeSmokeStatus,\n      category: \"smoke\",\n      label: channel.routeSmokeLabel,\n      targetUrl: channel.targetUrl,\n      detail: `Route smoke status is ${channel.routeSmokeStatus}.`,\n      recommendation: \"Run deployed route smoke before publishing this channel.\",\n      latestAt: channel.routeSmokeAt,\n    },\n    {\n      id: `${channel.id}-approval`,\n      channelId: channel.id,\n      kind: channel.kind,\n      status: getStatusFromApproval(channel.approvalState),\n      category: \"approval\",\n      label: \"Approval state\",\n      targetUrl: channel.targetUrl,\n      detail: `Release approval state is ${channel.approvalState}.`,\n      recommendation: \"Save a release approval snapshot with smoke artifacts.\",\n      latestAt: channel.latestAt,\n    },\n    {\n      id: `${channel.id}-rollback`,\n      channelId: channel.id,\n      kind: channel.kind,\n      status: channel.rollbackState === \"linked\" ? \"ready\" : \"review\",\n      category: \"rollback\",\n      label: \"Rollback link\",\n      targetUrl: channel.targetUrl,\n      detail: `Rollback state is ${channel.rollbackState}.`,\n      recommendation:\n        \"Keep named versions and deployment links with each published channel.\",\n      latestAt: channel.latestAt,\n    },\n  ];\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-publish-channel-manager-rows.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-publish-channel-manager-rows-ts-214f3986446ffe79.mjs",
  "kind": "ts",
  "hash": "214f3986446ffe79",
  "dependencies": [
    {
      "specifier": "@/features/admin/admin-publish-channel-manager-builders",
      "resolved_path": "src/features/admin/admin-publish-channel-manager-builders.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-publish-channel-manager-builders-ts-fdd67abfdb04aad9.mjs",
      "kind": "ts",
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
    "source_path": "src/features/admin/admin-publish-channel-manager-rows.ts",
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
        "specifier": "@/features/admin/admin-publish-channel-manager-builders",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/admin/admin-publish-channel-manager-types",
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
      "toPublishChannelRows"
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
export const dxLinkedDependencies = Object.freeze([dep0]);
export default dxSourceModule;
