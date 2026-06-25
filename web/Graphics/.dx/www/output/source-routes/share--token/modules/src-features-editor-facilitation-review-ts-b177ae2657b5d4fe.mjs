
export const dxSourceText = "import type {\n  DesignComment,\n  DesignCommentReactionKind,\n  DesignPage,\n  DesignReviewTimer,\n  DesignVotingSession,\n} from \"@/features/editor/types\";\n\nexport type FacilitationReviewStatus = \"ready\" | \"review\" | \"blocked\";\n\nexport type FacilitationReviewRow = {\n  id: string;\n  commentId: string;\n  status: FacilitationReviewStatus;\n  label: string;\n  text: string;\n  votes: number;\n  replies: number;\n  assignee: string;\n  reactions: Record<DesignCommentReactionKind, number>;\n  detail: string;\n};\n\nexport type FacilitationReviewReport = {\n  pageId: string;\n  pageName: string;\n  votingSession: DesignVotingSession | null;\n  reviewTimer: DesignReviewTimer | null;\n  commentCount: number;\n  openCount: number;\n  resolvedCount: number;\n  assignedCount: number;\n  voteCount: number;\n  blockerCount: number;\n  reviewCount: number;\n  readyCount: number;\n  rows: FacilitationReviewRow[];\n};\n\ntype FacilitationPagePatch = Partial<Pick<DesignPage, \"facilitation\">>;\n\nconst reactionKinds: DesignCommentReactionKind[] = [\n  \"thumbs-up\",\n  \"heart\",\n  \"check\",\n  \"eyes\",\n];\n\nexport function getFacilitationReview(\n  page: DesignPage,\n): FacilitationReviewReport {\n  const comments = page.comments ?? [];\n  const rows = comments\n    .map(createReviewRow)\n    .sort((a, b) => {\n      if (a.status !== b.status) {\n        return getStatusWeight(b.status) - getStatusWeight(a.status);\n      }\n\n      return b.votes - a.votes || b.replies - a.replies;\n    });\n\n  return {\n    pageId: page.id,\n    pageName: page.name,\n    votingSession: page.facilitation?.votingSession ?? null,\n    reviewTimer: page.facilitation?.reviewTimer ?? null,\n    commentCount: comments.length,\n    openCount: comments.filter((comment) => !comment.resolved).length,\n    resolvedCount: comments.filter((comment) => comment.resolved).length,\n    assignedCount: comments.filter((comment) => comment.assigneeName).length,\n    voteCount: rows.reduce((count, row) => count + row.votes, 0),\n    blockerCount: rows.filter((row) => row.status === \"blocked\").length,\n    reviewCount: rows.filter((row) => row.status === \"review\").length,\n    readyCount: rows.filter((row) => row.status === \"ready\").length,\n    rows,\n  };\n}\n\nexport function getFacilitationReviewCsv(report: FacilitationReviewReport) {\n  return [\n    [\n      \"status\",\n      \"label\",\n      \"commentId\",\n      \"votes\",\n      \"replies\",\n      \"assignee\",\n      \"thumbsUp\",\n      \"heart\",\n      \"check\",\n      \"eyes\",\n      \"detail\",\n      \"text\",\n    ],\n    ...report.rows.map((row) => [\n      row.status,\n      row.label,\n      row.commentId,\n      row.votes,\n      row.replies,\n      row.assignee,\n      row.reactions[\"thumbs-up\"],\n      row.reactions.heart,\n      row.reactions.check,\n      row.reactions.eyes,\n      row.detail,\n      row.text,\n    ]),\n  ]\n    .map((row) => row.map(formatCsvCell).join(\",\"))\n    .join(\"\\n\");\n}\n\nexport function getFacilitationReviewMarkdown(\n  report: FacilitationReviewReport,\n) {\n  const votingSession = report.votingSession;\n  const reviewTimer = report.reviewTimer;\n  const lines = [\n    `# ${report.pageName} Facilitation Review`,\n    \"\",\n    votingSession\n      ? `Voting: ${votingSession.name} (${votingSession.status}, ${votingSession.voteBudget} votes/person)`\n      : \"Voting: No active session\",\n    reviewTimer\n      ? `Timer: ${reviewTimer.name} (${reviewTimer.status}, ${reviewTimer.durationMinutes} minutes)`\n      : \"Timer: No active timer\",\n    `Comments: ${report.commentCount}`,\n    `Open: ${report.openCount}`,\n    `Resolved: ${report.resolvedCount}`,\n    `Assigned: ${report.assignedCount}`,\n    `Votes: ${report.voteCount}`,\n    `Blocked: ${report.blockerCount}`,\n    \"\",\n    \"## Review Queue\",\n    \"\",\n  ];\n\n  if (report.rows.length === 0) {\n    lines.push(\"- No comments on this page.\");\n  }\n\n  for (const row of report.rows) {\n    lines.push(\n      `- [${row.status}] ${row.label}: ${row.text} (${row.votes} votes, ${row.replies} replies, ${row.assignee})`,\n    );\n  }\n\n  return lines.join(\"\\n\");\n}\n\nexport function createVotingSessionPagePatch(\n  page: DesignPage,\n): FacilitationPagePatch {\n  return {\n    facilitation: {\n      ...page.facilitation,\n      votingSession: {\n        id: `vote-${Date.now()}`,\n        name: \"Design vote\",\n        voteBudget: 3,\n        status: \"open\",\n        startedAt: new Date().toISOString(),\n      },\n    },\n  };\n}\n\nexport function updateVotingSessionPagePatch(\n  page: DesignPage,\n  patch: Partial<Pick<DesignVotingSession, \"name\" | \"voteBudget\" | \"status\">>,\n): FacilitationPagePatch {\n  const currentSession = page.facilitation?.votingSession;\n\n  if (!currentSession) {\n    return createVotingSessionPagePatch(page);\n  }\n\n  const nextStatus = patch.status ?? currentSession.status;\n\n  return {\n    facilitation: {\n      ...page.facilitation,\n      votingSession: {\n        ...currentSession,\n        ...patch,\n        voteBudget: Math.max(1, Math.round(patch.voteBudget ?? currentSession.voteBudget)),\n        closedAt:\n          nextStatus === \"closed\"\n            ? currentSession.closedAt ?? new Date().toISOString()\n            : undefined,\n      },\n    },\n  };\n}\n\nexport function createReviewTimerPagePatch(page: DesignPage): FacilitationPagePatch {\n  return {\n    facilitation: {\n      ...page.facilitation,\n      reviewTimer: {\n        id: `timer-${Date.now()}`,\n        name: \"Design critique\",\n        durationMinutes: 15,\n        status: \"idle\",\n      },\n    },\n  };\n}\n\nexport function updateReviewTimerPagePatch(\n  page: DesignPage,\n  patch: Partial<\n    Pick<DesignReviewTimer, \"name\" | \"durationMinutes\" | \"status\">\n  >,\n): FacilitationPagePatch {\n  const currentTimer = page.facilitation?.reviewTimer;\n\n  if (!currentTimer) {\n    return createReviewTimerPagePatch(page);\n  }\n\n  const nextStatus = patch.status ?? currentTimer.status;\n  const now = new Date().toISOString();\n\n  return {\n    facilitation: {\n      ...page.facilitation,\n      reviewTimer: {\n        ...currentTimer,\n        ...patch,\n        durationMinutes: Math.max(\n          1,\n          Math.round(patch.durationMinutes ?? currentTimer.durationMinutes),\n        ),\n        startedAt:\n          nextStatus === \"running\"\n            ? currentTimer.startedAt ?? now\n            : currentTimer.startedAt,\n        finishedAt: nextStatus === \"finished\" ? currentTimer.finishedAt ?? now : undefined,\n      },\n    },\n  };\n}\n\nfunction createReviewRow(comment: DesignComment): FacilitationReviewRow {\n  const reactions = getReactionCounts(comment);\n  const votes = Object.values(reactions).reduce((count, value) => count + value, 0);\n  const replies = comment.replies?.length ?? 0;\n  const assignee = comment.assigneeName ?? \"Unassigned\";\n  const status = getReviewStatus(comment, votes, replies);\n\n  return {\n    id: comment.id,\n    commentId: comment.id,\n    status,\n    label: getReviewLabel(comment, votes, replies),\n    text: compactText(comment.text),\n    votes,\n    replies,\n    assignee,\n    reactions,\n    detail: getReviewDetail(comment, votes, replies),\n  };\n}\n\nfunction getReviewStatus(\n  comment: DesignComment,\n  votes: number,\n  replies: number,\n): FacilitationReviewStatus {\n  if (comment.resolved) {\n    return \"ready\";\n  }\n\n  if (votes >= 3 || replies >= 3 || !comment.assigneeName) {\n    return \"blocked\";\n  }\n\n  return \"review\";\n}\n\nfunction getReviewLabel(\n  comment: DesignComment,\n  votes: number,\n  replies: number,\n) {\n  if (comment.resolved) {\n    return \"Resolved decision\";\n  }\n\n  if (!comment.assigneeName) {\n    return \"Needs owner\";\n  }\n\n  if (votes >= 3) {\n    return \"High-vote item\";\n  }\n\n  if (replies >= 3) {\n    return \"Discussion thread\";\n  }\n\n  return \"Open review\";\n}\n\nfunction getReviewDetail(\n  comment: DesignComment,\n  votes: number,\n  replies: number,\n) {\n  if (comment.resolved) {\n    return \"Decision is resolved and ready for handoff.\";\n  }\n\n  if (!comment.assigneeName) {\n    return \"Assign an owner before the next critique or voting pass.\";\n  }\n\n  if (votes >= 3) {\n    return \"Several collaborators reacted; prioritize this in review.\";\n  }\n\n  if (replies >= 3) {\n    return \"Thread has active discussion; summarize or resolve the decision.\";\n  }\n\n  return \"Open item has an owner and can continue through review.\";\n}\n\nfunction getReactionCounts(comment: DesignComment) {\n  return Object.fromEntries(\n    reactionKinds.map((kind) => [\n      kind,\n      (comment.reactions ?? []).filter((reaction) => reaction.kind === kind)\n        .length,\n    ]),\n  ) as Record<DesignCommentReactionKind, number>;\n}\n\nfunction getStatusWeight(status: FacilitationReviewStatus) {\n  if (status === \"blocked\") {\n    return 3;\n  }\n\n  if (status === \"review\") {\n    return 2;\n  }\n\n  return 1;\n}\n\nfunction compactText(value: string) {\n  return value.trim().replace(/\\s+/g, \" \") || \"Untitled comment\";\n}\n\nfunction formatCsvCell(value: string | number) {\n  const text = String(value);\n\n  if (!/[\",\\n]/.test(text)) {\n    return text;\n  }\n\n  return `\"${text.replaceAll('\"', '\"\"')}\"`;\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/editor/facilitation-review.ts",
  "chunk_output": ".dx/www/output/source-routes/share--token/modules/src-features-editor-facilitation-review-ts-b177ae2657b5d4fe.mjs",
  "kind": "ts",
  "hash": "b177ae2657b5d4fe",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": false,
  "transform_kind": "metadata-only",
  "runtime_exports": [],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/features/editor/facilitation-review.ts",
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
      "getFacilitationReview",
      "getFacilitationReviewCsv",
      "getFacilitationReviewMarkdown",
      "createVotingSessionPagePatch",
      "updateVotingSessionPagePatch",
      "createReviewTimerPagePatch",
      "updateReviewTimerPagePatch"
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
