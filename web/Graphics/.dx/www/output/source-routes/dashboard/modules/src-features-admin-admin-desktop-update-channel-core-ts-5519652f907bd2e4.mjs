
export const dxSourceText = "import type { AdminDesktopReleaseConfig } from \"@/features/admin/admin-release-channels\";\n\nexport type AdminDesktopUpdateChannelStatus = \"ready\" | \"review\" | \"blocked\";\n\nexport type AdminDesktopUpdateChannelKind = \"beta\" | \"canary\" | \"stable\";\n\nexport type AdminDesktopRolloutHold = {\n  active: boolean;\n  reason: string | null;\n  expiresAt: string | null;\n};\n\nexport type AdminDesktopUpdateChannelSettings = {\n  activeChannel: AdminDesktopUpdateChannelKind;\n  currentVersion: string;\n  targetVersion: string;\n  minimumVersion: string;\n  feedUrl: string | null;\n  signatureRequired: boolean;\n  rolloutPercent: number;\n  hold: AdminDesktopRolloutHold;\n};\n\nexport type AdminDesktopUpdateChannelRow = {\n  id: string;\n  status: AdminDesktopUpdateChannelStatus;\n  label: string;\n  value: string;\n  detail: string;\n  recommendation: string;\n  artifactCount: number;\n};\n\nexport type AdminDesktopUpdateChannelPackage = {\n  channel: AdminDesktopUpdateChannelKind;\n  label: string;\n  status: AdminDesktopUpdateChannelStatus;\n  score: number;\n  currentVersion: string;\n  targetVersion: string;\n  minimumVersion: string;\n  rolloutPercent: number;\n  feedUrl: string | null;\n  hold: AdminDesktopRolloutHold;\n  rows: AdminDesktopUpdateChannelRow[];\n};\n\nexport type AdminDesktopUpdateChannelReport = {\n  generatedAt: string;\n  status: AdminDesktopUpdateChannelStatus;\n  score: number;\n  activeChannel: AdminDesktopUpdateChannelKind;\n  currentVersion: string;\n  targetVersion: string;\n  minimumVersion: string;\n  rolloutPercent: number;\n  holdActive: boolean;\n  holdReason: string | null;\n  readyCount: number;\n  reviewCount: number;\n  blockedCount: number;\n  packageCount: number;\n  commandCount: number;\n  rows: AdminDesktopUpdateChannelRow[];\n  packages: AdminDesktopUpdateChannelPackage[];\n  commands: string[];\n};\n\nexport function getDesktopUpdateSettings({\n  desktopReleaseConfig,\n  env,\n}: {\n  desktopReleaseConfig: AdminDesktopReleaseConfig;\n  env: Record<string, string | undefined>;\n}): AdminDesktopUpdateChannelSettings {\n  const currentVersion = desktopReleaseConfig.packageVersion;\n\n  return {\n    activeChannel: readChannel(env.ESSENCE_DESKTOP_UPDATE_CHANNEL),\n    currentVersion,\n    targetVersion:\n      readString(env.ESSENCE_DESKTOP_UPDATE_TARGET_VERSION) ?? currentVersion,\n    minimumVersion:\n      readString(env.ESSENCE_DESKTOP_UPDATE_MIN_VERSION) ?? currentVersion,\n    feedUrl: readString(env.ESSENCE_DESKTOP_UPDATE_FEED_URL),\n    signatureRequired: readBoolean(\n      env.ESSENCE_DESKTOP_UPDATE_SIGNATURE_REQUIRED,\n      true,\n    ),\n    rolloutPercent: readPercent(env.ESSENCE_DESKTOP_UPDATE_ROLLOUT_PERCENT),\n    hold: {\n      active: readBoolean(env.ESSENCE_DESKTOP_UPDATE_HOLD, false),\n      reason: readString(env.ESSENCE_DESKTOP_UPDATE_HOLD_REASON),\n      expiresAt: readString(env.ESSENCE_DESKTOP_UPDATE_HOLD_EXPIRES_AT),\n    },\n  };\n}\n\nexport function getRowsStatus(\n  statuses: AdminDesktopUpdateChannelStatus[],\n): AdminDesktopUpdateChannelStatus {\n  if (statuses.includes(\"blocked\")) {\n    return \"blocked\";\n  }\n\n  return statuses.includes(\"review\") ? \"review\" : \"ready\";\n}\n\nexport function getRowsScore(rows: AdminDesktopUpdateChannelRow[]) {\n  const blockedCount = rows.filter((row) => row.status === \"blocked\").length;\n  const reviewCount = rows.filter((row) => row.status === \"review\").length;\n\n  return Math.max(0, 100 - blockedCount * 18 - reviewCount * 6);\n}\n\nexport function compareVersions(left: string, right: string) {\n  const leftParts = parseVersion(left);\n  const rightParts = parseVersion(right);\n\n  for (let index = 0; index < 3; index += 1) {\n    const delta = leftParts[index] - rightParts[index];\n\n    if (delta !== 0) {\n      return delta > 0 ? 1 : -1;\n    }\n  }\n\n  return 0;\n}\n\nexport function uniqueStrings(items: string[]) {\n  return Array.from(new Set(items.filter(Boolean)));\n}\n\nfunction readChannel(value: string | undefined): AdminDesktopUpdateChannelKind {\n  if (value === \"beta\" || value === \"canary\" || value === \"stable\") {\n    return value;\n  }\n\n  return \"stable\";\n}\n\nfunction readString(value: string | undefined) {\n  return value?.trim() || null;\n}\n\nfunction readBoolean(value: string | undefined, fallback: boolean) {\n  if (!value) {\n    return fallback;\n  }\n\n  return [\"1\", \"true\", \"yes\", \"on\"].includes(value.trim().toLowerCase());\n}\n\nfunction readPercent(value: string | undefined) {\n  if (!value) {\n    return 100;\n  }\n\n  const parsed = Number(value);\n\n  return Number.isFinite(parsed) ? parsed : -1;\n}\n\nfunction parseVersion(value: string) {\n  const clean = value.trim().replace(/^[^\\d]*/, \"\");\n  const [major = \"0\", minor = \"0\", patch = \"0\"] = clean.split(\".\");\n\n  return [major, minor, patch].map((part) => {\n    const parsed = Number.parseInt(part, 10);\n\n    return Number.isFinite(parsed) ? parsed : 0;\n  }) as [number, number, number];\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-desktop-update-channel-core.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-desktop-update-channel-core-ts-5519652f907bd2e4.mjs",
  "kind": "ts",
  "hash": "5519652f907bd2e4",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": false,
  "transform_kind": "metadata-only",
  "runtime_exports": [],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/features/admin/admin-desktop-update-channel-core.ts",
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
        "specifier": "@/features/admin/admin-release-channels",
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
      "getDesktopUpdateSettings",
      "getRowsStatus",
      "getRowsScore",
      "compareVersions",
      "uniqueStrings"
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
