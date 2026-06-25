
export const dxSourceText = "import type {\n  AdminCollaborationRecoveryPacket,\n  AdminCollaborationRecoveryPacketsReport,\n  AdminCollaborationRecoveryRow,\n} from \"@/features/admin/admin-collaboration-recovery-packets-types\";\n\nexport function getAdminCollaborationRecoveryPacketsJson(\n  report: AdminCollaborationRecoveryPacketsReport,\n) {\n  return JSON.stringify(report, null, 2);\n}\n\nexport function getAdminCollaborationRecoveryPacketsCsv(\n  report: AdminCollaborationRecoveryPacketsReport,\n) {\n  const rowHeader: Array<keyof AdminCollaborationRecoveryRow> = [\n    \"id\",\n    \"category\",\n    \"status\",\n    \"label\",\n    \"value\",\n    \"detail\",\n    \"recommendation\",\n    \"count\",\n    \"target\",\n    \"latestAt\",\n  ];\n  const packetHeader: Array<keyof AdminCollaborationRecoveryPacket> = [\n    \"id\",\n    \"status\",\n    \"fileName\",\n    \"ownerEmail\",\n    \"ownerHandoffStatus\",\n    \"activityReplayEvidenceCount\",\n    \"replayWindowStatus\",\n    \"roomCaptured\",\n    \"evidenceArchived\",\n    \"exportReady\",\n    \"conflictSummaryCount\",\n    \"saveConflictCount\",\n    \"unresolvedMentionCount\",\n    \"latestAt\",\n    \"recommendation\",\n  ];\n\n  return [\n    [\"section\", ...rowHeader].join(\",\"),\n    ...report.rows.map((row) =>\n      [\"review-row\", ...rowHeader.map((key) => row[key])]\n        .map((value) => escapeCsvCell(redactSensitive(String(value ?? \"\"))))\n        .join(\",\"),\n    ),\n    [\"section\", ...packetHeader].join(\",\"),\n    ...report.packets.map((packet) =>\n      [\"packet\", ...packetHeader.map((key) => packet[key])]\n        .map((value) => escapeCsvCell(redactSensitive(String(value ?? \"\"))))\n        .join(\",\"),\n    ),\n  ].join(\"\\n\");\n}\n\nexport function getAdminCollaborationRecoveryPacketsMarkdown(\n  report: AdminCollaborationRecoveryPacketsReport,\n) {\n  return [\n    \"# Collaboration Recovery Packets\",\n    \"\",\n    `Generated: ${report.generatedAt}`,\n    `Status: ${report.status}`,\n    `Score: ${report.score}`,\n    `Packets: ${report.readyPacketCount} ready, ${report.reviewPacketCount} review, ${report.blockedPacketCount} blocked`,\n    `Export ready: ${report.exportReadyPacketCount}`,\n    `Activity replay evidence: ${report.replayEvidenceCount}`,\n    `Ownership handoff: ${report.ownershipHandoffCount} assigned / ${report.missingOwnershipCount} missing`,\n    `Conflict summary rows: ${report.conflictSummaryCount}`,\n    `Save conflicts: ${report.saveConflictCount}`,\n    \"\",\n    \"## Review Rows\",\n    \"\",\n    ...report.rows.map((row) =>\n      [\n        `- [${row.status}] ${row.label}`,\n        `  - Category: ${row.category}`,\n        `  - Value: ${row.value}`,\n        `  - Detail: ${row.detail}`,\n        `  - Target: ${row.target ?? \"none\"}`,\n        `  - Recommendation: ${row.recommendation}`,\n      ].join(\"\\n\"),\n    ),\n    \"\",\n    \"## Packets\",\n    \"\",\n    ...report.packets.map((packet) =>\n      [\n        `- [${packet.status}] ${packet.fileName}`,\n        `  - Owner: ${packet.ownerEmail}`,\n        `  - Activity replay: ${packet.activityReplayEvidenceCount} evidence items`,\n        `  - Ownership handoff: ${packet.ownerHandoffLabel}`,\n        `  - Conflict summary: ${packet.conflictSummaryCount} signals`,\n        `  - Export ready: ${packet.exportReady ? \"yes\" : \"no\"}`,\n        `  - Recovery steps: ${packet.recoverySteps.join(\"; \") || \"none\"}`,\n        `  - Recommendation: ${packet.recommendation}`,\n      ].join(\"\\n\"),\n    ),\n    \"\",\n    \"## Commands\",\n    \"\",\n    ...report.commands.map((command) => `- \\`${command}\\``),\n  ]\n    .map(redactSensitive)\n    .join(\"\\n\");\n}\n\nfunction redactSensitive(value: string) {\n  return value\n    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}/gi, \"[redacted-email]\")\n    .replace(/\\b[A-Za-z0-9_-]*(?:secret|token)[A-Za-z0-9_-]*\\b/gi, \"[redacted-token]\")\n    .replace(/\\/share\\/[A-Za-z0-9_-]+/g, \"/share/[redacted-token]\");\n}\n\nfunction escapeCsvCell(value: string) {\n  if (!/[\",\\n\\r]/.test(value)) {\n    return value;\n  }\n\n  return `\"${value.replaceAll('\"', '\"\"')}\"`;\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-collaboration-recovery-packets-export.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-collaboration-recovery-packets-export-ts-5a8320fc578dfd1e.mjs",
  "kind": "ts",
  "hash": "5a8320fc578dfd1e",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": false,
  "transform_kind": "metadata-only",
  "runtime_exports": [],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/features/admin/admin-collaboration-recovery-packets-export.ts",
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
        "specifier": "@/features/admin/admin-collaboration-recovery-packets-types",
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
      "getAdminCollaborationRecoveryPacketsJson",
      "getAdminCollaborationRecoveryPacketsCsv",
      "getAdminCollaborationRecoveryPacketsMarkdown"
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
