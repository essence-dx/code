
export const dxSourceText = "import type { AdminFileBrowserDepthReport } from \"@/features/admin/admin-file-browser-depth\";\n\nexport function getAdminFileBrowserDepthJson(report: AdminFileBrowserDepthReport) {\n  return JSON.stringify(report, null, 2);\n}\n\nexport function getAdminFileBrowserDepthCsv(report: AdminFileBrowserDepthReport) {\n  return [\n    [\n      \"section\",\n      \"id\",\n      \"status\",\n      \"scope_key\",\n      \"file_name\",\n      \"owner\",\n      \"detail\",\n      \"recommendation\",\n    ].join(\",\"),\n    ...report.permissionMatrices.map((matrix) =>\n      [\n        \"matrix\",\n        matrix.id,\n        matrix.status,\n        matrix.scopeKey,\n        \"\",\n        `${matrix.ownerCount} owners`,\n        `${matrix.fileCount} files, ${matrix.editorCount} editors, ${matrix.pendingAccessRequestCount} access requests`,\n        matrix.recommendation,\n      ]\n        .map(escapeCsvCell)\n        .join(\",\"),\n    ),\n    ...report.files.map((file) =>\n      [\n        \"file\",\n        file.fileId,\n        file.status,\n        file.scopeKey,\n        file.fileName,\n        file.ownerEmail,\n        `${file.collaboratorCount} collaborators, ${file.riskyShareCount} risky shares, ${file.auditEventCount} audit events`,\n        file.recommendation,\n      ]\n        .map((value) => escapeCsvCell(redactShareTokens(String(value))))\n        .join(\",\"),\n    ),\n    ...report.accessRequestQueue.map((request) =>\n      [\n        \"access_request\",\n        request.requestId,\n        request.status,\n        request.scopeKey,\n        request.fileName,\n        request.targetEmail,\n        `${request.currentRole} to ${request.requestedRole}`,\n        request.riskReason,\n      ]\n        .map((value) => escapeCsvCell(redactShareTokens(String(value))))\n        .join(\",\"),\n    ),\n  ].join(\"\\n\");\n}\n\nexport function getAdminFileBrowserDepthMarkdown(\n  report: AdminFileBrowserDepthReport,\n) {\n  return [\n    \"# File Browser Depth\",\n    \"\",\n    `Generated: ${report.generatedAt}`,\n    `Status: ${report.status}`,\n    `Score: ${report.score}`,\n    `Files: ${report.readyFileCount} ready, ${report.reviewFileCount} review, ${report.blockedFileCount} blocked`,\n    `Permission matrices: ${report.matrixCount}`,\n    `Owner transfer queue: ${report.ownerTransferQueueCount}`,\n    `Access request queue: ${report.accessRequestQueueCount}`,\n    \"\",\n    \"## Commands\",\n    \"\",\n    ...report.commands.map((command) => `- \\`${redactShareTokens(command)}\\``),\n    \"\",\n    \"## Permission Matrices\",\n    \"\",\n    ...report.permissionMatrices.flatMap((matrix) => [\n      `### ${matrix.scopeKey}`,\n      \"\",\n      `- Status: ${matrix.status}`,\n      `- Files: ${matrix.fileCount}`,\n      `- Owners: ${matrix.ownerCount}`,\n      `- Collaborators: ${matrix.collaboratorCount}`,\n      `- Editors: ${matrix.editorCount}`,\n      `- Pending access requests: ${matrix.pendingAccessRequestCount}`,\n      `- Audit events: ${matrix.auditEventCount}`,\n      `- Recommendation: ${matrix.recommendation}`,\n      \"\",\n    ]),\n    \"## Owner Transfer Queue\",\n    \"\",\n    ...report.ownerTransferQueue.map((item) =>\n      [\n        `- [${item.status}] ${item.fileName}`,\n        `  - Scope: ${item.scopeKey}`,\n        `  - Owner: ${item.ownerEmail}`,\n        `  - Reason: ${item.reason}`,\n        `  - Candidates: ${item.candidateEmails.join(\", \") || \"none\"}`,\n      ].join(\"\\n\"),\n    ),\n    \"\",\n    \"## Access Request Queue\",\n    \"\",\n    ...report.accessRequestQueue.map((item) =>\n      [\n        `- [${item.status}] ${item.fileName}`,\n        `  - Request: ${item.requestId}`,\n        `  - Target: ${item.targetEmail}`,\n        `  - Role: ${item.currentRole} to ${item.requestedRole}`,\n        `  - Risk: ${item.riskReason}`,\n      ].join(\"\\n\"),\n    ),\n  ]\n    .map(redactShareTokens)\n    .join(\"\\n\");\n}\n\nfunction redactShareTokens(value: string) {\n  return value\n    .replace(/\\b[A-Za-z0-9_-]*(?:secret|token)[A-Za-z0-9_-]*\\b/gi, \"[redacted-token]\")\n    .replace(/\\/share\\/[A-Za-z0-9_-]+/g, \"/share/[redacted-token]\");\n}\n\nfunction escapeCsvCell(value: string | number | boolean) {\n  const stringValue = String(value);\n\n  if (\n    stringValue.includes(\",\") ||\n    stringValue.includes('\"') ||\n    stringValue.includes(\"\\n\")\n  ) {\n    return `\"${stringValue.replaceAll('\"', '\"\"')}\"`;\n  }\n\n  return stringValue;\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-file-browser-depth-export.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-file-browser-depth-export-ts-d3ad0ebc07c3480b.mjs",
  "kind": "ts",
  "hash": "d3ad0ebc07c3480b",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": false,
  "transform_kind": "metadata-only",
  "runtime_exports": [],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/features/admin/admin-file-browser-depth-export.ts",
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
        "specifier": "@/features/admin/admin-file-browser-depth",
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
      "getAdminFileBrowserDepthJson",
      "getAdminFileBrowserDepthCsv",
      "getAdminFileBrowserDepthMarkdown"
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
