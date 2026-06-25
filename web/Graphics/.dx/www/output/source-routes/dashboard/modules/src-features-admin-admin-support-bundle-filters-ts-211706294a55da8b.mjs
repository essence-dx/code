
export const dxSourceText = "import type {\n  AdminAuditRow,\n  AdminFileRow,\n  AdminNotificationDeliveryRow,\n  AdminSessionRiskRow,\n  AdminShareRow,\n  AdminUserRow,\n} from \"@/features/admin/admin-data\";\nimport type { AdminRollbackVersionRow } from \"@/features/admin/admin-rollback-readiness\";\nimport type { AdminSupportBundleScope } from \"@/features/admin/admin-support-bundle\";\n\nexport type AdminSupportBundleRelatedEntities = {\n  emails: Set<string>;\n  fileIds: Set<string>;\n  shareIds: Set<string>;\n  userIds: Set<string>;\n};\n\nexport function getAdminSupportBundleRelatedEntities({\n  files,\n  scope,\n  selectedFile,\n  selectedShare,\n  selectedUser,\n  shares,\n  users,\n}: {\n  files: AdminFileRow[];\n  scope: AdminSupportBundleScope;\n  selectedFile: AdminFileRow | null;\n  selectedShare: AdminShareRow | null;\n  selectedUser: AdminUserRow | null;\n  shares: AdminShareRow[];\n  users: AdminUserRow[];\n}): AdminSupportBundleRelatedEntities {\n  const emails = new Set<string>();\n  const fileIds = new Set<string>();\n  const shareIds = new Set<string>();\n  const userIds = new Set<string>();\n\n  if (scope === \"user\" && selectedUser) {\n    userIds.add(selectedUser.id);\n    emails.add(selectedUser.email);\n  }\n\n  if (scope === \"file\" && selectedFile) {\n    fileIds.add(selectedFile.id);\n    emails.add(selectedFile.ownerEmail);\n  }\n\n  if (scope === \"share\" && selectedShare) {\n    shareIds.add(selectedShare.id);\n    fileIds.add(selectedShare.fileId);\n    emails.add(selectedShare.ownerEmail);\n  }\n\n  for (const file of files) {\n    if (emails.has(file.ownerEmail)) {\n      fileIds.add(file.id);\n    }\n  }\n\n  for (const share of shares) {\n    if (emails.has(share.ownerEmail) || fileIds.has(share.fileId)) {\n      shareIds.add(share.id);\n      fileIds.add(share.fileId);\n      emails.add(share.ownerEmail);\n    }\n  }\n\n  for (const user of users) {\n    if (emails.has(user.email)) {\n      userIds.add(user.id);\n    }\n  }\n\n  return { emails, fileIds, shareIds, userIds };\n}\n\nexport function getScopedSupportUsers(\n  rows: AdminUserRow[],\n  related: AdminSupportBundleRelatedEntities,\n  scope: AdminSupportBundleScope,\n) {\n  return scope === \"workspace\"\n    ? rows\n    : rows.filter(\n        (row) => related.userIds.has(row.id) || related.emails.has(row.email),\n      );\n}\n\nexport function getScopedSupportFiles(\n  rows: AdminFileRow[],\n  related: AdminSupportBundleRelatedEntities,\n  scope: AdminSupportBundleScope,\n) {\n  return scope === \"workspace\"\n    ? rows\n    : rows.filter(\n        (row) => related.fileIds.has(row.id) || related.emails.has(row.ownerEmail),\n      );\n}\n\nexport function getScopedSupportShares(\n  rows: AdminShareRow[],\n  related: AdminSupportBundleRelatedEntities,\n  scope: AdminSupportBundleScope,\n) {\n  return scope === \"workspace\"\n    ? rows\n    : rows.filter(\n        (row) =>\n          related.shareIds.has(row.id) ||\n          related.fileIds.has(row.fileId) ||\n          related.emails.has(row.ownerEmail),\n      );\n}\n\nexport function getScopedSupportSessions(\n  rows: AdminSessionRiskRow[],\n  related: AdminSupportBundleRelatedEntities,\n  scope: AdminSupportBundleScope,\n) {\n  return scope === \"workspace\"\n    ? rows\n    : rows.filter((row) => related.emails.has(row.userEmail));\n}\n\nexport function getScopedSupportNotifications(\n  rows: AdminNotificationDeliveryRow[],\n  related: AdminSupportBundleRelatedEntities,\n  scope: AdminSupportBundleScope,\n) {\n  return scope === \"workspace\"\n    ? rows\n    : rows.filter(\n        (row) =>\n          related.fileIds.has(row.fileId) ||\n          related.emails.has(row.ownerEmail) ||\n          related.emails.has(row.recipientEmail),\n      );\n}\n\nexport function getScopedSupportAuditEvents(\n  rows: AdminAuditRow[],\n  related: AdminSupportBundleRelatedEntities,\n  scope: AdminSupportBundleScope,\n) {\n  return scope === \"workspace\"\n    ? rows\n    : rows.filter(\n        (row) =>\n          related.userIds.has(row.targetId) ||\n          related.fileIds.has(row.targetId) ||\n          related.shareIds.has(row.targetId) ||\n          related.emails.has(row.actorEmail) ||\n          hasRelatedLabel(row.targetLabel, related.emails),\n      );\n}\n\nexport function getScopedSupportRollbackVersions(\n  rows: AdminRollbackVersionRow[],\n  related: AdminSupportBundleRelatedEntities,\n  scope: AdminSupportBundleScope,\n) {\n  return scope === \"workspace\"\n    ? rows\n    : rows.filter(\n        (row) =>\n          related.fileIds.has(row.fileId) || related.emails.has(row.ownerEmail),\n      );\n}\n\nfunction hasRelatedLabel(label: string, emails: Set<string>) {\n  const normalized = label.toLowerCase();\n\n  for (const email of emails) {\n    if (normalized.includes(email.toLowerCase())) {\n      return true;\n    }\n  }\n\n  return false;\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-support-bundle-filters.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-support-bundle-filters-ts-211706294a55da8b.mjs",
  "kind": "ts",
  "hash": "211706294a55da8b",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": false,
  "transform_kind": "metadata-only",
  "runtime_exports": [],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/features/admin/admin-support-bundle-filters.ts",
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
        "specifier": "@/features/admin/admin-data",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/admin/admin-rollback-readiness",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/admin/admin-support-bundle",
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
      "getAdminSupportBundleRelatedEntities",
      "getScopedSupportUsers",
      "getScopedSupportFiles",
      "getScopedSupportShares",
      "getScopedSupportSessions",
      "getScopedSupportNotifications",
      "getScopedSupportAuditEvents",
      "getScopedSupportRollbackVersions"
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
