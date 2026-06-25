import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-features-admin-admin-comment-reaction-workflows-export-ts-d951fea5d2dab72d.mjs";
export const dxSourceText = "import type {\n  AdminCommentReactionModerationItem,\n  AdminCommentReactionSource,\n  AdminCommentReactionWorkflowComment,\n  AdminCommentReactionWorkflowDelivery,\n  AdminCommentReactionWorkflowInput,\n  AdminCommentReactionWorkflowRow,\n  AdminCommentReactionWorkflowStatus,\n  AdminCommentReactionWorkflowsReport,\n} from \"@/features/admin/admin-comment-reaction-workflows-types\";\nimport type { DesignComment, DesignCommentReaction } from \"@/features/editor/types\";\n\nexport function getAdminCommentReactionWorkflowsReport({\n  files,\n  generatedAt = new Date().toISOString(),\n  notificationDeliveries,\n}: AdminCommentReactionWorkflowInput): AdminCommentReactionWorkflowsReport {\n  const activeFiles = files.filter((file) => !file.trashedAt);\n  const commentSources = activeFiles.flatMap(getCommentSources);\n  const reactionDeliveries = notificationDeliveries.filter((delivery) =>\n    isReactionDeliveryKind(delivery.kind),\n  );\n  const deliveriesByComment = groupBy(\n    reactionDeliveries,\n    (delivery) => delivery.commentId,\n  );\n  const moderationQueue = commentSources\n    .flatMap((source) => getModerationItems(source))\n    .sort(sortModerationItems);\n  const moderationByComment = groupBy(\n    moderationQueue,\n    (item) => item.commentId,\n  );\n  const comments = commentSources.map((source) =>\n    getReactionWorkflowComment({\n      deliveries: deliveriesByComment.get(source.comment.id) ?? [],\n      moderationItems: moderationByComment.get(source.comment.id) ?? [],\n      source,\n    }),\n  );\n  const reactionCount = comments.reduce(\n    (total, comment) => total + comment.reactionCount,\n    0,\n  );\n  const acknowledgementCount = comments.reduce(\n    (total, comment) => total + comment.acknowledgementCount,\n    0,\n  );\n  const unacknowledgedOpenCommentCount = comments.filter(\n    (comment) => !comment.resolved && comment.acknowledgementCount === 0,\n  ).length;\n  const failedReactionNotificationCount = reactionDeliveries.filter(\n    (delivery) => delivery.status === \"failed\",\n  ).length;\n  const unroutedReactionNotificationCount = failedReactionNotificationCount;\n  const rows = getReactionWorkflowRows({\n    acknowledgementCount,\n    comments,\n    failedReactionNotificationCount,\n    moderationQueue,\n    reactionCount,\n    reactionDeliveries,\n    unacknowledgedOpenCommentCount,\n  });\n  const blockedRows = rows.filter((row) => row.status === \"blocked\").length;\n  const reviewRows = rows.filter((row) => row.status === \"review\").length;\n\n  return {\n    generatedAt,\n    status: getWorstStatus(rows.map((row) => row.status)),\n    score: Math.max(0, 100 - blockedRows * 18 - reviewRows * 6),\n    fileCount: activeFiles.length,\n    commentCount: comments.length,\n    openCommentCount: comments.filter((comment) => !comment.resolved).length,\n    reactionCount,\n    acknowledgementCount,\n    unacknowledgedOpenCommentCount,\n    reactionNotificationRouteCount: reactionDeliveries.length,\n    failedReactionNotificationCount,\n    unroutedReactionNotificationCount,\n    moderationReviewCount: moderationQueue.length,\n    rows,\n    comments: comments.sort(sortComments),\n    moderationQueue,\n    commands: getCommentReactionWorkflowCommands(),\n  };\n}\n\nfunction getCommentSources(\n  file: AdminCommentReactionWorkflowInput[\"files\"][number],\n): AdminCommentReactionSource[] {\n  return file.document.pages.flatMap((page) =>\n    (page.comments ?? []).map((comment) => ({\n      comment,\n      file,\n      pageName: page.name,\n    })),\n  );\n}\n\nfunction getReactionWorkflowComment({\n  deliveries,\n  moderationItems,\n  source,\n}: {\n  deliveries: AdminCommentReactionWorkflowDelivery[];\n  moderationItems: AdminCommentReactionModerationItem[];\n  source: AdminCommentReactionSource;\n}): AdminCommentReactionWorkflowComment {\n  const reactionCount = source.comment.reactions?.length ?? 0;\n  const acknowledgementCount = getAcknowledgementCount(source.comment);\n  const failedNotificationCount = deliveries.filter(\n    (delivery) => delivery.status === \"failed\",\n  ).length;\n  const status = getCommentStatus({\n    acknowledgementCount,\n    failedNotificationCount,\n    moderationReviewCount: moderationItems.length,\n    resolved: source.comment.resolved,\n  });\n\n  return {\n    id: `comment-reaction-workflow-${source.file.fileId}-${source.comment.id}`,\n    status,\n    fileId: source.file.fileId,\n    fileName: source.file.fileName,\n    ownerEmail: source.file.ownerEmail,\n    pageName: source.pageName,\n    commentId: source.comment.id,\n    textPreview: summarizeText(source.comment.text),\n    resolved: source.comment.resolved,\n    assigneeEmail: source.comment.assigneeEmail ?? null,\n    reactionCount,\n    acknowledgementCount,\n    reactionNotificationCount: deliveries.length,\n    failedNotificationCount,\n    moderationReviewCount: moderationItems.length,\n    latestAt: getLatestIso([\n      source.comment.updatedAt,\n      ...((source.comment.reactions ?? []).map((reaction) => reaction.createdAt)),\n      ...deliveries.map((delivery) => delivery.createdAt),\n    ]),\n    recommendation: getCommentRecommendation(status, acknowledgementCount),\n  };\n}\n\nfunction getModerationItems({\n  comment,\n  file,\n  pageName,\n}: AdminCommentReactionSource): AdminCommentReactionModerationItem[] {\n  return (comment.reactions ?? []).flatMap((reaction) => {\n    const reason = getModerationReason(comment, reaction, file.ownerEmail);\n\n    if (!reason) {\n      return [];\n    }\n\n    return [\n      {\n        id: `comment-reaction-moderation-${file.fileId}-${comment.id}-${reaction.id}`,\n        status: reason.includes(\"External\") ? \"blocked\" : \"review\",\n        fileId: file.fileId,\n        fileName: file.fileName,\n        ownerEmail: file.ownerEmail,\n        pageName,\n        commentId: comment.id,\n        reactionId: reaction.id,\n        reactionKind: reaction.kind,\n        actorName: reaction.actorName,\n        actorEmail: reaction.actorEmail ?? null,\n        reason,\n        latestAt: reaction.createdAt,\n      } satisfies AdminCommentReactionModerationItem,\n    ];\n  });\n}\n\nfunction getReactionWorkflowRows({\n  acknowledgementCount,\n  comments,\n  failedReactionNotificationCount,\n  moderationQueue,\n  reactionCount,\n  reactionDeliveries,\n  unacknowledgedOpenCommentCount,\n}: {\n  acknowledgementCount: number;\n  comments: AdminCommentReactionWorkflowComment[];\n  failedReactionNotificationCount: number;\n  moderationQueue: AdminCommentReactionModerationItem[];\n  reactionCount: number;\n  reactionDeliveries: AdminCommentReactionWorkflowDelivery[];\n  unacknowledgedOpenCommentCount: number;\n}): AdminCommentReactionWorkflowRow[] {\n  const rows: AdminCommentReactionWorkflowRow[] = [\n    {\n      id: \"comment-reaction-persistent-state\",\n      category: \"persistent-state\",\n      status: reactionCount > 0 ? \"ready\" : \"review\",\n      label: \"Persistent reaction state\",\n      value: `${reactionCount} reactions`,\n      detail: `${comments.length} comments are inspected with ${reactionCount} persisted reaction records.`,\n      recommendation:\n        reactionCount > 0\n          ? \"Reaction state is available for review workflows and exports.\"\n          : \"Capture reviewer reactions before relying on acknowledgement workflows.\",\n      count: reactionCount,\n      target: comments.find((comment) => comment.reactionCount === 0)?.fileName ?? null,\n      latestAt: getLatestIso(comments.map((comment) => comment.latestAt)),\n    },\n    {\n      id: \"comment-reaction-acknowledgement\",\n      category: \"acknowledgement\",\n      status: unacknowledgedOpenCommentCount > 0 ? \"review\" : \"ready\",\n      label: \"Acknowledgement workflow\",\n      value: `${acknowledgementCount} acknowledgements`,\n      detail: `${unacknowledgedOpenCommentCount} open comment${unacknowledgedOpenCommentCount === 1 ? \"\" : \"s\"} still need a check acknowledgement.`,\n      recommendation:\n        unacknowledgedOpenCommentCount > 0\n          ? \"Ask assignees or reviewers to acknowledge open comments with a check reaction.\"\n          : \"Open comments have acknowledgement coverage.\",\n      count: unacknowledgedOpenCommentCount,\n      target:\n        comments.find(\n          (comment) => !comment.resolved && comment.acknowledgementCount === 0,\n        )?.fileName ?? null,\n      latestAt: getLatestIso(comments.map((comment) => comment.latestAt)),\n    },\n    {\n      id: \"comment-reaction-notification-routing\",\n      category: \"notification-routing\",\n      status: failedReactionNotificationCount > 0 ? \"blocked\" : \"ready\",\n      label: \"Notification routing\",\n      value: `${reactionDeliveries.length} routes`,\n      detail: `${failedReactionNotificationCount} reaction or acknowledgement notification route${failedReactionNotificationCount === 1 ? \"\" : \"s\"} failed and need retry.`,\n      recommendation:\n        failedReactionNotificationCount > 0\n          ? \"Retry failed reaction and acknowledgement notification routes before review handoff.\"\n          : \"Reaction and acknowledgement notifications have delivery evidence.\",\n      count: failedReactionNotificationCount,\n      target:\n        reactionDeliveries.find((delivery) => delivery.status === \"failed\")\n          ?.recipientEmail ?? null,\n      latestAt: getLatestIso(reactionDeliveries.map((delivery) => delivery.createdAt)),\n    },\n    {\n      id: \"comment-reaction-moderation-review\",\n      category: \"moderation-review\",\n      status: getWorstStatus(moderationQueue.map((item) => item.status)),\n      label: \"Moderation review\",\n      value: `${moderationQueue.length} rows`,\n      detail: `${moderationQueue.length} reaction moderation row${moderationQueue.length === 1 ? \"\" : \"s\"} need reviewer confirmation.`,\n      recommendation:\n        moderationQueue.length > 0\n          ? \"Review external acknowledgements and missing actor metadata before release handoff.\"\n          : \"No reaction moderation row needs review.\",\n      count: moderationQueue.length,\n      target: moderationQueue[0]?.fileName ?? null,\n      latestAt: getLatestIso(moderationQueue.map((item) => item.latestAt)),\n    },\n  ];\n\n  return rows.sort(sortRows);\n}\n\nfunction getAcknowledgementCount(comment: DesignComment) {\n  return (comment.reactions ?? []).filter((reaction) => reaction.kind === \"check\")\n    .length;\n}\n\nfunction getCommentStatus({\n  acknowledgementCount,\n  failedNotificationCount,\n  moderationReviewCount,\n  resolved,\n}: {\n  acknowledgementCount: number;\n  failedNotificationCount: number;\n  moderationReviewCount: number;\n  resolved: boolean;\n}): AdminCommentReactionWorkflowStatus {\n  if (failedNotificationCount > 0 || moderationReviewCount > 0) {\n    return \"blocked\";\n  }\n\n  if (!resolved && acknowledgementCount === 0) {\n    return \"review\";\n  }\n\n  return \"ready\";\n}\n\nfunction getModerationReason(\n  comment: DesignComment,\n  reaction: DesignCommentReaction,\n  ownerEmail: string,\n) {\n  if (!reaction.actorEmail) {\n    return \"Reaction actor email is missing and needs moderation review.\";\n  }\n\n  if (\n    reaction.kind === \"check\" &&\n    getDomain(reaction.actorEmail) !== getDomain(ownerEmail)\n  ) {\n    return \"External acknowledgement requires moderation review.\";\n  }\n\n  if (!comment.resolved && reaction.kind === \"eyes\" && !comment.assigneeEmail) {\n    return \"Unassigned watched comment needs an owner before review handoff.\";\n  }\n\n  return null;\n}\n\nfunction getCommentRecommendation(\n  status: AdminCommentReactionWorkflowStatus,\n  acknowledgementCount: number,\n) {\n  if (status === \"blocked\") {\n    return \"Review moderation and failed notification routes before release handoff.\";\n  }\n\n  if (acknowledgementCount === 0) {\n    return \"Ask the assignee to acknowledge the comment with a check reaction.\";\n  }\n\n  return \"Reaction and acknowledgement workflow evidence is ready.\";\n}\n\nfunction isReactionDeliveryKind(kind: string) {\n  return kind === \"reaction\" || kind === \"acknowledgement\";\n}\n\nfunction getCommentReactionWorkflowCommands() {\n  return [\n    \"bun run admin:comment-reaction-workflows-smoke\",\n    \"Export Admin > Comment reaction workflows JSON.\",\n    \"Export Admin > Comment reaction workflows CSV.\",\n    \"Export Admin > Comment reaction workflows Markdown.\",\n    \"Review Admin > Notifications before release handoff when external acknowledgements are present.\",\n  ];\n}\n\nfunction getWorstStatus(statuses: AdminCommentReactionWorkflowStatus[]) {\n  if (statuses.includes(\"blocked\")) {\n    return \"blocked\";\n  }\n\n  if (statuses.includes(\"review\")) {\n    return \"review\";\n  }\n\n  return \"ready\";\n}\n\nfunction getLatestIso(values: Array<string | null | undefined>) {\n  return (\n    values\n      .filter((value): value is string => Boolean(value))\n      .sort((left, right) => Date.parse(right) - Date.parse(left))[0] ?? null\n  );\n}\n\nfunction getDomain(email: string) {\n  return email.split(\"@\")[1]?.toLowerCase() ?? \"\";\n}\n\nfunction summarizeText(value: string) {\n  const text = value.trim().replace(/\\s+/g, \" \");\n\n  return text.length > 140 ? `${text.slice(0, 137)}...` : text;\n}\n\nfunction groupBy<Value>(\n  values: Value[],\n  getKey: (value: Value) => string,\n) {\n  const groups = new Map<string, Value[]>();\n\n  for (const value of values) {\n    const key = getKey(value);\n    groups.set(key, [...(groups.get(key) ?? []), value]);\n  }\n\n  return groups;\n}\n\nfunction statusWeight(status: AdminCommentReactionWorkflowStatus) {\n  return status === \"blocked\" ? 0 : status === \"review\" ? 1 : 2;\n}\n\nfunction sortRows(\n  left: AdminCommentReactionWorkflowRow,\n  right: AdminCommentReactionWorkflowRow,\n) {\n  return (\n    statusWeight(left.status) - statusWeight(right.status) ||\n    right.count - left.count ||\n    left.label.localeCompare(right.label)\n  );\n}\n\nfunction sortComments(\n  left: AdminCommentReactionWorkflowComment,\n  right: AdminCommentReactionWorkflowComment,\n) {\n  return (\n    statusWeight(left.status) - statusWeight(right.status) ||\n    right.moderationReviewCount - left.moderationReviewCount ||\n    (right.latestAt ?? \"\").localeCompare(left.latestAt ?? \"\")\n  );\n}\n\nfunction sortModerationItems(\n  left: AdminCommentReactionModerationItem,\n  right: AdminCommentReactionModerationItem,\n) {\n  return (\n    statusWeight(left.status) - statusWeight(right.status) ||\n    right.latestAt.localeCompare(left.latestAt)\n  );\n}\n\nexport {\n  getAdminCommentReactionWorkflowsCsv,\n  getAdminCommentReactionWorkflowsJson,\n  getAdminCommentReactionWorkflowsMarkdown,\n} from \"@/features/admin/admin-comment-reaction-workflows-export\";\n\nexport type {\n  AdminCommentReactionModerationItem,\n  AdminCommentReactionWorkflowCategory,\n  AdminCommentReactionWorkflowComment,\n  AdminCommentReactionWorkflowDelivery,\n  AdminCommentReactionWorkflowFile,\n  AdminCommentReactionWorkflowInput,\n  AdminCommentReactionWorkflowRow,\n  AdminCommentReactionWorkflowStatus,\n  AdminCommentReactionWorkflowsReport,\n} from \"@/features/admin/admin-comment-reaction-workflows-types\";\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-comment-reaction-workflows.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-comment-reaction-workflows-ts-226285fbc5d420fc.mjs",
  "kind": "ts",
  "hash": "226285fbc5d420fc",
  "dependencies": [
    {
      "specifier": "@/features/admin/admin-comment-reaction-workflows-export",
      "resolved_path": "src/features/admin/admin-comment-reaction-workflows-export.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-comment-reaction-workflows-export-ts-d951fea5d2dab72d.mjs",
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
    "source_path": "src/features/admin/admin-comment-reaction-workflows.ts",
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
        "specifier": "@/features/admin/admin-comment-reaction-workflows-types",
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
      "getAdminCommentReactionWorkflowsReport"
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
