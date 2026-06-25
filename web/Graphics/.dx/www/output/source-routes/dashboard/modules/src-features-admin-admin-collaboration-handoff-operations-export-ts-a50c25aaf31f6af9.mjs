
export const dxSourceText = "import type {\n  AdminCollaborationHandoffOperationsReport,\n  AdminCollaborationHandoffRow,\n} from \"@/features/admin/admin-collaboration-handoff-operations\";\n\nexport function getAdminCollaborationHandoffOperationsJson(\n  report: AdminCollaborationHandoffOperationsReport,\n) {\n  return JSON.stringify(report, null, 2);\n}\n\nexport function getAdminCollaborationHandoffOperationsCsv(\n  report: AdminCollaborationHandoffOperationsReport,\n) {\n  const header: Array<keyof AdminCollaborationHandoffRow> = [\n    \"id\",\n    \"roomId\",\n    \"category\",\n    \"status\",\n    \"fileName\",\n    \"ownerEmail\",\n    \"label\",\n    \"detail\",\n    \"recommendation\",\n    \"count\",\n    \"latestAt\",\n  ];\n\n  return [header, ...report.rows.map((row) => header.map((key) => row[key]))]\n    .map((row) => row.map(escapeCsvCell).join(\",\"))\n    .join(\"\\n\");\n}\n\nexport function getAdminCollaborationHandoffOperationsMarkdown(\n  report: AdminCollaborationHandoffOperationsReport,\n) {\n  return [\n    \"# Collaboration Handoff Room Operations\",\n    \"\",\n    `Generated: ${report.generatedAt}`,\n    `Status: ${report.status}`,\n    `Score: ${report.score}`,\n    `Files: ${report.fileCount}`,\n    `Rooms: ${report.roomCount}`,\n    `Captured rooms: ${report.capturedRoomCount}`,\n    `Active rooms: ${report.activeRoomCount}`,\n    `Stale rooms: ${report.staleRoomCount}`,\n    `Unresolved mentions: ${report.unresolvedMentionCount}`,\n    `Presenter conflicts: ${report.presenterConflictCount}`,\n    `Conflict queue: ${report.conflictQueueCount}`,\n    `Escalations: ${report.escalationQueueCount}`,\n    `Assigned handoff owners: ${report.assignedOwnerCount}`,\n    `Archived room evidence: ${report.archivedEvidenceCount}`,\n    `Resolved queues: ${report.resolvedQueueCount}`,\n    \"\",\n    \"## Rooms\",\n    \"\",\n    ...report.rooms.map((room) =>\n      [\n        `- [${room.status}] ${room.fileName}`,\n        `  - Owner: ${room.ownerEmail}`,\n        `  - Room captured: ${room.roomCaptured ? \"yes\" : \"no\"}`,\n        `  - Updated: ${room.roomUpdatedAt ?? \"never\"}`,\n        `  - Chat: ${room.chatMessageCount}`,\n        `  - Presence events: ${room.presenceEventCount}`,\n        `  - Mentions: ${room.unresolvedMentionCount}`,\n        `  - Presenter: ${room.presenter.summary}`,\n        `  - Conflicts: ${room.operationConflictCount + room.targetConflictCount}`,\n        `  - Escalations: ${room.escalationCount}`,\n        `  - Handoff owner: ${room.handoffOwnerEmail ?? \"unassigned\"}`,\n        `  - Evidence archived: ${room.evidenceArchivedAt ?? \"no\"}`,\n        `  - Queues resolved: ${[\n          room.mentionQueueResolvedAt ? \"mentions\" : \"\",\n          room.escalationQueueResolvedAt ? \"escalations\" : \"\",\n        ].filter(Boolean).join(\", \") || \"none\"}`,\n        `  - Recommendation: ${room.recommendation}`,\n      ].join(\"\\n\"),\n    ),\n    \"\",\n    \"## Review Queue\",\n    \"\",\n    ...report.rows.map((row) =>\n      [\n        `- [${row.status}] ${row.label}`,\n        `  - File: ${row.fileName}`,\n        `  - Category: ${row.category}`,\n        `  - Count: ${row.count}`,\n        `  - Detail: ${row.detail}`,\n        `  - Recommendation: ${row.recommendation}`,\n      ].join(\"\\n\"),\n    ),\n    \"\",\n    \"## Commands\",\n    \"\",\n    ...report.commands.map((command) => `- ${command}`),\n  ].join(\"\\n\");\n}\n\nfunction escapeCsvCell(value: unknown) {\n  const text = String(value ?? \"\");\n\n  if (!/[\",\\n\\r]/.test(text)) {\n    return text;\n  }\n\n  return `\"${text.replaceAll('\"', '\"\"')}\"`;\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-collaboration-handoff-operations-export.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-collaboration-handoff-operations-export-ts-a50c25aaf31f6af9.mjs",
  "kind": "ts",
  "hash": "a50c25aaf31f6af9",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": false,
  "transform_kind": "metadata-only",
  "runtime_exports": [],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/features/admin/admin-collaboration-handoff-operations-export.ts",
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
        "specifier": "@/features/admin/admin-collaboration-handoff-operations",
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
      "getAdminCollaborationHandoffOperationsJson",
      "getAdminCollaborationHandoffOperationsCsv",
      "getAdminCollaborationHandoffOperationsMarkdown"
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
