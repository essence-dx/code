import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-features-files-permissions-ts-619c9a7eeb3a33f6.mjs";
export const dxSourceText = "import type { AdminAuditMetadata } from \"@/db/schema\";\nimport type { AdminAuditRow } from \"@/features/admin/admin-data\";\nimport {\n  collaboratorRoleLabels,\n  type CollaboratorRole,\n} from \"@/features/files/permissions\";\n\nexport const ROLE_CHANGE_REQUEST_ACTION = \"collaborator.role_change.request\";\nexport const ROLE_CHANGE_APPROVE_ACTION = \"collaborator.role_change.approve\";\nexport const ROLE_CHANGE_REJECT_ACTION = \"collaborator.role_change.reject\";\n\nexport const roleChangeApprovalActions = [\n  ROLE_CHANGE_REQUEST_ACTION,\n  ROLE_CHANGE_APPROVE_ACTION,\n  ROLE_CHANGE_REJECT_ACTION,\n] as const;\n\nexport type RoleChangeAccessRole = CollaboratorRole | \"none\";\nexport type RoleChangeApprovalStatus = \"pending\" | \"approved\" | \"rejected\";\n\nexport type RoleChangeApprovalRequest = {\n  requestId: string;\n  requesterId: string;\n  requesterEmail: string;\n  fileId: string;\n  fileName: string;\n  targetUserId: string;\n  targetEmail: string;\n  currentRole: RoleChangeAccessRole;\n  requestedRole: CollaboratorRole;\n  requesterNote: string | null;\n  reviewerEmail: string | null;\n  reviewerNote: string | null;\n  status: RoleChangeApprovalStatus;\n  createdAt: string;\n  decidedAt: string | null;\n};\n\nexport type RoleChangeApprovalQueue = {\n  generatedAt: string;\n  pendingCount: number;\n  approvedCount: number;\n  rejectedCount: number;\n  requests: RoleChangeApprovalRequest[];\n};\n\nconst roleRank: Record<RoleChangeAccessRole, number> = {\n  none: 0,\n  viewer: 1,\n  commenter: 2,\n  editor: 3,\n};\n\nexport function isSensitiveRoleChange({\n  currentRole,\n  requestedRole,\n}: {\n  currentRole: RoleChangeAccessRole;\n  requestedRole: CollaboratorRole;\n}) {\n  return roleRank[requestedRole] > roleRank[currentRole] && requestedRole !== \"viewer\";\n}\n\nexport function createRoleChangeRequestMetadata({\n  currentRole,\n  fileId,\n  fileName,\n  requestedRole,\n  requesterEmail,\n  requesterId,\n  requesterNote,\n  requestId,\n  targetEmail,\n  targetUserId,\n}: Omit<\n  RoleChangeApprovalRequest,\n  \"createdAt\" | \"decidedAt\" | \"reviewerEmail\" | \"reviewerNote\" | \"status\"\n>): AdminAuditMetadata {\n  return {\n    requestId,\n    requesterId,\n    requesterEmail,\n    fileId,\n    fileName,\n    targetUserId,\n    targetEmail,\n    currentRole,\n    requestedRole,\n    requesterNote,\n  };\n}\n\nexport function createRoleChangeDecisionMetadata({\n  decision,\n  request,\n  reviewerEmail,\n  reviewerNote,\n}: {\n  decision: Exclude<RoleChangeApprovalStatus, \"pending\">;\n  request: RoleChangeApprovalRequest;\n  reviewerEmail: string;\n  reviewerNote: string | null;\n}): AdminAuditMetadata {\n  return {\n    requestId: request.requestId,\n    decision,\n    reviewerEmail,\n    reviewerNote,\n    fileId: request.fileId,\n    fileName: request.fileName,\n    targetUserId: request.targetUserId,\n    targetEmail: request.targetEmail,\n    currentRole: request.currentRole,\n    requestedRole: request.requestedRole,\n  };\n}\n\nexport function getRoleChangeApprovalQueue(\n  events: Array<\n    Omit<\n      Pick<AdminAuditRow, \"action\" | \"actorEmail\" | \"createdAt\" | \"metadata\">,\n      \"createdAt\"\n    > & { createdAt: string | Date }\n  >,\n  generatedAt = new Date().toISOString(),\n): RoleChangeApprovalQueue {\n  const requests = new Map<string, RoleChangeApprovalRequest>();\n  const decisions = new Map<\n    string,\n    {\n      action: typeof ROLE_CHANGE_APPROVE_ACTION | typeof ROLE_CHANGE_REJECT_ACTION;\n      actorEmail: string;\n      createdAt: string;\n      metadata: AdminAuditMetadata;\n    }\n  >();\n\n  for (const event of events) {\n    if (event.action === ROLE_CHANGE_REQUEST_ACTION) {\n      const request = parseRoleChangeRequestEvent(event);\n\n      if (request) {\n        requests.set(request.requestId, request);\n      }\n    }\n\n    if (\n      event.action === ROLE_CHANGE_APPROVE_ACTION ||\n      event.action === ROLE_CHANGE_REJECT_ACTION\n    ) {\n      const requestId = readString(event.metadata.requestId, \"\");\n      const previous = decisions.get(requestId);\n\n      if (\n        requestId &&\n        (!previous ||\n          new Date(event.createdAt).getTime() >\n            new Date(previous.createdAt).getTime())\n      ) {\n        decisions.set(requestId, {\n          action: event.action,\n          actorEmail: event.actorEmail,\n          createdAt: toIsoString(event.createdAt),\n          metadata: event.metadata,\n        });\n      }\n    }\n  }\n\n  const resolved = [...requests.values()].map((request) => {\n    const decision = decisions.get(request.requestId);\n\n    if (!decision) {\n      return request;\n    }\n\n    return {\n      ...request,\n      status:\n        decision.action === ROLE_CHANGE_APPROVE_ACTION ? \"approved\" : \"rejected\",\n      reviewerEmail: readString(decision.metadata.reviewerEmail, decision.actorEmail),\n      reviewerNote: readNullableString(decision.metadata.reviewerNote),\n      decidedAt: decision.createdAt,\n    } satisfies RoleChangeApprovalRequest;\n  });\n\n  return {\n    generatedAt,\n    pendingCount: resolved.filter((request) => request.status === \"pending\").length,\n    approvedCount: resolved.filter((request) => request.status === \"approved\").length,\n    rejectedCount: resolved.filter((request) => request.status === \"rejected\").length,\n    requests: resolved.sort(\n      (left, right) =>\n        statusWeight(left.status) - statusWeight(right.status) ||\n        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),\n    ),\n  };\n}\n\nexport function getRoleChangeLabel(request: RoleChangeApprovalRequest) {\n  return `${request.targetEmail}: ${formatRole(request.currentRole)} to ${formatRole(\n    request.requestedRole,\n  )}`;\n}\n\nexport function formatRole(role: RoleChangeAccessRole) {\n  return role === \"none\" ? \"No access\" : collaboratorRoleLabels[role];\n}\n\nfunction parseRoleChangeRequestEvent(\n  event: Pick<AdminAuditRow, \"actorEmail\" | \"metadata\"> & {\n    createdAt: string | Date;\n  },\n): RoleChangeApprovalRequest | null {\n  const currentRole = readAccessRole(event.metadata.currentRole);\n  const requestedRole = readCollaboratorRole(event.metadata.requestedRole);\n  const requestId = readString(event.metadata.requestId, \"\");\n  const fileId = readString(event.metadata.fileId, \"\");\n  const targetUserId = readString(event.metadata.targetUserId, \"\");\n\n  if (!requestId || !fileId || !targetUserId || !requestedRole) {\n    return null;\n  }\n\n  return {\n    requestId,\n    requesterId: readString(event.metadata.requesterId, \"\"),\n    requesterEmail: readString(event.metadata.requesterEmail, event.actorEmail),\n    fileId,\n    fileName: readString(event.metadata.fileName, \"Unknown file\"),\n    targetUserId,\n    targetEmail: readString(event.metadata.targetEmail, \"Unknown user\"),\n    currentRole,\n    requestedRole,\n    requesterNote: readNullableString(event.metadata.requesterNote),\n    reviewerEmail: null,\n    reviewerNote: null,\n    status: \"pending\",\n    createdAt: toIsoString(event.createdAt),\n    decidedAt: null,\n  };\n}\n\nfunction statusWeight(status: RoleChangeApprovalStatus) {\n  if (status === \"pending\") {\n    return 0;\n  }\n\n  return status === \"approved\" ? 1 : 2;\n}\n\nfunction readAccessRole(value: unknown): RoleChangeAccessRole {\n  if (\n    value === \"none\" ||\n    value === \"viewer\" ||\n    value === \"commenter\" ||\n    value === \"editor\"\n  ) {\n    return value;\n  }\n\n  return \"none\";\n}\n\nfunction readCollaboratorRole(value: unknown): CollaboratorRole | null {\n  if (value === \"viewer\" || value === \"commenter\" || value === \"editor\") {\n    return value;\n  }\n\n  return null;\n}\n\nfunction readString(value: unknown, fallback: string) {\n  return typeof value === \"string\" && value.length > 0 ? value : fallback;\n}\n\nfunction readNullableString(value: unknown) {\n  return typeof value === \"string\" && value.length > 0 ? value : null;\n}\n\nfunction toIsoString(value: string | Date) {\n  return value instanceof Date ? value.toISOString() : value;\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-role-change-approval.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-role-change-approval-ts-323e96da34f25655.mjs",
  "kind": "ts",
  "hash": "323e96da34f25655",
  "dependencies": [
    {
      "specifier": "@/features/files/permissions",
      "resolved_path": "src/features/files/permissions.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-files-permissions-ts-619c9a7eeb3a33f6.mjs",
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
    "source_path": "src/features/admin/admin-role-change-approval.ts",
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
        "specifier": "@/features/admin/admin-data",
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
      "isSensitiveRoleChange",
      "createRoleChangeRequestMetadata",
      "createRoleChangeDecisionMetadata",
      "getRoleChangeApprovalQueue",
      "getRoleChangeLabel",
      "formatRole",
      "ROLE_CHANGE_REQUEST_ACTION",
      "ROLE_CHANGE_APPROVE_ACTION",
      "ROLE_CHANGE_REJECT_ACTION",
      "roleChangeApprovalActions"
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
