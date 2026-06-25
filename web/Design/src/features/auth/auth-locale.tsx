import type { EditorLocale } from "@/features/editor/editor-localization";
import {
  LocaleSelect,
  useLocalePreference,
} from "@/features/localization/locale-preference";

export const useAuthLocale = useLocalePreference;

type AuthLocaleSelectProps = {
  label: string;
  locale: EditorLocale;
  onLocaleChange: (value: string) => void;
};

export function AuthLocaleSelect({
  label,
  locale,
  onLocaleChange,
}: AuthLocaleSelectProps) {
  return (
    <LocaleSelect
      label={label}
      locale={locale}
      onLocaleChange={onLocaleChange}
    />
  );
}
