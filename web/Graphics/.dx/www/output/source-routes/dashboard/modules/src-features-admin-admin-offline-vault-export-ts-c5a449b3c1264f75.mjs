import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-features-admin-admin-offline-vault-ts-541ad33debff3ec5.mjs";
export const dxSourceText = "import {\n  getAdminOfflineVaultJson,\n  validateAdminOfflineVaultPackage,\n  type AdminOfflineVaultPackage,\n} from \"@/features/admin/admin-offline-vault\";\n\nexport { getAdminOfflineVaultJson };\n\nexport function getAdminOfflineVaultCsv(vault: AdminOfflineVaultPackage) {\n  const report = validateAdminOfflineVaultPackage(vault);\n\n  return [\n    [\n      \"id\",\n      \"kind\",\n      \"status\",\n      \"label\",\n      \"value\",\n      \"detail\",\n      \"recommendation\",\n    ].join(\",\"),\n    ...report.rows.map((row) =>\n      [\n        row.id,\n        row.kind,\n        row.status,\n        row.label,\n        row.value,\n        row.detail,\n        row.recommendation,\n      ]\n        .map(escapeCsvValue)\n        .join(\",\"),\n    ),\n  ].join(\"\\n\");\n}\n\nexport function getAdminOfflineVaultMarkdown(vault: AdminOfflineVaultPackage) {\n  const report = validateAdminOfflineVaultPackage(vault);\n\n  return [\n    \"# Essence Offline Vault\",\n    \"\",\n    `- Package: ${vault.packageId}`,\n    `- Generated: ${vault.generatedAt}`,\n    `- Exported by: ${vault.exportedBy}`,\n    `- Status: ${report.status} (${report.score}/100)`,\n    `- Design files: ${vault.manifest.designFileCount}`,\n    `- Pages: ${vault.manifest.pageCount}`,\n    `- Layers: ${vault.manifest.layerCount}`,\n    `- Estimated size: ${formatBytes(vault.manifest.estimatedBytes)}`,\n    `- Checksum: ${vault.manifest.checksum}`,\n    \"\",\n    \"## Restore Guide\",\n    \"\",\n    ...vault.restoreGuide.map((item) => `- ${item}`),\n    \"\",\n    \"## Import Checks\",\n    \"\",\n    \"| Check | Status | Value | Recommendation |\",\n    \"| --- | --- | --- | --- |\",\n    ...report.rows.map(\n      (row) =>\n        `| ${escapeMarkdown(row.label)} | ${row.status} | ${escapeMarkdown(row.value)} | ${escapeMarkdown(row.recommendation)} |`,\n    ),\n  ].join(\"\\n\");\n}\n\nfunction formatBytes(bytes: number) {\n  if (bytes < 1024) {\n    return `${bytes} B`;\n  }\n\n  if (bytes < 1024 * 1024) {\n    return `${(bytes / 1024).toFixed(1)} KB`;\n  }\n\n  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;\n}\n\nfunction escapeCsvValue(value: string | number | boolean | null) {\n  const text = String(value ?? \"\");\n\n  if (!/[\",\\n]/.test(text)) {\n    return text;\n  }\n\n  return `\"${text.replaceAll('\"', '\"\"')}\"`;\n}\n\nfunction escapeMarkdown(value: string) {\n  return value.replaceAll(\"|\", \"\\\\|\").replaceAll(\"\\n\", \" \");\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-offline-vault-export.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-offline-vault-export-ts-c5a449b3c1264f75.mjs",
  "kind": "ts",
  "hash": "c5a449b3c1264f75",
  "dependencies": [
    {
      "specifier": "@/features/admin/admin-offline-vault",
      "resolved_path": "src/features/admin/admin-offline-vault.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-offline-vault-ts-541ad33debff3ec5.mjs",
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
    "source_path": "src/features/admin/admin-offline-vault-export.ts",
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
        "specifier": "@/features/admin/admin-offline-vault",
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
      "getAdminOfflineVaultCsv",
      "getAdminOfflineVaultMarkdown"
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
