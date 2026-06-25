import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-lib-forge-utils-zod-ts-ec597ab057171bf2.mjs";
export const dxSourceText = "import { z } from \"zod\";\n\nexport const collaboratorRoles = [\"viewer\", \"commenter\", \"editor\"] as const;\nexport const fileAccessRoles = [\"owner\", ...collaboratorRoles] as const;\nexport const sharePermissionPresets = [\n  \"handoff\",\n  \"prototype\",\n  \"review\",\n] as const;\n\nexport type CollaboratorRole = (typeof collaboratorRoles)[number];\nexport type FileAccessRole = (typeof fileAccessRoles)[number];\nexport type SharePermissionPreset = (typeof sharePermissionPresets)[number];\n\nexport type FileAccessMember = {\n  userId: string;\n  name: string;\n  email: string;\n  role: FileAccessRole;\n  roleLabel: string;\n  createdAt: string;\n};\n\nexport type ShareCapability = {\n  label: string;\n  description: string;\n  accessLevel: \"inspect\" | \"prototype\" | \"review\";\n  allowComments: boolean;\n  allowDownload: boolean;\n};\n\nexport const collaboratorRoleLabels: Record<CollaboratorRole, string> = {\n  viewer: \"Can view\",\n  commenter: \"Can comment\",\n  editor: \"Can edit\",\n};\n\nexport const collaboratorRoleDescriptions: Record<CollaboratorRole, string> = {\n  viewer: \"Inspect the file without changing design content.\",\n  commenter: \"Review the file and participate in comment workflows.\",\n  editor: \"Change design content, save updates, and collaborate live.\",\n};\n\nexport const collaboratorRoleCapabilities: Record<CollaboratorRole, string[]> = {\n  viewer: [\"Open file\", \"Inspect canvas\", \"View prototype\"],\n  commenter: [\"Open file\", \"Add and resolve comments\", \"Join review\"],\n  editor: [\"Edit layers\", \"Save versions\", \"Manage handoff state\"],\n};\n\nexport const sharePresetConfig: Record<\n  SharePermissionPreset,\n  ShareCapability\n> = {\n  handoff: {\n    label: \"Handoff\",\n    description: \"Inspect layout, download SVG/JSON, and open prototype.\",\n    accessLevel: \"inspect\",\n    allowComments: false,\n    allowDownload: true,\n  },\n  prototype: {\n    label: \"Prototype\",\n    description: \"Open the clickable prototype without file downloads.\",\n    accessLevel: \"prototype\",\n    allowComments: false,\n    allowDownload: false,\n  },\n  review: {\n    label: \"Review\",\n    description: \"Review comments and open prototype without downloads.\",\n    accessLevel: \"review\",\n    allowComments: true,\n    allowDownload: false,\n  },\n};\n\nexport const collaboratorRoleSchema = z.enum(collaboratorRoles);\nexport const sharePermissionPresetSchema = z.enum(sharePermissionPresets);\n\nexport function canEditFile(role: FileAccessRole) {\n  return role === \"owner\" || role === \"editor\";\n}\n\nexport function canManageFileAccess(role: FileAccessRole) {\n  return role === \"owner\";\n}\n\nexport function normalizeCollaboratorRole(value: string): CollaboratorRole {\n  return collaboratorRoleSchema.catch(\"viewer\").parse(value);\n}\n\nexport function normalizeSharePermissionPreset(\n  value: string,\n): SharePermissionPreset {\n  return sharePermissionPresetSchema.catch(\"handoff\").parse(value);\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/files/permissions.ts",
  "chunk_output": ".dx/www/output/source-routes/share--token/modules/src-features-files-permissions-ts-619c9a7eeb3a33f6.mjs",
  "kind": "ts",
  "hash": "619c9a7eeb3a33f6",
  "dependencies": [
    {
      "specifier": "zod",
      "resolved_path": "src/lib/forge/utils/zod.ts",
      "chunk_output": ".dx/www/output/source-routes/share--token/modules/src-lib-forge-utils-zod-ts-ec597ab057171bf2.mjs",
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
    "source_path": "src/features/files/permissions.ts",
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
        "specifier": "zod",
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
      "canEditFile",
      "canManageFileAccess",
      "normalizeCollaboratorRole",
      "normalizeSharePermissionPreset",
      "collaboratorRoles",
      "fileAccessRoles",
      "sharePermissionPresets",
      "collaboratorRoleLabels",
      "collaboratorRoleDescriptions",
      "collaboratorRoleCapabilities",
      "sharePresetConfig",
      "collaboratorRoleSchema",
      "sharePermissionPresetSchema"
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
