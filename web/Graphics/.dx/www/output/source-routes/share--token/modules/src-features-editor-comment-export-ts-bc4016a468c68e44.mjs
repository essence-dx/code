
export const dxSourceText = "import type { DesignComment } from \"@/features/editor/types\";\n\nexport function commentsToCsv(comments: DesignComment[]) {\n  const rows = comments.flatMap((comment, index) => {\n    const number = index + 1;\n    const commentRow = [\n      \"comment\",\n      String(number),\n      comment.resolved ? \"resolved\" : \"open\",\n      String(Math.round(comment.x)),\n      String(Math.round(comment.y)),\n      comment.assigneeName ?? \"\",\n      comment.dueDate ?? \"\",\n      summarizeReactions(comment),\n      summarizeResolutionHistory(comment),\n      \"\",\n      comment.text,\n      comment.createdAt,\n      comment.updatedAt,\n    ];\n    const replyRows = (comment.replies ?? []).map((reply) => [\n      \"reply\",\n      String(number),\n      comment.resolved ? \"resolved\" : \"open\",\n        String(Math.round(comment.x)),\n        String(Math.round(comment.y)),\n        comment.assigneeName ?? \"\",\n        comment.dueDate ?? \"\",\n        summarizeReactions(comment),\n        summarizeResolutionHistory(comment),\n        reply.authorName ?? \"\",\n        reply.text,\n      reply.createdAt,\n      reply.updatedAt,\n    ]);\n\n    return [commentRow, ...replyRows];\n  });\n\n  return [\n    [\n      \"type\",\n      \"comment_number\",\n      \"status\",\n      \"x\",\n      \"y\",\n      \"assignee\",\n      \"due_date\",\n      \"reactions\",\n      \"resolution_history\",\n      \"author\",\n      \"text\",\n      \"created_at\",\n      \"updated_at\",\n    ],\n    ...rows,\n  ]\n    .map((row) => row.map(escapeCsvCell).join(\",\"))\n    .join(\"\\n\");\n}\n\nfunction summarizeResolutionHistory(comment: DesignComment) {\n  return (comment.resolutionHistory ?? [])\n    .map((item) => `${item.status}:${item.actorName}:${item.createdAt}`)\n    .join(\" | \");\n}\n\nfunction summarizeReactions(comment: DesignComment) {\n  const counts = (comment.reactions ?? []).reduce<Record<string, number>>(\n    (summary, reaction) => ({\n      ...summary,\n      [reaction.kind]: (summary[reaction.kind] ?? 0) + 1,\n    }),\n    {},\n  );\n\n  return Object.entries(counts)\n    .map(([kind, count]) => `${kind}:${count}`)\n    .join(\" \");\n}\n\nexport function downloadCsv(filename: string, csv: string) {\n  const blob = new Blob([csv], { type: \"text/csv;charset=utf-8\" });\n  const url = URL.createObjectURL(blob);\n  const link = document.createElement(\"a\");\n  link.href = url;\n  link.download = filename;\n  link.click();\n  URL.revokeObjectURL(url);\n}\n\nfunction escapeCsvCell(value: string) {\n  if (!/[\",\\n\\r]/.test(value)) {\n    return value;\n  }\n\n  return `\"${value.replaceAll('\"', '\"\"')}\"`;\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/editor/comment-export.ts",
  "chunk_output": ".dx/www/output/source-routes/share--token/modules/src-features-editor-comment-export-ts-bc4016a468c68e44.mjs",
  "kind": "ts",
  "hash": "bc4016a468c68e44",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": false,
  "transform_kind": "metadata-only",
  "runtime_exports": [],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/features/editor/comment-export.ts",
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
      "commentsToCsv",
      "downloadCsv"
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
