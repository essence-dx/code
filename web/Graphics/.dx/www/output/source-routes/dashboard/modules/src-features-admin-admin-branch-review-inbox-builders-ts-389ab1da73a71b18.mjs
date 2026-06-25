
export const dxSourceText = "import type {\n  AdminDesignBranchRecord,\n  AdminDesignBranchStatus,\n} from \"@/features/admin/admin-design-branches\";\nimport type { AdminRollbackReadinessReport } from \"@/features/admin/admin-rollback-readiness\";\nimport type { AdminReleaseApprovalSnapshot } from \"@/features/admin/admin-release-approval-snapshots\";\nimport type { ProductionDeploySmokeReport } from \"@/features/editor/production-deploy-smoke\";\nimport type {\n  DesignComment,\n  DesignDocument,\n  DesignMergeReviewRecord,\n} from \"@/features/editor/types\";\nimport type {\n  AdminBranchReviewInboxFile,\n  AdminBranchReviewInboxStatus,\n  AdminBranchReviewRequest,\n  AdminBranchReviewSlaStatus,\n} from \"@/features/admin/admin-branch-review-inbox-types\";\n\nexport function toBranchReviewRequest({\n  branchStatus,\n  file,\n  now,\n  productionDeploySmoke,\n  record,\n  releaseApprovalSnapshots,\n  rollbackReadiness,\n}: {\n  branchStatus: AdminDesignBranchStatus;\n  file: AdminBranchReviewInboxFile | undefined;\n  now: number;\n  productionDeploySmoke: ProductionDeploySmokeReport;\n  record: AdminDesignBranchRecord;\n  releaseApprovalSnapshots: AdminReleaseApprovalSnapshot[];\n  rollbackReadiness: AdminRollbackReadinessReport;\n}): AdminBranchReviewRequest {\n  const comments = file ? getOpenComments(file.document) : [];\n  const reviewers = getReviewers(comments);\n  const dueDate = getEarliestDueDate(comments);\n  const slaStatus = getSlaStatus({ comments, dueDate, now, reviewers });\n  const mergeReviews = file?.document.mergeReviews ?? [];\n  const latestMergeReviewAt = getLatestMergeReviewAt(mergeReviews);\n  const isReleaseCandidate = record.mergeIntent === \"release-candidate\";\n  const isReviewIntent =\n    record.mergeIntent === \"review\" || record.mergeIntent === \"release-candidate\";\n  const evidence = getReleaseEvidence({\n    latestMergeReviewAt,\n    productionDeploySmoke,\n    releaseApprovalSnapshots,\n    rollbackReadiness,\n  });\n  const blockers = getBlockers({\n    branchStatus,\n    comments,\n    file,\n    isReleaseCandidate,\n    isReviewIntent,\n    mergeReviews,\n    productionDeploySmoke,\n    record,\n    releaseApprovalSnapshots,\n    rollbackReadiness,\n    slaStatus,\n  });\n  const mergeReadiness = getMergeReadiness({\n    blockers,\n    comments,\n    isReviewIntent,\n    mergeReviews,\n    record,\n  });\n  const status = getRequestStatus({ blockers, mergeReadiness, slaStatus });\n\n  return {\n    id: record.id,\n    status,\n    branchId: record.id,\n    branchName: record.branchName,\n    branchFileId: record.fileId,\n    branchFileName: record.fileName,\n    ownerEmail: record.ownerEmail,\n    mergeIntent: record.mergeIntent,\n    reviewers: reviewers.map((reviewer) => reviewer.name),\n    reviewerEmails: reviewers.map((reviewer) => reviewer.email),\n    reviewerSummary:\n      reviewers.length > 0\n        ? reviewers.map((reviewer) => reviewer.name).join(\", \")\n        : \"Unassigned\",\n    slaStatus,\n    dueDate,\n    mergeReadiness,\n    openCommentCount: comments.length,\n    mergeReviewCount: mergeReviews.length,\n    latestMergeReviewAt,\n    releaseEvidenceCount: evidence.length,\n    blockerCount: blockers.length,\n    blockers,\n    evidence,\n    recommendation: getRecommendation({ blockers, mergeReadiness, slaStatus }),\n    updatedAt: file?.updatedAt ?? record.updatedAt,\n  };\n}\n\nexport function sortBranchReviewRequests(\n  left: AdminBranchReviewRequest,\n  right: AdminBranchReviewRequest,\n) {\n  return (\n    statusWeight(left.status) - statusWeight(right.status) ||\n    new Date(left.dueDate ?? left.updatedAt).getTime() -\n      new Date(right.dueDate ?? right.updatedAt).getTime()\n  );\n}\n\nfunction getOpenComments(document: DesignDocument) {\n  return document.pages\n    .flatMap((page) => page.comments ?? [])\n    .filter((comment) => !comment.resolved);\n}\n\nfunction getReviewers(comments: DesignComment[]) {\n  const reviewers = new Map<string, { email: string; name: string }>();\n\n  for (const comment of comments) {\n    const email = comment.assigneeEmail?.trim();\n\n    if (email) {\n      reviewers.set(email, {\n        email,\n        name: comment.assigneeName?.trim() || email,\n      });\n    }\n  }\n\n  return [...reviewers.values()];\n}\n\nfunction getEarliestDueDate(comments: DesignComment[]) {\n  return (\n    comments\n      .map((comment) => comment.dueDate)\n      .filter((date): date is string => Boolean(date))\n      .sort((left, right) => new Date(left).getTime() - new Date(right).getTime())[0] ??\n    null\n  );\n}\n\nfunction getSlaStatus({\n  comments,\n  dueDate,\n  now,\n  reviewers,\n}: {\n  comments: DesignComment[];\n  dueDate: string | null;\n  now: number;\n  reviewers: Array<{ email: string; name: string }>;\n}): AdminBranchReviewSlaStatus {\n  if (comments.length === 0) {\n    return \"clear\";\n  }\n  if (reviewers.length === 0) {\n    return \"unassigned\";\n  }\n  if (!dueDate) {\n    return \"unscheduled\";\n  }\n  const dueAt = new Date(dueDate).getTime();\n\n  if (!Number.isFinite(dueAt)) {\n    return \"unscheduled\";\n  }\n\n  if (dueAt < now) {\n    return \"overdue\";\n  }\n\n  return dueAt - now <= 48 * 60 * 60 * 1000 ? \"due-soon\" : \"clear\";\n}\n\nfunction getLatestMergeReviewAt(reviews: DesignMergeReviewRecord[]) {\n  return (\n    reviews\n      .map((review) => review.createdAt)\n      .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0] ??\n    null\n  );\n}\n\nfunction getReleaseEvidence({\n  latestMergeReviewAt,\n  productionDeploySmoke,\n  releaseApprovalSnapshots,\n  rollbackReadiness,\n}: {\n  latestMergeReviewAt: string | null;\n  productionDeploySmoke: ProductionDeploySmokeReport;\n  releaseApprovalSnapshots: AdminReleaseApprovalSnapshot[];\n  rollbackReadiness: AdminRollbackReadinessReport;\n}) {\n  return [\n    latestMergeReviewAt ? \"merge review\" : \"\",\n    productionDeploySmoke.status !== \"blocked\" ? \"deploy smoke\" : \"\",\n    rollbackReadiness.status !== \"blocked\" ? \"rollback readiness\" : \"\",\n    releaseApprovalSnapshots.length > 0 ? \"release approval\" : \"\",\n  ].filter(Boolean);\n}\n\nfunction getBlockers({\n  branchStatus,\n  comments,\n  file,\n  isReleaseCandidate,\n  isReviewIntent,\n  mergeReviews,\n  productionDeploySmoke,\n  record,\n  releaseApprovalSnapshots,\n  rollbackReadiness,\n  slaStatus,\n}: {\n  branchStatus: AdminDesignBranchStatus;\n  comments: DesignComment[];\n  file: AdminBranchReviewInboxFile | undefined;\n  isReleaseCandidate: boolean;\n  isReviewIntent: boolean;\n  mergeReviews: DesignMergeReviewRecord[];\n  productionDeploySmoke: ProductionDeploySmokeReport;\n  record: AdminDesignBranchRecord;\n  releaseApprovalSnapshots: AdminReleaseApprovalSnapshot[];\n  rollbackReadiness: AdminRollbackReadinessReport;\n  slaStatus: AdminBranchReviewSlaStatus;\n}) {\n  return [\n    !file ? \"Branch file is missing from the admin file window.\" : \"\",\n    branchStatus === \"blocked\" ? \"Branch governance is blocked.\" : \"\",\n    !record.hasRestorePoint ? \"Restore point is missing.\" : \"\",\n    isReviewIntent && slaStatus === \"unassigned\"\n      ? \"Reviewer assignment is missing.\"\n      : \"\",\n    slaStatus === \"overdue\" ? \"Reviewer SLA is overdue.\" : \"\",\n    isReviewIntent && mergeReviews.length === 0\n      ? \"Merge review record is missing.\"\n      : \"\",\n    isReleaseCandidate && comments.length > 0\n      ? \"Release candidate still has open comments.\"\n      : \"\",\n    isReleaseCandidate && releaseApprovalSnapshots.length === 0\n      ? \"Release approval snapshot is missing.\"\n      : \"\",\n    isReleaseCandidate && productionDeploySmoke.status === \"blocked\"\n      ? \"Deploy smoke is blocked.\"\n      : \"\",\n    isReleaseCandidate && rollbackReadiness.status === \"blocked\"\n      ? \"Rollback readiness is blocked.\"\n      : \"\",\n  ].filter(Boolean);\n}\n\nfunction getMergeReadiness({\n  blockers,\n  comments,\n  isReviewIntent,\n  mergeReviews,\n  record,\n}: {\n  blockers: string[];\n  comments: DesignComment[];\n  isReviewIntent: boolean;\n  mergeReviews: DesignMergeReviewRecord[];\n  record: AdminDesignBranchRecord;\n}): AdminBranchReviewInboxStatus {\n  if (blockers.some((blocker) => /missing|blocked|overdue/i.test(blocker))) {\n    return \"blocked\";\n  }\n\n  if (\n    comments.length > 0 ||\n    (isReviewIntent && mergeReviews.length === 0) ||\n    record.updatedAgeDays >= 14\n  ) {\n    return \"review\";\n  }\n\n  return \"ready\";\n}\n\nfunction getRequestStatus({\n  blockers,\n  mergeReadiness,\n  slaStatus,\n}: {\n  blockers: string[];\n  mergeReadiness: AdminBranchReviewInboxStatus;\n  slaStatus: AdminBranchReviewSlaStatus;\n}): AdminBranchReviewInboxStatus {\n  if (mergeReadiness === \"blocked\" || slaStatus === \"overdue\") {\n    return \"blocked\";\n  }\n\n  if (blockers.length > 0 || mergeReadiness === \"review\" || slaStatus !== \"clear\") {\n    return \"review\";\n  }\n\n  return \"ready\";\n}\n\nfunction getRecommendation({\n  blockers,\n  mergeReadiness,\n  slaStatus,\n}: {\n  blockers: string[];\n  mergeReadiness: AdminBranchReviewInboxStatus;\n  slaStatus: AdminBranchReviewSlaStatus;\n}) {\n  if (blockers.length > 0) {\n    return `Resolve ${blockers[0].toLowerCase()}`;\n  }\n\n  if (slaStatus !== \"clear\") {\n    return \"Refresh reviewer assignment and due date before release review.\";\n  }\n\n  return mergeReadiness === \"ready\"\n    ? \"Ready for merge review handoff.\"\n    : \"Record merge review evidence before approval.\";\n}\n\nfunction statusWeight(status: AdminBranchReviewInboxStatus) {\n  if (status === \"blocked\") {\n    return 0;\n  }\n\n  return status === \"review\" ? 1 : 2;\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-branch-review-inbox-builders.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-branch-review-inbox-builders-ts-389ab1da73a71b18.mjs",
  "kind": "ts",
  "hash": "389ab1da73a71b18",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": false,
  "transform_kind": "metadata-only",
  "runtime_exports": [],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/features/admin/admin-branch-review-inbox-builders.ts",
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
        "specifier": "@/features/admin/admin-design-branches",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/admin/admin-rollback-readiness",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/admin/admin-release-approval-snapshots",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/editor/production-deploy-smoke",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/editor/types",
        "side_effect_only": false,
        "type_only": true
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
      "toBranchReviewRequest",
      "sortBranchReviewRequests"
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
