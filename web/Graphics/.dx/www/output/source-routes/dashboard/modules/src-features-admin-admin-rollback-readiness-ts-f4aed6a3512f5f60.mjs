
export const dxSourceText = "\n  | \"versions\"\n  | \"shares\"\n  | \"database\"\n  | \"deployment\";\n\n\n\n\n\n\n\n\n\nexport function getAdminRollbackReadinessReport({\n  files,\n  versions,\n  shares,\n  auditEvents,\n  database,\n  deploymentUrls,\n  generatedAt = new Date().toISOString(),\n  now = Date.now(),\n}){\n  const rows: AdminRollbackReadinessRow[] = [];\n  const activeFiles = files.filter((file) => !file.trashedAt);\n  const filesWithoutVersions = activeFiles.filter(\n    (file) => file.versionCount === 0,\n  );\n  const staleShares = shares.filter(\n    (share) =>\n      !share.disabledAt &&\n      Boolean(share.expiresAt && new Date(share.expiresAt).getTime() <= now),\n  );\n  const elevatedShares = shares.filter(\n    (share) =>\n      !share.disabledAt &&\n      !Boolean(share.expiresAt && new Date(share.expiresAt).getTime() <= now) &&\n      (share.allowDownload ||\n        share.allowComments ||\n        share.accessLevel === \"review\" ||\n        !share.expiresAt),\n  );\n  const shareAuditEvents = auditEvents.filter((event) =>\n    event.action.startsWith(\"share.\"),\n  );\n\n  rows.push(getDatabaseRow(database));\n  rows.push(\n    getVersionRow({\n      activeFileCount: activeFiles.length,\n      versionAnchorCount: versions.length,\n      filesWithoutVersions,\n    }),\n  );\n  rows.push(\n    getShareExposureRow({\n      staleShares,\n      elevatedShares,\n    }),\n  );\n  rows.push(\n    getShareAuditRow({\n      activeShareCount: database.activeShares,\n      shareAuditEvents,\n    }),\n  );\n  rows.push(getDeploymentRow(deploymentUrls));\n\n  const readyCount = rows.filter((row) => row.status === \"ready\").length;\n  const reviewCount = rows.filter((row) => row.status === \"review\").length;\n  const blockedCount = rows.filter((row) => row.status === \"blocked\").length;\n  const status: AdminRollbackReadinessStatus =\n    blockedCount > 0 ? \"blocked\" : reviewCount > 0 ? \"review\" : \"ready\";\n  const score = Math.max(0, 100 - blockedCount * 24 - reviewCount * 8);\n\n  return {\n    generatedAt,\n    status,\n    score,\n    readyCount,\n    reviewCount,\n    blockedCount,\n    versionAnchorCount: versions.length,\n    filesWithoutVersions: filesWithoutVersions.length,\n    staleShareCount: staleShares.length,\n    elevatedShareCount: elevatedShares.length,\n    shareAuditEventCount: shareAuditEvents.length,\n    deploymentLinkCount: deploymentUrls.length,\n    database,\n    deploymentUrls,\n    latestVersions: versions.slice(0, 12),\n    rows,\n  };\n}\n\nfunction getDatabaseRow(\n  database: AdminRollbackDatabaseSummary,\n): AdminRollbackReadinessRow {\n  if (!database.configured) {\n    return {\n      id: \"database-unconfigured\",\n      status: \"blocked\",\n      category: \"database\",\n      label: \"Database state\",\n      detail: \"Turso database URL is not configured for release recovery.\",\n      recommendation:\n        \"Configure TURSO_DATABASE_URL before relying on admin rollback exports.\",\n      count: 0,\n      target: null,\n    };\n  }\n\n  if (database.authTokenRequired && !database.authTokenConfigured) {\n    return {\n      id: \"database-token-missing\",\n      status: \"blocked\",\n      category: \"database\",\n      label: \"Database auth token\",\n      detail: \"Remote libSQL database is configured but its auth token is missing.\",\n      recommendation:\n        \"Set TURSO_AUTH_TOKEN in production before approving rollback readiness.\",\n      count: 0,\n      target: database.databaseKind,\n    };\n  }\n\n  return {\n    id: \"database-state-ready\",\n    status: \"ready\",\n    category: \"database\",\n    label: \"Database state\",\n    detail: `${database.users} users, ${database.activeFiles} active files, ${database.activeShares} active shares, and ${database.versions} versions are visible to the rollback report.`,\n    recommendation:\n      \"Export this report with the release approval snapshot so database state has a review anchor.\",\n    count: database.activeFiles,\n    target: database.databaseKind,\n  };\n}\n\nfunction getVersionRow({\n  activeFileCount,\n  versionAnchorCount,\n  filesWithoutVersions,\n}: {\n  activeFileCount: number;\n  versionAnchorCount: number;\n  filesWithoutVersions: AdminRollbackFileStateRow[];\n}): AdminRollbackReadinessRow {\n  if (activeFileCount > 0 && versionAnchorCount === 0) {\n    return {\n      id: \"version-anchors-missing\",\n      status: \"blocked\",\n      category: \"versions\",\n      label: \"Version restore anchors\",\n      detail: \"No named design-file versions are available for restore.\",\n      recommendation:\n        \"Save named versions for important files before production release.\",\n      count: 0,\n      target: null,\n    };\n  }\n\n  if (filesWithoutVersions.length > 0) {\n    return {\n      id: \"files-without-versions\",\n      status: \"review\",\n      category: \"versions\",\n      label: \"Files without versions\",\n      detail: `${filesWithoutVersions.length} active files do not have a named version restore point.`,\n      recommendation:\n        \"Create named versions for active release-critical files or document why they are excluded.\",\n      count: filesWithoutVersions.length,\n      target: filesWithoutVersions[0]?.fileName ?? null,\n    };\n  }\n\n  return {\n    id: \"version-anchors-ready\",\n    status: \"ready\",\n    category: \"versions\",\n    label: \"Version restore anchors\",\n    detail: `${versionAnchorCount} recent named versions are available for restore review.`,\n    recommendation:\n      \"Keep version exports paired with release approvals for design rollback traceability.\",\n    count: versionAnchorCount,\n    target: null,\n  };\n}\n\nfunction getShareExposureRow({\n  staleShares,\n  elevatedShares,\n}: {\n  staleShares: AdminRollbackShareRow[];\n  elevatedShares: AdminRollbackShareRow[];\n}): AdminRollbackReadinessRow {\n  if (staleShares.length > 0) {\n    return {\n      id: \"stale-shares-block-rollback\",\n      status: \"blocked\",\n      category: \"shares\",\n      label: \"Stale public shares\",\n      detail: `${staleShares.length} active share links are already expired and need cleanup before release.`,\n      recommendation:\n        \"Disable expired links or refresh expiry windows before exporting rollback readiness.\",\n      count: staleShares.length,\n      target: staleShares[0]?.fileName ?? null,\n    };\n  }\n\n  if (elevatedShares.length > 0) {\n    return {\n      id: \"elevated-share-review\",\n      status: \"review\",\n      category: \"shares\",\n      label: \"Elevated public shares\",\n      detail: `${elevatedShares.length} live shares allow downloads, comments, review access, or no expiry.`,\n      recommendation:\n        \"Review elevated share links and decide which links should be disabled during rollback.\",\n      count: elevatedShares.length,\n      target: elevatedShares[0]?.fileName ?? null,\n    };\n  }\n\n  return {\n    id: \"share-exposure-ready\",\n    status: \"ready\",\n    category: \"shares\",\n    label: \"Public share exposure\",\n    detail: \"No stale or elevated active public shares were found.\",\n    recommendation:\n      \"Continue exporting share state with release rollback evidence.\",\n    count: 0,\n    target: null,\n  };\n}\n\nfunction getShareAuditRow({\n  activeShareCount,\n  shareAuditEvents,\n}: {\n  activeShareCount: number;\n  shareAuditEvents: AdminRollbackAuditRow[];\n}): AdminRollbackReadinessRow {\n  if (activeShareCount > 0 && shareAuditEvents.length === 0) {\n    return {\n      id: \"share-audit-missing\",\n      status: \"review\",\n      category: \"shares\",\n      label: \"Share rollback audit\",\n      detail: \"Active shares exist, but no share disable/restore audit events are loaded.\",\n      recommendation:\n        \"Exercise share disable/restore controls before release so rollback ownership is proven.\",\n      count: 0,\n      target: null,\n    };\n  }\n\n  return {\n    id: \"share-audit-ready\",\n    status: \"ready\",\n    category: \"shares\",\n    label: \"Share rollback audit\",\n    detail: `${shareAuditEvents.length} share change audit events are available for rollback review.`,\n    recommendation:\n      \"Use the audit log with this report to verify public link rollback actions.\",\n    count: shareAuditEvents.length,\n    target: shareAuditEvents[0]?.targetLabel ?? null,\n  };\n}\n\nfunction getDeploymentRow(\n  deploymentUrls: string[],\n): AdminRollbackReadinessRow {\n  if (deploymentUrls.length === 0) {\n    return {\n      id: \"deployment-link-missing\",\n      status: \"review\",\n      category: \"deployment\",\n      label: \"Vercel deployment link\",\n      detail: \"No production deployment URL is configured in the runtime environment.\",\n      recommendation:\n        \"Set VERCEL_PROJECT_PRODUCTION_URL, BETTER_AUTH_URL, NEXT_PUBLIC_APP_URL, or VERCEL_URL so rollback exports include the current deployment target.\",\n      count: 0,\n      target: null,\n    };\n  }\n\n  return {\n    id: \"deployment-link-ready\",\n    status: \"ready\",\n    category: \"deployment\",\n    label: \"Vercel deployment link\",\n    detail: `${deploymentUrls.length} deployment link is available for release rollback evidence.`,\n    recommendation:\n      \"Pair the deployment link with a release approval snapshot and smoke artifact exports.\",\n    count: deploymentUrls.length,\n    target: deploymentUrls[0] ?? null,\n  };\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-rollback-readiness.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-rollback-readiness-ts-f4aed6a3512f5f60.mjs",
  "kind": "ts",
  "hash": "f4aed6a3512f5f60",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": true,
  "transform_kind": "typescript-helper-runtime",
  "runtime_exports": [
    "getAdminRollbackReadinessReport"
  ],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/features/admin/admin-rollback-readiness.ts",
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
    "static_imports": [],
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
      "getAdminRollbackReadinessReport"
    ],
    "jsx": false,
    "top_level_await": false,
    "full_nextjs_parity": false,
    "analysis_boundary": "Uses vendored Turbopack ECMAScript and selected Next transform behavior as compatibility references while emitting DX-owned source graph receipts."
  },
  "node_modules_required": false
});
export const dxRuntimeModule = Object.freeze({
  transformed: true,
  transformKind: "typescript-helper-runtime",
  exportNames: ["getAdminRollbackReadinessReport"]
});

  | "versions"
  | "shares"
  | "database"
  | "deployment";









export function getAdminRollbackReadinessReport({
  files,
  versions,
  shares,
  auditEvents,
  database,
  deploymentUrls,
  generatedAt = new Date().toISOString(),
  now = Date.now(),
}){
  const rows: AdminRollbackReadinessRow[] = [];
  const activeFiles = files.filter((file) => !file.trashedAt);
  const filesWithoutVersions = activeFiles.filter(
    (file) => file.versionCount === 0,
  );
  const staleShares = shares.filter(
    (share) =>
      !share.disabledAt &&
      Boolean(share.expiresAt && new Date(share.expiresAt).getTime() <= now),
  );
  const elevatedShares = shares.filter(
    (share) =>
      !share.disabledAt &&
      !Boolean(share.expiresAt && new Date(share.expiresAt).getTime() <= now) &&
      (share.allowDownload ||
        share.allowComments ||
        share.accessLevel === "review" ||
        !share.expiresAt),
  );
  const shareAuditEvents = auditEvents.filter((event) =>
    event.action.startsWith("share."),
  );

  rows.push(getDatabaseRow(database));
  rows.push(
    getVersionRow({
      activeFileCount: activeFiles.length,
      versionAnchorCount: versions.length,
      filesWithoutVersions,
    }),
  );
  rows.push(
    getShareExposureRow({
      staleShares,
      elevatedShares,
    }),
  );
  rows.push(
    getShareAuditRow({
      activeShareCount: database.activeShares,
      shareAuditEvents,
    }),
  );
  rows.push(getDeploymentRow(deploymentUrls));

  const readyCount = rows.filter((row) => row.status === "ready").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const status: AdminRollbackReadinessStatus =
    blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready";
  const score = Math.max(0, 100 - blockedCount * 24 - reviewCount * 8);

  return {
    generatedAt,
    status,
    score,
    readyCount,
    reviewCount,
    blockedCount,
    versionAnchorCount: versions.length,
    filesWithoutVersions: filesWithoutVersions.length,
    staleShareCount: staleShares.length,
    elevatedShareCount: elevatedShares.length,
    shareAuditEventCount: shareAuditEvents.length,
    deploymentLinkCount: deploymentUrls.length,
    database,
    deploymentUrls,
    latestVersions: versions.slice(0, 12),
    rows,
  };
}

function getDatabaseRow(
  database: AdminRollbackDatabaseSummary,
): AdminRollbackReadinessRow {
  if (!database.configured) {
    return {
      id: "database-unconfigured",
      status: "blocked",
      category: "database",
      label: "Database state",
      detail: "Turso database URL is not configured for release recovery.",
      recommendation:
        "Configure TURSO_DATABASE_URL before relying on admin rollback exports.",
      count: 0,
      target: null,
    };
  }

  if (database.authTokenRequired && !database.authTokenConfigured) {
    return {
      id: "database-token-missing",
      status: "blocked",
      category: "database",
      label: "Database auth token",
      detail: "Remote libSQL database is configured but its auth token is missing.",
      recommendation:
        "Set TURSO_AUTH_TOKEN in production before approving rollback readiness.",
      count: 0,
      target: database.databaseKind,
    };
  }

  return {
    id: "database-state-ready",
    status: "ready",
    category: "database",
    label: "Database state",
    detail: `${database.users} users, ${database.activeFiles} active files, ${database.activeShares} active shares, and ${database.versions} versions are visible to the rollback report.`,
    recommendation:
      "Export this report with the release approval snapshot so database state has a review anchor.",
    count: database.activeFiles,
    target: database.databaseKind,
  };
}

function getVersionRow({
  activeFileCount,
  versionAnchorCount,
  filesWithoutVersions,
}: {
  activeFileCount: number;
  versionAnchorCount: number;
  filesWithoutVersions: AdminRollbackFileStateRow[];
}): AdminRollbackReadinessRow {
  if (activeFileCount > 0 && versionAnchorCount === 0) {
    return {
      id: "version-anchors-missing",
      status: "blocked",
      category: "versions",
      label: "Version restore anchors",
      detail: "No named design-file versions are available for restore.",
      recommendation:
        "Save named versions for important files before production release.",
      count: 0,
      target: null,
    };
  }

  if (filesWithoutVersions.length > 0) {
    return {
      id: "files-without-versions",
      status: "review",
      category: "versions",
      label: "Files without versions",
      detail: `${filesWithoutVersions.length} active files do not have a named version restore point.`,
      recommendation:
        "Create named versions for active release-critical files or document why they are excluded.",
      count: filesWithoutVersions.length,
      target: filesWithoutVersions[0]?.fileName ?? null,
    };
  }

  return {
    id: "version-anchors-ready",
    status: "ready",
    category: "versions",
    label: "Version restore anchors",
    detail: `${versionAnchorCount} recent named versions are available for restore review.`,
    recommendation:
      "Keep version exports paired with release approvals for design rollback traceability.",
    count: versionAnchorCount,
    target: null,
  };
}

function getShareExposureRow({
  staleShares,
  elevatedShares,
}: {
  staleShares: AdminRollbackShareRow[];
  elevatedShares: AdminRollbackShareRow[];
}): AdminRollbackReadinessRow {
  if (staleShares.length > 0) {
    return {
      id: "stale-shares-block-rollback",
      status: "blocked",
      category: "shares",
      label: "Stale public shares",
      detail: `${staleShares.length} active share links are already expired and need cleanup before release.`,
      recommendation:
        "Disable expired links or refresh expiry windows before exporting rollback readiness.",
      count: staleShares.length,
      target: staleShares[0]?.fileName ?? null,
    };
  }

  if (elevatedShares.length > 0) {
    return {
      id: "elevated-share-review",
      status: "review",
      category: "shares",
      label: "Elevated public shares",
      detail: `${elevatedShares.length} live shares allow downloads, comments, review access, or no expiry.`,
      recommendation:
        "Review elevated share links and decide which links should be disabled during rollback.",
      count: elevatedShares.length,
      target: elevatedShares[0]?.fileName ?? null,
    };
  }

  return {
    id: "share-exposure-ready",
    status: "ready",
    category: "shares",
    label: "Public share exposure",
    detail: "No stale or elevated active public shares were found.",
    recommendation:
      "Continue exporting share state with release rollback evidence.",
    count: 0,
    target: null,
  };
}

function getShareAuditRow({
  activeShareCount,
  shareAuditEvents,
}: {
  activeShareCount: number;
  shareAuditEvents: AdminRollbackAuditRow[];
}): AdminRollbackReadinessRow {
  if (activeShareCount > 0 && shareAuditEvents.length === 0) {
    return {
      id: "share-audit-missing",
      status: "review",
      category: "shares",
      label: "Share rollback audit",
      detail: "Active shares exist, but no share disable/restore audit events are loaded.",
      recommendation:
        "Exercise share disable/restore controls before release so rollback ownership is proven.",
      count: 0,
      target: null,
    };
  }

  return {
    id: "share-audit-ready",
    status: "ready",
    category: "shares",
    label: "Share rollback audit",
    detail: `${shareAuditEvents.length} share change audit events are available for rollback review.`,
    recommendation:
      "Use the audit log with this report to verify public link rollback actions.",
    count: shareAuditEvents.length,
    target: shareAuditEvents[0]?.targetLabel ?? null,
  };
}

function getDeploymentRow(
  deploymentUrls: string[],
): AdminRollbackReadinessRow {
  if (deploymentUrls.length === 0) {
    return {
      id: "deployment-link-missing",
      status: "review",
      category: "deployment",
      label: "Vercel deployment link",
      detail: "No production deployment URL is configured in the runtime environment.",
      recommendation:
        "Set VERCEL_PROJECT_PRODUCTION_URL, BETTER_AUTH_URL, NEXT_PUBLIC_APP_URL, or VERCEL_URL so rollback exports include the current deployment target.",
      count: 0,
      target: null,
    };
  }

  return {
    id: "deployment-link-ready",
    status: "ready",
    category: "deployment",
    label: "Vercel deployment link",
    detail: `${deploymentUrls.length} deployment link is available for release rollback evidence.`,
    recommendation:
      "Pair the deployment link with a release approval snapshot and smoke artifact exports.",
    count: deploymentUrls.length,
    target: deploymentUrls[0] ?? null,
  };
}
export const dxRuntimeExports = Object.freeze({ getAdminRollbackReadinessReport });
export const dxLinkedDependencies = Object.freeze([]);
export default dxSourceModule;
