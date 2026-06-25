"use client";

import { useCallback, useRef, type Dispatch, type SetStateAction } from "react";

import {
  applyElementUpdates,
  getActivePage,
  updateElement,
} from "@/features/editor/editor-operations";
import {
  isMediaTimelineElement,
  splitMediaTimelineElement,
} from "@/features/editor/media-timeline";
import type { DesignDocument, DesignElement } from "@/features/editor/types";

type ElementUpdate = {
  elementId: string;
  updates: Partial<DesignElement>;
};

type DocumentCommit = (
  updater: DesignDocument | ((current: DesignDocument) => DesignDocument),
) => void;

type CommitWithBase = (
  baseDocument: DesignDocument,
  nextDocument: DesignDocument,
) => void;

type UseEditorCanvasInteractionsInput = {
  document: DesignDocument;
  commitDocument: DocumentCommit;
  commitWithBase: CommitWithBase;
  replacePresent: (document: DesignDocument) => void;
  markDirty: () => void;
  setSelectedElementIds: Dispatch<SetStateAction<string[]>>;
};

export function useEditorCanvasInteractions({
  document,
  commitDocument,
  commitWithBase,
  replacePresent,
  markDirty,
  setSelectedElementIds,
}: UseEditorCanvasInteractionsInput) {
  const dragBaseRef = useRef<DesignDocument | null>(null);

  const updateElementById = useCallback(
    (elementId: string, updates: Partial<DesignElement>) => {
      commitDocument((current) => updateElement(current, elementId, updates));
    },
    [commitDocument],
  );

  const updateElements = useCallback(
    (updates: ElementUpdate[]) => {
      commitDocument((current) => applyElementUpdates(current, updates));
    },
    [commitDocument],
  );

  const beginElementEdit = useCallback(() => {
    dragBaseRef.current = document;
  }, [document]);

  const previewElement = useCallback(
    (elementId: string, updates: Partial<DesignElement>) => {
      const baseDocument = dragBaseRef.current ?? document;

      replacePresent(updateElement(baseDocument, elementId, updates));
      markDirty();
    },
    [document, markDirty, replacePresent],
  );

  const commitElement = useCallback(
    (elementId: string, updates: Partial<DesignElement>) => {
      const baseDocument = dragBaseRef.current;
      dragBaseRef.current = null;

      if (!baseDocument) {
        updateElementById(elementId, updates);
        return;
      }

      commitWithBase(baseDocument, updateElement(baseDocument, elementId, updates));
      markDirty();
    },
    [commitWithBase, markDirty, updateElementById],
  );

  const splitElement = useCallback(
    (elementId: string, splitAtSeconds: number) => {
      commitDocument((current) => {
        const activePage = getActivePage(current);
        const element = activePage.elements.find(
          (item) => item.id === elementId,
        );

        if (!element || !isMediaTimelineElement(element)) {
          return current;
        }

        const splitElements = splitMediaTimelineElement(
          element,
          splitAtSeconds,
        );

        if (!splitElements) return current;

        const [before, after] = splitElements;
        setSelectedElementIds([after.id]);

        return {
          ...current,
          pages: current.pages.map((item) =>
            item.id === activePage.id
              ? {
                  ...item,
                  elements: item.elements.flatMap((pageElement) =>
                    pageElement.id === elementId
                      ? [before, after]
                      : [pageElement],
                  ),
                }
              : item,
          ),
        };
      });
    },
    [commitDocument, setSelectedElementIds],
  );

  const beginCanvasDrag = useCallback(() => {
    dragBaseRef.current = document;
  }, [document]);

  const moveCanvasDrag = useCallback(
    (updates: ElementUpdate[]) => {
      replacePresent(applyElementUpdates(document, updates));
      markDirty();
    },
    [document, markDirty, replacePresent],
  );

  const endCanvasDrag = useCallback(() => {
    const baseDocument = dragBaseRef.current;
    dragBaseRef.current = null;

    if (baseDocument) {
      commitWithBase(baseDocument, document);
    }
  }, [commitWithBase, document]);

  return {
    updateElementById,
    updateElements,
    beginElementEdit,
    previewElement,
    commitElement,
    splitElement,
    beginCanvasDrag,
    moveCanvasDrag,
    endCanvasDrag,
  };
}
