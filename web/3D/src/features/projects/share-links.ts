import type { ShareSettings } from "./share-settings";
import type { AppPackagePresetId } from "./app-package-export";

export const DEFAULT_EMBED_HEIGHT = 640;
export const DEFAULT_EMBED_RADIUS = 12;

export interface EmbedDisplayOptions {
  height?: number;
  radius?: number;
  responsive?: boolean;
  transparentBackground?: boolean;
}

export type EmbedDisplayOptionInput = EmbedDisplayOptions | Pick<ShareSettings, "embedHeight" | "embedLayout" | "embedRadius" | "embedTransparentBackground">;

export function resolveEmbedDisplayOptions(options?: EmbedDisplayOptionInput | null) {
  const value = options ?? {};
  const height = "height" in value ? value.height : "embedHeight" in value ? value.embedHeight : undefined;
  const radius = "radius" in value ? value.radius : "embedRadius" in value ? value.embedRadius : undefined;
  const responsive = "responsive" in value ? value.responsive : "embedLayout" in value ? value.embedLayout === "responsive" : false;
  const transparentBackground = "transparentBackground" in value ? value.transparentBackground : "embedTransparentBackground" in value ? value.embedTransparentBackground : false;

  return {
    height: Math.min(1600, Math.max(240, Math.round(height ?? DEFAULT_EMBED_HEIGHT))),
    radius: Math.min(48, Math.max(0, Math.round(radius ?? DEFAULT_EMBED_RADIUS))),
    responsive: Boolean(responsive),
    transparentBackground: Boolean(transparentBackground),
  };
}

function getSceneQuery(sceneId?: string | null) {
  const normalizedSceneId = sceneId?.trim();

  return normalizedSceneId ? `?scene=${encodeURIComponent(normalizedSceneId)}` : "";
}

export function getSharePath(shareId: string, sceneId?: string | null) {
  return `/share/${shareId}${getSceneQuery(sceneId)}`;
}

export function getEmbedPath(shareId: string, sceneId?: string | null) {
  return `/embed/${shareId}${getSceneQuery(sceneId)}`;
}

export function getPublicSceneApiPath(shareId: string, sceneId?: string | null) {
  return `/api/public/scenes/${shareId}${getSceneQuery(sceneId)}`;
}

export function getCodeExportPath(shareId: string, sceneId?: string | null) {
  return `/api/public/scenes/${shareId}/code${getSceneQuery(sceneId)}`;
}

export function getViewerPackagePath(shareId: string, sceneId?: string | null) {
  return `/api/public/scenes/${shareId}/viewer-package${getSceneQuery(sceneId)}`;
}

export function getSelfHostedPackagePath(shareId: string, sceneId?: string | null) {
  return `/api/public/scenes/${shareId}/self-hosted${getSceneQuery(sceneId)}`;
}

export function getAppPackagePath(shareId: string, presetId: AppPackagePresetId, sceneId?: string | null) {
  return `/api/public/scenes/${shareId}/app-package/${presetId}${getSceneQuery(sceneId)}`;
}

export function getAbsoluteUrl(origin: string, path: string) {
  return `${origin}${path}`;
}

export function escapeHtmlAttribute(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function escapeSwiftString(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

function escapeKotlinString(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

export function getEmbedCode(embedUrl: string, title = "Essence Spline scene", options?: EmbedDisplayOptionInput) {
  const display = resolveEmbedDisplayOptions(options);
  const escapedTitle = escapeHtmlAttribute(title);
  const escapedUrl = escapeHtmlAttribute(embedUrl);
  const background = display.transparentBackground ? "background:transparent;" : "";

  if (display.responsive) {
    return `<div style="position:relative;width:100%;aspect-ratio:16/9;overflow:hidden;border-radius:${display.radius}px;${background}">
  <iframe src="${escapedUrl}" title="${escapedTitle}" style="position:absolute;inset:0;width:100%;height:100%;border:0;${background}" allow="fullscreen; xr-spatial-tracking" loading="lazy"></iframe>
</div>`;
  }

  return `<iframe src="${escapedUrl}" title="${escapedTitle}" style="width:100%;height:${display.height}px;border:0;border-radius:${display.radius}px;overflow:hidden;${background}" allow="fullscreen; xr-spatial-tracking" loading="lazy"></iframe>`;
}

export function getReactEmbedCode(embedUrl: string, options?: EmbedDisplayOptionInput) {
  const display = resolveEmbedDisplayOptions(options);
  const background = display.transparentBackground ? "transparent" : undefined;

  if (display.responsive) {
    return `type EssenceSplineSceneProps = {
  className?: string;
  title?: string;
};

export function EssenceSplineScene({ className, title = "Essence Spline scene" }: EssenceSplineSceneProps) {
  return (
    <div
      className={className}
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "16 / 9",
        overflow: "hidden",
        borderRadius: ${display.radius},
        ${background ? `background: "${background}",` : ""}
      }}
    >
      <iframe
        src="${embedUrl}"
        title={title}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          border: 0,
          ${background ? `background: "${background}",` : ""}
        }}
        allow="fullscreen; xr-spatial-tracking"
        loading="lazy"
      />
    </div>
  );
}`;
  }

  return `type EssenceSplineSceneProps = {
  className?: string;
  title?: string;
};

export function EssenceSplineScene({ className, title = "Essence Spline scene" }: EssenceSplineSceneProps) {
  return (
    <iframe
      src="${embedUrl}"
      title={title}
      className={className}
      style={{
        width: "100%",
        height: ${display.height},
        border: 0,
        borderRadius: ${display.radius},
        overflow: "hidden",
        ${background ? `background: "${background}",` : ""}
      }}
      allow="fullscreen; xr-spatial-tracking"
      loading="lazy"
    />
  );
}`;
}

export function getRuntimeApiCode(embedUrl: string, options?: EmbedDisplayOptionInput) {
  const display = resolveEmbedDisplayOptions(options);
  const background = display.transparentBackground ? "background:transparent;" : "";

  return `<iframe
  id="essence-spline-scene"
  src="${escapeHtmlAttribute(embedUrl)}"
  title="Essence Spline scene"
  style="width:100%;height:${display.height}px;border:0;border-radius:${display.radius}px;overflow:hidden;${background}"
  allow="fullscreen; xr-spatial-tracking"
></iframe>

<script>
  const sceneFrame = document.getElementById("essence-spline-scene");

  function sendEssenceSplineCommand(command, payload = {}) {
    const commandId = crypto.randomUUID();

    sceneFrame.contentWindow.postMessage({
      type: "essence-spline:runtime-command",
      command,
      commandId,
      payload,
    }, "*");

    return commandId;
  }

  window.addEventListener("message", (event) => {
    if (event.data?.type === "essence-spline:runtime-ready") {
      sendEssenceSplineCommand("setVariable", { key: "Mode", value: "live" });
    }

    if (event.data?.type === "essence-spline:runtime-response") {
      console.log("Essence Spline runtime response", event.data);
    }
  });
</script>`;
}

export function getSwiftUIEmbedCode(embedUrl: string) {
  return `import SwiftUI
import WebKit

#if canImport(UIKit)
import UIKit

struct EssenceSplineSceneView: UIViewRepresentable {
    let url = URL(string: "${escapeSwiftString(embedUrl)}")!

    func makeUIView(context: Context) -> WKWebView {
        makeEssenceSplineWebView(url: url)
    }

    func updateUIView(_ webView: WKWebView, context: Context) {}
}
#elseif canImport(AppKit)
import AppKit

struct EssenceSplineSceneView: NSViewRepresentable {
    let url = URL(string: "${escapeSwiftString(embedUrl)}")!

    func makeNSView(context: Context) -> WKWebView {
        makeEssenceSplineWebView(url: url)
    }

    func updateNSView(_ webView: WKWebView, context: Context) {}
}
#endif

private func makeEssenceSplineWebView(url: URL) -> WKWebView {
    let configuration = WKWebViewConfiguration()
    configuration.allowsInlineMediaPlayback = true

    let webView = WKWebView(frame: .zero, configuration: configuration)
#if canImport(UIKit)
        webView.scrollView.isScrollEnabled = false
        webView.backgroundColor = .clear
#endif
    webView.isOpaque = false
    webView.load(URLRequest(url: url))
    return webView
}`;
}

export function getSwiftSceneFetchCode(apiUrl: string) {
  return `import Foundation

struct EssenceSplineSceneResponse: Decodable {
    struct Scene: Decodable {
        let document: SceneDocument
        let embedPath: String
        let name: String
        let publishedAt: String?
        let shareId: String
        let sharePath: String
        let updatedAt: String
    }

    let scene: Scene
}

struct SceneDocument: Decodable {
    let id: String
    let name: String
    let objects: [SceneObject]
}

struct SceneObject: Decodable, Identifiable {
    let id: String
    let name: String
    let kind: String
}

func fetchEssenceSplineScene() async throws -> EssenceSplineSceneResponse {
    let url = URL(string: "${escapeSwiftString(apiUrl)}")!
    var request = URLRequest(url: url)
    request.setValue("application/json", forHTTPHeaderField: "Accept")

    let (data, response) = try await URLSession.shared.data(for: request)

    guard let httpResponse = response as? HTTPURLResponse,
          (200..<300).contains(httpResponse.statusCode) else {
        throw URLError(.badServerResponse)
    }

    return try JSONDecoder().decode(EssenceSplineSceneResponse.self, from: data)
}`;
}

export function getAndroidComposeEmbedCode(embedUrl: string) {
  return `import android.annotation.SuppressLint
import android.view.ViewGroup.LayoutParams.MATCH_PARENT
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView

@SuppressLint("SetJavaScriptEnabled")
@Composable
fun EssenceSplineSceneView(
    modifier: Modifier = Modifier,
    url: String = "${escapeKotlinString(embedUrl)}",
) {
    AndroidView(
        modifier = modifier,
        factory = { context ->
            WebView(context).apply {
                layoutParams = android.view.ViewGroup.LayoutParams(MATCH_PARENT, MATCH_PARENT)
                settings.javaScriptEnabled = true
                settings.domStorageEnabled = true
                settings.mediaPlaybackRequiresUserGesture = false
                webChromeClient = WebChromeClient()
                webViewClient = WebViewClient()
                loadUrl(url)
            }
        },
        update = { webView ->
            if (webView.url != url) {
                webView.loadUrl(url)
            }
        },
    )
}`;
}

export function getKotlinSceneFetchCode(apiUrl: string) {
  return `import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import org.json.JSONObject

fun fetchEssenceSplineSceneJson(): JSONObject {
    val connection = URL("${escapeKotlinString(apiUrl)}").openConnection() as HttpURLConnection
    connection.requestMethod = "GET"
    connection.setRequestProperty("Accept", "application/json")
    connection.connectTimeout = 10_000
    connection.readTimeout = 10_000

    return try {
        val statusCode = connection.responseCode
        if (statusCode !in 200..299) {
            throw IOException("Essence Spline scene request failed with HTTP $statusCode")
        }

        val body = connection.inputStream.bufferedReader().use { reader -> reader.readText() }
        JSONObject(body)
    } finally {
        connection.disconnect()
    }
}`;
}

export function getSceneFetchCode(apiUrl: string) {
  return `export async function fetchEssenceSplineScene() {
  const response = await fetch("${apiUrl}", {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Essence Spline scene request failed");
  }

  return response.json() as Promise<{
    scene: {
      activeSceneId: string;
      document: unknown;
      embedPath: string;
      name: string;
      publishedAt: string | null;
      projectName: string;
      scenes: Array<{
        id: string;
        name: string;
        objectCount: number;
        updatedAt: string;
      }>;
      shareId: string;
      sharePath: string;
      updatedAt: string;
    };
  }>;
}`;
}

export function getViewerPackageHtml({
  embedUrl,
  embedOptions,
  sceneApiUrl,
  sceneName,
  shareUrl,
}: {
  embedUrl: string;
  embedOptions?: EmbedDisplayOptionInput;
  sceneApiUrl: string;
  sceneName: string;
  shareUrl: string;
}) {
  const title = escapeHtmlAttribute(sceneName);
  const display = resolveEmbedDisplayOptions(embedOptions);
  const metadata = JSON.stringify({ sceneApiUrl, sceneName, shareUrl }, null, 2).replaceAll("<", "\\u003c");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      :root {
        color-scheme: dark;
        font-family:
          Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        min-height: 100vh;
        overflow: hidden;
        background: ${display.transparentBackground ? "transparent" : "#09090b"};
        color: #fafafa;
      }

      iframe {
        display: block;
        width: 100vw;
        height: 100vh;
        border: 0;
      }
    </style>
  </head>
  <body>
    <iframe src="${escapeHtmlAttribute(embedUrl)}" title="${title}" allow="fullscreen; xr-spatial-tracking" loading="eager"></iframe>
    <script type="application/json" id="essence-spline-metadata">
      ${metadata}
    </script>
  </body>
</html>
`;
}
