import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-features-admin-admin-collaboration-handoff-operations-utils-ts-209009d154bed0cc.mjs";
export const dxSourceText = "import type {\n  AdminCollaborationHandoffRoom,\n  AdminCollaborationHandoffRow,\n} from \"@/features/admin/admin-collaboration-handoff-operations-types\";\nimport {\n  collaborationHandoffStatusWeight,\n  getLatestCollaborationIso,\n} from \"@/features/admin/admin-collaboration-handoff-operations-utils\";\n\nexport function toAdminCollaborationHandoffRows(\n  room: AdminCollaborationHandoffRoom,\n) {\n  return [\n    getRoomSnapshotRow(room),\n    getReplayFreshnessRow(room),\n    getMentionRow(room),\n    getPresenterRow(room),\n    getConflictRow(room),\n    getEscalationRow(room),\n  ]\n    .filter((row): row is AdminCollaborationHandoffRow => Boolean(row))\n    .sort(sortAdminCollaborationHandoffRows);\n}\n\nexport function getEmptyCollaborationHandoffRow(): AdminCollaborationHandoffRow {\n  return {\n    id: \"collaboration-handoff-empty\",\n    roomId: \"none\",\n    category: \"room\",\n    status: \"review\",\n    fileName: \"No collaboration rooms\",\n    ownerEmail: \"workspace\",\n    label: \"No collaboration room activity\",\n    detail:\n      \"No saved collaboration room snapshots are available for admin handoff operations.\",\n    recommendation:\n      \"Open a collaborative file, exchange presence or chat, and let the room sync before release handoff.\",\n    count: 0,\n    latestAt: null,\n  };\n}\n\nexport function sortAdminCollaborationHandoffRows(\n  left: AdminCollaborationHandoffRow,\n  right: AdminCollaborationHandoffRow,\n) {\n  return (\n    collaborationHandoffStatusWeight[left.status] -\n      collaborationHandoffStatusWeight[right.status] ||\n    right.count - left.count ||\n    (right.latestAt ? new Date(right.latestAt).getTime() : 0) -\n      (left.latestAt ? new Date(left.latestAt).getTime() : 0)\n  );\n}\n\nfunction getRoomSnapshotRow(\n  room: AdminCollaborationHandoffRoom,\n): AdminCollaborationHandoffRow | null {\n  if (room.roomCaptured) {\n    return null;\n  }\n\n  return {\n    id: `${room.id}-room`,\n    roomId: room.id,\n    category: \"room\",\n    status: \"review\",\n    fileName: room.fileName,\n    ownerEmail: room.ownerEmail,\n    label: \"Room snapshot missing\",\n    detail: \"No durable collaboration room snapshot is stored for this file.\",\n    recommendation:\n      \"Open the room and sync chat/presence before using this file for live handoff.\",\n    count: 0,\n    latestAt: room.latestAt,\n  };\n}\n\nfunction getReplayFreshnessRow(\n  room: AdminCollaborationHandoffRoom,\n): AdminCollaborationHandoffRow | null {\n  if (room.syncReplay.roomAgeMinutes !== null && room.syncReplay.roomAgeMinutes <= 60 * 24) {\n    return null;\n  }\n\n  return {\n    id: `${room.id}-replay`,\n    roomId: room.id,\n    category: \"replay\",\n    status:\n      room.syncReplay.roomAgeMinutes !== null &&\n      room.syncReplay.roomAgeMinutes > 60 * 72\n        ? \"blocked\"\n        : \"review\",\n    fileName: room.fileName,\n    ownerEmail: room.ownerEmail,\n    label: \"Replay freshness\",\n    detail:\n      room.syncReplay.roomAgeMinutes === null\n        ? \"No replay timestamp is available.\"\n        : `Room replay is ${Math.round(room.syncReplay.roomAgeMinutes)} minutes old.`,\n    recommendation: \"Refresh the room before release or attach the stale replay note.\",\n    count: room.syncReplay.roomAgeMinutes ?? 0,\n    latestAt: room.roomUpdatedAt,\n  };\n}\n\nfunction getMentionRow(\n  room: AdminCollaborationHandoffRoom,\n): AdminCollaborationHandoffRow | null {\n  if (room.unresolvedMentionCount === 0) {\n    return null;\n  }\n\n  return {\n    id: `${room.id}-mentions`,\n    roomId: room.id,\n    category: \"mentions\",\n    status: \"review\",\n    fileName: room.fileName,\n    ownerEmail: room.ownerEmail,\n    label: \"Unresolved mention queue\",\n    detail: `${room.unresolvedMentionCount} chat or comment mentions need handoff review.`,\n    recommendation: \"Assign the mention owner or resolve the thread before handoff.\",\n    count: room.unresolvedMentionCount,\n    latestAt: room.latestAt,\n  };\n}\n\nfunction getPresenterRow(\n  room: AdminCollaborationHandoffRoom,\n): AdminCollaborationHandoffRow | null {\n  if (room.presenter.status === \"owned\" && room.presenter.replayEventCount > 0) {\n    return null;\n  }\n\n  return {\n    id: `${room.id}-presenter`,\n    roomId: room.id,\n    category: \"presenter\",\n    status: room.presenter.status === \"conflict\" ? \"blocked\" : \"review\",\n    fileName: room.fileName,\n    ownerEmail: room.ownerEmail,\n    label: \"Presenter ownership\",\n    detail: room.presenter.summary,\n    recommendation:\n      room.presenter.status === \"conflict\"\n        ? \"Stop duplicate spotlights and identify the single presenter owner.\"\n        : \"Record presenter ownership or replay evidence before live handoff.\",\n    count: room.presenter.activePresenterCount,\n    latestAt: room.presenter.lastHandoffAt,\n  };\n}\n\nfunction getConflictRow(\n  room: AdminCollaborationHandoffRoom,\n): AdminCollaborationHandoffRow | null {\n  const conflictCount = room.operationConflictCount + room.targetConflictCount;\n\n  if (conflictCount === 0) {\n    return null;\n  }\n\n  return {\n    id: `${room.id}-conflicts`,\n    roomId: room.id,\n    category: \"conflicts\",\n    status: room.syncReplay.conflictScore < 70 ? \"blocked\" : \"review\",\n    fileName: room.fileName,\n    ownerEmail: room.ownerEmail,\n    label: \"Collaboration conflict queue\",\n    detail: `${room.operationConflictCount} operation and ${room.targetConflictCount} target conflicts need review.`,\n    recommendation: \"Resolve conflict-review rows before exporting collaboration evidence.\",\n    count: conflictCount,\n    latestAt: room.latestAt,\n  };\n}\n\nfunction getEscalationRow(\n  room: AdminCollaborationHandoffRoom,\n): AdminCollaborationHandoffRow | null {\n  if (room.escalationCount === 0) {\n    return null;\n  }\n\n  return {\n    id: `${room.id}-escalation`,\n    roomId: room.id,\n    category: \"escalation\",\n    status: room.status === \"blocked\" ? \"blocked\" : \"review\",\n    fileName: room.fileName,\n    ownerEmail: room.ownerEmail,\n    label: \"Admin escalation export\",\n    detail: `${room.escalationCount} collaboration handoff signals require admin review.`,\n    recommendation: room.recommendation,\n    count: room.escalationCount,\n    latestAt: getLatestCollaborationIso(room.latestAt, room.presenter.lastHandoffAt),\n  };\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-collaboration-handoff-operations-rows.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-collaboration-handoff-operations-rows-ts-be564f6bb4dce4c3.mjs",
  "kind": "ts",
  "hash": "be564f6bb4dce4c3",
  "dependencies": [
    {
      "specifier": "@/features/admin/admin-collaboration-handoff-operations-utils",
      "resolved_path": "src/features/admin/admin-collaboration-handoff-operations-utils.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-collaboration-handoff-operations-utils-ts-209009d154bed0cc.mjs",
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
    "source_path": "src/features/admin/admin-collaboration-handoff-operations-rows.ts",
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
        "specifier": "@/features/admin/admin-collaboration-handoff-operations-types",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/admin/admin-collaboration-handoff-operations-utils",
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
      "toAdminCollaborationHandoffRows",
      "getEmptyCollaborationHandoffRow",
      "sortAdminCollaborationHandoffRows"
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
