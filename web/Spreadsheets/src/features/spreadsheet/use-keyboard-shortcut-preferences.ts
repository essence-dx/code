"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getEffectiveShortcutDefinitions,
  normalizeShortcutPreferences,
  resetShortcutPreference,
  setShortcutPreference,
  type SpreadsheetShortcutBinding,
  type SpreadsheetShortcutCommand,
  type SpreadsheetShortcutPreference,
} from "@/features/spreadsheet/keyboard-shortcuts";

const STORAGE_KEY = "essence-excel.keyboard-shortcuts.v1";

export function useKeyboardShortcutPreferences() {
  const [loaded, setLoaded] = useState(false);
  const [preferences, setPreferences] = useState<
    SpreadsheetShortcutPreference[]
  >([]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      setPreferences(
        stored ? normalizeShortcutPreferences(JSON.parse(stored)) : [],
      );
    } catch {
      setPreferences([]);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!loaded) {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  }, [loaded, preferences]);

  const shortcuts = useMemo(
    () => getEffectiveShortcutDefinitions(preferences),
    [preferences],
  );

  function updateShortcut(
    command: SpreadsheetShortcutCommand,
    binding: SpreadsheetShortcutBinding | null,
  ) {
    setPreferences((current) => setShortcutPreference(current, command, binding));
  }

  function resetShortcut(command: SpreadsheetShortcutCommand) {
    setPreferences((current) => resetShortcutPreference(current, command));
  }

  function resetAllShortcuts() {
    setPreferences([]);
  }

  return {
    preferences,
    shortcuts,
    updateShortcut,
    resetShortcut,
    resetAllShortcuts,
  };
}
