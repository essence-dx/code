import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-features-files-permissions-ts-619c9a7eeb3a33f6.mjs";
export const dxSourceText = "import type { AdminAuditMetadata } from \"@/db/schema\";\nimport {\n  collaboratorRoleLabels,\n  type CollaboratorRole,\n  type SharePermissionPreset,\n  sharePresetConfig,\n} from \"@/features/files/permissions\";\n\nexport const WORKSPACE_POLICY_ACTION = \"workspace.policy.update\";\n\nexport const workspacePolicyInviteModes = [\n  \"any-existing-user\",\n  \"same-domain-only\",\n  \"admins-only\",\n] as const;\n\nexport const workspacePolicySessionModes = [\n  \"monitor\",\n  \"review-stale\",\n  \"revoke-expired\",\n] as const;\n\nexport type WorkspacePolicyInviteMode =\n  (typeof workspacePolicyInviteModes)[number];\n\nexport type WorkspacePolicySessionMode =\n  (typeof workspacePolicySessionModes)[number];\n\nexport type WorkspacePolicySettings = {\n  defaultShareExpiryDays: number;\n  allowPublicDownloads: boolean;\n  allowPublicComments: boolean;\n  inviteMode: WorkspacePolicyInviteMode;\n  maxInviteRole: CollaboratorRole;\n  sessionMode: WorkspacePolicySessionMode;\n  staleSessionDays: number;\n  updatedAt: string | null;\n  updatedBy: string | null;\n};\n\nexport type WorkspaceSharePolicyResult = {\n  accessLevel: \"inspect\" | \"prototype\" | \"review\";\n  allowComments: boolean;\n  allowDownload: boolean;\n  expiresAt: Date | null;\n};\n\nexport type WorkspacePolicyDecision = {\n  allowed: boolean;\n  reason: string | null;\n};\n\nexport type WorkspacePolicyFinding = {\n  id: string;\n  label: string;\n  status: \"ready\" | \"review\" | \"blocked\";\n  value: string;\n  detail: string;\n};\n\nexport type WorkspacePolicyReviewReport = {\n  settings: WorkspacePolicySettings;\n  status: \"ready\" | \"review\" | \"blocked\";\n  score: number;\n  activeShareCount: number;\n  downloadShareCount: number;\n  commentShareCount: number;\n  expiredShareCount: number;\n  staleSessionCount: number;\n  expiredSessionCount: number;\n  findings: WorkspacePolicyFinding[];\n};\n\ntype WorkspacePolicyEvent = {\n  action: string;\n  actorEmail: string;\n  createdAt: string | Date;\n  metadata: AdminAuditMetadata;\n};\n\ntype WorkspacePolicyShareRow = {\n  allowComments: boolean;\n  allowDownload: boolean;\n  disabledAt: string | null;\n  expiresAt: string | null;\n};\n\ntype WorkspacePolicySessionRow = {\n  createdAt: string;\n  expiresAt: string;\n  updatedAt: string;\n};\n\nconst defaultWorkspacePolicySettings: WorkspacePolicySettings = {\n  defaultShareExpiryDays: 0,\n  allowPublicDownloads: true,\n  allowPublicComments: true,\n  inviteMode: \"any-existing-user\",\n  maxInviteRole: \"editor\",\n  sessionMode: \"monitor\",\n  staleSessionDays: 30,\n  updatedAt: null,\n  updatedBy: null,\n};\n\nconst roleRank: Record<CollaboratorRole, number> = {\n  viewer: 1,\n  commenter: 2,\n  editor: 3,\n};\n\nexport function getDefaultWorkspacePolicySettings(): WorkspacePolicySettings {\n  return { ...defaultWorkspacePolicySettings };\n}\n\nexport function createWorkspacePolicyMetadata(\n  settings: WorkspacePolicySettings,\n): AdminAuditMetadata {\n  return {\n    defaultShareExpiryDays: settings.defaultShareExpiryDays,\n    allowPublicDownloads: settings.allowPublicDownloads,\n    allowPublicComments: settings.allowPublicComments,\n    inviteMode: settings.inviteMode,\n    maxInviteRole: settings.maxInviteRole,\n    sessionMode: settings.sessionMode,\n    staleSessionDays: settings.staleSessionDays,\n    updatedBy: settings.updatedBy,\n  };\n}\n\nexport function getWorkspacePolicySettingsFromEvents(\n  events: WorkspacePolicyEvent[],\n): WorkspacePolicySettings {\n  const event = events.find((row) => row.action === WORKSPACE_POLICY_ACTION);\n\n  if (!event) {\n    return getDefaultWorkspacePolicySettings();\n  }\n\n  return normalizeWorkspacePolicySettings({\n    ...event.metadata,\n    updatedAt: toIsoString(event.createdAt),\n    updatedBy: readString(event.metadata.updatedBy, event.actorEmail),\n  });\n}\n\nexport function normalizeWorkspacePolicySettings(\n  input: Partial<Record<keyof WorkspacePolicySettings, unknown>>,\n): WorkspacePolicySettings {\n  const defaults = getDefaultWorkspacePolicySettings();\n\n  return {\n    defaultShareExpiryDays: readNumber(\n      input.defaultShareExpiryDays,\n      defaults.defaultShareExpiryDays,\n      0,\n      365,\n    ),\n    allowPublicDownloads: readBoolean(\n      input.allowPublicDownloads,\n      defaults.allowPublicDownloads,\n    ),\n    allowPublicComments: readBoolean(\n      input.allowPublicComments,\n      defaults.allowPublicComments,\n    ),\n    inviteMode: readEnum(\n      input.inviteMode,\n      workspacePolicyInviteModes,\n      defaults.inviteMode,\n    ),\n    maxInviteRole: readEnum(\n      input.maxInviteRole,\n      [\"viewer\", \"commenter\", \"editor\"] as const,\n      defaults.maxInviteRole,\n    ),\n    sessionMode: readEnum(\n      input.sessionMode,\n      workspacePolicySessionModes,\n      defaults.sessionMode,\n    ),\n    staleSessionDays: readNumber(\n      input.staleSessionDays,\n      defaults.staleSessionDays,\n      1,\n      365,\n    ),\n    updatedAt: readNullableString(input.updatedAt, defaults.updatedAt),\n    updatedBy: readNullableString(input.updatedBy, defaults.updatedBy),\n  };\n}\n\nexport function applyWorkspaceSharePolicy(\n  preset: SharePermissionPreset,\n  settings: WorkspacePolicySettings,\n  now = new Date(),\n): WorkspaceSharePolicyResult {\n  const presetConfig = sharePresetConfig[preset];\n\n  return {\n    accessLevel: presetConfig.accessLevel,\n    allowComments: presetConfig.allowComments && settings.allowPublicComments,\n    allowDownload: presetConfig.allowDownload && settings.allowPublicDownloads,\n    expiresAt:\n      settings.defaultShareExpiryDays > 0\n        ? new Date(\n            now.getTime() + settings.defaultShareExpiryDays * 24 * 60 * 60 * 1000,\n          )\n        : null,\n  };\n}\n\nexport function getInvitePolicyDecision({\n  inviterEmail,\n  inviterIsAdmin,\n  role,\n  settings,\n  targetEmail,\n}: {\n  inviterEmail: string;\n  inviterIsAdmin: boolean;\n  role: CollaboratorRole;\n  settings: WorkspacePolicySettings;\n  targetEmail: string;\n}): WorkspacePolicyDecision {\n  if (!isCollaboratorRoleAllowed(role, settings)) {\n    return {\n      allowed: false,\n      reason: `Workspace policy allows invites up to ${collaboratorRoleLabels[settings.maxInviteRole].toLowerCase()}.`,\n    };\n  }\n\n  if (settings.inviteMode === \"admins-only\" && !inviterIsAdmin) {\n    return {\n      allowed: false,\n      reason: \"Workspace policy only allows administrators to invite collaborators.\",\n    };\n  }\n\n  if (\n    settings.inviteMode === \"same-domain-only\" &&\n    getEmailDomain(inviterEmail) !== getEmailDomain(targetEmail)\n  ) {\n    return {\n      allowed: false,\n      reason: \"Workspace policy only allows collaborators from the same email domain.\",\n    };\n  }\n\n  return { allowed: true, reason: null };\n}\n\nexport function isCollaboratorRoleAllowed(\n  role: CollaboratorRole,\n  settings: WorkspacePolicySettings,\n) {\n  return roleRank[role] <= roleRank[settings.maxInviteRole];\n}\n\nexport function getWorkspacePolicyReviewReport({\n  now = new Date(),\n  sessions,\n  settings,\n  shares,\n}: {\n  now?: Date;\n  sessions: WorkspacePolicySessionRow[];\n  settings: WorkspacePolicySettings;\n  shares: WorkspacePolicyShareRow[];\n}): WorkspacePolicyReviewReport {\n  const activeShares = shares.filter((share) => !share.disabledAt);\n  const expiredShares = activeShares.filter(\n    (share) => share.expiresAt && new Date(share.expiresAt).getTime() < now.getTime(),\n  );\n  const liveShares = activeShares.filter(\n    (share) => !share.expiresAt || new Date(share.expiresAt).getTime() >= now.getTime(),\n  );\n  const downloadShareCount = liveShares.filter((share) => share.allowDownload).length;\n  const commentShareCount = liveShares.filter((share) => share.allowComments).length;\n  const staleSessionCutoff =\n    now.getTime() - settings.staleSessionDays * 24 * 60 * 60 * 1000;\n  const expiredSessionCount = sessions.filter(\n    (row) => new Date(row.expiresAt).getTime() < now.getTime(),\n  ).length;\n  const staleSessionCount = sessions.filter(\n    (row) => new Date(row.updatedAt || row.createdAt).getTime() < staleSessionCutoff,\n  ).length;\n  const findings: WorkspacePolicyFinding[] = [\n    getExpiryFinding(settings),\n    getDownloadFinding(settings, downloadShareCount),\n    getCommentFinding(settings, commentShareCount),\n    getInviteFinding(settings),\n    getRoleFinding(settings),\n    getSessionFinding(settings, staleSessionCount, expiredSessionCount),\n    getShareInventoryFinding(activeShares.length, expiredShares.length),\n  ];\n  const score = getPolicyScore({\n    downloadShareCount,\n    expiredSessionCount,\n    settings,\n    staleSessionCount,\n  });\n\n  return {\n    settings,\n    status: score >= 85 ? \"ready\" : score >= 60 ? \"review\" : \"blocked\",\n    score,\n    activeShareCount: activeShares.length,\n    downloadShareCount,\n    commentShareCount,\n    expiredShareCount: expiredShares.length,\n    staleSessionCount,\n    expiredSessionCount,\n    findings,\n  };\n}\n\nfunction getExpiryFinding(\n  settings: WorkspacePolicySettings,\n): WorkspacePolicyFinding {\n  if (settings.defaultShareExpiryDays > 0) {\n    return {\n      id: \"default-share-expiry\",\n      label: \"Default share expiry\",\n      status: \"ready\",\n      value: `${settings.defaultShareExpiryDays} days`,\n      detail: \"New public share links receive an automatic expiration date.\",\n    };\n  }\n\n  return {\n    id: \"default-share-expiry\",\n    label: \"Default share expiry\",\n    status: \"review\",\n    value: \"No automatic expiry\",\n    detail: \"New public share links stay live until someone manually disables them.\",\n  };\n}\n\nfunction getDownloadFinding(\n  settings: WorkspacePolicySettings,\n  downloadShareCount: number,\n): WorkspacePolicyFinding {\n  if (!settings.allowPublicDownloads && downloadShareCount > 0) {\n    return {\n      id: \"public-downloads\",\n      label: \"Public downloads\",\n      status: \"blocked\",\n      value: `${downloadShareCount} existing links`,\n      detail: \"The saved policy blocks downloads, but older live links still expose downloads.\",\n    };\n  }\n\n  if (!settings.allowPublicDownloads) {\n    return {\n      id: \"public-downloads\",\n      label: \"Public downloads\",\n      status: \"ready\",\n      value: \"Blocked for new links\",\n      detail: \"New public share links cannot expose file downloads.\",\n    };\n  }\n\n  return {\n    id: \"public-downloads\",\n    label: \"Public downloads\",\n    status: downloadShareCount > 0 ? \"review\" : \"ready\",\n    value: `${downloadShareCount} live links`,\n    detail: \"Downloads are allowed for presets that normally include handoff assets.\",\n  };\n}\n\nfunction getCommentFinding(\n  settings: WorkspacePolicySettings,\n  commentShareCount: number,\n): WorkspacePolicyFinding {\n  if (!settings.allowPublicComments && commentShareCount > 0) {\n    return {\n      id: \"public-comments\",\n      label: \"Public comments\",\n      status: \"review\",\n      value: `${commentShareCount} existing links`,\n      detail: \"The saved policy blocks comments, but older review links still allow comments.\",\n    };\n  }\n\n  return {\n    id: \"public-comments\",\n    label: \"Public comments\",\n    status: \"ready\",\n    value: settings.allowPublicComments ? \"Allowed by policy\" : \"Blocked for new links\",\n    detail: settings.allowPublicComments\n      ? \"New review links can collect collaborator feedback.\"\n      : \"New public share links cannot collect comments.\",\n  };\n}\n\nfunction getInviteFinding(\n  settings: WorkspacePolicySettings,\n): WorkspacePolicyFinding {\n  const values: Record<WorkspacePolicyInviteMode, string> = {\n    \"any-existing-user\": \"Any registered user\",\n    \"same-domain-only\": \"Same email domain\",\n    \"admins-only\": \"Administrators only\",\n  };\n\n  return {\n    id: \"invite-restriction\",\n    label: \"Invite restriction\",\n    status: settings.inviteMode === \"any-existing-user\" ? \"review\" : \"ready\",\n    value: values[settings.inviteMode],\n    detail:\n      settings.inviteMode === \"any-existing-user\"\n        ? \"File owners can invite any existing account in the workspace.\"\n        : \"New collaborator invites are restricted before access is changed.\",\n  };\n}\n\nfunction getRoleFinding(\n  settings: WorkspacePolicySettings,\n): WorkspacePolicyFinding {\n  return {\n    id: \"max-invite-role\",\n    label: \"Maximum invite role\",\n    status: settings.maxInviteRole === \"editor\" ? \"review\" : \"ready\",\n    value: collaboratorRoleLabels[settings.maxInviteRole],\n    detail:\n      settings.maxInviteRole === \"editor\"\n        ? \"File owners can grant full editor access by default.\"\n        : \"File owners cannot grant roles above this workspace limit.\",\n  };\n}\n\nfunction getSessionFinding(\n  settings: WorkspacePolicySettings,\n  staleSessionCount: number,\n  expiredSessionCount: number,\n): WorkspacePolicyFinding {\n  if (expiredSessionCount > 0 && settings.sessionMode === \"revoke-expired\") {\n    return {\n      id: \"session-hygiene\",\n      label: \"Session hygiene\",\n      status: \"blocked\",\n      value: `${expiredSessionCount} expired`,\n      detail: \"Policy expects expired sessions to be revoked, but expired sessions still exist.\",\n    };\n  }\n\n  return {\n    id: \"session-hygiene\",\n    label: \"Session hygiene\",\n    status:\n      staleSessionCount > 0 || expiredSessionCount > 0\n        ? settings.sessionMode === \"monitor\"\n          ? \"review\"\n          : \"blocked\"\n        : \"ready\",\n    value: `${staleSessionCount} stale / ${expiredSessionCount} expired`,\n    detail:\n      settings.sessionMode === \"monitor\"\n        ? \"Admins monitor stale sessions before taking manual action.\"\n        : \"Admins should review or revoke sessions outside the configured age window.\",\n  };\n}\n\nfunction getShareInventoryFinding(\n  activeShareCount: number,\n  expiredShareCount: number,\n): WorkspacePolicyFinding {\n  return {\n    id: \"share-inventory\",\n    label: \"Share inventory\",\n    status: expiredShareCount > 0 ? \"review\" : \"ready\",\n    value: `${activeShareCount} active / ${expiredShareCount} expired`,\n    detail:\n      expiredShareCount > 0\n        ? \"Expired links are still visible in the admin review window until disabled.\"\n        : \"No expired active shares were found in the recent review window.\",\n  };\n}\n\nfunction getPolicyScore({\n  downloadShareCount,\n  expiredSessionCount,\n  settings,\n  staleSessionCount,\n}: {\n  downloadShareCount: number;\n  expiredSessionCount: number;\n  settings: WorkspacePolicySettings;\n  staleSessionCount: number;\n}) {\n  let score = 100;\n\n  if (settings.defaultShareExpiryDays === 0) {\n    score -= 18;\n  }\n\n  if (settings.allowPublicDownloads) {\n    score -= 8;\n  }\n\n  score -= Math.min(downloadShareCount * 3, 12);\n\n  if (settings.inviteMode === \"any-existing-user\") {\n    score -= 12;\n  } else if (settings.inviteMode === \"same-domain-only\") {\n    score -= 4;\n  }\n\n  if (settings.maxInviteRole === \"editor\") {\n    score -= 8;\n  } else if (settings.maxInviteRole === \"commenter\") {\n    score -= 3;\n  }\n\n  if (settings.sessionMode === \"monitor\") {\n    score -= 8;\n  } else if (settings.sessionMode === \"review-stale\") {\n    score -= 3;\n  }\n\n  score -= Math.min(staleSessionCount * 2, 10);\n  score -= Math.min(expiredSessionCount * 3, 12);\n\n  return Math.max(0, Math.min(100, score));\n}\n\nfunction getEmailDomain(email: string) {\n  return email.toLowerCase().split(\"@\")[1] ?? \"\";\n}\n\nfunction readNumber(\n  value: unknown,\n  fallback: number,\n  min: number,\n  max: number,\n) {\n  const parsed = Number(value);\n\n  if (!Number.isFinite(parsed)) {\n    return fallback;\n  }\n\n  return Math.max(min, Math.min(max, Math.round(parsed)));\n}\n\nfunction readBoolean(value: unknown, fallback: boolean) {\n  return typeof value === \"boolean\" ? value : fallback;\n}\n\nfunction readNullableString(value: unknown, fallback: string | null) {\n  return typeof value === \"string\" && value.length > 0 ? value : fallback;\n}\n\nfunction readString(value: unknown, fallback: string) {\n  return typeof value === \"string\" && value.length > 0 ? value : fallback;\n}\n\nfunction readEnum<const T extends readonly string[]>(\n  value: unknown,\n  options: T,\n  fallback: T[number],\n): T[number] {\n  return typeof value === \"string\" && options.includes(value)\n    ? value\n    : fallback;\n}\n\nfunction toIsoString(value: string | Date) {\n  return value instanceof Date ? value.toISOString() : value;\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/workspace-policy.ts",
  "chunk_output": ".dx/www/output/source-routes/embed--token/modules/src-features-admin-workspace-policy-ts-1328e128ed00d73c.mjs",
  "kind": "ts",
  "hash": "1328e128ed00d73c",
  "dependencies": [
    {
      "specifier": "@/features/files/permissions",
      "resolved_path": "src/features/files/permissions.ts",
      "chunk_output": ".dx/www/output/source-routes/embed--token/modules/src-features-files-permissions-ts-619c9a7eeb3a33f6.mjs",
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
    "source_path": "src/features/admin/workspace-policy.ts",
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
        "specifier": "@/db/schema",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/files/permissions",
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
      "getDefaultWorkspacePolicySettings",
      "createWorkspacePolicyMetadata",
      "getWorkspacePolicySettingsFromEvents",
      "normalizeWorkspacePolicySettings",
      "applyWorkspaceSharePolicy",
      "getInvitePolicyDecision",
      "isCollaboratorRoleAllowed",
      "getWorkspacePolicyReviewReport",
      "WORKSPACE_POLICY_ACTION",
      "workspacePolicyInviteModes",
      "workspacePolicySessionModes"
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
