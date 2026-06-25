import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { apiJson, corsPreflight, readAllowedApiOrigins, withCors } from "../src/lib/http/cors";
import { InvalidJsonRequestError, readJsonRequest } from "../src/lib/http/request-json";
import { InvalidProjectIdError, parseProjectIdParam } from "../src/lib/projects/project-id";

function read(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const cors = read("src/lib/http/cors.ts");
assert.match(cors, /ESSENCE_ALLOWED_API_ORIGINS/);
assert.match(cors, /tauri:\/\/localhost/);
assert.match(cors, /Access-Control-Allow-Credentials/);
assert.match(cors, /Access-Control-Allow-Origin/);
assert.match(cors, /corsPreflight/);
assert.match(cors, /apiJson/);

for (const path of [
  "src/app/api/ai/editor/route.ts",
  "src/app/api/ai/speech/route.ts",
  "src/app/api/projects/route.ts",
]) {
  const source = read(path);
  assert.match(source, /apiJson/, `${path} must send API JSON through the CORS helper.`);
  assert.match(source, /corsPreflight/, `${path} must answer preflight requests.`);
  assert.match(source, /export function OPTIONS/, `${path} must export OPTIONS.`);
  assert.match(source, /readJsonRequest/, `${path} must use the safe JSON request parser.`);
  assert.match(source, /InvalidJsonRequestError/, `${path} must handle invalid JSON as a client error.`);
}

for (const path of ["src/app/api/projects/[id]/route.ts"]) {
  const source = read(path);
  assert.match(source, /apiJson/, `${path} must send API JSON through the CORS helper.`);
  assert.match(source, /corsPreflight/, `${path} must answer preflight requests.`);
  assert.match(source, /export function OPTIONS/, `${path} must export OPTIONS.`);
  assert.match(source, /parseProjectIdParam/, `${path} must validate project route ids.`);
  assert.match(source, /InvalidProjectIdError/, `${path} must handle invalid project ids as a client error.`);
}

for (const path of [
  "src/app/api/ai/transcribe/route.ts",
  "src/app/api/stock/search/route.ts",
  "src/app/api/stock/download/route.ts",
]) {
  const source = read(path);
  assert.match(source, /corsPreflight/, `${path} must answer preflight requests.`);
  assert.match(source, /export function OPTIONS/, `${path} must export OPTIONS.`);
  assert.match(source, /apiJson|withCors/, `${path} must send responses through a CORS helper.`);
}

const authRoute = read("src/app/api/auth/[...all]/route.ts");
assert.match(authRoute, /withCors/);
assert.match(authRoute, /corsPreflight/);
assert.match(authRoute, /export function OPTIONS/);

const authServer = read("src/lib/auth/server.ts");
assert.match(authServer, /readAllowedApiOrigins/);
assert.doesNotMatch(authServer, /requestOrigin/);
assert.match(authServer, /defaultCookieAttributes/);

const envExample = read(".env.example");
assert.match(envExample, /ESSENCE_ALLOWED_API_ORIGINS=/);

const preflight = corsPreflight(new Request("https://studio.example/api/projects", { headers: { origin: "tauri://localhost" } }));
assert.equal(preflight.status, 204);
assert.equal(preflight.headers.get("access-control-allow-origin"), "tauri://localhost");
assert.equal(preflight.headers.get("access-control-allow-credentials"), "true");

const rejectedPreflight = corsPreflight(new Request("https://studio.example/api/projects", { headers: { origin: "https://untrusted.example" } }));
assert.equal(rejectedPreflight.status, 403);
assert.equal(rejectedPreflight.headers.get("access-control-allow-origin"), null);

const sameOriginPreflight = corsPreflight(new Request("https://studio.example/api/projects"));
assert.equal(sameOriginPreflight.status, 204);
assert.equal(sameOriginPreflight.headers.get("access-control-allow-origin"), null);

const json = apiJson(new Request("https://studio.example/api/projects", { headers: { origin: "http://localhost:3000" } }), { ok: true });
assert.equal(json.headers.get("access-control-allow-origin"), "http://localhost:3000");
assert.equal(json.headers.get("access-control-allow-credentials"), "true");

const response = withCors(
  new Request("https://studio.example/api/projects", { headers: { origin: "https://untrusted.example" } }),
  new Response("ok"),
);
assert.equal(response.headers.get("access-control-allow-origin"), null);

assert.ok(readAllowedApiOrigins().includes("tauri://localhost"));

assert.deepEqual(await readJsonRequest(new Request("https://studio.example/api/projects", { method: "POST", body: "{\"ok\":true}" })), {
  ok: true,
});
await assert.rejects(
  () => readJsonRequest(new Request("https://studio.example/api/projects", { method: "POST", body: "{" })),
  InvalidJsonRequestError,
);
assert.equal(parseProjectIdParam("project_123"), "project_123");
assert.throws(() => parseProjectIdParam(""), InvalidProjectIdError);
assert.throws(() => parseProjectIdParam("x".repeat(161)), InvalidProjectIdError);

console.log("API CORS guard passed.");
