
export const dxSourceText = "\n  | \"approval\"\n  | \"desktop-update\"\n  | \"manifest\"\n  | \"operator-rehearsal\"\n  | \"package\"\n  | \"privacy\"\n  | \"rollback\"\n  | \"smoke\";\n\n\n\n\nexport function createArchiveItem(input) {\n  return input;\n}\n\nexport function createArchivePackage({\n  id,\n  items,\n  label,\n  releaseLabel,\n}){\n  const createdAt = getLatestDate(items.map((item) => item.createdAt));\n  const retentionUntil = getLatestDate(items.map((item) => item.retentionUntil));\n  const status = getRowsStatus(items.map((item) => item.status));\n\n  return {\n    id,\n    status,\n    label,\n    releaseLabel,\n    createdAt,\n    retentionUntil,\n    score: getRowsScore(items),\n    itemCount: items.length,\n    searchableText: items.map((item) => item.searchableText).join(\" \"),\n    items,\n  };\n}\n\nexport function getRowsStatus(\n  statuses,\n){\n  if (statuses.includes(\"blocked\")) {\n    return \"blocked\";\n  }\n\n  return statuses.includes(\"review\") ? \"review\" : \"ready\";\n}\n\nexport function getRowsScore(\n  rows,\n) {\n  const blockedCount = rows.filter((row) => row.status === \"blocked\").length;\n  const reviewCount = rows.filter((row) => row.status === \"review\").length;\n\n  return Math.max(0, 100 - blockedCount * 18 - reviewCount * 6);\n}\n\nexport function addDays(value, days) {\n  const date = new Date(value);\n\n  if (!Number.isFinite(date.getTime())) {\n    return new Date().toISOString();\n  }\n\n  date.setUTCDate(date.getUTCDate() + days);\n\n  return date.toISOString();\n}\n\nexport function isExpired(value, now) {\n  const time = new Date(value).getTime();\n\n  return Number.isFinite(time) && time <= now;\n}\n\nexport function searchable(...parts) {\n  return parts\n    .filter((part) => part !== null && part !== undefined)\n    .map(String)\n    .join(\" \")\n    .toLowerCase();\n}\n\nexport function uniqueStrings(items) {\n  return Array.from(new Set(items.filter(Boolean)));\n}\n\nfunction getLatestDate(values: string[]) {\n  return values\n    .filter(Boolean)\n    .sort((left, right) => toTime(right) - toTime(left))[0] ?? new Date().toISOString();\n}\n\nfunction toTime(value: string) {\n  const time = new Date(value).getTime();\n\n  return Number.isFinite(time) ? time : 0;\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-release-archive-retention-core.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-release-archive-retention-core-ts-e5470a1e1adb5640.mjs",
  "kind": "ts",
  "hash": "e5470a1e1adb5640",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": true,
  "transform_kind": "typescript-helper-runtime",
  "runtime_exports": [
    "createArchiveItem",
    "createArchivePackage",
    "getRowsStatus",
    "getRowsScore",
    "addDays",
    "isExpired",
    "searchable",
    "uniqueStrings"
  ],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/features/admin/admin-release-archive-retention-core.ts",
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
      "createArchiveItem",
      "createArchivePackage",
      "getRowsStatus",
      "getRowsScore",
      "addDays",
      "isExpired",
      "searchable",
      "uniqueStrings"
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
  exportNames: ["createArchiveItem","createArchivePackage","getRowsStatus","getRowsScore","addDays","isExpired","searchable","uniqueStrings"]
});

  | "approval"
  | "desktop-update"
  | "manifest"
  | "operator-rehearsal"
  | "package"
  | "privacy"
  | "rollback"
  | "smoke";




export function createArchiveItem(input) {
  return input;
}

export function createArchivePackage({
  id,
  items,
  label,
  releaseLabel,
}){
  const createdAt = getLatestDate(items.map((item) => item.createdAt));
  const retentionUntil = getLatestDate(items.map((item) => item.retentionUntil));
  const status = getRowsStatus(items.map((item) => item.status));

  return {
    id,
    status,
    label,
    releaseLabel,
    createdAt,
    retentionUntil,
    score: getRowsScore(items),
    itemCount: items.length,
    searchableText: items.map((item) => item.searchableText).join(" "),
    items,
  };
}

export function getRowsStatus(
  statuses,
){
  if (statuses.includes("blocked")) {
    return "blocked";
  }

  return statuses.includes("review") ? "review" : "ready";
}

export function getRowsScore(
  rows,
) {
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;

  return Math.max(0, 100 - blockedCount * 18 - reviewCount * 6);
}

export function addDays(value, days) {
  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return new Date().toISOString();
  }

  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString();
}

export function isExpired(value, now) {
  const time = new Date(value).getTime();

  return Number.isFinite(time) && time <= now;
}

export function searchable(...parts) {
  return parts
    .filter((part) => part !== null && part !== undefined)
    .map(String)
    .join(" ")
    .toLowerCase();
}

export function uniqueStrings(items) {
  return Array.from(new Set(items.filter(Boolean)));
}

function getLatestDate(values: string[]) {
  return values
    .filter(Boolean)
    .sort((left, right) => toTime(right) - toTime(left))[0] ?? new Date().toISOString();
}

function toTime(value: string) {
  const time = new Date(value).getTime();

  return Number.isFinite(time) ? time : 0;
}
export const dxRuntimeExports = Object.freeze({ createArchiveItem, createArchivePackage, getRowsStatus, getRowsScore, addDays, isExpired, searchable, uniqueStrings });
export const dxLinkedDependencies = Object.freeze([]);
export default dxSourceModule;
