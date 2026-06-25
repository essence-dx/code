import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-features-admin-admin-collaboration-handoff-operations-utils-ts-209009d154bed0cc.mjs";
export const dxSourceText = "import type {\n  AdminCollaborationPresenterState,\n} from \"@/features/admin/admin-collaboration-handoff-operations-types\";\nimport { toIsoFromMs } from \"@/features/admin/admin-collaboration-handoff-operations-utils\";\nimport type { DesignCollaborationPresenceEvent } from \"@/features/editor/types\";\n\ntype PresenterCandidate = {\n  peerId: string;\n  peerName: string;\n  peerEmail: string | null;\n  latestOnAt: number;\n  latestOffAt: number;\n};\n\nexport function getAdminCollaborationPresenterState(\n  events: DesignCollaborationPresenceEvent[],\n): AdminCollaborationPresenterState {\n  const spotlightEvents = events.filter(\n    (event) => event.kind === \"spotlight-on\" || event.kind === \"spotlight-off\",\n  );\n  const followEvents = events.filter(\n    (event) => event.kind === \"followed\" || event.kind === \"unfollowed\",\n  );\n  const activePresenters = getActivePresenters(spotlightEvents);\n  const owner = activePresenters.length === 1 ? activePresenters[0] : null;\n  const status =\n    activePresenters.length > 1 ? \"conflict\" : owner ? \"owned\" : \"idle\";\n  const replayEventCount = spotlightEvents.length + followEvents.length;\n  const lastHandoffAt =\n    replayEventCount > 0\n      ? Math.max(\n          ...[...spotlightEvents, ...followEvents].map((event) => event.createdAt),\n        )\n      : null;\n\n  return {\n    status,\n    ownerName: owner?.peerName ?? null,\n    ownerEmail: owner?.peerEmail ?? null,\n    activePresenterCount: activePresenters.length,\n    spotlightEventCount: spotlightEvents.length,\n    followEventCount: followEvents.length,\n    replayEventCount,\n    lastHandoffAt: toIsoFromMs(lastHandoffAt),\n    summary: getPresenterSummary({\n      activePresenterCount: activePresenters.length,\n      ownerName: owner?.peerName ?? null,\n      replayEventCount,\n      status,\n    }),\n  };\n}\n\nfunction getActivePresenters(events: DesignCollaborationPresenceEvent[]) {\n  const byPeer = new Map<string, PresenterCandidate>();\n\n  for (const event of events) {\n    const peerId = event.peerId ?? event.peerEmail ?? event.peerName;\n    const current =\n      byPeer.get(peerId) ??\n      ({\n        peerId,\n        peerName: event.peerName,\n        peerEmail: event.peerEmail ?? null,\n        latestOnAt: 0,\n        latestOffAt: 0,\n      } satisfies PresenterCandidate);\n\n    byPeer.set(peerId, {\n      ...current,\n      peerName: event.peerName,\n      peerEmail: event.peerEmail ?? current.peerEmail,\n      latestOnAt:\n        event.kind === \"spotlight-on\"\n          ? Math.max(current.latestOnAt, event.createdAt)\n          : current.latestOnAt,\n      latestOffAt:\n        event.kind === \"spotlight-off\"\n          ? Math.max(current.latestOffAt, event.createdAt)\n          : current.latestOffAt,\n    });\n  }\n\n  return [...byPeer.values()].filter(\n    (candidate) => candidate.latestOnAt > candidate.latestOffAt,\n  );\n}\n\nfunction getPresenterSummary({\n  activePresenterCount,\n  ownerName,\n  replayEventCount,\n  status,\n}: {\n  activePresenterCount: number;\n  ownerName: string | null;\n  replayEventCount: number;\n  status: AdminCollaborationPresenterState[\"status\"];\n}) {\n  if (status === \"conflict\") {\n    return `${activePresenterCount} collaborators appear to own presenter spotlight.`;\n  }\n\n  if (status === \"owned\") {\n    return `${ownerName ?? \"A collaborator\"} owns presenter handoff with ${replayEventCount} replay events.`;\n  }\n\n  return replayEventCount > 0\n    ? `No active presenter, but ${replayEventCount} presenter replay events are available.`\n    : \"No presenter ownership or replay evidence has been recorded.\";\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-collaboration-handoff-operations-presenter.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-collaboration-handoff-operations-presenter-ts-6672d98787c3bbfd.mjs",
  "kind": "ts",
  "hash": "6672d98787c3bbfd",
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
    "source_path": "src/features/admin/admin-collaboration-handoff-operations-presenter.ts",
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
      },
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
      "getAdminCollaborationPresenterState"
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
