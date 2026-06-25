
export const dxSourceText = "import type {\n  DesignCollaborationChatMessage,\n  DesignCollaborationPresenceEvent,\n  DesignCollaborationRoomState,\n} from \"@/features/editor/types\";\n\nexport type CollaborationRoomSnapshot = {\n  chatMessages: DesignCollaborationChatMessage[];\n  presenceEvents: DesignCollaborationPresenceEvent[];\n  updatedAt: string | null;\n};\n\nexport const maxCollaborationRoomChatMessages = 80;\nexport const maxCollaborationRoomPresenceEvents = 80;\n\nexport function getEmptyCollaborationRoomSnapshot(): CollaborationRoomSnapshot {\n  return {\n    chatMessages: [],\n    presenceEvents: [],\n    updatedAt: null,\n  };\n}\n\nexport function toCollaborationRoomSnapshot(\n  state: DesignCollaborationRoomState | undefined,\n): CollaborationRoomSnapshot {\n  if (!state) {\n    return getEmptyCollaborationRoomSnapshot();\n  }\n\n  return {\n    chatMessages: state.chatMessages.slice(-maxCollaborationRoomChatMessages),\n    presenceEvents: state.presenceEvents.slice(\n      0,\n      maxCollaborationRoomPresenceEvents,\n    ),\n    updatedAt: state.updatedAt,\n  };\n}\n\nexport function toDesignCollaborationRoomState(\n  snapshot: Pick<CollaborationRoomSnapshot, \"chatMessages\" | \"presenceEvents\">,\n  updatedAt = new Date().toISOString(),\n): DesignCollaborationRoomState {\n  return {\n    version: 1,\n    chatMessages: snapshot.chatMessages.slice(-maxCollaborationRoomChatMessages),\n    presenceEvents: snapshot.presenceEvents.slice(\n      0,\n      maxCollaborationRoomPresenceEvents,\n    ),\n    updatedAt,\n  };\n}\n\nexport function mergeCollaborationRoomSnapshots(\n  first: CollaborationRoomSnapshot,\n  second: CollaborationRoomSnapshot,\n): CollaborationRoomSnapshot {\n  const chatMessages = mergeById(\n    first.chatMessages,\n    second.chatMessages,\n    (message) => message.createdAt,\n  ).slice(-maxCollaborationRoomChatMessages);\n  const presenceEvents = mergeById(\n    first.presenceEvents,\n    second.presenceEvents,\n    (event) => event.createdAt,\n  )\n    .reverse()\n    .slice(0, maxCollaborationRoomPresenceEvents);\n\n  return {\n    chatMessages,\n    presenceEvents,\n    updatedAt: getLatestIsoDate(first.updatedAt, second.updatedAt),\n  };\n}\n\nfunction mergeById<TItem extends { id: string }>(\n  first: TItem[],\n  second: TItem[],\n  getTime: (item: TItem) => number,\n) {\n  const items = new Map<string, TItem>();\n\n  for (const item of [...first, ...second]) {\n    items.set(item.id, item);\n  }\n\n  return Array.from(items.values()).sort(\n    (left, right) => getTime(left) - getTime(right),\n  );\n}\n\nfunction getLatestIsoDate(first: string | null, second: string | null) {\n  if (!first) {\n    return second;\n  }\n\n  if (!second) {\n    return first;\n  }\n\n  return Date.parse(first) >= Date.parse(second) ? first : second;\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/editor/collaboration-room-state.ts",
  "chunk_output": ".dx/www/output/source-routes/share--token/modules/src-features-editor-collaboration-room-state-ts-3ff3220a5bfda107.mjs",
  "kind": "ts",
  "hash": "3ff3220a5bfda107",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": false,
  "transform_kind": "metadata-only",
  "runtime_exports": [],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/features/editor/collaboration-room-state.ts",
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
      "getEmptyCollaborationRoomSnapshot",
      "toCollaborationRoomSnapshot",
      "toDesignCollaborationRoomState",
      "mergeCollaborationRoomSnapshots",
      "maxCollaborationRoomChatMessages",
      "maxCollaborationRoomPresenceEvents"
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
