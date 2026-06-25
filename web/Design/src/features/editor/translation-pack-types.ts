import type { DesignDocument, DesignElement } from "@/features/editor/types";
import type { EditorLocale } from "@/features/editor/editor-localization";

export const translationPackKind = "essence-studio.translation-pack";

export type TranslationPackEntry = {
  id: string;
  pageId: string;
  pageName: string;
  elementId?: string;
  elementType?: DesignElement["type"];
  field: string;
  label: string;
  sourceText: string;
  translatedText: string;
};

export type TranslationPack = {
  kind: typeof translationPackKind;
  version: 1;
  projectName: string;
  sourceLocale: EditorLocale;
  targetLocale: EditorLocale | "";
  exportedAt: string;
  entries: TranslationPackEntry[];
};

export type TranslationImportResult = {
  document: DesignDocument;
  appliedEntries: number;
  skippedEntries: number;
  totalEntries: number;
};
