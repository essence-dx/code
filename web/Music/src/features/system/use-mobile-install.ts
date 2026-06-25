"use client";

import { useCallback, useEffect, useState } from "react";
import {
  clearInstallPrompt,
  getInstallPrompt,
  getMobileInstallSnapshot,
  isStandaloneDisplay,
  type InstallPromptChoice,
  type MobileInstallSnapshot,
} from "./pwa-install";

const emptyInstallSnapshot: MobileInstallSnapshot = {
  installed: false,
  manifestReady: false,
  promptReady: false,
  serviceWorkerReady: false,
  serviceWorkerSupported: false,
  standalone: false,
};

export function useMobileInstall() {
  const [choice, setChoice] = useState<InstallPromptChoice | undefined>();
  const [installing, setInstalling] = useState(false);
  const [snapshot, setSnapshot] = useState(emptyInstallSnapshot);

  const refresh = useCallback(async () => {
    setSnapshot(await getMobileInstallSnapshot());
  }, []);

  useEffect(() => {
    void refresh();

    const media = window.matchMedia("(display-mode: standalone)");
    const handleChange = () => {
      void refresh();
    };

    window.addEventListener("essence-mobile-install:changed", handleChange);
    media.addEventListener("change", handleChange);

    return () => {
      window.removeEventListener("essence-mobile-install:changed", handleChange);
      media.removeEventListener("change", handleChange);
    };
  }, [refresh]);

  const install = useCallback(async () => {
    const prompt = getInstallPrompt();

    if (!prompt || isStandaloneDisplay()) {
      setChoice("unavailable");
      await refresh();
      return "unavailable";
    }

    setInstalling(true);

    try {
      await prompt.prompt();
      const result = await prompt.userChoice;
      clearInstallPrompt();
      setChoice(result.outcome);
      await refresh();
      return result.outcome;
    } finally {
      setInstalling(false);
    }
  }, [refresh]);

  return {
    choice,
    install,
    installing,
    refresh,
    snapshot,
  };
}
