"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CreationDraft } from "@/features/ai/creation-drafts";
import {
  clearTasteSettings,
  deriveTasteProfile,
  readTasteSettings,
  serializeTasteProfile,
  writeTasteSettings,
  type TasteProfileSettings,
} from "@/features/ai/taste-profile";
import type { LocalSong } from "@/features/library/types";

export function useTasteProfile(songs: LocalSong[], drafts: CreationDraft[]) {
  const [settings, setSettings] = useState<TasteProfileSettings>(() => ({
    enabled: true,
  }));
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setSettings(readTasteSettings());
    setLoaded(true);
  }, []);

  const profile = useMemo(
    () => deriveTasteProfile(songs, drafts, settings),
    [drafts, settings, songs],
  );

  const updateSettings = useCallback((nextSettings: TasteProfileSettings) => {
    setSettings(nextSettings);
    writeTasteSettings(nextSettings);
  }, []);

  const resetSettings = useCallback(() => {
    clearTasteSettings();
    setSettings({ enabled: true });
  }, []);

  return {
    exportProfile: () => serializeTasteProfile(profile),
    loaded,
    profile,
    resetSettings,
    settings,
    updateSettings,
  };
}
