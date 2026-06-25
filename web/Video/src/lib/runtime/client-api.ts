"use client";

import { useEffect, useState } from "react";

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
  }
}

const apiOrigin = normalizeApiOrigin(process.env.NEXT_PUBLIC_ESSENCE_API_ORIGIN);
export const clientApiUnavailableMessage = "Online actions are unavailable in this desktop build.";

export function isDesktopRuntime() {
  return typeof window !== "undefined" && Boolean(window.__TAURI_INTERNALS__);
}

export function clientApiOrigin() {
  return apiOrigin;
}

export function clientApiUrl(path: string) {
  return apiOrigin ? `${apiOrigin}${path.startsWith("/") ? path : `/${path}`}` : path;
}

export function hasClientApiRuntime() {
  return Boolean(apiOrigin) || !isDesktopRuntime();
}

export function useHasClientApiRuntime() {
  const [hasRuntime, setHasRuntime] = useState(true);

  useEffect(() => {
    setHasRuntime(hasClientApiRuntime());
  }, []);

  return hasRuntime;
}

export function useIsDesktopRuntime() {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    setIsDesktop(isDesktopRuntime());
  }, []);

  return isDesktop;
}

export function assertClientApiRuntime() {
  if (!hasClientApiRuntime()) {
    throw new ClientApiUnavailableError();
  }
}

export function isClientApiUnavailableError(error: unknown): error is ClientApiUnavailableError {
  return error instanceof ClientApiUnavailableError;
}

export class ClientApiUnavailableError extends Error {
  constructor() {
    super(clientApiUnavailableMessage);
    this.name = "ClientApiUnavailableError";
  }
}

function normalizeApiOrigin(value: string | undefined) {
  const trimmed = value?.trim().replace(/\/+$/, "");
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:" ? url.origin : null;
  } catch {
    return null;
  }
}
