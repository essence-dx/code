
export const dxSourceText = "import type {\n  AdminCursorChatRoomMessageRoom,\n  AdminCursorChatRoomMessageRow,\n  AdminCursorChatRoomMessagesReport,\n  AdminCursorChatRoomReplayEvidence,\n} from \"@/features/admin/admin-cursor-chat-room-messages-types\";\n\nexport function getAdminCursorChatRoomMessagesJson(\n  report: AdminCursorChatRoomMessagesReport,\n) {\n  return JSON.stringify(report, null, 2);\n}\n\nexport function getAdminCursorChatRoomMessagesCsv(\n  report: AdminCursorChatRoomMessagesReport,\n) {\n  const rowHeader: Array<keyof AdminCursorChatRoomMessageRow> = [\n    \"id\",\n    \"category\",\n    \"status\",\n    \"label\",\n    \"value\",\n    \"detail\",\n    \"recommendation\",\n    \"count\",\n    \"target\",\n    \"latestAt\",\n  ];\n  const roomHeader: Array<keyof AdminCursorChatRoomMessageRoom> = [\n    \"id\",\n    \"status\",\n    \"fileName\",\n    \"roomCaptured\",\n    \"messageCount\",\n    \"retainedMessageCount\",\n    \"expiredMessageCount\",\n    \"mentionCount\",\n    \"participantCount\",\n    \"externalParticipantCount\",\n    \"privacyReplayEvidenceCount\",\n    \"replayWindowStatus\",\n    \"recoveryPacketStatus\",\n    \"recoveryPacketExportReady\",\n    \"exportReady\",\n    \"latestAt\",\n    \"recommendation\",\n  ];\n  const evidenceHeader: Array<keyof AdminCursorChatRoomReplayEvidence> = [\n    \"id\",\n    \"status\",\n    \"fileName\",\n    \"messageId\",\n    \"actorRef\",\n    \"privacy\",\n    \"detail\",\n    \"createdAt\",\n    \"retentionExpiresAt\",\n    \"expired\",\n    \"recoveryPacketStatus\",\n  ];\n\n  return [\n    [\"section\", ...rowHeader].join(\",\"),\n    ...report.rows.map((row) =>\n      [\"review-row\", ...rowHeader.map((key) => row[key])]\n        .map((value) => escapeCsvCell(redactSensitive(String(value ?? \"\"))))\n        .join(\",\"),\n    ),\n    [\"section\", ...roomHeader].join(\",\"),\n    ...report.rooms.map((room) =>\n      [\"room\", ...roomHeader.map((key) => room[key])]\n        .map((value) => escapeCsvCell(redactSensitive(String(value ?? \"\"))))\n        .join(\",\"),\n    ),\n    [\"section\", ...evidenceHeader].join(\",\"),\n    ...report.replayEvidence.map((item) =>\n      [\"privacy-replay\", ...evidenceHeader.map((key) => item[key])]\n        .map((value) => escapeCsvCell(redactSensitive(String(value ?? \"\"))))\n        .join(\",\"),\n    ),\n  ].join(\"\\n\");\n}\n\nexport function getAdminCursorChatRoomMessagesMarkdown(\n  report: AdminCursorChatRoomMessagesReport,\n) {\n  return [\n    \"# Cursor Chat Room Messages\",\n    \"\",\n    `Generated: ${report.generatedAt}`,\n    `Status: ${report.status}`,\n    `Score: ${report.score}`,\n    `Rooms: ${report.roomCount}`,\n    `Messages: ${report.messageCount}`,\n    `Expired messages: ${report.expiredMessageCount}`,\n    `Mentions: ${report.mentionCount}`,\n    `privacy-safe replay evidence: ${report.privacyReplayEvidenceCount}`,\n    `Recovery packet links: ${report.recoveryPacketLinkedCount}`,\n    `Export-ready rooms: ${report.exportReadyRoomCount}`,\n    \"\",\n    \"## Review Rows\",\n    \"\",\n    ...report.rows.map((row) =>\n      [\n        `- [${row.status}] ${row.label}`,\n        `  - Category: ${row.category}`,\n        `  - Value: ${row.value}`,\n        `  - Detail: ${row.detail}`,\n        `  - Target: ${row.target ?? \"none\"}`,\n        `  - Recommendation: ${row.recommendation}`,\n      ].join(\"\\n\"),\n    ),\n    \"\",\n    \"## Rooms\",\n    \"\",\n    ...report.rooms.map((room) =>\n      [\n        `- [${room.status}] ${room.fileName}`,\n        `  - Messages: ${room.messageCount} total / ${room.expiredMessageCount} expired`,\n        `  - Participants: ${room.participantCount} total / ${room.externalParticipantCount} external`,\n        `  - Privacy-safe replay: ${room.privacyReplayEvidenceCount}`,\n        `  - Recovery packet: ${room.recoveryPacketStatus}`,\n        `  - Export-ready: ${room.exportReady ? \"yes\" : \"no\"}`,\n        `  - Recommendation: ${room.recommendation}`,\n      ].join(\"\\n\"),\n    ),\n    \"\",\n    \"## Privacy-Safe Replay Evidence\",\n    \"\",\n    ...report.replayEvidence.map((item) =>\n      [\n        `- [${item.status}] ${item.fileName}`,\n        `  - Actor: ${item.actorRef}`,\n        `  - Detail: ${item.detail}`,\n        `  - Retention expires: ${item.retentionExpiresAt}`,\n        `  - Recovery packet: ${item.recoveryPacketStatus}`,\n      ].join(\"\\n\"),\n    ),\n    \"\",\n    \"## Commands\",\n    \"\",\n    ...report.commands.map((command) => `- \\`${command}\\``),\n  ]\n    .map(redactSensitive)\n    .join(\"\\n\");\n}\n\nfunction redactSensitive(value: string) {\n  return value\n    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}/gi, \"[redacted-email]\")\n    .replace(/\\b[A-Za-z0-9_-]*(?:secret|token)[A-Za-z0-9_-]*\\b/gi, \"[redacted-token]\")\n    .replace(/\\/share\\/[A-Za-z0-9_-]+/g, \"/share/[redacted-token]\");\n}\n\nfunction escapeCsvCell(value: string) {\n  if (!/[\",\\n\\r]/.test(value)) {\n    return value;\n  }\n\n  return `\"${value.replaceAll('\"', '\"\"')}\"`;\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-cursor-chat-room-messages-export.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-cursor-chat-room-messages-export-ts-35fa925f392672a4.mjs",
  "kind": "ts",
  "hash": "35fa925f392672a4",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": false,
  "transform_kind": "metadata-only",
  "runtime_exports": [],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/features/admin/admin-cursor-chat-room-messages-export.ts",
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
        "specifier": "@/features/admin/admin-cursor-chat-room-messages-types",
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
      "getAdminCursorChatRoomMessagesJson",
      "getAdminCursorChatRoomMessagesCsv",
      "getAdminCursorChatRoomMessagesMarkdown"
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
