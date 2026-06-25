"use client";

import { useCallback, type Dispatch, type SetStateAction } from "react";

import { applyStylePresetToActivePage } from "@/features/editor/apply-style-preset";
import { applyBrandKitToDocument } from "@/features/editor/brand-guardrails";
import {
  createBooleanShapeElement,
  replaceBooleanShapeSources,
} from "@/features/editor/boolean-shapes";
import { createAnchoredConnectorBetweenElements } from "@/features/editor/connector-anchors";
import { createTimerElement } from "@/features/editor/document-factory";
import {
  addElement,
  addElements,
  addPages,
  cloneElements,
  distributeElements,
  groupElements,
  removeElements,
  ungroupElements,
  updateActivePage,
  updateDocumentMetadata,
} from "@/features/editor/editor-operations";
import type { StylePreset } from "@/features/editor/style-presets";
import type { SaveState } from "@/features/editor/use-editor-project-persistence";
import type {
  BrandColorSummary,
  BrandFontSummary,
  BooleanShapeOperation,
  DesignDocument,
  DesignElement,
  DesignPage,
} from "@/features/editor/types";
import type { EditorLocale } from "@/features/editor/editor-localization";

type DocumentCommit = (
  updater: DesignDocument | ((current: DesignDocument) => DesignDocument),
) => void;

type UseEditorDocumentActionsInput = {
  page: DesignPage;
  pageWidth: number;
  projectId: string;
  selectedElementIds: string[];
  selectedElements: DesignElement[];
  selectedConnectorAnchors: DesignElement[];
  brandColors: BrandColorSummary[];
  brandFonts: BrandFontSummary[];
  saveState: SaveState;
  saveProject: () => Promise<boolean>;
  commit: DocumentCommit;
  undo: () => void;
  redo: () => void;
  setSelectedElementIds: Dispatch<SetStateAction<string[]>>;
  setSaveState: Dispatch<SetStateAction<SaveState>>;
  setChangeRevision: Dispatch<SetStateAction<number>>;
  changeRevisionRef: { current: number };
};

export function useEditorDocumentActions({
  page,
  pageWidth,
  projectId,
  selectedElementIds,
  selectedElements,
  selectedConnectorAnchors,
  brandColors,
  brandFonts,
  saveState,
  saveProject,
  commit,
  undo,
  redo,
  setSelectedElementIds,
  setSaveState,
  setChangeRevision,
  changeRevisionRef,
}: UseEditorDocumentActionsInput) {
  const markDirty = useCallback(() => {
    setSaveState("dirty");
    setChangeRevision((current) => {
      const next = current + 1;
      changeRevisionRef.current = next;
      return next;
    });
  }, [changeRevisionRef, setChangeRevision, setSaveState]);

  const commitDocument = useCallback(
    (
      updater: DesignDocument | ((current: DesignDocument) => DesignDocument),
    ) => {
      commit(updater);
      markDirty();
    },
    [commit, markDirty],
  );

  const addCreatedElement = useCallback(
    (element: DesignElement) => {
      setSelectedElementIds([element.id]);
      commitDocument((current) => addElement(current, element));
    },
    [commitDocument, setSelectedElementIds],
  );

  const addCreatedElements = useCallback(
    (elements: DesignElement[]) => {
      setSelectedElementIds(elements.map((element) => element.id));
      commitDocument((current) => addElements(current, elements));
    },
    [commitDocument, setSelectedElementIds],
  );

  const connectSelectedElements = useCallback(() => {
    if (selectedConnectorAnchors.length !== 2) return;

    const connector = createAnchoredConnectorBetweenElements(
      selectedConnectorAnchors[0],
      selectedConnectorAnchors[1],
    );

    setSelectedElementIds([connector.id]);
    commitDocument((current) => addElement(current, connector));
  }, [commitDocument, selectedConnectorAnchors, setSelectedElementIds]);

  const applyBooleanShapeOperation = useCallback(
    (operation: BooleanShapeOperation) => {
      const booleanShape = createBooleanShapeElement({
        elements: page.elements,
        elementIds: selectedElementIds,
        operation,
      });

      if (!booleanShape) return;

      setSelectedElementIds([booleanShape.id]);
      commitDocument((current) =>
        updateActivePage(current, (activePage) => ({
          ...activePage,
          elements: replaceBooleanShapeSources(
            activePage.elements,
            selectedElementIds,
            booleanShape,
          ),
        })),
      );
    },
    [commitDocument, page.elements, selectedElementIds, setSelectedElementIds],
  );

  const addWorkshopTimer = useCallback(
    (minutes: number) => {
      addCreatedElement(
        createTimerElement({
          timerMode: "countdown",
          label: `${minutes} min workshop timer`,
          durationSeconds: minutes * 60,
          elapsedSeconds: 0,
          running: false,
          x: Math.max(80, Math.round(pageWidth - 500)),
          y: 80,
          width: 360,
          height: 180,
          surfaceColor: "#ffffff",
          accentColor: "#0ea5e9",
        }),
      );
    },
    [addCreatedElement, pageWidth],
  );

  const addImportedPages = useCallback(
    (pages: DesignPage[]) => {
      setSelectedElementIds([]);
      commitDocument((current) => addPages(current, pages));
    },
    [commitDocument, setSelectedElementIds],
  );

  const applyStylePreset = useCallback(
    (preset: StylePreset) => {
      commitDocument((current) =>
        applyStylePresetToActivePage(current, preset),
      );
    },
    [commitDocument],
  );

  const applyBrandKit = useCallback(() => {
    commitDocument((current) =>
      applyBrandKitToDocument({
        document: current,
        brandColors,
        brandFonts,
      }),
    );
  }, [brandColors, brandFonts, commitDocument]);

  const updateEditorLocale = useCallback(
    (locale: EditorLocale) => {
      commitDocument((current) =>
        updateDocumentMetadata(current, { editorLocale: locale }),
      );
    },
    [commitDocument],
  );

  const duplicateSelectedElement = useCallback(() => {
    if (selectedElements.length === 0) return;

    const duplicates = cloneElements(selectedElements);

    setSelectedElementIds(duplicates.map((element) => element.id));
    commitDocument((current) => addElements(current, duplicates));
  }, [commitDocument, selectedElements, setSelectedElementIds]);

  const deleteSelectedElement = useCallback(() => {
    if (selectedElementIds.length === 0) return;

    commitDocument((current) => removeElements(current, selectedElementIds));
    setSelectedElementIds([]);
  }, [commitDocument, selectedElementIds, setSelectedElementIds]);

  const distributeSelectedElements = useCallback(
    (axis: "horizontal" | "vertical") => {
      if (selectedElementIds.length < 3) return;

      commitDocument((current) =>
        distributeElements(current, selectedElementIds, axis),
      );
    },
    [commitDocument, selectedElementIds],
  );

  const groupSelectedElements = useCallback(() => {
    if (selectedElementIds.length < 2) return;

    commitDocument((current) => groupElements(current, selectedElementIds));
  }, [commitDocument, selectedElementIds]);

  const ungroupSelectedElements = useCallback(() => {
    if (selectedElementIds.length === 0) return;

    commitDocument((current) => ungroupElements(current, selectedElementIds));
  }, [commitDocument, selectedElementIds]);

  const selectElement = useCallback(
    (elementId: string, additive = false) => {
      const element = page.elements.find((item) => item.id === elementId);
      const targetElementIds = element?.groupId
        ? page.elements
            .filter((item) => item.groupId === element.groupId)
            .map((item) => item.id)
        : [elementId];

      setSelectedElementIds((current) => {
        if (!additive) return targetElementIds;

        const targetIdSet = new Set(targetElementIds);
        const hasWholeTargetSelected = targetElementIds.every((id) =>
          current.includes(id),
        );

        if (hasWholeTargetSelected) {
          return current.filter((id) => !targetIdSet.has(id));
        }

        return Array.from(new Set([...current, ...targetElementIds]));
      });
    },
    [page.elements, setSelectedElementIds],
  );

  const undoDocument = useCallback(() => {
    undo();
    markDirty();
  }, [markDirty, undo]);

  const redoDocument = useCallback(() => {
    redo();
    markDirty();
  }, [markDirty, redo]);

  const openPresenterView = useCallback(async () => {
    if (saveState !== "saved") {
      const saved = await saveProject();

      if (!saved) return;
    }

    if (typeof window !== "undefined") {
      window.open(`/present/${projectId}`, "_blank", "noopener");
    }
  }, [projectId, saveProject, saveState]);

  return {
    markDirty,
    commitDocument,
    addCreatedElement,
    addCreatedElements,
    connectSelectedElements,
    applyBooleanShapeOperation,
    addWorkshopTimer,
    addImportedPages,
    applyStylePreset,
    applyBrandKit,
    updateEditorLocale,
    duplicateSelectedElement,
    deleteSelectedElement,
    distributeSelectedElements,
    groupSelectedElements,
    ungroupSelectedElements,
    selectElement,
    undoDocument,
    redoDocument,
    openPresenterView,
  };
}
