import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-db-client-ts-b11a4f30c3f08fac.mjs";
import { dxSourceModule as dep1, dxRuntimeExports as dep1Runtime } from "./src-db-schema-ts-24b183fcc50e5ffb.mjs";
import { dxSourceModule as dep2, dxRuntimeExports as dep2Runtime } from "./src-features-admin-admin-permissions-ts-495c7e44a1e970ef.mjs";
import { dxSourceModule as dep3, dxRuntimeExports as dep3Runtime } from "./src-features-admin-admin-role-change-approval-ts-323e96da34f25655.mjs";
import { dxSourceModule as dep4, dxRuntimeExports as dep4Runtime } from "./src-lib-auth-ts-de3814526e1d4ec2.mjs";
import { dxSourceModule as dep5, dxRuntimeExports as dep5Runtime } from "./src-lib-forge-db-drizzle-orm-ts-03b4cc666c52123e.mjs";
import { dxSourceModule as dep6, dxRuntimeExports as dep6Runtime } from "./src-lib-forge-utils-nanoid-ts-eb21cd53da2dc635.mjs";
import { dxSourceModule as dep7, dxRuntimeExports as dep7Runtime } from "./src-lib-www-cache-ts-6cfaa52cf0643257.mjs";
import { dxSourceModule as dep8, dxRuntimeExports as dep8Runtime } from "./src-lib-forge-utils-zod-ts-ec597ab057171bf2.mjs";
export const dxSourceText = "\"use server\";\n\nimport { and, desc, eq, inArray } from \"drizzle-orm\";\nimport { headers } from \"next/headers\";\nimport { revalidatePath } from \"next/cache\";\nimport { nanoid } from \"nanoid\";\nimport { z } from \"zod\";\nimport { getDb } from \"@/db/client\";\nimport {\n  adminAuditEvent,\n  designFile,\n  designFileCollaborator,\n  user,\n} from \"@/db/schema\";\nimport { auth } from \"@/lib/auth\";\nimport { isAdminEmail } from \"@/features/admin/admin-permissions\";\nimport {\n  ROLE_CHANGE_APPROVE_ACTION,\n  ROLE_CHANGE_REJECT_ACTION,\n  createRoleChangeDecisionMetadata,\n  getRoleChangeApprovalQueue,\n  getRoleChangeLabel,\n  roleChangeApprovalActions,\n  type RoleChangeApprovalRequest,\n} from \"@/features/admin/admin-role-change-approval\";\n\nconst roleChangeDecisionSchema = z.object({\n  requestId: z.string().min(1),\n  decision: z.enum([\"approve\", \"reject\"]),\n  reviewerNote: z.string().trim().max(1000).optional(),\n});\n\nconst bulkRoleChangeDecisionSchema = z.object({\n  requestIds: z.array(z.string().min(1)).min(1).max(25),\n  decision: z.enum([\"approve\", \"reject\"]),\n  reviewerNote: z.string().trim().max(1000).optional(),\n});\n\nexport async function decideAdminRoleChangeRequest(input: unknown) {\n  const adminUser = await getRequiredAdminUser();\n  const parsed = roleChangeDecisionSchema.parse(input);\n  const db = getDb();\n  const request = await getPendingRoleChangeRequest(db, parsed.requestId);\n\n  if (!request) {\n    throw new Error(\"Role-change request is no longer pending.\");\n  }\n\n  await applyRoleChangeDecision({\n    adminUser,\n    db,\n    decision: parsed.decision,\n    request,\n    reviewerNote: parsed.reviewerNote ?? null,\n  });\n\n  revalidatePath(\"/\");\n  revalidatePath(\"/dashboard\");\n  return { ok: true, decided: 1, skipped: 0 };\n}\n\nexport async function bulkDecideAdminRoleChangeRequests(input: unknown) {\n  const adminUser = await getRequiredAdminUser();\n  const parsed = bulkRoleChangeDecisionSchema.parse(input);\n  const db = getDb();\n  let decided = 0;\n  let skipped = 0;\n\n  for (const requestId of new Set(parsed.requestIds)) {\n    const request = await getPendingRoleChangeRequest(db, requestId);\n\n    if (!request) {\n      skipped += 1;\n      continue;\n    }\n\n    await applyRoleChangeDecision({\n      adminUser,\n      db,\n      decision: parsed.decision,\n      request,\n      reviewerNote: parsed.reviewerNote ?? null,\n    });\n    decided += 1;\n  }\n\n  revalidatePath(\"/\");\n  revalidatePath(\"/dashboard\");\n  return { ok: true, decided, skipped };\n}\n\nasync function getRequiredAdminUser() {\n  const sessionData = await auth.api.getSession({\n    headers: await headers(),\n  });\n\n  if (!sessionData) {\n    throw new Error(\"Authentication is required.\");\n  }\n\n  if (!isAdminEmail(sessionData.user.email)) {\n    throw new Error(\"Administrator access is required.\");\n  }\n\n  return sessionData.user;\n}\n\nasync function getPendingRoleChangeRequest(\n  db: ReturnType<typeof getDb>,\n  requestId: string,\n) {\n  const rows = await db\n    .select({\n      actorEmail: adminAuditEvent.actorEmail,\n      action: adminAuditEvent.action,\n      metadata: adminAuditEvent.metadata,\n      createdAt: adminAuditEvent.createdAt,\n    })\n    .from(adminAuditEvent)\n    .where(inArray(adminAuditEvent.action, [...roleChangeApprovalActions]))\n    .orderBy(desc(adminAuditEvent.createdAt))\n    .limit(500);\n  const queue = getRoleChangeApprovalQueue(rows);\n  const request = queue.requests.find((row) => row.requestId === requestId);\n\n  return request?.status === \"pending\" ? request : null;\n}\n\nasync function applyRoleChangeDecision({\n  adminUser,\n  db,\n  decision,\n  request,\n  reviewerNote,\n}: {\n  adminUser: { id: string; email: string };\n  db: ReturnType<typeof getDb>;\n  decision: \"approve\" | \"reject\";\n  request: RoleChangeApprovalRequest;\n  reviewerNote: string | null;\n}) {\n  const [targetUser] = await db\n    .select({ id: user.id })\n    .from(user)\n    .where(eq(user.id, request.targetUserId))\n    .limit(1);\n  const [file] = await db\n    .select({ id: designFile.id })\n    .from(designFile)\n    .where(eq(designFile.id, request.fileId))\n    .limit(1);\n\n  if (!targetUser || !file) {\n    await recordRoleChangeDecisionAudit({\n      adminUser,\n      db,\n      decision: \"reject\",\n      request,\n      reviewerNote:\n        reviewerNote ?? \"Request target no longer exists at review time.\",\n    });\n    return;\n  }\n\n  if (decision === \"approve\") {\n    await applyApprovedRoleChange({ adminUser, db, request });\n  }\n\n  await recordRoleChangeDecisionAudit({\n    adminUser,\n    db,\n    decision,\n    request,\n    reviewerNote,\n  });\n}\n\nasync function applyApprovedRoleChange({\n  adminUser,\n  db,\n  request,\n}: {\n  adminUser: { id: string };\n  db: ReturnType<typeof getDb>;\n  request: RoleChangeApprovalRequest;\n}) {\n  const [existing] = await db\n    .select({ id: designFileCollaborator.id })\n    .from(designFileCollaborator)\n    .where(\n      and(\n        eq(designFileCollaborator.fileId, request.fileId),\n        eq(designFileCollaborator.userId, request.targetUserId),\n      ),\n    )\n    .limit(1);\n\n  if (existing) {\n    await db\n      .update(designFileCollaborator)\n      .set({ role: request.requestedRole, updatedAt: new Date() })\n      .where(eq(designFileCollaborator.id, existing.id));\n    return;\n  }\n\n  await db.insert(designFileCollaborator).values({\n    id: nanoid(),\n    fileId: request.fileId,\n    userId: request.targetUserId,\n    invitedById: request.requesterId || adminUser.id,\n    role: request.requestedRole,\n    createdAt: new Date(),\n    updatedAt: new Date(),\n  });\n}\n\nasync function recordRoleChangeDecisionAudit({\n  adminUser,\n  db,\n  decision,\n  request,\n  reviewerNote,\n}: {\n  adminUser: { id: string; email: string };\n  db: ReturnType<typeof getDb>;\n  decision: \"approve\" | \"reject\";\n  request: RoleChangeApprovalRequest;\n  reviewerNote: string | null;\n}) {\n  await db.insert(adminAuditEvent).values({\n    id: nanoid(),\n    actorId: adminUser.id,\n    actorEmail: adminUser.email,\n    action:\n      decision === \"approve\"\n        ? ROLE_CHANGE_APPROVE_ACTION\n        : ROLE_CHANGE_REJECT_ACTION,\n    targetType: \"collaborator\",\n    targetId: request.requestId,\n    targetLabel: getRoleChangeLabel(request),\n    metadata: createRoleChangeDecisionMetadata({\n      decision: decision === \"approve\" ? \"approved\" : \"rejected\",\n      request,\n      reviewerEmail: adminUser.email,\n      reviewerNote,\n    }),\n    createdAt: new Date(),\n  });\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-role-change-actions.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-role-change-actions-ts-20f115cc1bb47ec2.mjs",
  "kind": "ts",
  "hash": "20f115cc1bb47ec2",
  "dependencies": [
    {
      "specifier": "@/db/client",
      "resolved_path": "src/db/client.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-db-client-ts-b11a4f30c3f08fac.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/db/schema",
      "resolved_path": "src/db/schema.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-db-schema-ts-24b183fcc50e5ffb.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/admin/admin-permissions",
      "resolved_path": "src/features/admin/admin-permissions.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-permissions-ts-495c7e44a1e970ef.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/admin/admin-role-change-approval",
      "resolved_path": "src/features/admin/admin-role-change-approval.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-role-change-approval-ts-323e96da34f25655.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/lib/auth",
      "resolved_path": "src/lib/auth.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-lib-auth-ts-de3814526e1d4ec2.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "drizzle-orm",
      "resolved_path": "src/lib/forge/db/drizzle-orm.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-lib-forge-db-drizzle-orm-ts-03b4cc666c52123e.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "nanoid",
      "resolved_path": "src/lib/forge/utils/nanoid.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-lib-forge-utils-nanoid-ts-eb21cd53da2dc635.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "next/cache",
      "resolved_path": "src/lib/www/cache.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-lib-www-cache-ts-6cfaa52cf0643257.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "next/headers",
      "resolved_path": null,
      "chunk_output": null,
      "kind": "compiler-intrinsic",
      "resolver_source": "compiler-intrinsic",
      "node_modules_required": false
    },
    {
      "specifier": "zod",
      "resolved_path": "src/lib/forge/utils/zod.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-lib-forge-utils-zod-ts-ec597ab057171bf2.mjs",
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
    "source_path": "src/features/admin/admin-role-change-actions.ts",
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
    "directives": [
      {
        "value": "use server",
        "scope": "module-prologue",
        "line": 1,
        "column": 1
      }
    ],
    "static_imports": [
      {
        "specifier": "drizzle-orm",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "next/headers",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "next/cache",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "nanoid",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "zod",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/db/client",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/db/schema",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/lib/auth",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/admin/admin-permissions",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/admin/admin-role-change-approval",
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
    "export_names": [],
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
export const dxLinkedDependencies = Object.freeze([dep0, dep1, dep2, dep3, dep4, dep5, dep6, dep7, dep8]);
export default dxSourceModule;
