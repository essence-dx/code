# Essence Spline

An original 3D design workspace for creating, publishing, and embedding interactive scenes.

## Development

```bash
bun install
bun run dev
```

The current local dev server is running at http://localhost:3001.

For live cross-browser collaboration over WebSocket, run the socket runtime beside the Next.js app:

```bash
bun run collaboration:ws
```

The socket runtime uses the durable collaboration operation log for distributed fan-out. Local peers receive immediate broadcasts from the same Bun process; sockets connected to another process catch up through the shared database on an adaptive refresh loop.

Runtime health is exposed with no-store JSON responses at `http://localhost:3002/healthz` and `http://localhost:3002/readyz`. The snapshot includes socket counts, active project counts, delivery counters, fan-out refresh counters, the last runtime error, and the active tuning config.

## Checks

```bash
bun run typecheck
```

For the lightweight collaboration runtime smoke path:

```bash
bun run collaboration:crdt:smoke
bun run collaboration:ws:smoke
```

Production builds are intentionally saved for final release checkpoints.

## Data

Local credentials live in `.env.local`, which is ignored by git. Use `.env.example` as the safe template.

Signed-in users can create, open, save, and delete scenes from the editor cloud project panel.

```bash
bun run db:push
```

## Spline Import API

The editor can open Spline public URLs, Viewer snippets, `.splinecode` URLs, and JSON API payloads as live surfaces or as full editor documents.

Use `POST /api/spline/import/open` as the canonical project-opening API. It returns a complete editor document, selected primary object id, resolved Spline runtime settings, and `importSource` metadata that identifies whether the request used a public export or the authorized private export bridge.

Private `app.spline.design/file/...` editor URLs need a user-approved export adapter before they can be opened here. Configure `SPLINE_IMPORT_EXPORT_ENDPOINT`, `SPLINE_IMPORT_API_TOKEN`, and `SPLINE_IMPORT_REQUEST_TOKEN` only when you have a legitimate service that can export that private Spline file into a public/runtime payload such as `sceneUrl`, `viewerUrl`, or `.splinecode`.

Use `GET /api/spline/import/capabilities` to check whether public export import and the private editor-file bridge are enabled in the current deployment. Use `GET /api/spline/import/health` for a no-network readiness snapshot, or `GET /api/spline/import/health?probe=1` to send a tokened provider health check to the configured bridge.

The private bridge health probe sends `POST` JSON to `SPLINE_IMPORT_EXPORT_ENDPOINT` with `action: "health-check"`, `requestedFormat: "capability-check"`, and `acceptedFormats: ["public-url", "viewer-embed", "splinecode", "json-scene-url"]`. A ready provider should return JSON such as `{ "ok": true, "provider": "Your Export Bridge", "acceptedFormats": ["public-url", "splinecode"] }`.

For private project opens, callers must also send `Authorization: Bearer <SPLINE_IMPORT_REQUEST_TOKEN>` or `X-Spline-Import-Token: <SPLINE_IMPORT_REQUEST_TOKEN>`. Public export imports do not require this token.

Use `POST /api/spline/import/conformance` with the same caller token and a private editor-file URL to prove the configured bridge can both report readiness and resolve that exact file into a valid editor document. The response includes `ok`, `status`, sanitized provider health, private file id, document summary, and runtime metadata without exposing bridge credentials.

For project opens, the private bridge must return either a Spline public URL string, a Viewer embed string, or JSON with one of `sceneUrl`, `viewerUrl`, `runtimeUrl`, `url`, `sourceUrl`, `embedUrl`, `scene`, or `src`. Nested `{ "spline": { "runtimeUrl": "..." } }` responses are supported. Raw private editor JSON is rejected unless it includes a supported runtime export URL.

Use this targeted smoke test to verify the complete private-bridge contract locally. It starts a tokened mock exporter, probes `GET /api/spline/import/health?probe=1`, opens an `app.spline.design/file/...` URL through `POST /api/spline/import/open`, checks `POST /api/spline/import/conformance`, and validates the resulting editor document.

```bash
bun run spline-import-private-bridge:smoke
```

## Desktop

```bash
bun run tauri:dev
```

Production desktop builds open the hosted workspace while the desktop shell provides the native window and file dialogs.

Desktop scene files use the `.essencescene` extension. The app registers that extension for production bundles and loads an associated scene when the operating system starts the app from a scene file.
