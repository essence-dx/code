import { getAppPackagePresetPayloads } from "./app-package-export";
import { getPlatformEmbedPresetPayloads } from "./platform-embed-presets";
import {
  getAbsoluteUrl,
  getAndroidComposeEmbedCode,
  getAppPackagePath,
  getEmbedCode,
  getEmbedPath,
  getKotlinSceneFetchCode,
  getPublicSceneApiPath,
  getReactEmbedCode,
  getRuntimeApiCode,
  getSceneFetchCode,
  getSharePath,
  getSwiftSceneFetchCode,
  getSwiftUIEmbedCode,
} from "./share-links";
import { defaultShareSettings } from "./share-settings";

export type EmbedCodeQaKind = "core" | "package" | "platform";
export type EmbedCodeQaStatus = "pass" | "fail";

export interface EmbedCodeQaRow {
  id: string;
  kind: EmbedCodeQaKind;
  label: string;
  status: EmbedCodeQaStatus;
  targetUrl: string;
  issues: string[];
  lines: number;
  characters: number;
  preview: string;
}

export interface EmbedCodeQaReport {
  rows: EmbedCodeQaRow[];
  passed: number;
  failed: number;
  sampleShareId: string;
  shareUrl: string;
  embedUrl: string;
  sceneApiUrl: string;
}

interface EmbedCodeQaCase {
  id: string;
  kind: EmbedCodeQaKind;
  label: string;
  code: string;
  targetUrl: string;
  requiredTokens: string[];
}

const sampleShareId = "qa-scene";
const sampleSceneName = "Essence Spline QA Scene";

function compactPreview(code: string) {
  return code.replace(/\s+/g, " ").trim().slice(0, 180);
}

function createQaRow(testCase: EmbedCodeQaCase): EmbedCodeQaRow {
  const issues: string[] = [];
  const trimmedCode = testCase.code.trim();

  if (trimmedCode.length === 0) {
    issues.push("Empty output");
  }

  if (!testCase.code.includes(testCase.targetUrl)) {
    issues.push("Missing target URL");
  }

  for (const token of testCase.requiredTokens) {
    if (!testCase.code.includes(token)) {
      issues.push(`Missing ${token}`);
    }
  }

  return {
    id: testCase.id,
    kind: testCase.kind,
    label: testCase.label,
    status: issues.length > 0 ? "fail" : "pass",
    targetUrl: testCase.targetUrl,
    issues,
    lines: trimmedCode.split(/\r?\n/).length,
    characters: trimmedCode.length,
    preview: compactPreview(testCase.code),
  };
}

export function createEmbedCodeQaReport(origin: string): EmbedCodeQaReport {
  const shareUrl = getAbsoluteUrl(origin, getSharePath(sampleShareId));
  const embedUrl = getAbsoluteUrl(origin, getEmbedPath(sampleShareId));
  const sceneApiUrl = getAbsoluteUrl(origin, getPublicSceneApiPath(sampleShareId));
  const appPackageCases: EmbedCodeQaCase[] = getAppPackagePresetPayloads({
    activeSceneId: "qa-scene-main",
    embedUrl,
    sceneApiUrl,
    sceneName: sampleSceneName,
    scenes: [
      {
        id: "qa-scene-main",
        name: sampleSceneName,
        objectCount: 4,
      },
    ],
    shareSettings: defaultShareSettings,
    shareUrl,
  }).map((preset) => {
    const packageUrl = getAbsoluteUrl(origin, getAppPackagePath(sampleShareId, preset.id));

    return {
      id: `package-${preset.id}`,
      kind: "package",
      label: `${preset.label} package`,
      code: `${packageUrl}\n${preset.files.join("\n")}`,
      targetUrl: packageUrl,
      requiredTokens: ["package.json", "src/App.tsx"],
    };
  });
  const coreCases: EmbedCodeQaCase[] = [
    {
      id: "iframe",
      kind: "core",
      label: "Iframe embed",
      code: getEmbedCode(embedUrl, sampleSceneName),
      targetUrl: embedUrl,
      requiredTokens: ["<iframe", "allow=\"fullscreen"],
    },
    {
      id: "react-component",
      kind: "core",
      label: "React component",
      code: getReactEmbedCode(embedUrl),
      targetUrl: embedUrl,
      requiredTokens: ["EssenceSplineScene", "<iframe"],
    },
    {
      id: "runtime-api",
      kind: "core",
      label: "Runtime API snippet",
      code: getRuntimeApiCode(embedUrl),
      targetUrl: embedUrl,
      requiredTokens: ["essence-spline:runtime-command", "postMessage"],
    },
    {
      id: "scene-fetch",
      kind: "core",
      label: "JavaScript fetch helper",
      code: getSceneFetchCode(sceneApiUrl),
      targetUrl: sceneApiUrl,
      requiredTokens: ["fetchEssenceSplineScene", "Accept"],
    },
    {
      id: "swiftui",
      kind: "core",
      label: "SwiftUI WebView",
      code: getSwiftUIEmbedCode(embedUrl),
      targetUrl: embedUrl,
      requiredTokens: ["WKWebView", "EssenceSplineSceneView"],
    },
    {
      id: "swift-fetch",
      kind: "core",
      label: "Swift fetch helper",
      code: getSwiftSceneFetchCode(sceneApiUrl),
      targetUrl: sceneApiUrl,
      requiredTokens: ["URLSession", "fetchEssenceSplineScene"],
    },
    {
      id: "android-compose",
      kind: "core",
      label: "Android Compose WebView",
      code: getAndroidComposeEmbedCode(embedUrl),
      targetUrl: embedUrl,
      requiredTokens: ["AndroidView", "EssenceSplineSceneView"],
    },
    {
      id: "kotlin-fetch",
      kind: "core",
      label: "Kotlin fetch helper",
      code: getKotlinSceneFetchCode(sceneApiUrl),
      targetUrl: sceneApiUrl,
      requiredTokens: ["HttpURLConnection", "fetchEssenceSplineSceneJson"],
    },
  ];
  const platformCases: EmbedCodeQaCase[] = getPlatformEmbedPresetPayloads({
    embedUrl,
    sceneName: sampleSceneName,
    shareUrl,
  }).map((preset) => ({
    id: `platform-${preset.id}`,
    kind: "platform",
    label: `${preset.label} preset`,
    code: preset.code,
    targetUrl: ["notion", "play", "tome"].includes(preset.id) ? shareUrl : embedUrl,
    requiredTokens: ["notion", "play", "tome"].includes(preset.id) ? [shareUrl] : preset.id === "wix-studio" ? ["essence-spline-wix-studio", "<iframe"] : ["<iframe"],
  }));
  const rows = [...coreCases, ...platformCases, ...appPackageCases].map(createQaRow);

  return {
    rows,
    passed: rows.filter((row) => row.status === "pass").length,
    failed: rows.filter((row) => row.status === "fail").length,
    sampleShareId,
    shareUrl,
    embedUrl,
    sceneApiUrl,
  };
}
