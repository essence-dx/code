import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-db-client-ts-b11a4f30c3f08fac.mjs";
import { dxSourceModule as dep1, dxRuntimeExports as dep1Runtime } from "./src-db-schema-ts-24b183fcc50e5ffb.mjs";
import { dxSourceModule as dep2, dxRuntimeExports as dep2Runtime } from "./src-features-files-permissions-ts-619c9a7eeb3a33f6.mjs";
import { dxSourceModule as dep3, dxRuntimeExports as dep3Runtime } from "./src-lib-forge-db-drizzle-orm-ts-03b4cc666c52123e.mjs";
export const dxSourceText = "import { and, eq } from \"drizzle-orm\";\nimport { getDb } from \"@/db/client\";\nimport { designFile, designFileCollaborator } from \"@/db/schema\";\nimport {\n  normalizeCollaboratorRole,\n  type FileAccessRole,\n} from \"@/features/files/permissions\";\n\nexport async function getFileAccessForUser(fileId: string, userId: string) {\n  const db = getDb();\n  const [ownedFile] = await db\n    .select()\n    .from(designFile)\n    .where(\n      and(eq(designFile.id, fileId), eq(designFile.ownerId, userId)),\n    )\n    .limit(1);\n\n  if (ownedFile) {\n    return {\n      file: ownedFile,\n      role: \"owner\" as const,\n    };\n  }\n\n  const [collaboratorFile] = await db\n    .select({\n      id: designFile.id,\n      ownerId: designFile.ownerId,\n      name: designFile.name,\n      document: designFile.document,\n      scope: designFile.scope,\n      teamName: designFile.teamName,\n      projectName: designFile.projectName,\n      favorite: designFile.favorite,\n      lastOpenedAt: designFile.lastOpenedAt,\n      trashedAt: designFile.trashedAt,\n      createdAt: designFile.createdAt,\n      updatedAt: designFile.updatedAt,\n      role: designFileCollaborator.role,\n    })\n    .from(designFileCollaborator)\n    .innerJoin(designFile, eq(designFileCollaborator.fileId, designFile.id))\n    .where(\n      and(\n        eq(designFileCollaborator.fileId, fileId),\n        eq(designFileCollaborator.userId, userId),\n      ),\n    )\n    .limit(1);\n\n  if (!collaboratorFile) {\n    return null;\n  }\n\n  const { role, ...file } = collaboratorFile;\n\n  return {\n    file,\n    role: normalizeCollaboratorRole(role),\n  };\n}\n\nexport async function requireFileAccess(\n  fileId: string,\n  userId: string,\n  predicate: (role: FileAccessRole) => boolean,\n  errorMessage: string,\n) {\n  const access = await getFileAccessForUser(fileId, userId);\n\n  if (!access || access.file.trashedAt || !predicate(access.role)) {\n    throw new Error(errorMessage);\n  }\n\n  return access;\n}\n\nexport async function requireOwnedFile(fileId: string, userId: string) {\n  return requireFileAccess(\n    fileId,\n    userId,\n    (role) => role === \"owner\",\n    \"File owner access is required.\",\n  );\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/files/access-control.ts",
  "chunk_output": ".dx/www/output/source-routes/embed--token/modules/src-features-files-access-control-ts-26b077d1507cb8c5.mjs",
  "kind": "ts",
  "hash": "26b077d1507cb8c5",
  "dependencies": [
    {
      "specifier": "@/db/client",
      "resolved_path": "src/db/client.ts",
      "chunk_output": ".dx/www/output/source-routes/embed--token/modules/src-db-client-ts-b11a4f30c3f08fac.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/db/schema",
      "resolved_path": "src/db/schema.ts",
      "chunk_output": ".dx/www/output/source-routes/embed--token/modules/src-db-schema-ts-24b183fcc50e5ffb.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/features/files/permissions",
      "resolved_path": "src/features/files/permissions.ts",
      "chunk_output": ".dx/www/output/source-routes/embed--token/modules/src-features-files-permissions-ts-619c9a7eeb3a33f6.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "drizzle-orm",
      "resolved_path": "src/lib/forge/db/drizzle-orm.ts",
      "chunk_output": ".dx/www/output/source-routes/embed--token/modules/src-lib-forge-db-drizzle-orm-ts-03b4cc666c52123e.mjs",
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
    "source_path": "src/features/files/access-control.ts",
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
        "specifier": "drizzle-orm",
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
export const dxLinkedDependencies = Object.freeze([dep0, dep1, dep2, dep3]);
export default dxSourceModule;
