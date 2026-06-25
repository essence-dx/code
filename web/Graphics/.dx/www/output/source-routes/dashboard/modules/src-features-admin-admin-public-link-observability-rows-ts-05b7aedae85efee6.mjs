import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-features-admin-admin-public-link-observability-utils-ts-187fbd80a04533e3.mjs";
export const dxSourceText = "import type {\n  AdminPublicLinkObservabilityRow,\n  AdminPublicLinkSurface,\n} from \"@/features/admin/admin-public-link-observability-types\";\nimport { publicLinkStatusWeight } from \"@/features/admin/admin-public-link-observability-utils\";\n\nexport function toPublicLinkObservabilityRows(\n  surface: AdminPublicLinkSurface,\n): AdminPublicLinkObservabilityRow[] {\n  return [\n    getRouteSmokeRow(surface),\n    getExpiryRow(surface),\n    getExposureRow(surface),\n    getReferrerRow(surface),\n    getEmbedRow(surface),\n    getReleaseSafeRow(surface),\n  ]\n    .filter((row): row is AdminPublicLinkObservabilityRow => Boolean(row))\n    .sort(sortPublicLinkRows);\n}\n\nexport function getEmptyPublicLinkObservabilityRow(): AdminPublicLinkObservabilityRow {\n  return {\n    id: \"public-link-observability-empty\",\n    surfaceId: \"none\",\n    category: \"release-safe\",\n    status: \"review\",\n    label: \"No active public links\",\n    targetUrl: \"/share/<token>\",\n    detail:\n      \"No active public share, prototype, or embed surfaces are available for release observability.\",\n    recommendation:\n      \"Create a reviewed share link before public route smoke or embed monitoring.\",\n    latestAt: null,\n  };\n}\n\nexport function sortPublicLinkRows(\n  left: AdminPublicLinkObservabilityRow,\n  right: AdminPublicLinkObservabilityRow,\n) {\n  return (\n    publicLinkStatusWeight[left.status] - publicLinkStatusWeight[right.status] ||\n    categoryWeight(left.category) - categoryWeight(right.category) ||\n    left.label.localeCompare(right.label)\n  );\n}\n\nfunction getRouteSmokeRow(\n  surface: AdminPublicLinkSurface,\n): AdminPublicLinkObservabilityRow {\n  return {\n    id: `${surface.id}-route-smoke`,\n    surfaceId: surface.id,\n    category: \"route-smoke\",\n    status: surface.smokeStatus,\n    label: `${surface.label} route smoke`,\n    targetUrl: surface.targetUrl,\n    detail: `${surface.smokeLabel} is ${surface.smokeStatus}.`,\n    recommendation:\n      surface.smokeStatus === \"ready\"\n        ? \"Keep this route in the public smoke set.\"\n        : \"Run public route smoke before attaching this link to a release.\",\n    latestAt: surface.latestAt,\n  };\n}\n\nfunction getExpiryRow(\n  surface: AdminPublicLinkSurface,\n): AdminPublicLinkObservabilityRow | null {\n  if (surface.expiryState === \"scheduled\") {\n    return null;\n  }\n\n  return {\n    id: `${surface.id}-expiry`,\n    surfaceId: surface.id,\n    category: \"expiry\",\n    status: surface.expiryState === \"expired\" ? \"blocked\" : \"review\",\n    label:\n      surface.expiryState === \"expired\"\n        ? \"Expired public link is still observable\"\n        : surface.stale\n          ? \"Stale no-expiry public link\"\n        : \"Public link has no expiry\",\n    targetUrl: surface.targetUrl,\n    detail:\n      surface.expiryState === \"expired\"\n        ? `${surface.label} is past its expiry date.`\n        : surface.stale\n          ? `${surface.label} has been public without expiry for more than 30 days.`\n        : `${surface.label} can remain public until it is manually disabled.`,\n    recommendation:\n      surface.expiryState === \"expired\"\n        ? \"Disable the link or create a fresh reviewed target.\"\n        : surface.stale\n          ? \"Set an expiry date or disable this stale public target.\"\n        : \"Set an expiry date before sharing externally.\",\n    latestAt: surface.latestAt,\n  };\n}\n\nfunction getExposureRow(\n  surface: AdminPublicLinkSurface,\n): AdminPublicLinkObservabilityRow | null {\n  if (!surface.allowDownload && !surface.allowComments) {\n    return null;\n  }\n\n  const exposures = [\n    surface.allowDownload ? \"downloads\" : \"\",\n    surface.allowComments ? \"comments\" : \"\",\n  ].filter(Boolean);\n\n  return {\n    id: `${surface.id}-exposure`,\n    surfaceId: surface.id,\n    category: \"exposure\",\n    status: surface.allowDownload ? \"blocked\" : \"review\",\n    label: \"Public exposure flags\",\n    targetUrl: surface.targetUrl,\n    detail: `${surface.label} exposes ${exposures.join(\" and \")}.`,\n    recommendation: surface.allowDownload\n      ? \"Disable downloads unless the release explicitly needs source assets.\"\n      : \"Keep comment access tied to an active review owner.\",\n    latestAt: surface.latestAt,\n  };\n}\n\nfunction getReferrerRow(\n  surface: AdminPublicLinkSurface,\n): AdminPublicLinkObservabilityRow | null {\n  if (surface.referrerNote) {\n    return null;\n  }\n\n  return {\n    id: `${surface.id}-referrer`,\n    surfaceId: surface.id,\n    category: \"referrer\",\n    status: \"review\",\n    label: \"Missing referrer note\",\n    targetUrl: surface.targetUrl,\n    detail: `${surface.label} has no expected source, referrer, client, or embed host note.`,\n    recommendation:\n      \"Attach a referrer note before using this link in external docs, embeds, or client portals.\",\n    latestAt: surface.latestAt,\n  };\n}\n\nfunction getEmbedRow(\n  surface: AdminPublicLinkSurface,\n): AdminPublicLinkObservabilityRow | null {\n  if (surface.kind !== \"embed\") {\n    return null;\n  }\n\n  return {\n    id: `${surface.id}-embed`,\n    surfaceId: surface.id,\n    category: \"embed\",\n    status: surface.smokeStatus === \"blocked\" ? \"blocked\" : \"review\",\n    label: \"Embeddable surface\",\n    targetUrl: surface.targetUrl,\n    detail: `${surface.label} is available as an iframe-friendly route.`,\n    recommendation:\n      \"Pair embed usage with an expiry date and a referrer note for the host surface.\",\n    latestAt: surface.latestAt,\n  };\n}\n\nfunction getReleaseSafeRow(\n  surface: AdminPublicLinkSurface,\n): AdminPublicLinkObservabilityRow | null {\n  if (surface.releaseSafe) {\n    return null;\n  }\n\n  return {\n    id: `${surface.id}-release-safe`,\n    surfaceId: surface.id,\n    category: \"release-safe\",\n    status: surface.blockerCount > 0 ? \"blocked\" : \"review\",\n    label: \"Release-safe publication queue\",\n    targetUrl: surface.targetUrl,\n    detail:\n      surface.blockers[0] ??\n      surface.warnings[0] ??\n      `${surface.label} needs publication review.`,\n    recommendation: surface.recommendation,\n    latestAt: surface.latestAt,\n  };\n}\n\nfunction categoryWeight(category: AdminPublicLinkObservabilityRow[\"category\"]) {\n  const weights: Record<AdminPublicLinkObservabilityRow[\"category\"], number> = {\n    \"route-smoke\": 0,\n    \"release-safe\": 1,\n    expiry: 2,\n    exposure: 3,\n    referrer: 4,\n    embed: 5,\n  };\n\n  return weights[category];\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/admin-public-link-observability-rows.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-public-link-observability-rows-ts-05b7aedae85efee6.mjs",
  "kind": "ts",
  "hash": "05b7aedae85efee6",
  "dependencies": [
    {
      "specifier": "@/features/admin/admin-public-link-observability-utils",
      "resolved_path": "src/features/admin/admin-public-link-observability-utils.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-admin-public-link-observability-utils-ts-187fbd80a04533e3.mjs",
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
    "source_path": "src/features/admin/admin-public-link-observability-rows.ts",
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
      },
      {
        "specifier": "@/features/admin/admin-public-link-observability-utils",
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
      "toPublicLinkObservabilityRows",
      "getEmptyPublicLinkObservabilityRow",
      "sortPublicLinkRows"
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
