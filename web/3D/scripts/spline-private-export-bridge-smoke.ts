import { strict as assert } from "node:assert";
import { POST as conformanceSplineImportRoute } from "@/app/api/spline/import/conformance/route";
import { POST as openSplineImportRoute } from "@/app/api/spline/import/open/route";
import { GET as healthSplineImportRoute } from "@/app/api/spline/import/health/route";
import { sceneDocumentSchema } from "@/features/editor/types";
import { normalizeAuthorizedSplineExportPayload } from "@/features/editor/utils/spline-authorized-import";
import { startMockSplineExportBridge } from "./spline-private-export-bridge-harness";

const splineCodeUrl = "https://prod.spline.design/PrivateBridge/scene.splinecode";
const privateEditorFileUrl = "https://app.spline.design/file/mock-private-001";
const normalizedBridgePayload = normalizeAuthorizedSplineExportPayload({
  height: 3.25,
  name: "Provider Wrapped Scene",
  spline: {
    runtimeUrl: splineCodeUrl,
    width: 5.5,
  },
});

assert.deepEqual(normalizedBridgePayload, {
  height: 3.25,
  name: "Provider Wrapped Scene",
  runtimeUrl: splineCodeUrl,
  width: 5.5,
});
assert.throws(() => normalizeAuthorizedSplineExportPayload({ document: { objects: [] } }), /invalid export payload/i);

const bridge = startMockSplineExportBridge({
  projectName: "Mock Private Spline Project",
  runtimeUrl: splineCodeUrl,
});
const routeAccessToken = "local-route-access-token";
const oldImportEndpoint = process.env.SPLINE_IMPORT_EXPORT_ENDPOINT;
const oldImportRequestToken = process.env.SPLINE_IMPORT_REQUEST_TOKEN;
const oldImportToken = process.env.SPLINE_IMPORT_API_TOKEN;

try {
  process.env.SPLINE_IMPORT_EXPORT_ENDPOINT = bridge.url;
  process.env.SPLINE_IMPORT_API_TOKEN = bridge.token;
  process.env.SPLINE_IMPORT_REQUEST_TOKEN = routeAccessToken;

  const healthResponse = await healthSplineImportRoute(
    new Request("https://essence.example/api/spline/import/health?probe=1") as never,
  );
  const healthPayload = (await healthResponse.json()) as {
    health?: {
      privateEditorFileImport?: {
        acceptedFormats?: string[];
        provider?: string;
        status?: string;
      };
    };
  };

  assert.equal(healthResponse.status, 200);
  assert.equal(healthPayload.health?.privateEditorFileImport?.status, "ready");
  assert.equal(healthPayload.health?.privateEditorFileImport?.provider, "Local Mock Spline Export Bridge");
  assert.deepEqual(healthPayload.health?.privateEditorFileImport?.acceptedFormats, ["public-url", "splinecode"]);

  const openResponse = await openSplineImportRoute(
    new Request("https://essence.example/api/spline/import/open", {
      body: JSON.stringify({ input: privateEditorFileUrl }),
      headers: {
        Authorization: `Bearer ${routeAccessToken}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    }) as never,
  );
  const openPayload = (await openResponse.json()) as {
    document?: unknown;
    importSource?: { bridge?: string; inputKind?: string; privateFileId?: string; sourceUrl?: string };
    spline?: { name?: string; runtimeUrl?: string };
  };

  assert.equal(openResponse.status, 200);
  assert.equal(openPayload.spline?.name, "Mock Private Spline Project");
  assert.equal(openPayload.spline?.runtimeUrl, splineCodeUrl);
  assert.equal(openPayload.importSource?.inputKind, "private-editor-file");
  assert.equal(openPayload.importSource?.bridge, "authorized-exporter");
  assert.equal(openPayload.importSource?.privateFileId, "mock-private-001");
  assert.equal(openPayload.importSource?.sourceUrl, privateEditorFileUrl);
  sceneDocumentSchema.parse(openPayload.document);

  const conformanceResponse = await conformanceSplineImportRoute(
    new Request("https://essence.example/api/spline/import/conformance", {
      body: JSON.stringify({ input: privateEditorFileUrl }),
      headers: {
        Authorization: `Bearer ${routeAccessToken}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    }) as never,
  );
  const conformancePayload = (await conformanceResponse.json()) as {
    document?: { name?: string; objectCount?: number; primaryObjectId?: string };
    ok?: boolean;
    privateFileId?: string;
    provider?: string;
    runtime?: { runtimeUrl?: string };
    status?: string;
  };

  assert.equal(conformanceResponse.status, 200);
  assert.equal(conformancePayload.ok, true);
  assert.equal(conformancePayload.status, "ready");
  assert.equal(conformancePayload.privateFileId, "mock-private-001");
  assert.equal(conformancePayload.provider, "Local Mock Spline Export Bridge");
  assert.equal(conformancePayload.document?.name, "Mock Private Spline Project");
  assert.equal(conformancePayload.document?.objectCount, 3);
  assert.equal(conformancePayload.runtime?.runtimeUrl, splineCodeUrl);

  assert.equal(bridge.requests.length, 4);
  assert.equal(bridge.requests[0]?.body.action, "health-check");
  assert.equal(bridge.requests[1]?.body.fileId, "mock-private-001");
  assert.equal(bridge.requests[1]?.body.sourceUrl, privateEditorFileUrl);
  assert.equal(bridge.requests[1]?.body.requestedFormat, "public-runtime-export");
  assert.equal(bridge.requests[1]?.authorization, `Bearer ${bridge.token}`);
  assert.equal(bridge.requests[2]?.body.action, "health-check");
  assert.equal(bridge.requests[3]?.body.fileId, "mock-private-001");
  assert.equal(bridge.requests[3]?.body.sourceUrl, privateEditorFileUrl);
  assert.equal(bridge.requests[3]?.body.requestedFormat, "public-runtime-export");
  assert.equal(bridge.requests[3]?.authorization, `Bearer ${bridge.token}`);

  const invalidBridge = startMockSplineExportBridge({
    exportPayload: {
      spline: {
        name: "Missing Runtime URL",
      },
    },
    runtimeUrl: splineCodeUrl,
  });

  try {
    process.env.SPLINE_IMPORT_EXPORT_ENDPOINT = invalidBridge.url;
    process.env.SPLINE_IMPORT_API_TOKEN = invalidBridge.token;

    const invalidOpenResponse = await openSplineImportRoute(
      new Request("https://essence.example/api/spline/import/open", {
        body: JSON.stringify({ input: privateEditorFileUrl }),
        headers: {
          Authorization: `Bearer ${routeAccessToken}`,
          "Content-Type": "application/json",
        },
        method: "POST",
      }) as never,
    );
    const invalidOpenPayload = (await invalidOpenResponse.json()) as { error?: string };

    assert.equal(invalidOpenResponse.status, 422);
    assert.match(invalidOpenPayload.error ?? "", /invalid export payload/i);

    const invalidConformanceResponse = await conformanceSplineImportRoute(
      new Request("https://essence.example/api/spline/import/conformance", {
        body: JSON.stringify({ input: privateEditorFileUrl }),
        headers: {
          Authorization: `Bearer ${routeAccessToken}`,
          "Content-Type": "application/json",
        },
        method: "POST",
      }) as never,
    );
    const invalidConformancePayload = (await invalidConformanceResponse.json()) as { ok?: boolean; status?: string };

    assert.equal(invalidConformanceResponse.status, 422);
    assert.equal(invalidConformancePayload.ok, false);
    assert.equal(invalidConformancePayload.status, "invalid-response");
  } finally {
    invalidBridge.stop();
    process.env.SPLINE_IMPORT_EXPORT_ENDPOINT = bridge.url;
    process.env.SPLINE_IMPORT_API_TOKEN = bridge.token;
    process.env.SPLINE_IMPORT_REQUEST_TOKEN = routeAccessToken;
  }
} finally {
  bridge.stop();

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
}

console.log("spline private export bridge smoke passed");
