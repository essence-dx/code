import { strict as assert } from "node:assert";
import {
  createSplineImportDocumentFromInput,
  createSplineViewerHtml,
  createSplineImportFromInput,
  getSplineViewerEmbedPath,
  resolveSplineImportRequest,
} from "@/features/editor/utils/spline-import";
import { sceneDocumentSchema } from "@/features/editor/types";
import {
  createAuthorizedSplineImportDocumentFromInput,
  getSplineAuthorizedImportCapabilities,
  getSplineEditorFileReferenceFromInput,
} from "@/features/editor/utils/spline-authorized-import";
import { GET as capabilitiesSplineImportRoute } from "@/app/api/spline/import/capabilities/route";
import { POST as documentSplineImportRoute } from "@/app/api/spline/import/document/route";
import { GET as healthSplineImportRoute } from "@/app/api/spline/import/health/route";
import { POST as openSplineImportRoute } from "@/app/api/spline/import/open/route";
import { POST as resolveSplineImportRoute } from "@/app/api/spline/import/resolve/route";

const splineCodeUrl = "https://prod.spline.design/AbCdEf123/scene.splinecode";
const privateEditorFileUrl = "https://app.spline.design/file/abc123";
const splineCodeImport = createSplineImportFromInput(splineCodeUrl);

assert.equal(splineCodeImport.name, "Spline Scene AbCdEf123");
assert.equal(splineCodeImport.sourceUrl, splineCodeUrl);
assert.equal(splineCodeImport.runtimeUrl, splineCodeUrl);
assert.equal(splineCodeImport.renderMode, "spline-viewer");
assert.equal(splineCodeImport.embedUrl, getSplineViewerEmbedPath(splineCodeUrl));
assert.equal(splineCodeImport.width, 3.6);
assert.equal(splineCodeImport.height, 2.25);
assert.deepEqual(splineCodeImport.warnings, []);

const viewerSnippet = `
  <script type="module" src="https://unpkg.com/@splinetool/viewer/build/spline-viewer.js"></script>
  <spline-viewer loading="eager" url="${splineCodeUrl}"></spline-viewer>
`;
const snippetImport = createSplineImportFromInput(viewerSnippet);

assert.equal(snippetImport.sourceUrl, splineCodeUrl);
assert.equal(snippetImport.renderMode, "spline-viewer");

const publicUrl = "https://my.spline.design/interactive-product-card/";
const publicImport = createSplineImportFromInput(publicUrl);

assert.equal(publicImport.name, "Interactive Product Card");
assert.equal(publicImport.sourceUrl, publicUrl);
assert.equal(publicImport.runtimeUrl, publicUrl);
assert.equal(publicImport.renderMode, "iframe");
assert.equal(publicImport.embedUrl, publicUrl);

const apiPayloadImport = resolveSplineImportRequest({
  input: JSON.stringify({
    name: "Launch Hero",
    sceneUrl: splineCodeUrl,
  }),
});

assert.equal(apiPayloadImport.name, "Launch Hero");
assert.equal(apiPayloadImport.renderMode, "spline-viewer");

const documentImport = createSplineImportDocumentFromInput({
  input: JSON.stringify({
    name: "Launch Hero",
    sceneUrl: splineCodeUrl,
    width: 5,
    height: 3,
  }),
});

const importedSplineObject = documentImport.document.objects.find((object) => object.id === documentImport.primaryObjectId);

assert.equal(documentImport.document.name, "Launch Hero");
assert.equal(documentImport.spline.runtimeUrl, splineCodeUrl);
assert.equal(importedSplineObject?.kind, "spline");
assert.equal(importedSplineObject?.spline?.width, 5);
assert.equal(importedSplineObject?.spline?.height, 3);
assert.equal(documentImport.document.objects.filter((object) => object.kind === "spline").length, 1);
assert.ok(documentImport.document.activeCameraId);
assert.ok(documentImport.document.objects.some((object) => object.kind === "camera" && object.id === documentImport.document.activeCameraId));
sceneDocumentSchema.parse(documentImport.document);

const routeResponse = await resolveSplineImportRoute(
  new Request("https://essence.example/api/spline/import/resolve", {
    body: JSON.stringify({ input: splineCodeUrl }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  }) as never,
);
const routePayload = (await routeResponse.json()) as { spline?: { runtimeUrl?: string } };

assert.equal(routeResponse.status, 200);
assert.equal(routePayload.spline?.runtimeUrl, splineCodeUrl);

const documentRouteResponse = await documentSplineImportRoute(
  new Request("https://essence.example/api/spline/import/document", {
    body: JSON.stringify({
      input: {
        name: "Launch Hero",
        sceneUrl: splineCodeUrl,
      },
    }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  }) as never,
);
const documentRoutePayload = (await documentRouteResponse.json()) as {
  document?: { name?: string; objects?: { id?: string; kind?: string }[] };
  primaryObjectId?: string;
  spline?: { runtimeUrl?: string };
};

assert.equal(documentRouteResponse.status, 200);
assert.equal(documentRoutePayload.document?.name, "Launch Hero");
assert.equal(documentRoutePayload.spline?.runtimeUrl, splineCodeUrl);
assert.equal(
  documentRoutePayload.document?.objects?.find((object) => object.id === documentRoutePayload.primaryObjectId)?.kind,
  "spline",
);

const publicOpenRouteResponse = await openSplineImportRoute(
  new Request("https://essence.example/api/spline/import/open", {
    body: JSON.stringify({
      input: {
        name: "Launch Hero",
        sceneUrl: splineCodeUrl,
      },
    }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  }) as never,
);
const publicOpenRoutePayload = (await publicOpenRouteResponse.json()) as {
  document?: { name?: string };
  importSource?: { bridge?: string; inputKind?: string; sourceUrl?: string };
  spline?: { runtimeUrl?: string };
};

assert.equal(publicOpenRouteResponse.status, 200);
assert.equal(publicOpenRouteResponse.headers.get("Cache-Control"), "no-store");
assert.equal(publicOpenRoutePayload.document?.name, "Launch Hero");
assert.equal(publicOpenRoutePayload.spline?.runtimeUrl, splineCodeUrl);
assert.equal(publicOpenRoutePayload.importSource?.inputKind, "public-export");
assert.equal(publicOpenRoutePayload.importSource?.bridge, "none");
assert.equal(publicOpenRoutePayload.importSource?.sourceUrl, splineCodeUrl);

const privateFileReference = getSplineEditorFileReferenceFromInput(privateEditorFileUrl);

assert.equal(privateFileReference?.fileId, "abc123");
assert.equal(privateFileReference?.sourceUrl, privateEditorFileUrl);

let authorizedExporterCalled = false;
const authorizedDocumentImport = await createAuthorizedSplineImportDocumentFromInput(privateEditorFileUrl, {
  endpoint: "https://spline-export.example/import",
  token: "secret-token",
  fetcher: async (url, init) => {
    authorizedExporterCalled = true;
    const body = JSON.parse(String(init.body)) as { acceptedFormats?: string[]; fileId?: string; sourceUrl?: string };
    const headers = new Headers(init.headers);

    assert.equal(url, "https://spline-export.example/import");
    assert.equal(init.method, "POST");
    assert.equal(headers.get("authorization"), "Bearer secret-token");
    assert.equal(body.fileId, "abc123");
    assert.equal(body.sourceUrl, privateEditorFileUrl);
    assert.deepEqual(body.acceptedFormats, ["public-url", "viewer-embed", "splinecode", "json-scene-url"]);

    return Response.json({
      spline: {
        name: "Authorized Private Hero",
        runtimeUrl: splineCodeUrl,
        width: 4.25,
        height: 2.5,
      },
    });
  },
});

assert.equal(authorizedExporterCalled, true);
assert.equal(authorizedDocumentImport.document.name, "Authorized Private Hero");
assert.equal(authorizedDocumentImport.spline.runtimeUrl, splineCodeUrl);
assert.equal(authorizedDocumentImport.spline.width, 4.25);
assert.equal(authorizedDocumentImport.spline.height, 2.5);
sceneDocumentSchema.parse(authorizedDocumentImport.document);

let authorizedOpenRouteExporterCalled = false;
const oldOpenRouteFetch = globalThis.fetch;
const oldImportEndpoint = process.env.SPLINE_IMPORT_EXPORT_ENDPOINT;
const oldImportRequestToken = process.env.SPLINE_IMPORT_REQUEST_TOKEN;
const oldImportToken = process.env.SPLINE_IMPORT_API_TOKEN;

process.env.SPLINE_IMPORT_EXPORT_ENDPOINT = "https://spline-export.example/import";
process.env.SPLINE_IMPORT_API_TOKEN = "secret-token";
process.env.SPLINE_IMPORT_REQUEST_TOKEN = "route-secret-token";
globalThis.fetch = (async (url, init) => {
  authorizedOpenRouteExporterCalled = true;
  const body = JSON.parse(String(init?.body)) as { fileId?: string; requestedFormat?: string };
  const headers = new Headers(init?.headers);

  assert.equal(url, "https://spline-export.example/import");
  assert.equal(headers.get("authorization"), "Bearer secret-token");
  assert.equal(body.fileId, "abc123");
  assert.equal(body.requestedFormat, "public-runtime-export");

  return Response.json({
    spline: {
      name: "Private API Hero",
      runtimeUrl: splineCodeUrl,
    },
  });
}) as typeof fetch;

const privateOpenRouteResponse = await openSplineImportRoute(
  new Request("https://essence.example/api/spline/import/open", {
    body: JSON.stringify({ input: privateEditorFileUrl }),
    headers: {
      Authorization: "Bearer route-secret-token",
      "Content-Type": "application/json",
    },
    method: "POST",
  }) as never,
);
const privateOpenRoutePayload = (await privateOpenRouteResponse.json()) as {
  document?: { name?: string };
  importSource?: { bridge?: string; inputKind?: string; privateFileId?: string; sourceUrl?: string };
  spline?: { runtimeUrl?: string };
};

assert.equal(authorizedOpenRouteExporterCalled, true);
assert.equal(privateOpenRouteResponse.status, 200);
assert.equal(privateOpenRoutePayload.document?.name, "Private API Hero");
assert.equal(privateOpenRoutePayload.spline?.runtimeUrl, splineCodeUrl);
assert.equal(privateOpenRoutePayload.importSource?.inputKind, "private-editor-file");
assert.equal(privateOpenRoutePayload.importSource?.bridge, "authorized-exporter");
assert.equal(privateOpenRoutePayload.importSource?.privateFileId, "abc123");
assert.equal(privateOpenRoutePayload.importSource?.sourceUrl, privateEditorFileUrl);
sceneDocumentSchema.parse(privateOpenRoutePayload.document);

const privateOpenRouteUnauthorizedResponse = await openSplineImportRoute(
  new Request("https://essence.example/api/spline/import/open", {
    body: JSON.stringify({ input: privateEditorFileUrl }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  }) as never,
);
const privateOpenRouteUnauthorizedPayload = (await privateOpenRouteUnauthorizedResponse.json()) as { error?: string };

assert.equal(privateOpenRouteUnauthorizedResponse.status, 422);
assert.match(privateOpenRouteUnauthorizedPayload.error ?? "", /SPLINE_IMPORT_REQUEST_TOKEN|Authorization/);

globalThis.fetch = oldOpenRouteFetch;

await assert.rejects(
  () => createAuthorizedSplineImportDocumentFromInput(privateEditorFileUrl, {}),
  /SPLINE_IMPORT_EXPORT_ENDPOINT/,
);

assert.deepEqual(getSplineAuthorizedImportCapabilities({}), {
  environmentKeys: ["SPLINE_IMPORT_EXPORT_ENDPOINT", "SPLINE_IMPORT_API_TOKEN", "SPLINE_IMPORT_REQUEST_TOKEN"],
  privateEditorFileImport: false,
  publicExportImport: true,
});

assert.deepEqual(
  getSplineAuthorizedImportCapabilities({
    endpoint: "https://spline-export.example/import",
    token: "secret-token",
  }),
  {
    environmentKeys: ["SPLINE_IMPORT_EXPORT_ENDPOINT", "SPLINE_IMPORT_API_TOKEN", "SPLINE_IMPORT_REQUEST_TOKEN"],
    privateEditorFileImport: false,
    publicExportImport: true,
  },
);

assert.deepEqual(
  getSplineAuthorizedImportCapabilities({
    endpoint: "https://spline-export.example/import",
    requestToken: "route-secret-token",
    token: "secret-token",
  }),
  {
    environmentKeys: ["SPLINE_IMPORT_EXPORT_ENDPOINT", "SPLINE_IMPORT_API_TOKEN", "SPLINE_IMPORT_REQUEST_TOKEN"],
    privateEditorFileImport: true,
    publicExportImport: true,
  },
);

delete process.env.SPLINE_IMPORT_EXPORT_ENDPOINT;
delete process.env.SPLINE_IMPORT_API_TOKEN;
delete process.env.SPLINE_IMPORT_REQUEST_TOKEN;

const disabledCapabilitiesResponse = await capabilitiesSplineImportRoute();
const disabledCapabilitiesPayload = (await disabledCapabilitiesResponse.json()) as {
  capabilities?: {
    environmentKeys?: string[];
    privateEditorFileImport?: boolean;
    publicExportImport?: boolean;
  };
};

assert.equal(disabledCapabilitiesResponse.status, 200);
assert.equal(disabledCapabilitiesResponse.headers.get("Cache-Control"), "no-store");
assert.equal(disabledCapabilitiesPayload.capabilities?.publicExportImport, true);
assert.equal(disabledCapabilitiesPayload.capabilities?.privateEditorFileImport, false);
assert.deepEqual(disabledCapabilitiesPayload.capabilities?.environmentKeys, ["SPLINE_IMPORT_EXPORT_ENDPOINT", "SPLINE_IMPORT_API_TOKEN", "SPLINE_IMPORT_REQUEST_TOKEN"]);

process.env.SPLINE_IMPORT_EXPORT_ENDPOINT = "https://spline-export.example/import";
process.env.SPLINE_IMPORT_API_TOKEN = "secret-token";
process.env.SPLINE_IMPORT_REQUEST_TOKEN = "route-secret-token";

const enabledCapabilitiesResponse = await capabilitiesSplineImportRoute();
const enabledCapabilitiesPayload = (await enabledCapabilitiesResponse.json()) as {
  capabilities?: {
    privateEditorFileImport?: boolean;
    publicExportImport?: boolean;
  };
};

assert.equal(enabledCapabilitiesResponse.status, 200);
assert.equal(enabledCapabilitiesPayload.capabilities?.publicExportImport, true);
assert.equal(enabledCapabilitiesPayload.capabilities?.privateEditorFileImport, true);

const healthResponse = await healthSplineImportRoute();
const healthPayload = (await healthResponse.json()) as {
  health?: {
    privateEditorFileImport?: {
      configured?: boolean;
      message?: string;
      status?: string;
    };
    publicExportImport?: {
      status?: string;
    };
  };
};

assert.equal(healthResponse.status, 200);
assert.equal(healthResponse.headers.get("Cache-Control"), "no-store");
assert.equal(healthPayload.health?.publicExportImport?.status, "ready");
assert.equal(healthPayload.health?.privateEditorFileImport?.configured, true);
assert.equal(healthPayload.health?.privateEditorFileImport?.status, "configured");
assert.match(healthPayload.health?.privateEditorFileImport?.message ?? "", /Private Spline editor-file bridge is configured/);

const oldFetch = globalThis.fetch;
let healthProbeCalled = false;

globalThis.fetch = (async (url, init) => {
  healthProbeCalled = true;
  const headers = new Headers(init?.headers);
  const body = JSON.parse(String(init?.body)) as { acceptedFormats?: string[]; action?: string; requestedFormat?: string };

  assert.equal(url, "https://spline-export.example/import");
  assert.equal(init?.method, "POST");
  assert.equal(headers.get("authorization"), "Bearer secret-token");
  assert.equal(body.action, "health-check");
  assert.equal(body.requestedFormat, "capability-check");
  assert.deepEqual(body.acceptedFormats, ["public-url", "viewer-embed", "splinecode", "json-scene-url"]);

  return Response.json({
    acceptedFormats: ["public-url", "splinecode"],
    ok: true,
    provider: "Mock Spline Export Bridge",
  });
}) as typeof fetch;

const probedHealthResponse = await healthSplineImportRoute(
  new Request("https://essence.example/api/spline/import/health?probe=1") as never,
);
const probedHealthPayload = (await probedHealthResponse.json()) as {
  health?: {
    privateEditorFileImport?: {
      acceptedFormats?: string[];
      provider?: string;
      status?: string;
    };
  };
};

assert.equal(healthProbeCalled, true);
assert.equal(probedHealthResponse.status, 200);
assert.equal(probedHealthPayload.health?.privateEditorFileImport?.status, "ready");
assert.equal(probedHealthPayload.health?.privateEditorFileImport?.provider, "Mock Spline Export Bridge");
assert.deepEqual(probedHealthPayload.health?.privateEditorFileImport?.acceptedFormats, ["public-url", "splinecode"]);

globalThis.fetch = oldFetch;

if (oldImportEndpoint === undefined) {
  delete process.env.SPLINE_IMPORT_EXPORT_ENDPOINT;
} else {
  process.env.SPLINE_IMPORT_EXPORT_ENDPOINT = oldImportEndpoint;
}

if (oldImportRequestToken === undefined) {
  delete process.env.SPLINE_IMPORT_REQUEST_TOKEN;
} else {
  process.env.SPLINE_IMPORT_REQUEST_TOKEN = oldImportRequestToken;
}

if (oldImportToken === undefined) {
  delete process.env.SPLINE_IMPORT_API_TOKEN;
} else {
  process.env.SPLINE_IMPORT_API_TOKEN = oldImportToken;
}

const viewerHtml = createSplineViewerHtml(splineCodeUrl);

assert.match(viewerHtml, /<script type="module"/);
assert.match(viewerHtml, /<spline-viewer/);
assert.match(viewerHtml, /scene\.splinecode/);

assert.throws(() => createSplineImportFromInput("http://prod.spline.design/AbCdEf123/scene.splinecode"), /HTTPS/);
assert.throws(() => createSplineImportFromInput("https://example.com/scene.splinecode"), /Spline/);
assert.throws(() => createSplineImportFromInput("https://docs.spline.design/exporting-your-scene/web/exporting-as-code"), /Spline/);
assert.throws(() => createSplineImportFromInput(privateEditorFileUrl), /public export/);

const privateDocumentRouteResponse = await documentSplineImportRoute(
  new Request("https://essence.example/api/spline/import/document", {
    body: JSON.stringify({ input: privateEditorFileUrl }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  }) as never,
);
const privateDocumentRoutePayload = (await privateDocumentRouteResponse.json()) as { error?: string };

assert.equal(privateDocumentRouteResponse.status, 422);
assert.match(privateDocumentRoutePayload.error ?? "", /SPLINE_IMPORT_EXPORT_ENDPOINT/);

console.log("spline import resolver smoke passed");
