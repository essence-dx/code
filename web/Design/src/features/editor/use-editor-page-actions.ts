"use client";

import { useCallback, useMemo, type Dispatch, type SetStateAction } from "react";

import { createBulkPagesFromCsv } from "@/features/editor/bulk-create";
import {
  isAcceptedCsvFile,
  maxCsvImportBytes,
} from "@/features/editor/csv-import";
import {
  addPage,
  duplicatePage,
  removePage,
  renamePage,
  reorderPage,
  setActivePage,
  updatePageAudienceInteraction,
  updatePageFormat,
  updatePageWebsiteNavigation,
  updatePageNotes,
  updatePageSize,
  updatePageTransition,
  updatePageWebsiteSeo,
} from "@/features/editor/editor-operations";
import type { EditorLocale } from "@/features/editor/editor-localization";
import { getEditorPagesPanelCopy } from "@/features/editor/editor-workflow-localization";
import { importSpeakerNotesMarkdown } from "@/features/editor/presentation-notes";
import { applyTranslationPackJson } from "@/features/editor/translation-pack";
import type {
  AudienceInteraction,
  DesignDocument,
  DesignPresetId,
  PageTransition,
} from "@/features/editor/types";

type DocumentCommit = (
  updater: DesignDocument | ((current: DesignDocument) => DesignDocument),
) => void;

type PagePanelMessage = {
  tone: "error" | "info";
  text: string;
};

type UseEditorPageActionsInput = {
  document: DesignDocument;
  editorLocale: EditorLocale;
  commitDocument: DocumentCommit;
  setSelectedElementIds: Dispatch<SetStateAction<string[]>>;
};

export function useEditorPageActions({
  document,
  editorLocale,
  commitDocument,
  setSelectedElementIds,
}: UseEditorPageActionsInput) {
  const pagesCopy = useMemo(
    () => getEditorPagesPanelCopy(editorLocale),
    [editorLocale],
  );

  const clearSelection = useCallback(() => {
    setSelectedElementIds([]);
  }, [setSelectedElementIds]);

  const addBlankPage = useCallback(() => {
    clearSelection();
    commitDocument((current) => addPage(current));
  }, [clearSelection, commitDocument]);

  const bulkCreateFromCsv = useCallback(
    async (file: File): Promise<PagePanelMessage> => {
      if (!isAcceptedCsvFile(file)) {
        return {
          tone: "error",
          text: pagesCopy.csvUseHeader,
        };
      }

      if (file.size > maxCsvImportBytes) {
        return {
          tone: "error",
          text: pagesCopy.csvSizeLimit,
        };
      }

      const result = createBulkPagesFromCsv(document, await file.text());

      if (!result.ok) {
        return {
          tone: "error",
          text: result.message,
        };
      }

      clearSelection();
      commitDocument(result.document);

      return {
        tone: "info",
        text: result.truncated
          ? pagesCopy.csvCreatedTruncated(result.createdPages)
          : pagesCopy.csvCreated(result.createdPages),
      };
    },
    [clearSelection, commitDocument, document, pagesCopy],
  );

  const importSpeakerNotes = useCallback(
    async (file: File): Promise<PagePanelMessage> => {
      const result = importSpeakerNotesMarkdown(document, await file.text());

      if (!result.ok) {
        return {
          tone: "error",
          text: result.message,
        };
      }

      clearSelection();
      commitDocument(result.document);

      return {
        tone: "info",
        text: pagesCopy.speakerNotesUpdated(result.updatedPages),
      };
    },
    [clearSelection, commitDocument, document, pagesCopy],
  );

  const importTranslationPack = useCallback(
    async (file: File): Promise<PagePanelMessage> => {
      const result = applyTranslationPackJson(document, await file.text());

      if (result.appliedEntries === 0) {
        return {
          tone: "error",
          text: pagesCopy.noTranslationsApplied(result.totalEntries),
        };
      }

      clearSelection();
      commitDocument(result.document);

      return {
        tone: "info",
        text: pagesCopy.translationsApplied(
          result.appliedEntries,
          result.skippedEntries,
        ),
      };
    },
    [clearSelection, commitDocument, document, pagesCopy],
  );

  const selectPage = useCallback(
    (pageId: string) => {
      clearSelection();
      commitDocument((current) => setActivePage(current, pageId));
    },
    [clearSelection, commitDocument],
  );

  const duplicatePageById = useCallback(
    (pageId: string) => {
      clearSelection();
      commitDocument((current) => duplicatePage(current, pageId));
    },
    [clearSelection, commitDocument],
  );

  const deletePageById = useCallback(
    (pageId: string) => {
      clearSelection();
      commitDocument((current) => removePage(current, pageId));
    },
    [clearSelection, commitDocument],
  );

  const renamePageById = useCallback(
    (pageId: string, name: string) => {
      commitDocument((current) => renamePage(current, pageId, name));
    },
    [commitDocument],
  );

  const updatePageNotesById = useCallback(
    (pageId: string, notes: string) => {
      commitDocument((current) => updatePageNotes(current, pageId, notes));
    },
    [commitDocument],
  );

  const updatePageWebsiteSeoById = useCallback(
    (pageId: string, seo: { title?: string; description?: string }) => {
      commitDocument((current) => updatePageWebsiteSeo(current, pageId, seo));
    },
    [commitDocument],
  );

  const updatePageWebsiteNavigationById = useCallback(
    (
      pageId: string,
      navigation: { label?: string; group?: string; hidden?: boolean },
    ) => {
      commitDocument((current) =>
        updatePageWebsiteNavigation(current, pageId, navigation),
      );
    },
    [commitDocument],
  );

  const updatePageTransitionById = useCallback(
    (pageId: string, transition: PageTransition) => {
      commitDocument((current) =>
        updatePageTransition(current, pageId, transition),
      );
    },
    [commitDocument],
  );

  const updatePageFormatById = useCallback(
    (pageId: string, format: DesignPresetId) => {
      commitDocument((current) => updatePageFormat(current, pageId, format));
    },
    [commitDocument],
  );

  const updatePageSizeById = useCallback(
    (pageId: string, size: { width?: number; height?: number }) => {
      commitDocument((current) => updatePageSize(current, pageId, size));
    },
    [commitDocument],
  );

  const updatePageAudienceInteractionById = useCallback(
    (pageId: string, interaction: AudienceInteraction | undefined) => {
      commitDocument((current) =>
        updatePageAudienceInteraction(current, pageId, interaction),
      );
    },
    [commitDocument],
  );

  const reorderPageById = useCallback(
    (pageId: string, direction: "up" | "down") => {
      commitDocument((current) => reorderPage(current, pageId, direction));
    },
    [commitDocument],
  );

  return {
    addBlankPage,
    bulkCreateFromCsv,
    importSpeakerNotes,
    importTranslationPack,
    selectPage,
    renamePageById,
    updatePageNotesById,
    updatePageWebsiteSeoById,
    updatePageWebsiteNavigationById,
    updatePageTransitionById,
    updatePageFormatById,
    updatePageSizeById,
    updatePageAudienceInteractionById,
    duplicatePageById,
    deletePageById,
    reorderPageById,
  };
}
