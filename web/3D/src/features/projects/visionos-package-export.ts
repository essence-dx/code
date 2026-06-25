interface VisionOsPackageFile {
  content: string;
  path: string;
}

interface VisionOsPackageOptions {
  embedUrl: string;
  sceneApiUrl: string;
  sceneName: string;
  shareUrl: string;
}

function normalizePackageName(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "essence-spline-scene"
  );
}

function packageJson(name: string, scripts: Record<string, string>, dependencies: Record<string, string>, devDependencies: Record<string, string> = {}) {
  return JSON.stringify(
    {
      name,
      private: true,
      version: "0.1.0",
      type: "module",
      scripts,
      dependencies,
      devDependencies,
    },
    null,
    2,
  );
}

function swiftStringLiteral(value: string) {
  return JSON.stringify(value) ?? "\"\"";
}

function visionOsPreviewReadme(options: VisionOsPackageOptions) {
  return `# ${options.sceneName} visionOS Preview

This package contains a Vite web companion app plus SwiftUI source files for a visionOS scene preview shell.

- Share URL: ${options.shareUrl}
- Embed URL: ${options.embedUrl}
- Scene API: ${options.sceneApiUrl}

## Requirements

- Bun
- Xcode with the visionOS SDK
- A reachable HTTPS Essence Spline share or embed URL

## Web Companion

1. Install dependencies with \`bun install\`.
2. Run \`bun run dev\` for a local browser preview.
3. Run \`bun run build\` when you need static web assets for a host.

## visionOS App Target

1. Create a new visionOS App project in Xcode.
2. Copy the files from \`visionOS/Sources/EssenceSplineVisionPreview\` into the app target.
3. Replace the starter \`App\` file Xcode created with \`EssenceSplineVisionPreviewApp.swift\`.
4. Keep \`SceneMetadata.swift\` pointed at the published Essence Spline URLs, or replace those URLs with your own hosted build.
5. Run the app on Apple Vision Pro or the visionOS simulator.

The windowed scene uses WKWebView for the interactive WebGL embed. The immersive space adds a lightweight RealityKit spatial preview panel and quick link back to the shared scene, so the package can be extended later with native RealityKit mesh conversion.
`;
}

function visionOsSceneMetadata(options: VisionOsPackageOptions) {
  return `import Foundation

enum SceneMetadata {
    static let sceneName = ${swiftStringLiteral(options.sceneName)}
    static let shareURL = URL(string: ${swiftStringLiteral(options.shareUrl)})!
    static let embedURL = URL(string: ${swiftStringLiteral(options.embedUrl)})!
    static let sceneAPIURL = URL(string: ${swiftStringLiteral(options.sceneApiUrl)})!
    static let immersiveSpaceID = "essence-spline-preview"
}
`;
}

function visionOsAppSource() {
  return `import SwiftUI

@main
struct EssenceSplineVisionPreviewApp: App {
    @State private var immersionStyle: ImmersionStyle = .mixed

    var body: some Scene {
        WindowGroup(SceneMetadata.sceneName) {
            EssenceSplineSceneWindow()
        }

        ImmersiveSpace(id: SceneMetadata.immersiveSpaceID) {
            ImmersivePreviewSpace()
        }
        .immersionStyle(selection: $immersionStyle, in: .mixed)
    }
}
`;
}

function visionOsSceneWindowSource() {
  return `import SwiftUI
import WebKit

struct EssenceSplineSceneWindow: View {
    @Environment(\\.openImmersiveSpace) private var openImmersiveSpace
    @Environment(\\.dismissImmersiveSpace) private var dismissImmersiveSpace
    @State private var immersiveSpaceOpen = false

    var body: some View {
        VStack(spacing: 0) {
            WebSceneView(url: SceneMetadata.embedURL)
                .frame(minWidth: 960, minHeight: 640)

            Divider()

            HStack {
                Text(SceneMetadata.sceneName)
                    .font(.headline)

                Spacer()

                Link("Open Share Page", destination: SceneMetadata.shareURL)

                Button(immersiveSpaceOpen ? "Close Spatial Preview" : "Open Spatial Preview") {
                    Task {
                        if immersiveSpaceOpen {
                            await dismissImmersiveSpace()
                            immersiveSpaceOpen = false
                        } else {
                            switch await openImmersiveSpace(id: SceneMetadata.immersiveSpaceID) {
                            case .opened:
                                immersiveSpaceOpen = true
                            case .error, .userCancelled:
                                immersiveSpaceOpen = false
                            @unknown default:
                                immersiveSpaceOpen = false
                            }
                        }
                    }
                }
                .buttonStyle(.borderedProminent)
            }
            .padding()
        }
    }
}

struct WebSceneView: UIViewRepresentable {
    let url: URL

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.allowsInlineMediaPlayback = true

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.isOpaque = false
        webView.scrollView.isScrollEnabled = false
        webView.load(URLRequest(url: url))
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {
        guard uiView.url != url else {
            return
        }

        uiView.load(URLRequest(url: url))
    }
}
`;
}

function visionOsImmersivePreviewSource() {
  return `import RealityKit
import SwiftUI

struct ImmersivePreviewSpace: View {
    var body: some View {
        RealityView { content in
            let panel = ModelEntity(
                mesh: .generateBox(width: 1.8, height: 1.05, depth: 0.04),
                materials: [
                    SimpleMaterial(
                        color: .init(red: 0.08, green: 0.1, blue: 0.12, alpha: 0.82),
                        roughness: 0.55,
                        isMetallic: false
                    )
                ]
            )

            panel.position = [0, 1.35, -1.4]
            content.add(panel)
        }
        .overlay(alignment: .bottom) {
            VStack(spacing: 10) {
                Text(SceneMetadata.sceneName)
                    .font(.title2)
                    .fontWeight(.semibold)

                Text("Open the windowed preview for the live interactive WebGL scene.")
                    .font(.body)
                    .foregroundStyle(.secondary)

                Link("Open shared scene", destination: SceneMetadata.shareURL)
                    .buttonStyle(.borderedProminent)
            }
            .padding(24)
            .glassBackgroundEffect()
        }
    }
}
`;
}

function visionOsMetadataJson(options: VisionOsPackageOptions) {
  return JSON.stringify(
    {
      embedUrl: options.embedUrl,
      immersiveSpaceId: "essence-spline-preview",
      sceneApiUrl: options.sceneApiUrl,
      sceneName: options.sceneName,
      shareUrl: options.shareUrl,
      viewer: "WKWebView window plus RealityKit immersive preview panel",
    },
    null,
    2,
  );
}

export function visionOsPreviewFiles(options: VisionOsPackageOptions, baseFiles: VisionOsPackageFile[]): VisionOsPackageFile[] {
  return baseFiles
    .map((file) =>
      file.path === "package.json"
        ? {
            ...file,
            content: packageJson(
              `${normalizePackageName(options.sceneName)}-visionos-preview`,
              {
                dev: "vite --host 0.0.0.0",
                build: "tsc && vite build",
                preview: "vite preview",
                "preview:web": "vite --host 0.0.0.0",
              },
              {
                react: "^19.2.0",
                "react-dom": "^19.2.0",
              },
              {
                "@vitejs/plugin-react": "^5.0.0",
                typescript: "^5.0.0",
                vite: "^7.0.0",
              },
            ),
          }
        : file.path === "README.md"
          ? {
              ...file,
              content: visionOsPreviewReadme(options),
            }
          : file,
    )
    .concat([
      { path: "visionOS/scene-metadata.json", content: visionOsMetadataJson(options) },
      {
        path: "visionOS/Sources/EssenceSplineVisionPreview/SceneMetadata.swift",
        content: visionOsSceneMetadata(options),
      },
      {
        path: "visionOS/Sources/EssenceSplineVisionPreview/EssenceSplineVisionPreviewApp.swift",
        content: visionOsAppSource(),
      },
      {
        path: "visionOS/Sources/EssenceSplineVisionPreview/EssenceSplineSceneWindow.swift",
        content: visionOsSceneWindowSource(),
      },
      {
        path: "visionOS/Sources/EssenceSplineVisionPreview/ImmersivePreviewSpace.swift",
        content: visionOsImmersivePreviewSource(),
      },
    ]);
}
