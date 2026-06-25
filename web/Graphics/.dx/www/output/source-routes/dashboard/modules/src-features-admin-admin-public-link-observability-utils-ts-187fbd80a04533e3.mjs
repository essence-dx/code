
export const dxSourceText = "import type { AdminPublicLinkStatus } from \"@/features/admin/admin-public-link-observability-types\";\n\nexport const publicLinkStatusWeight: Record<AdminPublicLinkStatus, number> = {\n  blocked: 0,\n  review: 1,\n  ready: 2,\n};\n\nexport function joinPublicLinkUrl(baseUrl: string, path: string) {\n  const cleanBase = baseUrl.replace(/\\/+$/, \"\");\n  const cleanPath = path.startsWith(\"/\") ? path : `/${path}`;\n\n  return `${cleanBase || \"https://<deployment-url>\"}${cleanPath}`;\n}\n\nexport function getWorstPublicLinkStatus(\n  statuses: AdminPublicLinkStatus[],\n  fallback: AdminPublicLinkStatus = \"ready\",\n) {\n  if (statuses.includes(\"blocked\")) {\n    return \"blocked\";\n  }\n\n  if (statuses.includes(\"review\")) {\n    return \"review\";\n  }\n\n  return fallback;\n}\n\nexport function getLatestPublicLinkIso(\n  left: string | null,\n  right: string | null,\n) {\n  if (!left) {\n    return right;\n  }\n\n  if (!right) {\n    return left;\n  }\n\n  return new Date(right).getTime() > new Date(left).getTime() ? right : left;\n}\n\nexport function normalizePublicLinkReferrerNotes(value: string | undefined) {\n  if (!value?.trim()) {\n    return {};\n  }\n\n  try {\n    const parsed = JSON.parse(value) as unknown;\n\n    if (parsed && typeof parsed === \"object\" && !Array.isArray(parsed)) {\n      return Object.fromEntries(\n        Object.entries(parsed)\n          .filter((entry): entry is [string, string] => typeof entry[1] === \"string\")\n          .map(([key, note]) => [key.trim(), note.trim()])\n          .filter(([key, note]) => key && note),\n      );\n    }\n  } catch {\n    return parseDelimitedReferrerNotes(value);\n  }\n\n  return parseDelimitedReferrerNotes(value);\n}\n\nfunction parseDelimitedReferrerNotes(value: string) {\n  return Object.fromEntries(\n    value\n      .split(\";\")\n      .map((entry) => entry.split(\":\"))\n      .map(([key = \"\", ...noteParts]) => [\n        key.trim(),\n        noteParts.join(\":\").trim(),\n      ])\n      .filter(([key, note]) => key && note),\n  );\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-public-link-observability-utils.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-public-link-observability-utils-ts-187fbd80a04533e3.mjs",
  "kind": "ts",
  "hash": "187fbd80a04533e3",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": false,
  "transform_kind": "metadata-only",
  "runtime_exports": [],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/features/admin/admin-public-link-observability-utils.ts",
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
        "specifier": "@/features/admin/admin-public-link-observability-types",
        "side_effect_only": false,
        "type_only": true
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
      "joinPublicLinkUrl",
      "getWorstPublicLinkStatus",
      "getLatestPublicLinkIso",
      "normalizePublicLinkReferrerNotes",
      "publicLinkStatusWeight"
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
export const dxLinkedDependencies = Object.freeze([]);
export default dxSourceModule;
