
export const dxSourceText = "import type {\n  AdminBranchReviewInboxRow,\n  AdminBranchReviewInboxStatus,\n  AdminBranchReviewRequest,\n  AdminBranchReviewSlaStatus,\n} from \"@/features/admin/admin-branch-review-inbox-types\";\n\nexport function toBranchReviewInboxRows(item: AdminBranchReviewRequest) {\n  return [\n    {\n      id: `${item.id}-reviewers`,\n      status: item.reviewers.length > 0 ? \"ready\" : \"blocked\",\n      category: \"reviewers\",\n      branchName: item.branchName,\n      reviewerSummary: item.reviewerSummary,\n      label: \"Reviewer assignment\",\n      detail: `${item.reviewerSummary} owns ${item.openCommentCount} open review comments.`,\n      recommendation:\n        item.reviewers.length > 0\n          ? \"Keep reviewer ownership visible until the merge decision is recorded.\"\n          : \"Assign at least one reviewer to unresolved branch review comments.\",\n      dueDate: item.dueDate,\n      latestAt: item.updatedAt,\n      blockerCount: item.reviewers.length > 0 ? 0 : 1,\n    },\n    {\n      id: `${item.id}-sla`,\n      status: toStatusFromSla(item.slaStatus),\n      category: \"sla\",\n      branchName: item.branchName,\n      reviewerSummary: item.reviewerSummary,\n      label: \"SLA state\",\n      detail: `SLA is ${item.slaStatus}${item.dueDate ? ` with due date ${item.dueDate}` : \"\"}.`,\n      recommendation:\n        item.slaStatus === \"clear\"\n          ? \"Keep the branch due date current until merge.\"\n          : \"Set or refresh the reviewer due date before release review.\",\n      dueDate: item.dueDate,\n      latestAt: item.updatedAt,\n      blockerCount: item.slaStatus === \"overdue\" ? 1 : 0,\n    },\n    {\n      id: `${item.id}-merge`,\n      status: item.mergeReadiness,\n      category: \"merge-readiness\",\n      branchName: item.branchName,\n      reviewerSummary: item.reviewerSummary,\n      label: \"Merge readiness\",\n      detail: `${item.mergeReviewCount} merge review records and ${item.openCommentCount} open comments.`,\n      recommendation:\n        item.mergeReadiness === \"ready\"\n          ? \"Branch has enough evidence for merge review handoff.\"\n          : \"Resolve blockers and record a merge review before approval.\",\n      dueDate: item.dueDate,\n      latestAt: item.latestMergeReviewAt,\n      blockerCount: item.blockerCount,\n    },\n    {\n      id: `${item.id}-evidence`,\n      status: item.releaseEvidenceCount >= 3 ? \"ready\" : \"review\",\n      category: \"release-evidence\",\n      branchName: item.branchName,\n      reviewerSummary: item.reviewerSummary,\n      label: \"Release evidence\",\n      detail: `${item.releaseEvidenceCount} release evidence anchors are attached.`,\n      recommendation:\n        \"Keep merge review, smoke, rollback, and release approval evidence together.\",\n      dueDate: item.dueDate,\n      latestAt: item.latestMergeReviewAt,\n      blockerCount: Math.max(0, 3 - item.releaseEvidenceCount),\n    },\n  ] satisfies AdminBranchReviewInboxRow[];\n}\n\nfunction toStatusFromSla(\n  slaStatus: AdminBranchReviewSlaStatus,\n): AdminBranchReviewInboxStatus {\n  if (slaStatus === \"overdue\" || slaStatus === \"unassigned\") {\n    return \"blocked\";\n  }\n\n  return slaStatus === \"clear\" ? \"ready\" : \"review\";\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-branch-review-inbox-rows.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-branch-review-inbox-rows-ts-ed3726790627a29a.mjs",
  "kind": "ts",
  "hash": "ed3726790627a29a",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": false,
  "transform_kind": "metadata-only",
  "runtime_exports": [],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/features/admin/admin-branch-review-inbox-rows.ts",
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
        "specifier": "@/features/admin/admin-branch-review-inbox-types",
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
      "toBranchReviewInboxRows"
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
