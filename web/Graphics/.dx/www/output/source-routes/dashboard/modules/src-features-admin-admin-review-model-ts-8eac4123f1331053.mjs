
export const dxSourceText = "import type {\n  AdminFileRow,\n  AdminShareRow,\n  AdminUserRow,\n} from \"@/features/admin/admin-data\";\n\nexport type UserReviewFilter = \"all\" | \"pending\" | \"sessions\" | \"owners\";\nexport type ShareReviewFilter =\n  | \"all\"\n  | \"live\"\n  | \"expired\"\n  | \"risky\"\n  | \"disabled\";\nexport type FileReviewFilter =\n  | \"all\"\n  | \"collaborative\"\n  | \"editors\"\n  | \"public\"\n  | \"stale-shares\"\n  | \"comments\"\n  | \"prototypes\";\n\nexport type AdminReviewFilterOption<TValue extends string> = {\n  value: TValue;\n  label: string;\n  count: number;\n};\n\nexport function filterUsers(\n  rows: AdminUserRow[],\n  filter: UserReviewFilter,\n  query: string,\n) {\n  return rows.filter(\n    (row) =>\n      matchesUserFilter(row, filter) &&\n      matchesQuery(query, [\n        row.name,\n        row.email,\n        row.emailVerified ? \"verified\" : \"pending\",\n        `${row.sessions} sessions`,\n        `${row.files} files`,\n      ]),\n  );\n}\n\nexport function filterShares(\n  rows: AdminShareRow[],\n  filter: ShareReviewFilter,\n  query: string,\n) {\n  return rows.filter(\n    (row) =>\n      matchesShareFilter(row, filter) &&\n      matchesQuery(query, [\n        row.fileName,\n        row.ownerEmail,\n        row.permissionPreset,\n        row.accessLevel,\n        row.allowComments ? \"comments\" : \"no comments\",\n        row.allowDownload ? \"downloads\" : \"no downloads\",\n      ]),\n  );\n}\n\nexport function filterFiles(\n  rows: AdminFileRow[],\n  filter: FileReviewFilter,\n  query: string,\n) {\n  return rows.filter(\n    (row) =>\n      matchesFileFilter(row, filter) &&\n      matchesQuery(query, [\n        row.name,\n        row.ownerEmail,\n        row.teamName,\n        row.projectName,\n        row.scope,\n        `${row.collaboratorCount} collaborators`,\n        `${row.editorCount} editors`,\n        `${row.publicShareCount} public links`,\n        `${row.staleShareCount} stale links`,\n      ]),\n  );\n}\n\nexport function getUserFilterOptions(\n  rows: AdminUserRow[],\n): AdminReviewFilterOption<UserReviewFilter>[] {\n  return [\n    { value: \"all\", label: \"All\", count: rows.length },\n    {\n      value: \"pending\",\n      label: \"Pending\",\n      count: rows.filter((row) => !row.emailVerified).length,\n    },\n    {\n      value: \"sessions\",\n      label: \"Sessions\",\n      count: rows.filter((row) => row.sessions > 0).length,\n    },\n    {\n      value: \"owners\",\n      label: \"Owners\",\n      count: rows.filter((row) => row.files > 0).length,\n    },\n  ];\n}\n\nexport function getShareFilterOptions(\n  rows: AdminShareRow[],\n): AdminReviewFilterOption<ShareReviewFilter>[] {\n  return [\n    { value: \"all\", label: \"All\", count: rows.length },\n    { value: \"live\", label: \"Live\", count: rows.filter(isLiveShare).length },\n    {\n      value: \"expired\",\n      label: \"Expired\",\n      count: rows.filter(isExpiredShare).length,\n    },\n    { value: \"risky\", label: \"Risk\", count: rows.filter(isShareRisky).length },\n    {\n      value: \"disabled\",\n      label: \"Disabled\",\n      count: rows.filter((row) => row.disabledAt).length,\n    },\n  ];\n}\n\nexport function getFileFilterOptions(\n  rows: AdminFileRow[],\n): AdminReviewFilterOption<FileReviewFilter>[] {\n  return [\n    { value: \"all\", label: \"All\", count: rows.length },\n    {\n      value: \"collaborative\",\n      label: \"Shared\",\n      count: rows.filter((row) => row.collaboratorCount > 0).length,\n    },\n    {\n      value: \"editors\",\n      label: \"Editors\",\n      count: rows.filter((row) => row.editorCount > 0).length,\n    },\n    {\n      value: \"public\",\n      label: \"Public\",\n      count: rows.filter((row) => row.publicShareCount > 0).length,\n    },\n    {\n      value: \"stale-shares\",\n      label: \"Stale links\",\n      count: rows.filter((row) => row.staleShareCount > 0).length,\n    },\n    {\n      value: \"comments\",\n      label: \"Comments\",\n      count: rows.filter((row) => row.openCommentCount > 0).length,\n    },\n    {\n      value: \"prototypes\",\n      label: \"Prototype\",\n      count: rows.filter((row) => row.brokenPrototypeCount > 0).length,\n    },\n  ];\n}\n\nfunction matchesUserFilter(row: AdminUserRow, filter: UserReviewFilter) {\n  if (filter === \"pending\") {\n    return !row.emailVerified;\n  }\n\n  if (filter === \"sessions\") {\n    return row.sessions > 0;\n  }\n\n  if (filter === \"owners\") {\n    return row.files > 0;\n  }\n\n  return true;\n}\n\nfunction matchesShareFilter(row: AdminShareRow, filter: ShareReviewFilter) {\n  if (filter === \"live\") {\n    return isLiveShare(row);\n  }\n\n  if (filter === \"expired\") {\n    return isExpiredShare(row);\n  }\n\n  if (filter === \"risky\") {\n    return isShareRisky(row);\n  }\n\n  if (filter === \"disabled\") {\n    return Boolean(row.disabledAt);\n  }\n\n  return true;\n}\n\nfunction matchesFileFilter(row: AdminFileRow, filter: FileReviewFilter) {\n  if (filter === \"collaborative\") {\n    return row.collaboratorCount > 0;\n  }\n\n  if (filter === \"editors\") {\n    return row.editorCount > 0;\n  }\n\n  if (filter === \"public\") {\n    return row.publicShareCount > 0;\n  }\n\n  if (filter === \"stale-shares\") {\n    return row.staleShareCount > 0;\n  }\n\n  if (filter === \"comments\") {\n    return row.openCommentCount > 0;\n  }\n\n  if (filter === \"prototypes\") {\n    return row.brokenPrototypeCount > 0;\n  }\n\n  return true;\n}\n\nfunction isLiveShare(row: AdminShareRow) {\n  return !row.disabledAt && !isExpiredShare(row);\n}\n\nfunction isExpiredShare(row: AdminShareRow) {\n  return Boolean(\n    !row.disabledAt &&\n      row.expiresAt &&\n      new Date(row.expiresAt).getTime() < Date.now(),\n  );\n}\n\nfunction isShareRisky(row: AdminShareRow) {\n  return Boolean(\n    !row.disabledAt &&\n      (isExpiredShare(row) ||\n        row.allowDownload ||\n        row.allowComments ||\n        row.accessLevel === \"review\"),\n  );\n}\n\nfunction matchesQuery(query: string, values: string[]) {\n  const normalized = query.trim().toLowerCase();\n\n  if (!normalized) {\n    return true;\n  }\n\n  return values.some((value) => value.toLowerCase().includes(normalized));\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-review-model.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-review-model-ts-8eac4123f1331053.mjs",
  "kind": "ts",
  "hash": "8eac4123f1331053",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": false,
  "transform_kind": "metadata-only",
  "runtime_exports": [],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/features/admin/admin-review-model.ts",
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
      "filterUsers",
      "filterShares",
      "filterFiles",
      "getUserFilterOptions",
      "getShareFilterOptions",
      "getFileFilterOptions"
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
