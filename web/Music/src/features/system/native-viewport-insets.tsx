"use client";

import { useEffect } from "react";

type NavigatorWithStandalone = Navigator & {
  standalone?: boolean;
};

type TauriWindow = Window & {
  __TAURI__?: unknown;
  __TAURI_INTERNALS__?: unknown;
};

export function NativeViewportInsets() {
  useEffect(() => {
    const root = document.documentElement;
    let frame = 0;

    function isNativeMobileShell() {
      const tauriWindow = window as TauriWindow;
      const isTauri = Boolean(
        tauriWindow.__TAURI__ || tauriWindow.__TAURI_INTERNALS__,
      );
      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as NavigatorWithStandalone).standalone === true;
      const isMobilePointer = window.matchMedia(
        "(max-width: 900px) and (pointer: coarse)",
      ).matches;

      return isMobilePointer && (isStandalone || isTauri);
    }

    function syncInsets() {
      frame = 0;

      const viewport = window.visualViewport;
      const viewportHeight = Math.max(
        1,
        Math.round(viewport?.height ?? window.innerHeight),
      );
      const viewportTop = Math.max(0, Math.round(viewport?.offsetTop ?? 0));
      const viewportBottom = Math.max(
        0,
        Math.round(
          viewport
            ? window.innerHeight - viewport.height - viewport.offsetTop
            : 0,
        ),
      );
      const nativeShell = isNativeMobileShell();
      const topInset = nativeShell ? Math.max(viewportTop, 24) : viewportTop;
      const bottomInset = nativeShell ? Math.max(viewportBottom, 12) : viewportBottom;

      root.style.setProperty("--app-viewport-height", `${viewportHeight}px`);
      root.style.setProperty("--native-safe-area-top", `${topInset}px`);
      root.style.setProperty("--native-safe-area-bottom", `${bottomInset}px`);
    }

    function scheduleSync() {
      if (frame) {
        return;
      }

      frame = window.requestAnimationFrame(syncInsets);
    }

    syncInsets();

    window.addEventListener("resize", scheduleSync);
    window.addEventListener("orientationchange", scheduleSync);
    window.visualViewport?.addEventListener("resize", scheduleSync);
    window.visualViewport?.addEventListener("scroll", scheduleSync);

    return () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }

      window.removeEventListener("resize", scheduleSync);
      window.removeEventListener("orientationchange", scheduleSync);
      window.visualViewport?.removeEventListener("resize", scheduleSync);
      window.visualViewport?.removeEventListener("scroll", scheduleSync);
    };
  }, []);

  return null;
}
