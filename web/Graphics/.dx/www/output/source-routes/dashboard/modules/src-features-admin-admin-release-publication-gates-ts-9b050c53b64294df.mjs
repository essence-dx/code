
export const dxSourceText = "import type {\n  AdminCollaborationHandoffOperationsReport,\n  AdminCollaborationHandoffStatus,\n} from \"@/features/admin/admin-collaboration-handoff-operations\";\nimport type {\n  AdminPublishChannelManagerReport,\n  AdminPublishChannelStatus,\n} from \"@/features/admin/admin-publish-channel-manager\";\nimport type {\n  AdminPublicLinkObservabilityReport,\n  AdminPublicLinkStatus,\n} from \"@/features/admin/admin-public-link-observability\";\nimport type {\n  AdminReleaseApprovalSnapshot,\n  AdminReleaseApprovalSnapshotStatus,\n} from \"@/features/admin/admin-release-approval-snapshots\";\nimport type {\n  AdminWorkspaceAccessBudgetReport,\n  AdminWorkspaceAccessBudgetStatus,\n} from \"@/features/admin/admin-workspace-access-budget\";\nimport type {\n  ProductionDeploySmokeReport,\n  ProductionDeploySmokeStatus,\n} from \"@/features/editor/production-deploy-smoke\";\n\nexport type AdminReleasePublicationGateStatus = \"ready\" | \"review\" | \"blocked\";\n\nexport type AdminReleasePublicationGateCategory =\n  | \"access\"\n  | \"approval\"\n  | \"collaboration\"\n  | \"deploy-smoke\"\n  | \"public-links\"\n  | \"publish-channels\";\n\nexport type AdminReleasePublicationGateRow = {\n  id: string;\n  category: AdminReleasePublicationGateCategory;\n  status: AdminReleasePublicationGateStatus;\n  label: string;\n  value: string;\n  detail: string;\n  recommendation: string;\n  target: string | null;\n  latestAt: string | null;\n};\n\nexport type AdminReleasePublicationGateReport = {\n  generatedAt: string;\n  status: AdminReleasePublicationGateStatus;\n  score: number;\n  canPublish: boolean;\n  readyCount: number;\n  reviewCount: number;\n  blockedCount: number;\n  deploySmokeScore: number;\n  publishChannelScore: number;\n  publicLinkScore: number;\n  accessBudgetScore: number;\n  collaborationScore: number;\n  latestApprovalAt: string | null;\n  approvalSnapshotCount: number;\n  readyPublishChannelCount: number;\n  releaseSafeSurfaceCount: number;\n  unresolvedMentionCount: number;\n  escalationQueueCount: number;\n  riskyShareCount: number;\n  rows: AdminReleasePublicationGateRow[];\n  commands: string[];\n};\n\nexport type AdminReleasePublicationGateInput = {\n  collaborationHandoffOperations: AdminCollaborationHandoffOperationsReport;\n  generatedAt?: string;\n  productionDeploySmoke: ProductionDeploySmokeReport;\n  publicLinkObservability: AdminPublicLinkObservabilityReport;\n  publishChannels: AdminPublishChannelManagerReport;\n  releaseApprovalSnapshots: AdminReleaseApprovalSnapshot[];\n  workspaceAccessBudget: AdminWorkspaceAccessBudgetReport;\n};\n\nexport function getAdminReleasePublicationGateReport({\n  collaborationHandoffOperations,\n  generatedAt = new Date().toISOString(),\n  productionDeploySmoke,\n  publicLinkObservability,\n  publishChannels,\n  releaseApprovalSnapshots,\n  workspaceAccessBudget,\n}: AdminReleasePublicationGateInput): AdminReleasePublicationGateReport {\n  const rows = [\n    getDeploySmokeGate(productionDeploySmoke),\n    getPublishChannelGate(publishChannels),\n    getPublicLinkGate(publicLinkObservability),\n    getAccessBudgetGate(workspaceAccessBudget),\n    getCollaborationGate(collaborationHandoffOperations),\n    getApprovalGate(releaseApprovalSnapshots),\n  ];\n  const blockedCount = rows.filter((row) => row.status === \"blocked\").length;\n  const reviewCount = rows.filter((row) => row.status === \"review\").length;\n  const readyCount = rows.filter((row) => row.status === \"ready\").length;\n  const status: AdminReleasePublicationGateStatus =\n    blockedCount > 0 ? \"blocked\" : reviewCount > 0 ? \"review\" : \"ready\";\n\n  return {\n    generatedAt,\n    status,\n    score: Math.max(0, 100 - blockedCount * 18 - reviewCount * 7),\n    canPublish: status === \"ready\",\n    readyCount,\n    reviewCount,\n    blockedCount,\n    deploySmokeScore: productionDeploySmoke.score,\n    publishChannelScore: publishChannels.score,\n    publicLinkScore: publicLinkObservability.score,\n    accessBudgetScore: workspaceAccessBudget.score,\n    collaborationScore: collaborationHandoffOperations.score,\n    latestApprovalAt: releaseApprovalSnapshots[0]?.createdAt ?? null,\n    approvalSnapshotCount: releaseApprovalSnapshots.length,\n    readyPublishChannelCount: publishChannels.readyCount,\n    releaseSafeSurfaceCount: publicLinkObservability.releaseSafeCount,\n    unresolvedMentionCount: collaborationHandoffOperations.unresolvedMentionCount,\n    escalationQueueCount: collaborationHandoffOperations.escalationQueueCount,\n    riskyShareCount: workspaceAccessBudget.riskyShareCount,\n    rows: rows.sort(sortPublicationGateRows),\n    commands: getPublicationGateCommands(),\n  };\n}\n\nfunction getDeploySmokeGate(\n  report: ProductionDeploySmokeReport,\n): AdminReleasePublicationGateRow {\n  const status = fromSharedStatus(report.status);\n\n  return {\n    id: \"publication-gate-deploy-smoke\",\n    category: \"deploy-smoke\",\n    status,\n    label: \"Deploy smoke\",\n    value: `${report.readyCount}/${report.routeCount} ready`,\n    detail: `${report.requiredRouteCount} required route${report.requiredRouteCount === 1 ? \"\" : \"s\"} checked with ${report.blockedCount} blocked and ${report.reviewCount} review item${report.reviewCount === 1 ? \"\" : \"s\"}.`,\n    recommendation:\n      status === \"ready\"\n        ? \"Attach the deploy smoke export to the publication approval packet.\"\n        : \"Resolve blocked required routes and refresh smoke evidence before publication.\",\n    target: report.baseUrl,\n    latestAt: report.generatedAt,\n  };\n}\n\nfunction getPublishChannelGate(\n  report: AdminPublishChannelManagerReport,\n): AdminReleasePublicationGateRow {\n  const status = fromSharedStatus(report.status);\n\n  return {\n    id: \"publication-gate-publish-channels\",\n    category: \"publish-channels\",\n    status,\n    label: \"Publish channels\",\n    value: `${report.readyCount}/${report.channelCount} ready`,\n    detail: `${report.approvalReadyCount} approved, ${report.rollbackLinkedCount} rollback-linked, ${report.staleChannelCount} stale, and ${report.routeSmokeBlockedCount} route-smoke blocked channel${report.channelCount === 1 ? \"\" : \"s\"}.`,\n    recommendation:\n      status === \"ready\"\n        ? \"Channels have enough approval, route, and rollback evidence for publication.\"\n        : \"Fix stale channels, blocked smoke, missing approvals, or rollback gaps before publishing.\",\n    target: report.channels.find((channel) => channel.status !== \"ready\")\n      ?.targetUrl ?? report.channels[0]?.targetUrl ?? null,\n    latestAt: report.generatedAt,\n  };\n}\n\nfunction getPublicLinkGate(\n  report: AdminPublicLinkObservabilityReport,\n): AdminReleasePublicationGateRow {\n  const status = fromSharedStatus(report.status);\n\n  return {\n    id: \"publication-gate-public-links\",\n    category: \"public-links\",\n    status,\n    label: \"Public link safety\",\n    value: `${report.releaseSafeCount}/${report.surfaceCount} safe`,\n    detail: `${report.staleLinkCount} stale, ${report.noExpiryCount} without expiry, ${report.downloadExposureCount} with download exposure, ${report.commentExposureCount} with comment exposure, and ${report.missingReferrerNoteCount} missing referrer notes.`,\n    recommendation:\n      status === \"ready\"\n        ? \"Public link surfaces are release-safe and ready for the publication packet.\"\n        : \"Resolve unsafe links, expiries, exposure, referrer notes, and route-smoke blockers.\",\n    target: report.surfaces.find((surface) => surface.status !== \"ready\")\n      ?.targetUrl ?? report.surfaces[0]?.targetUrl ?? null,\n    latestAt: report.generatedAt,\n  };\n}\n\nfunction getAccessBudgetGate(\n  report: AdminWorkspaceAccessBudgetReport,\n): AdminReleasePublicationGateRow {\n  const status = fromSharedStatus(report.status);\n\n  return {\n    id: \"publication-gate-access-budget\",\n    category: \"access\",\n    status,\n    label: \"Access budget\",\n    value: `${report.score}/100`,\n    detail: `${report.externalDomainCount} external domain${report.externalDomainCount === 1 ? \"\" : \"s\"}, ${report.elevatedCollaboratorCount} elevated collaborator${report.elevatedCollaboratorCount === 1 ? \"\" : \"s\"}, ${report.staleCollaboratorCount} stale collaborator${report.staleCollaboratorCount === 1 ? \"\" : \"s\"}, and ${report.riskyShareCount} risky share signal${report.riskyShareCount === 1 ? \"\" : \"s\"}.`,\n    recommendation:\n      status === \"ready\"\n        ? \"Access budget is within publication policy.\"\n        : \"Reduce external domain drift, stale collaborators, risky shares, or pending role changes.\",\n    target: report.rows.find((row) => row.status !== \"ready\")?.label ?? null,\n    latestAt: report.generatedAt,\n  };\n}\n\nfunction getCollaborationGate(\n  report: AdminCollaborationHandoffOperationsReport,\n): AdminReleasePublicationGateRow {\n  const status = fromSharedStatus(report.status);\n\n  return {\n    id: \"publication-gate-collaboration\",\n    category: \"collaboration\",\n    status,\n    label: \"Collaboration handoff\",\n    value: `${report.score}/100`,\n    detail: `${report.capturedRoomCount}/${report.roomCount} captured rooms, ${report.staleRoomCount} stale rooms, ${report.unresolvedMentionCount} unresolved mentions, ${report.escalationQueueCount} escalation signals, and ${report.archivedEvidenceCount} archived evidence records.`,\n    recommendation:\n      status === \"ready\"\n        ? \"Collaboration evidence is ready for release publication.\"\n        : \"Archive room evidence, assign handoff owners, clear stale snapshots, and resolve queues.\",\n    target: report.rooms.find((room) => room.status !== \"ready\")?.fileName ??\n      report.rooms[0]?.fileName ??\n      null,\n    latestAt: report.generatedAt,\n  };\n}\n\nfunction getApprovalGate(\n  snapshots: AdminReleaseApprovalSnapshot[],\n): AdminReleasePublicationGateRow {\n  const latest = snapshots[0];\n\n  if (!latest) {\n    return {\n      id: \"publication-gate-approval\",\n      category: \"approval\",\n      status: \"blocked\",\n      label: \"Publication approval\",\n      value: \"Missing\",\n      detail:\n        \"No release approval snapshot exists for the current publication window.\",\n      recommendation:\n        \"Save an approval snapshot after the publication gates are ready.\",\n      target: null,\n      latestAt: null,\n    };\n  }\n\n  const status = getApprovalStatus(latest);\n\n  return {\n    id: \"publication-gate-approval\",\n    category: \"approval\",\n    status,\n    label: \"Publication approval\",\n    value: latest.releaseLabel,\n    detail: `${latest.reviewerEmail} saved ${latest.smokeArtifacts.length} smoke artifact${latest.smokeArtifacts.length === 1 ? \"\" : \"s\"} for ${latest.deploymentUrl}.`,\n    recommendation:\n      status === \"ready\"\n        ? \"Approval snapshot can anchor the final publication decision.\"\n        : \"Refresh approval after preflight, incidents, smoke artifacts, and rollback notes are ready.\",\n    target: latest.deploymentUrl,\n    latestAt: latest.createdAt,\n  };\n}\n\nfunction getApprovalStatus(\n  snapshot: AdminReleaseApprovalSnapshot,\n): AdminReleasePublicationGateStatus {\n  if (\n    snapshot.preflightStatus === \"blocked\" ||\n    snapshot.incidentStatus === \"blocked\" ||\n    snapshot.smokeArtifacts.length === 0 ||\n    !snapshot.rollbackNotes.trim()\n  ) {\n    return \"blocked\";\n  }\n\n  if (snapshot.preflightStatus === \"review\" || snapshot.incidentStatus === \"review\") {\n    return \"review\";\n  }\n\n  return \"ready\";\n}\n\nfunction fromSharedStatus(\n  status:\n    | AdminCollaborationHandoffStatus\n    | AdminPublishChannelStatus\n    | AdminPublicLinkStatus\n    | AdminReleaseApprovalSnapshotStatus\n    | AdminWorkspaceAccessBudgetStatus\n    | ProductionDeploySmokeStatus,\n): AdminReleasePublicationGateStatus {\n  return status;\n}\n\nfunction sortPublicationGateRows(\n  first: AdminReleasePublicationGateRow,\n  second: AdminReleasePublicationGateRow,\n) {\n  return (\n    getStatusWeight(first.status) - getStatusWeight(second.status) ||\n    first.category.localeCompare(second.category)\n  );\n}\n\nfunction getStatusWeight(status: AdminReleasePublicationGateStatus) {\n  if (status === \"blocked\") {\n    return 0;\n  }\n\n  if (status === \"review\") {\n    return 1;\n  }\n\n  return 2;\n}\n\nfunction getPublicationGateCommands() {\n  return [\n    \"Run deploy smoke and route checks before saving a publication approval snapshot.\",\n    \"Resolve publish-channel, public-link, access-budget, and collaboration handoff blockers before release.\",\n    \"Attach JSON/CSV/Markdown evidence exports for the publication gate report to the release packet.\",\n    \"Only promote public links once the publication gate status is ready.\",\n  ];\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-release-publication-gates.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-release-publication-gates-ts-9b050c53b64294df.mjs",
  "kind": "ts",
  "hash": "9b050c53b64294df",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": false,
  "transform_kind": "metadata-only",
  "runtime_exports": [],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/features/admin/admin-release-publication-gates.ts",
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
        "specifier": "@/features/admin/admin-collaboration-handoff-operations",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/admin/admin-publish-channel-manager",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/admin/admin-public-link-observability",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/admin/admin-release-approval-snapshots",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/admin/admin-workspace-access-budget",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/editor/production-deploy-smoke",
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
      "getAdminReleasePublicationGateReport"
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
