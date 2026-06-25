import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-features-admin-admin-branch-review-inbox-builders-ts-389ab1da73a71b18.mjs";
import { dxSourceModule as dep1, dxRuntimeExports as dep1Runtime } from "./src-features-admin-admin-branch-review-inbox-rows-ts-ed3726790627a29a.mjs";
export const dxSourceText = "import {\n  sortBranchReviewRequests,\n  toBranchReviewRequest,\n} from \"@/features/admin/admin-branch-review-inbox-builders\";\nimport { toBranchReviewInboxRows } from \"@/features/admin/admin-branch-review-inbox-rows\";\nimport type {\n  AdminBranchReviewInboxInput,\n  AdminBranchReviewInboxReport,\n  AdminBranchReviewInboxRow,\n} from \"@/features/admin/admin-branch-review-inbox-types\";\n\nexport type {\n  AdminBranchReviewInboxFile,\n  AdminBranchReviewInboxInput,\n  AdminBranchReviewInboxReport,\n  AdminBranchReviewInboxRow,\n  AdminBranchReviewInboxStatus,\n  AdminBranchReviewRequest,\n  AdminBranchReviewSlaStatus,\n} from \"@/features/admin/admin-branch-review-inbox-types\";\n\nexport function getAdminBranchReviewInbox({\n  branches,\n  files,\n  generatedAt = new Date().toISOString(),\n  now = Date.now(),\n  productionDeploySmoke,\n  releaseApprovalSnapshots,\n  rollbackReadiness,\n}: AdminBranchReviewInboxInput): AdminBranchReviewInboxReport {\n  const filesById = new Map(files.map((file) => [file.fileId, file]));\n  const requests = branches.records\n    .filter((record) => record.branchStatus === \"active\")\n    .map((record) =>\n      toBranchReviewRequest({\n        branchStatus: branches.status,\n        file: filesById.get(record.fileId),\n        now,\n        productionDeploySmoke,\n        record,\n        releaseApprovalSnapshots,\n        rollbackReadiness,\n      }),\n    )\n    .sort(sortBranchReviewRequests);\n  const rows: AdminBranchReviewInboxRow[] =\n    requests.flatMap(toBranchReviewInboxRows);\n\n  if (requests.length === 0) {\n    rows.push(getEmptyInboxRow());\n  }\n\n  const blockedCount = requests.filter(\n    (request) => request.status === \"blocked\",\n  ).length;\n  const reviewCount = requests.filter(\n    (request) => request.status === \"review\",\n  ).length;\n  const readyCount = requests.filter((request) => request.status === \"ready\").length;\n  const uniqueReviewerEmails = new Set(\n    requests.flatMap((request) => request.reviewerEmails),\n  );\n  const overdueCount = requests.filter(\n    (request) => request.slaStatus === \"overdue\",\n  ).length;\n  const dueSoonCount = requests.filter(\n    (request) => request.slaStatus === \"due-soon\",\n  ).length;\n  const blockerCount = requests.reduce(\n    (total, request) => total + request.blockerCount,\n    0,\n  );\n\n  return {\n    generatedAt,\n    status: blockedCount > 0 ? \"blocked\" : reviewCount > 0 ? \"review\" : \"ready\",\n    score: Math.max(0, 100 - blockedCount * 22 - reviewCount * 8 - overdueCount * 4),\n    requestCount: requests.length,\n    readyCount,\n    reviewCount,\n    blockedCount,\n    reviewerCount: uniqueReviewerEmails.size,\n    overdueCount,\n    dueSoonCount,\n    mergeReadyCount: requests.filter(\n      (request) => request.mergeReadiness === \"ready\",\n    ).length,\n    blockerCount,\n    evidenceCount: requests.reduce(\n      (total, request) => total + request.releaseEvidenceCount,\n      0,\n    ),\n    requests,\n    rows,\n    commands: getBranchReviewInboxCommands(),\n  };\n}\n\nfunction getEmptyInboxRow(): AdminBranchReviewInboxRow {\n  return {\n    id: \"branch-review-inbox-empty\",\n    status: \"review\",\n    category: \"reviewers\",\n    branchName: \"No active review branches\",\n    reviewerSummary: \"No reviewers\",\n    label: \"Review inbox is empty\",\n    detail:\n      \"No active design branches are available for reviewer assignment, SLA tracking, or merge readiness.\",\n    recommendation:\n      \"Create a branch from a named version and set merge intent to review or release candidate before production work.\",\n    dueDate: null,\n    latestAt: null,\n    blockerCount: 0,\n  };\n}\n\nfunction getBranchReviewInboxCommands() {\n  return [\n    \"Create branches from Versions > Branch from before risky file changes.\",\n    \"Assign branch reviewers on unresolved comments and set due dates before review starts.\",\n    \"Run merge compare and save merge review notes before release candidate approval.\",\n    \"Attach deploy smoke, rollback readiness, and release approval evidence to the release packet.\",\n  ];\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-branch-review-inbox.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-branch-review-inbox-ts-bb696183754124d3.mjs",
  "kind": "ts",
  "hash": "bb696183754124d3",
  "dependencies": [
    {
      "specifier": "@/features/admin/admin-branch-review-inbox-builders",
      "resolved_path": "src/features/admin/admin-branch-review-inbox-builders.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-branch-review-inbox-builders-ts-389ab1da73a71b18.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/admin/admin-branch-review-inbox-rows",
      "resolved_path": "src/features/admin/admin-branch-review-inbox-rows.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-branch-review-inbox-rows-ts-ed3726790627a29a.mjs",
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
    "source_path": "src/features/admin/admin-branch-review-inbox.ts",
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
        "specifier": "@/features/admin/admin-branch-review-inbox-builders",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/admin/admin-branch-review-inbox-rows",
        "side_effect_only": false,
        "type_only": false
      },
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
      "getAdminBranchReviewInbox"
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
export const dxLinkedDependencies = Object.freeze([dep0, dep1]);
export default dxSourceModule;
