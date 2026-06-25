import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-features-admin-admin-desktop-update-channel-core-ts-5519652f907bd2e4.mjs";
export const dxSourceText = "import {\n  compareVersions,\n  getRowsScore,\n  getRowsStatus,\n  type AdminDesktopUpdateChannelKind,\n  type AdminDesktopUpdateChannelPackage,\n  type AdminDesktopUpdateChannelRow,\n  type AdminDesktopUpdateChannelSettings,\n} from \"@/features/admin/admin-desktop-update-channel-core\";\nimport type {\n  AdminDesktopReleaseConfig,\n  AdminReleaseChannelsReport,\n} from \"@/features/admin/admin-release-channels\";\nimport type { AdminReleaseArtifactManifestReport } from \"@/features/admin/admin-release-artifact-manifest\";\nimport type { AdminOperatorRehearsalReport } from \"@/features/admin/admin-operator-rehearsals\";\n\nexport function getDesktopUpdatePackages({\n  desktopReleaseConfig,\n  operatorRehearsals,\n  releaseArtifactManifest,\n  releaseChannels,\n  settings,\n}: {\n  desktopReleaseConfig: AdminDesktopReleaseConfig;\n  operatorRehearsals: AdminOperatorRehearsalReport;\n  releaseArtifactManifest: AdminReleaseArtifactManifestReport;\n  releaseChannels: AdminReleaseChannelsReport;\n  settings: AdminDesktopUpdateChannelSettings;\n}): AdminDesktopUpdateChannelPackage[] {\n  return ([\"stable\", \"beta\", \"canary\"] as const).map((channel) =>\n    createUpdatePackage({\n      channel,\n      desktopReleaseConfig,\n      label: `${formatChannel(channel)} desktop channel`,\n      operatorRehearsals,\n      releaseArtifactManifest,\n      releaseChannels,\n      settings: {\n        ...settings,\n        rolloutPercent:\n          settings.activeChannel === channel ? settings.rolloutPercent : 0,\n      },\n    }),\n  );\n}\n\nfunction createUpdatePackage({\n  channel,\n  desktopReleaseConfig,\n  label,\n  operatorRehearsals,\n  releaseArtifactManifest,\n  releaseChannels,\n  settings,\n}: {\n  channel: AdminDesktopUpdateChannelKind;\n  desktopReleaseConfig: AdminDesktopReleaseConfig;\n  label: string;\n  operatorRehearsals: AdminOperatorRehearsalReport;\n  releaseArtifactManifest: AdminReleaseArtifactManifestReport;\n  releaseChannels: AdminReleaseChannelsReport;\n  settings: AdminDesktopUpdateChannelSettings;\n}): AdminDesktopUpdateChannelPackage {\n  const desktopReleasePackage = releaseChannels.packages.find(\n    (releasePackage) => releasePackage.channel === \"desktop\",\n  );\n  const desktopManifest = releaseArtifactManifest.artifacts.find(\n    (artifact) => artifact.kind === \"desktop\",\n  );\n  const desktopRehearsal = operatorRehearsals.runs.find(\n    (run) => run.kind === \"desktop-handoff\",\n  );\n  const rows = [\n    getStableMetadataRow({ channel, desktopReleaseConfig, settings }),\n    getVersionParityRow(desktopReleaseConfig, settings),\n    getFeedReadinessRow({ channel, desktopReleaseConfig, settings }),\n    getRolloutHoldRow(settings),\n    {\n      id: `${channel}-desktop-release-package`,\n      status: desktopReleasePackage?.status ?? \"blocked\",\n      label: \"Desktop release package\",\n      value: desktopReleasePackage?.packageName ?? \"missing\",\n      detail:\n        desktopReleasePackage?.rows\n          .map((row) => `${row.label}: ${row.detail}`)\n          .join(\" \") ?? \"No desktop release package is available.\",\n      recommendation:\n        \"Keep the desktop release package ready before publishing update channel metadata.\",\n      artifactCount: desktopReleasePackage?.artifacts.length ?? 0,\n    },\n    {\n      id: `${channel}-desktop-manifest-artifact`,\n      status: desktopManifest?.status ?? \"blocked\",\n      label: \"Signed desktop manifest\",\n      value: desktopManifest?.signatureStatus ?? \"missing\",\n      detail:\n        desktopManifest?.detail ??\n        \"The signed release manifest does not include a desktop artifact.\",\n      recommendation:\n        \"Archive the desktop manifest checksum and signature with update metadata.\",\n      artifactCount: desktopManifest ? 1 : 0,\n    },\n    {\n      id: `${channel}-desktop-rehearsal`,\n      status: desktopRehearsal?.status ?? \"review\",\n      label: \"Desktop handoff rehearsal\",\n      value: desktopRehearsal ? `${desktopRehearsal.score}/100` : \"missing\",\n      detail:\n        desktopRehearsal?.objective ??\n        \"Desktop package handoff rehearsal evidence is unavailable.\",\n      recommendation:\n        \"Run or review the desktop package handoff drill before increasing rollout.\",\n      artifactCount: desktopRehearsal?.steps.length ?? 0,\n    },\n  ] satisfies AdminDesktopUpdateChannelRow[];\n\n  return {\n    channel,\n    label,\n    status: getRowsStatus(rows.map((row) => row.status)),\n    score: getRowsScore(rows),\n    currentVersion: settings.currentVersion,\n    targetVersion: settings.targetVersion,\n    minimumVersion: settings.minimumVersion,\n    rolloutPercent: settings.rolloutPercent,\n    feedUrl: settings.feedUrl,\n    hold: settings.hold,\n    rows,\n  };\n}\n\nfunction getStableMetadataRow({\n  channel,\n  desktopReleaseConfig,\n  settings,\n}: {\n  channel: AdminDesktopUpdateChannelKind;\n  desktopReleaseConfig: AdminDesktopReleaseConfig;\n  settings: AdminDesktopUpdateChannelSettings;\n}): AdminDesktopUpdateChannelRow {\n  const hasMetadata = Boolean(\n    desktopReleaseConfig.productName &&\n      desktopReleaseConfig.identifier &&\n      settings.currentVersion &&\n      settings.targetVersion,\n  );\n\n  return {\n    id: `${channel}-update-metadata`,\n    status: hasMetadata ? \"ready\" : \"blocked\",\n    label: \"Stable update metadata\",\n    value: `${desktopReleaseConfig.productName ?? \"missing\"} / ${desktopReleaseConfig.identifier ?? \"missing\"}`,\n    detail: hasMetadata\n      ? `${desktopReleaseConfig.productName} ${settings.targetVersion} is mapped to ${channel} with identifier ${desktopReleaseConfig.identifier}.`\n      : \"Desktop update metadata needs product name, identifier, current version, and target version.\",\n    recommendation:\n      \"Keep product name, app identifier, active channel, current version, and target version in the release record.\",\n    artifactCount: hasMetadata ? 1 : 0,\n  };\n}\n\nfunction getVersionParityRow(\n  desktopReleaseConfig: AdminDesktopReleaseConfig,\n  settings: AdminDesktopUpdateChannelSettings,\n): AdminDesktopUpdateChannelRow {\n  const versions = [\n    desktopReleaseConfig.packageJsonVersion,\n    desktopReleaseConfig.tauriConfigVersion,\n    desktopReleaseConfig.cargoPackageVersion,\n  ].filter((version): version is string => Boolean(version));\n  const uniqueVersions = new Set(versions);\n  const targetComparison = compareVersions(\n    settings.targetVersion,\n    settings.currentVersion,\n  );\n  const minimumComparison = compareVersions(\n    settings.currentVersion,\n    settings.minimumVersion,\n  );\n  const parityReady = versions.length === 3 && uniqueVersions.size === 1;\n\n  return {\n    id: \"desktop-update-version-parity\",\n    status:\n      versions.length < 3 || targetComparison < 0 || minimumComparison < 0\n        ? \"blocked\"\n        : parityReady\n          ? \"ready\"\n          : \"review\",\n    label: \"Package version comparison\",\n    value: `current ${settings.currentVersion} -> target ${settings.targetVersion}`,\n    detail: `package.json ${desktopReleaseConfig.packageJsonVersion ?? \"missing\"}, tauri.conf ${desktopReleaseConfig.tauriConfigVersion ?? \"missing\"}, Cargo ${desktopReleaseConfig.cargoPackageVersion ?? \"missing\"}, minimum ${settings.minimumVersion}.`,\n    recommendation:\n      \"Keep package.json, tauri.conf.json, and Cargo.toml versions aligned, and never set target or minimum versions ahead of the current package unexpectedly.\",\n    artifactCount: versions.length,\n  };\n}\n\nfunction getFeedReadinessRow({\n  channel,\n  desktopReleaseConfig,\n  settings,\n}: {\n  channel: AdminDesktopUpdateChannelKind;\n  desktopReleaseConfig: AdminDesktopReleaseConfig;\n  settings: AdminDesktopUpdateChannelSettings;\n}): AdminDesktopUpdateChannelRow {\n  const automaticUpdates = Boolean(settings.feedUrl);\n  const updaterReady = automaticUpdates && desktopReleaseConfig.updaterPluginPresent;\n\n  return {\n    id: `${channel}-update-feed`,\n    status: updaterReady ? \"ready\" : \"review\",\n    label: \"Update feed and signature\",\n    value: settings.feedUrl ?? \"manual package handoff\",\n    detail: automaticUpdates\n      ? `Update feed is configured; Tauri updater plugin is ${desktopReleaseConfig.updaterPluginPresent ? \"present\" : \"not installed\"}. Signature requirement is ${settings.signatureRequired ? \"enabled\" : \"not enabled\"}.`\n      : \"No automatic desktop update feed is configured; operators must use signed package handoff.\",\n    recommendation:\n      \"Configure ESSENCE_DESKTOP_UPDATE_FEED_URL and add tauri-plugin-updater before relying on automatic desktop updates.\",\n    artifactCount: updaterReady ? 2 : automaticUpdates ? 1 : 0,\n  };\n}\n\nfunction getRolloutHoldRow(\n  settings: AdminDesktopUpdateChannelSettings,\n): AdminDesktopUpdateChannelRow {\n  const invalidRollout = settings.rolloutPercent < 0 || settings.rolloutPercent > 100;\n  const missingHoldReason = settings.hold.active && !settings.hold.reason;\n\n  return {\n    id: \"desktop-update-rollout-hold\",\n    status: invalidRollout ? \"blocked\" : missingHoldReason ? \"review\" : \"ready\",\n    label: \"Rollout hold controls\",\n    value: settings.hold.active\n      ? `held at ${settings.rolloutPercent}%`\n      : `${settings.rolloutPercent}% rollout`,\n    detail: settings.hold.active\n      ? `Desktop rollout is held${settings.hold.reason ? ` because ${settings.hold.reason}` : \" without a recorded reason\"}.`\n      : \"Desktop rollout is not held by environment controls.\",\n    recommendation:\n      \"Use ESSENCE_DESKTOP_UPDATE_HOLD, ESSENCE_DESKTOP_UPDATE_HOLD_REASON, and ESSENCE_DESKTOP_UPDATE_ROLLOUT_PERCENT to control desktop rollout exposure.\",\n    artifactCount: settings.hold.active ? 2 : 1,\n  };\n}\n\nfunction formatChannel(channel: AdminDesktopUpdateChannelKind) {\n  return channel.charAt(0).toUpperCase() + channel.slice(1);\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-desktop-update-channel-packages.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-desktop-update-channel-packages-ts-a7cb0c3758904aef.mjs",
  "kind": "ts",
  "hash": "a7cb0c3758904aef",
  "dependencies": [
    {
      "specifier": "@/features/admin/admin-desktop-update-channel-core",
      "resolved_path": "src/features/admin/admin-desktop-update-channel-core.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-desktop-update-channel-core-ts-5519652f907bd2e4.mjs",
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
    "source_path": "src/features/admin/admin-desktop-update-channel-packages.ts",
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
      "getDesktopUpdatePackages"
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
