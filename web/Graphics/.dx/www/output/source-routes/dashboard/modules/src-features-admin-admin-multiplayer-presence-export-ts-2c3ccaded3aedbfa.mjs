
export const dxSourceText = "import type {\n  AdminMultiplayerPresenceReport,\n  AdminMultiplayerPresenceRoom,\n  AdminMultiplayerPresenceRow,\n} from \"@/features/admin/admin-multiplayer-presence\";\n\nexport function getAdminMultiplayerPresenceJson(\n  report: AdminMultiplayerPresenceReport,\n) {\n  return JSON.stringify(report, null, 2);\n}\n\nexport function getAdminMultiplayerPresenceCsv(\n  report: AdminMultiplayerPresenceReport,\n) {\n  const rowHeader: Array<keyof AdminMultiplayerPresenceRow> = [\n    \"id\",\n    \"category\",\n    \"status\",\n    \"label\",\n    \"value\",\n    \"detail\",\n    \"recommendation\",\n    \"count\",\n    \"target\",\n    \"latestAt\",\n  ];\n  const roomHeader: Array<keyof AdminMultiplayerPresenceRoom> = [\n    \"id\",\n    \"status\",\n    \"fileName\",\n    \"ownerEmail\",\n    \"roomCaptured\",\n    \"cursorEvidenceCount\",\n    \"spotlightEventCount\",\n    \"followEventCount\",\n    \"presenterHandoffAgeMinutes\",\n    \"presenterHandoffTimerStatus\",\n    \"staleRecoveryStatus\",\n    \"saveConflictCount\",\n    \"latestAt\",\n    \"recommendation\",\n  ];\n\n  return [\n    [\"section\", ...rowHeader].join(\",\"),\n    ...report.rows.map((row) =>\n      [\"review-row\", ...rowHeader.map((key) => row[key])]\n        .map((value) => escapeCsvCell(redactSensitive(String(value ?? \"\"))))\n        .join(\",\"),\n    ),\n    [\"section\", ...roomHeader].join(\",\"),\n    ...report.rooms.map((room) =>\n      [\"room\", ...roomHeader.map((key) => room[key])]\n        .map((value) => escapeCsvCell(redactSensitive(String(value ?? \"\"))))\n        .join(\",\"),\n    ),\n  ].join(\"\\n\");\n}\n\nexport function getAdminMultiplayerPresenceMarkdown(\n  report: AdminMultiplayerPresenceReport,\n) {\n  return [\n    \"# Multiplayer Presence Operations\",\n    \"\",\n    `Generated: ${report.generatedAt}`,\n    `Status: ${report.status}`,\n    `Score: ${report.score}`,\n    `Rooms: ${report.readyRoomCount} ready, ${report.reviewRoomCount} review, ${report.blockedRoomCount} blocked`,\n    `Presence events: ${report.presenceEventCount}`,\n    `Cursor evidence: ${report.cursorEvidenceCount}`,\n    `Spotlight events: ${report.spotlightEventCount}`,\n    `Follow events: ${report.followEventCount}`,\n    `Handoff timer review: ${report.handoffTimerReviewCount}`,\n    `Stale recovery queue: ${report.staleRecoveryQueueCount}`,\n    `Save conflicts: ${report.saveConflictCount}`,\n    \"\",\n    \"## Review Rows\",\n    \"\",\n    ...report.rows.map((row) =>\n      [\n        `- [${row.status}] ${row.label}`,\n        `  - Category: ${row.category}`,\n        `  - Value: ${row.value}`,\n        `  - Detail: ${row.detail}`,\n        `  - Target: ${row.target ?? \"none\"}`,\n        `  - Recommendation: ${row.recommendation}`,\n      ].join(\"\\n\"),\n    ),\n    \"\",\n    \"## Rooms\",\n    \"\",\n    ...report.rooms.map((room) =>\n      [\n        `- [${room.status}] ${room.fileName}`,\n        `  - Owner: ${room.ownerEmail}`,\n        `  - Captured: ${room.roomCaptured ? \"yes\" : \"no\"}`,\n        `  - Cursor evidence: ${room.cursorEvidenceCount}`,\n        `  - Spotlight/follow: ${room.spotlightEventCount}/${room.followEventCount}`,\n        `  - Presenter: ${room.presenterStatus}`,\n        `  - Presenter handoff age: ${room.presenterHandoffAgeMinutes ?? \"unknown\"} minutes`,\n        `  - Presenter handoff timer: ${room.presenterHandoffTimerStatus}`,\n        `  - Stale recovery: ${room.staleRecoveryStatus}`,\n        `  - Save conflicts: ${room.saveConflictCount}`,\n        `  - Recommendation: ${room.recommendation}`,\n      ].join(\"\\n\"),\n    ),\n    \"\",\n    \"## Commands\",\n    \"\",\n    ...report.commands.map((command) => `- \\`${command}\\``),\n  ]\n    .map(redactSensitive)\n    .join(\"\\n\");\n}\n\nfunction redactSensitive(value: string) {\n  return value\n    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}/gi, \"[redacted-email]\")\n    .replace(/\\b[A-Za-z0-9_-]*(?:secret|token)[A-Za-z0-9_-]*\\b/gi, \"[redacted-token]\")\n    .replace(/\\/share\\/[A-Za-z0-9_-]+/g, \"/share/[redacted-token]\");\n}\n\nfunction escapeCsvCell(value: string) {\n  if (!/[\",\\n\\r]/.test(value)) {\n    return value;\n  }\n\n  return `\"${value.replaceAll('\"', '\"\"')}\"`;\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-multiplayer-presence-export.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-multiplayer-presence-export-ts-2c3ccaded3aedbfa.mjs",
  "kind": "ts",
  "hash": "2c3ccaded3aedbfa",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": false,
  "transform_kind": "metadata-only",
  "runtime_exports": [],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/features/admin/admin-multiplayer-presence-export.ts",
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
        "specifier": "@/features/admin/admin-multiplayer-presence",
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
      "getAdminMultiplayerPresenceJson",
      "getAdminMultiplayerPresenceCsv",
      "getAdminMultiplayerPresenceMarkdown"
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
