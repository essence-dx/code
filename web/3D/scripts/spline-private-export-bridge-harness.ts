type MockSplineExportBridgeServer = {
  stop: (force?: boolean) => void;
  url: URL;
};

declare const Bun: {
  serve: (options: {
    fetch: (request: Request) => Promise<Response> | Response;
    hostname?: string;
    port?: number;
  }) => MockSplineExportBridgeServer;
};

export interface MockSplineExportBridgeRequest {
  authorization: string | null;
  body: Record<string, unknown>;
  pathname: string;
}

export interface MockSplineExportBridge {
  requests: MockSplineExportBridgeRequest[];
  stop: () => void;
  token: string;
  url: string;
}

export interface MockSplineExportBridgeOptions {
  exportPayload?: unknown;
  height?: number;
  projectName?: string;
  runtimeUrl: string;
  token?: string;
  width?: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function jsonResponse(body: unknown, init?: ResponseInit) {
  return Response.json(body, init);
}

async function readRequestBody(request: Request) {
  const body = await request.json().catch(() => null);

  return isRecord(body) ? body : {};
}

export function startMockSplineExportBridge(options: MockSplineExportBridgeOptions): MockSplineExportBridge {
  const requests: MockSplineExportBridgeRequest[] = [];
  const token = options.token ?? "local-spline-import-token";
  const projectName = options.projectName ?? "Mock Private Spline Project";
  const width = options.width ?? 4.5;
  const height = options.height ?? 2.75;
  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    async fetch(request) {
      const requestUrl = new URL(request.url);
      const body = await readRequestBody(request);
      const authorization = request.headers.get("authorization");

      requests.push({
        authorization,
        body,
        pathname: requestUrl.pathname,
      });

      if (request.method !== "POST") {
        return jsonResponse({ error: "Mock Spline export bridge only accepts POST requests." }, { status: 405 });
      }

      if (authorization !== `Bearer ${token}`) {
        return jsonResponse({ error: "Unauthorized mock Spline export bridge request." }, { status: 401 });
      }

      if (body.action === "health-check") {
        return jsonResponse({
          acceptedFormats: ["public-url", "splinecode"],
          ok: true,
          provider: "Local Mock Spline Export Bridge",
        });
      }

      if (
        typeof body.fileId !== "string" ||
        typeof body.sourceUrl !== "string" ||
        body.requestedFormat !== "public-runtime-export"
      ) {
        return jsonResponse({ error: "Mock Spline export bridge needs a private file id and source URL." }, { status: 400 });
      }

      return jsonResponse(
        options.exportPayload ?? {
          spline: {
            height,
            name: projectName,
            runtimeUrl: options.runtimeUrl,
            width,
          },
        },
      );
    },
  });
  const endpointUrl = new URL("/spline-export", server.url).toString();

  return {
    requests,
    stop: () => server.stop(true),
    token,
    url: endpointUrl,
  };
}
