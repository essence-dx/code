
export const dxSourceText = "import type {\n  AdminReviewRoomAudioEvidence,\n  AdminReviewRoomAudioReadinessReport,\n  AdminReviewRoomAudioRoom,\n  AdminReviewRoomAudioRow,\n  AdminReviewRoomFallbackNote,\n} from \"@/features/admin/admin-review-room-audio-readiness-types\";\n\nexport function getAdminReviewRoomAudioReadinessJson(\n  report: AdminReviewRoomAudioReadinessReport,\n) {\n  return JSON.stringify(report, null, 2);\n}\n\nexport function getAdminReviewRoomAudioReadinessCsv(\n  report: AdminReviewRoomAudioReadinessReport,\n) {\n  const rowHeader: Array<keyof AdminReviewRoomAudioRow> = [\n    \"id\",\n    \"category\",\n    \"status\",\n    \"label\",\n    \"value\",\n    \"detail\",\n    \"recommendation\",\n    \"count\",\n    \"target\",\n    \"latestAt\",\n  ];\n  const roomHeader: Array<keyof AdminReviewRoomAudioRoom> = [\n    \"id\",\n    \"status\",\n    \"fileName\",\n    \"consentState\",\n    \"participantCheckStatus\",\n    \"participantCount\",\n    \"reviewerCount\",\n    \"externalParticipantCount\",\n    \"activePresenceCount\",\n    \"fallbackHandoffNoteCount\",\n    \"adminSafeEvidenceCount\",\n    \"audioRiskCount\",\n    \"exportReady\",\n    \"latestAt\",\n    \"recommendation\",\n  ];\n  const noteHeader: Array<keyof AdminReviewRoomFallbackNote> = [\n    \"id\",\n    \"roomId\",\n    \"fileName\",\n    \"status\",\n    \"source\",\n    \"ownerRef\",\n    \"note\",\n    \"latestAt\",\n  ];\n  const evidenceHeader: Array<keyof AdminReviewRoomAudioEvidence> = [\n    \"id\",\n    \"roomId\",\n    \"fileName\",\n    \"status\",\n    \"kind\",\n    \"privacy\",\n    \"detail\",\n    \"latestAt\",\n  ];\n\n  return [\n    [\"section\", ...rowHeader].join(\",\"),\n    ...report.rows.map((row) =>\n      [\"review-row\", ...rowHeader.map((key) => row[key])]\n        .map((value) => escapeCsvCell(redactSensitive(String(value ?? \"\"))))\n        .join(\",\"),\n    ),\n    [\"section\", ...roomHeader].join(\",\"),\n    ...report.rooms.map((room) =>\n      [\"audio-room\", ...roomHeader.map((key) => room[key])]\n        .map((value) => escapeCsvCell(redactSensitive(String(value ?? \"\"))))\n        .join(\",\"),\n    ),\n    [\"section\", ...noteHeader].join(\",\"),\n    ...report.fallbackNotes.map((note) =>\n      [\"fallback-note\", ...noteHeader.map((key) => note[key])]\n        .map((value) => escapeCsvCell(redactSensitive(String(value ?? \"\"))))\n        .join(\",\"),\n    ),\n    [\"section\", ...evidenceHeader].join(\",\"),\n    ...report.evidence.map((item) =>\n      [\"audio-evidence\", ...evidenceHeader.map((key) => item[key])]\n        .map((value) => escapeCsvCell(redactSensitive(String(value ?? \"\"))))\n        .join(\",\"),\n    ),\n  ].join(\"\\n\");\n}\n\nexport function getAdminReviewRoomAudioReadinessMarkdown(\n  report: AdminReviewRoomAudioReadinessReport,\n) {\n  return [\n    \"# Review Room Audio Readiness\",\n    \"\",\n    `Generated: ${report.generatedAt}`,\n    `Status: ${report.status}`,\n    `Score: ${report.score}`,\n    `Rooms: ${report.roomCount}`,\n    `Consent captured: ${report.consentCapturedCount}`,\n    `Missing consent: ${report.missingConsentCount}`,\n    `participant checks: ${report.participantCheckCount}`,\n    `Failed participant checks: ${report.failedParticipantCheckCount}`,\n    `fallback handoff notes: ${report.fallbackHandoffNoteCount}`,\n    `Admin-safe evidence: ${report.adminSafeEvidenceCount}`,\n    `Export-ready rooms: ${report.exportReadyRoomCount}`,\n    \"\",\n    \"## Review Rows\",\n    \"\",\n    ...report.rows.map((row) =>\n      [\n        `- [${row.status}] ${row.label}`,\n        `  - Category: ${row.category}`,\n        `  - Value: ${row.value}`,\n        `  - Detail: ${row.detail}`,\n        `  - Target: ${row.target ?? \"none\"}`,\n        `  - Recommendation: ${row.recommendation}`,\n      ].join(\"\\n\"),\n    ),\n    \"\",\n    \"## Audio Rooms\",\n    \"\",\n    ...report.rooms.map((room) =>\n      [\n        `- [${room.status}] ${room.fileName}`,\n        `  - Consent: ${room.consentState}`,\n        `  - Participant checks: ${room.participantCheckStatus}`,\n        `  - Fallback handoff: ${room.fallbackHandoffNoteCount}`,\n        `  - Evidence: ${room.adminSafeEvidenceCount}`,\n        `  - Export-ready: ${room.exportReady ? \"yes\" : \"no\"}`,\n        `  - Recommendation: ${room.recommendation}`,\n      ].join(\"\\n\"),\n    ),\n    \"\",\n    \"## Fallback Handoff\",\n    \"\",\n    ...report.fallbackNotes.map((note) =>\n      [\n        `- [${note.status}] ${note.fileName}`,\n        `  - Source: ${note.source}`,\n        `  - Owner: ${note.ownerRef}`,\n        `  - Note: ${note.note}`,\n      ].join(\"\\n\"),\n    ),\n    \"\",\n    \"## Admin-Safe Evidence\",\n    \"\",\n    ...report.evidence.map((item) =>\n      [\n        `- [${item.status}] ${item.fileName}`,\n        `  - Kind: ${item.kind}`,\n        `  - Privacy: ${item.privacy}`,\n        `  - Detail: ${item.detail}`,\n      ].join(\"\\n\"),\n    ),\n    \"\",\n    \"## Commands\",\n    \"\",\n    ...report.commands.map((command) => `- \\`${command}\\``),\n  ]\n    .map(redactSensitive)\n    .join(\"\\n\");\n}\n\nfunction redactSensitive(value: string) {\n  return value\n    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}/gi, \"[redacted-email]\")\n    .replace(/\\b[A-Za-z0-9_-]*(?:secret|token)[A-Za-z0-9_-]*\\b/gi, \"[redacted-token]\")\n    .replace(/\\/share\\/[A-Za-z0-9_-]+/g, \"/share/[redacted-token]\");\n}\n\nfunction escapeCsvCell(value: string) {\n  if (!/[\",\\n\\r]/.test(value)) {\n    return value;\n  }\n\n  return `\"${value.replaceAll('\"', '\"\"')}\"`;\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-review-room-audio-readiness-export.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-review-room-audio-readiness-export-ts-4e656c6aaa0635ed.mjs",
  "kind": "ts",
  "hash": "4e656c6aaa0635ed",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": false,
  "transform_kind": "metadata-only",
  "runtime_exports": [],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/features/admin/admin-review-room-audio-readiness-export.ts",
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
        "specifier": "@/features/admin/admin-review-room-audio-readiness-types",
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
      "getAdminReviewRoomAudioReadinessJson",
      "getAdminReviewRoomAudioReadinessCsv",
      "getAdminReviewRoomAudioReadinessMarkdown"
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
