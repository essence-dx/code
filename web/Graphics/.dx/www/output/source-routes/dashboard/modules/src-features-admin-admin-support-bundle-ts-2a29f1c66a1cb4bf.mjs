import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-features-admin-admin-retention-privacy-ts-ba9ee2978fb1a8ec.mjs";
import { dxSourceModule as dep1, dxRuntimeExports as dep1Runtime } from "./src-features-admin-admin-support-bundle-filters-ts-211706294a55da8b.mjs";
export const dxSourceText = "import type {\n  AdminAuditRow,\n  AdminDashboardData,\n  AdminFileRow,\n  AdminNotificationDeliveryRow,\n  AdminSessionRiskRow,\n  AdminShareRow,\n  AdminUserRow,\n} from \"@/features/admin/admin-data\";\nimport type {\n  AdminRollbackReadinessReport,\n  AdminRollbackReadinessStatus,\n  AdminRollbackVersionRow,\n} from \"@/features/admin/admin-rollback-readiness\";\nimport {\n  getDefaultRetentionPrivacySettings,\n  maskEmail,\n  redactMetadata,\n  type RetentionPrivacySettings,\n} from \"@/features/admin/admin-retention-privacy\";\nimport {\n  getAdminSupportBundleRelatedEntities,\n  getScopedSupportAuditEvents,\n  getScopedSupportFiles,\n  getScopedSupportNotifications,\n  getScopedSupportRollbackVersions,\n  getScopedSupportSessions,\n  getScopedSupportShares,\n  getScopedSupportUsers,\n} from \"@/features/admin/admin-support-bundle-filters\";\n\nexport const adminSupportBundleScopes = [\n  \"workspace\",\n  \"user\",\n  \"file\",\n  \"share\",\n] as const;\n\nexport type AdminSupportBundleScope =\n  (typeof adminSupportBundleScopes)[number];\n\nexport type AdminSupportBundleFinding = {\n  id: string;\n  label: string;\n  status: \"ready\" | \"review\" | \"blocked\";\n  value: string;\n  detail: string;\n};\n\nexport type AdminSupportBundle = {\n  generatedAt: string;\n  requestedBy: string;\n  scope: AdminSupportBundleScope;\n  target: {\n    id: string | null;\n    label: string;\n    type: AdminSupportBundleScope;\n  };\n  status: \"ready\" | \"review\" | \"blocked\";\n  score: number;\n  summary: {\n    users: number;\n    files: number;\n    shares: number;\n    sessions: number;\n    auditEvents: number;\n    notificationDeliveries: number;\n    failedNotifications: number;\n    rollbackRows: number;\n    rollbackVersions: number;\n  };\n  privacy: {\n    mode: RetentionPrivacySettings[\"supportBundlePrivacyMode\"];\n    retentionDays: number;\n    emailsRedacted: boolean;\n    networkDetailsIncluded: boolean;\n    notificationReasonsIncluded: boolean;\n    auditMetadataIncluded: boolean;\n  };\n  findings: AdminSupportBundleFinding[];\n  users: AdminUserRow[];\n  files: AdminFileRow[];\n  shares: AdminShareRow[];\n  sessions: AdminSessionRiskRow[];\n  auditEvents: AdminAuditRow[];\n  notificationDeliveries: AdminNotificationDeliveryRow[];\n  rollbackEvidence: {\n    generatedAt: string;\n    status: AdminRollbackReadinessStatus;\n    score: number;\n    database: AdminRollbackReadinessReport[\"database\"];\n    deploymentUrls: string[];\n    rows: AdminRollbackReadinessReport[\"rows\"];\n    latestVersions: AdminRollbackVersionRow[];\n  };\n};\n\ntype AdminSupportBundleInput = {\n  auditEvents: AdminAuditRow[];\n  files: AdminFileRow[];\n  generatedAt?: string;\n  notificationDeliveries: AdminNotificationDeliveryRow[];\n  requestedBy: string;\n  rollbackReadiness: AdminRollbackReadinessReport;\n  scope: AdminSupportBundleScope;\n  settings?: RetentionPrivacySettings;\n  selectedFileId?: string;\n  selectedShareId?: string;\n  selectedUserId?: string;\n  sessions: AdminSessionRiskRow[];\n  shares: AdminShareRow[];\n  users: AdminUserRow[];\n};\n\nexport function createAdminSupportBundleFromDashboard({\n  data,\n  generatedAt,\n  scope,\n  selectedFileId,\n  selectedShareId,\n  selectedUserId,\n}: {\n  data: AdminDashboardData;\n  generatedAt?: string;\n  scope: AdminSupportBundleScope;\n  selectedFileId?: string;\n  selectedShareId?: string;\n  selectedUserId?: string;\n}) {\n  return createAdminSupportBundle({\n    auditEvents: data.auditEvents,\n    files: data.files,\n    generatedAt,\n    notificationDeliveries: data.notificationDeliveries,\n    requestedBy: data.currentUser.email,\n    rollbackReadiness: data.rollbackReadiness,\n    scope,\n    settings: data.retentionPrivacy.settings,\n    selectedFileId,\n    selectedShareId,\n    selectedUserId,\n    sessions: data.sessions,\n    shares: data.shares,\n    users: data.users,\n  });\n}\n\nexport function createAdminSupportBundle({\n  auditEvents,\n  files,\n  generatedAt = new Date().toISOString(),\n  notificationDeliveries,\n  requestedBy,\n  rollbackReadiness,\n  scope,\n  settings = getDefaultRetentionPrivacySettings(),\n  selectedFileId,\n  selectedShareId,\n  selectedUserId,\n  sessions,\n  shares,\n  users,\n}: AdminSupportBundleInput): AdminSupportBundle {\n  const selectedUser = users.find((row) => row.id === selectedUserId) ?? null;\n  const selectedFile = files.find((row) => row.id === selectedFileId) ?? null;\n  const selectedShare = shares.find((row) => row.id === selectedShareId) ?? null;\n  const related = getAdminSupportBundleRelatedEntities({\n    files,\n    scope,\n    selectedFile,\n    selectedShare,\n    selectedUser,\n    shares,\n    users,\n  });\n  const scopedUsers = getScopedSupportUsers(users, related, scope);\n  const scopedFiles = getScopedSupportFiles(files, related, scope);\n  const scopedShares = getScopedSupportShares(shares, related, scope);\n  const scopedSessions = getScopedSupportSessions(sessions, related, scope);\n  const scopedNotifications = getScopedSupportNotifications(\n    notificationDeliveries,\n    related,\n    scope,\n  );\n  const scopedAuditEvents = getScopedSupportAuditEvents(\n    auditEvents,\n    related,\n    scope,\n  );\n  const rollbackVersions = getScopedSupportRollbackVersions(\n    rollbackReadiness.latestVersions,\n    related,\n    scope,\n  );\n  const scopedData = applySupportBundlePrivacy({\n    auditEvents: scopedAuditEvents,\n    files: scopedFiles,\n    notificationDeliveries: scopedNotifications,\n    sessions: scopedSessions,\n    settings,\n    shares: scopedShares,\n    users: scopedUsers,\n  });\n  const failedNotifications = scopedNotifications.filter(\n    (row) => row.status === \"failed\",\n  ).length;\n  const findings = getSupportBundleFindings({\n    auditEvents: scopedAuditEvents,\n    failedNotifications,\n    missingTarget: getMissingTarget(scope, selectedUser, selectedFile, selectedShare),\n    rollbackReadiness,\n    scope,\n    sessions: scopedSessions,\n    shares: scopedShares,\n  });\n\n  return {\n    generatedAt,\n    requestedBy,\n    scope,\n    target: getSupportBundleTarget({\n      scope,\n      selectedFile,\n      selectedShare,\n      selectedUser,\n    }),\n    status: getBundleStatus(findings),\n    score: getBundleScore(findings),\n    summary: {\n      users: scopedUsers.length,\n      files: scopedFiles.length,\n      shares: scopedShares.length,\n      sessions: scopedSessions.length,\n      auditEvents: scopedAuditEvents.length,\n      notificationDeliveries: scopedNotifications.length,\n      failedNotifications,\n      rollbackRows: rollbackReadiness.rows.length,\n      rollbackVersions: rollbackVersions.length,\n    },\n    privacy: {\n      mode: settings.supportBundlePrivacyMode,\n      retentionDays: settings.supportBundleRetentionDays,\n      emailsRedacted: settings.supportBundlePrivacyMode !== \"diagnostic\",\n      networkDetailsIncluded: settings.includeSupportBundleNetworkDetails,\n      notificationReasonsIncluded:\n        settings.includeSupportBundleNotificationReasons,\n      auditMetadataIncluded: settings.includeSupportBundleAuditMetadata,\n    },\n    findings,\n    users: scopedData.users,\n    files: scopedData.files,\n    shares: scopedData.shares,\n    sessions: scopedData.sessions,\n    auditEvents: scopedData.auditEvents,\n    notificationDeliveries: scopedData.notificationDeliveries,\n    rollbackEvidence: {\n      generatedAt: rollbackReadiness.generatedAt,\n      status: rollbackReadiness.status,\n      score: rollbackReadiness.score,\n      database: rollbackReadiness.database,\n      deploymentUrls: rollbackReadiness.deploymentUrls,\n      rows: rollbackReadiness.rows,\n      latestVersions: rollbackVersions,\n    },\n  };\n}\n\nfunction applySupportBundlePrivacy({\n  auditEvents,\n  files,\n  notificationDeliveries,\n  sessions,\n  settings,\n  shares,\n  users,\n}: {\n  auditEvents: AdminAuditRow[];\n  files: AdminFileRow[];\n  notificationDeliveries: AdminNotificationDeliveryRow[];\n  sessions: AdminSessionRiskRow[];\n  settings: RetentionPrivacySettings;\n  shares: AdminShareRow[];\n  users: AdminUserRow[];\n}) {\n  const redactEmails = settings.supportBundlePrivacyMode !== \"diagnostic\";\n  const minimal = settings.supportBundlePrivacyMode === \"minimal\";\n\n  return {\n    users: users.map((user) => ({\n      ...user,\n      email: redactEmails ? maskEmail(user.email) : user.email,\n    })),\n    files: files.map((file) => ({\n      ...file,\n      ownerEmail: redactEmails ? maskEmail(file.ownerEmail) : file.ownerEmail,\n    })),\n    shares: shares.map((share) => ({\n      ...share,\n      ownerEmail: redactEmails ? maskEmail(share.ownerEmail) : share.ownerEmail,\n      token: redactEmails ? \"[redacted-token]\" : share.token,\n      sharePath: redactEmails ? \"/share/[redacted]\" : share.sharePath,\n    })),\n    sessions: sessions.map((session) => ({\n      ...session,\n      userEmail: redactEmails ? maskEmail(session.userEmail) : session.userEmail,\n      ipAddress: settings.includeSupportBundleNetworkDetails\n        ? session.ipAddress\n        : null,\n      userAgent: settings.includeSupportBundleNetworkDetails\n        ? session.userAgent\n        : null,\n    })),\n    notificationDeliveries: notificationDeliveries.map((delivery) => ({\n      ...delivery,\n      ownerEmail: redactEmails\n        ? maskEmail(delivery.ownerEmail)\n        : delivery.ownerEmail,\n      recipientEmail: redactEmails\n        ? maskEmail(delivery.recipientEmail)\n        : delivery.recipientEmail,\n      reason:\n        settings.includeSupportBundleNotificationReasons && !minimal\n          ? delivery.reason\n          : null,\n    })),\n    auditEvents: auditEvents.map((event) => ({\n      ...event,\n      actorEmail: redactEmails ? maskEmail(event.actorEmail) : event.actorEmail,\n      metadata:\n        settings.includeSupportBundleAuditMetadata && !minimal\n          ? redactMetadata(event.metadata)\n          : {},\n    })),\n  };\n}\n\nfunction getSupportBundleTarget({\n  scope,\n  selectedFile,\n  selectedShare,\n  selectedUser,\n}: {\n  scope: AdminSupportBundleScope;\n  selectedFile: AdminFileRow | null;\n  selectedShare: AdminShareRow | null;\n  selectedUser: AdminUserRow | null;\n}): AdminSupportBundle[\"target\"] {\n  if (scope === \"user\") {\n    return {\n      id: selectedUser?.id ?? null,\n      label: selectedUser?.email ?? \"Missing selected user\",\n      type: \"user\",\n    };\n  }\n\n  if (scope === \"file\") {\n    return {\n      id: selectedFile?.id ?? null,\n      label: selectedFile?.name ?? \"Missing selected file\",\n      type: \"file\",\n    };\n  }\n\n  if (scope === \"share\") {\n    return {\n      id: selectedShare?.id ?? null,\n      label: selectedShare\n        ? `${selectedShare.fileName} / ${selectedShare.permissionPreset}`\n        : \"Missing selected share\",\n      type: \"share\",\n    };\n  }\n\n  return { id: null, label: \"Full workspace\", type: \"workspace\" };\n}\n\nfunction getSupportBundleFindings({\n  auditEvents,\n  failedNotifications,\n  missingTarget,\n  rollbackReadiness,\n  scope,\n  sessions,\n  shares,\n}: {\n  auditEvents: AdminAuditRow[];\n  failedNotifications: number;\n  missingTarget: string | null;\n  rollbackReadiness: AdminRollbackReadinessReport;\n  scope: AdminSupportBundleScope;\n  sessions: AdminSessionRiskRow[];\n  shares: AdminShareRow[];\n}): AdminSupportBundleFinding[] {\n  const now = Date.now();\n  const expiredSessions = sessions.filter(\n    (row) => new Date(row.expiresAt).getTime() <= now,\n  ).length;\n  const liveDownloadShares = shares.filter(\n    (row) =>\n      !row.disabledAt &&\n      (!row.expiresAt || new Date(row.expiresAt).getTime() > now) &&\n      row.allowDownload,\n  ).length;\n  const expiredShares = shares.filter(\n    (row) =>\n      !row.disabledAt &&\n      row.expiresAt &&\n      new Date(row.expiresAt).getTime() <= now,\n  ).length;\n  const findings: AdminSupportBundleFinding[] = [];\n\n  if (missingTarget) {\n    findings.push({\n      id: \"missing-target\",\n      label: \"Selected target\",\n      status: \"blocked\",\n      value: \"Not found\",\n      detail: missingTarget,\n    });\n  }\n\n  return findings.concat([\n    getAuditFinding(scope, auditEvents.length),\n    getNotificationFinding(failedNotifications),\n    getSessionFinding(expiredSessions),\n    getShareFinding(liveDownloadShares, expiredShares),\n    {\n      id: \"rollback-evidence\",\n      label: \"Rollback evidence\",\n      status: rollbackReadiness.status,\n      value: `${rollbackReadiness.score}/100`,\n      detail:\n        \"The bundle includes current rollback readiness rows, database state, deployment links, and recent version anchors.\",\n    },\n  ]);\n}\n\nfunction getAuditFinding(\n  scope: AdminSupportBundleScope,\n  auditEventCount: number,\n): AdminSupportBundleFinding {\n  return {\n    id: \"audit-evidence\",\n    label: \"Audit evidence\",\n    status: scope !== \"workspace\" && auditEventCount === 0 ? \"review\" : \"ready\",\n    value: `${auditEventCount} events`,\n    detail:\n      auditEventCount > 0\n        ? \"Relevant administrator actions are included in this support bundle.\"\n        : \"No matching audit events were found for the selected scope.\",\n  };\n}\n\nfunction getNotificationFinding(\n  failedNotifications: number,\n): AdminSupportBundleFinding {\n  return {\n    id: \"notification-delivery\",\n    label: \"Notification delivery\",\n    status: failedNotifications > 0 ? \"review\" : \"ready\",\n    value: `${failedNotifications} failed`,\n    detail:\n      failedNotifications > 0\n        ? \"Failed comment notification deliveries are included for diagnosis.\"\n        : \"No failed notification deliveries matched this bundle scope.\",\n  };\n}\n\nfunction getSessionFinding(expiredSessions: number): AdminSupportBundleFinding {\n  return {\n    id: \"session-risk\",\n    label: \"Session risk\",\n    status: expiredSessions > 0 ? \"blocked\" : \"ready\",\n    value: `${expiredSessions} expired`,\n    detail:\n      expiredSessions > 0\n        ? \"Expired sessions are included so support can review sign-in hygiene.\"\n        : \"No expired sessions matched this bundle scope.\",\n  };\n}\n\nfunction getShareFinding(\n  liveDownloadShares: number,\n  expiredShares: number,\n): AdminSupportBundleFinding {\n  return {\n    id: \"share-exposure\",\n    label: \"Public share exposure\",\n    status:\n      expiredShares > 0 ? \"blocked\" : liveDownloadShares > 0 ? \"review\" : \"ready\",\n    value: `${liveDownloadShares} downloads / ${expiredShares} expired`,\n    detail:\n      liveDownloadShares > 0 || expiredShares > 0\n        ? \"Public link exposure is included for support and rollback review.\"\n        : \"No risky public share exposure matched this bundle scope.\",\n  };\n}\n\nfunction getMissingTarget(\n  scope: AdminSupportBundleScope,\n  selectedUser: AdminUserRow | null,\n  selectedFile: AdminFileRow | null,\n  selectedShare: AdminShareRow | null,\n) {\n  if (scope === \"user\" && !selectedUser) {\n    return \"Choose an existing user before exporting a user-scoped support bundle.\";\n  }\n\n  if (scope === \"file\" && !selectedFile) {\n    return \"Choose an existing file before exporting a file-scoped support bundle.\";\n  }\n\n  if (scope === \"share\" && !selectedShare) {\n    return \"Choose an existing share link before exporting a share-scoped support bundle.\";\n  }\n\n  return null;\n}\n\nfunction getBundleStatus(findings: AdminSupportBundleFinding[]) {\n  if (findings.some((finding) => finding.status === \"blocked\")) {\n    return \"blocked\";\n  }\n\n  if (findings.some((finding) => finding.status === \"review\")) {\n    return \"review\";\n  }\n\n  return \"ready\";\n}\n\nfunction getBundleScore(findings: AdminSupportBundleFinding[]) {\n  return Math.max(\n    0,\n    100 -\n      findings.filter((finding) => finding.status === \"blocked\").length * 22 -\n      findings.filter((finding) => finding.status === \"review\").length * 7,\n  );\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-support-bundle.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-support-bundle-ts-2a29f1c66a1cb4bf.mjs",
  "kind": "ts",
  "hash": "2a29f1c66a1cb4bf",
  "dependencies": [
    {
      "specifier": "@/features/admin/admin-retention-privacy",
      "resolved_path": "src/features/admin/admin-retention-privacy.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-retention-privacy-ts-ba9ee2978fb1a8ec.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/admin/admin-support-bundle-filters",
      "resolved_path": "src/features/admin/admin-support-bundle-filters.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-support-bundle-filters-ts-211706294a55da8b.mjs",
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
    "source_path": "src/features/admin/admin-support-bundle.ts",
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
        "specifier": "@/features/admin/admin-data",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/admin/admin-rollback-readiness",
        "side_effect_only": false,
        "type_only": true
      },
      {
        "specifier": "@/features/admin/admin-retention-privacy",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/admin/admin-support-bundle-filters",
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
      "createAdminSupportBundleFromDashboard",
      "createAdminSupportBundle",
      "adminSupportBundleScopes"
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
