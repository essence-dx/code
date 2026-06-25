"use client";

import { useEffect } from "react";
import {
  captureInstallPrompt,
  markAppInstalled,
  notifyMobileInstallChanged,
  type BeforeInstallPromptEvent,
} from "./pwa-install";

export function PwaServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      if (process.env.NODE_ENV !== "production") {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          registrations.forEach((registration) => {
            void registration.unregister();
          });
          notifyMobileInstallChanged();
        });
      } else {
        navigator.serviceWorker
          .register("/sw.js")
          .then(() => {
            notifyMobileInstallChanged();
          })
          .catch(() => {
            // Installability should never block the music workspace.
          });
      }
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      captureInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const handleAppInstalled = () => {
      markAppInstalled();
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  return null;
}
