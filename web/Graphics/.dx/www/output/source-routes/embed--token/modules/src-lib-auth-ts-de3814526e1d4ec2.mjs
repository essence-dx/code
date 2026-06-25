import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-db-client-ts-b11a4f30c3f08fac.mjs";
import { dxSourceModule as dep1, dxRuntimeExports as dep1Runtime } from "./src-db-schema-ts-24b183fcc50e5ffb.mjs";
import { dxSourceModule as dep2, dxRuntimeExports as dep2Runtime } from "./src-lib-brevo-email-ts-8d89dcbf81714307.mjs";
import { dxSourceModule as dep3, dxRuntimeExports as dep3Runtime } from "./src-lib-forge-auth-better-auth-ts-72f111a6b1ee1c29.mjs";
import { dxSourceModule as dep4, dxRuntimeExports as dep4Runtime } from "./src-lib-forge-auth-better-auth-ts-72f111a6b1ee1c29.mjs";
import { dxSourceModule as dep5, dxRuntimeExports as dep5Runtime } from "./src-lib-forge-auth-better-auth-ts-72f111a6b1ee1c29.mjs";
import { dxSourceModule as dep6, dxRuntimeExports as dep6Runtime } from "./src-lib-forge-auth-better-auth-ts-72f111a6b1ee1c29.mjs";
export const dxSourceText = "import { betterAuth } from \"better-auth\";\nimport { drizzleAdapter } from \"better-auth/adapters/drizzle\";\nimport { nextCookies } from \"better-auth/next-js\";\nimport { emailOTP } from \"better-auth/plugins\";\nimport { getDb } from \"@/db/client\";\nimport * as schema from \"@/db/schema\";\nimport { sendBrevoEmail } from \"@/lib/brevo-email\";\n\nconst authBaseURL = getAuthBaseURL();\nif (authBaseURL) {\n  process.env.BETTER_AUTH_URL = authBaseURL;\n}\nconst trustedOrigins = getTrustedOrigins(authBaseURL);\n\nexport const auth = betterAuth({\n  appName: \"Essence\",\n  baseURL: authBaseURL,\n  secret: process.env.BETTER_AUTH_SECRET,\n  database: drizzleAdapter(getDb(), {\n    provider: \"sqlite\",\n    schema,\n  }),\n  emailVerification: {\n    sendOnSignUp: true,\n    sendOnSignIn: true,\n    autoSignInAfterVerification: true,\n  },\n  emailAndPassword: {\n    enabled: true,\n    autoSignIn: false,\n    requireEmailVerification: true,\n    minPasswordLength: 8,\n    maxPasswordLength: 128,\n  },\n  trustedOrigins,\n  plugins: [\n    emailOTP({\n      sendVerificationOnSignUp: true,\n      overrideDefaultEmailVerification: true,\n      otpLength: 6,\n      expiresIn: 10 * 60,\n      allowedAttempts: 5,\n      storeOTP: \"hashed\",\n      resendStrategy: \"rotate\",\n      async sendVerificationOTP({ email, otp, type }) {\n        await sendBrevoEmail({\n          to: email,\n          subject: getOtpSubject(type),\n          html: getOtpHtml(otp),\n          text: `Your Essence verification code is ${otp}. It expires in 10 minutes.`,\n        });\n      },\n    }),\n    nextCookies(),\n  ],\n});\n\nexport type Session = typeof auth.$Infer.Session;\n\nfunction getAuthBaseURL() {\n  const betterAuthURL = getURLFromEnv(\"BETTER_AUTH_URL\");\n\n  if (betterAuthURL) {\n    return betterAuthURL;\n  }\n\n  const appURL = getURLFromEnv(\"NEXT_PUBLIC_APP_URL\");\n\n  if (appURL) {\n    return appURL;\n  }\n\n  const vercelURL = getVercelURL(\"VERCEL_URL\");\n\n  if (vercelURL) {\n    return vercelURL;\n  }\n\n  return undefined;\n}\n\nfunction getURLFromEnv(name: string) {\n  const value = getNormalizedEnvValue(name);\n\n  if (!value) {\n    return undefined;\n  }\n\n  return value.replace(/\\/+$/, \"\");\n}\n\nfunction getVercelURL(name: string) {\n  const value = getURLFromEnv(name);\n\n  if (!value) {\n    return undefined;\n  }\n\n  return value.startsWith(\"http://\") || value.startsWith(\"https://\")\n    ? value\n    : `https://${value}`;\n}\n\nfunction getNormalizedEnvValue(name: string) {\n  return (\n    process.env[name]?.replace(/[\\uFEFF\\u200B-\\u200F\\u2060]/g, \"\").trim() ||\n    undefined\n  );\n}\n\nfunction isDefined(value: string | undefined): value is string {\n  return Boolean(value);\n}\n\nfunction getTrustedOrigins(baseURL: string | undefined) {\n  const extraTrustedOrigins = getNormalizedEnvValue(\"TRUSTED_ORIGINS\")\n    ?.split(\",\")\n    .map((origin) =>\n      origin.replace(/[\\uFEFF\\u200B-\\u200F\\u2060]/g, \"\").trim().replace(/\\/+$/, \"\"),\n    )\n    .filter(isDefined);\n  const origins = [\n    baseURL,\n    getURLFromEnv(\"NEXT_PUBLIC_APP_URL\"),\n    getVercelURL(\"VERCEL_URL\"),\n    getVercelURL(\"VERCEL_BRANCH_URL\"),\n    getVercelURL(\"VERCEL_PROJECT_PRODUCTION_URL\"),\n    ...(extraTrustedOrigins ?? []),\n  ];\n\n  if (process.env.NODE_ENV !== \"production\") {\n    origins.push(\n      \"http://localhost:*\",\n      \"http://127.0.0.1:*\",\n      \"http://localhost:3000\",\n      \"http://localhost:3001\",\n      \"http://localhost:3002\",\n      \"http://127.0.0.1:3000\",\n      \"http://127.0.0.1:3001\",\n      \"http://127.0.0.1:3002\",\n    );\n  }\n\n  return Array.from(new Set(origins.filter(isDefined)));\n}\n\nfunction getOtpSubject(\n  type: \"sign-in\" | \"email-verification\" | \"forget-password\" | \"change-email\",\n) {\n  if (type === \"sign-in\") {\n    return \"Your Essence sign-in code\";\n  }\n\n  if (type === \"change-email\") {\n    return \"Confirm your Essence email change\";\n  }\n\n  if (type === \"forget-password\") {\n    return \"Reset your Essence password\";\n  }\n\n  return \"Verify your Essence account\";\n}\n\nfunction getOtpHtml(otp: string) {\n  return `\n    <div style=\"font-family:Inter,Arial,sans-serif;line-height:1.5;color:#18181b\">\n      <h1 style=\"font-size:20px;margin:0 0 12px\">Verify your Essence account</h1>\n      <p style=\"margin:0 0 16px\">Use this code to finish signing in:</p>\n      <div style=\"display:inline-block;border:1px solid #d4d4d8;border-radius:12px;padding:14px 18px;font-size:28px;font-weight:700;letter-spacing:6px\">${otp}</div>\n      <p style=\"margin:16px 0 0;color:#52525b\">This code expires in 10 minutes.</p>\n    </div>\n  `;\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/lib/auth.ts",
  "chunk_output": ".dx/www/output/source-routes/embed--token/modules/src-lib-auth-ts-de3814526e1d4ec2.mjs",
  "kind": "ts",
  "hash": "de3814526e1d4ec2",
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
      "specifier": "@/lib/brevo-email",
      "resolved_path": "src/lib/brevo-email.ts",
      "chunk_output": ".dx/www/output/source-routes/embed--token/modules/src-lib-brevo-email-ts-8d89dcbf81714307.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "better-auth",
      "resolved_path": "src/lib/forge/auth/better-auth.ts",
      "chunk_output": ".dx/www/output/source-routes/embed--token/modules/src-lib-forge-auth-better-auth-ts-72f111a6b1ee1c29.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "better-auth/adapters/drizzle",
      "resolved_path": "src/lib/forge/auth/better-auth.ts",
      "chunk_output": ".dx/www/output/source-routes/embed--token/modules/src-lib-forge-auth-better-auth-ts-72f111a6b1ee1c29.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "better-auth/next-js",
      "resolved_path": "src/lib/forge/auth/better-auth.ts",
      "chunk_output": ".dx/www/output/source-routes/embed--token/modules/src-lib-forge-auth-better-auth-ts-72f111a6b1ee1c29.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "better-auth/plugins",
      "resolved_path": "src/lib/forge/auth/better-auth.ts",
      "chunk_output": ".dx/www/output/source-routes/embed--token/modules/src-lib-forge-auth-better-auth-ts-72f111a6b1ee1c29.mjs",
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
    "source_path": "src/lib/auth.ts",
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
        "specifier": "better-auth",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "better-auth/adapters/drizzle",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "better-auth/next-js",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "better-auth/plugins",
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
        "specifier": "@/lib/brevo-email",
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
      "auth"
    ],
    "jsx": true,
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
export const dxLinkedDependencies = Object.freeze([dep0, dep1, dep2, dep3, dep4, dep5, dep6]);
export default dxSourceModule;
