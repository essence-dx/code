import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-features-admin-admin-desktop-update-channel-core-ts-5519652f907bd2e4.mjs";
import { dxSourceModule as dep1, dxRuntimeExports as dep1Runtime } from "./src-features-admin-admin-desktop-update-channel-packages-ts-a7cb0c3758904aef.mjs";
export const dxSourceText = "import {\n  getDesktopUpdateSettings,\n  getRowsStatus,\n  uniqueStrings,\n  type AdminDesktopUpdateChannelReport,\n} from \"@/features/admin/admin-desktop-update-channel-core\";\nimport { getDesktopUpdatePackages } from \"@/features/admin/admin-desktop-update-channel-packages\";\nimport type { AdminDesktopReleaseConfig } from \"@/features/admin/admin-release-channels\";\nimport type { AdminReleaseChannelsReport } from \"@/features/admin/admin-release-channels\";\nimport type { AdminReleaseArtifactManifestReport } from \"@/features/admin/admin-release-artifact-manifest\";\nimport type { AdminOperatorRehearsalReport } from \"@/features/admin/admin-operator-rehearsals\";\n\nexport type {\n  AdminDesktopRolloutHold,\n  AdminDesktopUpdateChannelKind,\n  AdminDesktopUpdateChannelPackage,\n  AdminDesktopUpdateChannelReport,\n  AdminDesktopUpdateChannelRow,\n  AdminDesktopUpdateChannelSettings,\n  AdminDesktopUpdateChannelStatus,\n} from \"@/features/admin/admin-desktop-update-channel-core\";\n\nexport type AdminDesktopUpdateChannelInput = {\n  desktopReleaseConfig: AdminDesktopReleaseConfig;\n  env?: Record<string, string | undefined>;\n  generatedAt?: string;\n  operatorRehearsals: AdminOperatorRehearsalReport;\n  releaseArtifactManifest: AdminReleaseArtifactManifestReport;\n  releaseChannels: AdminReleaseChannelsReport;\n};\n\nexport function getAdminDesktopUpdateChannelReport({\n  desktopReleaseConfig,\n  env = {},\n  generatedAt = new Date().toISOString(),\n  operatorRehearsals,\n  releaseArtifactManifest,\n  releaseChannels,\n}: AdminDesktopUpdateChannelInput): AdminDesktopUpdateChannelReport {\n  const settings = getDesktopUpdateSettings({ desktopReleaseConfig, env });\n  const packages = getDesktopUpdatePackages({\n    desktopReleaseConfig,\n    releaseArtifactManifest,\n    releaseChannels,\n    operatorRehearsals,\n    settings,\n  });\n  const rows = packages.flatMap((updatePackage) => updatePackage.rows);\n  const readyCount = rows.filter((row) => row.status === \"ready\").length;\n  const reviewCount = rows.filter((row) => row.status === \"review\").length;\n  const blockedCount = rows.filter((row) => row.status === \"blocked\").length;\n  const commands = uniqueStrings(\n    [\n      \"bun run tauri:build\",\n      \"Export Admin > Release desktop update channel readiness JSON.\",\n      settings.feedUrl\n        ? `Verify desktop update feed at ${settings.feedUrl}`\n        : \"Set ESSENCE_DESKTOP_UPDATE_FEED_URL before publishing automatic desktop updates.\",\n      settings.hold.active\n        ? \"Keep desktop rollout hold active until the release manager clears it.\"\n        : \"Save a release approval snapshot before increasing desktop rollout percentage.\",\n    ].filter(Boolean),\n  );\n\n  return {\n    generatedAt,\n    status: getRowsStatus(rows.map((row) => row.status)),\n    score: Math.max(0, 100 - blockedCount * 18 - reviewCount * 6),\n    activeChannel: settings.activeChannel,\n    currentVersion: settings.currentVersion,\n    targetVersion: settings.targetVersion,\n    minimumVersion: settings.minimumVersion,\n    rolloutPercent: settings.rolloutPercent,\n    holdActive: settings.hold.active,\n    holdReason: settings.hold.reason,\n    readyCount,\n    reviewCount,\n    blockedCount,\n    packageCount: packages.length,\n    commandCount: commands.length,\n    rows,\n    packages,\n    commands,\n  };\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-desktop-update-channel.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-desktop-update-channel-ts-e4385a36bdf0e82d.mjs",
  "kind": "ts",
  "hash": "e4385a36bdf0e82d",
  "dependencies": [
    {
      "specifier": "@/features/admin/admin-desktop-update-channel-core",
      "resolved_path": "src/features/admin/admin-desktop-update-channel-core.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-desktop-update-channel-core-ts-5519652f907bd2e4.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/admin/admin-desktop-update-channel-packages",
      "resolved_path": "src/features/admin/admin-desktop-update-channel-packages.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-desktop-update-channel-packages-ts-a7cb0c3758904aef.mjs",
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
    "source_path": "src/features/admin/admin-desktop-update-channel.ts",
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
        "specifier": "@/features/admin/admin-desktop-update-channel-core",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/admin/admin-desktop-update-channel-packages",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/admin/admin-release-channels",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/admin/admin-release-channels",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/admin/admin-release-artifact-manifest",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/admin/admin-operator-rehearsals",
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
      "getAdminDesktopUpdateChannelReport"
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
export const dxLinkedDependencies = Object.freeze([dep0, dep1]);
export default dxSourceModule;
