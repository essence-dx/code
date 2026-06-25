import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-features-admin-admin-collaboration-handoff-actions-ts-f80c7a02c2111ee1.mjs";
import { dxSourceModule as dep1, dxRuntimeExports as dep1Runtime } from "./src-features-admin-admin-collaboration-handoff-operations-presenter-ts-6672d98787c3bbfd.mjs";
import { dxSourceModule as dep2, dxRuntimeExports as dep2Runtime } from "./src-features-admin-admin-collaboration-handoff-operations-rows-ts-be564f6bb4dce4c3.mjs";
import { dxSourceModule as dep3, dxRuntimeExports as dep3Runtime } from "./src-features-admin-admin-collaboration-handoff-operations-utils-ts-209009d154bed0cc.mjs";
import { dxSourceModule as dep4, dxRuntimeExports as dep4Runtime } from "./src-features-editor-collaboration-room-state-ts-3ff3220a5bfda107.mjs";
import { dxSourceModule as dep5, dxRuntimeExports as dep5Runtime } from "./src-features-editor-collaboration-sync-replay-ts-3a3ef7473bdedcba.mjs";
export const dxSourceText = "import { getAdminCollaborationPresenterState } from \"@/features/admin/admin-collaboration-handoff-operations-presenter\";\nimport {\n  isCollaborationHandoffActionCurrent,\n  type CollaborationHandoffActionState,\n} from \"@/features/admin/admin-collaboration-handoff-actions\";\nimport {\n  getEmptyCollaborationHandoffRow,\n  sortAdminCollaborationHandoffRows,\n  toAdminCollaborationHandoffRows,\n} from \"@/features/admin/admin-collaboration-handoff-operations-rows\";\nimport type {\n  AdminCollaborationHandoffFile,\n  AdminCollaborationHandoffInput,\n  AdminCollaborationHandoffOperationsReport,\n  AdminCollaborationHandoffRoom,\n  AdminCollaborationHandoffStatus,\n} from \"@/features/admin/admin-collaboration-handoff-operations-types\";\nimport {\n  getChatMentionCount,\n  getLatestCollaborationIso,\n  getLatestPresenceEventIso,\n  getLatestUnresolvedDocumentMentionIso,\n  getUnresolvedDocumentMentionCount,\n  getWorstCollaborationHandoffStatus,\n  toIsoFromMs,\n} from \"@/features/admin/admin-collaboration-handoff-operations-utils\";\nimport { getCollaborationSyncReplayReport } from \"@/features/editor/collaboration-sync-replay\";\nimport { toCollaborationRoomSnapshot } from \"@/features/editor/collaboration-room-state\";\n\nexport type {\n  AdminCollaborationHandoffCategory,\n  AdminCollaborationHandoffFile,\n  AdminCollaborationHandoffInput,\n  AdminCollaborationHandoffOperationsReport,\n  AdminCollaborationHandoffRoom,\n  AdminCollaborationHandoffRow,\n  AdminCollaborationHandoffStatus,\n  AdminCollaborationPresenterState,\n} from \"@/features/admin/admin-collaboration-handoff-operations-types\";\n\nexport function getAdminCollaborationHandoffOperationsReport({\n  actionStates,\n  files,\n  generatedAt = new Date().toISOString(),\n  now = Date.now(),\n}: AdminCollaborationHandoffInput): AdminCollaborationHandoffOperationsReport {\n  const activeFiles = files.filter((file) => !file.trashedAt);\n  const rooms = activeFiles.map((file) =>\n    toHandoffRoom(file, now, actionStates?.get(file.fileId)),\n  );\n  const rows = rooms\n    .flatMap(toAdminCollaborationHandoffRows)\n    .sort(sortAdminCollaborationHandoffRows);\n  const blockedCount = rooms.filter((room) => room.status === \"blocked\").length;\n  const reviewCount = rooms.filter((room) => room.status === \"review\").length;\n  const readyCount = rooms.filter((room) => room.status === \"ready\").length;\n  const finalRows = rows.length > 0 ? rows : [getEmptyCollaborationHandoffRow()];\n\n  return {\n    generatedAt,\n    status: blockedCount > 0 ? \"blocked\" : reviewCount > 0 ? \"review\" : \"ready\",\n    score: Math.max(0, 100 - blockedCount * 18 - reviewCount * 6),\n    fileCount: activeFiles.length,\n    roomCount: rooms.length,\n    capturedRoomCount: rooms.filter((room) => room.roomCaptured).length,\n    activeRoomCount: rooms.filter(\n      (room) => room.chatMessageCount > 0 || room.presenceEventCount > 0,\n    ).length,\n    staleRoomCount: rooms.filter(\n      (room) =>\n        room.roomAgeMinutes === null ||\n        room.roomAgeMinutes > 60 * 24,\n    ).length,\n    unresolvedMentionCount: rooms.reduce(\n      (total, room) => total + room.unresolvedMentionCount,\n      0,\n    ),\n    presenterConflictCount: rooms.filter(\n      (room) => room.presenter.status === \"conflict\",\n    ).length,\n    presenterOwnedCount: rooms.filter(\n      (room) => room.presenter.status === \"owned\",\n    ).length,\n    conflictQueueCount: rooms.reduce(\n      (total, room) =>\n        total + room.operationConflictCount + room.targetConflictCount,\n      0,\n    ),\n    escalationQueueCount: rooms.reduce(\n      (total, room) => total + room.escalationCount,\n      0,\n    ),\n    assignedOwnerCount: rooms.filter((room) => room.handoffAssignedAt).length,\n    archivedEvidenceCount: rooms.filter((room) => room.evidenceArchivedAt)\n      .length,\n    clearedSnapshotCount: rooms.filter((room) => room.staleSnapshotClearedAt)\n      .length,\n    resolvedQueueCount: rooms.filter(\n      (room) => room.mentionQueueResolvedAt || room.escalationQueueResolvedAt,\n    ).length,\n    replayFreshCount: rooms.filter(\n      (room) =>\n        room.roomCaptured &&\n        room.roomAgeMinutes !== null &&\n        room.roomAgeMinutes <= 60 * 24,\n    ).length,\n    readyCount,\n    reviewCount,\n    blockedCount,\n    rooms,\n    rows: finalRows,\n    commands: getCollaborationHandoffCommands(),\n  };\n}\n\nfunction toHandoffRoom(\n  file: AdminCollaborationHandoffFile,\n  now: number,\n  actionState?: CollaborationHandoffActionState,\n): AdminCollaborationHandoffRoom {\n  const snapshot = toCollaborationRoomSnapshot(file.document.collaborationRoom);\n  const syncReplay = getCollaborationSyncReplayReport(file.document, now);\n  const presenter = getAdminCollaborationPresenterState(snapshot.presenceEvents);\n  const latestChatAt = toIsoFromMs(\n    snapshot.chatMessages.reduce(\n      (latest, message) => Math.max(latest, message.createdAt),\n      0,\n    ),\n  );\n  const latestSignalAt = [\n    snapshot.updatedAt,\n    getLatestPresenceEventIso(snapshot.presenceEvents),\n    latestChatAt,\n    getLatestUnresolvedDocumentMentionIso(file.document),\n  ].reduce(getLatestCollaborationIso, null as string | null);\n  const mentionQueueResolved = isCollaborationHandoffActionCurrent(\n    actionState?.mentionQueueResolvedAt,\n    latestSignalAt,\n  );\n  const escalationQueueResolved = isCollaborationHandoffActionCurrent(\n    actionState?.escalationQueueResolvedAt,\n    latestSignalAt,\n  );\n  const rawUnresolvedMentionCount =\n    getChatMentionCount(snapshot.chatMessages) +\n    getUnresolvedDocumentMentionCount(file.document);\n  const unresolvedMentionCount = mentionQueueResolved\n    ? 0\n    : rawUnresolvedMentionCount;\n  const conflictCount =\n    syncReplay.operationConflictCount + syncReplay.targetConflictCount;\n  const staleRoom =\n    syncReplay.roomAgeMinutes === null || syncReplay.roomAgeMinutes > 60 * 24;\n  const presenterNeedsReview =\n    presenter.status === \"conflict\" ||\n    ((snapshot.chatMessages.length > 0 || snapshot.presenceEvents.length > 0) &&\n      presenter.status === \"idle\");\n  const rawEscalationCount = [\n    !syncReplay.roomCaptured,\n    staleRoom,\n    rawUnresolvedMentionCount > 0,\n    presenterNeedsReview,\n    conflictCount > 0,\n    syncReplay.eventDriftCount > 0,\n    syncReplay.offlineReplayQueueCount > 0,\n  ].filter(Boolean).length;\n  const escalationCount = escalationQueueResolved ? 0 : rawEscalationCount;\n  const status = getRoomStatus({\n    escalationCount,\n    presenterStatus: presenter.status,\n    staleRoom,\n    syncStatus: syncReplay.status,\n  });\n  const latestAt = [\n    snapshot.updatedAt,\n    getLatestPresenceEventIso(snapshot.presenceEvents),\n    latestChatAt,\n    getLatestUnresolvedDocumentMentionIso(file.document),\n    actionState?.latestActionAt ?? null,\n    file.updatedAt,\n  ].reduce(getLatestCollaborationIso, null as string | null);\n\n  return {\n    id: `collaboration-room-${file.fileId}`,\n    status,\n    fileId: file.fileId,\n    fileName: file.fileName,\n    ownerEmail: file.ownerEmail,\n    roomCaptured: syncReplay.roomCaptured,\n    roomUpdatedAt: snapshot.updatedAt,\n    roomAgeMinutes: syncReplay.roomAgeMinutes,\n    chatMessageCount: snapshot.chatMessages.length,\n    presenceEventCount: snapshot.presenceEvents.length,\n    unresolvedMentionCount,\n    rawUnresolvedMentionCount,\n    presenter,\n    operationConflictCount: syncReplay.operationConflictCount,\n    targetConflictCount: syncReplay.targetConflictCount,\n    eventDriftCount: syncReplay.eventDriftCount,\n    offlineReplayQueueCount: syncReplay.offlineReplayQueueCount,\n    escalationCount,\n    rawEscalationCount,\n    syncReplay,\n    latestAt,\n    latestSignalAt,\n    handoffOwnerName: actionState?.ownerName ?? null,\n    handoffOwnerEmail: actionState?.ownerEmail ?? null,\n    handoffAssignedAt: actionState?.assignedAt ?? null,\n    evidenceArchivedAt: isCollaborationHandoffActionCurrent(\n      actionState?.evidenceArchivedAt,\n      latestSignalAt,\n    )\n      ? (actionState?.evidenceArchivedAt ?? null)\n      : null,\n    staleSnapshotClearedAt: actionState?.staleSnapshotClearedAt ?? null,\n    mentionQueueResolvedAt: mentionQueueResolved\n      ? (actionState?.mentionQueueResolvedAt ?? null)\n      : null,\n    escalationQueueResolvedAt: escalationQueueResolved\n      ? (actionState?.escalationQueueResolvedAt ?? null)\n      : null,\n    actionCount: actionState?.actionCount ?? 0,\n    recommendation: getRoomRecommendation(status, escalationCount),\n  };\n}\n\nfunction getRoomStatus({\n  escalationCount,\n  presenterStatus,\n  staleRoom,\n  syncStatus,\n}: {\n  escalationCount: number;\n  presenterStatus: \"idle\" | \"owned\" | \"conflict\";\n  staleRoom: boolean;\n  syncStatus: AdminCollaborationHandoffStatus;\n}) {\n  return getWorstCollaborationHandoffStatus([\n    syncStatus,\n    presenterStatus === \"conflict\" ? \"blocked\" : \"ready\",\n    staleRoom ? \"review\" : \"ready\",\n    escalationCount > 0 ? \"review\" : \"ready\",\n  ]);\n}\n\nfunction getRoomRecommendation(\n  status: AdminCollaborationHandoffStatus,\n  escalationCount: number,\n) {\n  if (status === \"blocked\") {\n    return \"Escalate this room before release handoff and attach the conflict export.\";\n  }\n\n  if (status === \"review\" || escalationCount > 0) {\n    return \"Refresh replay, resolve mentions, confirm presenter ownership, and export the room evidence.\";\n  }\n\n  return \"Room handoff evidence is ready for the production collaboration packet.\";\n}\n\nfunction getCollaborationHandoffCommands() {\n  return [\n    \"Refresh collaboration rooms before release handoff and confirm replay age is under 24 hours.\",\n    \"Resolve or assign chat and comment mentions before exporting handoff evidence.\",\n    \"Use room actions to assign handoff owners, archive evidence, clear stale snapshots, and resolve queues with audit trails.\",\n    \"Confirm one presenter owner for spotlight/follow sessions before live review.\",\n    \"Review operation and target conflict queues before publishing branch or share updates.\",\n    \"Export this report with collaboration replay, public links, and access budget evidence.\",\n  ];\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-collaboration-handoff-operations.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-collaboration-handoff-operations-ts-d37dbb12df577dc4.mjs",
  "kind": "ts",
  "hash": "d37dbb12df577dc4",
  "dependencies": [
    {
      "specifier": "@/features/admin/admin-collaboration-handoff-actions",
      "resolved_path": "src/features/admin/admin-collaboration-handoff-actions.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-collaboration-handoff-actions-ts-f80c7a02c2111ee1.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/admin/admin-collaboration-handoff-operations-presenter",
      "resolved_path": "src/features/admin/admin-collaboration-handoff-operations-presenter.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-collaboration-handoff-operations-presenter-ts-6672d98787c3bbfd.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/admin/admin-collaboration-handoff-operations-rows",
      "resolved_path": "src/features/admin/admin-collaboration-handoff-operations-rows.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-collaboration-handoff-operations-rows-ts-be564f6bb4dce4c3.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/admin/admin-collaboration-handoff-operations-utils",
      "resolved_path": "src/features/admin/admin-collaboration-handoff-operations-utils.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-collaboration-handoff-operations-utils-ts-209009d154bed0cc.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/editor/collaboration-room-state",
      "resolved_path": "src/features/editor/collaboration-room-state.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-editor-collaboration-room-state-ts-3ff3220a5bfda107.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/editor/collaboration-sync-replay",
      "resolved_path": "src/features/editor/collaboration-sync-replay.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-editor-collaboration-sync-replay-ts-3a3ef7473bdedcba.mjs",
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
    "source_path": "src/features/admin/admin-collaboration-handoff-operations.ts",
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
        "specifier": "@/features/admin/admin-collaboration-handoff-operations-presenter",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/admin/admin-collaboration-handoff-actions",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/admin/admin-collaboration-handoff-operations-rows",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/admin/admin-collaboration-handoff-operations-types",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/admin/admin-collaboration-handoff-operations-utils",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/editor/collaboration-sync-replay",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/editor/collaboration-room-state",
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
      "getAdminCollaborationHandoffOperationsReport"
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
export const dxLinkedDependencies = Object.freeze([dep0, dep1, dep2, dep3, dep4, dep5]);
export default dxSourceModule;
