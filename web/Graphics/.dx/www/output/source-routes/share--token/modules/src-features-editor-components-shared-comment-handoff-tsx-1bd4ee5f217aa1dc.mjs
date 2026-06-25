import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-components-ui-button-tsx-a045a54d4568e98d.mjs";
import { dxSourceModule as dep1, dxRuntimeExports as dep1Runtime } from "./src-components-ui-input-tsx-5c00dcef4bc2ae59.mjs";
import { dxSourceModule as dep2, dxRuntimeExports as dep2Runtime } from "./src-features-editor-comment-export-ts-bc4016a468c68e44.mjs";
import { dxSourceModule as dep3, dxRuntimeExports as dep3Runtime } from "./src-lib-forge-icons-lucide-react-tsx-b9b0a8debf22abe8.mjs";
export const dxSourceText = "\"use client\";\n\nimport { useState } from \"react\";\nimport {\n  CheckCircle2,\n  Circle,\n  Download,\n  MessageSquare,\n  Search,\n} from \"lucide-react\";\nimport { Button } from \"@/components/ui/button\";\nimport { Input } from \"@/components/ui/input\";\nimport { commentsToCsv, downloadCsv } from \"@/features/editor/comment-export\";\nimport type { DesignComment } from \"@/features/editor/types\";\n\ntype SharedCommentFilter = \"all\" | \"open\" | \"resolved\";\n\ntype SharedCommentHandoffProps = {\n  comments: DesignComment[];\n};\n\nexport function SharedCommentHandoff({ comments }: SharedCommentHandoffProps) {\n  const [filter, setFilter] = useState<SharedCommentFilter>(\"all\");\n  const [query, setQuery] = useState(\"\");\n  const openCount = comments.filter((comment) => !comment.resolved).length;\n  const resolvedCount = comments.length - openCount;\n  const visibleComments = getVisibleComments(comments, filter, query);\n\n  return (\n    <section className=\"space-y-2\">\n      <div className=\"flex items-center justify-between gap-2\">\n        <h2 className=\"text-xs font-medium uppercase tracking-wide text-muted-foreground\">\n          Active Page Comments\n        </h2>\n        <div className=\"flex items-center gap-2\">\n          <span className=\"font-mono text-[11px] text-muted-foreground\">\n            {openCount} open\n          </span>\n          <Button\n            type=\"button\"\n            size=\"icon\"\n            variant=\"ghost\"\n            className=\"size-6\"\n            disabled={visibleComments.length === 0}\n            aria-label=\"Export visible comments as CSV\"\n            onClick={() =>\n              downloadCsv(\"shared-comments.csv\", commentsToCsv(visibleComments))\n            }\n          >\n            <Download className=\"size-3.5\" />\n          </Button>\n        </div>\n      </div>\n      <div className=\"grid grid-cols-3 gap-1 rounded-md border border-border bg-background p-0.5\">\n        <FilterButton\n          active={filter === \"all\"}\n          label=\"All\"\n          value={comments.length}\n          onClick={() => setFilter(\"all\")}\n        />\n        <FilterButton\n          active={filter === \"open\"}\n          label=\"Open\"\n          value={openCount}\n          onClick={() => setFilter(\"open\")}\n        />\n        <FilterButton\n          active={filter === \"resolved\"}\n          label=\"Done\"\n          value={resolvedCount}\n          onClick={() => setFilter(\"resolved\")}\n        />\n      </div>\n      <div className=\"relative\">\n        <Search className=\"pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground\" />\n        <Input\n          value={query}\n          className=\"h-7 pl-8 text-xs\"\n          placeholder=\"Search comments\"\n          onChange={(event) => setQuery(event.target.value)}\n        />\n      </div>\n      <div className=\"space-y-2\">\n        {visibleComments.length > 0 ? (\n          visibleComments.map((comment, index) => (\n            <CommentCard\n              key={comment.id}\n              comment={comment}\n              index={comments.findIndex((item) => item.id === comment.id) + 1}\n              fallbackIndex={index + 1}\n            />\n          ))\n        ) : (\n          <div className=\"rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground\">\n            {comments.length > 0\n              ? getEmptyLabel(filter, query)\n              : \"No comments on this page.\"}\n          </div>\n        )}\n      </div>\n    </section>\n  );\n}\n\nfunction FilterButton({\n  active,\n  label,\n  value,\n  onClick,\n}: {\n  active: boolean;\n  label: string;\n  value: number;\n  onClick: () => void;\n}) {\n  return (\n    <Button\n      type=\"button\"\n      size=\"sm\"\n      variant={active ? \"secondary\" : \"ghost\"}\n      className=\"h-6 gap-1 rounded-sm px-1 text-xs\"\n      onClick={onClick}\n    >\n      <span className=\"truncate\">{label}</span>\n      <span className=\"font-mono text-[10px] text-muted-foreground\">\n        {value}\n      </span>\n    </Button>\n  );\n}\n\nfunction CommentCard({\n  comment,\n  index,\n  fallbackIndex,\n}: {\n  comment: DesignComment;\n  index: number;\n  fallbackIndex: number;\n}) {\n  return (\n    <div className=\"rounded-md border border-border bg-background p-3\">\n      <div className=\"mb-2 flex items-center gap-2\">\n        <div className=\"grid size-6 place-items-center rounded-full bg-primary font-mono text-[11px] font-bold text-primary-foreground\">\n          {index > 0 ? index : fallbackIndex}\n        </div>\n        <span className=\"min-w-0 flex-1 truncate font-mono text-[11px] text-muted-foreground\">\n          {Math.round(comment.x)}, {Math.round(comment.y)}\n        </span>\n        <span className=\"flex items-center gap-1 text-[11px] text-muted-foreground\">\n          {comment.resolved ? (\n            <CheckCircle2 className=\"size-3.5\" />\n          ) : (\n            <Circle className=\"size-3.5\" />\n          )}\n          {comment.resolved ? \"Done\" : \"Open\"}\n        </span>\n      </div>\n      <p className=\"line-clamp-4 whitespace-pre-wrap text-sm\">{comment.text}</p>\n      {(comment.replies ?? []).length > 0 ? (\n        <div className=\"mt-3 space-y-2 border-l border-border pl-3\">\n          {(comment.replies ?? []).slice(0, 2).map((reply) => (\n            <div key={reply.id} className=\"space-y-0.5\">\n              <div className=\"text-[11px] font-medium text-muted-foreground\">\n                {reply.authorName ?? \"Reply\"}\n              </div>\n              <p className=\"line-clamp-3 whitespace-pre-wrap text-xs\">\n                {reply.text}\n              </p>\n            </div>\n          ))}\n          {(comment.replies ?? []).length > 2 ? (\n            <div className=\"text-xs text-muted-foreground\">\n              +{(comment.replies ?? []).length - 2} more replies\n            </div>\n          ) : null}\n        </div>\n      ) : null}\n    </div>\n  );\n}\n\nfunction getVisibleComments(\n  comments: DesignComment[],\n  filter: SharedCommentFilter,\n  query: string,\n) {\n  const normalizedQuery = query.trim().toLowerCase();\n  const filteredComments = comments.filter((comment) => {\n    if (filter === \"open\") {\n      return !comment.resolved;\n    }\n\n    if (filter === \"resolved\") {\n      return comment.resolved;\n    }\n\n    return true;\n  });\n\n  if (!normalizedQuery) {\n    return filteredComments;\n  }\n\n  return filteredComments.filter((comment) =>\n    getCommentSearchText(comment).includes(normalizedQuery),\n  );\n}\n\nfunction getCommentSearchText(comment: DesignComment) {\n  return [\n    comment.text,\n    `${Math.round(comment.x)}, ${Math.round(comment.y)}`,\n    ...(comment.mentions ?? []),\n    ...(comment.replies ?? []).flatMap((reply) => [\n      reply.text,\n      reply.authorName ?? \"\",\n      ...(reply.mentions ?? []),\n    ]),\n  ]\n    .join(\" \")\n    .toLowerCase();\n}\n\nfunction getEmptyLabel(filter: SharedCommentFilter, query: string) {\n  if (query.trim()) {\n    return \"No comments match that search.\";\n  }\n\n  if (filter === \"open\") {\n    return \"No open comments.\";\n  }\n\n  if (filter === \"resolved\") {\n    return \"No resolved comments.\";\n  }\n\n  return \"No comments match this view.\";\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/editor/components/shared-comment-handoff.tsx",
  "chunk_output": ".dx/www/output/source-routes/share--token/modules/src-features-editor-components-shared-comment-handoff-tsx-1bd4ee5f217aa1dc.mjs",
  "kind": "tsx",
  "hash": "1bd4ee5f217aa1dc",
  "dependencies": [
    {
      "specifier": "@/components/ui/button",
      "resolved_path": "src/components/ui/button.tsx",
      "chunk_output": ".dx/www/output/source-routes/share--token/modules/src-components-ui-button-tsx-a045a54d4568e98d.mjs",
      "kind": "tsx",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/components/ui/input",
      "resolved_path": "src/components/ui/input.tsx",
      "chunk_output": ".dx/www/output/source-routes/share--token/modules/src-components-ui-input-tsx-5c00dcef4bc2ae59.mjs",
      "kind": "tsx",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/editor/comment-export",
      "resolved_path": "src/features/editor/comment-export.ts",
      "chunk_output": ".dx/www/output/source-routes/share--token/modules/src-features-editor-comment-export-ts-bc4016a468c68e44.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "lucide-react",
      "resolved_path": "src/lib/forge/icons/lucide-react.tsx",
      "chunk_output": ".dx/www/output/source-routes/share--token/modules/src-lib-forge-icons-lucide-react-tsx-b9b0a8debf22abe8.mjs",
      "kind": "tsx",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "react",
      "resolved_path": null,
      "chunk_output": null,
      "kind": "compiler-intrinsic",
      "resolver_source": "compiler-intrinsic",
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
    "source_path": "src/features/editor/components/shared-comment-handoff.tsx",
    "source_kind": "tsx",
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
    "directives": [
      {
        "value": "use client",
        "scope": "module-prologue",
        "line": 1,
        "column": 1
      }
    ],
    "static_imports": [
      {
        "specifier": "react",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "lucide-react",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/components/ui/button",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/components/ui/input",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/editor/comment-export",
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
      "SharedCommentHandoff"
    ],
    "jsx": true,
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
export const dxLinkedDependencies = Object.freeze([dep0, dep1, dep2, dep3]);
export default dxSourceModule;
