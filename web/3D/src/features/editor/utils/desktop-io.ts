import { sceneDocumentSchema, type SceneDocument } from "../types";
import { getViewportImageDataUrl, serializeSceneDocument } from "./scene-io";

type TauriWindow = Window & {
  __TAURI_INTERNALS__?: unknown;
};

export function isDesktopRuntime() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in (window as TauriWindow);
}

async function invokeDesktopCommand<T>(command: string, args?: Record<string, unknown>) {
  const { invoke } = await import("@tauri-apps/api/core");

  return invoke<T>(command, args);
}

function parseDesktopSceneDocument(contents: string | null) {
  if (!contents) {
    return null;
  }

  const parsed = sceneDocumentSchema.safeParse(JSON.parse(contents));

  if (!parsed.success) {
    throw new Error("This file is not a valid scene document.");
  }

  return parsed.data;
}

export async function readStartupDesktopSceneDocument() {
  return parseDesktopSceneDocument(await invokeDesktopCommand<string | null>("read_startup_scene_document"));
}

export async function openDesktopSceneDocument() {
  return parseDesktopSceneDocument(await invokeDesktopCommand<string | null>("open_scene_document"));
}

export async function saveDesktopSceneDocument(document: SceneDocument) {
  return invokeDesktopCommand<boolean>("save_scene_document", {
    contents: serializeSceneDocument(document),
    fileName: document.name,
  });
}

export async function exportDesktopViewportImage(name: string) {
  return invokeDesktopCommand<boolean>("export_png_image", {
    dataUrl: getViewportImageDataUrl(),
    fileName: name,
  });
}

export async function checkDesktopUpdate() {
  if (!isDesktopRuntime()) {
    return null;
  }

  const { check } = await import("@tauri-apps/plugin-updater");
  return check({ timeout: 30000 });
}

export async function installDesktopUpdate() {
  const update = await checkDesktopUpdate();

  if (!update) {
    return false;
  }

  await update.downloadAndInstall();

  const { relaunch } = await import("@tauri-apps/plugin-process");
  await relaunch();

  return true;
}
