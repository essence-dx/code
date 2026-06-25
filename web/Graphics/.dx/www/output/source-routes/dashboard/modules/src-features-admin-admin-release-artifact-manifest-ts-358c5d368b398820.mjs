import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-features-admin-admin-accessibility-privacy-release-export-ts-79c2d7c8535505e8.mjs";
import { dxSourceModule as dep1, dxRuntimeExports as dep1Runtime } from "./src-features-admin-admin-offline-vault-export-ts-c5a449b3c1264f75.mjs";
import { dxSourceModule as dep2, dxRuntimeExports as dep2Runtime } from "./src-features-admin-admin-release-channels-export-ts-491a92fe2a073ee4.mjs";
import { dxSourceModule as dep3, dxRuntimeExports as dep3Runtime } from "./src-features-admin-admin-self-hosted-backup-readiness-export-ts-fd7b67349e5c23d3.mjs";
import { dxSourceModule as dep4, dxRuntimeExports as dep4Runtime } from "./src-features-admin-admin-support-bundle-export-ts-3bfd84759f23cb09.mjs";
import { dxSourceModule as dep5, dxRuntimeExports as dep5Runtime } from "./src-features-editor-production-deploy-smoke-ts-348cb06733cd614e.mjs";
export const dxSourceText = "import { createHash, createHmac } from \"node:crypto\";\nimport type { AccessibilityPrivacyReleaseChecklist } from \"@/features/admin/admin-accessibility-privacy-release\";\nimport {\n  getAccessibilityPrivacyReleaseJson,\n  getAccessibilityPrivacyReleaseMarkdown,\n} from \"@/features/admin/admin-accessibility-privacy-release-export\";\nimport type { AdminOfflineVaultPackage } from \"@/features/admin/admin-offline-vault\";\nimport {\n  getAdminOfflineVaultJson,\n  getAdminOfflineVaultMarkdown,\n} from \"@/features/admin/admin-offline-vault-export\";\nimport type { AdminReleaseChannelsReport } from \"@/features/admin/admin-release-channels\";\nimport {\n  getAdminReleaseChannelsJson,\n  getAdminReleaseChannelsMarkdown,\n} from \"@/features/admin/admin-release-channels-export\";\nimport type { AdminSelfHostedBackupReadinessReport } from \"@/features/admin/admin-self-hosted-backup-readiness\";\nimport { getAdminSelfHostedBackupReadinessMarkdown } from \"@/features/admin/admin-self-hosted-backup-readiness-export\";\nimport type { AdminSupportBundle } from \"@/features/admin/admin-support-bundle\";\nimport {\n  getAdminSupportBundleJson,\n  getAdminSupportBundleMarkdown,\n} from \"@/features/admin/admin-support-bundle-export\";\nimport type { ProductionDeploySmokeReport } from \"@/features/editor/production-deploy-smoke\";\nimport { getProductionDeploySmokeMarkdown } from \"@/features/editor/production-deploy-smoke\";\n\nexport type AdminReleaseArtifactKind =\n  | \"desktop\"\n  | \"offline-vault\"\n  | \"self-hosted\"\n  | \"support-bundle\"\n  | \"web\";\n\nexport type AdminReleaseArtifactManifestStatus =\n  | \"ready\"\n  | \"review\"\n  | \"blocked\";\n\nexport type AdminReleaseArtifactSignatureStatus =\n  | \"signed\"\n  | \"unsigned\"\n  | \"verification-only\";\n\nexport type AdminReleaseArtifact = {\n  id: string;\n  kind: AdminReleaseArtifactKind;\n  label: string;\n  fileName: string;\n  mediaType: string;\n  status: AdminReleaseArtifactManifestStatus;\n  score: number;\n  required: boolean;\n  generatedAt: string;\n  byteSize: number;\n  checksum: string;\n  signature: string | null;\n  signatureStatus: AdminReleaseArtifactSignatureStatus;\n  sourceStatus: string;\n  sourceScore: number;\n  detail: string;\n  recommendation: string;\n};\n\nexport type AdminReleaseArtifactManifestRow = {\n  id: string;\n  status: AdminReleaseArtifactManifestStatus;\n  label: string;\n  value: string;\n  detail: string;\n  recommendation: string;\n};\n\nexport type AdminReleaseArtifactManifestReport = {\n  generatedAt: string;\n  manifestId: string;\n  status: AdminReleaseArtifactManifestStatus;\n  score: number;\n  artifactCount: number;\n  signedArtifactCount: number;\n  unsignedArtifactCount: number;\n  requiredArtifactCount: number;\n  blockedArtifactCount: number;\n  totalByteSize: number;\n  checksum: string;\n  signature: string | null;\n  signing: {\n    algorithm: \"hmac-sha256\";\n    checksumAlgorithm: \"sha256\";\n    configured: boolean;\n    keyId: string;\n  };\n  artifacts: AdminReleaseArtifact[];\n  rows: AdminReleaseArtifactManifestRow[];\n};\n\nexport type AdminReleaseArtifactManifestInput = {\n  accessibilityPrivacyRelease: AccessibilityPrivacyReleaseChecklist;\n  env?: Record<string, string | undefined>;\n  generatedAt?: string;\n  offlineVault: AdminOfflineVaultPackage;\n  productionDeploySmoke: ProductionDeploySmokeReport;\n  releaseChannels: AdminReleaseChannelsReport;\n  selfHostedBackupReadiness: AdminSelfHostedBackupReadinessReport;\n  supportBundle: AdminSupportBundle;\n};\n\nexport function getAdminReleaseArtifactManifestReport({\n  accessibilityPrivacyRelease,\n  env = {},\n  generatedAt = new Date().toISOString(),\n  offlineVault,\n  productionDeploySmoke,\n  releaseChannels,\n  selfHostedBackupReadiness,\n  supportBundle,\n}: AdminReleaseArtifactManifestInput): AdminReleaseArtifactManifestReport {\n  const signingKey = env.ESSENCE_RELEASE_SIGNING_KEY?.trim() ?? \"\";\n  const keyId = getSigningKeyId(env, signingKey);\n  const signingConfigured = signingKey.length >= 32;\n  const artifacts = [\n    createArtifact({\n      detail:\n        \"Vercel web package evidence includes release-channel scoring, route smoke expectations, and accessibility/privacy release checks.\",\n      fileName: \"web-release-manifest.json\",\n      generatedAt,\n      id: \"web-release-manifest\",\n      kind: \"web\",\n      label: \"Web release manifest\",\n      payload: {\n        accessibilityPrivacyRelease,\n        accessibilityPrivacyReleaseJson: getAccessibilityPrivacyReleaseJson(\n          accessibilityPrivacyRelease,\n        ),\n        accessibilityPrivacyReleaseMarkdown:\n          getAccessibilityPrivacyReleaseMarkdown(accessibilityPrivacyRelease),\n        productionDeploySmoke,\n        productionDeploySmokeMarkdown:\n          getProductionDeploySmokeMarkdown(productionDeploySmoke),\n        releaseChannel: releaseChannels.packages.find(\n          (releasePackage) => releasePackage.channel === \"web\",\n        ),\n        releaseChannels,\n        releaseChannelsJson: getAdminReleaseChannelsJson(releaseChannels),\n        releaseChannelsMarkdown: getAdminReleaseChannelsMarkdown(releaseChannels),\n      },\n      recommendation:\n        \"Attach this manifest to the production approval after Vercel smoke checks pass.\",\n      score: getAverageScore([\n        releaseChannels.packages.find(\n          (releasePackage) => releasePackage.channel === \"web\",\n        )?.score ?? releaseChannels.score,\n        productionDeploySmoke.score,\n        accessibilityPrivacyRelease.score,\n      ]),\n      signingConfigured,\n      signingKey,\n      sourceScore: releaseChannels.score,\n      sourceStatus: releaseChannels.status,\n      status: getWorstStatus([\n        releaseChannels.status,\n        productionDeploySmoke.status,\n        accessibilityPrivacyRelease.status,\n      ]),\n    }),\n    createArtifact({\n      detail:\n        \"Desktop package evidence covers Tauri bundle readiness, static export handoff, release channels, and desktop operator commands.\",\n      fileName: \"desktop-release-manifest.json\",\n      generatedAt,\n      id: \"desktop-release-manifest\",\n      kind: \"desktop\",\n      label: \"Desktop release manifest\",\n      payload: {\n        releaseChannel: releaseChannels.packages.find(\n          (releasePackage) => releasePackage.channel === \"desktop\",\n        ),\n      },\n      recommendation:\n        \"Keep this manifest with platform installers and signing evidence for the desktop channel.\",\n      score:\n        releaseChannels.packages.find(\n          (releasePackage) => releasePackage.channel === \"desktop\",\n        )?.score ?? releaseChannels.score,\n      signingConfigured,\n      signingKey,\n      sourceScore:\n        releaseChannels.packages.find(\n          (releasePackage) => releasePackage.channel === \"desktop\",\n        )?.score ?? releaseChannels.score,\n      sourceStatus:\n        releaseChannels.packages.find(\n          (releasePackage) => releasePackage.channel === \"desktop\",\n        )?.status ?? releaseChannels.status,\n      status:\n        releaseChannels.packages.find(\n          (releasePackage) => releasePackage.channel === \"desktop\",\n        )?.status ?? releaseChannels.status,\n    }),\n    createArtifact({\n      detail:\n        \"Self-hosted evidence includes backup readiness, restore commands, route smoke expectations, and release channel package metadata.\",\n      fileName: \"self-hosted-release-manifest.json\",\n      generatedAt,\n      id: \"self-hosted-release-manifest\",\n      kind: \"self-hosted\",\n      label: \"Self-hosted release manifest\",\n      payload: {\n        markdown: getAdminSelfHostedBackupReadinessMarkdown(\n          selfHostedBackupReadiness,\n        ),\n        releaseChannel: releaseChannels.packages.find(\n          (releasePackage) => releasePackage.channel === \"self-hosted\",\n        ),\n        selfHostedBackupReadiness,\n      },\n      recommendation:\n        \"Attach this manifest to install and recovery documentation for self-hosted operators.\",\n      score: getAverageScore([\n        selfHostedBackupReadiness.score,\n        releaseChannels.packages.find(\n          (releasePackage) => releasePackage.channel === \"self-hosted\",\n        )?.score ?? releaseChannels.score,\n      ]),\n      signingConfigured,\n      signingKey,\n      sourceScore: selfHostedBackupReadiness.score,\n      sourceStatus: selfHostedBackupReadiness.status,\n      status: getWorstStatus([\n        selfHostedBackupReadiness.status,\n        releaseChannels.packages.find(\n          (releasePackage) => releasePackage.channel === \"self-hosted\",\n        )?.status ?? releaseChannels.status,\n      ]),\n    }),\n    createArtifact({\n      detail:\n        \"Offline vault evidence includes design files, support evidence, backup snapshots, restore guide, and vault checksum.\",\n      fileName: `${offlineVault.packageId}.json`,\n      generatedAt,\n      id: \"offline-vault-package\",\n      kind: \"offline-vault\",\n      label: \"Offline vault package\",\n      payload: {\n        json: getAdminOfflineVaultJson(offlineVault),\n        markdown: getAdminOfflineVaultMarkdown(offlineVault),\n        manifest: offlineVault.manifest,\n      },\n      recommendation:\n        \"Store the signed manifest beside the vault JSON before sharing or restoring offline packages.\",\n      score: offlineVault.manifest.score,\n      signingConfigured,\n      signingKey,\n      sourceScore: offlineVault.manifest.score,\n      sourceStatus: offlineVault.manifest.status,\n      status: offlineVault.manifest.status,\n    }),\n    createArtifact({\n      detail:\n        \"Support bundle evidence includes scoped users, files, shares, sessions, notification delivery, audit rows, rollback evidence, and privacy policy.\",\n      fileName: \"support-bundle-manifest.json\",\n      generatedAt,\n      id: \"support-bundle-manifest\",\n      kind: \"support-bundle\",\n      label: \"Support bundle manifest\",\n      payload: {\n        json: getAdminSupportBundleJson(supportBundle),\n        markdown: getAdminSupportBundleMarkdown(supportBundle),\n        supportBundle,\n      },\n      recommendation:\n        \"Use a redacted or minimal support bundle before sending signed support evidence outside the workspace.\",\n      score: supportBundle.score,\n      signingConfigured,\n      signingKey,\n      sourceScore: supportBundle.score,\n      sourceStatus: supportBundle.status,\n      status: supportBundle.status,\n    }),\n  ];\n  const checksumSeed = stableStringify(\n    artifacts.map(({ signature, ...artifact }) => ({\n      ...artifact,\n      signature: signature ? \"[artifact-signature]\" : null,\n    })),\n  );\n  const checksum = `sha256-${sha256(checksumSeed)}`;\n  const signature = signingConfigured\n    ? `hmac-sha256-${hmacSha256(signingKey, checksum)}`\n    : null;\n  const rows = getManifestRows({ artifacts, signingConfigured, keyId });\n  const blockedArtifactCount = artifacts.filter(\n    (artifact) => artifact.status === \"blocked\",\n  ).length;\n  const unsignedArtifactCount = artifacts.filter(\n    (artifact) => artifact.signatureStatus !== \"signed\",\n  ).length;\n  const reviewCount = rows.filter((row) => row.status === \"review\").length;\n  const blockedCount = rows.filter((row) => row.status === \"blocked\").length;\n\n  return {\n    generatedAt,\n    manifestId: `release-manifest-${generatedAt.replace(/[^0-9a-z]/gi, \"\").toLowerCase()}`,\n    status: blockedCount > 0 ? \"blocked\" : reviewCount > 0 ? \"review\" : \"ready\",\n    score: Math.max(0, 100 - blockedCount * 20 - reviewCount * 7),\n    artifactCount: artifacts.length,\n    signedArtifactCount: artifacts.filter(\n      (artifact) => artifact.signatureStatus === \"signed\",\n    ).length,\n    unsignedArtifactCount,\n    requiredArtifactCount: artifacts.filter((artifact) => artifact.required).length,\n    blockedArtifactCount,\n    totalByteSize: artifacts.reduce(\n      (total, artifact) => total + artifact.byteSize,\n      0,\n    ),\n    checksum,\n    signature,\n    signing: {\n      algorithm: \"hmac-sha256\",\n      checksumAlgorithm: \"sha256\",\n      configured: signingConfigured,\n      keyId,\n    },\n    artifacts,\n    rows,\n  };\n}\n\nfunction createArtifact({\n  detail,\n  fileName,\n  generatedAt,\n  id,\n  kind,\n  label,\n  payload,\n  recommendation,\n  required = true,\n  score,\n  signingConfigured,\n  signingKey,\n  sourceScore,\n  sourceStatus,\n  status,\n}: {\n  detail: string;\n  fileName: string;\n  generatedAt: string;\n  id: string;\n  kind: AdminReleaseArtifactKind;\n  label: string;\n  payload: unknown;\n  recommendation: string;\n  required?: boolean;\n  score: number;\n  signingConfigured: boolean;\n  signingKey: string;\n  sourceScore: number;\n  sourceStatus: string;\n  status: AdminReleaseArtifactManifestStatus;\n}): AdminReleaseArtifact {\n  const serialized = stableStringify(payload);\n  const checksum = `sha256-${sha256(serialized)}`;\n  const signature = signingConfigured\n    ? `hmac-sha256-${hmacSha256(signingKey, `${id}:${checksum}`)}`\n    : null;\n\n  return {\n    id,\n    kind,\n    label,\n    fileName,\n    mediaType: \"application/json\",\n    status,\n    score,\n    required,\n    generatedAt,\n    byteSize: new TextEncoder().encode(serialized).length,\n    checksum,\n    signature,\n    signatureStatus: signature ? \"signed\" : \"unsigned\",\n    sourceStatus,\n    sourceScore,\n    detail,\n    recommendation,\n  };\n}\n\nfunction getManifestRows({\n  artifacts,\n  keyId,\n  signingConfigured,\n}: {\n  artifacts: AdminReleaseArtifact[];\n  keyId: string;\n  signingConfigured: boolean;\n}): AdminReleaseArtifactManifestRow[] {\n  const blockedArtifacts = artifacts.filter(\n    (artifact) => artifact.status === \"blocked\",\n  );\n\n  return [\n    {\n      id: \"release-manifest-signing-key\",\n      status: signingConfigured ? \"ready\" : \"review\",\n      label: \"Signing key\",\n      value: signingConfigured ? keyId : \"missing\",\n      detail: signingConfigured\n        ? \"Release artifacts and the manifest are signed with the configured HMAC key.\"\n        : \"Release artifacts have deterministic checksums, but ESSENCE_RELEASE_SIGNING_KEY is not configured.\",\n      recommendation:\n        \"Set ESSENCE_RELEASE_SIGNING_KEY and ESSENCE_RELEASE_SIGNING_KEY_ID before approving signed release artifacts.\",\n    },\n    {\n      id: \"release-manifest-artifact-coverage\",\n      status: artifacts.length >= 5 ? \"ready\" : \"blocked\",\n      label: \"Artifact coverage\",\n      value: `${artifacts.length} artifacts`,\n      detail:\n        \"The manifest covers web, desktop, self-hosted, offline vault, and support bundle exports.\",\n      recommendation:\n        \"Keep all release channels in the signed manifest so operators can validate every exported package.\",\n    },\n    {\n      id: \"release-manifest-blockers\",\n      status: blockedArtifacts.length > 0 ? \"blocked\" : \"ready\",\n      label: \"Blocked artifacts\",\n      value: `${blockedArtifacts.length} blocked`,\n      detail:\n        blockedArtifacts.length > 0\n          ? blockedArtifacts\n              .map((artifact) => `${artifact.label} is ${artifact.status}`)\n              .join(\"; \")\n          : \"No signed manifest artifacts are blocked.\",\n      recommendation:\n        \"Resolve blocked source reports before publishing the signed release manifest.\",\n    },\n    {\n      id: \"release-manifest-signature-coverage\",\n      status: signingConfigured ? \"ready\" : \"review\",\n      label: \"Signature coverage\",\n      value: `${artifacts.filter((artifact) => artifact.signatureStatus === \"signed\").length}/${artifacts.length} signed`,\n      detail: signingConfigured\n        ? \"Every artifact checksum is paired with an HMAC signature.\"\n        : \"Artifacts are checksum-only until the signing key is configured.\",\n      recommendation:\n        \"Archive the signature and checksum with each exported artifact in the release record.\",\n    },\n  ];\n}\n\nfunction getWorstStatus(statuses: AdminReleaseArtifactManifestStatus[]) {\n  if (statuses.includes(\"blocked\")) {\n    return \"blocked\";\n  }\n\n  return statuses.includes(\"review\") ? \"review\" : \"ready\";\n}\n\nfunction getAverageScore(scores: number[]) {\n  const validScores = scores.filter((score) => Number.isFinite(score));\n\n  if (validScores.length === 0) {\n    return 0;\n  }\n\n  return Math.round(\n    validScores.reduce((total, score) => total + score, 0) / validScores.length,\n  );\n}\n\nfunction getSigningKeyId(\n  env: Record<string, string | undefined>,\n  signingKey: string,\n) {\n  const configuredKeyId = env.ESSENCE_RELEASE_SIGNING_KEY_ID?.trim();\n\n  if (configuredKeyId) {\n    return configuredKeyId;\n  }\n\n  return signingKey ? `sha256-${sha256(signingKey).slice(0, 12)}` : \"unconfigured\";\n}\n\nfunction sha256(value: string) {\n  return createHash(\"sha256\").update(value).digest(\"hex\");\n}\n\nfunction hmacSha256(secret: string, value: string) {\n  return createHmac(\"sha256\", secret).update(value).digest(\"hex\");\n}\n\nfunction stableStringify(value: unknown): string {\n  return JSON.stringify(sortStable(value));\n}\n\nfunction sortStable(value: unknown): unknown {\n  if (Array.isArray(value)) {\n    return value.map(sortStable);\n  }\n\n  if (value && typeof value === \"object\") {\n    return Object.fromEntries(\n      Object.entries(value)\n        .sort(([left], [right]) => left.localeCompare(right))\n        .map(([key, item]) => [key, sortStable(item)]),\n    );\n  }\n\n  return value;\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-release-artifact-manifest.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-release-artifact-manifest-ts-358c5d368b398820.mjs",
  "kind": "ts",
  "hash": "358c5d368b398820",
  "dependencies": [
    {
      "specifier": "@/features/admin/admin-accessibility-privacy-release-export",
      "resolved_path": "src/features/admin/admin-accessibility-privacy-release-export.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-accessibility-privacy-release-export-ts-79c2d7c8535505e8.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/admin/admin-offline-vault-export",
      "resolved_path": "src/features/admin/admin-offline-vault-export.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-offline-vault-export-ts-c5a449b3c1264f75.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/admin/admin-release-channels-export",
      "resolved_path": "src/features/admin/admin-release-channels-export.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-release-channels-export-ts-491a92fe2a073ee4.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/admin/admin-self-hosted-backup-readiness-export",
      "resolved_path": "src/features/admin/admin-self-hosted-backup-readiness-export.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-self-hosted-backup-readiness-export-ts-fd7b67349e5c23d3.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/admin/admin-support-bundle-export",
      "resolved_path": "src/features/admin/admin-support-bundle-export.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-support-bundle-export-ts-3bfd84759f23cb09.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/editor/production-deploy-smoke",
      "resolved_path": "src/features/editor/production-deploy-smoke.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-editor-production-deploy-smoke-ts-348cb06733cd614e.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "node:crypto",
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
    "source_path": "src/features/admin/admin-release-artifact-manifest.ts",
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
        "specifier": "node:crypto",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/admin/admin-accessibility-privacy-release",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/admin/admin-accessibility-privacy-release-export",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/admin/admin-offline-vault",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/admin/admin-offline-vault-export",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/admin/admin-release-channels",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/admin/admin-release-channels-export",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/admin/admin-self-hosted-backup-readiness",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/admin/admin-self-hosted-backup-readiness-export",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/admin/admin-support-bundle",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/admin/admin-support-bundle-export",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/editor/production-deploy-smoke",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/editor/production-deploy-smoke",
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
    "export_names": [
      "getAdminReleaseArtifactManifestReport"
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
export const dxLinkedDependencies = Object.freeze([dep0, dep1, dep2, dep3, dep4, dep5]);
export default dxSourceModule;
