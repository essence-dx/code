
export const dxSourceText = "import type { AdminAuditMetadata } from \"@/db/schema\";\nimport type {\n  AdminCollaborationHandoffStatus,\n} from \"@/features/admin/admin-collaboration-handoff-operations-types\";\n\nexport const COLLABORATION_HANDOFF_ASSIGN_OWNER_ACTION =\n  \"collaboration_handoff.assign_owner\";\nexport const COLLABORATION_HANDOFF_ARCHIVE_EVIDENCE_ACTION =\n  \"collaboration_handoff.archive_evidence\";\nexport const COLLABORATION_HANDOFF_CLEAR_STALE_SNAPSHOT_ACTION =\n  \"collaboration_handoff.clear_stale_snapshot\";\nexport const COLLABORATION_HANDOFF_RESOLVE_QUEUE_ACTION =\n  \"collaboration_handoff.resolve_queue\";\n\nexport const collaborationHandoffActionNames = [\n  COLLABORATION_HANDOFF_ASSIGN_OWNER_ACTION,\n  COLLABORATION_HANDOFF_ARCHIVE_EVIDENCE_ACTION,\n  COLLABORATION_HANDOFF_CLEAR_STALE_SNAPSHOT_ACTION,\n  COLLABORATION_HANDOFF_RESOLVE_QUEUE_ACTION,\n] as const;\n\nexport type CollaborationHandoffActionName =\n  (typeof collaborationHandoffActionNames)[number];\n\nexport type CollaborationHandoffQueue = \"mentions\" | \"escalations\";\n\nexport type CollaborationHandoffActionMetadataInput = {\n  actionKind: CollaborationHandoffActionName;\n  fileId: string;\n  fileName: string;\n  roomId: string;\n  actorEmail: string;\n  createdAt: string;\n  note?: string | null;\n  ownerName?: string | null;\n  ownerEmail?: string | null;\n  queue?: CollaborationHandoffQueue | null;\n  roomCaptured?: boolean;\n  roomStatus?: AdminCollaborationHandoffStatus;\n  roomScore?: number;\n  roomAgeMinutes?: number | null;\n  chatMessageCount?: number;\n  presenceEventCount?: number;\n  unresolvedMentionCount?: number;\n  resolvedCommentCount?: number;\n  escalationCount?: number;\n  latestAt?: string | null;\n};\n\nexport type CollaborationHandoffActionEvent = {\n  action: string;\n  targetId: string;\n  targetLabel: string;\n  actorEmail: string;\n  metadata: AdminAuditMetadata;\n  createdAt: string | Date;\n};\n\nexport type CollaborationHandoffActionState = {\n  fileId: string;\n  ownerName: string | null;\n  ownerEmail: string | null;\n  assignedAt: string | null;\n  evidenceArchivedAt: string | null;\n  staleSnapshotClearedAt: string | null;\n  mentionQueueResolvedAt: string | null;\n  escalationQueueResolvedAt: string | null;\n  latestActionAt: string | null;\n  latestNote: string | null;\n  actionCount: number;\n};\n\nexport function createCollaborationHandoffActionMetadata({\n  actionKind,\n  actorEmail,\n  chatMessageCount = 0,\n  createdAt,\n  escalationCount = 0,\n  fileId,\n  fileName,\n  latestAt,\n  note,\n  ownerEmail,\n  ownerName,\n  presenceEventCount = 0,\n  queue,\n  resolvedCommentCount = 0,\n  roomAgeMinutes,\n  roomCaptured = false,\n  roomId,\n  roomScore = 0,\n  roomStatus = \"review\",\n  unresolvedMentionCount = 0,\n}: CollaborationHandoffActionMetadataInput): AdminAuditMetadata {\n  return {\n    actionKind,\n    actorEmail,\n    chatMessageCount,\n    createdAt,\n    escalationCount,\n    fileId,\n    fileName,\n    latestAt: latestAt ?? null,\n    note: normalizeActionText(note),\n    ownerEmail: normalizeActionText(ownerEmail),\n    ownerName: normalizeActionText(ownerName),\n    presenceEventCount,\n    queue: queue ?? null,\n    resolvedCommentCount,\n    roomAgeMinutes: roomAgeMinutes ?? null,\n    roomCaptured,\n    roomId,\n    roomScore,\n    roomStatus,\n    unresolvedMentionCount,\n  };\n}\n\nexport function getCollaborationHandoffActionStatesFromEvents(\n  events: CollaborationHandoffActionEvent[],\n) {\n  const states = new Map<string, CollaborationHandoffActionState>();\n  const actionNames = new Set<string>(collaborationHandoffActionNames);\n\n  for (const event of [...events].sort(compareActionEventsByCreatedAt)) {\n    if (!actionNames.has(event.action)) {\n      continue;\n    }\n\n    const fileId = getMetadataString(event.metadata.fileId) ?? event.targetId;\n    const state = states.get(fileId) ?? getEmptyActionState(fileId);\n    const createdAt = toIsoDate(event.createdAt);\n\n    state.actionCount += 1;\n    state.latestActionAt = getLatestIso(state.latestActionAt, createdAt);\n    state.latestNote =\n      getMetadataString(event.metadata.note) ?? state.latestNote;\n\n    if (event.action === COLLABORATION_HANDOFF_ASSIGN_OWNER_ACTION) {\n      state.ownerName = getMetadataString(event.metadata.ownerName);\n      state.ownerEmail = getMetadataString(event.metadata.ownerEmail);\n      state.assignedAt = createdAt;\n    }\n\n    if (event.action === COLLABORATION_HANDOFF_ARCHIVE_EVIDENCE_ACTION) {\n      state.evidenceArchivedAt = createdAt;\n    }\n\n    if (event.action === COLLABORATION_HANDOFF_CLEAR_STALE_SNAPSHOT_ACTION) {\n      state.staleSnapshotClearedAt = createdAt;\n    }\n\n    if (event.action === COLLABORATION_HANDOFF_RESOLVE_QUEUE_ACTION) {\n      const queue = getMetadataString(event.metadata.queue);\n\n      if (queue === \"mentions\") {\n        state.mentionQueueResolvedAt = createdAt;\n      } else if (queue === \"escalations\") {\n        state.escalationQueueResolvedAt = createdAt;\n      }\n    }\n\n    states.set(fileId, state);\n  }\n\n  return states;\n}\n\nexport function isCollaborationHandoffActionCurrent(\n  actionAt: string | null | undefined,\n  latestSignalAt: string | null | undefined,\n) {\n  if (!actionAt) {\n    return false;\n  }\n\n  if (!latestSignalAt) {\n    return true;\n  }\n\n  return Date.parse(actionAt) >= Date.parse(latestSignalAt);\n}\n\nfunction getEmptyActionState(fileId: string): CollaborationHandoffActionState {\n  return {\n    fileId,\n    ownerName: null,\n    ownerEmail: null,\n    assignedAt: null,\n    evidenceArchivedAt: null,\n    staleSnapshotClearedAt: null,\n    mentionQueueResolvedAt: null,\n    escalationQueueResolvedAt: null,\n    latestActionAt: null,\n    latestNote: null,\n    actionCount: 0,\n  };\n}\n\nfunction compareActionEventsByCreatedAt(\n  left: CollaborationHandoffActionEvent,\n  right: CollaborationHandoffActionEvent,\n) {\n  return Date.parse(toIsoDate(left.createdAt)) - Date.parse(toIsoDate(right.createdAt));\n}\n\nfunction toIsoDate(value: string | Date) {\n  return value instanceof Date ? value.toISOString() : value;\n}\n\nfunction getLatestIso(left: string | null, right: string | null) {\n  if (!left) {\n    return right;\n  }\n\n  if (!right) {\n    return left;\n  }\n\n  return Date.parse(right) > Date.parse(left) ? right : left;\n}\n\nfunction getMetadataString(value: AdminAuditMetadata[string]) {\n  return typeof value === \"string\" && value.trim() ? value.trim() : null;\n}\n\nfunction normalizeActionText(value: string | null | undefined) {\n  return typeof value === \"string\" && value.trim() ? value.trim() : null;\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-collaboration-handoff-actions.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-collaboration-handoff-actions-ts-f80c7a02c2111ee1.mjs",
  "kind": "ts",
  "hash": "f80c7a02c2111ee1",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": false,
  "transform_kind": "metadata-only",
  "runtime_exports": [],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/features/admin/admin-collaboration-handoff-actions.ts",
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
        "specifier": "@/db/schema",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/admin/admin-collaboration-handoff-operations-types",
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
      "createCollaborationHandoffActionMetadata",
      "getCollaborationHandoffActionStatesFromEvents",
      "isCollaborationHandoffActionCurrent",
      "COLLABORATION_HANDOFF_ASSIGN_OWNER_ACTION",
      "COLLABORATION_HANDOFF_ARCHIVE_EVIDENCE_ACTION",
      "COLLABORATION_HANDOFF_CLEAR_STALE_SNAPSHOT_ACTION",
      "COLLABORATION_HANDOFF_RESOLVE_QUEUE_ACTION",
      "collaborationHandoffActionNames"
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
