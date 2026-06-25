
export const dxSourceText = "\n  | \"auth\"\n  | \"database\"\n  | \"email\"\n  | \"runtime\"\n  | \"url\";\n\n\n\n\nexport function getDeployEnvironmentPreflightReport({\n  env,\n  generatedAt = new Date().toISOString(),\n}){\n  const rows = getPreflightRows(env);\n  const blockedCount = rows.filter((row) => row.status === \"blocked\").length;\n  const reviewCount = rows.filter((row) => row.status === \"review\").length;\n  const readyCount = rows.filter((row) => row.status === \"ready\").length;\n\n  return {\n    generatedAt,\n    status:\n      blockedCount > 0 ? \"blocked\" : reviewCount > 0 ? \"review\" : \"ready\",\n    score: Math.max(0, 100 - blockedCount * 22 - reviewCount * 7),\n    readyCount,\n    reviewCount,\n    blockedCount,\n    requiredCount: rows.filter((row) => row.required).length,\n    secretCount: rows.filter((row) => row.secret).length,\n    appOrigin: getAppOrigin(env) ?? \"not configured\",\n    vercelEnv: getValue(env, \"VERCEL_ENV\") || \"local\",\n    runtime: getValue(env, \"NEXT_RUNTIME\") || \"nodejs\",\n    rows,\n    commands: [\n      \"vercel env ls production\",\n      \"vercel env pull .env.local --environment=production --yes\",\n      \"bun run ops:env-preflight\",\n      \"bun run visual:deploy-smoke -- --base-url <deployment-url>\",\n    ],\n  };\n}\n\nfunction getPreflightRows(env: PreflightEnv) {\n  const databaseUrl = getValue(env, \"TURSO_DATABASE_URL\");\n  const remoteDatabase = databaseUrl.startsWith(\"libsql://\");\n  const productionRuntime =\n    getValue(env, \"VERCEL_ENV\") === \"production\" ||\n    getValue(env, \"NODE_ENV\") === \"production\";\n  const authSecret = getValue(env, \"BETTER_AUTH_SECRET\");\n  const appOrigin = getAppOrigin(env);\n  const betterAuthOrigin = getOrigin(getValue(env, \"BETTER_AUTH_URL\"));\n  const publicAppOrigin = getOrigin(getValue(env, \"NEXT_PUBLIC_APP_URL\"));\n  const runtime = getValue(env, \"NEXT_RUNTIME\") || \"nodejs\";\n  const brevoKey = getValue(env, \"BREVO_API_KEY\");\n  const senderEmail = getValue(env, \"BREVO_SENDER_EMAIL\");\n  const adminEmails = getValue(env, \"ADMIN_EMAILS\");\n\n  return [\n    {\n      id: \"turso-database-url\",\n      status: getDatabaseUrlStatus(databaseUrl, productionRuntime),\n      category: \"database\",\n      label: \"Turso database URL\",\n      envKeys: [\"TURSO_DATABASE_URL\"],\n      required: true,\n      secret: false,\n      detail: databaseUrl\n        ? remoteDatabase\n          ? `Remote Turso database configured at ${getSafeDatabaseTarget(databaseUrl)}.`\n          : `Local database configured at ${getSafeDatabaseTarget(databaseUrl)}.`\n        : \"No database URL is configured.\",\n      recommendation: databaseUrl\n        ? productionRuntime && !remoteDatabase\n          ? \"Use the Turso libsql production database for deployed environments.\"\n          : \"Keep this value scoped in Vercel production and preview environments.\"\n        : \"Set TURSO_DATABASE_URL before deployment.\",\n    },\n    {\n      id: \"turso-auth-token\",\n      status:\n        remoteDatabase && !getValue(env, \"TURSO_AUTH_TOKEN\")\n          ? \"blocked\"\n          : \"ready\",\n      category: \"database\",\n      label: \"Turso auth token\",\n      envKeys: [\"TURSO_AUTH_TOKEN\"],\n      required: remoteDatabase,\n      secret: true,\n      detail: remoteDatabase\n        ? getValue(env, \"TURSO_AUTH_TOKEN\")\n          ? \"Remote database auth token is present.\"\n          : \"Remote libsql databases require an auth token.\"\n        : \"Local database URLs do not require a Turso auth token.\",\n      recommendation:\n        \"Store TURSO_AUTH_TOKEN as a Vercel secret and keep it out of public env prefixes.\",\n    },\n    {\n      id: \"better-auth-secret\",\n      status: !authSecret\n        ? \"blocked\"\n        : authSecret.length < 32 || isPlaceholder(authSecret)\n          ? \"review\"\n          : \"ready\",\n      category: \"auth\",\n      label: \"Better Auth secret\",\n      envKeys: [\"BETTER_AUTH_SECRET\"],\n      required: true,\n      secret: true,\n      detail: authSecret\n        ? `Session secret is present with ${authSecret.length} characters.`\n        : \"Session signing secret is missing.\",\n      recommendation:\n        \"Use a strong random secret of at least 32 characters in every deployed environment.\",\n    },\n    {\n      id: \"app-url-origin\",\n      status: getAppUrlStatus({\n        appOrigin,\n        betterAuthOrigin,\n        publicAppOrigin,\n        productionRuntime,\n      }),\n      category: \"url\",\n      label: \"Public app URL\",\n      envKeys: [\"BETTER_AUTH_URL\", \"NEXT_PUBLIC_APP_URL\", \"VERCEL_URL\"],\n      required: true,\n      secret: false,\n      detail: appOrigin\n        ? `Resolved app origin is ${appOrigin}.`\n        : \"No public application origin could be resolved.\",\n      recommendation:\n        \"Set BETTER_AUTH_URL and NEXT_PUBLIC_APP_URL to the deployed HTTPS origin so OTP redirects and trusted origins match.\",\n    },\n    {\n      id: \"brevo-api-key\",\n      status: !brevoKey\n        ? \"blocked\"\n        : isPlaceholder(brevoKey)\n          ? \"review\"\n          : \"ready\",\n      category: \"email\",\n      label: \"Brevo API key\",\n      envKeys: [\"BREVO_API_KEY\"],\n      required: true,\n      secret: true,\n      detail: brevoKey\n        ? `Brevo API key is present (${maskSecret(brevoKey)}).`\n        : \"Brevo API key is missing.\",\n      recommendation:\n        \"Store BREVO_API_KEY as a sensitive Vercel env var and rotate it if it has ever been exposed.\",\n    },\n    {\n      id: \"brevo-sender-email\",\n      status: !senderEmail\n        ? \"blocked\"\n        : isEmail(senderEmail)\n          ? \"ready\"\n          : \"review\",\n      category: \"email\",\n      label: \"Brevo sender email\",\n      envKeys: [\"BREVO_SENDER_EMAIL\", \"BREVO_SENDER_NAME\"],\n      required: true,\n      secret: false,\n      detail: senderEmail\n        ? `Verification sender is ${senderEmail}.`\n        : \"Verification sender email is missing.\",\n      recommendation:\n        \"Use a verified Brevo sender address for OTP delivery and keep the sender name user-recognizable.\",\n    },\n    {\n      id: \"admin-allowlist\",\n      status: adminEmails\n        ? adminEmails.split(\",\").some((email) => isEmail(email.trim()))\n          ? \"ready\"\n          : \"review\"\n        : \"review\",\n      category: \"auth\",\n      label: \"Admin allowlist\",\n      envKeys: [\"ADMIN_EMAILS\"],\n      required: true,\n      secret: false,\n      detail: adminEmails\n        ? `${adminEmails.split(\",\").filter(Boolean).length} admin email value${adminEmails.split(\",\").filter(Boolean).length === 1 ? \"\" : \"s\"} configured.`\n        : \"ADMIN_EMAILS is not set and the app will fall back to the default seeded admin.\",\n      recommendation:\n        \"Set ADMIN_EMAILS explicitly in production so dashboard access does not depend on defaults.\",\n    },\n    {\n      id: \"vercel-runtime\",\n      status: getValue(env, \"VERCEL\")\n        ? getValue(env, \"VERCEL_ENV\") === \"production\"\n          ? \"ready\"\n          : \"review\"\n        : \"review\",\n      category: \"runtime\",\n      label: \"Vercel runtime\",\n      envKeys: [\"VERCEL\", \"VERCEL_ENV\", \"VERCEL_PROJECT_PRODUCTION_URL\"],\n      required: true,\n      secret: false,\n      detail: getValue(env, \"VERCEL\")\n        ? `Running on Vercel ${getValue(env, \"VERCEL_ENV\") || \"unknown\"} runtime.`\n        : \"Current process is not running on Vercel.\",\n      recommendation:\n        \"Run this preflight from production or pull production envs locally before approving release.\",\n    },\n    {\n      id: \"node-runtime\",\n      status: runtime === \"edge\" ? \"blocked\" : \"ready\",\n      category: \"runtime\",\n      label: \"Node runtime\",\n      envKeys: [\"NEXT_RUNTIME\"],\n      required: true,\n      secret: false,\n      detail:\n        runtime === \"edge\"\n          ? \"Edge runtime detected for a flow that depends on Better Auth, Brevo, and LibSQL Node-compatible behavior.\"\n          : `Runtime is ${runtime}.`,\n      recommendation:\n        \"Keep auth, email, and database operations on the Node.js runtime.\",\n    },\n    {\n      id: \"server-actions-key\",\n      status:\n        productionRuntime && !getValue(env, \"NEXT_SERVER_ACTIONS_ENCRYPTION_KEY\")\n          ? \"review\"\n          : \"ready\",\n      category: \"runtime\",\n      label: \"Server actions encryption\",\n      envKeys: [\"NEXT_SERVER_ACTIONS_ENCRYPTION_KEY\"],\n      required: false,\n      secret: true,\n      detail: getValue(env, \"NEXT_SERVER_ACTIONS_ENCRYPTION_KEY\")\n        ? \"Stable server actions encryption key is present.\"\n        : \"Stable server actions encryption key is not configured.\",\n      recommendation:\n        \"Set NEXT_SERVER_ACTIONS_ENCRYPTION_KEY when promoting identical builds across production instances.\",\n    },\n  ] satisfies DeployEnvironmentPreflightRow[];\n}\n\nfunction getDatabaseUrlStatus(\n  databaseUrl: string,\n  productionRuntime: boolean,\n): DeployEnvironmentPreflightStatus {\n  if (!databaseUrl) {\n    return \"blocked\";\n  }\n\n  if (productionRuntime && !databaseUrl.startsWith(\"libsql://\")) {\n    return \"review\";\n  }\n\n  return \"ready\";\n}\n\nfunction getAppUrlStatus(input: {\n  appOrigin: string | null;\n  betterAuthOrigin: string | null;\n  publicAppOrigin: string | null;\n  productionRuntime: boolean;\n}): DeployEnvironmentPreflightStatus {\n  if (!input.appOrigin) {\n    return \"blocked\";\n  }\n\n  if (input.productionRuntime && !input.appOrigin.startsWith(\"https://\")) {\n    return \"review\";\n  }\n\n  if (\n    input.betterAuthOrigin &&\n    input.publicAppOrigin &&\n    input.betterAuthOrigin !== input.publicAppOrigin\n  ) {\n    return \"review\";\n  }\n\n  return \"ready\";\n}\n\nfunction getAppOrigin(env: PreflightEnv) {\n  return (\n    getOrigin(getValue(env, \"BETTER_AUTH_URL\")) ??\n    getOrigin(getValue(env, \"NEXT_PUBLIC_APP_URL\")) ??\n    getOrigin(getVercelOrigin(env))\n  );\n}\n\nfunction getVercelOrigin(env: PreflightEnv) {\n  const productionUrl = getValue(env, \"VERCEL_PROJECT_PRODUCTION_URL\");\n  const deploymentUrl = getValue(env, \"VERCEL_URL\");\n  const value = productionUrl || deploymentUrl;\n\n  return value ? `https://${value.replace(/^https?:\\/\\//, \"\")}` : \"\";\n}\n\nfunction getOrigin(value: string) {\n  if (!value) {\n    return null;\n  }\n\n  try {\n    return new URL(value).origin;\n  } catch {\n    return null;\n  }\n}\n\nfunction getSafeDatabaseTarget(value: string) {\n  if (!value) {\n    return \"not configured\";\n  }\n\n  try {\n    const url = new URL(value);\n    return url.protocol === \"file:\" ? \"local sqlite file\" : url.host;\n  } catch {\n    return value.startsWith(\"file:\") ? \"local sqlite file\" : \"configured URL\";\n  }\n}\n\nfunction getValue(env: PreflightEnv, key: string) {\n  return env[key]?.trim() ?? \"\";\n}\n\nfunction maskSecret(value: string) {\n  if (value.length <= 8) {\n    return \"present\";\n  }\n\n  return `${value.slice(0, 4)}...${value.slice(-4)}`;\n}\n\nfunction isPlaceholder(value: string) {\n  return /^(replace|your|change|todo|example|test)[-_]/i.test(value);\n}\n\nfunction isEmail(value: string) {\n  return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(value);\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/admin/deploy-environment-preflight.ts",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-features-admin-deploy-environment-preflight-ts-f6153cb226d8bd02.mjs",
  "kind": "ts",
  "hash": "f6153cb226d8bd02",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": true,
  "transform_kind": "typescript-helper-runtime",
  "runtime_exports": [
    "getDeployEnvironmentPreflightReport"
  ],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/features/admin/deploy-environment-preflight.ts",
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
      "getDeployEnvironmentPreflightReport"
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
  exportNames: ["getDeployEnvironmentPreflightReport"]
});

  | "auth"
  | "database"
  | "email"
  | "runtime"
  | "url";




export function getDeployEnvironmentPreflightReport({
  env,
  generatedAt = new Date().toISOString(),
}){
  const rows = getPreflightRows(env);
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;

  return {
    generatedAt,
    status:
      blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready",
    score: Math.max(0, 100 - blockedCount * 22 - reviewCount * 7),
    readyCount,
    reviewCount,
    blockedCount,
    requiredCount: rows.filter((row) => row.required).length,
    secretCount: rows.filter((row) => row.secret).length,
    appOrigin: getAppOrigin(env) ?? "not configured",
    vercelEnv: getValue(env, "VERCEL_ENV") || "local",
    runtime: getValue(env, "NEXT_RUNTIME") || "nodejs",
    rows,
    commands: [
      "vercel env ls production",
      "vercel env pull .env.local --environment=production --yes",
      "bun run ops:env-preflight",
      "bun run visual:deploy-smoke -- --base-url <deployment-url>",
    ],
  };
}

function getPreflightRows(env: PreflightEnv) {
  const databaseUrl = getValue(env, "TURSO_DATABASE_URL");
  const remoteDatabase = databaseUrl.startsWith("libsql://");
  const productionRuntime =
    getValue(env, "VERCEL_ENV") === "production" ||
    getValue(env, "NODE_ENV") === "production";
  const authSecret = getValue(env, "BETTER_AUTH_SECRET");
  const appOrigin = getAppOrigin(env);
  const betterAuthOrigin = getOrigin(getValue(env, "BETTER_AUTH_URL"));
  const publicAppOrigin = getOrigin(getValue(env, "NEXT_PUBLIC_APP_URL"));
  const runtime = getValue(env, "NEXT_RUNTIME") || "nodejs";
  const brevoKey = getValue(env, "BREVO_API_KEY");
  const senderEmail = getValue(env, "BREVO_SENDER_EMAIL");
  const adminEmails = getValue(env, "ADMIN_EMAILS");

  return [
    {
      id: "turso-database-url",
      status: getDatabaseUrlStatus(databaseUrl, productionRuntime),
      category: "database",
      label: "Turso database URL",
      envKeys: ["TURSO_DATABASE_URL"],
      required: true,
      secret: false,
      detail: databaseUrl
        ? remoteDatabase
          ? `Remote Turso database configured at ${getSafeDatabaseTarget(databaseUrl)}.`
          : `Local database configured at ${getSafeDatabaseTarget(databaseUrl)}.`
        : "No database URL is configured.",
      recommendation: databaseUrl
        ? productionRuntime && !remoteDatabase
          ? "Use the Turso libsql production database for deployed environments."
          : "Keep this value scoped in Vercel production and preview environments."
        : "Set TURSO_DATABASE_URL before deployment.",
    },
    {
      id: "turso-auth-token",
      status:
        remoteDatabase && !getValue(env, "TURSO_AUTH_TOKEN")
          ? "blocked"
          : "ready",
      category: "database",
      label: "Turso auth token",
      envKeys: ["TURSO_AUTH_TOKEN"],
      required: remoteDatabase,
      secret: true,
      detail: remoteDatabase
        ? getValue(env, "TURSO_AUTH_TOKEN")
          ? "Remote database auth token is present."
          : "Remote libsql databases require an auth token."
        : "Local database URLs do not require a Turso auth token.",
      recommendation:
        "Store TURSO_AUTH_TOKEN as a Vercel secret and keep it out of public env prefixes.",
    },
    {
      id: "better-auth-secret",
      status: !authSecret
        ? "blocked"
        : authSecret.length < 32 || isPlaceholder(authSecret)
          ? "review"
          : "ready",
      category: "auth",
      label: "Better Auth secret",
      envKeys: ["BETTER_AUTH_SECRET"],
      required: true,
      secret: true,
      detail: authSecret
        ? `Session secret is present with ${authSecret.length} characters.`
        : "Session signing secret is missing.",
      recommendation:
        "Use a strong random secret of at least 32 characters in every deployed environment.",
    },
    {
      id: "app-url-origin",
      status: getAppUrlStatus({
        appOrigin,
        betterAuthOrigin,
        publicAppOrigin,
        productionRuntime,
      }),
      category: "url",
      label: "Public app URL",
      envKeys: ["BETTER_AUTH_URL", "NEXT_PUBLIC_APP_URL", "VERCEL_URL"],
      required: true,
      secret: false,
      detail: appOrigin
        ? `Resolved app origin is ${appOrigin}.`
        : "No public application origin could be resolved.",
      recommendation:
        "Set BETTER_AUTH_URL and NEXT_PUBLIC_APP_URL to the deployed HTTPS origin so OTP redirects and trusted origins match.",
    },
    {
      id: "brevo-api-key",
      status: !brevoKey
        ? "blocked"
        : isPlaceholder(brevoKey)
          ? "review"
          : "ready",
      category: "email",
      label: "Brevo API key",
      envKeys: ["BREVO_API_KEY"],
      required: true,
      secret: true,
      detail: brevoKey
        ? `Brevo API key is present (${maskSecret(brevoKey)}).`
        : "Brevo API key is missing.",
      recommendation:
        "Store BREVO_API_KEY as a sensitive Vercel env var and rotate it if it has ever been exposed.",
    },
    {
      id: "brevo-sender-email",
      status: !senderEmail
        ? "blocked"
        : isEmail(senderEmail)
          ? "ready"
          : "review",
      category: "email",
      label: "Brevo sender email",
      envKeys: ["BREVO_SENDER_EMAIL", "BREVO_SENDER_NAME"],
      required: true,
      secret: false,
      detail: senderEmail
        ? `Verification sender is ${senderEmail}.`
        : "Verification sender email is missing.",
      recommendation:
        "Use a verified Brevo sender address for OTP delivery and keep the sender name user-recognizable.",
    },
    {
      id: "admin-allowlist",
      status: adminEmails
        ? adminEmails.split(",").some((email) => isEmail(email.trim()))
          ? "ready"
          : "review"
        : "review",
      category: "auth",
      label: "Admin allowlist",
      envKeys: ["ADMIN_EMAILS"],
      required: true,
      secret: false,
      detail: adminEmails
        ? `${adminEmails.split(",").filter(Boolean).length} admin email value${adminEmails.split(",").filter(Boolean).length === 1 ? "" : "s"} configured.`
        : "ADMIN_EMAILS is not set and the app will fall back to the default seeded admin.",
      recommendation:
        "Set ADMIN_EMAILS explicitly in production so dashboard access does not depend on defaults.",
    },
    {
      id: "vercel-runtime",
      status: getValue(env, "VERCEL")
        ? getValue(env, "VERCEL_ENV") === "production"
          ? "ready"
          : "review"
        : "review",
      category: "runtime",
      label: "Vercel runtime",
      envKeys: ["VERCEL", "VERCEL_ENV", "VERCEL_PROJECT_PRODUCTION_URL"],
      required: true,
      secret: false,
      detail: getValue(env, "VERCEL")
        ? `Running on Vercel ${getValue(env, "VERCEL_ENV") || "unknown"} runtime.`
        : "Current process is not running on Vercel.",
      recommendation:
        "Run this preflight from production or pull production envs locally before approving release.",
    },
    {
      id: "node-runtime",
      status: runtime === "edge" ? "blocked" : "ready",
      category: "runtime",
      label: "Node runtime",
      envKeys: ["NEXT_RUNTIME"],
      required: true,
      secret: false,
      detail:
        runtime === "edge"
          ? "Edge runtime detected for a flow that depends on Better Auth, Brevo, and LibSQL Node-compatible behavior."
          : `Runtime is ${runtime}.`,
      recommendation:
        "Keep auth, email, and database operations on the Node.js runtime.",
    },
    {
      id: "server-actions-key",
      status:
        productionRuntime && !getValue(env, "NEXT_SERVER_ACTIONS_ENCRYPTION_KEY")
          ? "review"
          : "ready",
      category: "runtime",
      label: "Server actions encryption",
      envKeys: ["NEXT_SERVER_ACTIONS_ENCRYPTION_KEY"],
      required: false,
      secret: true,
      detail: getValue(env, "NEXT_SERVER_ACTIONS_ENCRYPTION_KEY")
        ? "Stable server actions encryption key is present."
        : "Stable server actions encryption key is not configured.",
      recommendation:
        "Set NEXT_SERVER_ACTIONS_ENCRYPTION_KEY when promoting identical builds across production instances.",
    },
  ] satisfies DeployEnvironmentPreflightRow[];
}

function getDatabaseUrlStatus(
  databaseUrl: string,
  productionRuntime: boolean,
): DeployEnvironmentPreflightStatus {
  if (!databaseUrl) {
    return "blocked";
  }

  if (productionRuntime && !databaseUrl.startsWith("libsql://")) {
    return "review";
  }

  return "ready";
}

function getAppUrlStatus(input: {
  appOrigin: string | null;
  betterAuthOrigin: string | null;
  publicAppOrigin: string | null;
  productionRuntime: boolean;
}): DeployEnvironmentPreflightStatus {
  if (!input.appOrigin) {
    return "blocked";
  }

  if (input.productionRuntime && !input.appOrigin.startsWith("https://")) {
    return "review";
  }

  if (
    input.betterAuthOrigin &&
    input.publicAppOrigin &&
    input.betterAuthOrigin !== input.publicAppOrigin
  ) {
    return "review";
  }

  return "ready";
}

function getAppOrigin(env: PreflightEnv) {
  return (
    getOrigin(getValue(env, "BETTER_AUTH_URL")) ??
    getOrigin(getValue(env, "NEXT_PUBLIC_APP_URL")) ??
    getOrigin(getVercelOrigin(env))
  );
}

function getVercelOrigin(env: PreflightEnv) {
  const productionUrl = getValue(env, "VERCEL_PROJECT_PRODUCTION_URL");
  const deploymentUrl = getValue(env, "VERCEL_URL");
  const value = productionUrl || deploymentUrl;

  return value ? `https://${value.replace(/^https?:\/\//, "")}` : "";
}

function getOrigin(value: string) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function getSafeDatabaseTarget(value: string) {
  if (!value) {
    return "not configured";
  }

  try {
    const url = new URL(value);
    return url.protocol === "file:" ? "local sqlite file" : url.host;
  } catch {
    return value.startsWith("file:") ? "local sqlite file" : "configured URL";
  }
}

function getValue(env: PreflightEnv, key: string) {
  return env[key]?.trim() ?? "";
}

function maskSecret(value: string) {
  if (value.length <= 8) {
    return "present";
  }

  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function isPlaceholder(value: string) {
  return /^(replace|your|change|todo|example|test)[-_]/i.test(value);
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
export const dxRuntimeExports = Object.freeze({ getDeployEnvironmentPreflightReport });
export const dxLinkedDependencies = Object.freeze([]);
export default dxSourceModule;
