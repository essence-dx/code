
export const dxSourceText = "type SendBrevoEmailInput = {\n  to: string;\n  subject: string;\n  html: string;\n  text: string;\n};\n\nexport async function sendBrevoEmail({\n  to,\n  subject,\n  html,\n  text,\n}: SendBrevoEmailInput) {\n  const apiKey = process.env.BREVO_API_KEY;\n  const senderEmail = process.env.BREVO_SENDER_EMAIL;\n  const senderName = process.env.BREVO_SENDER_NAME ?? \"Essence\";\n\n  if (!apiKey) {\n    throw new Error(\"BREVO_API_KEY is required to send verification email.\");\n  }\n\n  if (!senderEmail) {\n    throw new Error(\"BREVO_SENDER_EMAIL is required to send verification email.\");\n  }\n\n  const response = await fetch(\"https://api.brevo.com/v3/smtp/email\", {\n    method: \"POST\",\n    headers: {\n      accept: \"application/json\",\n      \"api-key\": apiKey,\n      \"content-type\": \"application/json\",\n    },\n    body: JSON.stringify({\n      sender: {\n        email: senderEmail,\n        name: senderName,\n      },\n      to: [{ email: to }],\n      subject,\n      htmlContent: html,\n      textContent: text,\n    }),\n  });\n\n  if (!response.ok) {\n    const detail = await response.text().catch(() => \"\");\n    throw new Error(\n      `Brevo email delivery failed with status ${response.status}${\n        detail ? `: ${detail}` : \"\"\n      }`,\n    );\n  }\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/lib/brevo-email.ts",
  "chunk_output": ".dx/www/output/source-routes/share--token/modules/src-lib-brevo-email-ts-8d89dcbf81714307.mjs",
  "kind": "ts",
  "hash": "8d89dcbf81714307",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": false,
  "transform_kind": "metadata-only",
  "runtime_exports": [],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/lib/brevo-email.ts",
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
export const dxLinkedDependencies = Object.freeze([]);
export default dxSourceModule;
