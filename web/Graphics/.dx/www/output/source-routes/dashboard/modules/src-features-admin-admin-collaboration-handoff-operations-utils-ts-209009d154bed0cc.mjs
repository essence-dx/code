
export const dxSourceText = "import type {\n  AdminCollaborationHandoffStatus,\n} from \"@/features/admin/admin-collaboration-handoff-operations-types\";\nimport type {\n  DesignCollaborationPresenceEvent,\n  DesignDocument,\n} from \"@/features/editor/types\";\n\nexport const collaborationHandoffStatusWeight: Record<\n  AdminCollaborationHandoffStatus,\n  number\n> = {\n  blocked: 0,\n  review: 1,\n  ready: 2,\n};\n\nexport function getWorstCollaborationHandoffStatus(\n  statuses: AdminCollaborationHandoffStatus[],\n  fallback: AdminCollaborationHandoffStatus = \"ready\",\n) {\n  if (statuses.includes(\"blocked\")) {\n    return \"blocked\";\n  }\n\n  if (statuses.includes(\"review\")) {\n    return \"review\";\n  }\n\n  return fallback;\n}\n\nexport function getLatestCollaborationIso(\n  left: string | null,\n  right: string | null,\n) {\n  if (!left) {\n    return right;\n  }\n\n  if (!right) {\n    return left;\n  }\n\n  return new Date(right).getTime() > new Date(left).getTime() ? right : left;\n}\n\nexport function toIsoFromMs(value: number | null | undefined) {\n  return typeof value === \"number\" && Number.isFinite(value)\n    ? new Date(value).toISOString()\n    : null;\n}\n\nexport function getUnresolvedDocumentMentionCount(document: DesignDocument) {\n  return document.pages.reduce((total, page) => {\n    const unresolvedComments = (page.comments ?? []).filter(\n      (comment) => !comment.resolved,\n    );\n\n    return (\n      total +\n      unresolvedComments.reduce((commentTotal, comment) => {\n        const replyMentionCount = (comment.replies ?? []).reduce(\n          (replyTotal, reply) => replyTotal + (reply.mentions?.length ?? 0),\n          0,\n        );\n\n        return commentTotal + (comment.mentions?.length ?? 0) + replyMentionCount;\n      }, 0)\n    );\n  }, 0);\n}\n\nexport function getLatestUnresolvedDocumentMentionIso(document: DesignDocument) {\n  return document.pages\n    .flatMap((page) => page.comments ?? [])\n    .filter(\n      (comment) =>\n        !comment.resolved &&\n        ((comment.mentions?.length ?? 0) > 0 ||\n          (comment.replies ?? []).some(\n            (reply) => (reply.mentions?.length ?? 0) > 0,\n          )),\n    )\n    .map((comment) => comment.updatedAt)\n    .reduce(getLatestCollaborationIso, null as string | null);\n}\n\nexport function getChatMentionCount(messages: Array<{ text: string }>) {\n  return messages.filter((message) => /(^|\\s)@[\\w.-]+/i.test(message.text)).length;\n}\n\nexport function getLatestPresenceEventIso(\n  events: DesignCollaborationPresenceEvent[],\n) {\n  const latest = events.reduce(\n    (value, event) => Math.max(value, event.createdAt),\n    0,\n  );\n\n  return latest > 0 ? new Date(latest).toISOString() : null;\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-collaboration-handoff-operations-utils.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-collaboration-handoff-operations-utils-ts-209009d154bed0cc.mjs",
  "kind": "ts",
  "hash": "209009d154bed0cc",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": false,
  "transform_kind": "metadata-only",
  "runtime_exports": [],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/features/admin/admin-collaboration-handoff-operations-utils.ts",
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
      "getWorstCollaborationHandoffStatus",
      "getLatestCollaborationIso",
      "toIsoFromMs",
      "getUnresolvedDocumentMentionCount",
      "getLatestUnresolvedDocumentMentionIso",
      "getChatMentionCount",
      "getLatestPresenceEventIso",
      "collaborationHandoffStatusWeight"
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
