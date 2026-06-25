"use client";

import { useEffect, useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  editorLocales,
  getEditorLocale,
  type EditorLocale,
} from "@/features/editor/editor-localization";

export const localePreferenceStorageKey = "essence-dashboard-locale";

export function useLocalePreference() {
  const [locale, setLocale] = useState<EditorLocale>("en");

  useEffect(() => {
    try {
      setLocale(
        getEditorLocale(window.localStorage.getItem(localePreferenceStorageKey)),
      );
    } catch {
      setLocale("en");
    }
  }, []);

  function updateLocale(value: string) {
    const nextLocale = getEditorLocale(value);

    setLocale(nextLocale);
    try {
      window.localStorage.setItem(localePreferenceStorageKey, nextLocale);
    } catch {
      // The selected locale still applies for this session.
    }
  }

  return { locale, updateLocale };
}

type LocaleSelectProps = {
  label: string;
  locale: EditorLocale;
  onLocaleChange: (value: string) => void;
};

export function LocaleSelect({
  label,
  locale,
  onLocaleChange,
}: LocaleSelectProps) {
  return (
    <Select value={locale} onValueChange={onLocaleChange}>
      <SelectTrigger className="w-24" aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {editorLocales.map((item) => (
          <SelectItem key={item.id} value={item.id}>
            {item.shortLabel}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
