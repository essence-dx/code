import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-features-embed-security-types-ts-df937802b141ce92.mjs";
export const dxSourceText = "import {\n  embedFramePolicies,\n  embedSandboxPresets,\n  type EmbedFramePolicy,\n  type EmbedSandboxPreset,\n  type EmbedSecurityPolicy,\n} from \"@/features/embed-security/types\";\n\ntype EmbedPolicyConfigValue =\n  | string\n  | string[]\n  | {\n      allowedOrigins?: string[];\n      framePolicy?: string;\n      sandboxPreset?: string;\n    };\n\ntype EmbedPolicyScope = {\n  fileId?: string | null;\n  shareId?: string | null;\n  token?: string | null;\n};\n\nconst defaultPolicy: EmbedSecurityPolicy = {\n  allowedOrigins: [],\n  configSource: \"default\",\n  framePolicy: \"self\",\n  sandboxAttributes: \"allow-same-origin allow-scripts allow-popups\",\n  sandboxPreset: \"interactive\",\n};\n\nconst sandboxAttributesByPreset: Record<EmbedSandboxPreset, string> = {\n  interactive: \"allow-same-origin allow-scripts allow-popups\",\n  preview: \"allow-same-origin allow-scripts\",\n  strict: \"allow-same-origin\",\n  trusted:\n    \"allow-downloads allow-forms allow-popups allow-same-origin allow-scripts\",\n};\n\nexport function resolveEmbedSecurityPolicy({\n  env = process.env,\n  fileId,\n  shareId,\n  token,\n}: EmbedPolicyScope & {\n  env?: Record<string, string | undefined>;\n}): EmbedSecurityPolicy {\n  const policyConfig = parseEmbedPolicyConfig(env.ESSENCE_EMBED_HOST_ALLOWLISTS);\n  const scopedConfig = getScopedEmbedPolicyConfig(policyConfig, {\n    fileId,\n    shareId,\n    token,\n  });\n  const allowedOrigins = normalizeAllowedOrigins(\n    scopedConfig?.allowedOrigins ??\n      parseOriginList(env.ESSENCE_EMBED_ALLOWED_ORIGINS),\n  );\n  const framePolicy = normalizeFramePolicy(\n    scopedConfig?.framePolicy ?? env.ESSENCE_EMBED_FRAME_POLICY,\n    allowedOrigins.length > 0 ? \"allowlist\" : defaultPolicy.framePolicy,\n  );\n  const sandboxPreset = normalizeSandboxPreset(\n    scopedConfig?.sandboxPreset ?? env.ESSENCE_EMBED_SANDBOX_PRESET,\n  );\n\n  return {\n    allowedOrigins,\n    configSource: scopedConfig ? \"env\" : allowedOrigins.length > 0 ? \"env\" : \"default\",\n    framePolicy,\n    sandboxAttributes: sandboxAttributesByPreset[sandboxPreset],\n    sandboxPreset,\n  };\n}\n\nexport function createEmbedContentSecurityPolicy(policy: EmbedSecurityPolicy) {\n  const frameAncestors = getFrameAncestorsDirective(policy);\n\n  return [\n    \"default-src 'self'\",\n    \"script-src 'self' 'unsafe-inline'\",\n    \"style-src 'self' 'unsafe-inline'\",\n    \"img-src 'self' data: blob:\",\n    \"font-src 'self'\",\n    \"object-src 'none'\",\n    \"base-uri 'self'\",\n    `frame-ancestors ${frameAncestors}`,\n  ].join(\"; \");\n}\n\nexport function getEmbedXFrameOptions(policy: EmbedSecurityPolicy) {\n  if (policy.framePolicy === \"deny\") {\n    return \"DENY\";\n  }\n\n  if (policy.framePolicy === \"self\") {\n    return \"SAMEORIGIN\";\n  }\n\n  return null;\n}\n\nexport function isEmbedOriginAllowed(\n  origin: string | null,\n  policy: EmbedSecurityPolicy,\n  appOrigin?: string | null,\n) {\n  if (!origin) {\n    return true;\n  }\n\n  if (policy.framePolicy === \"deny\") {\n    return false;\n  }\n\n  if (policy.framePolicy === \"self\") {\n    return appOrigin\n      ? normalizeOrigin(origin) === normalizeOrigin(appOrigin)\n      : false;\n  }\n\n  const normalizedOrigin = normalizeOrigin(origin);\n\n  return policy.allowedOrigins.some((allowedOrigin) =>\n    matchesAllowedOrigin(normalizedOrigin, allowedOrigin),\n  );\n}\n\nfunction getFrameAncestorsDirective(policy: EmbedSecurityPolicy) {\n  if (policy.framePolicy === \"deny\") {\n    return \"'none'\";\n  }\n\n  if (policy.framePolicy === \"self\") {\n    return \"'self'\";\n  }\n\n  return [\"'self'\", ...policy.allowedOrigins].join(\" \");\n}\n\nfunction parseEmbedPolicyConfig(value: string | undefined) {\n  if (!value) {\n    return new Map<string, EmbedPolicyConfigValue>();\n  }\n\n  const parsed = tryParseJson(value);\n\n  if (parsed && typeof parsed === \"object\" && !Array.isArray(parsed)) {\n    return new Map(\n      Object.entries(parsed as Record<string, EmbedPolicyConfigValue>),\n    );\n  }\n\n  return new Map(\n    value\n      .split(\";\")\n      .map((entry) => entry.trim())\n      .filter(Boolean)\n      .map((entry) => {\n        const [key, origins = \"\"] = entry.split(\"=\");\n\n        return [key.trim(), parseOriginList(origins)] as const;\n      }),\n  );\n}\n\nfunction getScopedEmbedPolicyConfig(\n  config: Map<string, EmbedPolicyConfigValue>,\n  scope: EmbedPolicyScope,\n) {\n  const candidates = [\n    scope.token ? `token:${scope.token}` : \"\",\n    scope.token ?? \"\",\n    scope.shareId ? `share:${scope.shareId}` : \"\",\n    scope.shareId ?? \"\",\n    scope.fileId ? `file:${scope.fileId}` : \"\",\n    scope.fileId ?? \"\",\n    \"*\",\n  ].filter(Boolean);\n\n  for (const candidate of candidates) {\n    const value = config.get(candidate);\n\n    if (value !== undefined) {\n      return normalizePolicyConfigValue(value);\n    }\n  }\n\n  return null;\n}\n\nfunction normalizePolicyConfigValue(value: EmbedPolicyConfigValue) {\n  if (typeof value === \"string\" || Array.isArray(value)) {\n    return {\n      allowedOrigins: parseOriginList(value),\n    };\n  }\n\n  return {\n    allowedOrigins: normalizeAllowedOrigins(value.allowedOrigins ?? []),\n    framePolicy: value.framePolicy,\n    sandboxPreset: value.sandboxPreset,\n  };\n}\n\nfunction parseOriginList(value: string | string[] | undefined) {\n  if (!value) {\n    return [];\n  }\n\n  return normalizeAllowedOrigins(\n    Array.isArray(value)\n      ? value\n      : value\n          .split(\",\")\n          .map((origin) => origin.trim())\n          .filter(Boolean),\n  );\n}\n\nfunction normalizeAllowedOrigins(origins: string[]) {\n  return Array.from(\n    new Set(\n      origins\n        .map((origin) => normalizeOrigin(origin))\n        .filter((origin) => origin.startsWith(\"https://\")),\n    ),\n  );\n}\n\nfunction normalizeFramePolicy(\n  value: string | undefined,\n  fallback: EmbedFramePolicy,\n) {\n  return embedFramePolicies.find((policy) => policy === value) ?? fallback;\n}\n\nfunction normalizeSandboxPreset(value: string | undefined) {\n  return (\n    embedSandboxPresets.find((preset) => preset === value) ??\n    defaultPolicy.sandboxPreset\n  );\n}\n\nfunction normalizeOrigin(value: string) {\n  const trimmed = value.trim().replace(/\\/+$/, \"\");\n\n  if (trimmed.startsWith(\"https://*.\") || trimmed === \"https://*\") {\n    return trimmed.toLowerCase();\n  }\n\n  try {\n    return new URL(trimmed).origin.toLowerCase();\n  } catch {\n    return \"\";\n  }\n}\n\nfunction matchesAllowedOrigin(origin: string, allowedOrigin: string) {\n  if (allowedOrigin === origin) {\n    return true;\n  }\n\n  if (!allowedOrigin.startsWith(\"https://*.\")) {\n    return false;\n  }\n\n  const suffix = allowedOrigin.replace(\"https://*.\", \".\");\n\n  try {\n    return new URL(origin).hostname.endsWith(suffix);\n  } catch {\n    return false;\n  }\n}\n\nfunction tryParseJson(value: string) {\n  try {\n    return JSON.parse(value) as unknown;\n  } catch {\n    return null;\n  }\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/embed-security/policy.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-embed-security-policy-ts-29323cc2cf6b1c59.mjs",
  "kind": "ts",
  "hash": "29323cc2cf6b1c59",
  "dependencies": [
    {
      "specifier": "@/features/embed-security/types",
      "resolved_path": "src/features/embed-security/types.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-embed-security-types-ts-df937802b141ce92.mjs",
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
    "source_path": "src/features/embed-security/policy.ts",
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
        "specifier": "@/features/embed-security/types",
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
      "resolveEmbedSecurityPolicy",
      "createEmbedContentSecurityPolicy",
      "getEmbedXFrameOptions",
      "isEmbedOriginAllowed"
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
