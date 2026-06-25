import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-features-admin-admin-workspace-access-budget-utils-ts-287335243048509d.mjs";
export const dxSourceText = "import type {\n  AdminWorkspaceAccessBudgetCollaborator,\n  AdminWorkspaceAccessBudgetFile,\n  AdminWorkspaceAccessBudgetUser,\n  AdminWorkspaceAccessDomain,\n} from \"@/features/admin/admin-workspace-access-budget-types\";\nimport {\n  accessBudgetStatusWeight,\n  getEmailDomain,\n  getLatestIso,\n  getMostCommonDomain,\n  isElevatedRole,\n} from \"@/features/admin/admin-workspace-access-budget-utils\";\n\nexport function getTrustedAccessBudgetDomains(\n  adminEmails: string[],\n  users: AdminWorkspaceAccessBudgetUser[],\n  files: AdminWorkspaceAccessBudgetFile[],\n) {\n  const domains = new Set(adminEmails.map(getEmailDomain).filter(Boolean));\n\n  if (domains.size === 0) {\n    const fallback = getMostCommonDomain([\n      ...users.map((user) => user.email),\n      ...files.map((file) => file.ownerEmail),\n    ]);\n\n    if (fallback) {\n      domains.add(fallback);\n    }\n  }\n\n  return [...domains].sort();\n}\n\nexport function getAccessBudgetExternalDomains({\n  activeCollaborators,\n  files,\n  trustedDomains,\n  users,\n}: {\n  activeCollaborators: AdminWorkspaceAccessBudgetCollaborator[];\n  files: AdminWorkspaceAccessBudgetFile[];\n  trustedDomains: string[];\n  users: AdminWorkspaceAccessBudgetUser[];\n}) {\n  const trusted = new Set(trustedDomains);\n  const byDomain = new Map<string, AdminWorkspaceAccessDomain>();\n\n  for (const domain of users.map((row) => getEmailDomain(row.email))) {\n    if (domain && !trusted.has(domain)) {\n      updateDomain(byDomain, domain, { userCount: 1 });\n    }\n  }\n\n  for (const file of files) {\n    const domain = getEmailDomain(file.ownerEmail);\n\n    if (domain && !trusted.has(domain)) {\n      updateDomain(byDomain, domain, {\n        latestAt: file.updatedAt,\n        ownerFileCount: 1,\n      });\n    }\n  }\n\n  for (const collaborator of activeCollaborators) {\n    const domain = getEmailDomain(collaborator.collaboratorEmail);\n\n    if (domain && !trusted.has(domain)) {\n      updateDomain(byDomain, domain, {\n        collaboratorCount: 1,\n        elevatedCollaboratorCount: isElevatedRole(collaborator.role) ? 1 : 0,\n        latestAt: collaborator.updatedAt,\n      });\n    }\n  }\n\n  return [...byDomain.values()]\n    .map((domain): AdminWorkspaceAccessDomain => ({\n      ...domain,\n      status:\n        domain.elevatedCollaboratorCount > 0 || domain.ownerFileCount > 0\n          ? \"blocked\"\n          : \"review\",\n    }))\n    .sort(\n      (left, right) =>\n        accessBudgetStatusWeight[left.status] -\n          accessBudgetStatusWeight[right.status] ||\n        right.elevatedCollaboratorCount - left.elevatedCollaboratorCount ||\n        right.collaboratorCount - left.collaboratorCount ||\n        left.domain.localeCompare(right.domain),\n    );\n}\n\nfunction updateDomain(\n  byDomain: Map<string, AdminWorkspaceAccessDomain>,\n  domain: string,\n  patch: Partial<Omit<AdminWorkspaceAccessDomain, \"domain\" | \"status\">>,\n) {\n  const current =\n    byDomain.get(domain) ??\n    ({\n      domain,\n      status: \"review\",\n      userCount: 0,\n      collaboratorCount: 0,\n      ownerFileCount: 0,\n      elevatedCollaboratorCount: 0,\n      latestAt: null,\n    } satisfies AdminWorkspaceAccessDomain);\n\n  byDomain.set(domain, {\n    ...current,\n    collaboratorCount: current.collaboratorCount + (patch.collaboratorCount ?? 0),\n    elevatedCollaboratorCount:\n      current.elevatedCollaboratorCount +\n      (patch.elevatedCollaboratorCount ?? 0),\n    latestAt: getLatestIso(current.latestAt, patch.latestAt ?? null),\n    ownerFileCount: current.ownerFileCount + (patch.ownerFileCount ?? 0),\n    userCount: current.userCount + (patch.userCount ?? 0),\n  });\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-workspace-access-budget-domains.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-workspace-access-budget-domains-ts-d096f3da2de42987.mjs",
  "kind": "ts",
  "hash": "d096f3da2de42987",
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
    "source_path": "src/features/admin/admin-workspace-access-budget-domains.ts",
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
      "getTrustedAccessBudgetDomains",
      "getAccessBudgetExternalDomains"
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
