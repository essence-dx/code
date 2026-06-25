
export const dxSourceText = "import type {\n  DesignBranchMergeIntent,\n  DesignBranchMetadata,\n  DesignBranchStatus,\n  DesignDocument,\n} from \"@/features/editor/types\";\n\nexport type AdminDesignBranchStatus = \"ready\" | \"review\" | \"blocked\";\n\nexport type AdminDesignBranchRowKind =\n  | \"coverage\"\n  | \"restore-point\"\n  | \"merge-intent\"\n  | \"activity\"\n  | \"staleness\";\n\nexport type AdminDesignBranchFileInput = {\n  fileId: string;\n  fileName: string;\n  ownerEmail: string;\n  document: DesignDocument;\n  createdAt: string;\n  updatedAt: string;\n  trashedAt: string | null;\n};\n\nexport type AdminDesignBranchVersionInput = {\n  id: string;\n  fileId: string;\n  versionName: string;\n  createdAt: string;\n};\n\nexport type AdminDesignBranchRecord = {\n  id: string;\n  fileId: string;\n  fileName: string;\n  ownerEmail: string;\n  branchName: string;\n  branchStatus: DesignBranchStatus;\n  mergeIntent: DesignBranchMergeIntent;\n  sourceFileId: string;\n  sourceFileName: string;\n  sourceVersionId: string;\n  sourceVersionName: string;\n  restorePointVersionId: string | null;\n  restorePointName: string;\n  hasRestorePoint: boolean;\n  activityCount: number;\n  ageDays: number;\n  updatedAgeDays: number;\n  createdAt: string;\n  updatedAt: string;\n};\n\nexport type AdminDesignBranchRow = {\n  id: string;\n  status: AdminDesignBranchStatus;\n  kind: AdminDesignBranchRowKind;\n  branchName: string;\n  fileName: string;\n  ownerEmail: string;\n  summary: string;\n  detail: string;\n  recommendation: string;\n};\n\nexport type AdminDesignBranchReport = {\n  generatedAt: string;\n  status: AdminDesignBranchStatus;\n  score: number;\n  branchCount: number;\n  activeBranchCount: number;\n  reviewIntentCount: number;\n  missingRestorePointCount: number;\n  staleBranchCount: number;\n  records: AdminDesignBranchRecord[];\n  rows: AdminDesignBranchRow[];\n  commands: string[];\n};\n\nexport function getAdminDesignBranchReport({\n  files,\n  versions,\n}: {\n  files: AdminDesignBranchFileInput[];\n  versions: AdminDesignBranchVersionInput[];\n}): AdminDesignBranchReport {\n  const generatedAt = new Date().toISOString();\n  const versionsByFile = groupVersionsByFile(versions);\n  const records = files\n    .filter((file) => !file.trashedAt && file.document.branchMetadata)\n    .map((file) =>\n      toBranchRecord(file, versionsByFile.get(file.fileId) ?? []),\n    )\n    .sort((left, right) => right.ageDays - left.ageDays);\n  const rows = records.flatMap(toBranchRows);\n\n  if (records.length === 0) {\n    rows.push({\n      id: \"branch-coverage-empty\",\n      status: \"review\",\n      kind: \"coverage\",\n      branchName: \"No active branches\",\n      fileName: \"Workspace\",\n      ownerEmail: \"workspace\",\n      summary: \"No first-class branch metadata has been recorded yet.\",\n      detail:\n        \"Create a branch from a named version to capture source version, merge intent, restore point, and admin visibility.\",\n      recommendation:\n        \"Use Versions > Branch from on a named version before large design changes.\",\n    });\n  }\n\n  const missingRestorePointCount = records.filter(\n    (record) => !record.hasRestorePoint,\n  ).length;\n  const staleBranchCount = records.filter(isStaleBranch).length;\n  const reviewIntentCount = records.filter(\n    (record) =>\n      record.mergeIntent === \"review\" ||\n      record.mergeIntent === \"release-candidate\",\n  ).length;\n  const activeBranchCount = records.filter(\n    (record) => record.branchStatus === \"active\",\n  ).length;\n  const blockedRows = rows.filter((row) => row.status === \"blocked\").length;\n  const reviewRows = rows.filter((row) => row.status === \"review\").length;\n  const score = Math.max(0, 100 - blockedRows * 25 - reviewRows * 8);\n  const status: AdminDesignBranchStatus =\n    blockedRows > 0 ? \"blocked\" : reviewRows > 0 ? \"review\" : \"ready\";\n\n  return {\n    generatedAt,\n    status,\n    score,\n    branchCount: records.length,\n    activeBranchCount,\n    reviewIntentCount,\n    missingRestorePointCount,\n    staleBranchCount,\n    records,\n    rows,\n    commands: [\n      \"Create branches from Versions > Branch from before risky file changes.\",\n      \"Use merge intent to route review, hotfix, and release-candidate branches.\",\n      \"Export Admin > Governance > Design branches before release reviews.\",\n    ],\n  };\n}\n\nexport function getAdminDesignBranchJson(report: AdminDesignBranchReport) {\n  return JSON.stringify(report, null, 2);\n}\n\nexport function getAdminDesignBranchCsv(report: AdminDesignBranchReport) {\n  const header: Array<keyof AdminDesignBranchRow> = [\n    \"id\",\n    \"status\",\n    \"kind\",\n    \"branchName\",\n    \"fileName\",\n    \"ownerEmail\",\n    \"summary\",\n    \"detail\",\n    \"recommendation\",\n  ];\n\n  return [header, ...report.rows.map((row) => header.map((key) => row[key]))]\n    .map((row) => row.map(escapeCsvCell).join(\",\"))\n    .join(\"\\n\");\n}\n\nexport function getAdminDesignBranchMarkdown(report: AdminDesignBranchReport) {\n  return [\n    \"# Design Branch Governance\",\n    \"\",\n    `Generated: ${report.generatedAt}`,\n    `Status: ${report.status}`,\n    `Score: ${report.score}`,\n    `Branches: ${report.branchCount}`,\n    `Active branches: ${report.activeBranchCount}`,\n    `Review intent branches: ${report.reviewIntentCount}`,\n    `Missing restore points: ${report.missingRestorePointCount}`,\n    `Stale branches: ${report.staleBranchCount}`,\n    \"\",\n    \"## Review Rows\",\n    ...report.rows.map(\n      (row) =>\n        `- ${row.status.toUpperCase()} ${row.branchName}: ${row.summary} ${row.recommendation}`,\n    ),\n    \"\",\n    \"## Operator Commands\",\n    ...report.commands.map((command) => `- ${command}`),\n  ].join(\"\\n\");\n}\n\nfunction toBranchRecord(\n  file: AdminDesignBranchFileInput,\n  versions: AdminDesignBranchVersionInput[],\n): AdminDesignBranchRecord {\n  const metadata = file.document.branchMetadata as DesignBranchMetadata;\n  const restorePoint = versions.find(\n    (version) =>\n      version.id === metadata.restorePointVersionId ||\n      version.versionName === metadata.restorePointName,\n  );\n  const activityCount = (file.document.activityEvents ?? []).filter(\n    (event) => event.kind === \"branch\",\n  ).length;\n\n  return {\n    id: metadata.id,\n    fileId: file.fileId,\n    fileName: file.fileName,\n    ownerEmail: file.ownerEmail,\n    branchName: metadata.branchName,\n    branchStatus: metadata.status,\n    mergeIntent: metadata.mergeIntent,\n    sourceFileId: metadata.sourceFileId,\n    sourceFileName: metadata.sourceFileName,\n    sourceVersionId: metadata.sourceVersionId,\n    sourceVersionName: metadata.sourceVersionName,\n    restorePointVersionId: metadata.restorePointVersionId,\n    restorePointName: metadata.restorePointName,\n    hasRestorePoint: Boolean(restorePoint),\n    activityCount,\n    ageDays: getAgeDays(metadata.createdAt),\n    updatedAgeDays: getAgeDays(metadata.updatedAt),\n    createdAt: metadata.createdAt,\n    updatedAt: metadata.updatedAt,\n  };\n}\n\nfunction toBranchRows(record: AdminDesignBranchRecord) {\n  const rows: AdminDesignBranchRow[] = [\n    {\n      id: `${record.id}-coverage`,\n      status: \"ready\",\n      kind: \"coverage\",\n      branchName: record.branchName,\n      fileName: record.fileName,\n      ownerEmail: record.ownerEmail,\n      summary: `${record.mergeIntent} branch from ${record.sourceFileName}.`,\n      detail: `Source version: ${record.sourceVersionName}. Branch status: ${record.branchStatus}.`,\n      recommendation:\n        \"Keep source version and merge intent intact until merge review is complete.\",\n    },\n    {\n      id: `${record.id}-restore`,\n      status: record.hasRestorePoint ? \"ready\" : \"blocked\",\n      kind: \"restore-point\",\n      branchName: record.branchName,\n      fileName: record.fileName,\n      ownerEmail: record.ownerEmail,\n      summary: record.hasRestorePoint\n        ? `Restore point ${record.restorePointName} is available.`\n        : `Restore point ${record.restorePointName} is missing.`,\n      detail: record.restorePointVersionId\n        ? `Expected version id: ${record.restorePointVersionId}.`\n        : \"Branch metadata has no restore point version id.\",\n      recommendation: record.hasRestorePoint\n        ? \"Use this checkpoint if branch work needs to be reset.\"\n        : \"Create a named version for this branch before merge or release work.\",\n    },\n    {\n      id: `${record.id}-merge-intent`,\n      status: isReviewIntent(record.mergeIntent) ? \"review\" : \"ready\",\n      kind: \"merge-intent\",\n      branchName: record.branchName,\n      fileName: record.fileName,\n      ownerEmail: record.ownerEmail,\n      summary: `Merge intent is ${record.mergeIntent}.`,\n      detail: \"Admin review can prioritize branches by intent before release.\",\n      recommendation: isReviewIntent(record.mergeIntent)\n        ? \"Route this branch through compare and reviewer decision before merge.\"\n        : \"Promote to review intent when the exploration is ready to land.\",\n    },\n    {\n      id: `${record.id}-activity`,\n      status: record.activityCount > 0 ? \"ready\" : \"review\",\n      kind: \"activity\",\n      branchName: record.branchName,\n      fileName: record.fileName,\n      ownerEmail: record.ownerEmail,\n      summary: `${record.activityCount} branch activity events captured.`,\n      detail: `Created ${record.ageDays} days ago and updated ${record.updatedAgeDays} days ago.`,\n      recommendation:\n        \"Keep branch activity events so admin exports explain where the branch came from.\",\n    },\n  ];\n\n  if (isStaleBranch(record)) {\n    rows.push({\n      id: `${record.id}-stale`,\n      status: \"review\",\n      kind: \"staleness\",\n      branchName: record.branchName,\n      fileName: record.fileName,\n      ownerEmail: record.ownerEmail,\n      summary: `Active branch is ${record.ageDays} days old.`,\n      detail: \"Long-running branches are more likely to drift from source files.\",\n      recommendation:\n        \"Refresh from the source file or complete merge review before release handoff.\",\n    });\n  }\n\n  return rows;\n}\n\nfunction isReviewIntent(intent: DesignBranchMergeIntent) {\n  return intent === \"review\" || intent === \"release-candidate\";\n}\n\nfunction isStaleBranch(record: AdminDesignBranchRecord) {\n  return record.branchStatus === \"active\" && record.ageDays >= 30;\n}\n\nfunction groupVersionsByFile(versions: AdminDesignBranchVersionInput[]) {\n  return versions.reduce<Map<string, AdminDesignBranchVersionInput[]>>(\n    (groups, version) => {\n      const existing = groups.get(version.fileId) ?? [];\n      existing.push(version);\n      groups.set(version.fileId, existing);\n      return groups;\n    },\n    new Map(),\n  );\n}\n\nfunction getAgeDays(value: string) {\n  const timestamp = new Date(value).getTime();\n\n  if (!Number.isFinite(timestamp)) {\n    return 0;\n  }\n\n  return Math.max(0, Math.floor((Date.now() - timestamp) / 86_400_000));\n}\n\nfunction escapeCsvCell(value: string | number) {\n  const text = String(value);\n\n  if (!/[\",\\n\\r]/.test(text)) {\n    return text;\n  }\n\n  return `\"${text.replaceAll('\"', '\"\"')}\"`;\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-design-branches.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-design-branches-ts-8cacfdfb6e7eec88.mjs",
  "kind": "ts",
  "hash": "8cacfdfb6e7eec88",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": false,
  "transform_kind": "metadata-only",
  "runtime_exports": [],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/features/admin/admin-design-branches.ts",
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
        "specifier": "@/features/editor/types",
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
      "getAdminDesignBranchReport",
      "getAdminDesignBranchJson",
      "getAdminDesignBranchCsv",
      "getAdminDesignBranchMarkdown"
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
