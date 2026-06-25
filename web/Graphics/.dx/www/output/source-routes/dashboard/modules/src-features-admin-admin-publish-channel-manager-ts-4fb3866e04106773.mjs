import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-features-admin-admin-publish-channel-manager-builders-ts-fdd67abfdb04aad9.mjs";
import { dxSourceModule as dep1, dxRuntimeExports as dep1Runtime } from "./src-features-admin-admin-publish-channel-manager-rows-ts-214f3986446ffe79.mjs";
import { dxSourceModule as dep2, dxRuntimeExports as dep2Runtime } from "./src-features-editor-prototype-flow-diagnostics-ts-ea80d97ae57e141d.mjs";
export const dxSourceText = "import { getPrototypeFlowDiagnostics } from \"@/features/editor/prototype-flow-diagnostics\";\nimport {\n  sortPublishChannels,\n  toPrototypeGapChannel,\n  toReleaseChannel,\n  toShareChannel,\n} from \"@/features/admin/admin-publish-channel-manager-builders\";\nimport { toPublishChannelRows } from \"@/features/admin/admin-publish-channel-manager-rows\";\nimport type {\n  AdminPublishChannelManagerInput,\n  AdminPublishChannelManagerReport,\n} from \"@/features/admin/admin-publish-channel-manager-types\";\n\nexport type {\n  AdminPublishApprovalState,\n  AdminPublishChannel,\n  AdminPublishChannelFile,\n  AdminPublishChannelKind,\n  AdminPublishChannelManagerInput,\n  AdminPublishChannelManagerReport,\n  AdminPublishChannelRow,\n  AdminPublishChannelShare,\n  AdminPublishChannelStatus,\n  AdminPublishRollbackState,\n} from \"@/features/admin/admin-publish-channel-manager-types\";\n\nexport function getAdminPublishChannelManagerReport({\n  baseUrl,\n  files,\n  generatedAt = new Date().toISOString(),\n  now = Date.now(),\n  productionDeploySmoke,\n  releaseApprovalSnapshots,\n  rollbackReadiness,\n  shares,\n}: AdminPublishChannelManagerInput): AdminPublishChannelManagerReport {\n  const activeFiles = files.filter((file) => !file.trashedAt);\n  const filesById = new Map(activeFiles.map((file) => [file.fileId, file]));\n  const latestApproval = releaseApprovalSnapshots[0] ?? null;\n  const activeShares = shares.filter((share) => !share.disabledAt);\n  const prototypeShareFileIds = new Set(\n    activeShares\n      .filter((share) => share.permissionPreset === \"prototype\")\n      .map((share) => share.fileId),\n  );\n  const channels = [\n    ...activeShares.map((share) =>\n      toShareChannel({\n        baseUrl,\n        file: filesById.get(share.fileId),\n        latestApproval,\n        now,\n        productionDeploySmoke,\n        rollbackReadiness,\n        share,\n      }),\n    ),\n    ...activeFiles\n      .filter((file) => {\n        const prototype = getPrototypeFlowDiagnostics(file.document);\n        return prototype.hotspotCount > 0 && !prototypeShareFileIds.has(file.fileId);\n      })\n      .map((file) =>\n        toPrototypeGapChannel({\n          baseUrl,\n          file,\n          latestApproval,\n          productionDeploySmoke,\n          rollbackReadiness,\n        }),\n      ),\n    toReleaseChannel({\n      baseUrl,\n      latestApproval,\n      productionDeploySmoke,\n      rollbackReadiness,\n    }),\n  ].sort(sortPublishChannels);\n  const rows = channels.flatMap(toPublishChannelRows);\n  const blockedCount = channels.filter((channel) => channel.status === \"blocked\").length;\n  const reviewCount = channels.filter((channel) => channel.status === \"review\").length;\n  const readyCount = channels.filter((channel) => channel.status === \"ready\").length;\n\n  return {\n    generatedAt,\n    status: blockedCount > 0 ? \"blocked\" : reviewCount > 0 ? \"review\" : \"ready\",\n    score: Math.max(0, 100 - blockedCount * 20 - reviewCount * 7),\n    channelCount: channels.length,\n    readyCount,\n    reviewCount,\n    blockedCount,\n    prototypeChannelCount: channels.filter((channel) => channel.kind === \"prototype\").length,\n    shareChannelCount: channels.filter((channel) => channel.kind === \"share\").length,\n    siteChannelCount: channels.filter((channel) => channel.kind === \"site\").length,\n    releaseChannelCount: channels.filter((channel) => channel.kind === \"release\").length,\n    staleChannelCount: channels.filter((channel) =>\n      channel.expiresAt ? new Date(channel.expiresAt).getTime() < now : false,\n    ).length,\n    approvalReadyCount: channels.filter((channel) => channel.approvalState === \"approved\").length,\n    rollbackLinkedCount: channels.filter((channel) => channel.rollbackState === \"linked\").length,\n    routeSmokeBlockedCount: channels.filter((channel) => channel.routeSmokeStatus === \"blocked\").length,\n    channels,\n    rows,\n    commands: getPublishChannelCommands(),\n  };\n}\n\nfunction getPublishChannelCommands() {\n  return [\n    \"Run deployed route smoke before promoting prototype, share, or handoff links.\",\n    \"Save a release approval snapshot after smoke, rollback, and channel targets are reviewed.\",\n    \"Create named versions for files behind public channels before publishing.\",\n    \"Expire or disable public channels that no longer belong to an active handoff.\",\n  ];\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-publish-channel-manager.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-publish-channel-manager-ts-4fb3866e04106773.mjs",
  "kind": "ts",
  "hash": "4fb3866e04106773",
  "dependencies": [
    {
      "specifier": "@/features/admin/admin-publish-channel-manager-builders",
      "resolved_path": "src/features/admin/admin-publish-channel-manager-builders.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-publish-channel-manager-builders-ts-fdd67abfdb04aad9.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/admin/admin-publish-channel-manager-rows",
      "resolved_path": "src/features/admin/admin-publish-channel-manager-rows.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-publish-channel-manager-rows-ts-214f3986446ffe79.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/editor/prototype-flow-diagnostics",
      "resolved_path": "src/features/editor/prototype-flow-diagnostics.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-editor-prototype-flow-diagnostics-ts-ea80d97ae57e141d.mjs",
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
    "source_path": "src/features/admin/admin-publish-channel-manager.ts",
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
        "specifier": "@/features/editor/prototype-flow-diagnostics",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/admin/admin-publish-channel-manager-builders",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/admin/admin-publish-channel-manager-rows",
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
      "getAdminPublishChannelManagerReport"
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
export const dxLinkedDependencies = Object.freeze([dep0, dep1, dep2]);
export default dxSourceModule;
