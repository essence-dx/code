"use client";

import { useEffect, useRef } from "react";

import {
  addElements,
  cloneElements,
  removeElements,
  nudgeElements,
} from "@/features/editor/editor-operations";
import {
  getAdjacentKeyboardElementId,
  getKeyboardSelectableElementIds,
} from "@/features/editor/keyboard-navigation";
import type { DesignDocument, DesignElement } from "@/features/editor/types";

type CommitDocument = (
  updater: DesignDocument | ((current: DesignDocument) => DesignDocument),
) => void;

type UseEditorKeyboardShortcutsInput = {
  pageElements: DesignElement[];
  selectedElements: DesignElement[];
  selectedElementIds: string[];
  commitDocument: CommitDocument;
  markDirty: () => void;
  saveProject: () => Promise<boolean>;
  selectElement: (elementId: string, additive?: boolean) => void;
  setSelectedElementIds: (ids: string[]) => void;
  duplicateSelectedElement: () => void;
  groupSelectedElements: () => void;
  ungroupSelectedElements: () => void;
  undo: () => void;
  redo: () => void;
};

export function useEditorKeyboardShortcuts({
  pageElements,
  selectedElements,
  selectedElementIds,
  commitDocument,
  markDirty,
  saveProject,
  selectElement,
  setSelectedElementIds,
  duplicateSelectedElement,
  groupSelectedElements,
  ungroupSelectedElements,
  undo,
  redo,
}: UseEditorKeyboardShortcutsInput) {
  const clipboardElementsRef = useRef<DesignElement[]>([]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (isEditableTarget(event.target)) return;

      const modifier = event.ctrlKey || event.metaKey;
      const shift = event.shiftKey;

      if (event.key === "Escape" && selectedElementIds.length) {
        event.preventDefault();
        setSelectedElementIds([]);
        return;
      }

      if (modifier && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void saveProject();
        return;
      }

      if (modifier && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (shift) {
          redo();
        } else {
          undo();
        }
        markDirty();
        return;
      }

      if (modifier && event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
        markDirty();
        return;
      }

      if (
        modifier &&
        event.key.toLowerCase() === "d" &&
        selectedElementIds.length
      ) {
        event.preventDefault();
        duplicateSelectedElement();
        return;
      }

      if (modifier && event.key.toLowerCase() === "g") {
        event.preventDefault();
        if (shift) {
          ungroupSelectedElements();
        } else {
          groupSelectedElements();
        }
        return;
      }

      if (
        modifier &&
        event.key.toLowerCase() === "c" &&
        selectedElements.length
      ) {
        event.preventDefault();
        clipboardElementsRef.current = selectedElements;
        return;
      }

      if (
        modifier &&
        event.key.toLowerCase() === "v" &&
        clipboardElementsRef.current.length
      ) {
        event.preventDefault();
        const pastedElements = cloneElements(clipboardElementsRef.current);
        setSelectedElementIds(pastedElements.map((element) => element.id));
        commitDocument((current) => addElements(current, pastedElements));
        return;
      }

      if (modifier && event.key.toLowerCase() === "a") {
        event.preventDefault();
        setSelectedElementIds(getKeyboardSelectableElementIds(pageElements));
        return;
      }

      if (
        !modifier &&
        !event.altKey &&
        (event.key === "[" || event.key === "]")
      ) {
        const elementId = getAdjacentKeyboardElementId({
          elements: pageElements,
          selectedElementIds,
          direction: event.key === "]" ? "next" : "previous",
        });

        if (elementId) {
          event.preventDefault();
          selectElement(elementId);
        }

        return;
      }

      if (
        (event.key === "Delete" || event.key === "Backspace") &&
        selectedElementIds.length
      ) {
        event.preventDefault();
        commitDocument((current) =>
          removeElements(current, selectedElementIds),
        );
        setSelectedElementIds([]);
        return;
      }

      const nudgeBy = shift ? 10 : 1;
      const deltas: Record<string, { x: number; y: number }> = {
        ArrowUp: { x: 0, y: -nudgeBy },
        ArrowDown: { x: 0, y: nudgeBy },
        ArrowLeft: { x: -nudgeBy, y: 0 },
        ArrowRight: { x: nudgeBy, y: 0 },
      };
      const delta = deltas[event.key];

      if (delta && selectedElementIds.length) {
        event.preventDefault();
        commitDocument((current) =>
          nudgeElements(current, selectedElementIds, delta),
        );
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    redo,
    commitDocument,
    duplicateSelectedElement,
    groupSelectedElements,
    markDirty,
    pageElements,
    saveProject,
    selectElement,
    selectedElements,
    selectedElementIds,
    setSelectedElementIds,
    undo,
    ungroupSelectedElements,
  ]);
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;

  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  );
}
