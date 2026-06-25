import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-features-admin-admin-workspace-access-budget-domains-ts-d096f3da2de42987.mjs";
import { dxSourceModule as dep1, dxRuntimeExports as dep1Runtime } from "./src-features-admin-admin-workspace-access-budget-rows-ts-d0ecbf93e7009ea2.mjs";
import { dxSourceModule as dep2, dxRuntimeExports as dep2Runtime } from "./src-features-admin-admin-workspace-access-budget-utils-ts-287335243048509d.mjs";
export const dxSourceText = "import {\n  getAccessBudgetExternalDomains,\n  getTrustedAccessBudgetDomains,\n} from \"@/features/admin/admin-workspace-access-budget-domains\";\nimport {\n  getAccessBudgetCommands,\n  getAccessBudgetRoleBudgets,\n  getAccessBudgetRows,\n} from \"@/features/admin/admin-workspace-access-budget-rows\";\nimport type {\n  AdminWorkspaceAccessBudgetInput,\n  AdminWorkspaceAccessBudgetReport,\n  AdminWorkspaceAccessBudgetThresholds,\n} from \"@/features/admin/admin-workspace-access-budget-types\";\nimport { isElevatedRole } from \"@/features/admin/admin-workspace-access-budget-utils\";\n\nexport type {\n  AdminWorkspaceAccessBudgetCategory,\n  AdminWorkspaceAccessBudgetCollaborator,\n  AdminWorkspaceAccessBudgetFile,\n  AdminWorkspaceAccessBudgetInput,\n  AdminWorkspaceAccessBudgetReport,\n  AdminWorkspaceAccessBudgetRow,\n  AdminWorkspaceAccessBudgetSession,\n  AdminWorkspaceAccessBudgetShare,\n  AdminWorkspaceAccessBudgetStatus,\n  AdminWorkspaceAccessBudgetThresholds,\n  AdminWorkspaceAccessBudgetUser,\n  AdminWorkspaceAccessDomain,\n  AdminWorkspaceAccessRoleBudget,\n} from \"@/features/admin/admin-workspace-access-budget-types\";\n\nconst defaultThresholds: AdminWorkspaceAccessBudgetThresholds = {\n  elevatedSeatLimit: 25,\n  externalDomainLimit: 2,\n  staleCollaboratorDays: 90,\n};\n\nexport function getAdminWorkspaceAccessBudgetReport({\n  adminEmails,\n  budgets,\n  collaborators,\n  files,\n  generatedAt = new Date().toISOString(),\n  now = Date.now(),\n  roleChangePendingCount,\n  sessions,\n  shares,\n  users,\n  workspacePolicy,\n}: AdminWorkspaceAccessBudgetInput): AdminWorkspaceAccessBudgetReport {\n  const thresholds = { ...defaultThresholds, ...budgets };\n  const trustedDomains = getTrustedAccessBudgetDomains(adminEmails, users, files);\n  const activeFiles = files.filter((file) => !file.trashedAt);\n  const activeFileIds = new Set(activeFiles.map((file) => file.id));\n  const activeCollaborators = collaborators.filter((collaborator) =>\n    activeFileIds.has(collaborator.fileId),\n  );\n  const activeShares = shares.filter((share) => !share.disabledAt);\n  const domains = getAccessBudgetExternalDomains({\n    activeCollaborators,\n    files: activeFiles,\n    trustedDomains,\n    users,\n  });\n  const elevatedCollaborators = activeCollaborators.filter((collaborator) =>\n    isElevatedRole(collaborator.role),\n  );\n  const staleSince = now - thresholds.staleCollaboratorDays * 24 * 60 * 60 * 1000;\n  const staleCollaborators = activeCollaborators.filter(\n    (collaborator) => new Date(collaborator.updatedAt).getTime() < staleSince,\n  );\n  const noExpiryShares = activeShares.filter((share) => !share.expiresAt);\n  const downloadShares = activeShares.filter((share) => share.allowDownload);\n  const expiredActiveShares = activeShares.filter((share) =>\n    share.expiresAt ? new Date(share.expiresAt).getTime() < now : false,\n  );\n  const staleSessions = sessions.filter((session) => {\n    const staleSessionMs =\n      workspacePolicy.settings.staleSessionDays * 24 * 60 * 60 * 1000;\n\n    return new Date(session.updatedAt).getTime() < now - staleSessionMs;\n  });\n  const rows = getAccessBudgetRows({\n    domains,\n    downloadShares,\n    elevatedCollaborators,\n    expiredActiveShares,\n    files: activeFiles,\n    noExpiryShares,\n    roleChangePendingCount,\n    staleCollaborators,\n    staleSessions,\n    thresholds,\n    users,\n    workspacePolicy,\n  });\n  const blockedCount = rows.filter((row) => row.status === \"blocked\").length;\n  const reviewCount = rows.filter((row) => row.status === \"review\").length;\n\n  return {\n    generatedAt,\n    status: blockedCount > 0 ? \"blocked\" : reviewCount > 0 ? \"review\" : \"ready\",\n    score: Math.max(0, 100 - blockedCount * 18 - reviewCount * 6),\n    trustedDomains,\n    userCount: users.length,\n    verifiedUserCount: users.filter((user) => user.emailVerified).length,\n    unverifiedUserCount: users.filter((user) => !user.emailVerified).length,\n    collaboratorCount: activeCollaborators.length,\n    elevatedCollaboratorCount: elevatedCollaborators.length,\n    staleCollaboratorCount: staleCollaborators.length,\n    staleSessionCount: staleSessions.length,\n    externalDomainCount: domains.length,\n    riskyShareCount:\n      noExpiryShares.length + downloadShares.length + expiredActiveShares.length,\n    noExpiryShareCount: noExpiryShares.length,\n    downloadShareCount: downloadShares.length,\n    expiredActiveShareCount: expiredActiveShares.length,\n    pendingRoleChangeCount: roleChangePendingCount,\n    thresholds,\n    roleBudgets: getAccessBudgetRoleBudgets(activeCollaborators, thresholds),\n    domains,\n    rows,\n    commands: getAccessBudgetCommands(),\n  };\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-workspace-access-budget.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-workspace-access-budget-ts-299211dd64c03384.mjs",
  "kind": "ts",
  "hash": "299211dd64c03384",
  "dependencies": [
    {
      "specifier": "@/features/admin/admin-workspace-access-budget-domains",
      "resolved_path": "src/features/admin/admin-workspace-access-budget-domains.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-workspace-access-budget-domains-ts-d096f3da2de42987.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/admin/admin-workspace-access-budget-rows",
      "resolved_path": "src/features/admin/admin-workspace-access-budget-rows.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-workspace-access-budget-rows-ts-d0ecbf93e7009ea2.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
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
    "source_path": "src/features/admin/admin-workspace-access-budget.ts",
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
        "specifier": "@/features/admin/admin-workspace-access-budget-domains",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/admin/admin-workspace-access-budget-rows",
        "side_effect_only": false,
        "type_only": false
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
      "getAdminWorkspaceAccessBudgetReport"
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
export const dxLinkedDependencies = Object.freeze([dep0, dep1, dep2]);
export default dxSourceModule;
