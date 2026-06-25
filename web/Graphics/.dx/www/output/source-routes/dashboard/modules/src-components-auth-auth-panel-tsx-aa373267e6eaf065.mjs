import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-components-ui-alert-tsx-2d34801893b59373.mjs";
import { dxSourceModule as dep1, dxRuntimeExports as dep1Runtime } from "./src-components-ui-button-tsx-a045a54d4568e98d.mjs";
import { dxSourceModule as dep2, dxRuntimeExports as dep2Runtime } from "./src-components-ui-input-tsx-5c00dcef4bc2ae59.mjs";
import { dxSourceModule as dep3, dxRuntimeExports as dep3Runtime } from "./src-components-ui-label-tsx-e0903213582531e3.mjs";
import { dxSourceModule as dep4, dxRuntimeExports as dep4Runtime } from "./src-components-ui-separator-tsx-ce29dff12ce11a0a.mjs";
import { dxSourceModule as dep5, dxRuntimeExports as dep5Runtime } from "./src-lib-auth-client-ts-cb0514e33f1d1021.mjs";
import { dxSourceModule as dep6, dxRuntimeExports as dep6Runtime } from "./src-lib-forge-icons-lucide-react-tsx-b9b0a8debf22abe8.mjs";
export const dxSourceText = "\"use client\";\n\nimport { FormEvent, useState, useTransition } from \"react\";\nimport { useRouter } from \"next/navigation\";\nimport { Frame, Loader2, MailCheck } from \"lucide-react\";\nimport { Alert, AlertDescription } from \"@/components/ui/alert\";\nimport { Button } from \"@/components/ui/button\";\nimport { Input } from \"@/components/ui/input\";\nimport { Label } from \"@/components/ui/label\";\nimport { Separator } from \"@/components/ui/separator\";\nimport { authClient } from \"@/lib/auth-client\";\n\ntype AuthMode = \"sign-in\" | \"sign-up\" | \"verify\";\n\nexport function AuthPanel() {\n  const router = useRouter();\n  const [mode, setMode] = useState<AuthMode>(\"sign-in\");\n  const [error, setError] = useState<string | null>(null);\n  const [notice, setNotice] = useState<string | null>(null);\n  const [verificationEmail, setVerificationEmail] = useState(\"\");\n  const [isPending, startTransition] = useTransition();\n\n  function handleSubmit(event: FormEvent<HTMLFormElement>) {\n    event.preventDefault();\n    setError(null);\n    setNotice(null);\n\n    const formData = new FormData(event.currentTarget);\n    const name = String(formData.get(\"name\") ?? \"\").trim();\n    const email = String(formData.get(\"email\") ?? \"\").trim();\n    const otp = String(formData.get(\"otp\") ?? \"\").trim();\n    const password = String(formData.get(\"password\") ?? \"\");\n\n    startTransition(async () => {\n      try {\n        if (mode === \"verify\") {\n          await verifyOtp(email, otp);\n          return;\n        }\n\n        if (mode === \"sign-up\") {\n          const response = await authClient.signUp.email({\n            name,\n            email,\n            password,\n          });\n\n          if (response.error) {\n            setError(response.error.message ?? \"Account creation failed.\");\n            return;\n          }\n\n          setVerificationEmail(email);\n          setMode(\"verify\");\n          setNotice(\"We sent a verification code to your email.\");\n          return;\n        }\n\n        const response = await authClient.signIn.email({ email, password });\n\n        if (response.error) {\n          const message = response.error.message ?? \"Authentication failed.\";\n\n          if (isVerificationError(message)) {\n            await sendVerificationOtp(email);\n            setVerificationEmail(email);\n            setMode(\"verify\");\n            setNotice(\"We sent a fresh verification code to your email.\");\n            return;\n          }\n\n          setError(message);\n          return;\n        }\n\n        router.refresh();\n      } catch (authError) {\n        setError(getErrorMessage(authError));\n      }\n    });\n  }\n\n  function resendVerificationCode() {\n    const email = verificationEmail.trim();\n\n    if (!email) {\n      setError(\"Enter your email before requesting a new code.\");\n      return;\n    }\n\n    setError(null);\n    setNotice(null);\n\n    startTransition(async () => {\n      try {\n        await sendVerificationOtp(email);\n        setNotice(\"A new verification code is on its way.\");\n      } catch (authError) {\n        setError(getErrorMessage(authError));\n      }\n    });\n  }\n\n  async function verifyOtp(email: string, otp: string) {\n    if (!email || !otp) {\n      setError(\"Enter your email and verification code.\");\n      return;\n    }\n\n    const response = await postAuthJson<{ status?: boolean }>(\n      \"/api/auth/email-otp/verify-email\",\n      {\n        email,\n        otp,\n      },\n    );\n\n    if (!response.status) {\n      setError(\"That verification code was not accepted.\");\n      return;\n    }\n\n    router.refresh();\n  }\n\n  return (\n    <main className=\"grid min-h-screen place-items-center bg-background px-4\">\n      <section className=\"w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-2xl shadow-black/30\">\n        <div className=\"flex items-center gap-3\">\n          <div className=\"grid size-10 place-items-center rounded-md border border-border bg-primary text-primary-foreground\">\n            <Frame className=\"size-5\" />\n          </div>\n          <div>\n            <h1 className=\"text-lg font-semibold\">Essence Figma</h1>\n            <p className=\"text-sm text-muted-foreground\">\n              Private design workspace\n            </p>\n          </div>\n        </div>\n\n        <Separator className=\"my-5\" />\n\n        <form className=\"space-y-4\" onSubmit={handleSubmit}>\n          {mode === \"sign-up\" ? (\n            <div className=\"space-y-2\">\n              <Label htmlFor=\"name\">Name</Label>\n              <Input id=\"name\" name=\"name\" autoComplete=\"name\" required />\n            </div>\n          ) : null}\n\n          <div className=\"space-y-2\">\n            <Label htmlFor=\"email\">Email</Label>\n            <Input\n              id=\"email\"\n              name=\"email\"\n              type=\"email\"\n              autoComplete=\"email\"\n              value={mode === \"verify\" ? verificationEmail : undefined}\n              onChange={\n                mode === \"verify\"\n                  ? (event) => setVerificationEmail(event.currentTarget.value)\n                  : undefined\n              }\n              required\n            />\n          </div>\n\n          {mode === \"verify\" ? (\n            <div className=\"space-y-2\">\n              <Label htmlFor=\"otp\">Verification code</Label>\n              <Input\n                id=\"otp\"\n                name=\"otp\"\n                inputMode=\"numeric\"\n                maxLength={6}\n                pattern=\"[0-9]{6}\"\n                placeholder=\"000000\"\n                required\n              />\n            </div>\n          ) : (\n            <div className=\"space-y-2\">\n              <Label htmlFor=\"password\">Password</Label>\n              <Input\n                id=\"password\"\n                name=\"password\"\n                type=\"password\"\n                autoComplete={\n                  mode === \"sign-up\" ? \"new-password\" : \"current-password\"\n                }\n                minLength={8}\n                required\n              />\n            </div>\n          )}\n\n          {notice ? (\n            <Alert>\n              <MailCheck className=\"size-4\" />\n              <AlertDescription>{notice}</AlertDescription>\n            </Alert>\n          ) : null}\n\n          {error ? (\n            <Alert variant=\"destructive\">\n              <AlertDescription>{error}</AlertDescription>\n            </Alert>\n          ) : null}\n\n          <Button className=\"w-full\" type=\"submit\" disabled={isPending}>\n            {isPending ? <Loader2 className=\"size-4 animate-spin\" /> : null}\n            {getSubmitLabel(mode)}\n          </Button>\n        </form>\n\n        <div className=\"mt-4 flex items-center justify-between text-sm\">\n          <span className=\"text-muted-foreground\">\n            {getModeHint(mode)}\n          </span>\n          <div className=\"flex items-center gap-1\">\n            {mode === \"verify\" ? (\n              <Button\n                type=\"button\"\n                variant=\"ghost\"\n                size=\"sm\"\n                onClick={resendVerificationCode}\n                disabled={isPending}\n              >\n                Resend\n              </Button>\n            ) : null}\n            <Button\n              type=\"button\"\n              variant=\"ghost\"\n              size=\"sm\"\n              onClick={() => {\n                setError(null);\n                setNotice(null);\n                setMode((current) =>\n                  current === \"sign-in\" ? \"sign-up\" : \"sign-in\",\n                );\n              }}\n            >\n              {mode === \"sign-up\" ? \"Sign in\" : \"Create one\"}\n            </Button>\n          </div>\n        </div>\n      </section>\n    </main>\n  );\n}\n\nasync function sendVerificationOtp(email: string) {\n  await postAuthJson(\"/api/auth/email-otp/send-verification-otp\", {\n    email,\n    type: \"email-verification\",\n  });\n}\n\nasync function postAuthJson<TResponse>(\n  path: string,\n  body: Record<string, string>,\n) {\n  const response = await fetch(path, {\n    method: \"POST\",\n    headers: {\n      \"content-type\": \"application/json\",\n    },\n    body: JSON.stringify(body),\n  });\n  const payload = await response.json().catch(() => null);\n\n  if (!response.ok) {\n    throw new Error(getPayloadMessage(payload) ?? \"Authentication request failed.\");\n  }\n\n  const errorMessage = getNestedErrorMessage(payload);\n\n  if (errorMessage) {\n    throw new Error(errorMessage);\n  }\n\n  return payload as TResponse;\n}\n\nfunction getNestedErrorMessage(payload: unknown) {\n  if (!payload || typeof payload !== \"object\") {\n    return null;\n  }\n\n  const error = (payload as { error?: unknown }).error;\n\n  if (error && typeof error === \"object\") {\n    const message = (error as { message?: unknown }).message;\n    return typeof message === \"string\" ? message : null;\n  }\n\n  return null;\n}\n\nfunction getPayloadMessage(payload: unknown) {\n  if (!payload || typeof payload !== \"object\") {\n    return null;\n  }\n\n  const message = (payload as { message?: unknown }).message;\n\n  if (typeof message === \"string\") {\n    return message;\n  }\n\n  return getNestedErrorMessage(payload);\n}\n\nfunction isVerificationError(message: string) {\n  return /verif/i.test(message);\n}\n\nfunction getErrorMessage(error: unknown) {\n  return error instanceof Error ? error.message : \"Authentication failed.\";\n}\n\nfunction getSubmitLabel(mode: AuthMode) {\n  if (mode === \"sign-up\") {\n    return \"Create account\";\n  }\n\n  if (mode === \"verify\") {\n    return \"Verify email\";\n  }\n\n  return \"Sign in\";\n}\n\nfunction getModeHint(mode: AuthMode) {\n  if (mode === \"sign-up\") {\n    return \"Already registered?\";\n  }\n\n  if (mode === \"verify\") {\n    return \"Need another code?\";\n  }\n\n  return \"Need an account?\";\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/components/auth/auth-panel.tsx",
  "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-components-auth-auth-panel-tsx-aa373267e6eaf065.mjs",
  "kind": "tsx",
  "hash": "aa373267e6eaf065",
  "dependencies": [
    {
      "specifier": "@/components/ui/alert",
      "resolved_path": "src/components/ui/alert.tsx",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-components-ui-alert-tsx-2d34801893b59373.mjs",
      "kind": "tsx",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/components/ui/button",
      "resolved_path": "src/components/ui/button.tsx",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-components-ui-button-tsx-a045a54d4568e98d.mjs",
      "kind": "tsx",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/components/ui/input",
      "resolved_path": "src/components/ui/input.tsx",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-components-ui-input-tsx-5c00dcef4bc2ae59.mjs",
      "kind": "tsx",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/components/ui/label",
      "resolved_path": "src/components/ui/label.tsx",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-components-ui-label-tsx-e0903213582531e3.mjs",
      "kind": "tsx",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/components/ui/separator",
      "resolved_path": "src/components/ui/separator.tsx",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-components-ui-separator-tsx-ce29dff12ce11a0a.mjs",
      "kind": "tsx",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/lib/auth-client",
      "resolved_path": "src/lib/auth-client.ts",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-lib-auth-client-ts-cb0514e33f1d1021.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "lucide-react",
      "resolved_path": "src/lib/forge/icons/lucide-react.tsx",
      "chunk_output": ".dx/www/output/source-routes/dashboard/modules/src-lib-forge-icons-lucide-react-tsx-b9b0a8debf22abe8.mjs",
      "kind": "tsx",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "next/navigation",
      "resolved_path": null,
      "chunk_output": null,
      "kind": "compiler-intrinsic",
      "resolver_source": "compiler-intrinsic",
      "node_modules_required": false
    },
    {
      "specifier": "react",
      "resolved_path": null,
      "chunk_output": null,
      "kind": "compiler-intrinsic",
      "resolver_source": "compiler-intrinsic",
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
    "source_path": "src/components/auth/auth-panel.tsx",
    "source_kind": "tsx",
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
        "value": "use client",
        "scope": "module-prologue",
        "line": 1,
        "column": 1
      }
    ],
    "static_imports": [
      {
        "specifier": "react",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "next/navigation",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "lucide-react",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/components/ui/alert",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/components/ui/button",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/components/ui/input",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/components/ui/label",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/components/ui/separator",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/lib/auth-client",
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
      "AuthPanel"
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
