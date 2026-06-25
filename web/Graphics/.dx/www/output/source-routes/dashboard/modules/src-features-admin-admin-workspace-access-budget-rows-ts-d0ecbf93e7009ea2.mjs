import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-features-admin-admin-workspace-access-budget-utils-ts-287335243048509d.mjs";
export const dxSourceText = "import type { WorkspacePolicyReviewReport } from \"@/features/admin/workspace-policy\";\nimport type {\n  AdminWorkspaceAccessBudgetCollaborator,\n  AdminWorkspaceAccessBudgetFile,\n  AdminWorkspaceAccessBudgetRow,\n  AdminWorkspaceAccessBudgetShare,\n  AdminWorkspaceAccessBudgetSession,\n  AdminWorkspaceAccessBudgetThresholds,\n  AdminWorkspaceAccessBudgetUser,\n  AdminWorkspaceAccessDomain,\n  AdminWorkspaceAccessRoleBudget,\n} from \"@/features/admin/admin-workspace-access-budget-types\";\nimport {\n  accessBudgetStatusWeight,\n  getLatestIso,\n  isElevatedRole,\n} from \"@/features/admin/admin-workspace-access-budget-utils\";\n\nexport type AccessBudgetRowsInput = {\n  domains: AdminWorkspaceAccessDomain[];\n  downloadShares: AdminWorkspaceAccessBudgetShare[];\n  elevatedCollaborators: AdminWorkspaceAccessBudgetCollaborator[];\n  expiredActiveShares: AdminWorkspaceAccessBudgetShare[];\n  files: AdminWorkspaceAccessBudgetFile[];\n  noExpiryShares: AdminWorkspaceAccessBudgetShare[];\n  roleChangePendingCount: number;\n  staleCollaborators: AdminWorkspaceAccessBudgetCollaborator[];\n  staleSessions: AdminWorkspaceAccessBudgetSession[];\n  thresholds: AdminWorkspaceAccessBudgetThresholds;\n  users: AdminWorkspaceAccessBudgetUser[];\n  workspacePolicy: WorkspacePolicyReviewReport;\n};\n\nexport function getAccessBudgetRows({\n  domains,\n  downloadShares,\n  elevatedCollaborators,\n  expiredActiveShares,\n  files,\n  noExpiryShares,\n  roleChangePendingCount,\n  staleCollaborators,\n  staleSessions,\n  thresholds,\n  users,\n  workspacePolicy,\n}: AccessBudgetRowsInput) {\n  const rows = [\n    getUnverifiedUsersRow(users),\n    getExternalDomainBudgetRow(domains, thresholds),\n    ...domains.slice(0, 8).map(toExternalDomainRow),\n    getStaleCollaboratorRow(staleCollaborators, thresholds),\n    getElevatedSeatBudgetRow(elevatedCollaborators, thresholds),\n    getEditorHeavyFileRow(files),\n    getNoExpiryShareRow(noExpiryShares, workspacePolicy),\n    getDownloadShareRow(downloadShares, workspacePolicy),\n    getExpiredActiveShareRow(expiredActiveShares),\n    getPendingRoleChangeRow(roleChangePendingCount),\n    getStaleSessionRow(staleSessions, workspacePolicy),\n  ]\n    .filter((row): row is AdminWorkspaceAccessBudgetRow => Boolean(row))\n    .sort(sortAccessBudgetRows);\n\n  return rows.length > 0 ? rows : [getReadyRow()];\n}\n\nexport function getAccessBudgetRoleBudgets(\n  collaborators: AdminWorkspaceAccessBudgetCollaborator[],\n  thresholds: AdminWorkspaceAccessBudgetThresholds,\n): AdminWorkspaceAccessRoleBudget[] {\n  const editorCount = collaborators.filter(\n    (collaborator) => collaborator.role === \"editor\",\n  ).length;\n  const commenterCount = collaborators.filter(\n    (collaborator) => collaborator.role === \"commenter\",\n  ).length;\n  const elevatedCount = editorCount + commenterCount;\n\n  return [\n    toRoleBudget(\"Elevated collaborators\", elevatedCount, thresholds.elevatedSeatLimit),\n    toRoleBudget(\n      \"Editors\",\n      editorCount,\n      Math.max(5, Math.ceil(thresholds.elevatedSeatLimit / 2)),\n    ),\n    toRoleBudget(\"Commenters\", commenterCount, thresholds.elevatedSeatLimit),\n  ];\n}\n\nexport function getAccessBudgetCommands() {\n  return [\n    \"Review external domains before promoting publish channels.\",\n    \"Downgrade stale editor and commenter grants to viewer after handoff.\",\n    \"Expire public links that are not tied to an active review or release.\",\n    \"Resolve pending role-change requests before release approval.\",\n    \"Export the access budget report with the governance packet.\",\n  ];\n}\n\nfunction toRoleBudget(\n  label: string,\n  used: number,\n  limit: number,\n): AdminWorkspaceAccessRoleBudget {\n  const remaining = Math.max(0, limit - used);\n  const pressure = limit > 0 ? used / limit : 1;\n\n  return {\n    label,\n    used,\n    limit,\n    remaining,\n    status: used > limit ? \"blocked\" : pressure >= 0.8 ? \"review\" : \"ready\",\n    detail: `${used} used, ${remaining} available`,\n  };\n}\n\nfunction getUnverifiedUsersRow(\n  users: AdminWorkspaceAccessBudgetUser[],\n): AdminWorkspaceAccessBudgetRow | null {\n  const unverifiedUsers = users.filter((user) => !user.emailVerified);\n\n  if (unverifiedUsers.length === 0) {\n    return null;\n  }\n\n  return {\n    id: \"access-budget-unverified-users\",\n    category: \"users\",\n    status: \"review\",\n    label: \"Unverified accounts can still create access drift\",\n    detail: `${unverifiedUsers.length} user accounts still need email verification.`,\n    recommendation: \"Verify or remove pending accounts before broad collaborator invites.\",\n    owner: \"Workspace admins\",\n    count: unverifiedUsers.length,\n    latestAt: null,\n  };\n}\n\nfunction getExternalDomainBudgetRow(\n  domains: AdminWorkspaceAccessDomain[],\n  thresholds: AdminWorkspaceAccessBudgetThresholds,\n): AdminWorkspaceAccessBudgetRow | null {\n  if (domains.length === 0) {\n    return null;\n  }\n\n  return {\n    id: \"access-budget-external-domain-budget\",\n    category: \"domains\",\n    status: domains.length > thresholds.externalDomainLimit ? \"blocked\" : \"review\",\n    label: \"External domain budget\",\n    detail: `${domains.length} external domains are present; budget is ${thresholds.externalDomainLimit}.`,\n    recommendation: \"Confirm each external domain has an active project need and owner.\",\n    owner: \"Workspace admins\",\n    count: domains.length,\n    latestAt: domains.reduce(\n      (latest, domain) => getLatestIso(latest, domain.latestAt),\n      null as string | null,\n    ),\n  };\n}\n\nfunction toExternalDomainRow(\n  domain: AdminWorkspaceAccessDomain,\n): AdminWorkspaceAccessBudgetRow {\n  return {\n    id: `access-budget-domain-${domain.domain}`,\n    category: \"domains\",\n    status: domain.status,\n    label: domain.domain,\n    detail: `${domain.userCount} users, ${domain.collaboratorCount} collaborators, ${domain.ownerFileCount} owned files.`,\n    recommendation:\n      domain.status === \"blocked\"\n        ? \"Review elevated access from this domain before production sharing.\"\n        : \"Keep this domain on the access review list until the handoff closes.\",\n    owner: domain.domain,\n    count: domain.userCount + domain.collaboratorCount + domain.ownerFileCount,\n    latestAt: domain.latestAt,\n  };\n}\n\nfunction getStaleCollaboratorRow(\n  staleCollaborators: AdminWorkspaceAccessBudgetCollaborator[],\n  thresholds: AdminWorkspaceAccessBudgetThresholds,\n): AdminWorkspaceAccessBudgetRow | null {\n  if (staleCollaborators.length === 0) {\n    return null;\n  }\n\n  return {\n    id: \"access-budget-stale-collaborators\",\n    category: \"collaborators\",\n    status: staleCollaborators.some((collaborator) =>\n      isElevatedRole(collaborator.role),\n    )\n      ? \"blocked\"\n      : \"review\",\n    label: \"Stale collaborator grants\",\n    detail: `${staleCollaborators.length} grants have not changed for ${thresholds.staleCollaboratorDays}+ days.`,\n    recommendation: \"Reconfirm stale editor/commenter grants or downgrade them to viewer.\",\n    owner: \"File owners\",\n    count: staleCollaborators.length,\n    latestAt: staleCollaborators.reduce(\n      (latest, collaborator) => getLatestIso(latest, collaborator.updatedAt),\n      null as string | null,\n    ),\n  };\n}\n\nfunction getElevatedSeatBudgetRow(\n  elevatedCollaborators: AdminWorkspaceAccessBudgetCollaborator[],\n  thresholds: AdminWorkspaceAccessBudgetThresholds,\n): AdminWorkspaceAccessBudgetRow | null {\n  if (elevatedCollaborators.length === 0) {\n    return null;\n  }\n\n  const pressure = elevatedCollaborators.length / thresholds.elevatedSeatLimit;\n\n  if (pressure < 0.8) {\n    return null;\n  }\n\n  return {\n    id: \"access-budget-elevated-seat-budget\",\n    category: \"seat-hygiene\",\n    status:\n      elevatedCollaborators.length > thresholds.elevatedSeatLimit\n        ? \"blocked\"\n        : \"review\",\n    label: \"Elevated access budget pressure\",\n    detail: `${elevatedCollaborators.length} editor/commenter grants are using a ${thresholds.elevatedSeatLimit} grant budget.`,\n    recommendation: \"Move passive collaborators to viewer before expanding the workspace.\",\n    owner: \"Workspace admins\",\n    count: elevatedCollaborators.length,\n    latestAt: elevatedCollaborators.reduce(\n      (latest, collaborator) => getLatestIso(latest, collaborator.updatedAt),\n      null as string | null,\n    ),\n  };\n}\n\nfunction getEditorHeavyFileRow(\n  files: AdminWorkspaceAccessBudgetFile[],\n): AdminWorkspaceAccessBudgetRow | null {\n  const editorHeavyFiles = files.filter((file) => file.editorCount >= 4);\n\n  if (editorHeavyFiles.length === 0) {\n    return null;\n  }\n\n  return {\n    id: \"access-budget-editor-heavy-files\",\n    category: \"seat-hygiene\",\n    status: \"review\",\n    label: \"Editor-heavy files\",\n    detail: `${editorHeavyFiles.length} files have four or more editors.`,\n    recommendation: \"Use commenter/viewer roles for review-only collaborators.\",\n    owner: \"File owners\",\n    count: editorHeavyFiles.length,\n    latestAt: editorHeavyFiles.reduce(\n      (latest, file) => getLatestIso(latest, file.updatedAt),\n      null as string | null,\n    ),\n  };\n}\n\nfunction getNoExpiryShareRow(\n  shares: AdminWorkspaceAccessBudgetShare[],\n  workspacePolicy: WorkspacePolicyReviewReport,\n): AdminWorkspaceAccessBudgetRow | null {\n  if (shares.length === 0) {\n    return null;\n  }\n\n  return {\n    id: \"access-budget-no-expiry-shares\",\n    category: \"share-drift\",\n    status:\n      workspacePolicy.settings.defaultShareExpiryDays > 0 ? \"blocked\" : \"review\",\n    label: \"Public links without expiry\",\n    detail: `${shares.length} active links have no expiry date.`,\n    recommendation: \"Set an expiry window or disable links not tied to active review.\",\n    owner: \"File owners\",\n    count: shares.length,\n    latestAt: shares.reduce(\n      (latest, share) => getLatestIso(latest, share.createdAt),\n      null as string | null,\n    ),\n  };\n}\n\nfunction getDownloadShareRow(\n  shares: AdminWorkspaceAccessBudgetShare[],\n  workspacePolicy: WorkspacePolicyReviewReport,\n): AdminWorkspaceAccessBudgetRow | null {\n  if (shares.length === 0) {\n    return null;\n  }\n\n  return {\n    id: \"access-budget-download-shares\",\n    category: \"share-drift\",\n    status: workspacePolicy.settings.allowPublicDownloads ? \"review\" : \"blocked\",\n    label: \"Download-enabled public links\",\n    detail: `${shares.length} active public links allow downloads.`,\n    recommendation: \"Disable downloads unless the handoff explicitly needs source export.\",\n    owner: \"File owners\",\n    count: shares.length,\n    latestAt: shares.reduce(\n      (latest, share) => getLatestIso(latest, share.createdAt),\n      null as string | null,\n    ),\n  };\n}\n\nfunction getExpiredActiveShareRow(\n  shares: AdminWorkspaceAccessBudgetShare[],\n): AdminWorkspaceAccessBudgetRow | null {\n  if (shares.length === 0) {\n    return null;\n  }\n\n  return {\n    id: \"access-budget-expired-active-shares\",\n    category: \"share-drift\",\n    status: \"blocked\",\n    label: \"Expired links still enabled\",\n    detail: `${shares.length} links are expired but not disabled.`,\n    recommendation: \"Disable expired links or create a fresh reviewed share target.\",\n    owner: \"Workspace admins\",\n    count: shares.length,\n    latestAt: shares.reduce(\n      (latest, share) => getLatestIso(latest, share.expiresAt ?? share.createdAt),\n      null as string | null,\n    ),\n  };\n}\n\nfunction getPendingRoleChangeRow(\n  pendingCount: number,\n): AdminWorkspaceAccessBudgetRow | null {\n  if (pendingCount === 0) {\n    return null;\n  }\n\n  return {\n    id: \"access-budget-pending-role-changes\",\n    category: \"role-requests\",\n    status: \"review\",\n    label: \"Pending elevated-role requests\",\n    detail: `${pendingCount} collaborator role-change requests are waiting for admin review.`,\n    recommendation: \"Approve only request-scoped upgrades and reject stale requests.\",\n    owner: \"Workspace admins\",\n    count: pendingCount,\n    latestAt: null,\n  };\n}\n\nfunction getStaleSessionRow(\n  sessions: AdminWorkspaceAccessBudgetSession[],\n  workspacePolicy: WorkspacePolicyReviewReport,\n): AdminWorkspaceAccessBudgetRow | null {\n  if (sessions.length === 0) {\n    return null;\n  }\n\n  return {\n    id: \"access-budget-stale-sessions\",\n    category: \"users\",\n    status:\n      workspacePolicy.settings.sessionMode === \"revoke-expired\"\n        ? \"blocked\"\n        : \"review\",\n    label: \"Stale active sessions\",\n    detail: `${sessions.length} sessions are older than the ${workspacePolicy.settings.staleSessionDays}-day session policy.`,\n    recommendation: \"Revoke stale sessions before expanding workspace access.\",\n    owner: \"Workspace admins\",\n    count: sessions.length,\n    latestAt: sessions.reduce(\n      (latest, session) => getLatestIso(latest, session.updatedAt),\n      null as string | null,\n    ),\n  };\n}\n\nfunction getReadyRow(): AdminWorkspaceAccessBudgetRow {\n  return {\n    id: \"access-budget-ready\",\n    category: \"seat-hygiene\",\n    status: \"ready\",\n    label: \"Access budget is clean\",\n    detail:\n      \"No external-domain, stale-grant, elevated-role, public-link, or pending role-change drift is currently blocking release.\",\n    recommendation: \"Export this report with the release packet.\",\n    owner: \"Workspace admins\",\n    count: 0,\n    latestAt: null,\n  };\n}\n\nfunction sortAccessBudgetRows(\n  left: AdminWorkspaceAccessBudgetRow,\n  right: AdminWorkspaceAccessBudgetRow,\n) {\n  return (\n    accessBudgetStatusWeight[left.status] -\n      accessBudgetStatusWeight[right.status] ||\n    right.count - left.count ||\n    (right.latestAt ? new Date(right.latestAt).getTime() : 0) -\n      (left.latestAt ? new Date(left.latestAt).getTime() : 0)\n  );\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-workspace-access-budget-rows.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-workspace-access-budget-rows-ts-d0ecbf93e7009ea2.mjs",
  "kind": "ts",
  "hash": "d0ecbf93e7009ea2",
  "dependencies": [
    {
      "specifier": "@/features/admin/admin-workspace-access-budget-utils",
      "resolved_path": "src/features/admin/admin-workspace-access-budget-utils.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-workspace-access-budget-utils-ts-287335243048509d.mjs",
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
    "source_path": "src/features/admin/admin-workspace-access-budget-rows.ts",
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
        "specifier": "@/features/admin/workspace-policy",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/admin/admin-workspace-access-budget-types",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/admin/admin-workspace-access-budget-utils",
        "side_effect_only": false,
        "type_only": false
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
      "getAccessBudgetRows",
      "getAccessBudgetRoleBudgets",
      "getAccessBudgetCommands"
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
